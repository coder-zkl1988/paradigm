import { createHash } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { makeApp } from './helpers';

// A stand-in OpenID Connect provider on a local port.
const seen: { challenge?: string; nonce?: string; tokenAuth?: string; verifier?: string } = {};
const person: Record<string, unknown> = { email: 'Mei@Example.com', email_verified: true, name: 'Mei Chen' };
let issuer = '';
const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
const idp: Server = createServer((req, res) => {
  const u = new URL(req.url || '/', issuer);
  const json = (code: number, o: unknown) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
  if (u.pathname === '/.well-known/openid-configuration') return json(200, { issuer, authorization_endpoint: `${issuer}/authorize`, token_endpoint: `${issuer}/token` });
  if (u.pathname === '/token') {
    let raw = '';
    req.on('data', (c) => { raw += c; });
    req.on('end', () => {
      const f = new URLSearchParams(raw);
      seen.tokenAuth = req.headers.authorization; seen.verifier = f.get('code_verifier') || '';
      const ok = f.get('code') === 'good-code' && createHash('sha256').update(seen.verifier).digest('base64url') === seen.challenge;
      if (!ok) return json(400, { error: 'invalid_grant', error_description: 'That code is not valid' });
      json(200, { access_token: 'at', token_type: 'Bearer', id_token: `${b64({ alg: 'RS256' })}.${b64({ iss: issuer, aud: 'paradigm', sub: 'u1', exp: Math.floor(Date.now() / 1000) + 300, nonce: seen.nonce, ...person })}.sig` });
    });
    return;
  }
  json(404, {});
});

let t: Awaited<ReturnType<typeof makeApp>>;
beforeAll(async () => {
  await new Promise<void>((ok) => idp.listen(0, '127.0.0.1', () => ok()));
  issuer = `http://127.0.0.1:${(idp.address() as { port: number }).port}`;
  t = await makeApp({ oidcIssuer: issuer, oidcClientId: 'paradigm', oidcClientSecret: 's3cret', publicUrl: 'http://localhost:5173' });
});
afterAll(async () => { await t.close(); await new Promise<void>((ok) => idp.close(() => ok())); });

/** Starts a sign-in the way the button does and returns the provider's address. */
async function start(next?: string) {
  const r = await t.call('GET', '/v1/auth/sso' + (next ? `?next=${encodeURIComponent(next)}` : ''));
  expect(r.status).toBe(200);
  const url = new URL(r.json.url);
  seen.challenge = url.searchParams.get('code_challenge') || ''; seen.nonce = url.searchParams.get('nonce') || '';
  return url;
}
const callback = async (q: Record<string, string>) => {
  const r = await fetch(`${t.base}/v1/auth/sso/callback?${new URLSearchParams(q)}`, { redirect: 'manual' });
  expect(r.status).toBe(302);
  return new URL(r.headers.get('location')!);
};

describe('single sign-on', () => {
  it('sends people to the provider and signs them in when they come back', async () => {
    const url = await start('/b/abc');
    expect(url.origin + url.pathname).toBe(`${issuer}/authorize`);
    expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:5173/v1/auth/sso/callback');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    const back = await callback({ code: 'good-code', state: url.searchParams.get('state')! });
    expect(back.origin + back.pathname).toBe('http://localhost:5173/signin');
    expect(back.searchParams.get('next')).toBe('/b/abc');
    expect(seen.tokenAuth).toBe('Basic ' + Buffer.from('paradigm:s3cret').toString('base64'));
    const code = back.searchParams.get('sso')!;
    const r = await t.call('POST', '/v1/auth/sso/finish', { code });
    expect(r.status).toBe(200);
    expect(r.json.user).toMatchObject({ email: 'mei@example.com', name: 'Mei Chen' });
    expect((await t.call('GET', '/v1/me', undefined, r.json.token)).status).toBe(200);
    // The code works once.
    expect((await t.call('POST', '/v1/auth/sso/finish', { code })).status).toBe(401);
  });

  it('signs an existing account in rather than making a second one', async () => {
    const { email } = await t.signup('Ana', 'ana.sso@example.com');
    person.email = email; person.name = 'Someone Else'; person.sub = 'u2';
    const url = await start();
    const back = await callback({ code: 'good-code', state: url.searchParams.get('state')! });
    const r = await t.call('POST', '/v1/auth/sso/finish', { code: back.searchParams.get('sso') });
    expect(r.json.user).toMatchObject({ email, name: 'Ana' });
    person.email = 'Mei@Example.com'; person.name = 'Mei Chen'; delete person.sub;
  });

  it('turns away a reused state, a bad code, a cancel and an unverified email', async () => {
    const url = await start(), state = url.searchParams.get('state')!;
    expect((await callback({ code: 'wrong', state })).searchParams.get('sso_error')).toMatch(/not valid/);
    expect((await callback({ code: 'good-code', state })).searchParams.get('sso_error')).toMatch(/already used/);
    const u2 = await start();
    expect((await callback({ error: 'access_denied', state: u2.searchParams.get('state')! })).searchParams.get('sso_error')).toMatch(/cancelled/);
    person.email_verified = false;
    const u3 = await start();
    expect((await callback({ code: 'good-code', state: u3.searchParams.get('state')! })).searchParams.get('sso_error')).toMatch(/not verified/);
    person.email_verified = true;
  });

  it('says when it is not set up', async () => {
    const off = await makeApp();
    const r = await off.call('GET', '/v1/auth/sso');
    await off.close();
    expect(r.status).toBe(501);
  });
});
