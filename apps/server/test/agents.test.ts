import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createModels, fauxAssistantMessage, fauxProvider, fauxText, fauxToolCall } from '@earendil-works/pi-ai';
import { makeApp } from './helpers';
import { piOverride } from '../src/agents/pi';

let t: Awaited<ReturnType<typeof makeApp>>, token: string, boardId: string;
const fake = join(__dirname, 'fixtures', 'fake-acp-agent.mjs');
const fakeCodex = join(__dirname, 'fixtures', 'fake-codex-app-server.mjs');

beforeAll(async () => {
  t = await makeApp({ acpAgents: { fake: `node ${fake}` }, codexBin: `node ${fakeCodex}` });
  token = (await t.signup()).token;
  const team = (await t.call('GET', '/v1/workspaces', undefined, token)).json.workspaces[0].id;
  boardId = (await t.call('POST', `/v1/workspaces/${team}/boards`, { template: 'Code flow' }, token)).json.board.id;
});
afterAll(async () => { piOverride.models = null; piOverride.model = null; await t.close(); });

const run = (body: Record<string, unknown>, on?: (e: any) => any) => t.stream('/v1/agent/runs', { inputs: [], instruction: '', workspace: boardId, ...body }, token, on);

describe('stand-in runs', () => {
  it('plays each harness in its own format and says why it is simulated', async () => {
    for (const harness of ['claude', 'codex', 'acp']) {
      const ev = await run({ harness, instruction: 'Fix the checkout bug and run the tests', context: { text: '', feeds: ['terminal'] }, permissions: { connector: 'allow', tool: 'allow' } });
      expect(ev[0]).toMatchObject({ type: 'run', harness, simulated: true });
      expect(ev[0].reason).toBeTruthy();
      const calls = ev.filter((e) => e.type === 'tool_call');
      expect(calls.length).toBeGreaterThan(3);
      expect(calls.some((c) => c.res === 'terminal')).toBe(true);
      const end = ev[ev.length - 1];
      expect(end).toMatchObject({ type: 'result', status: 'success', simulated: true });
      expect(String(end.output.value)).toMatch(/Simulated/);
    }
  });
  it('asks the person before an "ask first" tool and blocks a blocked one', async () => {
    const asked: string[] = [];
    let runId = '';
    const ev = await run({ harness: 'claude', instruction: 'Write the code and run the tests', context: { text: '', feeds: ['terminal'] }, permissions: { terminal: 'ask', connector: 'blocked' } }, async (e) => {
      if (e.type === 'run') runId = e.runId;
      if (e.type === 'permission_request') {
        asked.push(e.res);
        await t.call('POST', `/v1/agent/runs/${runId}/permissions`, { requestId: e.requestId, decision: 'allow_always' }, token);
      }
    });
    expect(asked).toEqual(['terminal']);
    expect(ev.some((e) => e.type === 'tool_call_update' && e.status === 'blocked')).toBe(true);
    expect(ev[ev.length - 1].status).toBe('success');
  });
  it('holds tool calls while paused and carries on when resumed', async () => {
    let runId = '', paused = false, calls = 0, resumedAt = 0, heldUntil = 0;
    const ev = await run({ harness: 'claude', instruction: 'Fix the bug', context: { text: '', feeds: ['terminal'] }, permissions: { connector: 'allow', tool: 'allow' } }, async (e) => {
      if (e.type === 'run') runId = e.runId;
      if (e.type === 'tool_call') {
        calls++;
        if (calls === 1 && !paused) {
          paused = true;
          await t.call('POST', `/v1/agent/runs/${runId}/pause`, {}, token);
          setTimeout(async () => { resumedAt = Date.now(); await t.call('POST', `/v1/agent/runs/${runId}/resume`, {}, token); }, 300);
        } else if (calls === 2) heldUntil = Date.now();
      }
    });
    expect(heldUntil).toBeGreaterThanOrEqual(resumedAt);
    expect(ev[ev.length - 1].status).toBe('success');
  });
  it('turns the toolbar chat into a proposal of shapes and arrows', async () => {
    const ev = await run({ harness: 'pi', surface: 'chat', instruction: 'Sign-up flow: enter email, verify the code, pick a plan', chat: { mode: 'diagram', board: [], selected: [], area: null, tools: [] } });
    const end = ev[ev.length - 1];
    expect(end.output.type).toBe('proposal');
    const items = end.output.value.items;
    expect(items.filter((i: any) => i.kind === 'shape').map((i: any) => i.text)).toEqual(['Enter email', 'Verify the code', 'Pick a plan']);
    expect(items.filter((i: any) => i.kind === 'arrow')).toHaveLength(2);
    expect(ev.filter((e) => e.type === 'tool_call').every((e) => e.res === 'board')).toBe(true);
  });
});

describe('built-in agent on Pi (scripted model)', () => {
  it('runs tools in the board folder, draws them, and blocks what is blocked', async () => {
    const faux = fauxProvider();
    const models = createModels(); models.setProvider(faux.provider);
    piOverride.models = models; piOverride.model = faux.getModel();
    faux.setResponses([
      fauxAssistantMessage([fauxToolCall('write', { path: 'src/hello.txt', content: 'hi' }), fauxToolCall('bash', { command: 'rm -rf /' })], { stopReason: 'toolUse' }),
      fauxAssistantMessage([fauxText('# Done\n\nWrote src/hello.txt')]),
    ]);
    const ev = await run({ harness: 'pi', instruction: 'Write hello', permissions: { terminal: 'blocked' } });
    expect(ev[0]).toMatchObject({ type: 'run', harness: 'pi', simulated: false });
    const calls = ev.filter((e) => e.type === 'tool_call');
    expect(calls.map((c) => [c.res, c.title])).toEqual([['folder', 'Write src/hello.txt'], ['terminal', 'Run rm -rf /']]);
    const st = (id: string) => ev.filter((e) => e.type === 'tool_call_update' && e.id === id).map((e) => e.status);
    expect(st(calls[0].id)).toEqual(['in_progress', 'completed']);
    expect(st(calls[1].id)).toEqual(['blocked']);
    expect(ev[ev.length - 1]).toMatchObject({ type: 'result', status: 'success', simulated: false, output: { type: 'text', value: '# Done\n\nWrote src/hello.txt' } });
    expect(readFileSync(join(t.dir, 'sandboxes', boardId, 'src', 'hello.txt'), 'utf8')).toBe('hi');
  });
  it('refuses paths outside the board folder', async () => {
    const faux = fauxProvider();
    const models = createModels(); models.setProvider(faux.provider);
    piOverride.models = models; piOverride.model = faux.getModel();
    faux.setResponses([
      fauxAssistantMessage([fauxToolCall('read', { path: '../../etc/passwd' })], { stopReason: 'toolUse' }),
      fauxAssistantMessage([fauxText('Could not read it')]),
    ]);
    const ev = await run({ harness: 'pi', instruction: 'Read it' });
    const c = ev.find((e) => e.type === 'tool_call');
    expect(ev.filter((e) => e.type === 'tool_call_update' && e.id === c.id).map((e) => e.status)).toEqual(['in_progress', 'failed']);
  });
  it('draws a diagram from the chat through board tools', async () => {
    const faux = fauxProvider();
    const models = createModels(); models.setProvider(faux.provider);
    piOverride.models = models; piOverride.model = faux.getModel();
    faux.setResponses([
      fauxAssistantMessage([fauxToolCall('board_read', {})], { stopReason: 'toolUse' }),
      fauxAssistantMessage([fauxToolCall('board_add_shape', { shape: 'pill', text: 'Start' }), fauxToolCall('board_add_shape', { shape: 'diamond', text: 'Paid?' })], { stopReason: 'toolUse' }),
      fauxAssistantMessage([fauxToolCall('board_connect', { from: 's1', to: 's2' })], { stopReason: 'toolUse' }),
      fauxAssistantMessage([fauxText('A start and a payment check.')]),
    ]);
    const ev = await run({ harness: 'pi', surface: 'chat', instruction: 'Draw checkout', chat: { mode: 'diagram', board: [], selected: [], area: { x: 0, y: 0, w: 800, h: 600 }, tools: [] } });
    const end = ev[ev.length - 1];
    expect(end.simulated).toBe(false);
    expect(end.output.value.note).toBe('A start and a payment check.');
    expect(end.output.value.items.map((i: any) => i.kind)).toEqual(['shape', 'shape', 'arrow']);
    expect(end.output.value.items[1]).toMatchObject({ shape: 'diamond', w: 160 });
  });
});

describe('ACP agent', () => {
  it('runs a real ACP agent over stdio, answers its permission request and serves file writes', async () => {
    let asked = 0, runId = '';
    const ev = await run({ harness: 'acp', agent: 'fake', instruction: 'Do it', permissions: { terminal: 'ask' } }, async (e) => {
      if (e.type === 'run') runId = e.runId;
      if (e.type === 'permission_request') { asked++; await t.call('POST', `/v1/agent/runs/${runId}/permissions`, { requestId: e.requestId, decision: 'allow_once' }, token); }
    });
    expect(ev[0]).toMatchObject({ type: 'run', harness: 'acp', simulated: false });
    expect(asked).toBe(1);
    expect(ev.filter((e) => e.type === 'tool_call').map((e) => [e.res, e.title])).toEqual([['folder', 'Read README.md'], ['terminal', 'npm test']]);
    expect(ev[ev.length - 1]).toMatchObject({ status: 'success', output: { value: 'Tests ran. Wrote notes/out.md' } });
    expect(existsSync(join(t.dir, 'sandboxes', boardId, 'notes', 'out.md'))).toBe(true);
  });
});

describe('Codex app-server', () => {
  const withKey = async <T>(f: () => Promise<T>) => {
    const was = process.env.CODEX_API_KEY;
    process.env.CODEX_API_KEY = 'test-key';
    try { return await f(); } finally { if (was === undefined) delete process.env.CODEX_API_KEY; else process.env.CODEX_API_KEY = was; }
  };
  it('asks on the tool node before each command and file change', async () => {
    const asked: string[] = [];
    let runId = '';
    const ev = await withKey(() => run({ harness: 'codex', instruction: 'Fix it', permissions: { terminal: 'ask', folder: 'ask', browser: 'allow' } }, async (e) => {
      if (e.type === 'run') runId = e.runId;
      if (e.type === 'permission_request') {
        asked.push(`${e.res} ${e.toolCallId}`);
        await t.call('POST', `/v1/agent/runs/${runId}/permissions`, { requestId: e.requestId, decision: e.res === 'terminal' ? 'allow_once' : 'deny' }, token);
      }
    }));
    expect(ev[0]).toMatchObject({ type: 'run', harness: 'codex', simulated: false });
    expect(asked).toEqual(['terminal cmd_1', 'folder fc_1']);
    expect(ev.filter((e) => e.type === 'tool_call').map((e) => [e.id, e.res])).toEqual([['cmd_1', 'terminal'], ['fc_1', 'folder']]);
    expect(ev.some((e) => e.type === 'tool_call_update' && e.id === 'fc_1' && e.status === 'blocked')).toBe(true);
    expect(ev[ev.length - 1]).toMatchObject({ status: 'success', output: { value: 'command accept, edit decline. sandbox readOnly, network true, policy untrusted' } });
  });
  it('answers from the board without asking when both are allowed', async () => {
    let asked = 0;
    const ev = await withKey(() => run({ harness: 'codex', instruction: 'Fix it', permissions: { terminal: 'allow', folder: 'allow', browser: 'blocked' } }, (e) => { if (e.type === 'permission_request') asked++; }));
    expect(asked).toBe(0);
    expect(ev[ev.length - 1]).toMatchObject({ status: 'success', output: { value: 'command accept, edit accept. sandbox workspaceWrite, network false, policy never' } });
  });
});
