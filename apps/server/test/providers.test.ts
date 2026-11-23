import { createHash } from 'node:crypto';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { makeApp } from './helpers';

// Stand-ins for Google (an OpenID Connect provider) and GitHub (OAuth plus its REST API) on local ports.
const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
const s256 = (v: string) => createHash('sha256').update(v).digest('base64url');
const json = (res: ServerResponse, code: number, o: unknown) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
const form = (req: IncomingMessage) => new Promise<URLSearchParams>((ok) => { let raw = ''; req.on('data', (c) => { raw += c; }); req.on('end', () => ok(new URLSearchParams(raw))); });
const listen = (s: Server) => new Promise<string>((ok) => s.listen(0, '127.0.0.1', () => ok(`http://127.0.0.1:${(s.address() as { port: number }).port}`)));

const g = { issuer: '', challenge: '', nonce: '', sub: 'g-100', person: { email: 'Rui@Example.com', email_verified: true, name: 'Rui Tanaka' } as Record<string, unknown> };
const google = createServer(async (req, res) => {
  const u = new URL(req.url || '/', g.issuer);
  if (u.pathname === '/.well-known/openid-configuration') return json(res, 200, { issuer: g.issuer, authorization_endpoint: `${g.issuer}/o/oauth2/v2/auth`, token_endpoint: `${g.issuer}/token`, token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic'] });
  if (u.pathname === '/token') {
    const f = await form(req);
    if (f.get('code') !== 'g-code' || s256(f.get('code_verifier') || '') !== g.challenge) return json(res, 400, { error: 'invalid_grant', error_description: 'That code is not valid' });
    return json(res, 200, { access_token: 'g-at', id_token: `${b64({ alg: 'RS256' })}.${b64({ iss: g.issuer, aud: 'g-client', sub: g.sub, exp: Math.floor(Date.now() / 1000) + 300, nonce: g.nonce, ...g.person })}.sig` });
  }
  json(res, 404, {});
});

const gh = { url: '', challenge: '', secret: '', id: 4242, login: 'octo-ana', name: 'Ana Silva' as string | null, emails: [] as { email: string; primary: boolean; verified: boolean }[] };
const github = createServer(async (req, res) => {
  const u = new URL(req.url || '/', gh.url);
  if (u.pathname === '/login/oauth/access_token') {
    const f = await form(req);
    gh.secret = f.get('client_secret') || '';
    // GitHub answers a bad code with 200 and an error field.
    if (f.get('code') !== 'gh-code' || s256(f.get('code_verifier') || '') !== gh.challenge) return json(res, 200, { error: 'bad_verification_code', error_description: 'The code passed is incorrect or expired.' });
    return json(res, 200, { access_token: 'gh-at', token_type: 'bearer', scope: 'read:user,user:email' });
  }
  if (req.headers.authorization !== 'Bearer gh-at' || !req.headers['user-agent']) return json(res, 401, { message: 'Requires authentication' });
  if (u.pathname === '/api/user') return json(res, 200, { id: gh.id, login: gh.login, name: gh.name, email: null });
  if (u.pathname === '/api/user/emails') return json(res, 200, gh.emails);
  json(res, 404, {});
});

let t: Awaited<ReturnType<typeof makeApp>>;
beforeAll(async () => {
  g.issuer = await listen(google);
  gh.url = await listen(github);
  t = await makeApp({
    publicUrl: 'http://localhost:5173',
    googleIssuer: g.issuer, googleClientId: 'g-client', googleClientSecret: 'g-secret',
    githubUrl: gh.url, githubApiUrl: `${gh.url}/api`, githubClientId: 'gh-client', githubClientSecret: 'gh-secret', githubPkce: true,
    oidcIssuer: '', oidcClientId: '', oidcClientSecret: '',
  });
});
afterAll(async () => {
  await t.close();
  await Promise.all([google, github].map((s) => new Promise<void>((ok) => s.close(() => ok()))));
});

async function start(id: string, next?: string) {
  const r = await t.call('GET', `/v1/auth/oauth/${id}` + (next ? `?next=${encodeURIComponent(next)}` : ''));
  expect(r.status).toBe(200);
  const url = new URL(r.json.url);
  if (id === 'google') { g.challenge = url.searchParams.get('code_challenge') || ''; g.nonce = url.searchParams.get('nonce') || ''; }
  if (id === 'github') gh.challenge = url.searchParams.get('code_challenge') || '';
  return url;
}
const callback = async (id: string, q: Record<string, string>) => {
  const r = await fetch(`${t.base}/v1/auth/oauth/${id}/callback?${new URLSearchParams(q)}`, { redirect: 'manual' });
  expect(r.status).toBe(302);
  return new URL(r.headers.get('location')!);
};
/** The whole round trip: start, come back with a code, trade the one-time code for a session. */
async function signIn(id: string, code: string) {
  const url = await start(id);
  const back = await callback(id, { code, state: url.searchParams.get('state')! });
  if (!back.searchParams.get('sso')) return { error: back.searchParams.get('sso_error') };
  const r = await t.call('POST', '/v1/auth/sso/finish', { code: back.searchParams.get('sso') });
  expect(r.status).toBe(200);
  return r.json as { token: string; user: { id: string; email: string; name: string } };
}

describe('sign-in with Google and GitHub', () => {
  it('lists only the providers that are set up', async () => {
    expect((await t.call('GET', '/v1/auth/providers')).json.providers).toEqual([{ id: 'google', name: 'Google' }, { id: 'github', name: 'GitHub' }]);
    const off = await makeApp({ googleClientId: '', githubClientId: '', oidcIssuer: '' });
    expect((await off.call('GET', '/v1/auth/providers')).json.providers).toEqual([]);
    expect((await off.call('GET', '/v1/auth/oauth/google')).status).toBe(501);
    expect((await off.call('GET', '/v1/auth/oauth/github')).json.error).toMatch(/GitHub is not set up/);
    await off.close();
    expect((await t.call('GET', '/v1/auth/oauth/myspace')).status).toBe(404);
  });

  it('signs people in with Google and keeps them on the same account', async () => {
    const url = await start('google', '/b/xyz');
    expect(url.origin + url.pathname).toBe(`${g.issuer}/o/oauth2/v2/auth`);
    expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:5173/v1/auth/oauth/google/callback');
    expect(url.searchParams.get('prompt')).toBe('select_account');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    const back = await callback('google', { code: 'g-code', state: url.searchParams.get('state')! });
    expect(back.searchParams.get('next')).toBe('/b/xyz');
    const r = await t.call('POST', '/v1/auth/sso/finish', { code: back.searchParams.get('sso') });
    expect(r.json.user).toMatchObject({ email: 'rui@example.com', name: 'Rui Tanaka' });

    // Their Google address changes; the linked account still signs in.
    g.person.email = 'rui.t@example.org';
    const again = await signIn('google', 'g-code');
    expect('user' in again && again.user.id).toBe(r.json.user.id);
    g.person.email = 'Rui@Example.com';

    g.person.email_verified = false; g.sub = 'g-200'; g.person.email = 'new@example.com';
    expect(await signIn('google', 'g-code')).toEqual({ error: 'Your email at Google is not verified yet.' });
    g.person.email_verified = true; g.sub = 'g-100'; g.person.email = 'Rui@Example.com';
  });

  it('signs people in with GitHub using their primary verified email', async () => {
    const url = await start('github');
    expect(url.origin + url.pathname).toBe(`${gh.url}/login/oauth/authorize`);
    expect(url.searchParams.get('scope')).toBe('read:user user:email');
    expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:5173/v1/auth/oauth/github/callback');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    gh.emails = [{ email: 'old@example.com', primary: false, verified: true }, { email: 'Ana@Example.com', primary: true, verified: true }];
    const back = await callback('github', { code: 'gh-code', state: url.searchParams.get('state')! });
    expect(gh.secret).toBe('gh-secret');
    const r = await t.call('POST', '/v1/auth/sso/finish', { code: back.searchParams.get('sso') });
    expect(r.json.user).toMatchObject({ email: 'ana@example.com', name: 'Ana Silva' });
    expect((await t.call('GET', '/v1/me', undefined, r.json.token)).json.user.email).toBe('ana@example.com');
  });

  it('joins an outside account to the account that already has its email', async () => {
    const { user } = await t.signup('Bo', 'bo@example.com');
    gh.id = 777; gh.login = 'bo'; gh.name = null;
    gh.emails = [{ email: 'bo@example.com', primary: true, verified: true }];
    const r = await signIn('github', 'gh-code');
    expect('user' in r && r.user).toMatchObject({ id: user.id, name: 'Bo' });
  });

  it('turns away a bad code, an account with no verified email, and a state from another provider', async () => {
    expect(await signIn('github', 'wrong')).toEqual({ error: 'The code passed is incorrect or expired.' });
    gh.id = 999; gh.emails = [{ email: 'x@example.com', primary: true, verified: false }];
    expect((await signIn('github', 'gh-code') as { error: string }).error).toMatch(/no verified email/);
    const u = await start('google');
    expect((await callback('github', { code: 'gh-code', state: u.searchParams.get('state')! })).searchParams.get('sso_error')).toMatch(/already used/);
    expect((await callback('github', { error: 'access_denied', state: 'x' })).searchParams.get('sso_error')).toMatch(/cancelled/);
  });

  it('reports each provider on the status page', async () => {
    const { token } = await t.signup();
    const s = (await t.call('GET', '/v1/status', undefined, token)).json;
    expect(s.google).toEqual({ real: true, provider: 'google' });
    expect(s.github).toMatchObject({ real: true });
    expect(s.sso).toMatchObject({ real: false });
  });
});
