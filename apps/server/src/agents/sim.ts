// Stand-in runs, used when a harness has no key or command. They play the
// same events a real run sends, in the harness's own format, so the board and
// its permission questions behave the same. Every result is marked simulated.

import type { AgentRunRequest, BoardItem, FlowGraph, NodeItem } from '@paradigm/shared';
import { NODE_BY, simAnswer, simulatedScript, showVal, type HarnessId } from '@paradigm/shared';
import type { Run } from './run';

const NODE_OF: Record<HarnessId, string> = { pi: 'llm', claude: 'claude', codex: 'codex', acp: 'acp' };
const sleep = (ms: number, signal?: AbortSignal) => new Promise<void>((r) => { const t = setTimeout(r, ms); signal?.addEventListener('abort', () => { clearTimeout(t); r(); }, { once: true }); });

/** simAnswer needs the board around the step; the request carries just enough to rebuild it. */
function standIn(req: AgentRunRequest): string {
  const ntype = NODE_OF[req.harness] || 'llm', def = NODE_BY[ntype];
  const it: NodeItem = { id: 'step', kind: 'node', ntype, x: 0, y: 0, w: def.w, h: def.h, text: req.instruction || '', status: 'idle', ...(req.optName ? { optName: req.optName } : {}) };
  const byId: Record<string, BoardItem> = { step: it };
  const feeds = req.context?.feeds || [];
  feeds.forEach((t, i) => { if (NODE_BY[t]) byId['f' + i] = { id: 'f' + i, kind: 'node', ntype: t, x: 0, y: 0, w: 1, h: 1, text: '', status: 'idle' }; });
  const G = { ins: { step: req.inputs.map((i) => i.from) }, outs: { step: feeds.map((_, i) => 'f' + i).filter((k) => byId[k]) }, edges: [], order: ['step'], step: { step: 1 } } as unknown as FlowGraph;
  return simAnswer(it, G, byId, req.inputs);
}

export async function simulateRun(run: Run, req: AgentRunRequest, stepMs: number): Promise<string> {
  const context = [req.instruction, req.context?.text, ...req.inputs.map((i) => showVal(i.value).slice(0, 2000))].filter(Boolean).join('\n');
  const { events } = simulatedScript(req.harness, { context, feeds: req.context?.feeds || [], hasInputs: req.inputs.length > 0, optName: req.optName });
  let n = 0;
  for (const ev of events) {
    if (run.abort.signal.aborted) throw new Error('Stopped');
    const id = 'sim_' + ++n;
    await sleep(stepMs, run.abort.signal);
    const ok = await run.toolCall(id, ev);
    if (!ok) continue;
    await sleep(stepMs, run.abort.signal);
    run.update(id, 'completed');
  }
  await sleep(stepMs, run.abort.signal);
  return standIn(req);
}
