import type { BoardItem, NodeItem, NodeResult } from './types';
import type { Manifest } from './market';

export type Category = 'info' | 'fn' | 'render' | 'aux';
export type Wire = 'text' | 'image' | 'data' | 'tokens' | 'video' | 'logs' | 'file' | 'page' | 'approval' | 'context';

export interface NodeDef {
  t: string;
  cat: Category;
  label: string;
  /** Prefix for new ids of this type. */
  short: string;
  w: number;
  h: number;
  out: Wire;
  /** Placeholder of the node's text field; no field when absent. */
  field?: string;
  /** Height of the text field. */
  fh?: number;
  mono?: boolean;
  /** 24x24 line icon. */
  icon: string;
  /** Set for nodes that come from a market manifest. */
  pkg?: Manifest;
}

export const CATS: Record<Category, { name: string; label: string; hint: string; bg: string; fg: string }> = {
  info: { name: 'info', label: 'Information', hint: 'Context a flow starts from', bg: '#DDEBFF', fg: '#1D4FA8' },
  fn: { name: 'function', label: 'Function', hint: 'Steps that do the work', bg: '#E9E3FB', fg: '#5B3FB8' },
  render: { name: 'render', label: 'Render', hint: 'Turn results into files and previews', bg: '#DDF3E4', fg: '#1F6B3A' },
  aux: { name: 'aux', label: 'Auxiliary', hint: 'Control. Stickies, text, frames, shapes and stickers in the dock are auxiliary nodes too', bg: '#ECEDEF', fg: '#3A3B40' },
};

const IMG_ICON = 'M5 5h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM4 16l4.5-4.5 4 4 2.5-2.5 5 5M15 9.5h.01';
const SPARK_ICON = 'M12 3.5l1.9 4.6 4.6 1.9-4.6 1.9L12 16.5l-1.9-4.6L5.5 10l4.6-1.9zM18.5 15.5l.8 1.9 1.9.8-1.9.8-.8 1.9-.8-1.9-1.9-.8 1.9-.8z';
const AGENT_FIELD = 'Tell the agent what to do with its inputs';

export const NODE_DEFS: NodeDef[] = [
  { t: 'prompt', cat: 'info', label: 'Prompt', short: 'p', w: 280, h: 160, out: 'text', field: 'Write the goal or context', icon: 'M5 6h14M5 11h14M5 16h9' },
  { t: 'ref', cat: 'info', label: 'Reference image', short: 'ref', w: 240, h: 200, out: 'image', icon: IMG_ICON },
  { t: 'data', cat: 'info', label: 'Data', short: 'data', w: 280, h: 160, out: 'data', field: 'Paste JSON or CSV', mono: true, icon: 'M8 4c-2 0-2.5 1.5-2.5 3v2.5c0 1.2-.8 2.5-2 2.5 1.2 0 2 1.3 2 2.5V17c0 1.5.5 3 2.5 3M16 4c2 0 2.5 1.5 2.5 3v2.5c0 1.2.8 2.5 2 2.5-1.2 0-2 1.3-2 2.5V17c0 1.5-.5 3-2.5 3' },
  { t: 'palette', cat: 'info', label: 'Palette', short: 'pal', w: 280, h: 160, out: 'tokens', field: 'Hex colors, comma separated', fh: 24, mono: true, icon: 'M12 4a8 8 0 1 0 0 16c1.5 0 2-1 1.5-2.2-.5-1.3.3-2.3 1.7-2.3H17a3 3 0 0 0 3-3c0-4.7-3.6-8.5-8-8.5zM8 11h.01M11 7.8h.01M15 8.5h.01' },
  { t: 'llm', cat: 'fn', label: 'AI step', short: 'ai', w: 280, h: 200, out: 'text', field: 'Tell the AI what to do with its inputs', fh: 60, icon: SPARK_ICON },
  { t: 'claude', cat: 'fn', label: 'Claude agent', short: 'cl', w: 280, h: 200, out: 'text', field: AGENT_FIELD, fh: 60, icon: SPARK_ICON },
  { t: 'codex', cat: 'fn', label: 'Codex agent', short: 'cx', w: 280, h: 200, out: 'text', field: AGENT_FIELD, fh: 60, icon: SPARK_ICON },
  { t: 'acp', cat: 'fn', label: 'ACP agent', short: 'acp', w: 280, h: 200, out: 'text', field: AGENT_FIELD, fh: 60, icon: SPARK_ICON },
  { t: 'imagegen', cat: 'fn', label: 'Image generation', short: 'img', w: 280, h: 280, out: 'image', field: 'Describe the image', fh: 44, icon: 'M4 6a1 1 0 0 1 1-1h8M20 11v7a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6M4 16l4.5-4.5 4 4 2.5-2.5 5 5M18 2.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z' },
  { t: 'videogen', cat: 'fn', label: 'Video generation', short: 'vid', w: 280, h: 280, out: 'video', field: 'Describe the motion', fh: 44, icon: 'M4 7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM16 10l4.5-2.5v9L16 14' },
  { t: 'terminal', cat: 'fn', label: 'Terminal', short: 'sh', w: 320, h: 200, out: 'logs', field: 'Command to run', fh: 40, mono: true, icon: 'M4 6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM7.5 9.5l3 2.5-3 2.5M12.5 15h4' },
  { t: 'code', cat: 'fn', label: 'Code', short: 'code', w: 320, h: 200, out: 'data', field: 'Write JavaScript: use input, return a result', mono: true, icon: 'M9 7l-5 5 5 5M15 7l5 5-5 5' },
  { t: 'http', cat: 'fn', label: 'API request', short: 'api', w: 320, h: 160, out: 'data', field: 'GET https://', fh: 44, mono: true, icon: 'M12 4a8 8 0 1 0 0 16a8 8 0 1 0 0-16zM4 12h16M12 4c2.5 2.2 3.5 5 3.5 8s-1 5.8-3.5 8c-2.5-2.2-3.5-5-3.5-8s1-5.8 3.5-8z' },
  { t: 'doc', cat: 'render', label: 'Doc (.docx)', short: 'doc', w: 240, h: 280, out: 'file', icon: 'M7 3.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V5a1.5 1.5 0 0 1 1-1.5zM14 3.5v4h4M9 12h6M9 15.5h6' },
  { t: 'sheet', cat: 'render', label: 'Sheet (.xlsx)', short: 'xls', w: 320, h: 240, out: 'file', icon: 'M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM4 9.5h16M4 14.5h16M9.5 9.5V20' },
  { t: 'slides', cat: 'render', label: 'Slides (.pptx)', short: 'ppt', w: 320, h: 240, out: 'file', icon: 'M4 5h16v11H4zM12 16v4M8.5 20h7M8 9h5M8 12h8' },
  { t: 'md', cat: 'render', label: 'Markdown', short: 'md', w: 280, h: 240, out: 'file', icon: 'M3.5 7h17v10h-17zM6.5 14v-4l2 2.5 2-2.5v4M16 10v4M14 12.2l2 2 2-2' },
  { t: 'html', cat: 'render', label: 'HTML preview', short: 'web', w: 360, h: 280, out: 'page', icon: 'M4 6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM4 9.5h16M7 7.3h.01M9.5 7.3h.01' },
  { t: 'gate', cat: 'aux', label: 'Review gate', short: 'ok', w: 240, h: 160, out: 'approval', field: 'What to check', fh: 22, icon: 'M12 3.5l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9v-5zM9 12l2.2 2.2L15 10.5' },
];

/** Every known node type, built in and registered from market manifests. */
export const NODE_BY: Record<string, NodeDef> = {};
for (const d of NODE_DEFS) NODE_BY[d.t] = d;

export const isBuiltin = (t: string) => !!NODE_BY[t] && !NODE_BY[t].pkg;

/** Wire types a node accepts. Nodes not listed take anything (info nodes take nothing). */
export const ACCEPTS: Record<string, Wire[]> = {
  imagegen: ['text', 'image', 'tokens', 'data', 'context', 'approval'],
  videogen: ['text', 'image', 'context', 'approval'],
  terminal: ['text', 'data', 'logs', 'file', 'context', 'approval'],
  code: ['text', 'data', 'logs', 'file', 'context', 'approval'],
  http: ['text', 'data', 'context', 'approval'],
  sheet: ['text', 'data', 'logs', 'file', 'context', 'approval'],
};

export function outType(it: BoardItem | undefined | null): Wire | null {
  return it && it.kind === 'node' ? (NODE_BY[it.ntype] || NODE_DEFS[0]).out : null;
}

/** Whether an arrow from `src` may end on `tgt`. */
export function canTake(tgt: BoardItem | undefined, src: BoardItem | undefined): boolean {
  if (!tgt || tgt.kind !== 'node') return true;
  const def = NODE_BY[tgt.ntype] || NODE_DEFS[0];
  if (def.cat === 'info') return false;
  const acc = ACCEPTS[def.t];
  return !acc || acc.includes(outType(src) || 'context');
}

export const canRunDef = (def: NodeDef) => def.cat === 'fn' || def.cat === 'render' || !!def.pkg;

/** Which node to suggest after a node of a given output type. */
export const NEXT_STEP: Record<string, string> = { text: 'md', image: 'videogen', video: 'slides', logs: 'gate', data: 'sheet', tokens: 'llm', page: 'gate', file: 'gate', approval: 'slides', context: 'llm' };

export const ID_PREFIX: Record<string, string> = { sticky: 'note', text: 't', frame: 'f', shape: 's', sticker: 'stk', arrow: 'e', pen: 'ink' };
export function idPrefix(it: { kind: string; ntype?: string }): string {
  return it.kind === 'node' ? (NODE_BY[it.ntype || ''] || NODE_DEFS[0]).short : ID_PREFIX[it.kind] || 'i';
}

// ---- settings

export interface OptionGroup { key: string; label: string; opts: [string | number, string][] }

export const NODE_OPTIONS: Record<string, OptionGroup[]> = {
  acp: [{ key: 'agent', label: 'Agent', opts: [['gemini', 'Gemini CLI'], ['opencode', 'OpenCode'], ['custom', 'Custom command']] }],
  code: [{ key: 'lang', label: 'Language', opts: [['js', 'JavaScript'], ['py', 'Python']] }],
  terminal: [{ key: 'timeout', label: 'Time limit', opts: [[30, '30 s'], [120, '2 min'], [600, '10 min']] }],
  imagegen: [{ key: 'ratio', label: 'Shape', opts: [['1:1', '1:1'], ['16:9', '16:9'], ['9:16', '9:16']] }],
  videogen: [{ key: 'seconds', label: 'Length', opts: [[4, '4 s'], [8, '8 s']] }, { key: 'ratio', label: 'Shape', opts: [['16:9', '16:9'], ['9:16', '9:16']] }],
};

const AGENT_HINT = 'Say what the agent should do. Open the step on the board to set what it may touch.';
export const NODE_HINT: Record<string, string> = {
  llm: AGENT_HINT, claude: AGENT_HINT, codex: AGENT_HINT, acp: AGENT_HINT,
  terminal: 'One shell command. What flows in arrives on standard input.',
  code: 'input is the first thing flowing in, inputs holds all of them by node id. Return what should flow out.',
  http: 'First line: method and URL. Then one header per line. Leave an empty line before the body.',
  imagegen: 'Describe the picture. Text flowing in is added to the description.',
  videogen: 'Describe the motion. Text flowing in is added to the description.',
  data: 'JSON is passed on as data. CSV with a header row becomes a list of rows.',
};

export function cfgOf(it: NodeItem, key: string): string | number | undefined {
  const v = it.cfg ? it.cfg[key] : undefined;
  if (v !== undefined) return v;
  const g = (NODE_OPTIONS[it.ntype] || []).find((x) => x.key === key);
  return g ? g.opts[0][0] : undefined;
}

// ---- where nodes live

export const PIN_MAX = 6;
export const DEFAULT_PINS = ['prompt', 'llm', 'html', 'gate'];
export const DEFAULT_SHELF = ['prompt', 'llm', 'html', 'gate', 'data', 'palette', 'ref', 'imagegen', 'videogen', 'terminal', 'code', 'md', 'doc', 'slides'];

export const BUILTIN_SUMMARY: Record<string, string> = {
  prompt: 'The request a flow starts from.', ref: 'A picture the next steps should follow.', data: 'JSON or CSV that later steps read.', palette: 'Colors that later steps use.',
  llm: 'Our own agent. Does the work you describe with what flows in.', claude: 'An agent step run by the Claude Agent SDK.', codex: 'An agent step run by Codex.', acp: 'An agent step run by any agent that speaks ACP.',
  imagegen: 'Makes an image from a description.', videogen: 'Makes a short video from a description.', terminal: 'Runs a command in the board sandbox.', code: 'Runs a short script on what flows in.', http: 'Calls a web address and passes on the answer.',
  doc: 'Turns what flows in into a document.', sheet: 'Turns what flows in into a table you can sort.', slides: 'Turns what flows in into slides.', md: 'Turns what flows in into Markdown text.', html: 'Shows a page made from what flows in.',
  gate: 'Stops the flow until a person approves.',
};
/** Built-in nodes that need the server to do their work. */
export const BUILTIN_BACKEND: Record<string, true> = { llm: true, claude: true, codex: true, acp: true, imagegen: true, videogen: true, terminal: true, http: true };

/** Keeps only known node types, without repeats. */
export function okTypes(list: unknown, fallback: string[]): string[] {
  if (!Array.isArray(list)) return fallback.slice();
  const out: string[] = [];
  for (const t of list) if (typeof t === 'string' && NODE_BY[t] && !out.includes(t)) out.push(t);
  return out;
}

// ---- values

export function showVal(v: unknown): string {
  if (v === undefined || v === null) return '';
  if (typeof v === 'string') return v;
  try { return JSON.stringify(v, null, 2); } catch { return String(v); }
}

export function clipText(t: unknown, n: number): string {
  const s = String(t || '');
  return s.length > n ? s.slice(0, n) + '…' : s;
}

/** JSON is parsed; CSV with a header row becomes a list of rows; anything else stays text. */
export function parseData(text: string): unknown {
  const t = (text || '').trim();
  if (!t) throw new Error('Paste JSON or CSV first');
  if (/^[[{"]/.test(t) || /^(-?\d|true$|false$|null$)/.test(t)) {
    try { return JSON.parse(t); } catch { if (/^[[{]/.test(t)) throw new Error('This is not valid JSON'); }
  }
  const lines = t.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2 || !lines[0].includes(',')) return t;
  const head = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((l) => {
    const c = l.split(','), o: Record<string, string | number> = {};
    head.forEach((h, i) => { const v = (c[i] || '').trim(); o[h] = v !== '' && !isNaN(Number(v)) ? Number(v) : v; });
    return o;
  });
}

export interface HttpRequest { method: string; url: string; headers: Record<string, string>; body: string | null }

/** First line: method and URL. Then headers. An empty line, then the body. */
export function parseHttp(text: string): HttpRequest {
  const lines = (text || '').replace(/\r/g, '').split('\n'), first = (lines[0] || '').trim();
  let m: string[] | null = /^(GET|POST|PUT|PATCH|DELETE|HEAD)\s+(\S+)$/i.exec(first);
  if (!m && /^https?:\/\/\S+$/i.test(first)) m = [first, 'GET', first];
  if (!m) throw new Error('Start with a method and a URL, like GET https://example.com');
  if (!/^https?:\/\/[^\s/]+/i.test(m[2])) throw new Error('The URL must start with http:// or https://');
  const headers: Record<string, string> = {};
  let i = 1;
  for (; i < lines.length && lines[i].trim(); i++) {
    const k = lines[i].indexOf(':');
    if (k < 1) throw new Error('Headers look like Name: value');
    headers[lines[i].slice(0, k).trim()] = lines[i].slice(k + 1).trim();
  }
  const body = lines.slice(i + 1).join('\n').trim();
  return { method: m[1].toUpperCase(), url: m[2], headers, body: body || null };
}

/** What an information node passes on. */
export function infoOut(it: NodeItem): NodeResult {
  const t = it.ntype;
  if (t === 'prompt') return { type: 'text', value: it.text || '', text: it.text || '' };
  if (t === 'data') { const v = parseData(it.text); return { type: 'data', value: v, text: showVal(v) }; }
  if (t === 'palette') {
    const hx = (it.text || '').match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g) || [];
    return { type: 'tokens', value: hx, text: hx.join(', ') };
  }
  return { type: 'image', value: null, text: '', sim: true };
}
