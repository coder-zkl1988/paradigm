import type { FastifyInstance } from 'fastify';
import type { AgentRunRequest, AgentEvent, HarnessId, NodeInput } from '@paradigm/shared';
import { TOOL_ORDER } from '@paradigm/shared';
import type { Deps } from '../app';
import { startRun } from '../agents';
import { need } from '../lib/auth';
import { bad, notFound } from '../lib/errors';
import { body, sse } from '../lib/http';
import { folderFor } from '../lib/access';

const HARNESS: HarnessId[] = ['pi', 'claude', 'codex', 'acp'];
const PERMS = ['allow', 'ask', 'blocked'];

function readRequest(b: Record<string, any>): AgentRunRequest {
  const harness = b.harness as HarnessId;
  if (!HARNESS.includes(harness)) throw bad('harness is pi, claude, codex or acp');
  if (typeof b.instruction !== 'string' || b.instruction.length > 20_000) throw bad('instruction must be text, at most 20,000 characters');
  if (!Array.isArray(b.inputs) || b.inputs.length > 50) throw bad('inputs must be a list of at most 50 items');
  const inputs: NodeInput[] = b.inputs.map((i: any) => {
    if (!i || typeof i.from !== 'string' || typeof i.type !== 'string') throw bad('Each input has from and type');
    return { from: i.from.slice(0, 80), type: i.type.slice(0, 20), value: i.value, ...(typeof i.label === 'string' ? { label: i.label.slice(0, 80) } : {}) };
  });
  const permissions: AgentRunRequest['permissions'] = {};
  for (const [k, v] of Object.entries(b.permissions || {})) if ([...TOOL_ORDER, 'board'].includes(k as never) && PERMS.includes(v as string)) (permissions as any)[k] = v;
  const req: AgentRunRequest = { harness, instruction: b.instruction, inputs, permissions, workspace: '' };
  if (typeof b.agent === 'string') req.agent = b.agent.slice(0, 40);
  if (typeof b.optName === 'string') req.optName = b.optName.slice(0, 4);
  if (b.context && typeof b.context === 'object') req.context = { text: String(b.context.text || '').slice(0, 20_000), feeds: Array.isArray(b.context.feeds) ? b.context.feeds.map(String).slice(0, 20) : [] };
  if (b.surface === 'chat') {
    const c = b.chat || {};
    if (c.mode !== 'diagram' && c.mode !== 'flow') throw bad('chat.mode is diagram or flow');
    const a = c.area;
    req.surface = 'chat';
    req.chat = {
      mode: c.mode, board: c.board ?? [], selected: Array.isArray(c.selected) ? c.selected.map(String).slice(0, 200) : [],
      area: a && [a.x, a.y, a.w, a.h].every((n) => typeof n === 'number' && Number.isFinite(n)) ? { x: a.x, y: a.y, w: a.w, h: a.h, contains: Array.isArray(a.contains) ? a.contains.map(String) : [] } : null,
      tools: Array.isArray(c.tools) ? c.tools.map(String) : [],
    };
  }
  return req;
}

export function agentRoutes(app: FastifyInstance, { db, cfg, runs, origin }: Deps) {
  app.post('/v1/agent/runs', { bodyLimit: 12_000_000 }, async (req, reply) => {
    const u = need(req), b = body(req), r = readRequest(b);
    r.workspace = folderFor(db, u, b.workspace);
    const run = startRun(cfg, runs, u.id, r);
    if ((req.query as { wait?: string }).wait) {
      await new Promise<void>((done) => { const off = run.listen((e) => { if (e.type === 'result') { setImmediate(() => off()); done(); } }); });
      return { runId: run.id, events: run.events };
    }
    const s = sse(req, reply, origin(req));
    const off = run.listen((e: AgentEvent) => { s.send(e); if (e.type === 'result') s.end(); });
    s.onClose(off);
  });

  /** Re-attach to a run after the page reloads: replays what happened, then streams the rest. */
  app.get('/v1/agent/runs/:id/events', async (req, reply) => {
    const u = need(req), run = runs.get((req.params as { id: string }).id);
    if (!run || run.userId !== u.id) throw notFound('This run is over or was never started here');
    const s = sse(req, reply, origin(req));
    const off = run.listen((e) => { s.send(e); if (e.type === 'result') s.end(); });
    s.onClose(off);
  });

  app.post('/v1/agent/runs/:id/permissions', async (req) => {
    const u = need(req), run = runs.get((req.params as { id: string }).id), b = body(req);
    if (!run || run.userId !== u.id) throw notFound('This run is over or was never started here');
    if (!['allow_once', 'allow_always', 'deny'].includes(b.decision)) throw bad('decision is allow_once, allow_always or deny');
    if (!run.answer({ requestId: String(b.requestId), decision: b.decision })) throw notFound('This question was already answered');
    return { ok: true };
  });

  for (const action of ['pause', 'resume'] as const) {
    app.post(`/v1/agent/runs/:id/${action}`, async (req) => {
      const u = need(req), run = runs.get((req.params as { id: string }).id);
      if (!run || run.userId !== u.id) throw notFound('This run is over or was never started here');
      run[action]();
      return { ok: true, paused: run.paused };
    });
  }

  app.post('/v1/agent/runs/:id/stop', async (req) => {
    const u = need(req), run = runs.get((req.params as { id: string }).id);
    if (!run || run.userId !== u.id) throw notFound('This run is over or was never started here');
    run.stop();
    return { ok: true };
  });
}
