// Agent harnesses. Each agent SDK is its own node type. All of them go through
// the same steps: the harness emits its NATIVE tool event, mapToolEvent() turns
// that event into a board event (which tool node, which verb, what text), and
// the ring of tool nodes around an agent step is drawn from board events only.
// Adding a harness means one entry in HARNESSES, one branch in mapToolEvent(),
// and one adapter on the server.

import type { BoardItem, NodeItem } from './types';
import { fmt } from './i18n';

export type HarnessId = 'pi' | 'claude' | 'codex' | 'acp';
export type ToolRes = 'folder' | 'agent' | 'terminal' | 'connector' | 'phone' | 'browser' | 'tool' | 'board';
export type Perm = 'allow' | 'ask' | 'blocked';

export interface HarnessInfo {
  id: HarnessId;
  name: string;
  /** The native events the adapter listens to. */
  stream: string;
  /** How "ask first" reaches us from this harness. */
  gate: string;
  /** Native tool names, and the tool node each lands on. */
  map: [string, ToolRes][];
  /** The toolbar chat runs on this harness. */
  chat?: boolean;
}

/** Keyed by node type. */
export const HARNESSES: Record<string, HarnessInfo> = {
  llm: {
    id: 'pi', name: 'Built in, based on Pi', chat: true, stream: 'tool_execution_start, tool_execution_end',
    gate: 'Our extension answers the tool_call hook, which can stop a call before it runs.',
    map: [['read', 'folder'], ['write, edit', 'folder'], ['grep, find, ls', 'folder'], ['bash', 'terminal'], ['subagent', 'agent'], ['browser', 'browser'], ['device', 'phone'], ['mcp', 'connector'], ['node_*', 'tool'], ['board_*', 'board']],
  },
  claude: {
    id: 'claude', name: 'Claude Agent SDK', stream: 'tool_use',
    gate: 'Allow, ask and deny rules. "Ask first" arrives through the canUseTool callback.',
    map: [['Read, Glob, Grep', 'folder'], ['Write, Edit, NotebookEdit', 'folder'], ['Bash', 'terminal'], ['Agent', 'agent'], ['WebFetch, WebSearch', 'browser'], ['mcp__playwright__*', 'browser'], ['mcp__mobile__*', 'phone'], ['mcp__*', 'connector']],
  },
  codex: {
    id: 'codex', name: 'Codex SDK', stream: 'item.started, item.completed',
    gate: 'Approval requests from the Codex app-server.',
    map: [['command_execution', 'terminal'], ['file_change', 'folder'], ['web_search', 'browser'], ['mcp_tool_call playwright', 'browser'], ['mcp_tool_call mobile', 'phone'], ['mcp_tool_call', 'connector']],
  },
  acp: {
    id: 'acp', name: 'Agent Client Protocol', stream: 'session/update: tool_call, tool_call_update',
    gate: 'session/request_permission, answered with allow_once, allow_always or reject_once.',
    map: [['kind: read, search', 'folder'], ['kind: edit, delete, move', 'folder'], ['kind: execute', 'terminal'], ['kind: fetch', 'browser'], ['kind: other', 'tool']],
  },
};

export const harnessOf = (ntype: string): HarnessInfo => HARNESSES[ntype] || HARNESSES.llm;
export const isHarness = (it: BoardItem | null | undefined): it is NodeItem => !!it && it.kind === 'node' && !!HARNESSES[it.ntype];

/** The tool nodes drawn around an agent step. `col`/`row` place them in the ring. */
export const TOOL_RES: Record<ToolRes, { kind: string; target: string; col: number; row: number }> = {
  folder: { kind: 'Folder', target: '/project', col: 0, row: 0 },
  agent: { kind: 'Sub-agent', target: 'helper', col: 1, row: 0 },
  terminal: { kind: 'Terminal', target: 'zsh', col: 2, row: 0 },
  connector: { kind: 'Connector', target: 'team tracker', col: 0, row: 1 },
  phone: { kind: 'Phone', target: 'test device', col: 1, row: 1 },
  browser: { kind: 'Browser', target: 'localhost:3000', col: 2, row: 1 },
  tool: { kind: 'Other tool', target: '', col: 2, row: 0 },
  board: { kind: 'Whiteboard (chat)', target: 'this board', col: 0, row: 0 },
};
export const TOOL_ORDER: ToolRes[] = ['folder', 'agent', 'terminal', 'connector', 'phone', 'browser', 'tool'];

export const DEFAULT_PERMS: Record<ToolRes, Perm> = { folder: 'allow', agent: 'allow', terminal: 'allow', connector: 'ask', phone: 'ask', browser: 'allow', tool: 'ask', board: 'allow' };
export const PERM_NEXT: Record<Perm, Perm> = { allow: 'ask', ask: 'blocked', blocked: 'allow' };
export const PERM_NAME: Record<Perm, string> = { allow: 'Allowed', ask: 'Ask first', blocked: 'Blocked' };
export const PERM_COLOR: Record<Perm, string> = { allow: '#2E8B57', ask: '#B45309', blocked: '#B42318' };
export const OP_WORD: Record<string, string> = { read: 'read', search: 'search', write: 'write', run: 'run', open: 'open', act: 'action', spawn: 'start', call: 'call' };

/** One tool call as the board sees it. */
export interface ToolEvent {
  res: ToolRes;
  op: string;
  /** Text template with {0} for `arg`; empty means `arg` is shown as is. */
  tpl: string;
  arg: string;
  /** The native tool name, shown under the line in the details. */
  tool: string;
  /** What the call worked on: a host, a server, a sub-agent name. */
  target: string;
  /** Id of the parent call when a sub-agent made this call. */
  parent?: string;
  sub?: 'tests' | 'notes' | 'term';
  raw?: unknown;
}

type Raw = Record<string, any>;

/**
 * The automatic mapping: one native event in, one board event out, or null when
 * the event is not a tool call worth a node (thinking, a todo list, a message).
 */
export function mapToolEvent(hid: HarnessId, raw: Raw): ToolEvent | null {
  const N = (res: ToolRes, op: string, tpl: string, arg: unknown, tool: string, target?: string): ToolEvent =>
    ({ res, op, tpl, arg: arg === undefined || arg === null ? '' : String(arg), tool, target: target || '' });
  const host = (u: unknown) => String(u || '').replace(/^https?:\/\//, '').split('/')[0];
  const mcp = (server: string, tool: string, label: string, note?: string): ToolEvent => {
    if (/playwright|puppeteer|chrome|browser/i.test(server)) return N('browser', 'act', '', note || tool, label, server);
    if (/mobile|ios|android|appium|device/i.test(server)) return N('phone', 'act', '', note || tool, label, server);
    return N('connector', 'call', 'Call {0}', server + '.' + tool, label, server);
  };
  let ev: ToolEvent;
  if (hid === 'claude') {
    const name: string = raw.name, a = raw.input || {};
    if (name === 'TodoWrite' || name === 'AskUserQuestion') return null;
    if (name === 'Read') ev = N('folder', 'read', 'Read {0}', a.file_path, name);
    else if (name === 'Glob' || name === 'Grep') ev = N('folder', 'search', 'Search for {0}', a.pattern, name);
    else if (name === 'Edit' || name === 'NotebookEdit') ev = N('folder', 'write', 'Edit {0}', a.file_path, name);
    else if (name === 'Write') ev = N('folder', 'write', 'Write {0}', a.file_path, name);
    else if (name === 'Bash') ev = N('terminal', 'run', 'Run {0}', a.command, name);
    else if (name === 'WebFetch') ev = N('browser', 'open', 'Open {0}', a.url, name, host(a.url));
    else if (name === 'WebSearch') ev = N('browser', 'search', 'Search the web for {0}', a.query, name);
    else if (name === 'Agent' || name === 'Task') ev = N('agent', 'spawn', 'Start sub-agent {0}', `${a.subagent_type}: ${a.description}`, name, a.subagent_type);
    else if (/^mcp__/.test(name)) { const parts = name.split('__'); ev = mcp(parts[1], parts.slice(2).join('__'), name, a.note); }
    else ev = N('tool', 'call', 'Call {0}', name, name, name);
    if (raw.parent_tool_use_id) ev.parent = raw.parent_tool_use_id;
  } else if (hid === 'codex') {
    const item = raw.item || {}, name: string = item.type;
    if (name === 'agent_message' || name === 'reasoning' || name === 'todo_list' || name === 'plan_update' || name === 'error') return null;
    if (name === 'command_execution') ev = N('terminal', 'run', 'Run {0}', item.command, name);
    else if (name === 'file_change') ev = N('folder', 'write', 'Edit {0}', (item.changes || []).map((c: { path: string }) => c.path).join(', '), name);
    else if (name === 'web_search') ev = N('browser', 'search', 'Search the web for {0}', item.query, name);
    else if (name === 'mcp_tool_call') ev = mcp(item.server, item.tool, `${name} ${item.server}.${item.tool}`, (item.arguments || {}).note);
    else ev = N('tool', 'call', 'Call {0}', name, name, name);
  } else if (hid === 'acp') {
    const k: string = raw.kind || 'other', name = 'kind: ' + k;
    if (k === 'think' || k === 'switch_mode') return null;
    if (k === 'read') ev = N('folder', 'read', '', raw.title, name);
    else if (k === 'search') ev = N('folder', 'search', '', raw.title, name);
    else if (k === 'edit' || k === 'delete' || k === 'move') ev = N('folder', 'write', '', raw.title, name);
    else if (k === 'execute') ev = N('terminal', 'run', 'Run {0}', raw.title, name);
    else if (k === 'fetch') ev = N('browser', 'open', 'Open {0}', raw.title, name, host(raw.title));
    else ev = N('tool', 'call', '', raw.title, name + (raw.name ? ` (${raw.name})` : ''), raw.name || raw.title);
  } else {
    const name: string = raw.toolName, a = raw.args || {};
    if (name === 'read') ev = N('folder', 'read', 'Read {0}', a.path, name);
    else if (name === 'grep' || name === 'find' || name === 'ls') ev = N('folder', 'search', 'Search for {0}', a.pattern || a.path, name);
    else if (name === 'edit') ev = N('folder', 'write', 'Edit {0}', a.path, name);
    else if (name === 'write') ev = N('folder', 'write', 'Write {0}', a.path, name);
    else if (name === 'bash') ev = N('terminal', 'run', 'Run {0}', a.command, name);
    else if (name === 'browser') ev = a.url ? N('browser', 'open', 'Open {0}', a.url, name, host(a.url)) : N('browser', 'act', '', a.action, name);
    else if (name === 'device') ev = N('phone', 'act', '', a.action, name);
    else if (name === 'subagent') ev = N('agent', 'spawn', 'Start sub-agent {0}', `${a.name}: ${a.task}`, name, a.name);
    else if (name === 'mcp') ev = mcp(a.server, a.tool, `mcp ${a.server}.${a.tool}`);
    else if (/^board_/.test(name)) {
      ev = N('board', name === 'board_read' ? 'read' : 'write',
        name === 'board_read' ? 'Read the board' : name === 'board_connect' ? 'Connect #{0}' : 'Draw: {0}',
        name === 'board_connect' ? `${a.from} → #${a.to}` : a.text || a.type || '', name, 'board');
    } else ev = N('tool', 'call', 'Call {0}', name, name, name);
    if (raw.parentToolCallId) ev.parent = raw.parentToolCallId;
  }
  return ev;
}

// ---- simulated runs: used when a harness is not configured

interface Step { d: string; a: string; b?: string | null; sub: boolean }

/** What the harness would send for one step, in its own format. */
export function nativeEvent(hid: HarnessId, st: Step, id: string, parent: string | null): Raw | null {
  const d = st.d;
  if (hid === 'claude') {
    const tu = (name: string, input: Raw) => { const r: Raw = { type: 'tool_use', id, name, input }; if (parent) r.parent_tool_use_id = parent; return r; };
    if (d === 'read') return tu('Read', { file_path: st.a });
    if (d === 'search') return tu('Grep', { pattern: st.a, path: 'src' });
    if (d === 'write') return tu('Edit', { file_path: st.a });
    if (d === 'create') return tu('Write', { file_path: st.a });
    if (d === 'run') return tu('Bash', { command: st.a });
    if (d === 'web') return tu('WebFetch', { url: st.a });
    if (d === 'webact') return tu('mcp__playwright__browser_snapshot', { note: st.a });
    if (d === 'phone') return tu('mcp__mobile__open_url', { note: st.a });
    if (d === 'spawn') return tu('Agent', { subagent_type: st.a, description: st.b });
    if (d === 'mcp') return tu(`mcp__${st.a}__${st.b}`, {});
    return tu(st.a, {});
  }
  if (hid === 'codex') {
    const item = (o: Raw) => ({ type: 'item.started', item: { id, ...o } });
    if (d === 'spawn') return null;
    if (d === 'read') return item({ type: 'command_execution', command: 'cat ' + st.a });
    if (d === 'search') return item({ type: 'command_execution', command: `rg -n ${st.a} src` });
    if (d === 'write' || d === 'create') return item({ type: 'file_change', changes: [{ path: st.a, kind: d === 'create' ? 'add' : 'update' }] });
    if (d === 'run') return item({ type: 'command_execution', command: st.a });
    if (d === 'web') return item({ type: 'command_execution', command: 'curl -s ' + st.a });
    if (d === 'webact') return item({ type: 'mcp_tool_call', server: 'playwright', tool: 'browser_snapshot', arguments: { note: st.a } });
    if (d === 'phone') return item({ type: 'mcp_tool_call', server: 'mobile', tool: 'open_url', arguments: { note: st.a } });
    if (d === 'mcp') return item({ type: 'mcp_tool_call', server: st.a, tool: st.b, arguments: {} });
    return item({ type: st.a });
  }
  if (hid === 'acp') {
    const tc = (kind: string, title: string, more?: Raw) => ({ sessionUpdate: 'tool_call', toolCallId: id, title, kind, status: 'pending', ...(more || {}) });
    if (d === 'spawn') return null;
    if (d === 'read') return tc('read', 'Read ' + st.a, { locations: [{ path: st.a }] });
    if (d === 'search') return tc('search', 'Search for ' + st.a);
    if (d === 'write' || d === 'create') return tc('edit', 'Edit ' + st.a, { locations: [{ path: st.a }] });
    if (d === 'run') return tc('execute', st.a);
    if (d === 'web') return tc('fetch', st.a);
    if (d === 'webact') return tc('other', st.a, { name: 'browser_snapshot' });
    if (d === 'phone') return tc('other', st.a, { name: 'device_open' });
    if (d === 'mcp') return tc('other', `${st.a}.${st.b}`, { name: `${st.a}.${st.b}` });
    return tc('other', st.a, { name: st.a });
  }
  const te = (name: string, args: Raw) => { const r: Raw = { type: 'tool_execution_start', toolCallId: id, toolName: name, args }; if (parent) r.parentToolCallId = parent; return r; };
  if (d === 'read') return te('read', { path: st.a });
  if (d === 'search') return te('grep', { pattern: st.a, path: 'src' });
  if (d === 'write') return te('edit', { path: st.a });
  if (d === 'create') return te('write', { path: st.a });
  if (d === 'run') return te('bash', { command: st.a });
  if (d === 'web') return te('browser', { url: st.a });
  if (d === 'webact') return te('browser', { action: st.a });
  if (d === 'phone') return te('device', { action: st.a });
  if (d === 'spawn') return te('subagent', { name: st.a, task: st.b });
  if (d === 'mcp') return te('mcp', { server: st.a, tool: st.b });
  return te(st.a, {});
}

export const toolEventText = (ev: ToolEvent) => (ev.tpl ? fmt(ev.tpl, ev.arg) : ev.arg);

/** A call made by a sub-agent is drawn on the sub-agent node, not on its own tool node. */
export function foldSubAgent(e: ToolEvent): ToolEvent {
  if (!e.parent) return e;
  e.sub = e.res === 'terminal' ? 'term' : /^tests/.test(e.arg) ? 'tests' : 'notes';
  e.arg = toolEventText(e); e.tpl = 'Sub-agent: {0}'; e.res = 'agent'; e.target = '';
  return e;
}

export interface SimContext {
  /** The agent step's own text and the text of everything upstream, lower-cased. */
  context: string;
  /** Types of the nodes this step feeds. */
  feeds: string[];
  hasInputs: boolean;
  optName?: string;
  /** An installed market node our agent may call as a tool. */
  pkgTool?: string | null;
}

/**
 * A believable list of tool calls for a step, in the harness's native format,
 * already mapped. Used when the harness is not configured, so the board can
 * still show what a run looks like.
 */
export function simulatedScript(hid: HarnessId, sc: SimContext): { events: ToolEvent[]; subAgent: string } {
  const ctx = sc.context.toLowerCase(), opt = sc.optName || '';
  const code = sc.feeds.some((t) => t === 'terminal' || t === 'code') || /code|test|script|api|bug|fix/.test(ctx);
  const page = sc.feeds.includes('html') || /screen|page|html|landing|site/.test(ctx);
  const phone = /phone|mobile/.test(ctx);
  const steps: Step[] = [];
  const S = (d: string, a: string, b?: string | null, sub?: boolean) => steps.push({ d, a, b, sub: !!sub });
  S('read', sc.hasInputs ? 'board/inputs.json' : 'README.md');
  if (code) S('search', 'TODO'); else S('read', 'docs/style-guide.md');
  if (opt !== 'B') {
    S('spawn', code ? 'test-writer' : 'reviewer', code ? 'write tests for the change' : 'review the draft');
    S('create', code ? 'tests/new.test.ts' : 'notes/review.md', null, true);
    if (opt === 'C' || (!opt && code)) S('run', code ? 'npm test -- new' : 'npx prettier --check notes', null, true);
  }
  S('write', code ? 'src/index.ts' : 'draft/index.html');
  if (code || page) S('run', code ? 'npm test' : 'npm run build');
  if (page) { S('web', 'http://localhost:3000'); S('webact', 'Check the result at 1440 and 390 wide'); }
  if (phone) S('phone', 'Open it on the test phone');
  if (opt === 'B') S('write', 'draft/styles.css');
  if (opt === '' || opt === 'A') S('mcp', 'tracker', 'create_comment');
  if (sc.pkgTool && hid === 'pi') S('custom', 'node_' + sc.pkgTool);
  const events: ToolEvent[] = [];
  let n = 0, parentId: string | null = null;
  for (const st of steps) {
    const id = 'call_' + ++n, raw = nativeEvent(hid, st, id, st.sub ? parentId : null);
    if (st.d === 'spawn') parentId = raw ? id : null;
    if (!raw) continue;
    const e = mapToolEvent(hid, raw);
    if (!e) continue;
    foldSubAgent(e);
    e.raw = raw;
    events.push(e);
  }
  return { events, subAgent: code ? 'test-writer' : 'reviewer' };
}
