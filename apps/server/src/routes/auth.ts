import type { FastifyInstance } from 'fastify';
import type { Deps } from '../app';
import { now } from '../db';
import { acceptInvitesFor, bearer, createSession, createUser, need, publicUser, type UserRow } from '../lib/auth';
import { bad, HttpError, unauthorized } from '../lib/errors';
import { body, EMAIL, str } from '../lib/http';
import { checkPassword, hashPassword, newSecret, sha256 } from '../lib/ids';

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
    const row = db.prepare('SELECT * FROM login_tokens WHERE token_hash = ?').get(sha256(t)) as { email: string; purpose: string; expires_at: string; used: number } | undefined;
    if (!row || row.purpose !== purpose || row.used || row.expires_at < now()) throw unauthorized('This link has expired. Ask for a new one.');
    db.prepare('UPDATE login_tokens SET used = 1 WHERE token_hash = ?').run(sha256(t));
    return row.email;
  };

  app.post('/v1/auth/link/verify', async (req) => {
    const e = useToken(body(req).token, 'signin');
    return signedIn(byEmail(e) || createUser(db, { email: e, name: e.split('@')[0], pwHash: null }));
  });

  app.post('/v1/auth/reset', async (req) => {
    const b = body(req), pw = password(b.password), e = useToken(b.token, 'reset');
    const u = byEmail(e) || createUser(db, { email: e, name: e.split('@')[0], pwHash: null });
    db.prepare('UPDATE users SET pw_hash = ? WHERE id = ?').run(await hashPassword(pw), u.id);
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(u.id);
    return signedIn(u);
  });

  app.get('/v1/auth/sso', async () => { throw new HttpError(501, 'Single sign-on is not set up on this server yet.', 'not_configured'); });

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
