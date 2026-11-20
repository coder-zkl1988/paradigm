// Sessions are bearer tokens: random, sent once, stored only as a hash.
// API tokens (for the MCP server and scripts) work the same way.

import type { FastifyRequest } from 'fastify';
import type { DB } from '../db';
import { now } from '../db';
import { newId, newSecret, sha256 } from './ids';
import { unauthorized } from './errors';

export interface UserRow { id: string; email: string | null; name: string; guest: number; lang: string; pw_hash: string | null; created_at: string }
export interface PublicUser { id: string; email: string; name: string; guest: boolean; lang: string }

const DAY = 86_400_000;
export const SESSION_DAYS = 30;

export const publicUser = (u: UserRow): PublicUser => ({ id: u.id, email: u.email || '', name: u.name, guest: !!u.guest, lang: u.lang });

export function createSession(db: DB, userId: string): string {
  const token = newSecret();
  db.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(sha256(token), userId, now(), new Date(Date.now() + SESSION_DAYS * DAY).toISOString());
  return token;
}

export function userFromToken(db: DB, token: string): UserRow | null {
  const h = sha256(token);
  const s = db.prepare('SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?').get(h, now()) as UserRow | undefined;
  if (s) return s;
  return (db.prepare('SELECT u.* FROM api_tokens t JOIN users u ON u.id = t.user_id WHERE t.token_hash = ?').get(h) as UserRow | undefined) || null;
}

export function bearer(req: FastifyRequest): string | null {
  const h = req.headers.authorization;
  if (h && /^Bearer\s+/i.test(h)) return h.replace(/^Bearer\s+/i, '').trim() || null;
  const q = (req.query as Record<string, unknown> | undefined)?.token;
  return typeof q === 'string' && q ? q : null;
}

export function need(req: FastifyRequest): UserRow {
  const u = (req as FastifyRequest & { user?: UserRow | null }).user;
  if (!u) throw unauthorized();
  return u;
}

/** A new account gets a personal workspace and a team workspace, like the draft shows. */
export function createUser(db: DB, o: { email: string | null; name: string; pwHash: string | null; guest?: boolean }): UserRow {
  const id = newId('u'), t = now();
  db.transaction(() => {
    db.prepare('INSERT INTO users (id, email, name, pw_hash, guest, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(id, o.email, o.name, o.pwHash, o.guest ? 1 : 0, t);
    const first = o.name.split(/\s+/)[0] || o.name;
    const team = newId('w'), mine = newId('w');
    db.prepare('INSERT INTO workspaces (id, name, personal, owner_id, created_at) VALUES (?, ?, 0, ?, ?)').run(team, o.guest ? 'Guest team' : `${first}'s team`, id, t);
    db.prepare('INSERT INTO workspaces (id, name, personal, owner_id, created_at) VALUES (?, ?, 1, ?, ?)').run(mine, 'Personal', id, t);
    db.prepare('INSERT INTO members (workspace_id, user_id, role) VALUES (?, ?, ?)').run(team, id, 'owner');
    db.prepare('INSERT INTO members (workspace_id, user_id, role) VALUES (?, ?, ?)').run(mine, id, 'owner');
  })();
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow;
}

/** Joins every workspace this email was invited to. */
export function acceptInvitesFor(db: DB, user: UserRow) {
  if (!user.email) return;
  const rows = db.prepare('SELECT * FROM invites WHERE email = ?').all(user.email) as { id: string; workspace_id: string; role: string }[];
  for (const r of rows) {
    db.prepare('INSERT OR IGNORE INTO members (workspace_id, user_id, role) VALUES (?, ?, ?)').run(r.workspace_id, user.id, r.role);
    db.prepare('DELETE FROM invites WHERE id = ?').run(r.id);
  }
}
