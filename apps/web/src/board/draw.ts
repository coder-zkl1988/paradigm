// Drawing helpers and constants from the draft: sticker layers, the colours of
// the board, and drawBlocks(), which turns document blocks into styled rows
// for previews and the full view.

import type { Block } from '@paradigm/shared';
import { DOCK_STICKERS, INK_DARK, NODE_STICKERS, TEXT_STYLES, TOOL_STICKERS, clipText, inkOn, layerDefaults, stickerLayers, type Layer } from '@paradigm/shared';

export const DOT = '#8A7FC8';
export const MONO = "font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace;";
export const CHIP_STK = ' box-sizing: border-box; border: 1.5px solid #2B2B2B; box-shadow: 0 0 0 2px #FFFFFF, 0 2px 3px rgba(0,0,0,0.24);';
export const AREA_COL = '#DE7556';
export const IMG_ICON = 'M5 5h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM4 16l4.5-4.5 4 4 2.5-2.5 5 5M15 9.5h.01';
export const PLAY_ICON = 'M8 5.5v13l11-6.5z';

const W = '#FFFFFF', K = INK_DARK, O = '#FF9F5A', SK = '#FFD08A';

/** A layer with every attribute filled in, as the draft's L() does. */
export const L = (o: Partial<Layer> & { pe?: string }) => ({ ...layerDefaults, ...o });
const full = (ls: Layer[]) => ls.map((l) => L(l));

export const NODE_STK: Record<string, any[]> = Object.fromEntries(Object.entries(NODE_STICKERS).map(([k, v]) => [k, full(v)]));
export const DOCK: Record<string, any[]> = Object.fromEntries(Object.entries(DOCK_STICKERS).map(([k, v]) => [k, full(v)]));
export const TOOL_STK: Record<string, any[]> = Object.fromEntries(Object.entries(TOOL_STICKERS).map(([k, v]) => [k, full(v)]));

export const stickyStk = (color: string) => full(stickerLayers([['M8 8h32v21L29 40H8z', color], ['M40 29H29v11z', W]]));
export const penStk = (ink: string) => full(stickerLayers([['M31 6l11 11-21 21-11-11z', O], ['M34 9.500l4.500 4.500', 'none', W, 2.2, 0.7], ['M10 27l-4.500 15.500L21 38z', SK], ['M7.300 36.500L5.500 42.500l6-1.800z', ink, K, 1.2]]));
export const arrowStk = (ink: string) => full(stickerLayers([['M8 33.500L25.500 16H17V8h23v23h-8v-8.500L14.500 40z', ink]]));
export const shapeStk = (icon: string) => [L({ vb: '0 0 24 24', d: icon, f: '#FFFFFF', s: '#FFFFFF', w: 4.2 }), L({ vb: '0 0 24 24', d: icon, f: '#D8D9DD', s: K, w: 1.1 })];

export function textCss(it: { style?: string; bold?: boolean; italic?: boolean; align?: string; color?: string; link?: string }, accent: string): string {
  const st = (TEXT_STYLES as Record<string, { fs: number; fw: number }>)[it.style || 'body'] || TEXT_STYLES.body;
  const color = it.link ? accent : it.color || '#111114';
  return 'font-size: ' + st.fs + 'px; font-weight: ' + (it.bold ? 600 : st.fw) + '; font-style: ' + (it.italic ? 'italic' : 'normal') + '; line-height: 1.35; letter-spacing: ' + (st.fs >= 24 ? '-0.01em' : '0') + '; text-align: ' + (it.align || 'left') + '; color: ' + color + ';' + (it.link ? ' text-decoration: underline;' : '');
}

export interface Theme { bg: string; ink: string; accent: string; center: boolean }
export interface Row { _v: 1; style: string; text: string; cells: { style: string; text: string; role?: string }[]; rows: { style: string; cells: { role: string; style: string; text: string }[] }[]; head: boolean; plain: boolean; table: boolean; level: string }

/** Turns blocks into styled rows. z scales type, max caps how many, clip shortens text (0 keeps it whole). */
export function drawBlocks(blocks: Block[], z: number, th: Theme, max: number, clip: number, gutter?: number): Row[] {
  const ink = th.ink, bg = th.bg, accent = th.accent;
  const soft = 'color-mix(in srgb, ' + ink + ' 74%, ' + bg + ')', line = 'color-mix(in srgb, ' + ink + ' 18%, ' + bg + ')', wash = 'color-mix(in srgb, ' + ink + ' 6%, ' + bg + ')';
  const px = (n: number) => Math.round(Math.max(n * z, z < 1 ? 9.5 : 0) * 10) / 10 + 'px', sp = (n: number) => Math.max(1, Math.round(n * z)) + 'px';
  const al = th.center ? ' text-align: center;' : '', self = th.center ? ' align-self: center;' : ' align-self: flex-start;';
  const gut = gutter ? ' margin-left: ' + gutter + 'px; margin-right: ' + gutter + 'px; max-width: calc(100% - ' + gutter * 2 + 'px);' : ' max-width: 100%;';
  const out: Row[] = [];
  let buttons = 0;
  const cut = (t: string) => (clip ? clipText(t, clip) : String(t));
  const B = (style: string, text: string, cells?: Row['cells'] | null, more?: Partial<Row>) => out.push(Object.assign({ _v: 1 as const, style: 'flex: 0 0 auto; box-sizing: border-box; overflow-wrap: anywhere;' + gut + ' ' + style, text: text || '', cells: cells || [], rows: [], head: false, plain: true, table: false, level: '2' }, more || {}));
  for (let i = 0; i < blocks.length && out.length < max; i++) {
    const b = blocks[i], k = b.k;
    if (k === 'h1' || k === 'h2' || k === 'h3') {
      const n = Number(k.charAt(1));
      B('margin-top: ' + sp(n === 1 ? 2 : 8) + '; font-size: ' + px(n === 1 ? 27 : n === 2 ? 19.5 : 16) + '; line-height: 1.22; font-weight: 400; color: ' + ink + ';' + al, cut(b.text), null, { head: true, plain: false, level: String(n) });
    } else if (k === 'li') {
      B('display: flex; gap: ' + sp(8) + '; font-size: ' + px(14.5) + '; line-height: 1.45; color: ' + soft + ';' + (th.center ? ' align-self: center;' : ''), '', [{ style: 'flex: 0 0 auto; min-width: ' + sp(14) + '; color: ' + accent + ';', text: b.mark || '•' }, { style: 'min-width: 0;', text: cut(b.text) }]);
    } else if (k === 'quote') B('padding-left: ' + sp(12) + '; border-left: 3px solid ' + line + '; font-size: ' + px(14.5) + '; line-height: 1.5; color: ' + soft + ';', cut(b.text));
    else if (k === 'code') B(MONO + ' padding: ' + sp(10) + ' ' + sp(12) + '; border-radius: ' + sp(8) + '; background: ' + wash + '; font-size: ' + px(12.5) + '; line-height: 1.5; color: ' + ink + '; white-space: pre-wrap; align-self: stretch;', cut(b.text));
    else if (k === 'hr') B('align-self: stretch; height: 1px; background: ' + line + ';', '');
    else if (k === 'img') B('align-self: stretch; min-height: ' + sp(132) + '; display: flex; align-items: center; justify-content: center; text-align: center; padding: ' + sp(10) + '; border-radius: ' + sp(12) + '; background: color-mix(in srgb, ' + accent + ' 16%, ' + bg + '); font-size: ' + px(12.5) + '; color: ' + soft + ';', cut(b.text));
    else if (k === 'button') {
      const primary = buttons++ === 0;
      B(self + ' padding: ' + sp(11) + ' ' + sp(20) + '; border-radius: ' + sp(12) + '; font-size: ' + px(14.5) + '; line-height: 1.2; ' + (primary ? 'background: ' + accent + '; color: ' + inkOn(accent) + ';' : 'border: 1px solid ' + line + '; color: ' + ink + ';'), cut(b.text));
    } else if (k === 'link') B(self + ' font-size: ' + px(14) + '; line-height: 1.4; color: ' + (inkOn(bg) === '#FFFFFF' ? ink : accent) + '; text-decoration: underline;', cut(b.text));
    else if (k === 'field') B('align-self: stretch; padding: ' + sp(10) + ' ' + sp(12) + '; border: 1px solid ' + line + '; border-radius: ' + sp(10) + '; font-size: ' + px(14) + '; color: ' + soft + ';', cut(b.text));
    else if (k === 'nav') B('align-self: stretch; display: flex; flex-wrap: wrap; align-items: center; gap: ' + sp(14) + '; padding-bottom: ' + sp(8) + '; border-bottom: 1px solid ' + line + '; font-size: ' + px(13.5) + '; color: ' + soft + ';', '', (b.items || []).map((t, j) => ({ style: j === 0 ? 'flex: 1 1 auto; color: ' + ink + ';' : 'flex: 0 0 auto;', text: cut(t) })));
    else if (k === 'swatch') B('align-self: stretch; display: flex; gap: ' + sp(6) + '; height: ' + sp(34) + ';', '', (b.items || []).map((c) => ({ style: 'flex: 1 1 0; border-radius: ' + sp(8) + '; border: 1px solid rgba(0,0,0,0.14); background: ' + c + ';', text: '' })));
    else if (k === 'table') {
      const keep = clip ? 4 : 200, cols = clip ? 4 : 12;
      const mkRow = (r: string[], isHead: boolean) => ({
        style: 'display: flex; border-top: ' + (isHead ? '0' : '1px solid ' + line) + ';' + (isHead ? ' background: ' + wash + ';' : ''),
        cells: r.slice(0, cols).map((c) => ({ role: isHead ? 'columnheader' : 'cell', style: 'flex: 1 1 0; min-width: 0; padding: ' + sp(6) + ' ' + sp(9) + '; font-size: ' + px(13) + '; line-height: 1.35; color: ' + (isHead ? ink : soft) + ';' + (clip ? ' overflow: hidden; text-overflow: ellipsis; white-space: nowrap;' : ' overflow-wrap: anywhere;'), text: String(c) })),
      });
      B('align-self: stretch; border: 1px solid ' + line + '; border-radius: ' + sp(8) + '; overflow: hidden;', '', null, { plain: false, table: true, rows: [mkRow(b.head || [], true)].concat((b.rows || []).slice(0, keep).map((r) => mkRow(r, false))) });
    } else B('font-size: ' + px(14.5) + '; line-height: 1.5; color: ' + soft + '; white-space: pre-wrap;' + al, cut(b.text));
  }
  return out;
}
