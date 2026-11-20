// Stand-ins used when a backend service is not configured. They are shaped
// like the real thing (a page, a table, a write-up) so the nodes after a step
// have something to work on, and every result made here is flagged simulated.

import type { BoardItem, NodeInput, NodeItem } from './types';
import { bounds, GRID } from './geometry';
import { mkEdge, itemText, type FlowGraph } from './graph';
import { NODE_BY, clipText } from './nodes';
import { escapeHtml, htmlParse, inkOn, looksHtml, okHex } from './documents';
import { fmt, tr } from './i18n';

const tag = (name: string, inner: string, attrs?: string) => `<${name}${attrs ? ' ' + attrs : ''}>${inner}</${name}>`;

/** A stand-in answer for an agent step. */
export function simAnswer(it: NodeItem, G: FlowGraph, byId: Record<string, BoardItem>, inputs: NodeInput[]): string {
  const ask = (it.text || '').trim();
  let brief = '', colors: string[] = [], wants = '';
  for (const i of inputs) {
    if (i.type === 'tokens' && Array.isArray(i.value)) colors = i.value.map(okHex).filter(Boolean) as string[];
    else if (typeof i.value === 'string' && !brief) brief = i.value;
  }
  // A page that flows in is described by its title, not by its markup.
  if (looksHtml(brief)) { const page = htmlParse(brief); brief = page.title || page.blocks.find((b) => b.text)?.text || ''; }
  else brief = brief.replace(/^#+\s*/, '');
  const seen: Record<string, true> = {};
  let q = (G.outs[it.id] || []).slice();
  while (q.length && !wants) {
    const id = q.shift()!, n = byId[id];
    if (!n || seen[id] || n.kind !== 'node') continue;
    seen[id] = true;
    if (n.ntype === 'html' || n.ntype === 'sheet') wants = n.ntype;
    else if (n.ntype === 'gate') q = q.concat(G.outs[id] || []);
  }
  if (/\bhtml\b|landing page|web page/i.test(ask)) wants = 'html';
  else if (/\b(table|csv|spreadsheet)\b/i.test(ask)) wants = 'sheet';
  const topic = clipText((brief || ask || tr('Untitled')).split(/[.\n]/)[0].trim(), 90);
  let head = topic.split(',')[0].trim();
  head = head.charAt(0).toUpperCase() + head.slice(1);
  const who = tr((NODE_BY[it.ntype] || NODE_BY.llm).label), task = ask || tr('Work on what flows in');
  if (wants === 'html') {
    const lay = it.optName || 'A', accent = colors[0] || '#2457C5', ink = colors[1] || '#111114', bg = colors[2] || '#F3F4F6';
    const h1 = tag('h1', escapeHtml(head)), lead = tag('p', escapeHtml(fmt('Simulated draft for: {0}', topic)));
    const cta = tag('button', escapeHtml(tr('Get started')), 'class="cta" type="button"'), alt = tag('a', escapeHtml(tr('I already have an account')), 'href="#signin"');
    const steps = tag('ol', [tr('Start in under a minute'), tr('Nothing to set up'), tr('Change it any time')].map((x) => tag('li', escapeHtml(x))).join(''));
    const img = `<img src="hero.png" alt="${escapeHtml(fmt('Picture for: {0}', head))}">`;
    const parts = lay === 'B' ? [h1, lead, cta, alt] : lay === 'C' ? [img, h1, lead, cta, steps] : [h1, lead, steps, cta, alt, img];
    const css = `:root { --bg: ${bg}; --ink: ${ink}; --accent: ${accent}; }\nbody { margin: 0; font-family: system-ui, sans-serif; background: var(--bg); color: var(--ink); }\nmain { max-width: 420px; margin: 0 auto; padding: 32px 20px; text-align: ${lay === 'B' ? 'center' : 'left'}; }\n.cta { background: var(--accent); color: ${inkOn(accent)}; border: 0; border-radius: 12px; padding: 14px 20px; font-size: 16px; }\nimg { width: 100%; border-radius: 16px; }`;
    const headTag = '\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n' + tag('title', escapeHtml(head)) + '\n' + tag('style', '\n' + css + '\n') + '\n';
    return '<!doctype html>\n' + tag('html', '\n' + tag('head', headTag) + '\n' + tag('body', '\n' + tag('main', '\n' + parts.join('\n') + '\n') + '\n') + '\n', 'lang="en"') + '\n';
  }
  if (wants === 'sheet') {
    return `# ${head}\n\n${fmt('Simulated answer from {0}.', who)}\n\n| ${[tr('Task'), tr('Owner'), tr('Hours')].join(' | ')} |\n| --- | --- | --- |\n`
      + `| ${[tr('Read what flows in'), who, '1'].join(' | ')} |\n| ${[clipText(task, 60).replace(/\|/g, '/'), who, '4'].join(' | ')} |\n| ${[tr('Check the result and hand it on'), tr('You'), '0.5'].join(' | ')} |\n`;
  }
  return `# ${head}\n\n${fmt('Simulated answer from {0}. Set a model key on the server to get a real one.', who)}\n\n## ${tr('Plan')}\n\n`
    + `1. ${fmt('Read what flows in: {0}', inputs.length ? inputs.map((i) => '#' + i.from).join(', ') : tr('nothing yet'))}\n2. ${task}\n3. ${tr('Check the result and hand it on')}\n\n`
    + `## ${tr('Notes')}\n\n- ${fmt('Asked: {0}', task)}\n- ${fmt('Brief: {0}', topic)}\n`;
}

// ---- the toolbar chat: the built-in agent with tools that work on the board

export const BOARD_TOOLS: [string, string][] = [
  ['board_read', 'Reads what is on the board and what is selected.'],
  ['board_add_shape', 'Draws a box, a decision, or a start or end shape, with its text.'],
  ['board_add_node', 'Adds a workflow node.'],
  ['board_connect', 'Draws an arrow from one thing to another.'],
];

export type ChatMode = 'diagram' | 'flow';
const CONNECTABLE = new Set(['sticky', 'shape', 'frame', 'text', 'sticker', 'node']);

/** Diagram or workflow: forced by the person, else by the selection, the board, then the wording. */
export function chatModeOf(text: string, items: BoardItem[], selIt: BoardItem | null, forced?: string): ChatMode {
  if (forced === 'diagram' || forced === 'flow') return forced;
  if (selIt) return selIt.kind === 'node' ? 'flow' : 'diagram';
  if (items.some((o) => o.kind === 'node')) return 'flow';
  if (items.some((o) => o.kind !== 'arrow')) return 'diagram';
  if (/flow ?chart|diagram|draw|sketch|map|chart|journey|process|流程图|画|图/i.test(text)) return 'diagram';
  if (/workflow|pipeline|automat|generate|build|agent|工作流|生成|自动/i.test(text)) return 'flow';
  return chatSteps(text).length >= 2 ? 'diagram' : 'flow';
}

const LEAD_IN = /^(please\s+)?(draw|sketch|make|create|map out|map|show|diagram|add)\s+(me\s+)?((a|an|the)\s+)?((flow\s?chart|diagram|flow|chart|map|process)\s+)?((of|for|about|showing)\s+)?/i;

/** The steps named in a request such as "Sign-up flow: enter email, verify, pick a plan". */
export function chatSteps(text: string): string[] {
  const t = String(text || '').trim(), c = t.search(/[:：]/), body = c >= 0 && c < t.length - 1 ? t.slice(c + 1) : t;
  const clean = (list: string[]) => list.map((x) => x.replace(/^\s*(?:\d+[.)]\s*|and\s+|[-*•]\s*)/i, '').replace(/[.。]\s*$/, '').trim()).filter(Boolean);
  let parts = clean(body.split(/\s*(?:->|=>|→|;|；|\n|\bthen\b)\s*/i));
  if (parts.length < 2) {
    parts = clean(body.split(/\s*(?:,|，|、)\s*/));
    if (parts.length < (c >= 0 ? 2 : 3)) return [];
  }
  parts[0] = parts[0].replace(LEAD_IN, '').replace(/^请?(画|绘制|做)(一个|一张|个)?(流程图|图)?/, '').trim() || parts[0];
  return parts.slice(0, 8).map((x) => { const y = clipText(x, 44); return y.charAt(0).toUpperCase() + y.slice(1); });
}

export interface ChatCall { tool: string; args: Record<string, unknown>; line: string; add: BoardItem[] }
export interface Area { x: number; y: number; w: number; h: number; fromY?: number }

/**
 * What the agent will do for one request, as a list of board tool calls, each
 * with the items it puts on the board. Used when no model is configured.
 */
export function planChat(mode: ChatMode, text: string, items: BoardItem[], byId: Record<string, BoardItem>, selIt: BoardItem | null, newId: (prefix: string) => string, area?: Area | null): { calls: ChatCall[]; note: string; fit: boolean } {
  const calls: ChatCall[] = [];
  const call = (tool: string, args: Record<string, unknown>, line: string, add: BoardItem[] = []) => calls.push({ tool, args, line, add });
  const snap = (v: number) => Math.round(v / GRID) * GRID;
  const count = items.filter((o) => o.kind !== 'arrow').length;
  call('board_read', {}, count ? fmt('Read the board: {0} things on it', count) : tr('Read the board: it is empty'));
  let x = 40, y = 40, right = Infinity;
  if (area && !selIt) {
    x = Math.ceil((area.x + 24) / GRID) * GRID; y = Math.ceil((area.fromY || area.y + 24) / GRID) * GRID; right = area.x + area.w - 24;
  } else if (items.length && !selIt) {
    let maxy = -Infinity, minx = Infinity;
    for (const o of items) { const bb = bounds(o, byId); maxy = Math.max(maxy, bb.y + bb.h); minx = Math.min(minx, bb.x); }
    x = snap(minx); y = snap(maxy + 80);
  }
  if (mode === 'flow') {
    const ad = NODE_BY.llm, pd = NODE_BY.prompt;
    if (selIt && CONNECTABLE.has(selIt.kind)) {
      const sb = bounds(selIt, byId);
      const sn: NodeItem = { id: newId('ai'), kind: 'node', ntype: 'llm', x: snap(sb.x + sb.w + 80), y: snap(sb.y), w: ad.w, h: ad.h, text, status: 'idle' };
      call('board_add_node', { type: 'llm', text, x: sn.x, y: sn.y }, fmt('Add a step: {0}', tr(ad.label)), [sn]);
      call('board_connect', { from: selIt.id, to: sn.id }, fmt('Connect #{0} to #{1}', selIt.id, sn.id), [mkEdge(newId('e'), selIt.id, sn.id)]);
      return { calls, note: fmt('Proposal: add an AI step after #{0}', selIt.id), fit: false };
    }
    const pn: NodeItem = { id: newId('p'), kind: 'node', ntype: 'prompt', x, y, w: pd.w, h: pd.h, text, status: 'idle' };
    const below = x + 360 + ad.w > right;
    const an: NodeItem = { id: newId('ai'), kind: 'node', ntype: 'llm', x: below ? x : x + 360, y: below ? y + pd.h + 80 : y, w: ad.w, h: ad.h, text: '', status: 'idle' };
    call('board_add_node', { type: 'prompt', text, x: pn.x, y: pn.y }, fmt('Add a step: {0}', tr(pd.label)), [pn]);
    call('board_add_node', { type: 'llm', text: '', x: an.x, y: an.y }, fmt('Add a step: {0}', tr(ad.label)), [an]);
    call('board_connect', { from: pn.id, to: an.id }, fmt('Connect #{0} to #{1}', pn.id, an.id), [mkEdge(newId('e'), pn.id, an.id)]);
    return { calls, note: fmt('Proposal: add #{0} and #{1} for your request', pn.id, an.id), fit: !area };
  }
  let steps = chatSteps(text), guessed = false;
  const from = selIt && CONNECTABLE.has(selIt.kind) ? selIt : null;
  if (!steps.length) {
    let topic = clipText(text.replace(LEAD_IN, '').replace(/[.。]\s*$/, '').trim() || text, 44);
    topic = topic.charAt(0).toUpperCase() + topic.slice(1);
    steps = from ? [topic] : [tr('Start'), topic, tr('Check it'), tr('Done')];
    guessed = !from;
  }
  const rowX = x;
  let yc = y + (steps.some((l) => /[?？]$/.test(l)) ? 80 : 40), prev = from ? from.id : null, prevText = from ? itemText(from) || '#' + from.id : '', shapes = 0, arrows = 0;
  if (from) { const fb = bounds(from, byId); x = snap(fb.x + fb.w + 80); yc = fb.y + fb.h / 2; }
  steps.forEach((label, i) => {
    const ends = !from && steps.length >= 3 && (i === 0 || i === steps.length - 1), ask = /[?？]$/.test(label);
    const shape = ask ? 'diamond' : ends ? 'pill' : 'rect', w = ask ? 160 : 200, h = ask ? 160 : 80;
    if (!from && x + w > right && x > rowX) { x = rowX; yc += 200; }
    const it: BoardItem = { id: newId('s'), kind: 'shape', shape, x, y: Math.round(yc - h / 2), w, h, fill: ask ? '#FFE9C7' : ends ? '#BFD7FF' : '#E3E4E8', style: 'body', align: 'center', text: label };
    call('board_add_shape', { shape, text: label, x: it.x, y: it.y }, fmt('Draw: {0}', label), [it]);
    shapes++;
    if (prev) { call('board_connect', { from: prev, to: it.id }, fmt('Connect: {0}', clipText(prevText, 20) + ' → ' + clipText(label, 20)), [mkEdge(newId('e'), prev, it.id)]); arrows++; }
    prev = it.id; prevText = label;
    x += w + 80;
  });
  const note = from ? tr('Proposal: continue the diagram from the selected item')
    : guessed ? fmt('Proposal: a starting diagram with {0} shapes. Name the steps to get your own.', shapes) : fmt('Proposal: {0} shapes and {1} arrows', shapes, arrows);
  return { calls, note, fit: !from && !area };
}
