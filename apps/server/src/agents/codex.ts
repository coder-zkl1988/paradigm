// Codex, through the Codex app-server (`codex app-server`, JSON-RPC over
// stdio), which ships with @openai/codex-sdk. Unlike the SDK's exec mode it
// stops before each command or file change that needs approval and asks, so
// every call is answered from the board's permissions, or by the person on the
// tool node when a permission is "ask first".
//
// How the board's permissions map:
// - terminal blocked: the run does not start (Codex runs commands on its own).
// - terminal or folder "ask first": approval policy "untrusted", so Codex asks
//   before anything that is not a known read-only command.
// - folder allowed: Codex may write in the board folder; otherwise the sandbox
//   is read-only and each file change needs approval.
// - browser allowed: the sandbox has network access.

import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { mapToolEvent, toolEventText, type ToolRes } from '@paradigm/shared';
import type { Config } from '../config';
import type { Adapter } from './types';
import { Rpc } from './acp';

const key = () => process.env.CODEX_API_KEY || process.env.OPENAI_API_KEY || '';

/** The command that starts the app-server: CODEX_BIN, or the binary that comes with the Codex SDK. */
function command(cfg: Config): string[] | null {
  if (cfg.codexBin) return cfg.codexBin.split(/\s+/).filter(Boolean);
  const req = createRequire(import.meta.url);
  for (const from of [() => req.resolve('@openai/codex/package.json'), () => createRequire(req.resolve('@openai/codex-sdk')).resolve('@openai/codex/package.json')]) {
    try { return [process.execPath, join(dirname(from()), 'bin', 'codex.js'), 'app-server']; } catch { /* try the next place */ }
  }
  return null;
}

/** App-server items in the shape the board's tool mapping reads (the SDK's event names). */
function asEvent(item: any) {
  const t: string = item?.type;
  if (t === 'commandExecution') return { type: 'item.started', item: { id: item.id, type: 'command_execution', command: item.command } };
  if (t === 'fileChange') return { type: 'item.started', item: { id: item.id, type: 'file_change', changes: (item.changes || []).map((c: any) => ({ path: c.path, kind: c.kind?.type })) } };
  if (t === 'webSearch') return { type: 'item.started', item: { id: item.id, type: 'web_search', query: item.query } };
  if (t === 'mcpToolCall') return { type: 'item.started', item: { id: item.id, type: 'mcp_tool_call', server: item.server, tool: item.tool, arguments: item.arguments } };
  return null;
}

export const codexAdapter: Adapter = {
  id: 'codex',
  async unavailable(cfg) {
    if (!key()) return 'Set OPENAI_API_KEY on the server to run Codex steps for real';
    if (!command(cfg)) return 'Install @openai/codex-sdk on the server (npm run agents:install), or set CODEX_BIN';
    return null;
  },
  async run(ctx) {
    const { run, cwd, cfg } = ctx;
    const term = run.permOf('terminal'), folder = run.permOf('folder');
    if (term === 'blocked') throw new Error('Codex runs commands on its own, and the terminal is blocked for this board. Allow the terminal, or use another agent.');
    const argv = command(cfg)!;
    // Codex keeps its login and settings here, apart from anyone's own ~/.codex.
    const home = join(cfg.dataDir, 'codex-home');
    mkdirSync(home, { recursive: true });
    const child = spawn(argv[0], argv.slice(1), { cwd, stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, CODEX_HOME: home } });
    let stderr = '';
    child.stderr!.on('data', (b: Buffer) => { stderr = (stderr + b.toString()).slice(-4000); });
    const started = new Promise<void>((resolve, reject) => { child.once('spawn', () => resolve()); child.once('error', (e) => reject(new Error(`Codex did not start: ${e.message}`))); });

    const drawn = new Set<string>();
    const draw = (item: any) => {
      if (!item?.id || drawn.has(item.id)) return;
      const raw = asEvent(item), ev = raw && mapToolEvent('codex', raw);
      if (!ev) return;
      drawn.add(item.id); ev.raw = item;
      run.emit({ type: 'tool_call', id: item.id, res: ev.res, op: ev.op, title: toolEventText(ev), tool: ev.tool, target: ev.target, parent: null, raw: item });
    };
    const decide = async (itemId: string, res: ToolRes, title: string) => {
      const ok = await run.gate(itemId, res, title);
      run.update(itemId, ok ? 'in_progress' : 'blocked');
      return { decision: ok ? 'accept' : 'decline' };
    };

    let final = '', turnId = '', threadId = '';
    let finish: (v: { status: string; error?: string }) => void = () => {};
    const ended = new Promise<{ status: string; error?: string }>((r) => { finish = r; });

    const rpc = new Rpc(child, async (method, p) => {
      if (method === 'item/commandExecution/requestApproval') {
        draw({ id: p.itemId, type: 'commandExecution', command: p.command || 'a command' });
        return decide(p.itemId, 'terminal', p.command ? `Run ${p.command}` : 'Run a command');
      }
      if (method === 'item/fileChange/requestApproval') {
        draw({ id: p.itemId, type: 'fileChange', changes: [] });
        return decide(p.itemId, 'folder', p.reason || 'Change files in the board folder');
      }
      throw new Error(`${method} is not supported by this client`);
    }, (method, p) => {
      if (method === 'item/started') { draw(p.item); if (p.item?.id && drawn.has(p.item.id)) run.update(p.item.id, 'in_progress'); }
      else if (method === 'item/completed') {
        const it = p.item || {};
        if (it.type === 'agentMessage') final = it.text || final;
        else if (it.id && drawn.has(it.id)) run.update(it.id, it.status === 'failed' ? 'failed' : it.status === 'declined' ? 'blocked' : 'completed');
      } else if (method === 'turn/completed' && (!turnId || p.turn?.id === turnId)) finish({ status: p.turn?.status, error: p.turn?.error?.message });
      else if (method === 'error' && p?.willRetry === false) finish({ status: 'failed', error: p.error?.message });
    }, false);

    const kill = () => { try { child.kill('SIGTERM'); } catch { /* gone */ } };
    const stop = () => { if (threadId && turnId) rpc.request('turn/interrupt', { threadId, turnId }).catch(() => {}); setTimeout(kill, 1500); };
    run.abort.signal.addEventListener('abort', stop, { once: true });
    try {
      await started;
      await rpc.request('initialize', { clientInfo: { name: 'paradigm', title: 'Paradigm', version: '1.0.0' }, capabilities: null });
      rpc.notify('initialized', {});
      await rpc.request('account/login/start', { type: 'apiKey', apiKey: key() });
      const ask = term === 'ask' || folder === 'ask';
      const network = run.permOf('browser') === 'allow';
      const t = await rpc.request('thread/start', { cwd, approvalPolicy: ask ? 'untrusted' : 'never', sandbox: folder === 'allow' ? 'workspace-write' : 'read-only', developerInstructions: ctx.system, ephemeral: true });
      threadId = t.thread.id;
      const sandboxPolicy = folder === 'allow'
        ? { type: 'workspaceWrite', writableRoots: [cwd], networkAccess: network, excludeTmpdirEnvVar: false, excludeSlashTmp: false }
        : { type: 'readOnly', networkAccess: network };
      const s = await rpc.request('turn/start', { threadId, input: [{ type: 'text', text: ctx.prompt, text_elements: [] }], sandboxPolicy });
      turnId = s.turn.id;
      const end = await ended;
      if (run.abort.signal.aborted) throw new Error('Stopped');
      if (end.status !== 'completed') throw new Error(end.error || (end.status === 'interrupted' ? 'Codex was interrupted' : 'Codex stopped with an error'));
      return final;
    } catch (e) {
      throw new Error((e as Error).message + (stderr && !run.abort.signal.aborted ? `\n${stderr.trim().split('\n').slice(-3).join('\n')}` : ''));
    } finally {
      run.abort.signal.removeEventListener('abort', stop);
      kill();
    }
  },
};
