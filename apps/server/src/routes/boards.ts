import type { FastifyInstance } from 'fastify';
import { fromFile, sampleBoard, starterItems, toFile, TEMPLATES, TEMPLATE_INFO, GROUP_LABEL, STARTERS } from '@paradigm/shared';
import type { Deps } from '../app';
import type { DB } from '../db';
import { now } from '../db';
import { need, type UserRow } from '../lib/auth';
import { bad, conflict, forbidden, notFound } from '../lib/errors';
import { body, EMAIL, str } from '../lib/http';
import { newId, newSecret } from '../lib/ids';
import { needRole, roleIn, type Role } from './workspaces';

const TINTS = ['#BFD7FF', '#FFE38A', '#ADE2A9', '#FFC9D6', '#E3D3FF', '#FFD3A8'];
const MAX_FILE = 8_000_000;

interface BoardRow { id: string; workspace_id: string; owner_id: string; title: string; tint: string; template: string | null; file: string; settings: string; nodes: number; version: number; created_at: string; updated_at: string; trashed_at: string | null }

/** The role a person has on one board: from its workspace, or from a share. */
export function boardRole(db: DB, b: BoardRow, userId: string): Role | null {
  const ws = roleIn(db, b.workspace_id, userId);
  if (ws) return ws;
  const s = db.prepare('SELECT role FROM board_shares WHERE board_id = ? AND user_id = ?').get(b.id, userId) as { role: Role } | undefined;
  return s ? s.role : null;
}

export function loadBoard(db: DB, id: string, u: UserRow, min: Role): { b: BoardRow; role: Role } {
  const b = db.prepare('SELECT * FROM boards WHERE id = ?').get(id) as BoardRow | undefined;
  const role = b ? boardRole(db, b, u.id) : null;
  if (!b || !role) throw notFound('This board does not exist, or it is not shared with you');
  const rank = { viewer: 0, editor: 1, owner: 2 };
  if (rank[role] < rank[min]) throw forbidden('You can view this board but not change it');
  return { b, role };
}

/** Checks a board file the way Import does, and counts its workflow nodes. */
function checkFile(file: unknown): { json: string; nodes: number } {
  let items;
  try { items = fromFile(file); } catch (e) { throw bad((e as Error).message); }
  const json = JSON.stringify(file);
  if (json.length > MAX_FILE) throw bad('The board is too large to save (8 MB at most)');
  return { json, nodes: items.filter((o) => o.kind === 'node').length };
}

export function boardRoutes(app: FastifyInstance, { db }: Deps) {
  const summary = (r: BoardRow & { owner_name?: string; role?: string; shared_by?: string }) => ({
    id: r.id, workspaceId: r.workspace_id, title: r.title, tint: r.tint, template: r.template, nodes: r.nodes, version: r.version,
    createdAt: r.created_at, updatedAt: r.updated_at, trashedAt: r.trashed_at, owner: r.owner_name || '', ...(r.role ? { role: r.role } : {}), ...(r.shared_by ? { sharedBy: r.shared_by } : {}),
  });
  const full = (b: BoardRow, role: Role) => ({ ...summary(b), role, file: JSON.parse(b.file), settings: JSON.parse(b.settings || '{}') });

  app.get('/v1/templates', async () => ({
    groups: GROUP_LABEL,
    templates: Object.entries(TEMPLATES).map(([key, t]) => ({ key, name: t.name, group: TEMPLATE_INFO[key]?.group, steps: TEMPLATE_INFO[key]?.steps, zhName: TEMPLATE_INFO[key]?.zhName, zhSteps: TEMPLATE_INFO[key]?.zhSteps, chain: t.n.map((n) => n[1]) })),
    starters: STARTERS,
  }));

  app.get('/v1/workspaces/:id/boards', async (req) => {
    const u = need(req), { id } = req.params as { id: string }, q = req.query as { view?: string; q?: string };
    needRole(db, id, u, 'viewer');
    const trash = q.view === 'trash', like = q.q ? `%${String(q.q).toLowerCase().slice(0, 100)}%` : '%';
    const rows = db.prepare(`SELECT b.*, u.name AS owner_name FROM boards b JOIN users u ON u.id = b.owner_id
      WHERE b.workspace_id = ? AND (b.trashed_at IS ${trash ? 'NOT ' : ''}NULL) AND LOWER(b.title) LIKE ? ORDER BY ${trash ? 'b.trashed_at' : 'b.updated_at'} DESC LIMIT 500`).all(id, like) as BoardRow[];
    return { boards: rows.map(summary) };
  });

  app.get('/v1/shared', async (req) => {
    const u = need(req), q = req.query as { q?: string }, like = q.q ? `%${String(q.q).toLowerCase().slice(0, 100)}%` : '%';
    const rows = db.prepare(`SELECT b.*, o.name AS owner_name, s.role AS role, sb.name AS shared_by FROM board_shares s JOIN boards b ON b.id = s.board_id
      JOIN users o ON o.id = b.owner_id JOIN users sb ON sb.id = s.shared_by
      WHERE s.user_id = ? AND b.trashed_at IS NULL AND LOWER(b.title) LIKE ? ORDER BY b.updated_at DESC`).all(u.id, like) as BoardRow[];
    return { boards: rows.map(summary) };
  });

  app.post('/v1/workspaces/:id/boards', async (req) => {
    const u = need(req), { id } = req.params as { id: string }, b = body(req);
    needRole(db, id, u, 'editor');
    const template = b.template ? str(b.template, 'Template', { max: 60 }) : null;
    let items = template === 'Sample' ? sampleBoard() : template ? starterItems(template) : [];
    if (template && !items) throw bad(`There is no template called ${template}`);
    let file: unknown = toFile(items || []);
    if (b.file !== undefined) file = b.file;
    const { json, nodes } = checkFile(file);
    const title = b.title ? str(b.title, 'Title', { max: 120 }) : template ? (TEMPLATES[template]?.name || STARTERS.find((s) => s.key === template)?.title || template) : 'Untitled board';
    const count = (db.prepare('SELECT COUNT(*) AS n FROM boards WHERE workspace_id = ?').get(id) as { n: number }).n;
    const bid = newId('b'), t = now();
    db.prepare('INSERT INTO boards (id, workspace_id, owner_id, title, tint, template, file, settings, nodes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(bid, id, u.id, title, TINTS[count % TINTS.length], template, json, JSON.stringify(b.settings && typeof b.settings === 'object' ? b.settings : {}), nodes, t, t);
    const { b: row, role } = loadBoard(db, bid, u, 'viewer');
    return { board: full(row, role) };
  });

  app.get('/v1/boards/:id', async (req) => {
    const u = need(req), { b, role } = loadBoard(db, (req.params as { id: string }).id, u, 'viewer');
    return { board: full(b, role) };
  });

  /** Autosave. `version` is the one the page loaded; a newer one on the server is a conflict. */
  app.put('/v1/boards/:id', { bodyLimit: MAX_FILE + 100_000 }, async (req) => {
    const u = need(req), { b } = loadBoard(db, (req.params as { id: string }).id, u, 'editor'), x = body(req);
    if (b.trashed_at) throw bad('This board is in the trash. Restore it to change it.');
    if (typeof x.version === 'number' && x.version !== b.version) throw conflict('Someone else changed this board. Load their version first.', { version: b.version });
    const { json, nodes } = checkFile(x.file);
    const title = x.title !== undefined ? str(x.title, 'Title', { max: 120 }) : b.title;
    const settings = x.settings !== undefined ? JSON.stringify(x.settings || {}) : b.settings;
    const t = now();
    db.prepare('UPDATE boards SET file = ?, nodes = ?, title = ?, settings = ?, version = version + 1, updated_at = ? WHERE id = ?').run(json, nodes, title, settings, t, b.id);
    return { version: b.version + 1, updatedAt: t, nodes };
  });

  app.patch('/v1/boards/:id', async (req) => {
    const u = need(req), { b } = loadBoard(db, (req.params as { id: string }).id, u, 'editor'), x = body(req);
    if (x.title !== undefined) db.prepare('UPDATE boards SET title = ?, updated_at = ? WHERE id = ?').run(str(x.title, 'Title', { max: 120 }), now(), b.id);
    if (x.settings !== undefined) db.prepare('UPDATE boards SET settings = ? WHERE id = ?').run(JSON.stringify(x.settings || {}), b.id);
    const r = loadBoard(db, b.id, u, 'viewer');
    return { board: summary(r.b) };
  });

  app.post('/v1/boards/:id/duplicate', async (req) => {
    const u = need(req), { b } = loadBoard(db, (req.params as { id: string }).id, u, 'viewer');
    const ws = roleIn(db, b.workspace_id, u.id) && roleIn(db, b.workspace_id, u.id) !== 'viewer' ? b.workspace_id
      : (db.prepare('SELECT w.id FROM workspaces w JOIN members m ON m.workspace_id = w.id WHERE m.user_id = ? AND w.personal = 1').get(u.id) as { id: string }).id;
    const id = newId('b'), t = now();
    db.prepare('INSERT INTO boards (id, workspace_id, owner_id, title, tint, template, file, settings, nodes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, ws, u.id, `${b.title} (copy)`, b.tint, b.template, b.file, b.settings, b.nodes, t, t);
    const r = loadBoard(db, id, u, 'viewer');
    return { board: summary(r.b) };
  });

  app.post('/v1/boards/:id/trash', async (req) => {
    const u = need(req), { b } = loadBoard(db, (req.params as { id: string }).id, u, 'editor');
    db.prepare('UPDATE boards SET trashed_at = ? WHERE id = ?').run(now(), b.id);
    return { ok: true };
  });

  app.post('/v1/boards/:id/restore', async (req) => {
    const u = need(req), { b } = loadBoard(db, (req.params as { id: string }).id, u, 'editor');
    db.prepare('UPDATE boards SET trashed_at = NULL, updated_at = ? WHERE id = ?').run(now(), b.id);
    return { ok: true };
  });

  app.delete('/v1/boards/:id', async (req) => {
    const u = need(req), { b } = loadBoard(db, (req.params as { id: string }).id, u, 'editor');
    if (!b.trashed_at) throw bad('Move the board to the trash first');
    db.prepare('DELETE FROM boards WHERE id = ?').run(b.id);
    return { ok: true };
  });

  /** The board's view link: made once, then the same one until it is turned off. */
  app.post('/v1/boards/:id/link', async (req) => {
    const u = need(req), { b } = loadBoard(db, (req.params as { id: string }).id, u, 'editor');
    const row = db.prepare('SELECT token FROM board_links WHERE board_id = ?').get(b.id) as { token: string } | undefined;
    if (row) return { token: row.token };
    const token = newSecret().slice(0, 24);
    db.prepare('INSERT INTO board_links (board_id, token, created_by, created_at) VALUES (?, ?, ?, ?)').run(b.id, token, u.id, now());
    return { token };
  });

  app.delete('/v1/boards/:id/link', async (req) => {
    const u = need(req), { b } = loadBoard(db, (req.params as { id: string }).id, u, 'editor');
    db.prepare('DELETE FROM board_links WHERE board_id = ?').run(b.id);
    return { ok: true };
  });

  /** Opens a board by its view link. No account needed; the board cannot be changed through it. */
  app.get('/v1/public/:token', async (req) => {
    const t = String((req.params as { token: string }).token || '');
    const b = db.prepare('SELECT b.* FROM board_links l JOIN boards b ON b.id = l.board_id WHERE l.token = ? AND b.trashed_at IS NULL').get(t) as BoardRow | undefined;
    if (!b) throw notFound('This link was turned off, or the board was deleted');
    const st = JSON.parse(b.settings || '{}');
    return { board: { id: b.id, title: b.title, nodes: b.nodes, version: b.version, updatedAt: b.updated_at, createdAt: b.created_at, role: 'viewer', file: JSON.parse(b.file), settings: { bg: st.bg } } };
  });

  app.get('/v1/boards/:id/shares', async (req) => {
    const u = need(req), { b } = loadBoard(db, (req.params as { id: string }).id, u, 'viewer');
    return { shares: db.prepare('SELECT u.id, u.name, u.email, s.role FROM board_shares s JOIN users u ON u.id = s.user_id WHERE s.board_id = ?').all(b.id) };
  });

  app.post('/v1/boards/:id/shares', async (req) => {
    const u = need(req), { b } = loadBoard(db, (req.params as { id: string }).id, u, 'editor'), x = body(req);
    const e = str(x.email, 'Email', { max: 254 }).toLowerCase();
    if (!EMAIL.test(e)) throw bad('Check the email');
    const role = x.role === 'editor' ? 'editor' : 'viewer';
    const who = db.prepare('SELECT id FROM users WHERE email = ?').get(e) as { id: string } | undefined;
    if (!who) throw notFound('No one with this email has an account yet. Invite them to the workspace instead.');
    db.prepare('INSERT INTO board_shares (board_id, user_id, role, shared_by) VALUES (?, ?, ?, ?) ON CONFLICT (board_id, user_id) DO UPDATE SET role = excluded.role').run(b.id, who.id, role, u.id);
    return { ok: true };
  });

  app.delete('/v1/boards/:id/shares/:user', async (req) => {
    const u = need(req), p = req.params as { id: string; user: string }, { b } = loadBoard(db, p.id, u, 'editor');
    db.prepare('DELETE FROM board_shares WHERE board_id = ? AND user_id = ?').run(b.id, p.user);
    return { ok: true };
  });
}
