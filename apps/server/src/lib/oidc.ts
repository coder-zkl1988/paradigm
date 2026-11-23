// Sign-in through any OpenID Connect provider: Google, or a company's own
// service (Okta, Entra ID, Auth0, Keycloak and others). The authorization code
// flow with PKCE. The ID token comes straight from the provider's token
// endpoint over TLS, so its claims are checked (issuer, audience, expiry,
// nonce) without verifying its signature, as OpenID Connect Core 3.1.3.7 allows.

import { HttpError } from './errors';
import { pkce, randomState } from './ids';
import type { Person, Started } from './signin';

export interface OidcSetup {
  /** What the provider is called in messages. */
  name: string;
  issuer: string;
  clientId: string;
  clientSecret: string;
  /** Other spellings of the issuer the provider uses in its tokens (Google writes it with and without https://). */
  alsoIssuers?: string[];
  /** Extra parameters for the provider's sign-in page. */
  params?: Record<string, string>;
}

interface Discovery { issuer: string; authorization_endpoint: string; token_endpoint: string; userinfo_endpoint?: string; token_endpoint_auth_methods_supported?: string[] }

const cache = new Map<string, { at: number; d: Discovery }>();

async function discover(s: OidcSetup): Promise<Discovery> {
  const hit = cache.get(s.issuer);
  if (hit && Date.now() - hit.at < 3_600_000) return hit.d;
  const r = await fetch(`${s.issuer}/.well-known/openid-configuration`, { signal: AbortSignal.timeout(10_000) }).catch(() => null);
  if (!r || !r.ok) throw new HttpError(502, `We couldn't reach ${s.name}'s sign-in service. Try again in a minute.`, 'signin_unreachable');
  const d = await r.json() as Discovery;
  if (!d.authorization_endpoint || !d.token_endpoint) throw new HttpError(502, `${s.name}'s sign-in service did not describe itself. Check its issuer address on the server.`, 'signin_config');
  cache.set(s.issuer, { at: Date.now(), d });
  return d;
}

/** Where to send the browser, and what to keep until it comes back. */
export async function startOidc(s: OidcSetup, redirectUri: string): Promise<Started> {
  const d = await discover(s);
  const state = randomState(), nonce = randomState(), p = pkce();
  const url = new URL(d.authorization_endpoint);
  const q = { response_type: 'code', client_id: s.clientId, redirect_uri: redirectUri, scope: 'openid email profile', state, nonce, code_challenge: p.challenge, code_challenge_method: 'S256', ...s.params };
  for (const [k, v] of Object.entries(q)) url.searchParams.set(k, v);
  return { url: url.toString(), state, nonce, verifier: p.verifier };
}

function claims(idToken: string, name: string): Record<string, any> {
  const part = idToken.split('.')[1];
  const unreadable = () => new HttpError(502, `${name} sent a token we could not read`, 'signin_token');
  if (!part) throw unreadable();
  try { return JSON.parse(Buffer.from(part, 'base64url').toString('utf8')); }
  catch { throw unreadable(); }
}

/** Trades the code for tokens and says who signed in. */
export async function finishOidc(s: OidcSetup, code: string, kept: { nonce: string; verifier: string }, redirectUri: string): Promise<Person> {
  const d = await discover(s);
  const form = new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri, code_verifier: kept.verifier });
  const headers: Record<string, string> = { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' };
  const methods = d.token_endpoint_auth_methods_supported;
  if (methods && !methods.includes('client_secret_basic') && methods.includes('client_secret_post')) {
    form.set('client_id', s.clientId); form.set('client_secret', s.clientSecret);
  } else {
    headers.authorization = 'Basic ' + Buffer.from(`${encodeURIComponent(s.clientId)}:${encodeURIComponent(s.clientSecret)}`).toString('base64');
  }
  const r = await fetch(d.token_endpoint, { method: 'POST', headers, body: form, signal: AbortSignal.timeout(15_000) }).catch(() => null);
  const tok = r ? await r.json().catch(() => ({})) as { id_token?: string; access_token?: string; error_description?: string; error?: string } : {};
  if (!r || !r.ok || !tok.id_token) throw new HttpError(401, tok.error_description || 'The sign-in did not go through. Try again.', 'signin_failed');

  const c = claims(tok.id_token, s.name);
  const aud = Array.isArray(c.aud) ? c.aud : [c.aud];
  if (![d.issuer, ...(s.alsoIssuers || [])].includes(c.iss) || !aud.includes(s.clientId)) throw new HttpError(401, 'The sign-in came from an unexpected service', 'signin_failed');
  if (typeof c.exp !== 'number' || c.exp * 1000 < Date.now() - 60_000) throw new HttpError(401, 'The sign-in took too long. Try again.', 'signin_failed');
  if (c.nonce !== kept.nonce) throw new HttpError(401, 'The sign-in did not match this browser. Try again.', 'signin_failed');
  if (typeof c.sub !== 'string' || !c.sub) throw new HttpError(401, `${s.name} did not say which account signed in`, 'signin_failed');

  let info: Record<string, any> = c;
  if (!c.email && d.userinfo_endpoint && tok.access_token) {
    const u = await fetch(d.userinfo_endpoint, { headers: { authorization: `Bearer ${tok.access_token}` }, signal: AbortSignal.timeout(10_000) }).catch(() => null);
    if (u?.ok) { const j = await u.json().catch(() => ({})) as Record<string, any>; if (j.sub === c.sub) info = { ...c, ...j }; }
  }
  const email = typeof info.email === 'string' ? info.email.trim().toLowerCase() : '';
  if (!email) throw new HttpError(401, `${s.name} did not share an email address, so we can't tell which account is yours.`, 'signin_no_email');
  if (info.email_verified === false || info.email_verified === 'false') throw new HttpError(401, `Your email at ${s.name} is not verified yet.`, 'signin_unverified');
  const name = String(info.name || [info.given_name, info.family_name].filter(Boolean).join(' ') || email.split('@')[0]).slice(0, 80);
  return { subject: c.sub, email, name };
}
