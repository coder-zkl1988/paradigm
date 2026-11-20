// Agent Client Protocol: any agent that speaks ACP over stdio (Gemini CLI,
// OpenCode, Claude Code through its ACP adapter...). We are the client: we
// start the agent, open a session in the board folder, send the prompt, draw
// each tool_call it reports, answer session/request_permission from the
// board's permissions, and serve fs/read_text_file and fs/write_text_file
// inside the board folder only.

import { spawn, type ChildProcess } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { mapToolEvent, type ToolEvent } from '@paradigm/shared';
import type { Adapter, AdapterContext } from './types';
import { inside } from '../sandbox/folders';

const PROTOCOL_VERSION = 1;

function splitCommand(cmd: string): string[] {
  const out: string[] = []; let cur = '', q: string | null = null;
  for (const ch of cmd) {
    if (q) { if (ch === q) q = null; else cur += ch; }
    else if (ch === '"' || ch === "'") q = ch;
    else if (/\s/.test(ch)) { if (cur) { out.push(cur); cur = ''; } }
    else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

/** Minimal JSON-RPC 2.0 over newline-delimited JSON. */
class Rpc {
  private next = 1;
  private pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>();
  private buf = '';
  constructor(private child: ChildProcess, private onRequest: (method: string, params: any) => Promise<any>, private onNotify: (method: string, params: any) => void) {
    child.stdout!.on('data', (b: Buffer) => {
      this.buf += b.toString('utf8');
      let i: number;
      while ((i = this.buf.indexOf('\n')) >= 0) {
        const line = this.buf.slice(0, i).trim(); this.buf = this.buf.slice(i + 1);
        if (line) this.handle(line);
      }
    });
    child.on('exit', (code) => { for (const p of this.pending.values()) p.reject(new Error(`The agent stopped (exit ${code})`)); this.pending.clear(); });
  }
  private send(o: unknown) { this.child.stdin!.write(JSON.stringify(o) + '\n'); }
  request(method: string, params: unknown): Promise<any> {
    const id = this.next++;
    return new Promise((resolve, reject) => { this.pending.set(id, { resolve, reject }); this.send({ jsonrpc: '2.0', id, method, params }); });
  }
  notify(method: string, params: unknown) { this.send({ jsonrpc: '2.0', method, params }); }
  private async handle(line: string) {
    let m: any; try { m = JSON.parse(line); } catch { return; }
    if (m.id !== undefined && (m.result !== undefined || m.error !== undefined) && !m.method) {
      const p = this.pending.get(m.id); if (!p) return; this.pending.delete(m.id);
      if (m.error) p.reject(new Error(m.error.message || 'The agent answered with an error')); else p.resolve(m.result);
    } else if (m.method && m.id !== undefined) {
      try { this.send({ jsonrpc: '2.0', id: m.id, result: await this.onRequest(m.method, m.params) }); }
      catch (e) { this.send({ jsonrpc: '2.0', id: m.id, error: { code: -32000, message: (e as Error).message } }); }
    } else if (m.method) this.onNotify(m.method, m.params);
  }
}

function commandFor(ctx: AdapterContext): string | null {
  const name = ctx.req.agent || 'gemini';
  return ctx.cfg.acpAgents[name] || null;
}

export const acpAdapter: Adapter = {
  id: 'acp',
  async unavailable(cfg, req) {
    const name = req.agent || 'gemini';
    return cfg.acpAgents[name] ? null : `No command is set for the ACP agent "${name}". Add it to ACP_AGENTS on the server, for example {"${name}":"${name === 'gemini' ? 'gemini --experimental-acp' : name === 'opencode' ? 'opencode acp' : 'my-agent --acp'}"}`;
  },
  async run(ctx) {
    const { run, cwd } = ctx, argv = splitCommand(commandFor(ctx)!);
    const child = spawn(argv[0], argv.slice(1), { cwd, stdio: ['pipe', 'pipe', 'pipe'], env: process.env });
    let stderr = '';
    child.stderr!.on('data', (b: Buffer) => { stderr = (stderr + b.toString()).slice(-4000); });
    const started = new Promise<void>((resolve, reject) => { child.once('spawn', () => resolve()); child.once('error', (e) => reject(new Error(`The agent did not start: ${e.message}`))); });
    let text = '';
    const calls = new Map<string, ToolEvent>();
    const draw = (u: any) => {
      if (calls.has(u.toolCallId)) return;
      const ev = mapToolEvent('acp', u);
      if (!ev) return;
      ev.raw = u; calls.set(u.toolCallId, ev);
      run.emit({ type: 'tool_call', id: u.toolCallId, res: ev.res, op: ev.op, title: ev.arg, tool: ev.tool, target: ev.target, parent: null, raw: u });
    };
    const rpc = new Rpc(child, async (method, p) => {
      if (method === 'session/request_permission') {
        const tc = p.toolCall || {};
        draw({ sessionUpdate: 'tool_call', ...tc });
        const ev = calls.get(tc.toolCallId) || mapToolEvent('acp', tc) || { res: 'tool' as const, arg: tc.title || 'a tool' } as ToolEvent;
        const perm = run.permOf(ev.res);
        const pick = (kinds: string[]) => (p.options || []).find((o: any) => kinds.includes(o.kind));
        let opt: any = null;
        if (perm === 'allow') opt = pick(['allow_once', 'allow_always']);
        else if (perm === 'blocked') opt = pick(['reject_once', 'reject_always']);
        else {
          const d = await run.ask(tc.toolCallId || 'acp', ev.res, ev.arg || tc.title || 'Use a tool');
          opt = d === 'allow_always' ? pick(['allow_always', 'allow_once']) : d === 'allow_once' ? pick(['allow_once', 'allow_always']) : pick(['reject_once', 'reject_always']);
        }
        if (!opt || /^reject/.test(opt.kind)) run.update(tc.toolCallId, 'blocked');
        return opt ? { outcome: { outcome: 'selected', optionId: opt.optionId } } : { outcome: { outcome: 'cancelled' } };
      }
      if (method === 'fs/read_text_file') {
        if (run.permOf('folder') === 'blocked') throw new Error('Reading files is blocked for this board');
        const t = await readFile(inside(cwd, p.path), 'utf8');
        if (p.line || p.limit) { const lines = t.split('\n'), from = Math.max(0, (p.line || 1) - 1); return { content: lines.slice(from, p.limit ? from + p.limit : undefined).join('\n') }; }
        return { content: t };
      }
      if (method === 'fs/write_text_file') {
        if (run.permOf('folder') === 'blocked') throw new Error('Writing files is blocked for this board');
        const f = inside(cwd, p.path); await mkdir(dirname(f), { recursive: true }); await writeFile(f, String(p.content ?? '')); return null;
      }
      throw new Error(`${method} is not supported by this client`);
    }, (method, p) => {
      if (method !== 'session/update') return;
      const u = p.update || {};
      if (u.sessionUpdate === 'agent_message_chunk' && u.content?.type === 'text') text += u.content.text;
      else if (u.sessionUpdate === 'tool_call') { draw(u); if (u.status === 'in_progress') run.update(u.toolCallId, 'in_progress'); }
      else if (u.sessionUpdate === 'tool_call_update') {
        if (u.title && !calls.has(u.toolCallId)) draw({ ...u, sessionUpdate: 'tool_call' });
        if (u.status === 'completed') run.update(u.toolCallId, 'completed');
        else if (u.status === 'failed') run.update(u.toolCallId, 'failed');
        else if (u.status === 'in_progress') run.update(u.toolCallId, 'in_progress');
      }
    });
    const kill = () => { try { child.kill('SIGTERM'); } catch { /* gone */ } };
    run.abort.signal.addEventListener('abort', kill, { once: true });
    try {
      await started;
      await rpc.request('initialize', { protocolVersion: PROTOCOL_VERSION, clientCapabilities: { fs: { readTextFile: true, writeTextFile: true }, terminal: false } });
      const s = await rpc.request('session/new', { cwd, mcpServers: [] });
      const done = await rpc.request('session/prompt', { sessionId: s.sessionId, prompt: [{ type: 'text', text: `${ctx.system}\n\n${ctx.prompt}` }] });
      if (done?.stopReason && !['end_turn', 'max_tokens'].includes(done.stopReason)) throw new Error(`The agent stopped: ${done.stopReason}`);
      return text;
    } catch (e) {
      throw new Error((e as Error).message + (stderr ? `\n${stderr.trim().split('\n').slice(-3).join('\n')}` : ''));
    } finally {
      run.abort.signal.removeEventListener('abort', kill);
      kill();
    }
  },
};
