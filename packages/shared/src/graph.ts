import type { ArrowItem, BoardItem } from './types';
import { index } from './geometry';
import { CATS, NODE_BY, NODE_DEFS, outType } from './nodes';
import { STICKER_LIBRARY } from './data/stickers';

export interface FlowGraph {
  ins: Record<string, string[]>;
  outs: Record<string, string[]>;
  edges: { id: string; from: string; to: string }[];
  /** Connected items in run order: each after everything that feeds it. */
  order: string[];
  /** 1-based position in `order`. */
  step: Record<string, number>;
}

/**
 * Wires and run order. Items are taken left to right, top to bottom, and each
 * one goes as soon as everything feeding it has gone. A loop does not stop the
 * order; the item that closes it is taken in reading order.
 */
export function flowGraph(items: BoardItem[]): FlowGraph {
  const byId = index(items), ins: Record<string, string[]> = {}, outs: Record<string, string[]> = {}, edges: FlowGraph['edges'] = [];
  for (const a of items) {
    if (a.kind !== 'arrow' || !a.from || !a.to || !byId[a.from.id] || !byId[a.to.id] || a.from.id === a.to.id) continue;
    (outs[a.from.id] = outs[a.from.id] || []).push(a.to.id);
    (ins[a.to.id] = ins[a.to.id] || []).push(a.from.id);
    edges.push({ id: a.id, from: a.from.id, to: a.to.id });
  }
  const left = items
    .filter((o): o is Exclude<BoardItem, ArrowItem> => o.kind !== 'arrow' && !!(ins[o.id] || outs[o.id]))
    .sort((a, b) => a.x - b.x || a.y - b.y)
    .map((o) => o.id);
  const deg: Record<string, number> = {}, order: string[] = [], step: Record<string, number> = {};
  for (const id of left) deg[id] = (ins[id] || []).length;
  while (left.length) {
    let pick = 0;
    for (let i = 0; i < left.length; i++) if (deg[left[i]] <= 0) { pick = i; break; }
    const id = left.splice(pick, 1)[0];
    order.push(id);
    for (const t of outs[id] || []) deg[t]--;
  }
  order.forEach((id, i) => { step[id] = i + 1; });
  return { ins, outs, edges, order, step };
}

export function itemText(it: BoardItem): string {
  if (it.kind === 'frame') return it.label || '';
  if (it.kind === 'sticker') return STICKER_LIBRARY.find((s) => s.id === it.sticker)?.name || '';
  if (it.kind === 'arrow' || it.kind === 'pen') return '';
  return it.text || '';
}

/** The first line of text upstream of an item, for short labels. */
export function upText(id: string, G: FlowGraph, byId: Record<string, BoardItem>): string {
  const seen: Record<string, true> = {};
  let q = (G.ins[id] || []).slice();
  while (q.length) {
    const c = q.shift()!;
    if (seen[c]) continue;
    seen[c] = true;
    const o = byId[c];
    if (o && (o.kind !== 'node' || o.ntype === 'prompt') && o.kind !== 'sticker') {
      const t = itemText(o).trim();
      if (t) return t.split('\n')[0].slice(0, 48);
    }
    q = q.concat(G.ins[c] || []);
  }
  return '';
}

/** Every item upstream of `id`, nearest first. */
export function upstream(id: string, G: FlowGraph): string[] {
  const seen: Record<string, true> = {}, out: string[] = [];
  let q = (G.ins[id] || []).slice();
  while (q.length) {
    const c = q.shift()!;
    if (seen[c]) continue;
    seen[c] = true;
    out.push(c);
    q = q.concat(G.ins[c] || []);
  }
  return out;
}

export function typeName(it: BoardItem): string {
  if (it.kind === 'node') { const d = NODE_BY[it.ntype] || NODE_DEFS[0]; return CATS[d.cat].name + '.' + d.t; }
  return 'aux.' + (it.kind === 'pen' ? 'drawing' : it.kind);
}

export function mkEdge(id: string, a: string, b: string, sa: 'right' | 'left' | 'top' | 'bottom' = 'right', sb: 'right' | 'left' | 'top' | 'bottom' = 'left'): ArrowItem {
  return { id, kind: 'arrow', from: { id: a, side: sa }, to: { id: b, side: sb }, x1: 0, y1: 0, x2: 0, y2: 0, color: '#111111', weight: 2, dash: false, head: true };
}

export { outType };
