// One agent run: the events it has sent so far, who is listening, and the
// permission questions waiting for an answer. Runs live in memory; the board
// keeps what the person needs once the run is over.

import type { AgentEvent, PermissionAnswer } from '@paradigm/shared';
import { DEFAULT_PERMS, toolEventText, type Perm, type ToolEvent, type ToolRes } from '@paradigm/shared';
import { newId } from '../lib/ids';

type Decision = PermissionAnswer['decision'];
interface Waiting { resolve: (d: Decision) => void; res: ToolRes; toolCallId: string; timer: NodeJS.Timeout }

/** How long a permission question waits before it counts as a no. */
export const ASK_TIMEOUT_MS = 10 * 60 * 1000;

export class Run {
  readonly id = newId('run');
  readonly abort = new AbortController();
  readonly events: AgentEvent[] = [];
  private listeners = new Set<(e: AgentEvent) => void>();
  private waiting = new Map<string, Waiting>();
  private always = new Set<ToolRes>();
  private status = new Map<string, string>();
  finished = false;
  readonly startedAt = Date.now();
  private held: Promise<void> | null = null;
  private release: (() => void) | null = null;

  constructor(readonly userId: string, readonly perms: Partial<Record<ToolRes, Perm>>) {}

  emit(e: AgentEvent) {
    if (this.finished) return;
    this.events.push(e);
    for (const l of this.listeners) l(e);
    if (e.type === 'result') { this.finished = true; this.cancelQuestions(); }
  }

  listen(fn: (e: AgentEvent) => void): () => void {
    for (const e of this.events) fn(e);
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  permOf(res: ToolRes): Perm { return this.perms[res] || DEFAULT_PERMS[res] || 'ask'; }

  /** Pausing holds the next tool call (and so the agent) until resume() or stop(). */
  pause() { if (this.finished || this.held) return; this.held = new Promise<void>((r) => { this.release = r; }); }
  resume() { const r = this.release; this.held = null; this.release = null; r?.(); }
  get paused() { return !!this.held; }
  async hold() { while (this.held && !this.abort.signal.aborted) await this.held; }

  /** Shows a tool call on the board. Returns false when it may not run. */
  async toolCall(id: string, ev: ToolEvent, more: Partial<Extract<AgentEvent, { type: 'tool_call' }>> = {}): Promise<boolean> {
    await this.hold();
    if (this.abort.signal.aborted) return false;
    this.emit({ type: 'tool_call', id, res: ev.res, op: ev.op, title: toolEventText(ev), tool: ev.tool, target: ev.target, parent: ev.parent || null, ...(ev.sub ? { sub: ev.sub } : {}), raw: ev.raw, ...more });
    const ok = await this.gate(id, ev.res, toolEventText(ev));
    this.update(id, ok ? 'in_progress' : 'blocked');
    return ok;
  }

  update(id: string, status: 'in_progress' | 'completed' | 'failed' | 'blocked') {
    const was = this.status.get(id);
    if (was === 'blocked' || was === 'completed' || was === 'failed' || was === status) return;
    this.status.set(id, status);
    this.emit({ type: 'tool_call_update', id, status });
  }

  /** Allowed, blocked, or asks the person and waits. */
  async gate(toolCallId: string, res: ToolRes, title: string): Promise<boolean> {
    const p = this.permOf(res);
    if (p === 'allow' || this.always.has(res)) return true;
    if (p === 'blocked') return false;
    const d = await this.ask(toolCallId, res, title);
    if (d === 'allow_always') this.always.add(res);
    return d !== 'deny';
  }

  ask(toolCallId: string, res: ToolRes, title: string): Promise<Decision> {
    if (this.finished || this.abort.signal.aborted) return Promise.resolve('deny');
    const requestId = newId('perm');
    return new Promise<Decision>((resolve) => {
      const timer = setTimeout(() => this.answer({ requestId, decision: 'deny' }), ASK_TIMEOUT_MS);
      this.waiting.set(requestId, { resolve, res, toolCallId, timer });
      this.emit({ type: 'permission_request', requestId, toolCallId, res, title, options: ['allow_once', 'allow_always', 'deny'] });
    });
  }

  answer(a: PermissionAnswer): boolean {
    const w = this.waiting.get(a.requestId);
    if (!w) return false;
    clearTimeout(w.timer);
    this.waiting.delete(a.requestId);
    w.resolve(a.decision);
    return true;
  }

  get asking() { return this.waiting.size; }

  private cancelQuestions() {
    for (const [id] of this.waiting) this.answer({ requestId: id, decision: 'deny' });
  }

  stop() {
    this.abort.abort();
    this.resume();
    this.cancelQuestions();
  }
}

export class RunStore {
  private runs = new Map<string, Run>();
  private sweep: NodeJS.Timeout;

  constructor(private keepMs = 30 * 60 * 1000) {
    this.sweep = setInterval(() => this.clean(), 60 * 1000);
    this.sweep.unref();
  }

  create(userId: string, perms: Partial<Record<ToolRes, Perm>>): Run {
    const r = new Run(userId, perms);
    this.runs.set(r.id, r);
    return r;
  }

  get(id: string) { return this.runs.get(id); }

  clean() {
    const t = Date.now();
    for (const [id, r] of this.runs) if (r.finished && t - r.startedAt > this.keepMs) this.runs.delete(id);
  }

  close() {
    clearInterval(this.sweep);
    for (const r of this.runs.values()) r.stop();
  }
}
