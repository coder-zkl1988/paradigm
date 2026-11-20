// Each board has its own folder. Agents, the terminal and scripts work in it,
// and nothing they are given may point outside it.

import { mkdirSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import type { Config } from '../config';

export function boardDir(cfg: Config, workspace: string): string {
  const safe = String(workspace || 'scratch').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || 'scratch';
  const dir = join(cfg.dataDir, 'sandboxes', safe);
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** A path inside `root`, or an error when it would leave it. */
export function inside(root: string, p: string): string {
  const full = resolve(root, String(p || '.').replace(/^\/+/, ''));
  const rel = relative(root, full);
  if (rel === '..' || rel.startsWith('..' + sep) || resolve(root, rel) !== full) throw new Error(`${p} is outside the board folder`);
  return full;
}
