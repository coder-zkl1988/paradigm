// Node market. A market node is a manifest: what it takes, what it gives back,
// its settings, and one function. It carries no markup, styles or icons of its
// own. The app draws the card, the field, the settings and the result with the
// same components as the built-in nodes, so every node looks the same. The
// function runs in an isolated worker in the browser, or on the server for
// nodes marked `runs: backend`.

import { ACCEPTS, NODE_BY, NODE_HINT, NODE_OPTIONS, showVal, type NodeDef, type Wire } from './nodes';
import { makeView } from './documents';
import { fmt, tr } from './i18n';
import type { NodeResult } from './types';
import marketData from './data/market.json';

export interface Manifest {
  spec: string;
  id: string;
  name: string;
  version: string;
  author: string;
  summary: string;
  category: 'function' | 'render';
  sticker?: string;
  accepts: string[];
  output: string;
  field?: { label: string; rows?: number };
  options?: { key: string; label: string; choices: [string | number, string][] }[];
  preview: 'text' | 'table' | 'document';
  runs: 'browser' | 'backend';
  run?: string;
}

export const SPEC = {
  spec: 'flowboard-node/1',
  wire: ['text', 'data', 'tokens', 'image', 'video', 'logs', 'page', 'file'],
  categories: ['function', 'render'],
  previews: ['text', 'table', 'document'],
  runs: ['browser', 'backend'],
  stickers: ['tool', 'text', 'table', 'document', 'data', 'code', 'palette', 'web'],
  keys: ['spec', 'id', 'name', 'version', 'author', 'summary', 'category', 'sticker', 'accepts', 'output', 'field', 'options', 'preview', 'runs', 'run'],
  required: ['spec', 'id', 'name', 'version', 'author', 'summary', 'category', 'accepts', 'output', 'preview', 'runs'],
  /** Keys that would let a node bring its own look. Rejected with a reason. */
  looks: ['html', 'css', 'style', 'styles', 'template', 'render', 'icon', 'svg', 'color', 'colors', 'font', 'class', 'className', 'layout', 'theme', 'width', 'height'],
  /** Names a browser node's code may not use. This gives authors an early, clear error; the worker is the real boundary. */
  noCode: ['document', 'window', 'globalThis', 'self', 'fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'importScripts', 'eval', 'Function', 'localStorage', 'sessionStorage', 'indexedDB', 'postMessage', 'navigator', 'location', 'require', 'process', 'import'],
  limits: { name: 28, author: 32, summary: 120, label: 60, optionLabel: 24, choiceLabel: 20, options: 3, choices: 5, accepts: 4, fieldRows: 4, run: 8000, size: 12000 },
} as const;

/** Which built-in node a market sticker name borrows its sticker from. */
export const PACKAGE_STICKER: Record<string, string> = { tool: 'pkg', text: 'md', table: 'sheet', document: 'doc', data: 'data', code: 'code', palette: 'palette', web: 'html' };

export const SAMPLE_MANIFESTS = marketData.samples as Manifest[];
export const MANIFEST_TEMPLATE = marketData.template as Manifest;

export interface Problem { path: string; text: string }

const LOOK_ERR = 'Not allowed. The board draws every node, so a node cannot bring its own look.';

/** Every problem in a manifest, each with the key it is on. An empty list means it may be installed and published. */
export function validateManifest(p: unknown): Problem[] {
  const errs: Problem[] = [], L = SPEC.limits;
  const bad = (path: string, text: string) => { errs.push({ path, text }); };
  if (!p || typeof p !== 'object' || Array.isArray(p)) { bad('manifest', tr('The manifest must be one JSON object')); return errs; }
  const m = p as Record<string, any>;
  const has = (list: readonly string[], v: unknown) => (list as readonly unknown[]).includes(v);
  const str = (path: string, v: unknown, min: number, max: number) => {
    if (typeof v !== 'string' || v.trim().length < min) { bad(path, fmt('Needs text of at least {0} characters', min)); return false; }
    if (v.length > max) { bad(path, fmt('Too long: at most {0} characters', max)); return false; }
    if (/[<>]|&#|javascript:/i.test(v)) { bad(path, tr('Plain text only. No markup.')); return false; }
    return true;
  };
  for (const k of Object.keys(m)) {
    if (has(SPEC.keys, k)) continue;
    bad(k, has(SPEC.looks, k) ? tr(LOOK_ERR) : tr('Unknown key'));
  }
  for (const k of SPEC.required) if (m[k] === undefined) bad(k, tr('Missing'));
  if (m.spec !== undefined && m.spec !== SPEC.spec) bad('spec', fmt('Must be {0}', SPEC.spec));
  if (m.id !== undefined && !(typeof m.id === 'string' && /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(m.id) && m.id.length >= 3 && m.id.length <= 32)) {
    bad('id', tr('3 to 32 lower-case letters, digits and single dashes, starting with a letter'));
  }
  if (m.name !== undefined) str('name', m.name, 2, L.name);
  if (m.author !== undefined) str('author', m.author, 1, L.author);
  if (m.summary !== undefined) str('summary', m.summary, 10, L.summary);
  if (m.version !== undefined && !(typeof m.version === 'string' && /^\d+\.\d+\.\d+$/.test(m.version))) bad('version', tr('Use three numbers, like 1.0.0'));
  const oneOf = (k: string, list: readonly string[]) => { if (m[k] !== undefined && !has(list, m[k])) bad(k, fmt('Must be one of: {0}', list.join(', '))); };
  oneOf('category', SPEC.categories); oneOf('sticker', SPEC.stickers); oneOf('output', SPEC.wire); oneOf('preview', SPEC.previews); oneOf('runs', SPEC.runs);
  if (m.accepts !== undefined) {
    if (!Array.isArray(m.accepts) || !m.accepts.length || m.accepts.length > L.accepts) bad('accepts', fmt('List 1 to {0} wire types', L.accepts));
    else m.accepts.forEach((w: unknown, i: number) => { if (!has(SPEC.wire, w)) bad(`accepts[${i}]`, fmt('Must be one of: {0}', SPEC.wire.join(', '))); });
  }
  if (m.field !== undefined) {
    if (!m.field || typeof m.field !== 'object' || Array.isArray(m.field)) bad('field', tr('Must be an object with a label'));
    else {
      for (const k of Object.keys(m.field)) if (k !== 'label' && k !== 'rows') bad('field.' + k, has(SPEC.looks, k) ? tr(LOOK_ERR) : tr('Unknown key'));
      str('field.label', m.field.label, 2, L.label);
      const r = m.field.rows;
      if (r !== undefined && !(r === Math.round(r) && r >= 1 && r <= L.fieldRows)) bad('field.rows', fmt('A whole number from 1 to {0}', L.fieldRows));
    }
  }
  if (m.options !== undefined) {
    if (!Array.isArray(m.options) || m.options.length > L.options) bad('options', fmt('A list of at most {0} settings', L.options));
    else m.options.forEach((o: any, i: number) => {
      const at = `options[${i}]`;
      if (!o || typeof o !== 'object' || Array.isArray(o)) { bad(at, tr('Must be an object')); return; }
      for (const k of Object.keys(o)) if (k !== 'key' && k !== 'label' && k !== 'choices') bad(`${at}.${k}`, has(SPEC.looks, k) ? tr(LOOK_ERR) : tr('Unknown key'));
      if (!(typeof o.key === 'string' && /^[a-z][a-zA-Z0-9]{0,15}$/.test(o.key))) bad(at + '.key', tr('A short name in letters and digits, starting lower-case'));
      str(at + '.label', o.label, 2, L.optionLabel);
      if (!Array.isArray(o.choices) || o.choices.length < 2 || o.choices.length > L.choices) bad(at + '.choices', fmt('List 2 to {0} choices', L.choices));
      else o.choices.forEach((c: unknown, j: number) => {
        if (!Array.isArray(c) || c.length !== 2 || !(typeof c[0] === 'string' || typeof c[0] === 'number')) { bad(`${at}.choices[${j}]`, tr('Each choice is [value, label]')); return; }
        str(`${at}.choices[${j}][1]`, c[1], 1, L.choiceLabel);
      });
    });
  }
  if (m.runs === 'backend') {
    if (m.run !== undefined) bad('run', tr('Leave this out. A backend node keeps its code on the server.'));
  } else if (m.runs === 'browser') {
    if (typeof m.run !== 'string' || !m.run.trim()) bad('run', tr('Missing. This is the body of the function that does the work.'));
    else if (m.run.length > L.run) bad('run', fmt('Too long: at most {0} characters', L.run));
    else {
      const code = m.run.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(["'`])(?:\\[\s\S]|(?!\1)[^\\\n])*\1/g, '""').replace(/\/\/[^\n]*/g, '');
      const hit = SPEC.noCode.filter((w) => new RegExp('(^|[^.\\w$])' + w + '\\b').test(code));
      if (hit.length) bad('run', fmt('May not use: {0}. A node only works with what flows in.', hit.join(', ')));
      else {
        try { new Function('input', 'inputs', 'console', 'config', 'text', m.run); }
        catch (err) { if (err instanceof SyntaxError) bad('run', fmt('Does not parse: {0}', err.message)); }
      }
    }
  }
  let size = 0;
  try { size = JSON.stringify(m).length; } catch { size = L.size + 1; }
  if (size > L.size) bad('manifest', fmt('Too big: at most {0} characters in all', L.size));
  return errs;
}

export const PACKAGE_ICON = 'M12 3.5l7.4 4.2v8.6L12 20.5l-7.4-4.2V7.7zM12 12l7.2-4.1M12 12v8.3M12 12L4.8 7.9';

/** Makes a checked manifest usable as a node type `pkg:<id>`. Call only after validateManifest. */
export function registerManifest(p: Manifest): string {
  const t = 'pkg:' + p.id, rows = p.field ? p.field.rows || 1 : 0;
  const def: NodeDef = {
    t, cat: p.category === 'render' ? 'render' : 'fn', label: p.name, short: p.id.slice(0, 4), w: 300,
    h: p.field ? 232 + (rows - 1) * 20 : 200, out: p.output as Wire,
    field: p.field ? p.field.label : undefined, fh: p.field ? 24 + (rows - 1) * 20 : undefined, icon: PACKAGE_ICON, pkg: p,
  };
  NODE_BY[t] = def;
  ACCEPTS[t] = [...(p.accepts as Wire[]), 'context', 'approval'];
  if (p.options && p.options.length) NODE_OPTIONS[t] = p.options.map((o) => ({ key: o.key, label: o.label, opts: o.choices }));
  else delete NODE_OPTIONS[t];
  NODE_HINT[t] = p.summary;
  return t;
}

export const manifestOf = (t: string): Manifest | undefined => NODE_BY[t]?.pkg;

/** What a market node passes on, with a view drawn the way its manifest asks. */
export function packageResult(pk: Manifest, v: unknown, logs: string[] = [], sim = false): NodeResult {
  const out: NodeResult = { type: pk.output, value: v, text: showVal(v), logs, sim };
  let made: ReturnType<typeof makeView> | null = null;
  if (v !== null && v !== undefined) {
    try {
      if (pk.preview === 'table') made = makeView('sheet', [{ from: pk.id, type: 'data', value: v }]);
      else if (pk.preview === 'document') made = makeView('doc', [{ from: pk.id, type: 'text', value: typeof v === 'string' ? v : showVal(v) }]);
    } catch { made = null; }
  }
  out.view = made ? made.view : { kind: 'text', title: pk.name, source: out.text || logs.join('\n') };
  if (!out.view.title) out.view.title = pk.name;
  return out;
}

for (const m of SAMPLE_MANIFESTS) registerManifest(m);

// ---- for coding agents: the MCP server and the skill file say the same as the check

export const MCP_TOOLS: [string, string][] = [
  ['get_node_spec', 'Returns the manifest format: every key, its limits and the wire types.'],
  ['get_ui_rules', 'Returns the rules that keep nodes looking the same: what the board draws, and what a node may not bring.'],
  ['list_stickers', 'Returns the sticker names a node can choose from.'],
  ['validate_node', 'Checks a manifest and returns every problem with the key it is on.'],
  ['preview_node', 'Runs the node on sample input and returns what the board would show.'],
  ['publish_node', 'Uploads a manifest that passes validate_node to the market, under your account.'],
];

export const UI_RULES = [
  'A node is a manifest and one function. It has no markup, styles, colors, fonts, icons or sizes of its own.',
  'The board draws the card, the field, the settings and the result, the same way for every node.',
  'A node asks for at most one text field and three settings, each with two to five choices.',
  'The result is shown as text, a table or a document. The node only returns the data.',
  "The sticker comes from the board's own set.",
  'Labels are plain sentence-case text. No markup.',
  'The function only works with what flows in. It cannot reach the page, the network or storage.',
];

export function mcpConfig(baseUrl = 'https://[YOUR DOMAIN]', token = '[YOUR TOKEN]'): string {
  return JSON.stringify({ mcpServers: { flowboard: { type: 'http', url: baseUrl.replace(/\/$/, '') + '/mcp', headers: { Authorization: 'Bearer ' + token } } } }, null, 2);
}

/** The skill file a coding agent loads. Built from SPEC, so it never drifts from what the check enforces. */
export function skillText(): string {
  const L = SPEC.limits, q = (list: readonly string[]) => list.map((x) => '`' + x + '`').join(', ');
  return [
    '---',
    'name: flowboard-node',
    'description: Build, check and publish a node for the Flowboard node market. Use when asked to make or change a Flowboard node.',
    '---',
    '',
    '# Building a Flowboard node',
    '',
    'A node is one JSON manifest. It says what the node takes, what it gives back, its settings, and one function.',
    'The board draws everything. Never add markup, CSS, colors, fonts, icons or sizes: the check rejects them.',
    '',
    '## Steps',
    '',
    '1. Call `get_node_spec` and `get_ui_rules` on the `flowboard` MCP server. They are the source of truth.',
    '2. Write the manifest.',
    '3. Call `validate_node`. Fix every problem it returns, then call it again until the list is empty.',
    '4. Call `preview_node` with sample input and check what the board would show.',
    '5. Ask the person before calling `publish_node`.',
    '',
    '## Manifest',
    '',
    '- `spec`: always `' + SPEC.spec + '`.',
    '- `id`: 3 to 32 lower-case letters, digits and single dashes.',
    '- `name` (at most ' + L.name + ' characters), `author`, `version` (like `1.0.0`), `summary` (10 to ' + L.summary + ' characters, says what it does in plain words).',
    '- `category`: ' + q(SPEC.categories) + '.',
    '- `sticker` (optional): ' + q(SPEC.stickers) + '.',
    '- `accepts`: 1 to ' + L.accepts + ' of ' + q(SPEC.wire) + '.',
    '- `output`: one of the same wire types.',
    '- `field` (optional): `{ "label": "...", "rows": 1 }`. One text field the person fills in.',
    '- `options` (optional): at most ' + L.options + ' settings, each `{ "key", "label", "choices": [[value, label], ...] }` with 2 to ' + L.choices + ' choices. The first choice is the default.',
    '- `preview`: ' + q(SPEC.previews) + '. How the board shows the result.',
    '- `runs`: `browser` (include `run`) or `backend` (leave `run` out; the code is uploaded separately).',
    '- `run`: the body of `function (input, inputs, console, config, text)`, at most ' + L.run + ' characters.',
    '',
    '## The function',
    '',
    '- `input` is the value from the first connection. `inputs` maps each connected node id to its value.',
    '- `config` holds the chosen value of each setting, by key. `text` is what the person typed in the field.',
    '- Return plain data: text, a number, a list or an object. For `table`, return a list of objects. For `document`, return Markdown.',
    '- To stop with a message the person can act on, `throw new Error("Connect a Palette with at least two colors")`.',
    '- `console.log` lines are shown in the inspector.',
    '- It runs in an isolated worker with a 3 second limit. These are not available and the check rejects them: ' + SPEC.noCode.join(', ') + '.',
    '',
    '## Rules that keep every node looking the same',
    '',
    ...UI_RULES.map((r) => '- ' + r),
    '',
    '## Example',
    '',
    '```json',
    JSON.stringify(MANIFEST_TEMPLATE, null, 2),
    '```',
    '',
  ].join('\n');
}
