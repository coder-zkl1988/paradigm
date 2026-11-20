// Stickers are layered SVG paths: a white outline under coloured shapes, the
// look used for node icons, toolbar buttons and the sticker library.

import type { ShapeItem } from './types';

export interface Layer {
  d: string;
  vb?: string;
  f?: string;
  s?: string;
  w?: number;
  op?: number;
  par?: string;
  /** 'non-scaling-stroke' keeps outlines thin on stretched shapes. */
  ve?: string;
  dash?: string;
}

export const layerDefaults = { vb: '0 0 48 48', f: 'none', s: 'none', w: 0, op: 1, par: 'xMidYMid meet', ve: 'none', dash: 'none' };

export const INK_DARK = '#2B2B2B';

/** [path, fill, stroke?, width?, opacity?]. A stroke of 'none' means a flat shape with no outline. */
export type Part = [string, string, string?, number?, number?];

export function stickerLayers(parts: Part[]): Layer[] {
  const out: Layer[] = [];
  for (const p of parts) {
    if (p[2] === 'none') continue;
    out.push({ d: p[0], f: p[1] === 'none' ? 'none' : '#FFFFFF', s: '#FFFFFF', w: (p[3] || 1.8) + 6 });
  }
  for (const p of parts) {
    const flat = p[2] === 'none';
    out.push({ d: p[0], f: p[1], s: flat ? 'none' : p[2] || INK_DARK, w: flat ? 0 : p[3] || 1.8, op: p[4] == null ? 1 : p[4] });
  }
  return out;
}

export const circ = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0z`;

function rr(w: number, h: number, r: number): string {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  return `M${r} 0H${w - r}A${r} ${r} 0 0 1 ${w} ${r}V${h - r}A${r} ${r} 0 0 1 ${w - r} ${h}H${r}A${r} ${r} 0 0 1 0 ${h - r}V${r}A${r} ${r} 0 0 1 ${r} 0Z`;
}

export const shapeHasText = (kind: string) => kind !== 'table' && kind !== 'person';

/** The SVG layers that draw a shape item at its own size. */
export function shapeLayers(it: Pick<ShapeItem, 'w' | 'h' | 'fill' | 'shape'>): Layer[] {
  const { w, h } = it, f = it.fill, vb = `0 0 ${w} ${h}`;
  const st = f === '#FFFFFF' ? '#2A2B30' : 'rgba(0,0,0,0.16)', sw = f === '#FFFFFF' ? 1.5 : 1;
  const one = (d: string): Layer[] => [{ vb, d, f, s: st, w: sw }];
  const norm = (d: string): Layer[] => [{ vb: '0 0 100 100', par: 'none', ve: 'non-scaling-stroke', d, f, s: st, w: sw }];
  switch (it.shape) {
    case 'circle': return one(`M0 ${h / 2}A${w / 2} ${h / 2} 0 1 0 ${w} ${h / 2}A${w / 2} ${h / 2} 0 1 0 0 ${h / 2}Z`);
    case 'pill': return one(rr(w, h, Math.min(w, h) / 2));
    case 'rect': return one(rr(w, h, 6));
    case 'diamond': return one(`M${w / 2} 0L${w} ${h / 2}L${w / 2} ${h}L0 ${h / 2}Z`);
    case 'hexagon': return one(`M${w * 0.25} 0H${w * 0.75}L${w} ${h / 2}L${w * 0.75} ${h}H${w * 0.25}L0 ${h / 2}Z`);
    case 'parallelogram': return one(`M${w * 0.2} 0H${w}L${w * 0.8} ${h}H0Z`);
    case 'cylinder': {
      const ry = Math.min(h * 0.12, 18);
      return [
        { vb, d: `M0 ${ry}A${w / 2} ${ry} 0 0 1 ${w} ${ry}V${h - ry}A${w / 2} ${ry} 0 0 1 0 ${h - ry}Z`, f, s: st, w: sw },
        { vb, d: `M0 ${ry}A${w / 2} ${ry} 0 0 0 ${w} ${ry}`, s: st, w: sw },
      ];
    }
    case 'drum': {
      const rx = Math.min(w * 0.12, 18);
      return [
        { vb, d: `M${rx} 0H${w - rx}A${rx} ${h / 2} 0 0 1 ${w - rx} ${h}H${rx}A${rx} ${h / 2} 0 0 1 ${rx} 0Z`, f, s: st, w: sw },
        { vb, d: `M${w - rx} 0A${rx} ${h / 2} 0 0 0 ${w - rx} ${h}`, s: st, w: sw },
      ];
    }
    case 'document': return one(`M0 0H${w}V${h * 0.84}Q${w * 0.75} ${h * 0.68} ${w * 0.5} ${h * 0.84}T0 ${h * 0.84}Z`);
    case 'cloud': return norm('M26 84a22 22 0 0 1-3-43.8A28 28 0 0 1 76 33a24 24 0 0 1 1 51z');
    case 'person': return norm('M50 4a20 20 0 1 1 0 40a20 20 0 1 1 0-40zM8 98c3-26 20-42 42-42s39 16 42 42z');
    case 'table':
      return [
        { vb, d: rr(w, h, 6), f, s: st, w: sw },
        { vb, d: `M6 0H${w - 6}A6 6 0 0 1 ${w} 6V${h / 3}H0V6A6 6 0 0 1 6 0Z`, f: 'rgba(0,0,0,0.08)' },
        { vb, d: `M0 ${h / 3}H${w}M0 ${(2 * h) / 3}H${w}M${w / 3} 0V${h}M${(2 * w) / 3} 0V${h}`, s: 'rgba(0,0,0,0.22)', w: 1 },
      ];
    default: return one(rr(w, h, 14));
  }
}

export const SHAPES = [
  { id: 'square', label: 'Square', w: 160, h: 160, icon: 'M7 4h10a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3z' },
  { id: 'circle', label: 'Circle', w: 160, h: 160, icon: 'M12 4a8 8 0 1 1 0 16a8 8 0 1 1 0-16z' },
  { id: 'pill', label: 'Pill', w: 200, h: 80, icon: 'M8 8h8a4 4 0 0 1 0 8H8a4 4 0 0 1 0-8z' },
  { id: 'diamond', label: 'Diamond', w: 160, h: 160, icon: 'M12 3.5l8.5 8.5-8.5 8.5L3.5 12z' },
  { id: 'rect', label: 'Rectangle', w: 240, h: 120, icon: 'M5 7h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z' },
  { id: 'hexagon', label: 'Hexagon', w: 200, h: 160, icon: 'M8 5h8l4 7-4 7H8l-4-7z' },
  { id: 'parallelogram', label: 'Parallelogram', w: 200, h: 120, icon: 'M8 6h13l-5 12H3z' },
  { id: 'cylinder', label: 'Cylinder', w: 120, h: 160, icon: 'M5 7c0-1.7 3.1-3 7-3s7 1.3 7 3v10c0 1.7-3.1 3-7 3s-7-1.3-7-3zM5 7c0 1.7 3.1 3 7 3s7-1.3 7-3' },
  { id: 'drum', label: 'Drum', w: 200, h: 120, icon: 'M7 5h10c1.7 0 3 3.1 3 7s-1.3 7-3 7H7c-1.7 0-3-3.1-3-7s1.3-7 3-7zM17 5c-1.7 0-3 3.1-3 7s1.3 7 3 7' },
  { id: 'document', label: 'Document', w: 200, h: 160, icon: 'M5 4h14v13c-2.3-1.6-4.7 1.6-7 0s-4.7 1.6-7 0z' },
  { id: 'cloud', label: 'Cloud', w: 200, h: 120, icon: 'M7.5 18a4 4 0 0 1-.6-8 5.5 5.5 0 0 1 10.4-1.2A4.6 4.6 0 0 1 17 18z' },
  { id: 'person', label: 'Person', w: 120, h: 160, icon: 'M12 4a3.5 3.5 0 1 1 0 7a3.5 3.5 0 1 1 0-7zM5 20c.6-3.8 3.4-6 7-6s6.4 2.2 7 6z' },
  { id: 'table', label: 'Table', w: 280, h: 160, icon: 'M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM4 9.5h16M4 14.5h16M9.5 9.5V20' },
];

export const STICKY_COLORS: [string, string][] = [['#FFE38A', 'Yellow'], ['#ADE2A9', 'Green'], ['#BFD7FF', 'Blue'], ['#FFC9D6', 'Pink'], ['#E3D3FF', 'Purple'], ['#FFD3A8', 'Orange']];
export const SHAPE_FILLS: [string, string][] = [['#D0D0D0', 'Grey'], ['#FFFFFF', 'White'], ['#FFE38A', 'Yellow'], ['#BFD7FF', 'Blue'], ['#ADE2A9', 'Green'], ['#FFC9D6', 'Pink'], ['#E3D3FF', 'Purple'], ['#2A2B30', 'Black']];
export const FRAME_FILLS: [string, string][] = [['#F8F8F9', 'Light grey'], ['#FFFFFF', 'White'], ['#FFF6D6', 'Cream'], ['#E7F0FF', 'Sky'], ['#E6F6EC', 'Mint'], ['#FCE8EE', 'Blush'], ['#EFEAFB', 'Lavender']];
export const TEXT_COLORS: [string, string][] = [['#111114', 'Black'], ['#6B6C73', 'Grey'], ['#2F7FD0', 'Blue'], ['#2E8B57', 'Green'], ['#D9473B', 'Red'], ['#7E57C2', 'Purple']];
export const INKS: [string, string][] = [['#111111', 'Black'], ['#E07A5F', 'Orange'], ['#2F7FD0', 'Blue'], ['#2E8B57', 'Green'], ['#7E57C2', 'Purple']];
export const ARROW_WEIGHTS: [number, string][] = [[1.5, 'Thin'], [2.5, 'Medium'], [4, 'Thick']];
export const PEN_WEIGHTS: [number, string][] = [[3, 'Thin'], [5, 'Medium'], [9, 'Thick']];
