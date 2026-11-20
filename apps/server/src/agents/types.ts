import type { AgentRunRequest, HarnessId } from '@paradigm/shared';
import type { Config } from '../config';
import type { Run } from './run';

export interface AdapterContext {
  run: Run;
  req: AgentRunRequest;
  cfg: Config;
  /** The board folder the run works in. */
  cwd: string;
  system: string;
  prompt: string;
}

export interface Adapter {
  id: HarnessId;
  /** Why this harness cannot run for real right now, or null when it can. */
  unavailable(cfg: Config, req: AgentRunRequest): Promise<string | null>;
  /** Runs to the end and returns the final answer. Tool calls go through ctx.run. */
  run(ctx: AdapterContext): Promise<string>;
}

/** Loads an optional package by name without making TypeScript resolve it. */
export async function optional(name: string): Promise<any | null> {
  try { return await import(name); } catch { return null; }
}
