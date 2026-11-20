// Our built-in agent, on Pi (pi-agent-core + pi-ai). Runs in this process, so
// permissions are answered directly in the beforeToolCall hook, which can stop
// a call before it runs. The toolbar chat uses the same agent with board tools.

import { Agent } from '@earendil-works/pi-agent-core';
import { builtinModels } from '@earendil-works/pi-ai/providers/all';
import { mapToolEvent, foldSubAgent } from '@paradigm/shared';
import type { Config } from '../config';
import type { Adapter, AdapterContext } from './types';
import { fileTools, type PiTool } from './tools';
import { lastText } from './prompt';

type Models = ReturnType<typeof builtinModels>;
let models: Models | null = null;
/** Tests put a scripted provider here. */
export const piOverride: { models: any | null; model: any | null } = { models: null, model: null };
export const getModels = (): any => piOverride.models || (models ||= builtinModels());

const PREFER: Record<string, string[]> = {
  anthropic: ['claude-sonnet-5-5', 'claude-sonnet-5', 'claude-sonnet-4-6', 'claude-sonnet-4-5'],
  openai: ['gpt-5.5', 'gpt-5', 'gpt-4.1'],
  openrouter: ['~anthropic/claude-sonnet-latest'],
  google: ['gemini-pro-latest', 'gemini-2.5-pro'],
};
const KEYS: Record<string, string[]> = { anthropic: ['ANTHROPIC_API_KEY', 'ANTHROPIC_OAUTH_TOKEN'], openai: ['OPENAI_API_KEY'], openrouter: ['OPENROUTER_API_KEY'], google: ['GEMINI_API_KEY'] };

export async function piModel(cfg: Config): Promise<{ model?: any; why?: string }> {
  if (piOverride.model) return { model: piOverride.model };
  const m = getModels();
  if (cfg.piProvider && cfg.piModel) {
    const model = m.getModel(cfg.piProvider, cfg.piModel);
    if (!model) return { why: `The model ${cfg.piProvider}/${cfg.piModel} is not in the catalog` };
    const auth = await m.getAuth(model).catch(() => undefined);
    return auth ? { model } : { why: `No key is set for ${cfg.piProvider}` };
  }
  for (const [prov, keys] of Object.entries(KEYS)) {
    if (cfg.piProvider && cfg.piProvider !== prov) continue;
    if (!keys.some((k) => process.env[k])) continue;
    for (const id of cfg.piModel ? [cfg.piModel] : PREFER[prov]) { const model = m.getModel(prov, id); if (model) return { model }; }
  }
  return { why: 'No model key is set on the server (ANTHROPIC_API_KEY, OPENAI_API_KEY, OPENROUTER_API_KEY or GEMINI_API_KEY)' };
}

/** Runs Pi with the given tools. Tools whose names start with board_ report their own calls. */
export async function runPi(ctx: AdapterContext, tools: PiTool[]): Promise<string> {
  const { run } = ctx;
  const { model, why } = await piModel(ctx.cfg);
  if (!model) throw new Error(why);
  const m = getModels();
  const gates = new Map<string, Promise<boolean>>();
  const agent = new Agent({
    initialState: { systemPrompt: ctx.system, model, tools: tools as any },
    streamFn: m.streamSimple.bind(m),
    toolExecution: 'sequential',
    identity: { attribution: null },
    beforeToolCall: async ({ toolCall }: any) => {
      const g = gates.get(toolCall.id);
      if (g && !(await g)) return { block: true, reason: 'The person did not allow this on the board.' };
      return undefined;
    },
  } as any);
  agent.subscribe((e: any) => {
    if (e.type === 'tool_execution_start') {
      if (/^board_/.test(e.toolName)) return;
      const raw = { type: 'tool_execution_start', toolCallId: e.toolCallId, toolName: e.toolName, args: e.args };
      const ev = mapToolEvent('pi', raw);
      if (!ev) return;
      foldSubAgent(ev); ev.raw = raw;
      gates.set(e.toolCallId, run.toolCall(e.toolCallId, ev));
    } else if (e.type === 'tool_execution_end') {
      if (!/^board_/.test(e.toolName)) run.update(e.toolCallId, e.isError ? 'failed' : 'completed');
    } else if (e.type === 'message_end' && e.message?.role === 'assistant' && Array.isArray(e.message.content) && e.message.content.some((c: any) => c.type === 'toolCall')) {
      const t = e.message.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('').trim();
      if (t) run.emit({ type: 'message', text: t });
    }
  });
  const stop = () => agent.abort();
  run.abort.signal.addEventListener('abort', stop, { once: true });
  try {
    await agent.prompt(ctx.prompt);
  } finally {
    run.abort.signal.removeEventListener('abort', stop);
  }
  if (run.abort.signal.aborted) throw new Error('Stopped');
  const msgs = agent.state.messages as any[];
  const last = [...msgs].reverse().find((x) => x.role === 'assistant');
  if (last && (last.stopReason === 'error' || last.errorMessage)) throw new Error(last.errorMessage || 'The model answered with an error');
  if (agent.state.errorMessage) throw new Error(agent.state.errorMessage);
  return lastText(msgs);
}

export const piAdapter: Adapter = {
  id: 'pi',
  async unavailable(cfg) { return (await piModel(cfg)).why || null; },
  run: (ctx) => runPi(ctx, fileTools(ctx.cfg, ctx.cwd)),
};
