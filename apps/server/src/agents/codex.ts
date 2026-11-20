// Codex SDK. Codex exec mode cannot pause a single command for approval, so
// the board's permissions are applied before the run starts: a blocked
// terminal means the run does not start, "ask first" asks once for the run,
// a blocked folder makes the sandbox read-only, and the network is on only
// when the browser is allowed. Per-call approval needs the Codex app-server.

import { mapToolEvent, toolEventText } from '@paradigm/shared';
import type { Adapter } from './types';
import { optional } from './types';

const PKG = '@openai/codex-sdk';

export const codexAdapter: Adapter = {
  id: 'codex',
  async unavailable() {
    if (!process.env.OPENAI_API_KEY && !process.env.CODEX_API_KEY) return 'Set OPENAI_API_KEY on the server to run Codex steps for real';
    if (!(await optional(PKG))) return `Install ${PKG} on the server (npm run agents:install)`;
    return null;
  },
  async run(ctx) {
    const { run } = ctx, sdk = await optional(PKG);
    const term = run.permOf('terminal'), folder = run.permOf('folder');
    if (term === 'blocked') throw new Error('Codex runs commands on its own, and the terminal is blocked for this board. Allow the terminal, or use another agent.');
    if (term === 'ask' || folder === 'ask') {
      const d = await run.ask('codex_start', term === 'ask' ? 'terminal' : 'folder', 'Codex runs commands and edits files without stopping once it starts. Let it run?');
      if (d === 'deny') throw new Error('The run was not allowed');
    }
    const codex = new sdk.Codex({ apiKey: process.env.CODEX_API_KEY || process.env.OPENAI_API_KEY });
    const thread = codex.startThread({
      workingDirectory: ctx.cwd, skipGitRepoCheck: true, approvalPolicy: 'never',
      sandboxMode: folder === 'blocked' ? 'read-only' : 'workspace-write',
      networkAccessEnabled: run.permOf('browser') === 'allow',
    });
    const { events } = await thread.runStreamed(`${ctx.system}\n\n${ctx.prompt}`, { signal: run.abort.signal });
    let final = '';
    for await (const e of events) {
      if (e.type === 'item.started' || (e.type === 'item.completed' && !run.events.some((x) => x.type === 'tool_call' && x.id === e.item?.id))) {
        const ev = mapToolEvent('codex', e);
        if (ev) { ev.raw = e; run.emit({ type: 'tool_call', id: e.item.id, res: ev.res, op: ev.op, title: toolEventText(ev), tool: ev.tool, target: ev.target, parent: null, raw: e }); run.update(e.item.id, 'in_progress'); }
      }
      if (e.type === 'item.completed') {
        if (e.item?.type === 'agent_message') final = e.item.text || final;
        else if (e.item?.id) run.update(e.item.id, e.item.status === 'failed' ? 'failed' : 'completed');
      } else if (e.type === 'turn.failed') throw new Error(e.error?.message || 'Codex stopped with an error');
      else if (e.type === 'error') throw new Error(e.message || 'Codex stopped with an error');
    }
    return final;
  },
};
