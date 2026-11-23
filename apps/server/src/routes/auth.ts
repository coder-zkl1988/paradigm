import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Deps } from '../app';
import { now } from '../db';
import { acceptInvitesFor, bearer, createSession, createUser, need, publicUser, type UserRow } from '../lib/auth';
import { bad, HttpError, unauthorized } from '../lib/errors';
import { body, EMAIL, str } from '../lib/http';
import { checkPassword, hashPassword, newSecret, sha256 } from '../lib/ids';
import { findProvider, providers, type Person, type Provider } from '../lib/signin';

const LINK_MIN = 30;

export function authRoutes(app: FastifyInstance, { db, cfg, mailer }: Deps) {
  const email = (v: unknown) => { const e = str(v, 'Email', { max: 254 }).toLowerCase(); if (!EMAIL.test(e)) throw bad('Check the email'); return e; };
  const password = (v: unknown) => { const p = typeof v === 'string' ? v : ''; if (p.length < 8) throw bad('Password needs 8+ characters'); if (p.length > 200) throw bad('Password is too long'); return p; };
  const signedIn = (u: UserRow) => { acceptInvitesFor(db, u); return { token: createSession(db, u.id), user: publicUser(u) }; };
  const byEmail = (e: string) => db.prepare('SELECT * FROM users WHERE email = ?').get(e) as UserRow | undefined;

  app.post('/v1/auth/signup', async (req) => {
    const b = body(req), name = str(b.name, 'Name', { max: 80 }), e = email(b.email), pw = password(b.password);
    if (byEmail(e)) throw new HttpError(409, 'There is already an account with this email. Sign in instead.', 'exists');
    return signedIn(createUser(db, { email: e, name, pwHash: await hashPassword(pw) }));
  });

  app.post('/v1/auth/signin', async (req) => {
    const b = body(req), e = email(b.email), pw = typeof b.password === 'string' ? b.password : '';
    const u = byEmail(e);
    if (!u || !(await checkPassword(pw, u.pw_hash))) throw unauthorized('The email or password is not right');
    return signedIn(u);
  });

  /** "Skip for now": a guest account that can be given an email later. */
  app.post('/v1/auth/guest', async () => signedIn(createUser(db, { email: null, name: 'Guest', pwHash: null, guest: true })));

  /** Email link: sign in without a password, or reset it. */
  app.post('/v1/auth/link', async (req) => {
    const b = body(req), e = email(b.email), purpose = b.purpose === 'reset' ? 'reset' : 'signin';
    const token = newSecret();
    db.prepare('INSERT INTO login_tokens (token_hash, email, purpose, expires_at) VALUES (?, ?, ?, ?)').run(sha256(token), e, purpose, new Date(Date.now() + LINK_MIN * 60_000).toISOString());
    const link = `${cfg.publicUrl}/signin?${purpose === 'reset' ? 'reset' : 'link'}=${token}`;
    const r = await mailer.send({ to: e, subject: purpose === 'reset' ? 'Reset your password' : 'Your sign-in link', text: `Open this link within ${LINK_MIN} minutes: ${link}`, link });
    return { sent: true, delivered: r.delivered, ...(r.devLink ? { devLink: r.devLink } : {}) };
  });

  const useToken = (token: unknown, purpose: string) => {
    const t = str(token, 'Link', { max: 200 });
    const row = db.prepare('SELECT * FROM login_tokens WHERE token_hash = ?').get(sha256(t)) as { email: string; user_id: string | null; purpose: string; expires_at: string; used: number } | undefined;
    if (!row || row.purpose !== purpose || row.used || row.expires_at < now()) throw unauthorized('This link has expired. Ask for a new one.');
    db.prepare('UPDATE login_tokens SET used = 1 WHERE token_hash = ?').run(sha256(t));
    return row;
  };

  app.post('/v1/auth/link/verify', async (req) => {
    const e = useToken(body(req).token, 'signin').email;
    return signedIn(byEmail(e) || createUser(db, { email: e, name: e.split('@')[0], pwHash: null }));
  });

  app.post('/v1/auth/reset', async (req) => {
    const b = body(req), pw = password(b.password), e = useToken(b.token, 'reset').email;
    const u = byEmail(e) || createUser(db, { email: e, name: e.split('@')[0], pwHash: null });
    db.prepare('UPDATE users SET pw_hash = ? WHERE id = ?').run(await hashPassword(pw), u.id);
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(u.id);
    return signedIn(u);
  });

  /** Which outside accounts people can sign in with here: the sign-in page shows a button for each. */
  app.get('/v1/auth/providers', async () => ({ providers: providers(cfg).filter((p) => p.ready).map((p) => ({ id: p.id, name: p.name })) }));

  const provider = (id: string) => {
    const p = findProvider(cfg, id);
    if (!p) throw new HttpError(404, 'There is no sign-in with that name', 'not_found');
    return p;
  };

  /** Where to send the browser. The provider sends it back to the callback below. */
  const begin = async (p: Provider, nextParam: unknown) => {
    if (!p.ready) throw new HttpError(501, p.id === 'sso' ? 'Single sign-on is not set up on this server yet.' : `Sign-in with ${p.name} is not set up on this server yet.`, 'not_configured');
    const next = typeof nextParam === 'string' && nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam.slice(0, 300) : null;
    const s = await p.start(cfg.publicUrl + p.callbackPath);
    db.prepare('DELETE FROM sso_states WHERE expires_at < ?').run(now());
    db.prepare('INSERT INTO sso_states (state_hash, provider, nonce, verifier, next, expires_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(sha256(s.state), p.id, s.nonce, s.verifier, next, new Date(Date.now() + LINK_MIN * 60_000).toISOString());
    return { url: s.url };
  };

  /** The account linked to this outside account; else the one with its verified email; else a new one. */
  const personFor = (p: Provider, who: Person) => {
    const linked = db.prepare('SELECT u.* FROM user_identities i JOIN users u ON u.id = i.user_id WHERE i.provider = ? AND i.subject = ?').get(p.key, who.subject) as UserRow | undefined;
    if (linked) return linked;
    const u = byEmail(who.email) || createUser(db, { email: who.email, name: who.name, pwHash: null });
    db.prepare('INSERT OR IGNORE INTO user_identities (provider, subject, user_id, email, created_at) VALUES (?, ?, ?, ?, ?)').run(p.key, who.subject, u.id, who.email, now());
    return u;
  };

  /** The provider sends the browser here. Hands the page a one-time code, never the session itself. */
  const callback = async (p: Provider, req: FastifyRequest, reply: FastifyReply) => {
    const q = req.query as Record<string, string | undefined>;
    const back = (o: Record<string, string>) => reply.redirect(`${cfg.publicUrl}/signin?${new URLSearchParams(o)}`);
    const row = q.state ? db.prepare('SELECT * FROM sso_states WHERE state_hash = ?').get(sha256(q.state)) as { provider: string; nonce: string; verifier: string; next: string | null; expires_at: string } | undefined : undefined;
    if (q.state) db.prepare('DELETE FROM sso_states WHERE state_hash = ?').run(sha256(q.state));
    if (q.error) return back({ sso_error: q.error === 'access_denied' ? 'The sign-in was cancelled.' : (q.error_description || 'The sign-in did not go through. Try again.').slice(0, 200) });
    if (!row || row.provider !== p.id || row.expires_at < now() || !q.code) return back({ sso_error: 'The sign-in took too long or was already used. Try again.' });
    try {
      const u = personFor(p, await p.finish(q.code, row, cfg.publicUrl + p.callbackPath));
      const code = newSecret();
      db.prepare('INSERT INTO login_tokens (token_hash, email, user_id, purpose, expires_at) VALUES (?, ?, ?, ?, ?)').run(sha256(code), u.email || '', u.id, 'sso', new Date(Date.now() + 2 * 60_000).toISOString());
      return back({ sso: code, ...(row.next ? { next: row.next } : {}) });
    } catch (e) {
      req.log.warn({ err: e, provider: p.id }, 'sign-in with an outside account failed');
      return back({ sso_error: e instanceof HttpError ? e.message : 'The sign-in did not go through. Try again.' });
    }
  };

  app.get('/v1/auth/oauth/:provider', async (req) => begin(provider((req.params as { provider: string }).provider), (req.query as { next?: unknown }).next));
  app.get('/v1/auth/oauth/:provider/callback', async (req, reply) => callback(provider((req.params as { provider: string }).provider), req, reply));
  // Single sign-on keeps its first addresses, so providers already set up keep working.
  app.get('/v1/auth/sso', async (req) => begin(provider('sso'), (req.query as { next?: unknown }).next));
  app.get('/v1/auth/sso/callback', async (req, reply) => callback(provider('sso'), req, reply));

  /** The sign-in page trades the one-time code for a session. */
  app.post('/v1/auth/sso/finish', async (req) => {
    const t = useToken(body(req).code, 'sso');
    const u = t.user_id ? db.prepare('SELECT * FROM users WHERE id = ?').get(t.user_id) as UserRow | undefined : undefined;
    return signedIn(u || byEmail(t.email) || createUser(db, { email: t.email, name: t.email.split('@')[0], pwHash: null }));
  });

  app.post('/v1/auth/signout', async (req) => {
    const t = bearer(req);
    if (t) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(t));
    return { ok: true };
  });

  app.get('/v1/me', async (req) => ({ user: publicUser(need(req)) }));

  app.patch('/v1/me', async (req) => {
    const u = need(req), b = body(req);
    if (b.name !== undefined) db.prepare('UPDATE users SET name = ? WHERE id = ?').run(str(b.name, 'Name', { max: 80 }), u.id);
    if (b.lang !== undefined) { if (b.lang !== 'en' && b.lang !== 'zh') throw bad('Language is en or zh'); db.prepare('UPDATE users SET lang = ? WHERE id = ?').run(b.lang, u.id); }
    if (b.email !== undefined || b.password !== undefined) {
      // A guest keeps their boards by adding an email and password.
      const e = email(b.email), pw = password(b.password);
      const other = byEmail(e);
      if (other && other.id !== u.id) throw new HttpError(409, 'There is already an account with this email.', 'exists');
      db.prepare('UPDATE users SET email = ?, pw_hash = ?, guest = 0 WHERE id = ?').run(e, await hashPassword(pw), u.id);
    }
    return { user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(u.id) as UserRow) };
  });
}
