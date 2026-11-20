// A tiny ACP agent for tests: reports a tool call, asks permission, writes a
// file through the client, streams a message and ends the turn.
import { createInterface } from 'node:readline';
const rl = createInterface({ input: process.stdin });
let next = 1000; const waiting = new Map();
const send = (o) => process.stdout.write(JSON.stringify(o) + '\n');
const ask = (method, params) => new Promise((resolve) => { const id = next++; waiting.set(id, resolve); send({ jsonrpc: '2.0', id, method, params }); });
const update = (sessionId, u) => send({ jsonrpc: '2.0', method: 'session/update', params: { sessionId, update: u } });
rl.on('line', async (line) => {
  const m = JSON.parse(line);
  if (m.id !== undefined && !m.method) { const r = waiting.get(m.id); waiting.delete(m.id); r(m.result ?? { error: m.error }); return; }
  if (m.method === 'initialize') send({ jsonrpc: '2.0', id: m.id, result: { protocolVersion: 1, agentCapabilities: {} } });
  else if (m.method === 'session/new') send({ jsonrpc: '2.0', id: m.id, result: { sessionId: 's1' } });
  else if (m.method === 'session/prompt') {
    update('s1', { sessionUpdate: 'tool_call', toolCallId: 't1', title: 'Read README.md', kind: 'read', status: 'pending' });
    update('s1', { sessionUpdate: 'tool_call_update', toolCallId: 't1', status: 'completed' });
    const p = await ask('session/request_permission', { sessionId: 's1', toolCall: { toolCallId: 't2', title: 'npm test', kind: 'execute' }, options: [{ optionId: 'ok', name: 'Allow', kind: 'allow_once' }, { optionId: 'no', name: 'Reject', kind: 'reject_once' }] });
    const allowed = p.outcome?.optionId === 'ok';
    update('s1', { sessionUpdate: 'tool_call_update', toolCallId: 't2', status: allowed ? 'completed' : 'failed' });
    await ask('fs/write_text_file', { sessionId: 's1', path: 'notes/out.md', content: '# From ACP' });
    update('s1', { sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: allowed ? 'Tests ran. ' : 'Skipped tests. ' } });
    update('s1', { sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: 'Wrote notes/out.md' } });
    send({ jsonrpc: '2.0', id: m.id, result: { stopReason: 'end_turn' } });
  }
});
