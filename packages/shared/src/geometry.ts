import type { ArrowItem, BoardItem, Box, Pt, Side, TextItem, Via } from './types';

export const GRID = 40;
/** Gap between an attached arrow end and the box it points at. */
export const AGAP = 12;

export const TEXT_STYLES = {
  title: { label: 'Title', fs: 32, fw: 300 },
  heading: { label: 'Heading', fs: 24, fw: 400 },
  body: { label: 'Body', fs: 17, fw: 400 },
  small: { label: 'Small', fs: 13, fw: 400 },
} as const;

export function index<T extends { id: string }>(items: T[]): Record<string, T> {
  const m: Record<string, T> = {};
  for (const o of items) m[o.id] = o;
  return m;
}

export function textSize(it: TextItem): { w: number; h: number } {
  const st = TEXT_STYLES[it.style || 'body'] || TEXT_STYLES.body;
  const lines = (it.text || '').split('\n');
  const maxLen = Math.max(1, ...lines.map((l) => l.length));
  return {
    w: Math.max(st.fs * 0.8, Math.ceil(maxLen * st.fs * (it.bold ? 0.6 : 0.56))) + 8,
    h: Math.ceil(lines.length * st.fs * 1.35) + 4,
  };
}

export function ptsBox(pts: Pt[]): Box {
  let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
  for (const p of pts) {
    minx = Math.min(minx, p[0]); miny = Math.min(miny, p[1]);
    maxx = Math.max(maxx, p[0]); maxy = Math.max(maxy, p[1]);
  }
  return { x: minx, y: miny, w: maxx - minx, h: maxy - miny };
}

export function sidePoint(b: Box, side: Side | null | undefined): { x: number; y: number } {
  if (side === 'top') return { x: b.x + b.w / 2, y: b.y };
  if (side === 'bottom') return { x: b.x + b.w / 2, y: b.y + b.h };
  if (side === 'left') return { x: b.x, y: b.y + b.h / 2 };
  return { x: b.x + b.w, y: b.y + b.h / 2 };
}

export function outVec(side: Side | null | undefined): Pt | null {
  if (side === 'top') return [0, -1];
  if (side === 'bottom') return [0, 1];
  if (side === 'left') return [-1, 0];
  if (side === 'right') return [1, 0];
  return null;
}

export function nearestSide(b: Box, p: { x: number; y: number }): Side {
  let best: Side = 'right', bd = Infinity;
  for (const s of ['top', 'right', 'bottom', 'left'] as Side[]) {
    const q = sidePoint(b, s), d = (q.x - p.x) ** 2 + (q.y - p.y) ** 2;
    if (d < bd) { bd = d; best = s; }
  }
  return best;
}

/** The default route: leave and enter straight, with one bend pair in between. */
export function elbowPts(a: { x: number; y: number }, b: { x: number; y: number }, sa: Side | null, sb: Side | null): Pt[] {
  const va = outVec(sa), vb = outVec(sb), G = 16;
  const s: Pt = [a.x, a.y], e: Pt = [b.x, b.y];
  const s2: Pt = va ? [a.x + va[0] * G, a.y + va[1] * G] : s;
  const e2: Pt = vb ? [b.x + vb[0] * G, b.y + vb[1] * G] : e;
  const dx = e2[0] - s2[0], dy = e2[1] - s2[1];
  const dir = va ? (va[0] !== 0 ? 'h' : 'v') : vb ? (vb[0] !== 0 ? 'h' : 'v') : Math.abs(dx) >= Math.abs(dy) ? 'h' : 'v';
  const mid: Pt[] = dir === 'h'
    ? [[s2[0] + dx / 2, s2[1]], [s2[0] + dx / 2, e2[1]]]
    : [[s2[0], s2[1] + dy / 2], [e2[0], s2[1] + dy / 2]];
  return [s, s2, ...mid, e2, e];
}

/** Drops repeated points and points that sit on a straight run. */
export function cleanPts(pts: Pt[]): Pt[] {
  const o: Pt[] = [];
  for (const p of pts) {
    const l = o[o.length - 1];
    if (!l || Math.abs(l[0] - p[0]) + Math.abs(l[1] - p[1]) > 0.5) o.push(p);
  }
  if (o.length < 3) return o;
  const r: Pt[] = [o[0]];
  for (let i = 1; i < o.length - 1; i++) {
    const a = r[r.length - 1], b = o[i], c = o[i + 1];
    const cross = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
    if (Math.abs(cross) > 0.01) r.push(b);
  }
  r.push(o[o.length - 1]);
  return r;
}

const f1 = (n: number) => n.toFixed(1);

/** A polyline with rounded corners of radius `rad`. */
export function roundedPath(pts: Pt[], rad: number): string {
  if (pts.length === 1) return `M${f1(pts[0][0])} ${f1(pts[0][1])}l0.1 0`;
  let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1], p = pts[i], c = pts[i + 1];
    const la = Math.hypot(p[0] - a[0], p[1] - a[1]), lc = Math.hypot(c[0] - p[0], c[1] - p[1]);
    const r = Math.min(rad, la / 2, lc / 2);
    const b1 = [p[0] - ((p[0] - a[0]) / la) * r, p[1] - ((p[1] - a[1]) / la) * r];
    const b2 = [p[0] + ((c[0] - p[0]) / lc) * r, p[1] + ((c[1] - p[1]) / lc) * r];
    d += `L${f1(b1[0])} ${f1(b1[1])}Q${f1(p[0])} ${f1(p[1])} ${f1(b2[0])} ${f1(b2[1])}`;
  }
  const l = pts[pts.length - 1];
  return d + `L${f1(l[0])} ${f1(l[1])}`;
}

/** A smooth pen stroke through the given points. */
export function penD(pts: Pt[]): string {
  if (pts.length < 2) return `M${f1(pts[0][0])} ${f1(pts[0][1])}l0.1 0.1`;
  let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
    d += `Q${f1(pts[i][0])} ${f1(pts[i][1])} ${f1(mx)} ${f1(my)}`;
  }
  const l = pts[pts.length - 1];
  return d + `L${f1(l[0])} ${f1(l[1])}`;
}

export function endPoint(it: ArrowItem, which: 'a' | 'b', byId: Record<string, BoardItem>): { p: { x: number; y: number }; side: Side | null } {
  const ref = which === 'a' ? it.from : it.to;
  if (ref && byId[ref.id]) {
    const sp = sidePoint(bounds(byId[ref.id], byId), ref.side), ov = outVec(ref.side) || [0, 0];
    return { p: { x: sp.x + ov[0] * AGAP, y: sp.y + ov[1] * AGAP }, side: ref.side };
  }
  return { p: which === 'a' ? { x: it.x1, y: it.y1 } : { x: it.x2, y: it.y2 }, side: null };
}

export function okVia(v: unknown): v is Via {
  const o = v as Via;
  return !!o && (o.o === 'h' || o.o === 'v') && Array.isArray(o.c) && o.c.length <= 24 && o.c.every((n) => typeof n === 'number' && isFinite(n));
}

export function viaPts(a: { x: number; y: number }, b: { x: number; y: number }, via: Via): Pt[] {
  const pts: Pt[] = [[a.x, a.y]];
  let h = via.o === 'h', cur: Pt = [a.x, a.y];
  for (const n of via.c) { cur = h ? [n, cur[1]] : [cur[0], n]; pts.push(cur); h = !h; }
  cur = h ? [b.x, cur[1]] : [cur[0], b.y];
  pts.push(cur, [b.x, b.y]);
  return pts;
}

/** Turns a drawn route back into a stored one. */
export function viaFrom(pts: Pt[]): Via {
  let h = pts.length < 2 || Math.abs(pts[1][1] - pts[0][1]) < 0.5;
  const o = h ? 'h' : 'v', c: number[] = [];
  for (let i = 1; i < pts.length - 2; i++) { c.push(h ? pts[i][0] : pts[i][1]); h = !h; }
  return { o, c };
}

export function viaShift(via: Via | undefined, dx: number, dy: number): Via | undefined {
  if (!via) return via;
  const h = via.o === 'h';
  return { o: via.o, c: via.c.map((n, i) => n + ((i % 2 === 0) === h ? dx : dy)) };
}

export function arrowPts(it: ArrowItem, byId: Record<string, BoardItem>): Pt[] {
  const a = endPoint(it, 'a', byId), b = endPoint(it, 'b', byId);
  return cleanPts(okVia(it.via) ? viaPts(a.p, b.p, it.via) : elbowPts(a.p, b.p, a.side, b.side));
}

export function bounds(it: BoardItem, byId: Record<string, BoardItem>): Box {
  if (it.kind === 'text') { const t = textSize(it); return { x: it.x, y: it.y, w: t.w, h: t.h }; }
  if (it.kind === 'arrow') return ptsBox(arrowPts(it, byId));
  if (it.kind === 'pen') return ptsBox(it.pts.map((p) => [it.x + p[0], it.y + p[1]] as Pt));
  return { x: it.x, y: it.y, w: it.w, h: it.h };
}

/** The point halfway along a polyline, for labels and the bend handles. */
export function polyMid(pts: Pt[]): Pt {
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  let half = total / 2;
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (half <= seg && seg > 0) {
      const t = half / seg;
      return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t];
    }
    half -= seg;
  }
  return pts[0];
}

export const snap = (v: number, step = GRID) => Math.round(v / step) * step;
