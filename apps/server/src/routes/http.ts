import type { FastifyInstance } from 'fastify';
import type { Deps } from '../app';
import { need } from '../lib/auth';
import { bad, HttpError } from '../lib/errors';
import { body, str } from '../lib/http';
import { safeFetch } from '../lib/net';

const DROP = new Set(['host', 'content-length', 'connection', 'transfer-encoding', 'cookie']);

/** {{secret.NAME}} in the URL, headers or body is filled in on the server from HTTP_SECRETS, so keys never reach the page. */
export function fillSecrets(s: string, secrets: Record<string, string>): string {
  return s.replace(/\{\{\s*secret\.([A-Za-z0-9_-]+)\s*\}\}/g, (_, k) => {
    if (!(k in secrets)) throw new HttpError(400, `There is no secret called ${k} on the server`, 'no_secret');
    return secrets[k];
  });
}

export function httpRoutes(app: FastifyInstance, { cfg }: Deps) {
  let secrets: Record<string, string> = {};
  try { secrets = JSON.parse(process.env.HTTP_SECRETS || '{}'); } catch { secrets = {}; }

  app.post('/v1/http/proxy', async (req) => {
    need(req);
    const b = body(req), method = String(b.method || 'GET').toUpperCase();
    if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'].includes(method)) throw bad('Method is GET, POST, PUT, PATCH, DELETE or HEAD');
    const url = fillSecrets(str(b.url, 'URL', { max: 4000 }), secrets);
    const headers: Record<string, string> = {};
    for (const [k, v] of Object.entries(b.headers || {})) if (!DROP.has(k.toLowerCase()) && typeof v === 'string') headers[k] = fillSecrets(v, secrets);
    const reqBody = typeof b.body === 'string' ? fillSecrets(b.body, secrets) : null;
    let r;
    try { r = await safeFetch(url, { method, headers, body: reqBody, allowPrivate: cfg.allowPrivateHttp }); }
    catch (e) { throw new HttpError(502, `The request failed: ${(e as Error).message}`, 'upstream'); }
    const type = r.headers['content-type'] || '', text = r.body.toString('utf8');
    let parsed: unknown = text;
    if (/json/i.test(type)) { try { parsed = JSON.parse(text); } catch { parsed = text; } }
    else if (!/^(text\/|application\/(xml|javascript|x-www-form-urlencoded))/i.test(type) && /[\u0000-\u0008]/.test(text.slice(0, 1000))) parsed = `[${r.body.length} bytes of ${type || 'binary data'}]`;
    const keep: Record<string, string> = {};
    for (const k of ['content-type', 'content-length', 'date', 'etag', 'last-modified', 'location', 'x-request-id']) if (r.headers[k]) keep[k] = r.headers[k];
    return { status: r.status, statusText: r.statusText, headers: keep, body: parsed };
  });
}
