// The tools our built-in agent (Pi) gets for a workflow step: files in the
// board folder, the terminal through the sandbox, and reading web pages.
// Names and arguments match what mapToolEvent() expects for Pi.

import { readFile, writeFile, readdir, stat, mkdir } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import type { Config } from '../config';
import { inside } from '../sandbox/folders';
import { execCommand } from '../sandbox/exec';
import { safeFetch, pageText } from '../lib/net';

export interface PiTool {
  name: string; label: string; description: string; parameters: Record<string, unknown>;
  execute: (toolCallId: string, params: any, signal?: AbortSignal) => Promise<{ content: { type: 'text'; text: string }[]; details?: unknown }>;
}

const text = (t: string) => ({ content: [{ type: 'text' as const, text: t }] });
const S = (props: Record<string, unknown>, required: string[]) => ({ type: 'object', properties: props, required, additionalProperties: false });
const str = (description: string) => ({ type: 'string', description });

async function walk(root: string, dir: string, out: string[], max = 2000) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (out.length >= max) return;
    if (e.name === 'node_modules' || e.name === '.git') continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) await walk(root, p, out, max); else out.push(relative(root, p));
  }
}

export function fileTools(cfg: Config, cwd: string): PiTool[] {
  return [
    { name: 'read', label: 'Read', description: 'Read a text file in the board folder.', parameters: S({ path: str('Path inside the board folder') }, ['path']),
      execute: async (_id, p) => { const t = await readFile(inside(cwd, p.path), 'utf8'); return text(t.length > 100_000 ? t.slice(0, 100_000) + '\n[... cut]' : t); } },
    { name: 'write', label: 'Write', description: 'Create or replace a file in the board folder.', parameters: S({ path: str('Path inside the board folder'), content: str('The whole file') }, ['path', 'content']),
      execute: async (_id, p) => { const f = inside(cwd, p.path); await mkdir(dirname(f), { recursive: true }); await writeFile(f, String(p.content)); return text(`Wrote ${p.path}`); } },
    { name: 'edit', label: 'Edit', description: 'Replace one exact piece of text in a file.', parameters: S({ path: str('Path inside the board folder'), old: str('Exact text to replace; must appear once'), new: str('Replacement') }, ['path', 'old', 'new']),
      execute: async (_id, p) => {
        const f = inside(cwd, p.path), t = await readFile(f, 'utf8'), n = t.split(p.old).length - 1;
        if (n !== 1) throw new Error(n ? `The text appears ${n} times; give more of it` : 'The text is not in the file');
        await writeFile(f, t.replace(p.old, () => p.new)); return text(`Edited ${p.path}`);
      } },
    { name: 'ls', label: 'List', description: 'List the files in the board folder.', parameters: S({ path: str('Folder, default the board folder') }, []),
      execute: async (_id, p) => { const root = inside(cwd, p.path || '.'); const out: string[] = []; if ((await stat(root)).isDirectory()) await walk(root, root, out); return text(out.join('\n') || '(empty)'); } },
    { name: 'grep', label: 'Search', description: 'Find lines that contain a piece of text.', parameters: S({ pattern: str('Text or regular expression'), path: str('Folder, default the board folder') }, ['pattern']),
      execute: async (_id, p) => {
        const root = inside(cwd, p.path || '.'), files: string[] = [], hits: string[] = [];
        let re: RegExp; try { re = new RegExp(p.pattern); } catch { re = new RegExp(String(p.pattern).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')); }
        await walk(root, root, files);
        for (const f of files) {
          if (hits.length > 200) break;
          let t = ''; try { t = await readFile(join(root, f), 'utf8'); } catch { continue; }
          t.split('\n').forEach((l, i) => { if (hits.length <= 200 && re.test(l)) hits.push(`${f}:${i + 1}: ${l.slice(0, 200)}`); });
        }
        return text(hits.join('\n') || 'No matches');
      } },
    { name: 'bash', label: 'Terminal', description: 'Run a shell command in the board folder.', parameters: S({ command: str('The command') }, ['command']),
      execute: async (_id, p, signal) => {
        const r = await execCommand(cfg, { command: p.command, cwd, timeoutSec: 120, signal });
        if (r.simulated) throw new Error('The terminal is not set up on this server, so the command did not run.');
        return text(`exit ${r.exitCode}\n${r.stdout}${r.stderr ? '\n[stderr]\n' + r.stderr : ''}`.slice(0, 60_000));
      } },
    { name: 'browser', label: 'Browser', description: 'Open a web page and read its text.', parameters: S({ url: str('http or https address') }, ['url']),
      execute: async (_id, p) => {
        const r = await safeFetch(p.url, { allowPrivate: cfg.allowPrivateHttp, maxBytes: 3_000_000 });
        const body = r.body.toString('utf8');
        return text(`${r.status} ${r.statusText}\n\n${/html/i.test(r.headers['content-type'] || '') ? pageText(body) : body.slice(0, 40_000)}`);
      } },
  ];
}
