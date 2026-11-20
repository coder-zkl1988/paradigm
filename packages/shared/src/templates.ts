// Templates: ready-made flows for one specific job, built only from our own
// nodes. Each is data: the nodes (id, type, text, extras) and the wires;
// positions are worked out here, in columns by distance from the start.

import type { BoardItem, NodeItem } from './types';
import { NODE_BY } from './nodes';
import { mkEdge } from './graph';
import templateData from './data/templates.json';

export type TemplateGroup = 'eng' | 'uxc' | 'vis';

export interface Template {
  name: string;
  /** [id, node type, text, extra fields] */
  n: [string, string, string, Record<string, unknown>?][];
  /** [from, to] */
  e: [string, string][];
}

export const TEMPLATES = templateData as unknown as Record<string, Template>;

/** Gallery metadata for the workspace: group, names and the steps line, in both languages. */
export const TEMPLATE_INFO: Record<string, { group: TemplateGroup; steps: string; zhName: string; zhSteps: string }> = {
  w1: { group: 'eng', steps: 'Diff, AI review, test run, review gate, Markdown report', zhName: '代码合并请求审查', zhSteps: '代码差异、AI 审查、运行测试、审核关卡、Markdown 报告' },
  w2: { group: 'eng', steps: 'Bug report, AI diagnosis, code patch, terminal tests, review gate', zhName: '从缺陷报告到修复', zhSteps: '缺陷报告、AI 诊断、代码补丁、终端测试、审核关卡' },
  w3: { group: 'eng', steps: 'Commit data, AI summary, Markdown, doc', zhName: '根据提交生成发布说明', zhSteps: '提交数据、AI 总结、Markdown、文档' },
  w4: { group: 'uxc', steps: 'Brief, palette, AI layout, HTML preview, review gate', zhName: '根据需求生成落地页', zhSteps: '需求、配色、AI 布局、HTML 预览、审核关卡' },
  w5: { group: 'uxc', steps: 'Page draft, HTML preview, AI checklist, sheet, doc', zhName: '设计走查与交付', zhSteps: '页面草稿、HTML 预览、AI 检查清单、表格、文档' },
  w6: { group: 'uxc', steps: 'Interview notes, AI themes, sheet, slides', zhName: '用户访谈整理', zhSteps: '访谈记录、AI 主题归纳、表格、幻灯片' },
  w7: { group: 'vis', steps: 'Reference images, prompt, image generation, review gate, slides', zhName: '从情绪板到主视觉', zhSteps: '参考图、提示、图片生成、审核关卡、幻灯片' },
  w8: { group: 'vis', steps: 'Script, image generation, video generation, review gate', zhName: '从分镜到短视频', zhSteps: '脚本、图片生成、视频生成、审核关卡' },
  w9: { group: 'eng', steps: 'Package list, Codex agent, test run, review gate, Markdown', zhName: '用 Codex 升级依赖', zhSteps: '依赖清单、Codex 代理、运行测试、审核关卡、Markdown' },
  w10: { group: 'eng', steps: 'API request, code, sheet, review gate', zhName: 'API 健康报告', zhSteps: 'API 请求、代码、表格、审核关卡' },
  w11: { group: 'eng', steps: 'CSV data, CSV cleaner, sheet, AI summary, doc', zhName: '把杂乱的 CSV 变成报告', zhSteps: 'CSV 数据、CSV 清理、表格、AI 总结、文档' },
  w12: { group: 'uxc', steps: 'Palette, contrast checker, sheet, AI fixes, doc', zhName: '配色无障碍检查', zhSteps: '配色、对比度检查、表格、AI 修改建议、文档' },
  w13: { group: 'uxc', steps: 'Brief, palette, three AI options, HTML preview, review gate', zhName: '比较三个布局方案', zhSteps: '需求、配色、三个 AI 方案、HTML 预览、审核关卡' },
  w14: { group: 'uxc', steps: 'Page copy, word count, Claude agent, Markdown, review gate', zhName: '用 Claude 审阅页面文案', zhSteps: '页面文案、字数统计、Claude 代理、Markdown、审核关卡' },
  w15: { group: 'vis', steps: 'Brief, palette, three image sizes, review gate, slides', zhName: '三种尺寸的活动主图', zhSteps: '需求、配色、三种图片尺寸、审核关卡、幻灯片' },
  w16: { group: 'vis', steps: 'Reference images, palette, AI outline, slides, review gate', zhName: '从情绪板生成品牌演示', zhSteps: '参考图、配色、AI 大纲、幻灯片、审核关卡' },
};

export const GROUP_LABEL: Record<TemplateGroup, string> = { eng: 'Engineering', uxc: 'Product design', vis: 'Visual' };

export function templateKey(name: string): string | null {
  if (TEMPLATES[name]) return name;
  for (const k of Object.keys(TEMPLATES)) if (TEMPLATES[k].name === name) return k;
  return null;
}

/** Lays a template out: one column per distance from the start, 80 px apart, centred vertically. */
export function templateItems(key: string): BoardItem[] {
  const t = TEMPLATES[key], depth: Record<string, number> = {}, ins: Record<string, string[]> = {}, cols: Template['n'][] = [], items: BoardItem[] = [];
  for (const x of t.n) ins[x[0]] = [];
  for (const e of t.e) ins[e[1]].push(e[0]);
  const depthOf = (id: string): number => {
    if (depth[id] === undefined) { depth[id] = 0; depth[id] = ins[id].reduce((m, u) => Math.max(m, depthOf(u) + 1), 0); }
    return depth[id];
  };
  for (const x of t.n) { const d = depthOf(x[0]); (cols[d] = cols[d] || []).push(x); }
  const colH = (col: Template['n']) => col.reduce((h, c) => h + NODE_BY[c[1]].h + 60, -60);
  const tallest = cols.reduce((m, col) => Math.max(m, colH(col)), 0);
  let x = 0, n = 0;
  for (const col of cols) {
    const w = col.reduce((m, c) => Math.max(m, NODE_BY[c[1]].w), 0);
    let y = Math.round((tallest - colH(col)) / 2 / 20) * 20;
    for (const c of col) {
      const d = NODE_BY[c[1]];
      items.push({ id: c[0], kind: 'node', ntype: c[1], x, y, w: d.w, h: d.h, text: c[2] || '', status: 'idle', ...(c[3] || {}) } as NodeItem);
      y += d.h + 60;
    }
    x += w + 80;
  }
  for (const e of t.e) items.push(mkEdge('e' + ++n, e[0], e[1]));
  return items;
}

// ---- the three guided flows offered on an empty board

export const STARTERS = [
  { key: 'Code flow', av: 'coder', who: 'For programmers', title: 'Ship a feature', desc: 'Spec, AI step, terminal, review, preview' },
  { key: 'UI flow', av: 'ux', who: 'For UI/UX designers', title: 'Design a screen', desc: 'Brief and palette, HTML preview, review, slides' },
  { key: 'Visual flow', av: 'visual', who: 'For visual designers', title: 'Make a visual', desc: 'Brief and reference, image, video' },
] as const;

function N(id: string, t: string, x: number, y: number, text?: string, extra?: Partial<NodeItem>): NodeItem {
  const d = NODE_BY[t];
  return { id, kind: 'node', ntype: t, x, y, w: d.w, h: d.h, text: text || '', status: 'idle', ...(extra || {}) };
}

/** A template or guided flow by key or name; null for an empty board. */
export function starterItems(name: string): BoardItem[] | null {
  const tk = templateKey(name);
  if (tk) return templateItems(tk);
  const E = mkEdge;
  if (name === 'Code flow') return [
    N('p1', 'prompt', 0, 0, 'Add CSV export to the orders page, with a date range filter'),
    N('data1', 'data', 0, 200, '{ "repo": "shop-web", "branch": "main", "tests": "npm test" }'),
    N('ai1', 'llm', 360, 0, 'Plan the change and write the code'),
    N('sh1', 'terminal', 720, 0, 'npm test'),
    N('md1', 'md', 720, 240, ''),
    N('code1', 'code', 360, 260, "return Object.keys(input).length + ' settings for ' + input.repo", { w: 280 }),
    N('ok1', 'gate', 1120, 0, 'Check the diff before it ships'),
    N('web1', 'html', 1440, 0, ''),
    E('e1', 'p1', 'ai1'), E('e2', 'data1', 'ai1'), E('e3', 'ai1', 'sh1'), E('e4', 'ai1', 'md1'), E('e5', 'sh1', 'ok1'), E('e6', 'ok1', 'web1'), E('e7', 'data1', 'code1'), E('e8', 'code1', 'md1'),
  ];
  if (name === 'UI flow') return [
    N('p1', 'prompt', 0, 0, 'Onboarding screen for a habit tracker, for first-time users on a phone'),
    N('pal1', 'palette', 0, 200, '#2457C5, #111114, #F3F4F6, #E07A5F'),
    N('ai1', 'llm', 360, -270, 'Draft the screen as HTML: text first', { h: 240, opt: 'o1', optName: 'A' }),
    N('ai2', 'llm', 360, 0, 'Draft the screen as HTML: centred', { h: 240, opt: 'o1', optName: 'B' }),
    N('ai3', 'llm', 360, 270, 'Draft the screen as HTML: image first', { h: 240, opt: 'o1', optName: 'C' }),
    N('web1', 'html', 720, 0, ''),
    N('doc1', 'doc', 1160, 200, ''),
    N('ok1', 'gate', 1160, 0, 'Design review'),
    N('ppt1', 'slides', 1480, 0, ''),
    E('e1', 'p1', 'ai1'), E('e2', 'pal1', 'ai1'), E('e3', 'ai1', 'web1'), E('e4', 'web1', 'ok1'), E('e5', 'web1', 'doc1'), E('e6', 'ok1', 'ppt1'),
    E('e7', 'p1', 'ai2'), E('e8', 'pal1', 'ai2'), E('e9', 'ai2', 'web1'), E('e10', 'p1', 'ai3'), E('e11', 'pal1', 'ai3'), E('e12', 'ai3', 'web1'),
  ];
  if (name === 'Visual flow') return [
    N('p1', 'prompt', 0, 0, 'Poster for a summer music night: warm dusk sky, neon accents, a small crowd'),
    N('ref1', 'ref', 0, 200, ''),
    N('img1', 'imagegen', 360, 0, 'Key visual, 16:9'),
    N('vid1', 'videogen', 720, 0, 'Five second loop from the key visual'),
    N('ppt1', 'slides', 720, 320, ''),
    E('e1', 'p1', 'img1'), E('e2', 'ref1', 'img1'), E('e3', 'img1', 'vid1'), E('e4', 'img1', 'ppt1'),
  ];
  return null;
}

/** The sample board: a few stickies, a frame and a shape, for trying the drawing tools. */
export function sampleBoard(): BoardItem[] {
  return [
    { id: 'f1', kind: 'frame', x: 0, y: 120, w: 560, h: 520, label: 'Onboarding', fill: '#F8F8F9' },
    { id: 't1', kind: 'text', x: 0, y: 0, text: 'Product ideas', style: 'title', color: '#111114' },
    { id: 't2', kind: 'text', x: 0, y: 52, text: 'Drop a sticky, then group the ones that belong together.', style: 'body', color: '#6B6C73' },
    { id: 's1', kind: 'sticky', x: 40, y: 160, w: 200, h: 200, color: '#FFE38A', rot: -0.6, style: 'body', text: 'Guided first board with a sample template' },
    { id: 's2', kind: 'sticky', x: 320, y: 160, w: 200, h: 200, color: '#ADE2A9', rot: 0.5, style: 'body', text: 'Invite teammates from the share menu' },
    { id: 's3', kind: 'sticky', x: 160, y: 400, w: 200, h: 200, color: '#BFD7FF', rot: -0.3, style: 'body', text: 'Keyboard shortcut cheat sheet' },
    { id: 'r1', kind: 'shape', shape: 'square', x: 720, y: 240, w: 200, h: 200, fill: '#D0D0D0', style: 'body', align: 'center', text: 'First-run experience' },
    { id: 'a1', kind: 'arrow', from: { id: 'f1', side: 'right' }, to: { id: 'r1', side: 'left' }, x1: 560, y1: 382, x2: 720, y2: 320, color: '#111111', weight: 2, dash: false, head: true },
    { id: 's4', kind: 'sticky', x: 1000, y: 320, w: 200, h: 200, color: '#FFC9D6', rot: 0.7, style: 'body', text: 'Offline mode?' },
    { id: 'k1', kind: 'sticker', sticker: 'idea', x: 880, y: 160, w: 88, h: 88 },
  ];
}

/** Built-in node types and market node ids a list of items uses. */
export function nodesUsed(items: BoardItem[]): { builtin: string[]; packages: string[] } {
  const builtin: string[] = [], packages: string[] = [];
  for (const o of items) {
    if (o.kind !== 'node') continue;
    const d = NODE_BY[o.ntype];
    if (!d) continue;
    if (d.pkg) { if (!packages.includes(d.pkg.id)) packages.push(d.pkg.id); }
    else if (!builtin.includes(d.t)) builtin.push(d.t);
  }
  return { builtin, packages };
}
