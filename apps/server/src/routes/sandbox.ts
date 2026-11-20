import type { FastifyInstance } from 'fastify';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Deps } from '../app';
import { need } from '../lib/auth';
import { bad } from '../lib/errors';
import { body, sse, str, wantsStream } from '../lib/http';
import { newId } from '../lib/ids';
import { folderFor } from '../lib/access';
import { boardDir } from '../sandbox/folders';
import { execCommand } from '../sandbox/exec';
import { pythonProgram, readPython, runScript } from '../sandbox/script';

export const SIM_CODE = '[simulated] This language needs the backend sandbox.';

export function sandboxRoutes(app: FastifyInstance, { db, cfg, origin }: Deps) {
  /** Terminal node. Streams when asked for text/event-stream; otherwise answers once it is done. */
  app.post('/v1/sandbox/exec', async (req, reply) => {
    const u = need(req), b = body(req), command = str(b.command, 'Command', { max: 20_000 });
    const cwd = boardDir(cfg, folderFor(db, u, b.workspace)), stdin = typeof b.stdin === 'string' ? b.stdin.slice(0, 2_000_000) : null;
    const timeoutSec = Number(b.timeoutSec) || 30;
    if (wantsStream(req)) {
      const s = sse(req, reply, origin(req)), ac = new AbortController();
      s.onClose(() => ac.abort());
      const r = await execCommand(cfg, { command, stdin, timeoutSec, cwd, signal: ac.signal }, (stream, chunk) => s.send({ type: stream, chunk }));
      s.send({ type: 'exit', exitCode: r.exitCode, ...(r.simulated ? { simulated: true } : {}) });
      s.end();
      return;
    }
    const r = await execCommand(cfg, { command, stdin, timeoutSec, cwd });
    return { stdout: r.stdout, stderr: r.stderr, exitCode: r.exitCode, simulated: r.simulated };
  });

  /** Code node. JavaScript runs in an isolated worker; Python runs in the sandbox. */
  app.post('/v1/sandbox/code', { bodyLimit: 12_000_000 }, async (req) => {
    const u = need(req), b = body(req), source = str(b.source, 'Script', { max: 200_000 });
    const inputs = b.inputs && typeof b.inputs === 'object' ? b.inputs : {};
    if (b.language === 'javascript') {
      const r = await runScript(source, b.input ?? null, inputs, 5000);
      return { value: r.value, logs: r.logs, ...(r.error ? { error: r.error } : {}) };
    }
    if (b.language !== 'python') throw bad('language is javascript or python');
    if (cfg.sandbox === 'off') return { value: null, logs: [SIM_CODE], simulated: true };
    const cwd = boardDir(cfg, folderFor(db, u, b.workspace)), name = `.paradigm/${newId('py')}.py`;
    await mkdir(join(cwd, '.paradigm'), { recursive: true });
    await writeFile(join(cwd, name), pythonProgram(source));
    try {
      const r = await execCommand(cfg, { command: `python3 ${name}`, stdin: JSON.stringify({ input: b.input ?? null, inputs }), timeoutSec: 30, cwd });
      const out = readPython(r.stdout);
      if (r.exitCode !== 0) return { value: null, logs: out.logs, error: (r.stderr.trim().split('\n').slice(-1)[0] || `exit ${r.exitCode}`) };
      return { value: out.value, logs: out.logs };
    } finally {
      await rm(join(cwd, name), { force: true });
    }
  });
}
