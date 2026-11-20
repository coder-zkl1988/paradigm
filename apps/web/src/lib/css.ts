// The draft writes every style as CSS text. css() turns that text into a React
// style object, once per distinct string.

import type { CSSProperties } from 'react';

const cache = new Map<string, CSSProperties>();

function camel(prop: string): string {
  if (prop.startsWith('--')) return prop;
  const p = prop.startsWith('-ms-') ? prop.slice(1) : prop;
  return p.replace(/^-(webkit|moz)-/, (_, v: string) => v.charAt(0).toUpperCase() + v.slice(1) + '-').replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

/** Splits on semicolons that are not inside parentheses or quotes. */
function decls(text: string): string[] {
  const out: string[] = [];
  let depth = 0, quote: string | null = null, cur = '';
  for (const ch of text) {
    if (quote) { if (ch === quote) quote = null; cur += ch; continue; }
    if (ch === '"' || ch === "'") { quote = ch; cur += ch; continue; }
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (ch === ';' && depth <= 0) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out;
}

export function css(text: string | undefined | null | false): CSSProperties | undefined {
  if (!text) return undefined;
  let s = cache.get(text);
  if (s) return s;
  s = {};
  for (const d of decls(text)) {
    const i = d.indexOf(':');
    if (i < 0) continue;
    const k = d.slice(0, i).trim(), v = d.slice(i + 1).trim();
    if (k && v) (s as Record<string, string>)[camel(k)] = v;
  }
  if (cache.size > 20000) cache.clear();
  cache.set(text, s);
  return s;
}
