// A stand-in for `codex app-server`: the same JSON-RPC messages (no "jsonrpc"
// field), checked against the protocol of @openai/codex 0.169. It asks before
// a command and before a file change, and reports what was decided.
import { createInterface } from 'node:readline';

const out = (o) => process.stdout.write(JSON.stringify(o) + '\n');
let next = 1000, thread = 'th_1', turn = 'tu_1';
const waiting = new Map();
const ask = (method, params) => new Promise((resolve) => { const id = next++; waiting.set(id, resolve); out({ id, method, params }); });
const note = (method, params) => out({ method, params });
const item = (kind, it) => note(`item/${kind}`, { item: it, threadId: thread, turnId: turn });

async function play(params) {
  const said = [];
  const cmd = { type: 'commandExecution', id: 'cmd_1', command: 'npm test', cwd: process.cwd(), status: 'inProgress', commandActions: [], aggregatedOutput: null, exitCode: null };
  item('started', cmd);
  const d1 = await ask('item/commandExecution/requestApproval', { kind: 'command', threadId: thread, turnId: turn, itemId: 'cmd_1', startedAtMs: Date.now(), command: 'npm test', cwd: process.cwd() });
  said.push('command ' + d1.decision);
  item('completed', { ...cmd, status: d1.decision === 'accept' ? 'completed' : 'declined', exitCode: d1.decision === 'accept' ? 0 : null });
  const fc = { type: 'fileChange', id: 'fc_1', changes: [{ path: 'notes/out.md', kind: { type: 'add' }, diff: '+hi' }], status: 'inProgress' };
  item('started', fc);
  const d2 = await ask('item/fileChange/requestApproval', { threadId: thread, turnId: turn, itemId: 'fc_1', startedAtMs: Date.now(), reason: null, grantRoot: null });
  said.push('edit ' + d2.decision);
  item('completed', { ...fc, status: d2.decision === 'accept' ? 'completed' : 'declined' });
  item('completed', { type: 'agentMessage', id: 'msg_1', text: `${said.join(', ')}. sandbox ${params.sandboxPolicy?.type}, network ${params.sandboxPolicy?.networkAccess}, policy ${policy}` });
  note('turn/completed', { threadId: thread, turn: { id: turn, items: [], status: 'completed', error: null } });
}

let policy = '';
createInterface({ input: process.stdin }).on('line', async (line) => {
  const m = JSON.parse(line);
  if (m.jsonrpc) { out({ id: m.id, error: { code: -32600, message: 'unexpected jsonrpc field' } }); return; }
  if (m.id !== undefined && !m.method) { const w = waiting.get(m.id); waiting.delete(m.id); w?.(m.result); return; }
  if (m.method === 'initialize') return out({ id: m.id, result: { userAgent: 'fake/0.169' } });
  if (m.method === 'initialized') return;
  if (m.method === 'account/login/start') return out({ id: m.id, result: m.params.type === 'apiKey' && m.params.apiKey ? { type: 'apiKey' } : null });
  if (m.method === 'thread/start') { policy = m.params.approvalPolicy; return out({ id: m.id, result: { thread: { id: thread }, model: 'gpt-5-codex', cwd: m.params.cwd } }); }
  if (m.method === 'turn/start') { out({ id: m.id, result: { turn: { id: turn, items: [], status: 'inProgress', error: null } } }); return play(m.params); }
  if (m.method === 'turn/interrupt') { out({ id: m.id, result: {} }); note('turn/completed', { threadId: thread, turn: { id: turn, status: 'interrupted', error: null } }); return; }
  out({ id: m.id, error: { code: -32601, message: `unknown method ${m.method}` } });
});
