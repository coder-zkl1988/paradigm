import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildApp } from '../src/app';
import { loadConfig, type Config } from '../src/config';
import { openDb } from '../src/db';

export async function makeApp(over: Partial<Config> = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'paradigm-test-'));
  const cfg = loadConfig({ dataDir: dir, simStepMs: 5, devMail: true, webOrigins: ['http://localhost:5173'], ...over });
  const app = await buildApp(cfg, { db: openDb(':memory:'), logger: false });
  await app.listen({ port: 0, host: '127.0.0.1' });
  const addr = app.server.address() as { port: number };
  const base = `http://127.0.0.1:${addr.port}`;
  const call = async (method: string, path: string, body?: unknown, token?: string, headers: Record<string, string> = {}) => {
    const r = await fetch(base + path, { method, headers: { ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers }, body: body !== undefined ? JSON.stringify(body) : undefined });
    const text = await r.text();
    let json: any = null; try { json = JSON.parse(text); } catch { json = text; }
    return { status: r.status, json, headers: r.headers };
  };
  const signup = async (name = 'Lin Yue', email = `lin${Math.random().toString(36).slice(2, 7)}@example.com`) => {
    const r = await call('POST', '/v1/auth/signup', { name, email, password: 'correct horse' });
    return { token: r.json.token as string, user: r.json.user, email };
  };
  /** Reads a Server-Sent Events response; `on` can act on each event (answer a permission, say). */
  const stream = async (path: string, body: unknown, token: string, on?: (e: any) => void | Promise<void>) => {
    const r = await fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'text/event-stream', authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
    const events: any[] = [], reader = r.body!.getReader(), dec = new TextDecoder();
    let buf = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf('\n\n')) >= 0) {
        const chunk = buf.slice(0, i); buf = buf.slice(i + 2);
        const line = chunk.split('\n').find((l) => l.startsWith('data: '));
        if (!line) continue;
        const e = JSON.parse(line.slice(6)); events.push(e);
        if (on) await on(e);
      }
    }
    return events;
  };
  const close = async () => { await app.close(); rmSync(dir, { recursive: true, force: true }); };
  return { app, cfg, base, call, signup, stream, close, dir };
}
