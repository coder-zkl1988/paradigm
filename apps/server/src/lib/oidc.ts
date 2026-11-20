// Single sign-on through any OpenID Connect provider (Okta, Entra ID, Google
// Workspace, Auth0, Keycloak and others): the authorization code flow with
// PKCE. The ID token comes straight from the provider's token endpoint over
// TLS, so its claims are checked (issuer, audience, expiry, nonce) without
// verifying its signature, as OpenID Connect Core 3.1.3.7 allows.

import { createHash, randomBytes } from 'node:crypto';
import type { Config } from '../config';
import { HttpError } from './errors';

export const ssoReady = (cfg: Config) => !!(cfg.oidcIssuer && cfg.oidcClientId && cfg.oidcClientSecret);

interface Discovery { issuer: string; authorization_endpoint: string; token_endpoint: string; userinfo_endpoint?: string; token_endpoint_auth_methods_supported?: string[] }

let cached: { issuer: string; at: number; d: Discovery } | null = null;

async function discover(cfg: Config): Promise<Discovery> {
  if (cached && cached.issuer === cfg.oidcIssuer && Date.now() - cached.at < 3_600_000) return cached.d;
  const r = await fetch(`${cfg.oidcIssuer}/.well-known/openid-configuration`, { signal: AbortSignal.timeout(10_000) }).catch(() => null);
  if (!r || !r.ok) throw new HttpError(502, `We couldn't reach ${cfg.oidcName}'s sign-in service. Try again in a minute.`, 'sso_unreachable');
  const d = await r.json() as Discovery;
  if (!d.authorization_endpoint || !d.token_endpoint) throw new HttpError(502, 'The sign-in service did not describe itself. Check OIDC_ISSUER on the server.', 'sso_config');
  cached = { issuer: cfg.oidcIssuer, at: Date.now(), d };
  return d;
}

const b64url = (b: Buffer) => b.toString('base64url');
export const redirectUri = (cfg: Config) => `${cfg.publicUrl}/v1/auth/sso/callback`;

/** Where to send the browser, and what to keep until it comes back. */
export async function startSso(cfg: Config) {
  const d = await discover(cfg);
  const state = b64url(randomBytes(24)), nonce = b64url(randomBytes(24)), verifier = b64url(randomBytes(32));
  const challenge = b64url(createHash('sha256').update(verifier).digest());
  const url = new URL(d.authorization_endpoint);
  for (const [k, v] of Object.entries({ response_type: 'code', client_id: cfg.oidcClientId, redirect_uri: redirectUri(cfg), scope: 'openid email profile', state, nonce, code_challenge: challenge, code_challenge_method: 'S256' })) url.searchParams.set(k, v);
  return { url: url.toString(), state, nonce, verifier };
}

export interface SsoPerson { email: string; name: string }

function claims(idToken: string): Record<string, any> {
  const part = idToken.split('.')[1];
  if (!part) throw new HttpError(502, 'The sign-in service sent a token we could not read', 'sso_token');
  try { return JSON.parse(Buffer.from(part, 'base64url').toString('utf8')); }
  catch { throw new HttpError(502, 'The sign-in service sent a token we could not read', 'sso_token'); }
}

/** Trades the code for tokens and says who signed in. */
export async function finishSso(cfg: Config, code: string, kept: { nonce: string; verifier: string }): Promise<SsoPerson> {
  const d = await discover(cfg);
  const form = new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri(cfg), code_verifier: kept.verifier });
  const headers: Record<string, string> = { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' };
  const methods = d.token_endpoint_auth_methods_supported;
  if (methods && !methods.includes('client_secret_basic') && methods.includes('client_secret_post')) {
    form.set('client_id', cfg.oidcClientId); form.set('client_secret', cfg.oidcClientSecret);
  } else {
    headers.authorization = 'Basic ' + Buffer.from(`${encodeURIComponent(cfg.oidcClientId)}:${encodeURIComponent(cfg.oidcClientSecret)}`).toString('base64');
  }
  const r = await fetch(d.token_endpoint, { method: 'POST', headers, body: form, signal: AbortSignal.timeout(15_000) }).catch(() => null);
  const tok = r ? await r.json().catch(() => ({})) as { id_token?: string; access_token?: string; error_description?: string; error?: string } : {};
  if (!r || !r.ok || !tok.id_token) throw new HttpError(401, tok.error_description || 'The sign-in did not go through. Try again.', 'sso_failed');

  const c = claims(tok.id_token);
  const aud = Array.isArray(c.aud) ? c.aud : [c.aud];
  if (c.iss !== d.issuer || !aud.includes(cfg.oidcClientId)) throw new HttpError(401, 'The sign-in came from an unexpected service', 'sso_failed');
  if (typeof c.exp !== 'number' || c.exp * 1000 < Date.now() - 60_000) throw new HttpError(401, 'The sign-in took too long. Try again.', 'sso_failed');
  if (c.nonce !== kept.nonce) throw new HttpError(401, 'The sign-in did not match this browser. Try again.', 'sso_failed');

  let info: Record<string, any> = c;
  if (!c.email && d.userinfo_endpoint && tok.access_token) {
    const u = await fetch(d.userinfo_endpoint, { headers: { authorization: `Bearer ${tok.access_token}` }, signal: AbortSignal.timeout(10_000) }).catch(() => null);
    if (u?.ok) { const j = await u.json().catch(() => ({})) as Record<string, any>; if (j.sub === c.sub) info = { ...c, ...j }; }
  }
  const email = typeof info.email === 'string' ? info.email.trim().toLowerCase() : '';
  if (!email) throw new HttpError(401, `${cfg.oidcName} did not share an email address, so we can't tell which account is yours.`, 'sso_no_email');
  if (info.email_verified === false) throw new HttpError(401, `Your email at ${cfg.oidcName} is not verified yet.`, 'sso_unverified');
  const name = String(info.name || [info.given_name, info.family_name].filter(Boolean).join(' ') || email.split('@')[0]).slice(0, 80);
  return { email, name };
}
