import type { FastifyInstance } from 'fastify';
import { contract, mcpConfig, skillText, type HarnessId } from '@paradigm/shared';
import type { Deps } from '../app';
import { ADAPTERS } from '../agents';
import { imageProvider } from './media';
import { need } from '../lib/auth';

export function metaRoutes(app: FastifyInstance, { cfg }: Deps) {
  app.get('/v1/health', async () => ({ ok: true }));

  /** The "Backend interfaces" dialog shows this. */
  app.get('/v1/contract', async () => contract());

  /** Which services run for real and which are stand-ins, and why. Shown in the board's settings. */
  app.get('/v1/status', async (req) => {
    need(req);
    const agents: Record<string, { real: boolean; reason?: string }> = {};
    for (const id of Object.keys(ADAPTERS) as HarnessId[]) {
      const why = await ADAPTERS[id].unavailable(cfg, { harness: id, instruction: '', inputs: [], permissions: {}, workspace: '', agent: id === 'acp' ? Object.keys(cfg.acpAgents)[0] || 'gemini' : undefined }).catch((e: Error) => e.message);
      agents[id] = why ? { real: false, reason: why } : { real: true };
    }
    return {
      agents,
      acpAgents: Object.keys(cfg.acpAgents),
      sandbox: { mode: cfg.sandbox, real: cfg.sandbox !== 'off', ...(cfg.sandbox === 'off' ? { reason: 'Set PARADIGM_SANDBOX to local or docker to run commands' } : {}) },
      images: imageProvider() ? { real: true, provider: imageProvider() } : { real: false, reason: 'Set OPENROUTER_API_KEY or OPENAI_API_KEY to make images' },
      videos: { real: false, reason: 'No video provider is connected yet' },
      mail: { real: false, reason: cfg.devMail ? 'Email links are printed in the server log' : 'No mail service is connected' },
    };
  });

  app.get('/v1/market/mcp-config', async (req) => {
    need(req);
    return { config: mcpConfig(cfg.publicUrl, '[YOUR TOKEN]'), skill: skillText() };
  });
}
