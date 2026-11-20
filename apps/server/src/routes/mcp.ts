// The node market as an MCP server, so a coding agent can read the spec,
// check a node, try it and publish it. Streamable HTTP, JSON answers only.
// Sign in with an API token made in the app (Authorization: Bearer ...).

import type { FastifyInstance } from 'fastify';
import { MCP_TOOLS, SPEC, UI_RULES, packageResult, validateManifest, type Manifest } from '@paradigm/shared';
import type { Deps } from '../app';
import { now } from '../db';
import { need } from '../lib/auth';
import { body, str } from '../lib/http';
import { newSecret, sha256 } from '../lib/ids';
import { publish, runMarketNode } from './market';

const PROTOCOL = '2025-06-18';
const manifestArg = { type: 'object', properties: { manifest: { type: 'object', description: 'The node manifest (flowboard-node/1)' } }, required: ['manifest'] };
const SCHEMAS: Record<string, unknown> = {
  get_node_spec: { type: 'object', properties: {} },
  get_ui_rules: { type: 'object', properties: {} },
  list_stickers: { type: 'object', properties: {} },
  validate_node: manifestArg,
  preview_node: { type: 'object', properties: { manifest: { type: 'object' }, input: { description: 'Sample input, as the node would get it' }, text: { type: 'string' }, config: { type: 'object' } }, required: ['manifest'] },
  publish_node: manifestArg,
};

export function mcpRoutes(app: FastifyInstance, deps: Deps) {
  const { db, cfg } = deps;

  app.get('/v1/me/tokens', async (req) => ({ tokens: db.prepare('SELECT label, created_at AS createdAt, substr(token_hash, 1, 8) AS id FROM api_tokens WHERE user_id = ? ORDER BY created_at').all(need(req).id) }));
  app.post('/v1/me/tokens', async (req) => {
    const u = need(req), label = str(body(req).label, 'Label', { max: 60, optional: true }) || 'MCP', token = 'pdm_' + newSecret();
    db.prepare('INSERT INTO api_tokens (token_hash, user_id, label, created_at) VALUES (?, ?, ?, ?)').run(sha256(token), u.id, label, now());
    return { token, label };
  });
  app.delete('/v1/me/tokens/:id', async (req) => {
    const u = need(req);
    db.prepare("DELETE FROM api_tokens WHERE user_id = ? AND substr(token_hash, 1, 8) = ?").run(u.id, (req.params as { id: string }).id);
    return { ok: true };
  });

  app.post('/mcp', { bodyLimit: 2_000_000 }, async (req, reply) => {
    const u = need(req), m = req.body as { id?: number | string; method?: string; params?: any };
    const ok = (result: unknown) => ({ jsonrpc: '2.0', id: m.id, result });
    const fail = (code: number, message: string) => ({ jsonrpc: '2.0', id: m.id ?? null, error: { code, message } });
    if (!m || typeof m.method !== 'string') return fail(-32600, 'Not a JSON-RPC request');
    if (m.id === undefined) { reply.code(202); return ''; }
    if (m.method === 'initialize') return ok({ protocolVersion: PROTOCOL, capabilities: { tools: {} }, serverInfo: { name: 'paradigm-node-market', version: '0.1.0' }, instructions: 'Build nodes for the Paradigm node market. Read get_node_spec and get_ui_rules first, check with validate_node, try with preview_node, then publish_node.' });
    if (m.method === 'ping') return ok({});
    if (m.method === 'tools/list') return ok({ tools: MCP_TOOLS.map(([name, description]) => ({ name, description, inputSchema: SCHEMAS[name] })) });
    if (m.method !== 'tools/call') return fail(-32601, `Unknown method ${m.method}`);
    const name = m.params?.name, a = m.params?.arguments || {};
    const text = (v: unknown, isError = false) => ok({ content: [{ type: 'text', text: typeof v === 'string' ? v : JSON.stringify(v, null, 2) }], ...(isError ? { isError: true } : {}) });
    try {
      if (name === 'get_node_spec') return text(SPEC);
      if (name === 'get_ui_rules') return text(UI_RULES.join('\n'));
      if (name === 'list_stickers') return text(SPEC.stickers);
      if (name === 'validate_node') { const p = validateManifest(a.manifest); return text(p.length ? { ok: false, problems: p } : { ok: true }); }
      if (name === 'preview_node') {
        const p = validateManifest(a.manifest);
        if (p.length) return text({ ok: false, problems: p }, true);
        const man = a.manifest as Manifest;
        const r = await runMarketNode(db, cfg, u, man, a.input ?? null, [{ from: 'sample', type: man.accepts[0], value: a.input ?? null }], a.config || {}, a.text || '');
        const res = packageResult(man, r.value ?? null, r.logs || [], !!(r as { simulated?: boolean }).simulated);
        return text({ ok: true, value: res.value, view: res.view, logs: res.logs });
      }
      if (name === 'publish_node') return text(publish(db, u, a.manifest));
      return text(`Unknown tool ${name}`, true);
    } catch (e) {
      return text((e as Error).message, true);
    }
  });
}
