// Runs one command for the Terminal node, the Code node (Python) and agents.
//   off    : nothing runs; the answer says so (the default)
//   local  : runs on this machine with bash, in the board folder. Not isolated.
//   docker : runs in a throwaway container with no network, the board folder mounted.

import { spawn } from 'node:child_process';
import type { Config } from '../config';

export interface ExecOptions { command: string; stdin?: string | null; timeoutSec?: number; cwd: string; signal?: AbortSignal }
export interface ExecResult { stdout: string; stderr: string; exitCode: number; simulated: boolean; timedOut?: boolean }
type Chunk = (stream: 'stdout' | 'stderr', text: string) => void;

const MAX_OUT = 1_000_000;
export const SIM_TERMINAL = '[simulated] No sandbox is connected yet, so nothing ran.';

/** The environment a command sees: nothing from the server's own environment, so no keys leak. */
function cleanEnv(cwd: string): NodeJS.ProcessEnv {
  return { PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin', HOME: cwd, LANG: 'C.UTF-8', TERM: 'dumb', CI: '1' };
}

export function execCommand(cfg: Config, o: ExecOptions, onChunk?: Chunk): Promise<ExecResult> {
  if (cfg.sandbox === 'off') {
    onChunk?.('stdout', SIM_TERMINAL + '\n');
    return Promise.resolve({ stdout: SIM_TERMINAL, stderr: '', exitCode: 0, simulated: true });
  }
  const timeout = Math.max(1, Math.min(600, o.timeoutSec || 30)) * 1000;
  const [cmd, args] = cfg.sandbox === 'docker'
    ? ['docker', ['run', '--rm', '-i', '--network', 'none', '--memory', '1g', '--cpus', '1', '--pids-limit', '256', '-v', `${o.cwd}:/work`, '-w', '/work', cfg.dockerImage, 'bash', '-lc', o.command]]
    : ['bash', ['-lc', o.command]];
  return new Promise((resolve) => {
    const child = spawn(cmd, args as string[], { cwd: o.cwd, env: cleanEnv(o.cwd), stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '', err = '', timedOut = false, size = 0;
    const take = (which: 'stdout' | 'stderr') => (b: Buffer) => {
      if (size > MAX_OUT) return;
      const s = b.toString('utf8');
      size += s.length;
      if (which === 'stdout') out += s; else err += s;
      onChunk?.(which, s);
      if (size > MAX_OUT) { onChunk?.('stderr', '\n[output cut at 1 MB]\n'); child.kill('SIGKILL'); }
    };
    child.stdout.on('data', take('stdout'));
    child.stderr.on('data', take('stderr'));
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, timeout);
    const stop = () => child.kill('SIGKILL');
    o.signal?.addEventListener('abort', stop, { once: true });
    child.on('error', (e) => { err += String(e.message); });
    child.on('close', (code) => {
      clearTimeout(timer);
      o.signal?.removeEventListener('abort', stop);
      if (timedOut) { const m = `\n[stopped after ${timeout / 1000} s]`; err += m; onChunk?.('stderr', m); }
      resolve({ stdout: out, stderr: err, exitCode: code === null ? 137 : code, simulated: false, timedOut });
    });
    if (o.stdin) child.stdin.write(o.stdin);
    child.stdin.end();
  });
}
