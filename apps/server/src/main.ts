import { loadConfig } from './config';
import { buildApp } from './app';

const cfg = loadConfig();
const app = await buildApp(cfg);
await app.listen({ port: cfg.port, host: cfg.host });
app.log.info(`Paradigm server on http://${cfg.host}:${cfg.port} (data in ${cfg.dataDir}, sandbox ${cfg.sandbox})`);
for (const sig of ['SIGINT', 'SIGTERM'] as const) process.on(sig, () => { void app.close().then(() => process.exit(0)); });
