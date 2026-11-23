// Live boards: everyone with a board open gets an event when someone saves
// it, and the list of who else is there. The page then loads the new version
// and merges it with its own unsaved changes, item by item. Kept in memory,
// so it covers one server process.

import { randomBytes } from 'node:crypto';

export interface Person { conn: string; id: string | null; name: string }
export type LiveEvent =
  | { type: 'hello'; conn: string; version: number; people: Person[] }
  | { type: 'people'; people: Person[] }
  | { type: 'saved'; version: number; by: { id: string; name: string }; conn: string | null }
  | { type: 'gone'; reason: 'trashed' | 'deleted' | 'link_off' };

interface Listener extends Person { send: (e: LiveEvent) => void; end: () => void; viaLink: boolean }

export class LiveBoards {
  private boards = new Map<string, Set<Listener>>();

  /** Starts listening to a board. Returns what to call when the page goes away. */
  join(boardId: string, who: { id: string | null; name: string }, viaLink: boolean, send: (e: LiveEvent) => void, end: () => void, version: number) {
    const l: Listener = { conn: randomBytes(9).toString('base64url'), id: who.id, name: who.name, send, end, viaLink };
    let set = this.boards.get(boardId);
    if (!set) this.boards.set(boardId, (set = new Set()));
    set.add(l);
    send({ type: 'hello', conn: l.conn, version, people: this.people(boardId) });
    this.tell(boardId, { type: 'people', people: this.people(boardId) }, l.conn);
    return () => {
      set!.delete(l);
      if (!set!.size) this.boards.delete(boardId);
      else this.tell(boardId, { type: 'people', people: this.people(boardId) });
    };
  }

  /** People with an account who have the board open; view-link visitors are not listed. */
  people(boardId: string): Person[] {
    return [...(this.boards.get(boardId) || [])].filter((l) => !l.viaLink).map(({ conn, id, name }) => ({ conn, id, name }));
  }

  saved(boardId: string, version: number, by: { id: string; name: string }, conn: string | null) {
    this.tell(boardId, { type: 'saved', version, by, conn });
  }

  /** The board went away for everyone, or only for view-link visitors. */
  gone(boardId: string, reason: 'trashed' | 'deleted' | 'link_off') {
    for (const l of [...(this.boards.get(boardId) || [])]) {
      if (reason === 'link_off' && !l.viaLink) continue;
      l.send({ type: 'gone', reason }); l.end();
    }
  }

  private tell(boardId: string, e: LiveEvent, skip?: string) {
    for (const l of this.boards.get(boardId) || []) if (l.conn !== skip) l.send(e);
  }

  close() { for (const id of [...this.boards.keys()]) for (const l of this.boards.get(id) || []) l.end(); this.boards.clear(); }
}
