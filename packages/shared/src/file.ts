// The board file: format `flowboard`, version 1. It is what autosave stores,
// what Download and Import use, and what agents read. The name is kept from
// the design draft so files made there open here.

import type { ArrowItem, BoardItem } from './types';
import { endPoint, index, okVia } from './geometry';
import { flowGraph, itemText, typeName, type FlowGraph } from './graph';
import { NODE_BY, outType } from './nodes';
import { registerManifest, validateManifest, type Manifest } from './market';

export const FILE_FORMAT = 'flowboard';
export const FILE_VERSION = 1;

/** Keys written for readers of the file and ignored when it is loaded. */
const DERIVED = new Set(['type', 'step', 'inputs', 'next', 'output']);

export interface BoardFile {
  format: 'flowboard';
  version: 1;
  order: string[];
  packages?: Manifest[];
  nodes: Record<string, unknown>[];
  edges: { id: string; from: string; fromSide: string; to: string; toSide: string; carries: string; color: string; weight: number; dash: boolean; head: boolean; via?: unknown }[];
  lines: { id: string; x1: number; y1: number; x2: number; y2: number; color: string; weight: number; dash: boolean; head: boolean; via?: unknown }[];
}

export function toFile(items: BoardItem[], G: FlowGraph = flowGraph(items)): BoardFile {
  const byId = index(items), packs: Manifest[] = [];
  for (const o of items) {
    const pk = o.kind === 'node' && NODE_BY[o.ntype] ? NODE_BY[o.ntype].pkg : undefined;
    if (pk && !packs.includes(pk)) packs.push(pk);
  }
  const attached = (a: ArrowItem) => !!(a.from && a.to && byId[a.from.id] && byId[a.to.id]);
  const nodes = items.filter((o) => o.kind !== 'arrow').map((o) => {
    const n: Record<string, unknown> = { id: o.id, type: typeName(o) };
    const t = itemText(o);
    if (t) n.text = t;
    if (G.step[o.id]) n.step = G.step[o.id];
    if (G.ins[o.id]) n.inputs = G.ins[o.id];
    if (G.outs[o.id]) n.next = G.outs[o.id];
    const ot = outType(o);
    if (ot) n.output = ot;
    for (const [k, v] of Object.entries(o)) if (n[k] === undefined && k !== 'status' && k !== 'proposed') n[k] = v;
    return n;
  });
  return {
    format: FILE_FORMAT, version: FILE_VERSION, order: G.order,
    ...(packs.length ? { packages: packs } : {}),
    nodes,
    edges: items.filter((a): a is ArrowItem => a.kind === 'arrow' && attached(a)).map((a) => ({
      id: a.id, from: a.from!.id, fromSide: a.from!.side, to: a.to!.id, toSide: a.to!.side,
      carries: outType(byId[a.from!.id]) || 'context', color: a.color, weight: a.weight, dash: !!a.dash, head: a.head !== false,
      ...(okVia(a.via) ? { via: a.via } : {}),
    })),
    lines: items.filter((a): a is ArrowItem => a.kind === 'arrow' && !attached(a)).map((a) => {
      const pa = endPoint(a, 'a', byId).p, pb = endPoint(a, 'b', byId).p;
      return { id: a.id, x1: pa.x, y1: pa.y, x2: pb.x, y2: pb.y, color: a.color, weight: a.weight, dash: !!a.dash, head: a.head !== false, ...(okVia(a.via) ? { via: a.via } : {}) };
    }),
  };
}

/** Reads a board file. Throws on anything that is not one. Run state is never loaded. */
export function fromFile(doc: unknown): BoardItem[] {
  const d = doc as Partial<BoardFile>;
  if (!d || d.format !== FILE_FORMAT || !Array.isArray(d.nodes)) throw new Error('This is not a board file');
  // A board file carries the manifests of the market nodes it uses. They are checked like any other.
  for (const m of Array.isArray(d.packages) ? d.packages : []) {
    if (m && !NODE_BY['pkg:' + m.id] && !validateManifest(m).length) registerManifest(m);
  }
  const ids = new Set<string>(), items: BoardItem[] = [];
  for (const n of d.nodes) {
    if (!n || typeof n.id !== 'string' || typeof n.kind !== 'string' || ids.has(n.id)) throw new Error('A node in the file is broken');
    const c: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(n)) if (!DERIVED.has(k)) c[k] = v;
    if (c.kind === 'node') { if (!NODE_BY[c.ntype as string]) throw new Error(`Unknown node type: ${String(c.ntype)}`); c.status = 'idle'; }
    if (c.kind === 'frame' || c.kind === 'sticker') delete c.text;
    if (typeof c.x !== 'number' || typeof c.y !== 'number') throw new Error('A node in the file has no position');
    delete c.proposed;
    ids.add(c.id as string);
    items.push(c as unknown as BoardItem);
  }
  for (const e of Array.isArray(d.edges) ? d.edges : []) {
    if (!e || !ids.has(e.from) || !ids.has(e.to) || ids.has(e.id)) continue;
    ids.add(e.id);
    items.push({
      id: String(e.id), kind: 'arrow', from: { id: e.from, side: (e.fromSide || 'right') as 'right' }, to: { id: e.to, side: (e.toSide || 'left') as 'left' },
      x1: 0, y1: 0, x2: 0, y2: 0, color: e.color || '#111111', weight: e.weight || 2, dash: !!e.dash, head: e.head !== false,
      via: okVia(e.via) ? { o: e.via.o, c: e.via.c.slice() } : undefined,
    });
  }
  for (const l of Array.isArray(d.lines) ? d.lines : []) {
    if (!l || ids.has(l.id) || typeof l.x1 !== 'number') continue;
    ids.add(l.id);
    items.push({
      id: String(l.id), kind: 'arrow', from: null, to: null, x1: l.x1, y1: l.y1, x2: l.x2, y2: l.y2,
      color: l.color || '#111111', weight: l.weight || 2, dash: !!l.dash, head: l.head !== false,
      via: okVia(l.via) ? { o: l.via.o, c: l.via.c.slice() } : undefined,
    });
  }
  return items;
}
