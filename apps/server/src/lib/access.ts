import type { DB } from '../db';
import type { UserRow } from './auth';
import { forbidden } from './errors';
import { boardRole } from '../routes/boards';

/**
 * Runs work in a board's folder. The board must be one the person can edit;
 * without a board, the person's own scratch folder is used.
 */
export function folderFor(db: DB, u: UserRow, workspace: unknown): string {
  const id = typeof workspace === 'string' ? workspace.trim() : '';
  if (!id) return 'u-' + u.id;
  const b = db.prepare('SELECT * FROM boards WHERE id = ?').get(id) as any;
  if (!b) return 'u-' + u.id;
  const r = boardRole(db, b, u.id);
  if (!r || r === 'viewer') throw forbidden('You can view this board but not run its steps');
  return b.id;
}
