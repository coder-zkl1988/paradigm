// Working render nodes. Whatever reaches a Doc, Sheet, Slides, Markdown or HTML
// preview node is parsed into plain blocks and drawn by the app's own
// components. Text from an input is only ever shown as text: no markup, script
// or style from an input is ever inserted into the page.

import type { Block, NodeInput, Slide, Theme, View } from './types';
import { clipText, showVal } from './nodes';
import { fmt, tr } from './i18n';

const ENT: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', copy: '©', mdash: '—', ndash: '–', hellip: '…', rarr: '→', larr: '←', times: '×', middot: '·' };

export function decodeEntities(t: string): string {
  return String(t).replace(/&(#[xX]?[0-9a-fA-F]+|[a-zA-Z]+);/g, (m, n: string) => {
    if (n.charAt(0) === '#') {
      const hex = /^#[xX]/.test(n), c = parseInt(n.slice(hex ? 2 : 1), hex ? 16 : 10);
      return c > 31 && c < 0x10ffff ? String.fromCodePoint(c) : ' ';
    }
    return ENT[n] !== undefined ? ENT[n] : m;
  });
}

export const escapeHtml = (t: string) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const okHex = (c: unknown): string | null => (typeof c === 'string' && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(c) ? c : null);
export function cssHex(v: unknown): string | null { const m = /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/.exec(String(v || '')); return m ? m[0] : null; }

/** Black or white, whichever reads better on the given colour. */
export function inkOn(hex: string): string {
  let h = hex.slice(1);
  if (h.length === 3) h = h.replace(/./g, '$&$&');
  const lum = (parseInt(h.slice(0, 2), 16) * 299 + parseInt(h.slice(2, 4), 16) * 587 + parseInt(h.slice(4, 6), 16) * 114) / 1000;
  return lum > 150 ? '#111114' : '#FFFFFF';
}

export const slugOf = (t: unknown) => String(t || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
export const looksHtml = (t: unknown): boolean => typeof t === 'string' && /<(!doctype|html|body|main|div|section|h[1-6]|p|ul|ol|table|button|img|nav|header)\b/i.test(t);

function inlineMd(t: string): string {
  return String(t).replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/(\*\*|__)(.+?)\1/g, '$2')
    .replace(/(^|[\s(])[*_]([^*_\n]+)[*_](?=$|[\s).,;:!?])/g, '$1$2').replace(/`([^`]+)`/g, '$1').trim();
}
const mdCells = (line: string) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(inlineMd);

/** Markdown to blocks: headings, paragraphs, lists, quotes, code, rules and pipe tables. */
export function mdBlocks(text: string): Block[] {
  const lines = String(text || '').replace(/\r/g, '').split('\n'), out: Block[] = [];
  let para: string[] = [], i = 0, m: RegExpExecArray | null;
  const flush = () => { if (para.length) { out.push({ k: 'p', text: inlineMd(para.join(' ')) }); para = []; } };
  while (i < lines.length) {
    const l = lines[i].trim();
    if (/^```/.test(l)) {
      flush();
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i].trim())) { code.push(lines[i]); i++; }
      i++;
      out.push({ k: 'code', text: code.join('\n') });
      continue;
    }
    if (!l) { flush(); i++; continue; }
    if ((m = /^(#{1,6})\s+(.*)$/.exec(l))) { flush(); out.push({ k: ('h' + Math.min(3, m[1].length)) as Block['k'], text: inlineMd(m[2].replace(/\s+#+$/, '')) }); i++; continue; }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(l)) { flush(); out.push({ k: 'hr', text: '' }); i++; continue; }
    if (/^\|.*\|$/.test(l) && i + 1 < lines.length && /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?$/.test(lines[i + 1].trim())) {
      flush();
      const head = mdCells(l), rows: string[][] = [];
      i += 2;
      while (i < lines.length && /^\|.*\|$/.test(lines[i].trim())) { rows.push(mdCells(lines[i])); i++; }
      out.push({ k: 'table', text: '', head, rows });
      continue;
    }
    if ((m = /^[-*+]\s+(?:\[[ xX]\]\s+)?(.*)$/.exec(l))) { flush(); out.push({ k: 'li', text: inlineMd(m[1]), mark: '•' }); i++; continue; }
    if ((m = /^(\d+)[.)]\s+(.*)$/.exec(l))) { flush(); out.push({ k: 'li', text: inlineMd(m[2]), mark: m[1] + '.' }); i++; continue; }
    if ((m = /^>\s?(.*)$/.exec(l))) { flush(); out.push({ k: 'quote', text: inlineMd(m[1]) }); i++; continue; }
    para.push(l);
    i++;
  }
  flush();
  return out;
}

const HTML_BLOCK: Record<string, Block['k']> = { h1: 'h1', h2: 'h2', h3: 'h3', h4: 'h3', h5: 'h3', h6: 'h3', p: 'p', li: 'li', blockquote: 'quote', pre: 'code', button: 'button', label: 'p', figcaption: 'p', summary: 'p', dt: 'p', dd: 'p' };
const HTML_SKIP = /^(select|textarea|svg|noscript|template|iframe|object|canvas|video|audio|math)$/;
const HTML_BOX = /^(div|section|article|main|header|footer|aside|form|figure|body|html|details|dl)$/;

/**
 * A safe structured read of a page: its text, order, lists, tables, buttons,
 * links, fields and image descriptions, plus three colours from its style.
 * This is a tokenizer, not the browser's parser; scripts, styles, comments,
 * frames and inline handlers are dropped.
 */
export function htmlParse(src: string): { title: string; theme: Theme; blocks: Block[] } {
  let s = String(src || ''), css = '', title = '';
  const out: Block[] = [];
  s = s.replace(/<!--[\s\S]*?-->/g, '').replace(/<[!?][^>]*>/g, '').replace(/<script\b[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi, (_m, c: string) => { css += c + '\n'; return ''; });
  const tm = /<title[^>]*>([\s\S]*?)<\/title\s*>/i.exec(s);
  if (tm) title = decodeEntities(tm[1]).replace(/\s+/g, ' ').trim();
  s = s.replace(/<head\b[\s\S]*?<\/head\s*>/i, '');
  const bodyCss = (/<body\b[^>]*\bstyle\s*=\s*"([^"]*)"/i.exec(s) || [])[1] || '';
  const cssVar = (names: string[]) => {
    for (const n of names) { const m = new RegExp('--' + n + '\\s*:\\s*([^;}]+)').exec(css); if (m && cssHex(m[1])) return cssHex(m[1]); }
    return null;
  };
  const rule = (sel: string, prop: string) => {
    const m = new RegExp('(?:^|[}\\s,])' + sel + '\\s*\\{([^}]*)\\}').exec(css), body = (m ? m[1] : '') + (sel === 'body' ? ';' + bodyCss : '');
    const q = new RegExp('(?:^|;|\\s)' + prop + '\\s*:\\s*([^;]+)').exec(body);
    return q ? q[1].trim() : '';
  };
  const theme: Theme = {
    bg: cssVar(['bg', 'background', 'surface']) || cssHex(rule('body', 'background(?:-color)?')),
    ink: cssVar(['ink', 'fg', 'text', 'foreground']) || cssHex(rule('body', 'color')),
    accent: cssVar(['accent', 'primary', 'brand']),
    center: /center/.test(rule('main', 'text-align') || rule('body', 'text-align')),
  };
  type Cur = Block & { own?: boolean };
  let cur: Cur | null = null, nav: string[] | null = null, cell: string | null = null, skip: string | null = null;
  let tbl: { head: string[]; rows: string[][]; row: string[] | null; th: boolean } | null = null;
  const lists: number[] = [];
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>|([^<]+)/g;
  const attr = (a: string, name: string) => {
    const x = new RegExp('(?:^|\\s)' + name + '\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s>]+))', 'i').exec(a);
    return x ? decodeEntities(x[1] !== undefined ? x[1] : x[2] !== undefined ? x[2] : x[3]) : '';
  };
  const close = () => {
    if (!cur) return;
    const t = cur.k === 'code' ? cur.text.replace(/^\n+|\s+$/g, '') : cur.text.replace(/\s+/g, ' ').trim();
    if (nav) { if (t) nav.push(t); cur = null; return; }
    cur.text = t;
    delete cur.own;
    if (t) out.push(cur);
    cur = null;
  };
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (m[4] !== undefined) {
      if (skip) continue;
      const txt = decodeEntities(m[4]);
      if (cell !== null) { cell += txt; continue; }
      if (!txt.trim()) { if (cur && cur.text) cur.text += ' '; continue; }
      if (!cur) cur = { k: 'p', text: '' };
      cur.text += txt;
      continue;
    }
    const end = m[1] === '/', tag = m[2].toLowerCase(), a = m[3] || '';
    if (skip) { if (end && tag === skip) skip = null; continue; }
    if (HTML_SKIP.test(tag)) {
      if (end) continue;
      close();
      if (tag === 'textarea' || tag === 'select') out.push({ k: 'field', text: attr(a, 'placeholder') || attr(a, 'aria-label') || attr(a, 'name') || tag });
      if (!/\/\s*$/.test(a)) skip = tag;
      continue;
    }
    if (tag === 'nav') {
      close();
      if (!end) nav = [];
      else { if (nav && nav.length) out.push({ k: 'nav', text: '', items: nav.slice(0, 8) }); nav = null; }
      continue;
    }
    if (tag === 'table') {
      close();
      if (!end) tbl = { head: [], rows: [], row: null, th: false };
      else {
        if (tbl) {
          if (!tbl.head.length && tbl.rows.length) tbl.head = tbl.rows.shift() as string[];
          if (tbl.head.length) out.push({ k: 'table', text: '', head: tbl.head, rows: tbl.rows });
        }
        tbl = null; cell = null;
      }
      continue;
    }
    if (tbl) {
      if (tag === 'tr') {
        if (!end) { tbl.row = []; tbl.th = false; }
        else if (tbl.row) { if (tbl.th && !tbl.head.length) tbl.head = tbl.row; else if (tbl.row.length) tbl.rows.push(tbl.row); tbl.row = null; }
      } else if (tag === 'td' || tag === 'th') {
        if (!end) { cell = ''; if (tag === 'th') tbl.th = true; }
        else if (cell !== null) { if (tbl.row) tbl.row.push(cell.replace(/\s+/g, ' ').trim()); cell = null; }
      }
      continue;
    }
    if (tag === 'br') { if (cur) cur.text += cur.k === 'code' ? '\n' : ' '; continue; }
    if (tag === 'hr') { close(); out.push({ k: 'hr', text: '' }); continue; }
    if (tag === 'img') {
      const alt = attr(a, 'alt');
      if (cur && cur.text.trim()) { if (alt) cur.text += ' ' + alt + ' '; }
      else if (!nav) { close(); out.push({ k: 'img', text: alt }); }
      continue;
    }
    if (tag === 'input') {
      const ty = attr(a, 'type').toLowerCase();
      if (ty === 'hidden' || nav) continue;
      close();
      if (ty === 'submit' || ty === 'button') out.push({ k: 'button', text: attr(a, 'value') || 'Submit' });
      else out.push({ k: 'field', text: attr(a, 'placeholder') || attr(a, 'aria-label') || attr(a, 'name') || ty || 'text' });
      continue;
    }
    if (tag === 'a') {
      if (nav) { close(); if (!end) cur = { k: 'p', text: '' }; continue; }
      if (!end) {
        if (!cur) cur = { k: /(^|\s)(btn|button|cta)(\s|-|$)/i.test(attr(a, 'class')) || attr(a, 'role') === 'button' ? 'button' : 'link', text: '', own: true };
      } else if (cur && cur.own) close();
      continue;
    }
    if (tag === 'ul' || tag === 'ol') { close(); if (!end) lists.push(tag === 'ol' ? 1 : 0); else lists.pop(); continue; }
    if (HTML_BLOCK[tag]) {
      close();
      if (!end) {
        const nc: Cur = { k: HTML_BLOCK[tag], text: '' };
        if (tag === 'li') {
          const top = lists.length - 1;
          if (top >= 0 && lists[top] > 0) { nc.mark = lists[top] + '.'; lists[top]++; } else nc.mark = '•';
        }
        cur = nc;
      }
      continue;
    }
    if (HTML_BOX.test(tag)) { close(); continue; }
  }
  close();
  return { title, theme, blocks: out };
}

/** CSV or TSV rows, with quoted cells. */
export function csvRows(text: string, d: string): string[][] {
  const rows: string[][] = [], t = String(text);
  let row: string[] = [], cell = '', q = false;
  const endRow = () => { row.push(cell.trim()); cell = ''; if (row.length > 1 || row[0] !== '') rows.push(row); row = []; };
  for (let i = 0; i < t.length; i++) {
    const c = t.charAt(i);
    if (q) { if (c === '"') { if (t.charAt(i + 1) === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"' && cell.trim() === '') { q = true; cell = ''; }
    else if (c === d) { row.push(cell.trim()); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && t.charAt(i + 1) === '\n') i++; endRow(); }
    else cell += c;
  }
  endRow();
  return rows;
}

const cellText = (v: unknown) => (v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v));
export function numOf(t: unknown): number | null {
  const x = String(t).replace(/[,\s]/g, '').replace(/^[$€£¥]/, '').replace(/%$/, '');
  return /^-?(\d+\.?\d*|\.\d+)$/.test(x) ? Number(x) : null;
}

export interface Table { head: string[]; rows: string[][]; total: number }

/** Turns any value into a table, or null when it is not one. At most 500 rows and 26 columns. */
export function tableOf(v: unknown): Table | null {
  const T = (head: unknown[], rows: unknown[][]): Table => {
    const n = Math.min(head.length, 26);
    return { head: head.slice(0, n).map(cellText), rows: rows.slice(0, 500).map((r) => { const o: string[] = []; for (let i = 0; i < n; i++) o.push(cellText(r[i])); return o; }), total: rows.length };
  };
  if (typeof v === 'string') {
    const t = v.trim();
    if (!t) return null;
    if (/^[[{]/.test(t)) { try { return tableOf(JSON.parse(t)); } catch { /* not JSON */ } }
    if (looksHtml(t)) { const hb = htmlParse(t).blocks.find((b) => b.k === 'table'); return hb ? T(hb.head!, hb.rows!) : null; }
    const mt = mdBlocks(t).find((b) => b.k === 'table');
    if (mt) return T(mt.head!, mt.rows!);
    const first = t.split(/\r?\n/)[0], d = first.includes('\t') ? '\t' : first.includes(',') ? ',' : first.includes(';') ? ';' : null;
    if (d) {
      const rows = csvRows(t, d), w = rows.length ? rows[0].length : 0;
      if (rows.length > 1 && w > 1 && rows.slice(1).filter((r) => r.length === w).length >= (rows.length - 1) * 0.6) return T(rows[0], rows.slice(1));
    }
    return null;
  }
  if (Array.isArray(v)) {
    if (!v.length) return null;
    if (v.every((r) => r && typeof r === 'object' && !Array.isArray(r))) {
      const keys: string[] = [];
      for (const r of v as Record<string, unknown>[]) for (const k of Object.keys(r)) if (!keys.includes(k)) keys.push(k);
      return keys.length ? T(keys, (v as Record<string, unknown>[]).map((r) => keys.map((k) => r[k]))) : null;
    }
    if (v.every(Array.isArray)) {
      const rows = v as unknown[][], wid = rows.reduce((acc, r) => Math.max(acc, r.length), 0);
      if (!wid) return null;
      if (rows.length > 1 && rows[0].length === wid && rows[0].every((c) => typeof c === 'string')) return T(rows[0], rows.slice(1));
      const cols: string[] = [];
      for (let i = 0; i < wid; i++) cols.push(fmt('Column {0}', i + 1));
      return T(cols, rows);
    }
    return T([tr('Value')], v.map((x) => [x]));
  }
  if (v && typeof v === 'object') {
    const ks = Object.keys(v);
    return ks.length ? T([tr('Field'), tr('Value')], ks.map((k) => [k, (v as Record<string, unknown>)[k]])) : null;
  }
  return null;
}

export function tableToCsv(tb: { head: string[]; rows: string[][] }): string {
  const q = (c: unknown) => { const s = String(c); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  return [tb.head, ...tb.rows].map((r) => r.map(q).join(',')).join('\r\n') + '\r\n';
}

export function blocksOf(inputs: NodeInput[]): { blocks: Block[]; title: string; theme: Theme | null; html: string | null } {
  let blocks: Block[] = [], title = '', theme: Theme | null = null, html: string | null = null;
  for (const inp of inputs) {
    const v = inp.value;
    if (typeof v === 'string') {
      if (looksHtml(v)) { const h = htmlParse(v); blocks = blocks.concat(h.blocks); if (!title) title = h.title; if (!theme) theme = h.theme; if (html === null) html = v; }
      else blocks = blocks.concat(mdBlocks(v));
    } else if (v === null || v === undefined) {
      if (inp.label !== undefined) blocks.push({ k: 'img', text: inp.label || '' });
    } else if (inp.type === 'tokens' && Array.isArray(v)) {
      blocks.push({ k: 'swatch', text: '', items: (v.map(okHex).filter(Boolean) as string[]).slice(0, 8) });
    } else {
      const tb = tableOf(v);
      if (tb) blocks.push({ k: 'table', text: '', head: tb.head, rows: tb.rows });
      else blocks.push({ k: 'p', text: showVal(v) });
    }
  }
  if (!title) {
    const hd = blocks.find((b) => /^h[1-3]$/.test(b.k)) || blocks.find((b) => b.k === 'p');
    title = hd ? clipText(hd.text, 70) : '';
  }
  return { blocks, title, theme, html };
}

/** One slide per h1/h2 (or a leading h3), at most six items a slide. */
export function slidesOf(blocks: Block[]): Slide[] {
  let slides: Slide[] = [];
  let cur: Slide | null = null;
  const start = (t: string) => { cur = { title: t || '', items: [] }; slides.push(cur); };
  for (const b of blocks) {
    if (b.k === 'hr') { cur = null; continue; }
    if (b.k === 'nav') continue;
    if (b.k === 'h1' || b.k === 'h2') { start(b.text); continue; }
    if (b.k === 'h3' && (!cur || (!(cur as Slide).title && !(cur as Slide).items.length))) {
      if (cur) (cur as Slide).title = b.text; else start(b.text);
      continue;
    }
    if (!cur) start('');
    (cur as unknown as Slide).items.push(b);
  }
  const even: Slide[] = [];
  for (const sl of slides) {
    const parts = Math.ceil(sl.items.length / 6) || 1, size = Math.ceil(sl.items.length / parts);
    for (let i = 0; i < parts; i++) even.push({ title: sl.title, items: sl.items.slice(i * size, (i + 1) * size) });
  }
  slides = even.filter((sl) => sl.title || sl.items.length);
  for (const sl of slides) {
    const f = sl.items[0];
    if (!sl.title && f && f.k === 'p' && f.text.length <= 80 && sl.items.length > 1) { sl.title = f.text; sl.items.shift(); }
  }
  return slides;
}

export function blocksToMd(blocks: Block[]): string {
  let out = '', prev = '';
  for (const b of blocks) {
    const k = b.k;
    let t: string;
    if (k === 'h1') t = '# ' + b.text;
    else if (k === 'h2') t = '## ' + b.text;
    else if (k === 'h3') t = '### ' + b.text;
    else if (k === 'li') t = (b.mark && b.mark !== '•' ? b.mark : '-') + ' ' + b.text;
    else if (k === 'quote') t = '> ' + b.text;
    else if (k === 'code') t = '```\n' + b.text + '\n```';
    else if (k === 'hr') t = '---';
    else if (k === 'img') t = '![' + b.text + '](image)';
    else if (k === 'button' || k === 'field') t = '[' + b.text + ']';
    else if (k === 'nav' || k === 'swatch') t = (b.items || []).join(' · ');
    else if (k === 'table') t = [b.head!, b.head!.map(() => '---'), ...b.rows!].map((r) => '| ' + r.map((c) => String(c).replace(/\|/g, '\\|')).join(' | ') + ' |').join('\n');
    else t = b.text;
    out += (out ? (k === 'li' && prev === 'li' ? '\n' : '\n\n') : '') + t;
    prev = k;
  }
  return out + '\n';
}

const tag = (name: string, inner: string, attrs?: string) => `<${name}${attrs ? ' ' + attrs : ''}>${inner}</${name}>`;

/** A complete, self-contained page from blocks. */
export function blocksToHtml(blocks: Block[], title: string): string {
  let body = '', list = '';
  const endList = () => { if (list) { body += tag('ul', list) + '\n'; list = ''; } };
  for (const b of blocks) {
    const k = b.k;
    if (k === 'li') { list += tag('li', escapeHtml(b.text)); continue; }
    endList();
    if (k === 'h1' || k === 'h2' || k === 'h3') body += tag(k, escapeHtml(b.text));
    else if (k === 'quote') body += tag('blockquote', escapeHtml(b.text));
    else if (k === 'code') body += tag('pre', escapeHtml(b.text));
    else if (k === 'hr') body += '<hr>';
    else if (k === 'img') body += tag('p', escapeHtml('[' + b.text + ']'));
    else if (k === 'button') body += tag('button', escapeHtml(b.text), 'type="button"');
    else if (k === 'field') body += `<input type="text" placeholder="${escapeHtml(b.text)}">`;
    else if (k === 'nav' || k === 'swatch') body += tag('p', escapeHtml((b.items || []).join(' · ')));
    else if (k === 'table') {
      body += tag('table', tag('thead', tag('tr', b.head!.map((c) => tag('th', escapeHtml(c))).join(''))) + tag('tbody', b.rows!.map((r) => tag('tr', r.map((c) => tag('td', escapeHtml(c))).join(''))).join('')));
    } else body += tag('p', escapeHtml(b.text));
    body += '\n';
  }
  endList();
  const css = 'body { margin: 0 auto; max-width: 720px; padding: 40px 24px; font: 16px/1.55 system-ui, sans-serif; color: #111114; }\nh1, h2, h3 { font-weight: 500; line-height: 1.2; }\ntable { border-collapse: collapse; }\nth, td { border: 1px solid #D2D3D9; padding: 6px 10px; text-align: left; }\npre { background: #F6F6F8; padding: 12px; overflow: auto; }\nblockquote { margin: 0; padding-left: 12px; border-left: 3px solid #D2D3D9; }';
  const head = '\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n' + tag('title', escapeHtml(title || 'Document')) + '\n' + tag('style', '\n' + css + '\n') + '\n';
  return '<!doctype html>\n' + tag('html', '\n' + tag('head', head) + '\n' + tag('body', '\n' + body) + '\n', 'lang="en"') + '\n';
}

/** What a render node shows and passes on. Throws when there is nothing to show. */
export function makeView(t: string, inputs: NodeInput[]): { value: unknown; text: string; view: View } {
  const up = inputs.map((i) => showVal(i.value)).filter(Boolean).join('\n\n');
  const B = blocksOf(inputs), plain = inputs.every((i) => typeof i.value === 'string' && !looksHtml(i.value));
  if (t === 'md') { const mdText = plain ? up : blocksToMd(B.blocks); return { value: mdText, text: mdText, view: { kind: 'text', title: B.title, source: mdText } }; }
  if (t === 'sheet') {
    let tb: Table | null = null;
    for (const i of inputs) if (!tb) tb = tableOf(i.value);
    if (!tb) {
      const lines = up.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (!lines.length) throw new Error('Nothing to put in a table yet');
      tb = { head: [tr('Text')], rows: lines.slice(0, 500).map((l) => [l]), total: lines.length };
    }
    const table = tb;
    const sums: { col: number; label: string; value: number }[] = [];
    table.head.forEach((h, c) => {
      let sum = 0, n = 0, bad = false;
      for (const r of table.rows) { if (r[c] === '') continue; const x = numOf(r[c]); if (x === null) bad = true; else { sum += x; n++; } }
      if (!bad && n > 1) sums.push({ col: c, label: h, value: Math.round(sum * 1000) / 1000 });
    });
    const csv = tableToCsv(table);
    return {
      value: table.rows.map((r) => { const o: Record<string, string> = {}; table.head.forEach((h, c) => { o[h] = r[c]; }); return o; }),
      text: csv,
      view: { kind: 'sheet', title: B.title || table.head.join(', '), head: table.head, rows: table.rows, total: table.total, sums, source: csv },
    };
  }
  if (!B.blocks.length) throw new Error('Nothing to show yet. The steps before it returned nothing.');
  if (t === 'slides') {
    const slides = slidesOf(B.blocks);
    if (!slides.length) throw new Error('Nothing to show yet. The steps before it returned nothing.');
    return { value: up, text: up, view: { kind: 'slides', title: B.title, slides, source: blocksToMd(B.blocks) } };
  }
  if (t === 'html') {
    const page = B.html !== null && inputs.length === 1 ? B.html : blocksToHtml(B.blocks, B.title);
    return { value: page, text: page, view: { kind: 'page', title: B.title, blocks: B.blocks, theme: B.theme, source: page, fromHtml: B.html !== null } };
  }
  const words = B.blocks.reduce((n, b) => n + (b.text ? b.text.split(/\s+/).filter(Boolean).length : 0) + (b.rows ? b.rows.length * (b.head || []).length : 0), 0);
  return { value: up, text: up, view: { kind: 'doc', title: B.title, blocks: B.blocks, words, source: blocksToMd(B.blocks) } };
}
