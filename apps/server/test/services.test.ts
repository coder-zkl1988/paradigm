import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MANIFEST_TEMPLATE } from '@paradigm/shared';
import { makeApp } from './helpers';

let t: Awaited<ReturnType<typeof makeApp>>, local: Awaited<ReturnType<typeof makeApp>>, token: string, ltoken: string;
beforeAll(async () => {
  t = await makeApp();
  local = await makeApp({ sandbox: 'local' });
  token = (await t.signup()).token;
  ltoken = (await local.signup()).token;
});
afterAll(async () => { await t.close(); await local.close(); });

describe('terminal and code', () => {
  it('says nothing ran when no sandbox is set up', async () => {
    const r = await t.call('POST', '/v1/sandbox/exec', { command: 'npm test', stdin: null, timeoutSec: 30 }, token);
    expect(r.json).toMatchObject({ simulated: true, exitCode: 0 });
    expect(r.json.stdout).toMatch(/simulated/);
    expect((await t.call('POST', '/v1/sandbox/code', { language: 'python', source: 'return 1', input: null }, token)).json.simulated).toBe(true);
  });
  it('runs commands in the board folder and streams their output', async () => {
    const ev = await local.stream('/v1/sandbox/exec', { command: 'echo hello; echo oops >&2; pwd; exit 3', stdin: null, timeoutSec: 10 }, ltoken);
    expect(ev.filter((e) => e.type === 'stdout').map((e) => e.chunk).join('')).toMatch(/hello\n.*sandboxes\/u-/s);
    expect(ev.some((e) => e.type === 'stderr' && /oops/.test(e.chunk))).toBe(true);
    expect(ev[ev.length - 1]).toEqual({ type: 'exit', exitCode: 3 });
  });
  it('keeps server secrets out of commands and stops slow ones', async () => {
    process.env.SECRET_FOR_TEST = 'sk-should-not-leak';
    const r = await local.call('POST', '/v1/sandbox/exec', { command: 'env', timeoutSec: 5 }, ltoken);
    expect(r.json.stdout).not.toMatch(/sk-should-not-leak/);
    const slow = await local.call('POST', '/v1/sandbox/exec', { command: 'sleep 5', timeoutSec: 1 }, ltoken);
    expect(slow.json.stderr).toMatch(/stopped after 1 s/);
  });
  it('runs JavaScript in an isolated worker', async () => {
    expect((await t.call('POST', '/v1/sandbox/code', { language: 'javascript', source: 'console.log("hi"); return input.a * 2', input: { a: 21 } }, token)).json).toEqual({ value: 42, logs: ['hi'] });
    expect((await t.call('POST', '/v1/sandbox/code', { language: 'javascript', source: 'return typeof process + typeof require + typeof fetch', input: null }, token)).json.value).toBe('undefinedundefinedundefined');
    expect((await t.call('POST', '/v1/sandbox/code', { language: 'javascript', source: 'while (true) {}', input: null }, token)).json.error).toMatch(/longer than/);
  });
  it('runs Python through the sandbox', async () => {
    const r = await local.call('POST', '/v1/sandbox/code', { language: 'python', source: 'print("rows", len(input))\nreturn [x * 2 for x in input]', input: [1, 2, 3] }, ltoken);
    expect(r.json).toEqual({ value: [2, 4, 6], logs: ['rows 3'] });
  });
});

describe('API request node', () => {
  it('refuses private addresses, including names that resolve to them', async () => {
    const a = await t.call('POST', '/v1/http/proxy', { method: 'GET', url: 'http://127.0.0.1:1/', headers: {}, body: null }, token);
    expect(a.status).toBe(502);
    expect(a.json.error).toMatch(/private/);
    const b = await t.call('POST', '/v1/http/proxy', { method: 'GET', url: 'http://localhost:1/', headers: {}, body: null }, token);
    expect(b.json.error).toMatch(/private/);
    expect((await t.call('POST', '/v1/http/proxy', { method: 'GET', url: 'http://169.254.169.254/latest', headers: {}, body: null }, token)).json.error).toMatch(/private/);
  });
  it('fills in secrets only it knows', async () => {
    const r = await t.call('POST', '/v1/http/proxy', { method: 'GET', url: 'https://example.com/{{secret.nope}}', headers: {}, body: null }, token);
    expect(r.json.error).toMatch(/no secret called nope/);
  });
});

describe('files', () => {
  it('exports Doc, Sheet and Slides as Office files', async () => {
    const blocks = [{ k: 'h1', text: 'Plan' }, { k: 'p', text: 'Hello' }, { k: 'li', text: 'One' }, { k: 'table', text: '', head: ['a'], rows: [['1']] }];
    for (const [format, content, mime] of [
      ['docx', { kind: 'doc', blocks }, 'wordprocessingml'],
      ['xlsx', { kind: 'sheet', head: ['item', 'qty'], rows: [['Pen', '2']] }, 'spreadsheetml'],
      ['pptx', { kind: 'slides', slides: [{ title: 'Deck', items: [] }, { title: 'First', items: [{ k: 'li', text: 'a' }] }] }, 'presentationml'],
    ] as const) {
      const r = await t.call('POST', '/v1/files/export', { format, title: 'Q3 plan', content }, token);
      expect(r.json.url).toMatch(new RegExp(`^/v1/files/[\\w-]+/Q3%20plan\\.${format}$`));
      const f = await fetch(t.base + r.json.url);
      expect(f.headers.get('content-type')).toMatch(mime);
      const buf = Buffer.from(await f.arrayBuffer());
      expect(buf.subarray(0, 2).toString()).toBe('PK');
    }
  });
  it('answers image and video nodes with stand-ins when no provider is set', async () => {
    delete process.env.OPENROUTER_API_KEY; delete process.env.OPENAI_API_KEY;
    expect((await t.call('POST', '/v1/media/images', { prompt: 'A poster', ratio: '16:9' }, token)).json).toMatchObject({ url: null, simulated: true });
    const v = (await t.call('POST', '/v1/media/videos', { prompt: 'A loop', ratio: '16:9', seconds: 4 }, token)).json;
    expect(v).toMatchObject({ status: 'done', simulated: true });
    expect((await t.call('GET', `/v1/media/videos/${v.jobId}`, undefined, token)).json.status).toBe('done');
  });
});

describe('node market', () => {
  const mine = () => ({ ...JSON.parse(JSON.stringify(MANIFEST_TEMPLATE)), id: 'shout-' + Math.random().toString(36).slice(2, 6), name: 'Shout', run: 'return String(input).toUpperCase()' });
  it('lists built-ins, checks and publishes nodes, and runs them on the server', async () => {
    const list = (await t.call('GET', '/v1/market/nodes', undefined, token)).json.nodes;
    expect(list.map((n: any) => n.id)).toContain('word-count');
    expect((await t.call('POST', '/v1/market/nodes', { manifest: { ...mine(), style: 'red' } }, token)).json).toMatchObject({ ok: false, problems: [{ path: 'style' }] });
    const m = mine();
    expect((await t.call('POST', '/v1/market/nodes', { manifest: m }, token)).json).toEqual({ ok: true, problems: [] });
    expect((await t.call('POST', '/v1/market/nodes', { manifest: m }, token)).status).toBe(409);
    const r = await t.call('POST', `/v1/market/nodes/${m.id}/run`, { input: 'hi there', inputs: [], config: {}, text: '' }, token);
    expect(r.json.value).toBe('HI THERE');
    const wc = await t.call('POST', '/v1/market/nodes/word-count/run', { input: 'one two three', inputs: [], config: {}, text: '' }, token);
    expect(wc.json.value[0]).toEqual({ measure: 'Words', value: 3 });
  });
  it('makes a real PDF for the PDF export node', async () => {
    const r = await t.call('POST', '/v1/market/nodes/pdf-export/run', { input: '# Report\n\nAll good.\n\n- one\n- two', inputs: [], config: {}, text: '' }, token);
    expect(r.json.value.name).toBe('Report.pdf');
    const f = Buffer.from(await (await fetch(t.base + r.json.value.url)).arrayBuffer());
    expect(f.subarray(0, 5).toString()).toBe('%PDF-');
    expect(f.toString('latin1')).toMatch(/\(All good\.\) Tj/);
  });
  it('is an MCP server for coding agents, with an API token', async () => {
    const { token: tk } = (await t.call('POST', '/v1/me/tokens', { label: 'Claude Code' }, token)).json;
    const rpc = (method: string, params?: unknown) => t.call('POST', '/mcp', { jsonrpc: '2.0', id: 1, method, params }, tk);
    expect((await rpc('initialize', { protocolVersion: '2025-06-18' })).json.result.serverInfo.name).toBe('paradigm-node-market');
    expect((await rpc('tools/list')).json.result.tools.map((x: any) => x.name)).toEqual(['get_node_spec', 'get_ui_rules', 'list_stickers', 'validate_node', 'preview_node', 'publish_node']);
    const v = JSON.parse((await rpc('tools/call', { name: 'validate_node', arguments: { manifest: { ...mine(), id: 'Bad Id' } } })).json.result.content[0].text);
    expect(v.problems[0].path).toBe('id');
    const p = JSON.parse((await rpc('tools/call', { name: 'preview_node', arguments: { manifest: mine(), input: 'abc' } })).json.result.content[0].text);
    expect(p.value).toBe('ABC');
    expect((await t.call('POST', '/mcp', { jsonrpc: '2.0', id: 1, method: 'tools/list' })).status).toBe(401);
  });
});

describe('meta', () => {
  it('serves the contract and says what is real', async () => {
    expect((await t.call('GET', '/v1/contract')).json.endpoints.length).toBe(11);
    const s = (await t.call('GET', '/v1/status', undefined, token)).json;
    expect(s.sandbox).toMatchObject({ mode: 'off', real: false });
    expect(Object.keys(s.agents)).toEqual(['pi', 'claude', 'codex', 'acp']);
  });
});
