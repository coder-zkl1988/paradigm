// Sign-in with GitHub (github.com, or GitHub Enterprise Server through
// GITHUB_URL): an OAuth app's authorization code flow. GitHub has no ID token,
// so who signed in comes from the API: the account, and its verified emails.

import { HttpError } from './errors';
import { pkce, randomState } from './ids';
import type { Person, Started } from './signin';

export interface GitHubSetup {
  /** The sign-in pages: https://github.com, or an Enterprise Server's address. */
  url: string;
  /** The REST API: https://api.github.com, or <server>/api/v3. */
  apiUrl: string;
  clientId: string;
  clientSecret: string;
  /** github.com takes PKCE; Enterprise Server does not yet. */
  pkce: boolean;
}

const NAME = 'GitHub';

export function startGitHub(s: GitHubSetup, redirectUri: string): Started {
  const state = randomState(), p = pkce();
  const url = new URL(`${s.url}/login/oauth/authorize`);
  const q: Record<string, string> = { client_id: s.clientId, redirect_uri: redirectUri, scope: 'read:user user:email', state, allow_signup: 'true' };
  if (s.pkce) Object.assign(q, { code_challenge: p.challenge, code_challenge_method: 'S256' });
  for (const [k, v] of Object.entries(q)) url.searchParams.set(k, v);
  return { url: url.toString(), state, nonce: '', verifier: s.pkce ? p.verifier : '' };
}

interface GhUser { id: number; login: string; name?: string | null; email?: string | null }
interface GhEmail { email: string; primary: boolean; verified: boolean }

export async function finishGitHub(s: GitHubSetup, code: string, kept: { verifier: string }, redirectUri: string): Promise<Person> {
  const form = new URLSearchParams({ client_id: s.clientId, client_secret: s.clientSecret, code, redirect_uri: redirectUri });
  if (kept.verifier) form.set('code_verifier', kept.verifier);
  const r = await fetch(`${s.url}/login/oauth/access_token`, {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' }, body: form, signal: AbortSignal.timeout(15_000),
  }).catch(() => null);
  if (!r) throw new HttpError(502, `We couldn't reach ${NAME}. Try again in a minute.`, 'signin_unreachable');
  // GitHub answers a bad code with 200 and an error field.
  const tok = await r.json().catch(() => ({})) as { access_token?: string; error?: string; error_description?: string };
  if (!r.ok || !tok.access_token) throw new HttpError(401, tok.error_description || 'The sign-in did not go through. Try again.', 'signin_failed');

  const get = async <T>(path: string): Promise<T | null> => {
    const g = await fetch(`${s.apiUrl}${path}`, {
      headers: { authorization: `Bearer ${tok.access_token}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28', 'user-agent': 'Paradigm' },
      signal: AbortSignal.timeout(10_000),
    }).catch(() => null);
    return g?.ok ? await g.json().catch(() => null) as T | null : null;
  };
  const user = await get<GhUser>('/user');
  if (!user || typeof user.id !== 'number') throw new HttpError(502, `${NAME} did not say which account signed in. Try again.`, 'signin_failed');

  // A profile's public email is always one of its verified ones; the list says which is primary.
  const emails = await get<GhEmail[]>('/user/emails');
  const verified = Array.isArray(emails) ? emails.filter((e) => e && e.verified && typeof e.email === 'string') : [];
  const pick = verified.find((e) => e.primary) || verified.find((e) => !e.email.endsWith('@users.noreply.github.com')) || null;
  const email = (pick?.email || (!Array.isArray(emails) && user.email) || '').trim().toLowerCase();
  if (!email) {
    const none = Array.isArray(emails) && emails.length > 0
      ? `Your ${NAME} account has no verified email address yet. Verify one at ${NAME}, then try again.`
      : `${NAME} did not share an email address, so we can't tell which account is yours.`;
    throw new HttpError(401, none, Array.isArray(emails) && emails.length ? 'signin_unverified' : 'signin_no_email');
  }
  return { subject: String(user.id), email, name: String(user.name || user.login || email.split('@')[0]).slice(0, 80) };
}
