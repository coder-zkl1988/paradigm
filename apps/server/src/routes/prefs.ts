import type { FastifyInstance } from 'fastify';
import { DEFAULT_PINS, DEFAULT_SHELF, NODE_BY, PIN_MAX, validateManifest, type NodePrefs } from '@paradigm/shared';
import type { Deps } from '../app';
import { need } from '../lib/auth';
import { bad } from '../lib/errors';
import { body } from '../lib/http';

const DEFAULTS = (): NodePrefs => ({ pins: [...DEFAULT_PINS], shelf: [...DEFAULT_SHELF], installed: [], mine: [] });

export function prefRoutes(app: FastifyInstance, { db }: Deps) {
  const read = (userId: string): NodePrefs => {
    const r = db.prepare('SELECT prefs FROM node_prefs WHERE user_id = ?').get(userId) as { prefs: string } | undefined;
    return r ? { ...DEFAULTS(), ...JSON.parse(r.prefs) } : DEFAULTS();
  };

  app.get('/v1/me/nodes', async (req) => ({ prefs: read(need(req).id) }));

  /** Pins on the toolbar, the Nodes panel, installed market nodes and the person's own nodes. */
  app.put('/v1/me/nodes', async (req) => {
    const u = need(req), b = body(req), cur = read(u.id);
    const ids = (v: unknown, name: string) => {
      if (!Array.isArray(v) || v.some((x) => typeof x !== 'string' || x.length > 80)) throw bad(`${name} must be a list of node types`);
      return [...new Set(v as string[])];
    };
    const next: NodePrefs = { ...cur };
    if (b.pins !== undefined) { next.pins = ids(b.pins, 'pins'); if (next.pins.length > PIN_MAX) throw bad(`Pin at most ${PIN_MAX} nodes`); }
    if (b.shelf !== undefined) next.shelf = ids(b.shelf, 'shelf').slice(0, 200);
    if (b.installed !== undefined) next.installed = ids(b.installed, 'installed').slice(0, 200);
    if (b.mine !== undefined) {
      if (!Array.isArray(b.mine) || b.mine.length > 50) throw bad('mine must be a list of at most 50 manifests');
      for (const m of b.mine) { const p = validateManifest(m); if (p.length) throw bad(`${(m && m.name) || 'A node'}: ${p[0].text}`, { problems: p }); }
      next.mine = b.mine;
    }
    const unknown = next.pins.filter((t) => !NODE_BY[t] && !t.startsWith('pkg:'));
    if (unknown.length) throw bad(`Unknown node type: ${unknown[0]}`);
    db.prepare('INSERT INTO node_prefs (user_id, prefs) VALUES (?, ?) ON CONFLICT (user_id) DO UPDATE SET prefs = excluded.prefs').run(u.id, JSON.stringify(next));
    return { prefs: next };
  });
}
