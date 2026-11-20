import type { FastifyInstance } from 'fastify';
import { createReadStream, existsSync } from 'node:fs';
import type { ExportRequest } from '@paradigm/shared';
import type { Deps } from '../app';
import { need } from '../lib/auth';
import { bad, notFound } from '../lib/errors';
import { body } from '../lib/http';
import { saveFile } from '../lib/files';
import { exportFile } from '../export/office';

export function fileRoutes(app: FastifyInstance, { db, cfg }: Deps) {
  app.post('/v1/files/export', { bodyLimit: 12_000_000 }, async (req) => {
    const u = need(req), b = body(req) as ExportRequest;
    if (!['docx', 'xlsx', 'pptx'].includes(b.format)) throw bad('format is docx, xlsx or pptx');
    if (!b.content || typeof b.content !== 'object') throw bad('content is missing');
    const f = await exportFile(b);
    const name = `${(b.title || 'Untitled').replace(/[^\w\- ]+/g, '').trim().slice(0, 80) || 'Untitled'}.${f.ext}`;
    const saved = await saveFile(db, cfg, u.id, name, f.mime, f.data);
    return { url: saved.url, name: saved.name };
  });

  app.get('/v1/files/:id/:name?', async (req, reply) => {
    const { id } = req.params as { id: string };
    const f = db.prepare('SELECT * FROM files WHERE id = ?').get(id) as { name: string; mime: string; path: string } | undefined;
    if (!f || !existsSync(f.path)) throw notFound('This file is gone');
    const inline = /^image\/|^application\/pdf$/.test(f.mime);
    reply.header('content-type', f.mime).header('content-disposition', `${inline ? 'inline' : 'attachment'}; filename="${f.name}"`).header('cache-control', 'private, max-age=31536000, immutable').header('x-content-type-options', 'nosniff');
    if (f.mime === 'image/svg+xml') reply.header('content-security-policy', "default-src 'none'; style-src 'unsafe-inline'");
    return reply.send(createReadStream(f.path));
  });
}
