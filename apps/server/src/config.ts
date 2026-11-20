// Everything the server reads from the environment, in one place. A service
// whose key or command is missing is not an error: its nodes run as stand-ins
// and every result says so.

import { resolve } from 'node:path';

const env = (k: string, d = '') => (process.env[k] ?? d).trim();
const num = (k: string, d: number) => { const v = Number(env(k)); return Number.isFinite(v) && v > 0 ? v : d; };

export type SandboxMode = 'off' | 'local' | 'docker';

export interface Config {
  port: number;
  host: string;
  /** Where the database, board folders and made files live. */
  dataDir: string;
  /** The address people open, used in links (email links, invites, MCP setup). */
  publicUrl: string;
  /** Origins allowed to call the API from a browser. */
  webOrigins: string[];
  /** Print email links to the log instead of sending them, and return them to the caller. */
  devMail: boolean;
  sandbox: SandboxMode;
  dockerImage: string;
  /** The built-in agent: provider and model id from the pi-ai catalog. Empty means pick by the keys present. */
  piProvider: string;
  piModel: string;
  /** ACP agents by name: the command that starts each one. */
  acpAgents: Record<string, string>;
  /** Image generation through OpenRouter (pi-ai) or OpenAI. */
  imageModel: string;
  /** How fast stand-in runs play back, in ms per step. */
  simStepMs: number;
  /** Allow the HTTP node to call private and local addresses (only for local development). */
  allowPrivateHttp: boolean;
}

function parseAgents(raw: string): Record<string, string> {
  if (!raw) return {};
  try {
    const o = JSON.parse(raw);
    return o && typeof o === 'object' ? Object.fromEntries(Object.entries(o).filter(([, v]) => typeof v === 'string' && v.trim())) as Record<string, string> : {};
  } catch {
    // name=command;name=command
    return Object.fromEntries(raw.split(';').map((p) => p.split('=')).filter((p) => p.length >= 2).map(([k, ...v]) => [k.trim(), v.join('=').trim()]));
  }
}

export function loadConfig(over: Partial<Config> = {}): Config {
  const port = num('PORT', 8787);
  const sandbox = env('PARADIGM_SANDBOX', 'off') as SandboxMode;
  const c: Config = {
    port,
    host: env('HOST', '127.0.0.1'),
    dataDir: resolve(env('PARADIGM_DATA', './data')),
    publicUrl: env('PUBLIC_URL', 'http://localhost:5173').replace(/\/$/, ''),
    webOrigins: env('WEB_ORIGIN', 'http://localhost:5173').split(',').map((s) => s.trim()).filter(Boolean),
    devMail: env('PARADIGM_DEV_MAIL', process.env.NODE_ENV === 'production' ? '0' : '1') === '1',
    sandbox: ['off', 'local', 'docker'].includes(sandbox) ? sandbox : 'off',
    dockerImage: env('PARADIGM_DOCKER_IMAGE', 'node:22-bookworm'),
    piProvider: env('PI_PROVIDER'),
    piModel: env('PI_MODEL'),
    acpAgents: parseAgents(env('ACP_AGENTS')),
    imageModel: env('IMAGE_MODEL'),
    simStepMs: num('PARADIGM_SIM_STEP_MS', 420),
    allowPrivateHttp: env('PARADIGM_ALLOW_PRIVATE_HTTP') === '1',
  };
  return { ...c, ...over };
}
