// SQLite through better-sqlite3. One file, created on first start; the schema
// is applied with simple numbered migrations.

import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export type DB = Database.Database;

const MIGRATIONS: string[] = [
  `CREATE TABLE users (
     id TEXT PRIMARY KEY, email TEXT UNIQUE, name TEXT NOT NULL, pw_hash TEXT, guest INTEGER NOT NULL DEFAULT 0,
     lang TEXT NOT NULL DEFAULT 'en', created_at TEXT NOT NULL);
   CREATE TABLE sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, created_at TEXT NOT NULL, expires_at TEXT NOT NULL);
   CREATE TABLE login_tokens (token_hash TEXT PRIMARY KEY, email TEXT NOT NULL, purpose TEXT NOT NULL, expires_at TEXT NOT NULL, used INTEGER NOT NULL DEFAULT 0);
   CREATE TABLE workspaces (id TEXT PRIMARY KEY, name TEXT NOT NULL, personal INTEGER NOT NULL DEFAULT 0, owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, created_at TEXT NOT NULL);
   CREATE TABLE members (workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, role TEXT NOT NULL, PRIMARY KEY (workspace_id, user_id));
   CREATE TABLE invites (id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, email TEXT NOT NULL, role TEXT NOT NULL, token_hash TEXT NOT NULL, invited_by TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE (workspace_id, email));
   CREATE TABLE boards (
     id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, owner_id TEXT NOT NULL REFERENCES users(id),
     title TEXT NOT NULL, tint TEXT NOT NULL, template TEXT, file TEXT NOT NULL, settings TEXT NOT NULL DEFAULT '{}', nodes INTEGER NOT NULL DEFAULT 0,
     version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, trashed_at TEXT);
   CREATE INDEX boards_ws ON boards(workspace_id, trashed_at);
   CREATE TABLE board_shares (board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, role TEXT NOT NULL, shared_by TEXT NOT NULL, PRIMARY KEY (board_id, user_id));
   CREATE TABLE node_prefs (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, prefs TEXT NOT NULL);
   CREATE TABLE market_nodes (id TEXT NOT NULL, version TEXT NOT NULL, manifest TEXT NOT NULL, publisher_id TEXT NOT NULL REFERENCES users(id), published_at TEXT NOT NULL, PRIMARY KEY (id, version));
   CREATE TABLE files (id TEXT PRIMARY KEY, owner_id TEXT, name TEXT NOT NULL, mime TEXT NOT NULL, path TEXT NOT NULL, created_at TEXT NOT NULL);
   CREATE TABLE video_jobs (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, status TEXT NOT NULL, url TEXT, simulated INTEGER NOT NULL, done_at TEXT NOT NULL, created_at TEXT NOT NULL);
   CREATE TABLE api_tokens (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, label TEXT NOT NULL, created_at TEXT NOT NULL);`,
  // View links: anyone with the link can see the board, not change it. The token is kept so the owner can copy it again.
  `CREATE TABLE board_links (board_id TEXT PRIMARY KEY REFERENCES boards(id) ON DELETE CASCADE, token TEXT NOT NULL UNIQUE, created_by TEXT NOT NULL, created_at TEXT NOT NULL);`,
  // Single sign-on: what to check when the browser comes back from the provider.
  `CREATE TABLE sso_states (state_hash TEXT PRIMARY KEY, nonce TEXT NOT NULL, verifier TEXT NOT NULL, next TEXT, expires_at TEXT NOT NULL);`,
  // Real video jobs take minutes: the provider's job id, and why one failed.
  `ALTER TABLE video_jobs ADD COLUMN provider_id TEXT;
   ALTER TABLE video_jobs ADD COLUMN error TEXT;`,
  // Sign-in with Google, GitHub and others: which provider a sign-in started with, the
  // outside accounts linked to each person, and who a one-time sign-in code is for.
  `ALTER TABLE sso_states ADD COLUMN provider TEXT NOT NULL DEFAULT 'sso';
   ALTER TABLE login_tokens ADD COLUMN user_id TEXT;
   CREATE TABLE user_identities (provider TEXT NOT NULL, subject TEXT NOT NULL, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, email TEXT, created_at TEXT NOT NULL, PRIMARY KEY (provider, subject));
   CREATE INDEX user_identities_user ON user_identities(user_id);`,
];

export function openDb(file: string): DB {
  if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  const v = db.pragma('user_version', { simple: true }) as number;
  for (let i = v; i < MIGRATIONS.length; i++) {
    db.transaction(() => { db.exec(MIGRATIONS[i]); db.pragma(`user_version = ${i + 1}`); })();
  }
  return db;
}

export const now = () => new Date().toISOString();
