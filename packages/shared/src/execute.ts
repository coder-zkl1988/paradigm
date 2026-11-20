// Runs one node. Works the same in the browser and on the server: the caller
// supplies the services (the server API, a script runner, the agent stream).

import type { NodeInput, NodeItem, NodeResult } from './types';
import type { AgentRunRequest } from './api';
import type { Perm, ToolRes } from './harness';
import { NODE_BY, NODE_DEFS, infoOut, showVal } from './nodes';
import { makeView } from './documents';
import { packageResult } from './market';
import { nodeRequest, packageSource } from './run';

export interface ScriptResult { value?: unknown; logs?: string[]; blocked?: boolean }

export interface Services {
  /** Calls a server endpoint by contract name and returns its JSON answer. */
  backend(kind: string, body: unknown): Promise<any>;
  /** Runs a script in isolation. Answers `{ blocked: true }` when this place cannot run scripts. */
  script(src: string, input: unknown, inputs: Record<string, unknown>): Promise<ScriptResult>;
  /** Runs an agent step to the end and returns what flows out. */
  agent(req: AgentRunRequest, it: NodeItem): Promise<NodeResult>;
}

export async function executeNode(it: NodeItem, inputs: NodeInput[], perms: Partial<Record<ToolRes, Perm>>, svc: Services, workspace = ''): Promise<NodeResult> {
  const def = NODE_BY[it.ntype] || NODE_DEFS[0], t = def.t;
  if (def.cat === 'info') return infoOut(it);
  const req = nodeRequest(it, inputs, perms, workspace);
  const up = inputs.map((i) => showVal(i.value)).filter(Boolean).join('\n\n');
  const map: Record<string, unknown> = {};
  for (const i of inputs) map[i.from] = i.value;

  if (def.pkg) {
    const pk = def.pkg, body = req.body as { config: Record<string, unknown>; text: string; input: unknown };
    if (!inputs.length) throw new Error('Nothing flows in yet. Connect a step before it.');
    const onServer = async () => {
      const r = await svc.backend('marketRun', req.body);
      return packageResult(pk, r.value === undefined ? null : r.value, r.logs || [], !!r.simulated);
    };
    if (req.where === 'backend') return onServer();
    const res = await svc.script(packageSource(pk.run || '', body.config, body.text), body.input, map);
    if (res.blocked) return onServer();
    return packageResult(pk, res.value === undefined ? null : res.value, res.logs || [], false);
  }

  if (def.cat === 'render') {
    if (!inputs.length) throw new Error('Nothing to render yet. Run the steps before it.');
    const made = makeView(t, inputs);
    return { type: def.out, value: made.value, text: made.text, view: made.view };
  }

  if (t === 'gate') return { type: 'approval', value: inputs.length ? inputs[0].value : null, text: up };

  if (req.kind === 'agent') return svc.agent(req.body as AgentRunRequest, it);

  const viaBackend = async (): Promise<NodeResult> => {
    const r = await svc.backend(req.kind, req.body);
    if (t === 'terminal') return { type: 'logs', value: r.stdout, text: r.stdout, sim: !!r.simulated, meta: { exit: r.exitCode }, logs: r.stderr ? [r.stderr] : [] };
    if (t === 'code') {
      if (r.error) throw new Error(r.error);
      return { type: 'data', value: r.value, text: showVal(r.value), logs: r.logs || [], sim: !!r.simulated };
    }
    if (t === 'http') return { type: 'data', value: r.body, text: showVal(r.body), sim: !!r.simulated, meta: { status: r.status, statusText: r.statusText } };
    const b = req.body as { prompt: string; ratio: string; seconds?: number };
    return { type: def.out, value: r.url || null, text: b.prompt, sim: !!r.simulated, meta: { ratio: b.ratio, seconds: b.seconds, jobId: r.jobId } };
  };

  if (t === 'code' && req.where === 'local') {
    const res = await svc.script(it.text, (req.body as { input: unknown }).input, map);
    if (res.blocked) return viaBackend();
    const v = res.value === undefined ? null : res.value;
    return { type: 'data', value: v, text: showVal(v), logs: res.logs || [] };
  }
  return viaBackend();
}
