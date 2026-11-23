// Live editing: merging someone else's saved board into this page's copy.
// Three-way, item by item, against the version both started from: an item
// this page changed (or added, or deleted) keeps this page's version; any
// other item takes the saved one. Two people editing different items never
// lose each other's work; on the same item, the later save wins.

import type { BoardItem } from './types';

/** Keys that are not part of what a person changed: run status, and arrow ends that follow their nodes. */
function canon(o: BoardItem | undefined): string {
  if (!o) return '';
  const a = o as unknown as Record<string, unknown>;
  const attached = a.kind === 'arrow' && !!a.from && !!a.to;
  const keys = Object.keys(a).filter((k) => a[k] !== undefined && k !== 'status' && k !== 'proposed' && !(attached && (k === 'x1' || k === 'y1' || k === 'x2' || k === 'y2'))).sort();
  return JSON.stringify(keys.map((k) => [k, a[k]]));
}

export function sameItem(a: BoardItem | undefined, b: BoardItem | undefined): boolean {
  return a === b || canon(a) === canon(b);
}

/**
 * `base` is the saved board this page last had, `local` is the page now, and
 * `remote` is the newer saved board. Returns the merged items in the saved
 * board's order, with this page's new items after them, and which items this
 * page changed (they still need saving). `renamed` lists new items of this
 * page that had to take another id because the saved board used theirs.
 */
export function mergeItems(base: BoardItem[], local: BoardItem[], remote: BoardItem[], fresh?: (id: string) => string): { items: BoardItem[]; kept: string[]; renamed: Record<string, string> } {
  const B = new Map(base.map((o) => [o.id, o])), R = new Map(remote.map((o) => [o.id, o]));
  // Two people can add different items under the same new id. Keep both:
  // this page's one gets another id, and its arrows follow it.
  const renamed: Record<string, string> = {};
  const taken = new Set([...base, ...local, ...remote].map((o) => o.id));
  for (const o of local) {
    if (B.has(o.id) || !R.has(o.id) || sameItem(o, R.get(o.id))) continue;
    let id = fresh ? fresh(o.id) : '';
    for (let n = 2; !id || taken.has(id); n++) id = `${o.id}_${n}`;
    taken.add(id); renamed[o.id] = id;
  }
  if (Object.keys(renamed).length) {
    const re = (e: unknown) => (e && typeof e === 'object' && renamed[(e as { id: string }).id] ? { ...(e as object), id: renamed[(e as { id: string }).id] } : e);
    local = local.map((o) => {
      const a = o as unknown as Record<string, unknown>;
      if (!renamed[o.id] && !(a.kind === 'arrow' && (re(a.from) !== a.from || re(a.to) !== a.to))) return o;
      return { ...a, id: renamed[o.id] || o.id, ...(a.kind === 'arrow' ? { from: re(a.from), to: re(a.to) } : {}) } as unknown as BoardItem;
    });
  }
  const L = new Map(local.map((o) => [o.id, o]));
  const mine = (id: string) => !sameItem(B.get(id), L.get(id));
  const out: BoardItem[] = [], seen = new Set<string>(), kept: string[] = [];
  const take = (id: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    if (mine(id)) { const l = L.get(id); kept.push(id); if (l) out.push(l); return; }
    const r = R.get(id), l = L.get(id);
    if (!r) return;
    // Keep what only this page knows about an item: whether it is running.
    const st = l && (l as { status?: unknown }).status;
    out.push(st !== undefined && st !== (r as { status?: unknown }).status ? ({ ...r, status: st } as BoardItem) : r);
  };
  for (const o of remote) take(o.id);
  for (const o of local) take(o.id);
  return { items: out, kept, renamed };
}
