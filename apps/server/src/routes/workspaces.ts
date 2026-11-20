import type { FastifyInstance } from 'fastify';
import type { Deps } from '../app';
import type { DB } from '../db';
import { now } from '../db';
import { need, type UserRow } from '../lib/auth';
import { bad, forbidden, notFound } from '../lib/errors';
import { body, EMAIL, str } from '../lib/http';
import { newId, newSecret, sha256 } from '../lib/ids';

export type Role = 'owner' | 'editor' | 'viewer';
export const roleIn = (db: DB, wsId: string, userId: string): Role | null =>
  ((db.prepare('SELECT role FROM members WHERE workspace_id = ? AND user_id = ?').get(wsId, userId) as { role: Role } | undefined)?.role) || null;

export function needRole(db: DB, wsId: string, u: UserRow, min: Role): Role {
  const r = roleIn(db, wsId, u.id);
  if (!r) throw notFound('This workspace does not exist, or you are not in it');
  const rank = { viewer: 0, editor: 1, owner: 2 };
  if (rank[r] < rank[min]) throw forbidden(min === 'owner' ? 'Only the owner can do this' : 'You can view this workspace but not change it');
  return r;
}

export function workspaceRoutes(app: FastifyInstance, { db, cfg, mailer }: Deps) {
  const list = (u: UserRow) => db.prepare(`SELECT w.id, w.name, w.personal, m.role, (SELECT COUNT(*) FROM members x WHERE x.workspace_id = w.id) AS members
    FROM workspaces w JOIN members m ON m.workspace_id = w.id AND m.user_id = ? ORDER BY w.personal, w.created_at`).all(u.id)
    .map((w: any) => ({ id: w.id, name: w.name, personal: !!w.personal, role: w.role, members: w.members }));

  app.get('/v1/workspaces', async (req) => ({ workspaces: list(need(req)) }));

  app.post('/v1/workspaces', async (req) => {
    const u = need(req), name = str(body(req).name, 'Name', { max: 80 }), id = newId('w');
    db.prepare('INSERT INTO workspaces (id, name, personal, owner_id, created_at) VALUES (?, ?, 0, ?, ?)').run(id, name, u.id, now());
    db.prepare('INSERT INTO members (workspace_id, user_id, role) VALUES (?, ?, ?)').run(id, u.id, 'owner');
    return { workspace: list(u).find((w) => w.id === id) };
  });

  app.patch('/v1/workspaces/:id', async (req) => {
    const u = need(req), { id } = req.params as { id: string };
    needRole(db, id, u, 'owner');
    db.prepare('UPDATE workspaces SET name = ? WHERE id = ?').run(str(body(req).name, 'Name', { max: 80 }), id);
    return { workspace: list(u).find((w) => w.id === id) };
  });

  app.get('/v1/workspaces/:id/members', async (req) => {
    const u = need(req), { id } = req.params as { id: string };
    needRole(db, id, u, 'viewer');
    const members = db.prepare(`SELECT u.id, u.name, u.email, m.role FROM members m JOIN users u ON u.id = m.user_id WHERE m.workspace_id = ?
      ORDER BY CASE m.role WHEN 'owner' THEN 0 WHEN 'editor' THEN 1 ELSE 2 END, u.name`).all(id);
    const invites = db.prepare('SELECT id, email, role, created_at AS createdAt FROM invites WHERE workspace_id = ? ORDER BY created_at').all(id);
    return { members: members.map((m: any) => ({ ...m, you: m.id === u.id })), invites };
  });

  app.post('/v1/workspaces/:id/invites', async (req) => {
    const u = need(req), { id } = req.params as { id: string }, b = body(req);
    needRole(db, id, u, 'editor');
    const emails: string[] = (Array.isArray(b.emails) ? b.emails : String(b.emails || '').split(/[\s,;]+/)).map((e: unknown) => String(e).trim().toLowerCase()).filter(Boolean);
    if (!emails.length) throw bad('Enter at least one email address.');
    const badList = emails.filter((e) => !EMAIL.test(e));
    if (badList.length) throw bad(`Check these addresses: ${badList.join(', ')}`, { invalid: badList });
    if (emails.length > 50) throw bad('Invite at most 50 people at once');
    const role = b.role === 'viewer' ? 'viewer' : 'editor';
    const ws = db.prepare('SELECT name FROM workspaces WHERE id = ?').get(id) as { name: string };
    const sent: { email: string; role: string; devLink?: string }[] = [];
    for (const e of emails) {
      const existing = db.prepare('SELECT u.id FROM users u JOIN members m ON m.user_id = u.id AND m.workspace_id = ? WHERE u.email = ?').get(id, e);
      if (existing) continue;
      const token = newSecret();
      db.prepare(`INSERT INTO invites (id, workspace_id, email, role, token_hash, invited_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (workspace_id, email) DO UPDATE SET role = excluded.role, token_hash = excluded.token_hash`).run(newId('inv'), id, e, role, sha256(token), u.id, now());
      const link = `${cfg.publicUrl}/invite?token=${token}`;
      const r = await mailer.send({ to: e, subject: `${u.name} invited you to ${ws.name}`, text: `Join ${ws.name}: ${link}`, link });
      sent.push({ email: e, role, ...(r.devLink ? { devLink: r.devLink } : {}) });
    }
    return { sent };
  });

  app.delete('/v1/workspaces/:id/invites/:invite', async (req) => {
    const u = need(req), { id, invite } = req.params as { id: string; invite: string };
    needRole(db, id, u, 'editor');
    db.prepare('DELETE FROM invites WHERE id = ? AND workspace_id = ?').run(invite, id);
    return { ok: true };
  });

  app.post('/v1/invites/accept', async (req) => {
    const u = need(req), t = str(body(req).token, 'Invite', { max: 200 });
    const inv = db.prepare('SELECT * FROM invites WHERE token_hash = ?').get(sha256(t)) as { id: string; workspace_id: string; role: string } | undefined;
    if (!inv) throw notFound('This invite was cancelled or already used');
    db.prepare('INSERT OR IGNORE INTO members (workspace_id, user_id, role) VALUES (?, ?, ?)').run(inv.workspace_id, u.id, inv.role);
    db.prepare('DELETE FROM invites WHERE id = ?').run(inv.id);
    return { workspace: list(u).find((w) => w.id === inv.workspace_id) };
  });

  app.patch('/v1/workspaces/:id/members/:user', async (req) => {
    const u = need(req), { id, user } = req.params as { id: string; user: string }, role = body(req).role;
    needRole(db, id, u, 'owner');
    if (role !== 'editor' && role !== 'viewer') throw bad('Role is editor or viewer');
    if (user === u.id) throw bad('You are the owner of this workspace');
    db.prepare('UPDATE members SET role = ? WHERE workspace_id = ? AND user_id = ? AND role != ?').run(role, id, user, 'owner');
    return { ok: true };
  });

  app.delete('/v1/workspaces/:id/members/:user', async (req) => {
    const u = need(req), { id, user } = req.params as { id: string; user: string };
    if (user !== u.id) needRole(db, id, u, 'owner');
    if (roleIn(db, id, user) === 'owner') throw bad('The owner cannot leave the workspace');
    db.prepare('DELETE FROM members WHERE workspace_id = ? AND user_id = ?').run(id, user);
    return { ok: true };
  });
}
