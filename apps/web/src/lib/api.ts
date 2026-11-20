// The one place the web app talks to the server. Paths and shapes follow the
// contract in @paradigm/shared (API); the server checks the same shapes.

import type { AgentEvent, AgentRunRequest, Board, BoardSummary, NodePrefs, Workspace } from '@paradigm/shared';
import { API } from '@paradigm/shared';

const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || '';
const KEY = 'paradigm.token';

export class ApiError extends Error {
  constructor(message: string, public status: number, public data: Record<string, unknown> = {}) { super(message); }
}

export const session = {
  get token() { try { return localStorage.getItem(KEY); } catch { return null; } },
  set(t: string | null) { try { if (t) localStorage.setItem(KEY, t); else localStorage.removeItem(KEY); } catch { /* private mode */ } },
};

/** A file address from the server, usable in a link or an <img>. */
export const fileUrl = (u: string | null | undefined) => (!u ? '' : /^https?:/.test(u) ? u : BASE + u);

export async function api<T = any>(method: string, path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (session.token) headers.authorization = `Bearer ${session.token}`;
  let r: Response;
  try { r = await fetch(BASE + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined, signal }); }
  catch (e) { if ((e as Error).name === 'AbortError') throw e; throw new ApiError('The server cannot be reached. Check your connection and try again.', 0); }
  const text = await r.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { error: text }; }
  if (!r.ok) throw new ApiError((data && data.error) || `The server answered ${r.status}`, r.status, data || {});
  return data as T;
}

/** POST that answers with Server-Sent Events. Resolves when the stream ends. */
export async function stream(path: string, body: unknown, onEvent: (e: any) => void, signal?: AbortSignal): Promise<void> {
  const headers: Record<string, string> = { 'content-type': 'application/json', accept: 'text/event-stream' };
  if (session.token) headers.authorization = `Bearer ${session.token}`;
  const r = await fetch(BASE + path, { method: 'POST', headers, body: JSON.stringify(body), signal });
  if (!r.ok) {
    let msg = `The server answered ${r.status}`;
    try { msg = (await r.json()).error || msg; } catch { /* not JSON */ }
    throw new ApiError(msg, r.status);
  }
  const reader = r.body!.getReader(), dec = new TextDecoder();
  let buf = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i: number;
    while ((i = buf.indexOf('\n\n')) >= 0) {
      const chunk = buf.slice(0, i); buf = buf.slice(i + 2);
      for (const line of chunk.split('\n')) if (line.startsWith('data: ')) { try { onEvent(JSON.parse(line.slice(6))); } catch { /* skip */ } }
    }
  }
}

export interface Me { id: string; email: string; name: string; guest: boolean; lang: 'en' | 'zh' }
export interface Signed { token: string; user: Me }
export interface Member { id: string; name: string; email: string; role: string; you: boolean }
export interface Invite { id: string; email: string; role: string }

export const auth = {
  signin: (email: string, password: string) => api<Signed>('POST', '/v1/auth/signin', { email, password }),
  signup: (name: string, email: string, password: string) => api<Signed>('POST', '/v1/auth/signup', { name, email, password }),
  guest: () => api<Signed>('POST', '/v1/auth/guest'),
  link: (email: string, purpose: 'signin' | 'reset' = 'signin') => api<{ sent: boolean; devLink?: string }>('POST', '/v1/auth/link', { email, purpose }),
  verify: (token: string) => api<Signed>('POST', '/v1/auth/link/verify', { token }),
  reset: (token: string, password: string) => api<Signed>('POST', '/v1/auth/reset', { token, password }),
  sso: (next?: string) => api<{ url: string }>('GET', '/v1/auth/sso' + (next ? `?next=${encodeURIComponent(next)}` : '')),
  ssoFinish: (code: string) => api<Signed>('POST', '/v1/auth/sso/finish', { code }),
  signout: () => api('POST', '/v1/auth/signout').catch(() => null),
  me: () => api<{ user: Me }>('GET', '/v1/me'),
  update: (p: Partial<Me> & { password?: string }) => api<{ user: Me }>('PATCH', '/v1/me', p),
};

export const workspaces = {
  list: () => api<{ workspaces: Workspace[] }>('GET', '/v1/workspaces'),
  members: (id: string) => api<{ members: Member[]; invites: Invite[] }>('GET', `/v1/workspaces/${id}/members`),
  invite: (id: string, emails: string[], role: string) => api<{ sent: { email: string; role: string; devLink?: string }[] }>('POST', `/v1/workspaces/${id}/invites`, { emails, role }),
  cancelInvite: (id: string, invite: string) => api('DELETE', `/v1/workspaces/${id}/invites/${invite}`),
  accept: (token: string) => api<{ workspace: Workspace }>('POST', '/v1/invites/accept', { token }),
};

export type Summary = BoardSummary & { tint: string; nodes: number; version: number; createdAt: string; trashedAt: string | null; role?: string; sharedBy?: string };
export type FullBoard = Board & { tint: string; nodes: number; version: number; role: 'owner' | 'editor' | 'viewer' };

export const boards = {
  list: (ws: string, view: 'boards' | 'trash', q = '') => api<{ boards: Summary[] }>('GET', `/v1/workspaces/${ws}/boards?view=${view}&q=${encodeURIComponent(q)}`),
  shared: (q = '') => api<{ boards: Summary[] }>('GET', `/v1/shared?q=${encodeURIComponent(q)}`),
  create: (ws: string, p: { title?: string; template?: string | null; file?: unknown }) => api<{ board: FullBoard }>('POST', `/v1/workspaces/${ws}/boards`, p),
  get: (id: string) => api<{ board: FullBoard }>('GET', `/v1/boards/${id}`),
  save: (id: string, p: { file: unknown; version?: number; title?: string; settings?: unknown }) => api<{ version: number; updatedAt: string }>('PUT', `/v1/boards/${id}`, p),
  rename: (id: string, title: string) => api('PATCH', `/v1/boards/${id}`, { title }),
  trash: (id: string) => api('POST', `/v1/boards/${id}/trash`, {}),
  restore: (id: string) => api('POST', `/v1/boards/${id}/restore`, {}),
};

export const prefs = {
  get: () => api<{ prefs: NodePrefs }>('GET', '/v1/me/nodes'),
  put: (p: Partial<NodePrefs>) => api<{ prefs: NodePrefs }>('PUT', '/v1/me/nodes', p),
};

/** Calls an endpoint by its contract name, as executeNode() asks for. */
export function backend(kind: string, body: unknown): Promise<any> {
  const e = (API as Record<string, { method: string; path: string }>)[kind];
  if (!e) return Promise.reject(new Error(`Unknown backend call ${kind}`));
  let path = e.path;
  if (kind === 'marketRun') path = path.replace('{id}', encodeURIComponent((body as { node: string }).node));
  if (kind === 'videoJob') path = path.replace('{jobId}', encodeURIComponent((body as { jobId: string }).jobId));
  return api(e.method, path, e.method === 'GET' ? undefined : body);
}

export const agent = {
  run: (req: AgentRunRequest, onEvent: (e: AgentEvent) => void, signal?: AbortSignal) => stream('/v1/agent/runs', req, onEvent, signal),
  answer: (runId: string, requestId: string, decision: 'allow_once' | 'allow_always' | 'deny') => api('POST', `/v1/agent/runs/${runId}/permissions`, { requestId, decision }).catch(() => null),
  stop: (runId: string) => api('POST', `/v1/agent/runs/${runId}/stop`, {}).catch(() => null),
  pause: (runId: string) => api('POST', `/v1/agent/runs/${runId}/pause`, {}).catch(() => null),
  resume: (runId: string) => api('POST', `/v1/agent/runs/${runId}/resume`, {}).catch(() => null),
};

export const files = {
  export: (format: 'docx' | 'xlsx' | 'pptx', title: string, content: unknown) => api<{ url: string; name: string }>('POST', '/v1/files/export', { format, title, content }),
};
