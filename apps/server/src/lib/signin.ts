// Sign-in with an outside account. Each provider sends the browser to its own
// sign-in page and back to the server's callback, which hands the page a
// one-time code (never the session itself). The server keeps the state, nonce
// and PKCE verifier; the browser only carries the state.
//
// Adding a provider: give it an entry in providers() with a start and finish,
// read its keys in config.ts, and add its button to design/SignIn.dc.html.

import type { Config } from '../config';
import { finishGitHub, startGitHub, type GitHubSetup } from './github';
import { finishOidc, startOidc, type OidcSetup } from './oidc';

export type ProviderId = 'google' | 'github' | 'sso';

/** Who signed in, as the provider knows them. */
export interface Person { subject: string; email: string; name: string }
/** Where to send the browser, and what to keep until it comes back. */
export interface Started { url: string; state: string; nonce: string; verifier: string }

export interface Provider {
  id: ProviderId;
  /** Shown on the sign-in page and in messages. */
  name: string;
  ready: boolean;
  /** Why it is off, for the status page. */
  missing: string;
  /** Linked accounts are kept under this key, with the provider's id for the person. */
  key: string;
  /** The address to register with the provider, under PUBLIC_URL. */
  callbackPath: string;
  start(redirectUri: string): Promise<Started>;
  finish(code: string, kept: { nonce: string; verifier: string }, redirectUri: string): Promise<Person>;
}

export function providers(cfg: Config): Provider[] {
  const google: OidcSetup = {
    name: 'Google', issuer: cfg.googleIssuer, clientId: cfg.googleClientId, clientSecret: cfg.googleClientSecret,
    alsoIssuers: cfg.googleIssuer === 'https://accounts.google.com' ? ['accounts.google.com'] : [],
    params: { prompt: 'select_account' },
  };
  const github: GitHubSetup = { url: cfg.githubUrl, apiUrl: cfg.githubApiUrl, clientId: cfg.githubClientId, clientSecret: cfg.githubClientSecret, pkce: cfg.githubPkce };
  const sso: OidcSetup = { name: cfg.oidcName, issuer: cfg.oidcIssuer, clientId: cfg.oidcClientId, clientSecret: cfg.oidcClientSecret };
  return [
    {
      id: 'google', name: 'Google', key: 'google', callbackPath: '/v1/auth/oauth/google/callback',
      ready: !!(cfg.googleClientId && cfg.googleClientSecret), missing: 'Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to turn on sign-in with Google',
      start: (r) => startOidc(google, r), finish: (c, k, r) => finishOidc(google, c, k, r),
    },
    {
      id: 'github', name: 'GitHub', key: cfg.githubUrl === 'https://github.com' ? 'github' : `github:${cfg.githubUrl}`, callbackPath: '/v1/auth/oauth/github/callback',
      ready: !!(cfg.githubClientId && cfg.githubClientSecret), missing: 'Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET to turn on sign-in with GitHub',
      start: async (r) => startGitHub(github, r), finish: (c, k, r) => finishGitHub(github, c, k, r),
    },
    {
      // Kept at its first address, so providers set up before Google and GitHub came along keep working.
      id: 'sso', name: cfg.oidcName, key: `sso:${cfg.oidcIssuer}`, callbackPath: '/v1/auth/sso/callback',
      ready: !!(cfg.oidcIssuer && cfg.oidcClientId && cfg.oidcClientSecret), missing: 'Set OIDC_ISSUER, OIDC_CLIENT_ID and OIDC_CLIENT_SECRET to turn on single sign-on',
      start: (r) => startOidc(sso, r), finish: (c, k, r) => finishOidc(sso, c, k, r),
    },
  ];
}

export const findProvider = (cfg: Config, id: string) => providers(cfg).find((p) => p.id === id);
