// Files the server makes (exports, images, PDFs). Each one gets a long random
// id; whoever has the address can download it, so it can be opened in a new
// tab or put in an <img> without a token.

import { mkdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Config } from '../config';
import type { DB } from '../db';
import { now } from '../db';
import { newSecret } from './ids';

export async function saveFile(db: DB, cfg: Config, ownerId: string | null, name: string, mime: string, data: Buffer): Promise<{ id: string; url: string; name: string }> {
  const id = newSecret().slice(0, 32), dir = join(cfg.dataDir, 'files');
  mkdirSync(dir, { recursive: true });
  const safe = name.replace(/[^\w.\- ]+/g, '').trim().slice(0, 100) || 'file';
  const path = join(dir, id);
  await writeFile(path, data);
  db.prepare('INSERT INTO files (id, owner_id, name, mime, path, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(id, ownerId, safe, mime, path, now());
  return { id, url: `/v1/files/${id}/${encodeURIComponent(safe)}`, name: safe };
}
