import Fastify, { type FastifyInstance, type FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import { existsSync, createReadStream } from 'node:fs';
import { join, resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Config } from './config';
import { openDb, type DB } from './db';
import { bearer, userFromToken } from './lib/auth';
import { HttpError } from './lib/errors';
import { devMailer, smtpMailer, type Mailer } from './lib/mail';
import { RunStore } from './agents/run';
import { authRoutes } from './routes/auth';
import { workspaceRoutes } from './routes/workspaces';
import { boardRoutes } from './routes/boards';
import { prefRoutes } from './routes/prefs';
import { agentRoutes } from './routes/agent';
import { sandboxRoutes } from './routes/sandbox';
import { httpRoutes } from './routes/http';
import { mediaRoutes } from './routes/media';
import { fileRoutes } from './routes/files';
import { marketRoutes } from './routes/market';
import { mcpRoutes } from './routes/mcp';
import { metaRoutes } from './routes/meta';

export interface Deps {
  db: DB;
  cfg: Config;
  mailer: Mailer;
  runs: RunStore;
  /** The CORS origin to answer with on streamed responses, which bypass the CORS plugin. */
  origin: (req: FastifyRequest) => string | undefined;
}

const MIME: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json', '.ico': 'image/x-icon' };

export async function buildApp(cfg: Config, o: { db?: DB; mailer?: Mailer; logger?: boolean } = {}): Promise<FastifyInstance & { deps: Deps }> {
  const app = Fastify({ logger: o.logger ?? { level: process.env.LOG_LEVEL || 'info' }, bodyLimit: 2_000_000, trustProxy: true });
  const db = o.db || openDb(join(cfg.dataDir, 'paradigm.sqlite'));
  const runs = new RunStore();
  const origin = (req: FastifyRequest) => { const h = req.headers.origin; return h && cfg.webOrigins.includes(h) ? h : undefined; };
  const deps: Deps = { db, cfg, mailer: o.mailer || (cfg.smtpUrl ? smtpMailer(app.log, cfg.smtpUrl, cfg.mailFrom) : devMailer(app.log, cfg.devMail)), runs, origin };

  await app.register(cors, { origin: cfg.webOrigins, credentials: false, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] });

  app.decorateRequest('user', null);
  app.addHook('onRequest', async (req) => {
    const t = bearer(req);
    (req as FastifyRequest & { user: unknown }).user = t ? userFromToken(db, t) : null;
  });

  app.setErrorHandler((err: any, req, reply) => {
    if (err instanceof HttpError) return reply.code(err.status).send({ error: err.message, code: err.code, ...(err.extra || {}) });
    if (err.validation || err.statusCode === 400) return reply.code(400).send({ error: err.message, code: 'bad_request' });
    if (err.statusCode === 413) return reply.code(413).send({ error: 'This is too large to send', code: 'too_large' });
    if (err.statusCode && err.statusCode < 500) return reply.code(err.statusCode).send({ error: err.message, code: 'error' });
    req.log.error(err);
    return reply.code(500).send({ error: 'Something went wrong on the server. Try again.', code: 'server' });
  });

  for (const r of [authRoutes, workspaceRoutes, boardRoutes, prefRoutes, agentRoutes, sandboxRoutes, httpRoutes, mediaRoutes, fileRoutes, marketRoutes, mcpRoutes, metaRoutes]) r(app, deps);

  // The built web app, when it exists, is served from the same address.
  const web = resolve(dirname(fileURLToPath(import.meta.url)), '../../web/dist');
  if (existsSync(join(web, 'index.html'))) {
    app.setNotFoundHandler((req, reply) => {
      if (req.method !== 'GET' || req.url.startsWith('/v1/') || req.url === '/mcp') return reply.code(404).send({ error: 'Not found', code: 'not_found' });
      const path = decodeURIComponent(req.url.split('?')[0]);
      const file = resolve(web, '.' + path);
      const pick = file.startsWith(web) && existsSync(file) && extname(file) ? file : join(web, 'index.html');
      reply.header('content-type', MIME[extname(pick)] || 'application/octet-stream');
      if (pick.includes('/assets/')) reply.header('cache-control', 'public, max-age=31536000, immutable');
      return reply.send(createReadStream(pick));
    });
  }

  app.addHook('onClose', async () => { runs.close(); if (!o.db) db.close(); });
  return Object.assign(app, { deps }) as FastifyInstance & { deps: Deps };
}
