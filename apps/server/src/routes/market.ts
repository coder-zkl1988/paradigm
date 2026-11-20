import type { FastifyInstance } from 'fastify';
import { SAMPLE_MANIFESTS, htmlParse, looksHtml, mdBlocks, packageSource, showVal, validateManifest, type Manifest, type NodeInput } from '@paradigm/shared';
import type { Deps } from '../app';
import type { DB } from '../db';
import { now } from '../db';
import { need, type UserRow } from '../lib/auth';
import { bad, conflict, forbidden, notFound } from '../lib/errors';
import { body } from '../lib/http';
import { saveFile } from '../lib/files';
import { runScript } from '../sandbox/script';
import { textPdf } from '../export/pdf';
import type { Config } from '../config';

const cmp = (a: string, b: string) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0); return 0; };

export function listMarket(db: DB): (Manifest & { publisher: string; publishedAt?: string; builtin?: boolean })[] {
  const rows = db.prepare('SELECT m.manifest, m.version, m.published_at, u.name FROM market_nodes m JOIN users u ON u.id = m.publisher_id').all() as { manifest: string; version: string; published_at: string; name: string }[];
  const latest = new Map<string, { m: Manifest; at: string; by: string }>();
  for (const r of rows) {
    const m = JSON.parse(r.manifest) as Manifest, cur = latest.get(m.id);
    if (!cur || cmp(m.version, cur.m.version) > 0) latest.set(m.id, { m, at: r.published_at, by: r.name });
  }
  return [
    ...SAMPLE_MANIFESTS.map((m) => ({ ...m, publisher: 'Paradigm', builtin: true })),
    ...[...latest.values()].filter((x) => !SAMPLE_MANIFESTS.some((s) => s.id === x.m.id)).map((x) => ({ ...x.m, publisher: x.by, publishedAt: x.at })),
  ];
}

export function findManifest(db: DB, id: string, version?: string): Manifest | null {
  const s = SAMPLE_MANIFESTS.find((m) => m.id === id);
  if (s) return s;
  const rows = db.prepare('SELECT manifest, version FROM market_nodes WHERE id = ?').all(id) as { manifest: string; version: string }[];
  const pick = version ? rows.find((r) => r.version === version) : rows.sort((a, b) => cmp(b.version, a.version))[0];
  return pick ? JSON.parse(pick.manifest) : null;
}

export function publish(db: DB, u: UserRow, m: unknown): { ok: boolean; problems: { path: string; text: string }[] } {
  const problems = validateManifest(m);
  if (problems.length) return { ok: false, problems };
  const man = m as Manifest;
  if (SAMPLE_MANIFESTS.some((s) => s.id === man.id)) throw conflict(`The id ${man.id} belongs to a built-in node. Pick another id.`);
  const owner = db.prepare('SELECT publisher_id FROM market_nodes WHERE id = ? LIMIT 1').get(man.id) as { publisher_id: string } | undefined;
  if (owner && owner.publisher_id !== u.id) throw conflict(`Someone else already published a node with the id ${man.id}`);
  if (db.prepare('SELECT 1 FROM market_nodes WHERE id = ? AND version = ?').get(man.id, man.version)) throw conflict(`Version ${man.version} is already published. Raise the version.`);
  db.prepare('INSERT INTO market_nodes (id, version, manifest, publisher_id, published_at) VALUES (?, ?, ?, ?, ?)').run(man.id, man.version, JSON.stringify(man), u.id, now());
  return { ok: true, problems: [] };
}

/** Runs a market node on the server. Built-in backend nodes have their code here; others run their manifest code in the script worker. */
export async function runMarketNode(db: DB, cfg: Config, u: UserRow | null, m: Manifest, input: unknown, inputs: NodeInput[], config: Record<string, unknown>, text: string) {
  if (m.id === 'pdf-export') {
    const src = typeof input === 'string' ? input : showVal(input);
    if (!src.trim()) throw bad('Nothing to put in the PDF yet');
    const page = looksHtml(src) ? htmlParse(src) : null, blocks = page ? page.blocks : mdBlocks(src);
    const title = page?.title || blocks.find((b) => b.k === 'h1')?.text || 'Document';
    const f = await saveFile(db, cfg, u?.id || null, `${title.replace(/[^\w\- ]+/g, '').slice(0, 60) || 'Document'}.pdf`, 'application/pdf', textPdf(title, blocks));
    return { value: { name: f.name, url: f.url, type: 'application/pdf' }, logs: [`Made ${f.name}`] };
  }
  if (!m.run) return { value: null, logs: ['[simulated] This node needs the backend to run.'], simulated: true };
  const map: Record<string, unknown> = {};
  for (const i of inputs || []) map[i.from] = i.value;
  const r = await runScript(packageSource(m.run, config || {}, text || ''), input, map, 5000);
  if (r.error) throw bad(r.error, { logs: r.logs });
  return { value: r.value, logs: r.logs };
}

export function marketRoutes(app: FastifyInstance, { db, cfg }: Deps) {
  app.get('/v1/market/nodes', async (req) => { need(req); return { nodes: listMarket(db) }; });

  app.get('/v1/market/nodes/:id', async (req) => {
    need(req);
    const m = findManifest(db, (req.params as { id: string }).id);
    if (!m) throw notFound('There is no node with this id in the market');
    return { node: m };
  });

  app.post('/v1/market/nodes', async (req) => {
    const u = need(req), b = body(req);
    if (u.guest) throw forbidden('Create an account to publish nodes');
    return publish(db, u, b.manifest ?? b);
  });

  app.delete('/v1/market/nodes/:id', async (req) => {
    const u = need(req), { id } = req.params as { id: string };
    const r = db.prepare('DELETE FROM market_nodes WHERE id = ? AND publisher_id = ?').run(id, u.id);
    if (!r.changes) throw notFound('You have not published a node with this id');
    return { ok: true };
  });

  app.post('/v1/market/nodes/:id/run', { bodyLimit: 12_000_000 }, async (req) => {
    const u = need(req), b = body(req), m = findManifest(db, (req.params as { id: string }).id, b.version);
    if (!m) throw notFound('There is no node with this id in the market');
    return runMarketNode(db, cfg, u, m, b.input ?? null, Array.isArray(b.inputs) ? b.inputs : [], b.config || {}, typeof b.text === 'string' ? b.text : '');
  });
}
