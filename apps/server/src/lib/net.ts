// Outbound requests for the API request node and the agent browser tool. The
// address is checked when the connection is made (not only before), so a name
// that resolves to a private or cloud-metadata address is refused.

import http from 'node:http';
import https from 'node:https';
import dns from 'node:dns';
import net from 'node:net';

export interface FetchOut { status: number; statusText: string; headers: Record<string, string>; body: Buffer; url: string }

function privateV4(ip: string): boolean {
  const p = ip.split('.').map(Number);
  return p[0] === 10 || p[0] === 127 || p[0] === 0 || (p[0] === 169 && p[1] === 254) || (p[0] === 172 && p[1] >= 16 && p[1] <= 31)
    || (p[0] === 192 && p[1] === 168) || (p[0] === 100 && p[1] >= 64 && p[1] <= 127) || p[0] >= 224 || (p[0] === 198 && (p[1] === 18 || p[1] === 19));
}

export function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) return privateV4(ip);
  const s = ip.toLowerCase();
  if (s.startsWith('::ffff:')) return privateV4(s.slice(7));
  return s === '::' || s === '::1' || s.startsWith('fc') || s.startsWith('fd') || s.startsWith('fe8') || s.startsWith('fe9') || s.startsWith('fea') || s.startsWith('feb') || s.startsWith('ff');
}

function guardedLookup(allowPrivate: boolean): net.LookupFunction {
  return (host, opts, cb) => {
    dns.lookup(host, { ...opts, all: true }, (err, addrs) => {
      if (err) return (cb as any)(err);
      const list = (addrs as unknown as dns.LookupAddress[]);
      const bad = list.find((a) => isPrivateIp(a.address));
      if (bad && !allowPrivate) return (cb as any)(Object.assign(new Error(`${host} points to a private address, which is not allowed`), { code: 'EPRIVATE' }));
      if ((opts as dns.LookupAllOptions).all) return (cb as any)(null, list);
      (cb as any)(null, list[0].address, list[0].family);
    });
  };
}

export interface FetchOpts { method?: string; headers?: Record<string, string>; body?: string | null; timeoutMs?: number; maxBytes?: number; allowPrivate?: boolean; redirects?: number }

export function safeFetch(url: string, o: FetchOpts = {}): Promise<FetchOut> {
  const u = new URL(url);
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return Promise.reject(new Error('Only http and https addresses work here'));
  if (net.isIP(u.hostname.replace(/^\[|\]$/g, '')) && isPrivateIp(u.hostname.replace(/^\[|\]$/g, '')) && !o.allowPrivate) return Promise.reject(new Error(`${u.hostname} is a private address, which is not allowed`));
  const lib = u.protocol === 'https:' ? https : http, max = o.maxBytes ?? 2_000_000;
  return new Promise((resolve, reject) => {
    const req = lib.request(u, { method: o.method || 'GET', headers: { 'user-agent': 'paradigm-board/0.1', ...(o.headers || {}) }, lookup: guardedLookup(!!o.allowPrivate), timeout: o.timeoutMs ?? 15000 }, (res) => {
      const status = res.statusCode || 0;
      if (status >= 300 && status < 400 && res.headers.location && (o.redirects ?? 5) > 0) {
        res.resume();
        const next = new URL(res.headers.location, u).toString();
        const keep = status === 307 || status === 308;
        safeFetch(next, { ...o, method: keep ? o.method : 'GET', body: keep ? o.body : null, redirects: (o.redirects ?? 5) - 1 }).then(resolve, reject);
        return;
      }
      const chunks: Buffer[] = []; let size = 0;
      res.on('data', (c: Buffer) => { size += c.length; if (size > max) { req.destroy(new Error(`The answer is larger than ${Math.round(max / 1e6)} MB`)); return; } chunks.push(c); });
      res.on('end', () => {
        const headers: Record<string, string> = {};
        for (const [k, v] of Object.entries(res.headers)) if (v !== undefined) headers[k] = Array.isArray(v) ? v.join(', ') : String(v);
        resolve({ status, statusText: res.statusMessage || '', headers, body: Buffer.concat(chunks), url: u.toString() });
      });
      res.on('error', reject);
    });
    req.on('timeout', () => req.destroy(new Error('The address did not answer in time')));
    req.on('error', reject);
    if (o.body) req.write(o.body);
    req.end();
  });
}

/** The readable text of a page, for agents. */
export function pageText(html: string, max = 40_000): string {
  const t = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->/gi, ' ')
    .replace(/<(br|p|div|li|h[1-6]|tr|section|article)\b[^>]*>/gi, '\n').replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n\n').trim();
  return t.length > max ? t.slice(0, max) + '\n[... cut]' : t;
}
