import type { AgentRunRequest, HarnessId } from '@paradigm/shared';
import type { Config } from '../config';
import { boardDir } from '../sandbox/folders';
import { Run, RunStore } from './run';
import type { Adapter, AdapterContext } from './types';
import { piAdapter } from './pi';
import { claudeAdapter } from './claude';
import { codexAdapter } from './codex';
import { acpAdapter } from './acp';
import { simulateRun } from './sim';
import { realChat, simulateChat } from './chat';
import { systemPrompt, userPrompt } from './prompt';

export const ADAPTERS: Record<HarnessId, Adapter> = { pi: piAdapter, claude: claudeAdapter, codex: codexAdapter, acp: acpAdapter };
export { Run, RunStore };

export function startRun(cfg: Config, runs: RunStore, userId: string, req: AgentRunRequest): Run {
  const run = runs.create(userId, req.permissions || {});
  const chat = req.surface === 'chat';
  const adapter = chat ? piAdapter : ADAPTERS[req.harness];
  void (async () => {
    const why = await adapter.unavailable(cfg, req).catch((e: Error) => e.message);
    run.emit({ type: 'run', runId: run.id, harness: adapter.id, simulated: !!why, ...(why ? { reason: why } : {}) });
    const ctx: AdapterContext = { run, req, cfg, cwd: boardDir(cfg, req.workspace), system: systemPrompt(req), prompt: userPrompt(req) };
    try {
      if (chat) {
        const value = why ? await simulateChat(run, req, cfg.simStepMs) : await realChat(ctx);
        run.emit({ type: 'result', status: 'success', output: { type: 'proposal', value }, simulated: !!why, ...(why ? { note: 'Simulated. ' + why } : {}) });
      } else {
        const value = why ? await simulateRun(run, req, cfg.simStepMs) : await adapter.run(ctx);
        run.emit({ type: 'result', status: 'success', output: { type: 'text', value }, simulated: !!why, ...(why ? { note: 'Simulated answer. ' + why } : {}) });
      }
    } catch (e) {
      run.emit({ type: 'result', status: 'error', output: { type: 'text', value: null }, error: (e as Error).message || 'The run failed', simulated: !!why });
    }
  })();
  return run;
}
