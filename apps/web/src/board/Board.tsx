// The whiteboard. One component, like the draft: its state, the pointer and
// key handlers, the run engine, and renderVals(), which fills the view object
// the generated markup reads. Names follow the draft so the two can be read
// side by side.

import { Component, createRef } from 'react';
import type { AgentEvent, BoardItem, NodeInput, NodeItem, NodeResult, Perm, ToolRes } from '@paradigm/shared';
import {
  DEFAULT_PINS, DEFAULT_SHELF, GRID, HARNESSES, NODE_BY, NODE_DEFS, PIN_MAX, SCRIPT_WORKER, SHAPES, STICKY_COLORS, STARTERS,
  arrowPts, bounds, canTake, executeNode, flowGraph, fromFile, idPrefix, index, infoOut, isHarness, itemText, mkEdge, nearestSide,
  nodeRequest, outType, ptsBox, sidePoint, showVal, starterItems, toFile, upText, ID_PREFIX, blocksToHtml, slugOf,
} from '@paradigm/shared';
import { BoardView } from '../views/BoardView';
import { agent, backend, boards, files, prefs, workspaces, fileUrl, ApiError, type Me } from '../lib/api';
import { fmt, tr } from '../lib/i18n';
import { renderVals } from './vals';

export interface BoardProps {
  boardId: string;
  me: Me;
  lang: 'en' | 'zh';
  flipLang(): void;
  setLang(l: 'en' | 'zh'): void;
  goHome(): void;
  signOut(): void;
  replaceUrl(id: string): void;
  accent?: string;
}

const HIST_MAX = 100;
const PREFIX: Record<string, string> = ID_PREFIX;
type Drag = { mode: string; [k: string]: any } | null;

export const setStatus = (items: BoardItem[], map: Record<string, string>) => items.map((it) => (map[it.id] && it.kind === 'node' ? { ...it, status: map[it.id] as NodeItem['status'] } : it));
const editable = (it: BoardItem) => it.kind === 'sticky' || it.kind === 'text' || it.kind === 'shape' || it.kind === 'frame' || (it.kind === 'node' && !!(NODE_BY[it.ntype] || NODE_DEFS[0]).field);
const CONNECTABLE: Record<string, 1> = { sticky: 1, shape: 1, frame: 1, text: 1, sticker: 1, node: 1 };

/** Runs JavaScript in a worker, with the draft's three second limit. */
function runJs(src: string, input: unknown, inputs: Record<string, unknown>): Promise<{ value?: unknown; logs?: string[]; blocked?: boolean }> {
  return new Promise((resolve, reject) => {
    let w: Worker;
    try { w = new Worker(URL.createObjectURL(new Blob([SCRIPT_WORKER], { type: 'text/javascript' }))); } catch { resolve({ blocked: true }); return; }
    const timer = setTimeout(() => { w.terminate(); reject(new Error('The script ran longer than 3 s')); }, 3000);
    w.onmessage = (e) => { clearTimeout(timer); w.terminate(); if (e.data.error) reject(new Error(e.data.error)); else resolve({ value: e.data.value, logs: e.data.logs }); };
    w.onerror = (e) => { clearTimeout(timer); w.terminate(); reject(new Error(e.message || 'The script failed')); };
    w.postMessage({ src, input, inputs });
  });
}

export class Board extends Component<BoardProps, any> {
  boardRef = (el: HTMLDivElement | null) => { if (el) this.boardEl = el; };
  inputRef = createRef<HTMLInputElement>();
  boardEl: HTMLDivElement | null = null;
  drag: Drag = null;
  dragBase: BoardItem[] | null = null;
  hist: BoardItem[][] = [];
  fut: BoardItem[][] = [];
  histAt = 0;
  seq = 0;
  runGen = 0;
  runQ: string[] | null = null;
  runCount = 0;
  runTimer: any = null;
  toastTimer: any = null;
  saveTimer: any = null;
  execTok: Record<string, number> = {};
  execSeq = 0;
  runs: Record<string, { ctrl: AbortController; runId?: string }> = {};
  version = 0;
  wsId = '';
  chatCtrl: AbortController | null = null;
  _selSet: Record<string, 1> = {};
  _space = false;

  constructor(p: BoardProps) {
    super(p);
    this.state = {
      loaded: false, loadError: '', title: '', role: 'editor', items: [] as BoardItem[], selected: null as string | null, multi: [] as string[], editing: null as string | null,
      tool: 'select', nodeType: 'llm', panel: null as string | null, zoom: 1, pan: { x: 160, y: 96 }, panning: false, bg: 'grid', snap: true,
      out: {} as Record<string, NodeResult & { error?: string }>, running: false, runDone: 0, runTotal: 0, viewer: null as any, slideAt: {} as Record<string, number>, toast: null as string | null,
      chat: false, prompt: '', welcome: false, pins: DEFAULT_PINS, shelf: DEFAULT_SHELF, installed: [] as string[], canUndo: false, canRedo: false, saveState: 'saved',
      zoomMenu: false, bgMenu: false, acctMenu: null as string | null, marquee: null as any, area: null as any, menu: null, hz: {} as Record<string, any>, kept: {} as Record<string, string>,
      drawMode: 'arrow', ink: '#111111', lineOnly: false, shapeKind: 'rect', stickerId: 'heart', stickerQuery: '', library: [] as any[], chatMode: 'auto', chatRun: null as any, proposal: null as any,
      perms: {} as Partial<Record<ToolRes, Perm>>, workspaces: [] as any[], wsName: '',
    };
  }

  // ---- lifecycle

  componentDidMount() {
    window.addEventListener('keydown', this.onWinKey);
    window.addEventListener('keyup', this.onWinKeyUp);
    void this.load();
    prefs.get().then(({ prefs: p }) => this.setState({ pins: p.pins, shelf: p.shelf, installed: p.installed })).catch(() => null);
  }

  componentWillUnmount() {
    window.removeEventListener('keydown', this.onWinKey);
    window.removeEventListener('keyup', this.onWinKeyUp);
    this.clearRun();
    clearTimeout(this.toastTimer);
    if (this.saveTimer) { clearTimeout(this.saveTimer); void this.saveNow(); }
  }

  componentDidUpdate(prev: BoardProps) {
    if (prev.boardId !== this.props.boardId && this.props.boardId !== 'new' && this.props.boardId !== this.state.id) void this.load();
  }

  async load() {
    try {
      const ws = (await workspaces.list()).workspaces;
      this.setState({ workspaces: ws });
      if (this.props.boardId === 'new') {
        const target = ws.find((w) => !w.personal && w.role !== 'viewer') || ws.find((w) => w.role !== 'viewer') || ws[0];
        const { board } = await boards.create(target.id, {});
        this.props.replaceUrl(board.id);
        this.applyBoard(board, true);
        return;
      }
      const { board } = await boards.get(this.props.boardId);
      this.applyBoard(board, false);
    } catch (e) {
      this.setState({ loaded: true, loadError: (e as Error).message });
    }
  }

  applyBoard(board: any, fresh: boolean) {
    let items: BoardItem[] = [];
    try { items = fromFile(board.file); } catch (e) { this.flash((e as Error).message); }
    const ws = this.state.workspaces.find((w: any) => w.id === board.workspaceId);
    this.version = board.version;
    this.wsId = board.workspaceId;
    this.setState({ id: board.id, loaded: true, title: board.title, role: board.role, items, perms: board.settings?.perms || {}, bg: board.settings?.bg === 'dots' ? 'dots' : 'grid', welcome: fresh && !items.length, wsName: ws ? (ws.personal ? tr('Personal') : ws.name) : '' }, () => { if (items.length) this.zoomFit(); });
  }

  // ---- saving

  queueSave() {
    if (this.state.role === 'viewer') return;
    this.setState({ saveState: 'saving' });
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => { this.saveTimer = null; void this.saveNow(); }, 700);
  }

  async saveNow() {
    if (!this.state.id) return;
    const items = this.state.items.filter((o: BoardItem) => !(o as any).proposed);
    try {
      const r = await boards.save(this.state.id, { file: toFile(items), version: this.version, settings: { perms: this.state.perms, bg: this.state.bg } });
      this.version = r.version;
      this.setState({ saveState: 'saved' });
    } catch (e) {
      this.setState({ saveState: 'off' });
      if (e instanceof ApiError && e.status === 409) this.flash('Someone else changed this board. Reload to see their version.');
      else this.flash((e as Error).message);
    }
  }

  // ---- history

  pushHist(base: BoardItem[]) {
    this.hist.push(base);
    if (this.hist.length > HIST_MAX) this.hist.shift();
    this.fut = [];
    this.setState({ canUndo: true, canRedo: false });
  }

  setItems(items: BoardItem[], extra: Record<string, unknown> = {}, record = true) {
    if (record) this.pushHist(this.state.items);
    this.setState({ items, ...extra });
    this.queueSave();
  }

  undo() {
    const prev = this.hist.pop();
    if (!prev) return;
    this.fut.push(this.state.items);
    this.setState({ items: prev, selected: null, multi: [], editing: null, canUndo: this.hist.length > 0, canRedo: true });
    this.queueSave();
  }

  redo() {
    const next = this.fut.pop();
    if (!next) return;
    this.hist.push(this.state.items);
    this.setState({ items: next, selected: null, multi: [], editing: null, canUndo: true, canRedo: this.fut.length > 0 });
    this.queueSave();
  }

  // ---- small helpers

  rect() { return this.boardEl ? this.boardEl.getBoundingClientRect() : ({ left: 0, top: 0, width: window.innerWidth, height: window.innerHeight } as DOMRect); }
  toWorld(e: { clientX: number; clientY: number }) { const r = this.rect(), s = this.state; return { x: (e.clientX - r.left - s.pan.x) / s.zoom, y: (e.clientY - r.top - s.pan.y) / s.zoom }; }
  capture(e: any) { try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch { /* not capturable */ } }
  focusBoard() { this.boardEl?.focus({ preventScroll: true }); }
  newId(prefix: string) {
    const used = new Set(this.state.items.map((o: BoardItem) => o.id));
    let n = 1;
    while (used.has(prefix + n)) n++;
    return prefix + n;
  }
  find(id: string): BoardItem | undefined { return this.state.items.find((o: BoardItem) => o.id === id); }
  update(id: string, patch: Record<string, unknown>, record = false) {
    this.setItems(this.state.items.map((o: BoardItem) => (o.id === id ? ({ ...o, ...patch } as BoardItem) : o)), {}, record);
  }
  selIds(): string[] { const s = this.state; return s.multi.length ? s.multi : s.selected ? [s.selected] : []; }
  removeFrom(items: BoardItem[], ids: string[]) {
    const gone = new Set(ids);
    return items.filter((o) => !gone.has(o.id) && !(o.kind === 'arrow' && ((o.from && gone.has(o.from.id)) || (o.to && gone.has(o.to.id)))));
  }
  cleanItems(keep: string | null): BoardItem[] {
    return this.state.items.filter((o: BoardItem) => !(o.id !== keep && o.kind === 'text' && !o.text && this.state.editing !== o.id));
  }
  snapV(v: number) { return this.state.snap ? Math.round(v / GRID) * GRID : v; }
  flash(msg: string) {
    clearTimeout(this.toastTimer);
    this.setState({ toast: null }, () => this.setState({ toast: tr(msg) }));
    this.toastTimer = setTimeout(() => this.setState({ toast: null }), 2600);
  }
  nodeName(t: string) { return tr((NODE_BY[t] || NODE_DEFS[0]).label); }
  stopEditing() { if (this.state.editing) this.setState({ editing: null }); }

  // ---- placing things

  placeBox(kind: string, p: { x: number; y: number }, ntype?: string) {
    const s = this.state;
    let sz: { w: number; h: number };
    if (kind === 'node') { const nd = NODE_BY[ntype || s.nodeType] || NODE_DEFS[0]; sz = { w: nd.w, h: nd.h }; }
    else if (kind === 'sticky') sz = { w: 200, h: 200 };
    else if (kind === 'frame') sz = { w: 640, h: 400 };
    else if (kind === 'shape') { const sh = SHAPES.find((x) => x.id === s.shapeKind) || SHAPES[0]; sz = { w: sh.w, h: sh.h }; }
    else if (kind === 'sticker') sz = { w: 88, h: 88 };
    else sz = { w: 2, h: 26 };
    const x = kind === 'text' ? p.x : p.x - sz.w / 2, y = kind === 'text' ? p.y - 12 : p.y - sz.h / 2;
    return { kind, x: this.snapV(x), y: this.snapV(y), w: sz.w, h: sz.h };
  }

  create(kind: string, p: { x: number; y: number }, items: BoardItem[], ntype?: string): BoardItem {
    const s = this.state, pb = this.placeBox(kind, p, ntype);
    if (kind === 'node') {
      const nd = NODE_BY[ntype || s.nodeType] || NODE_DEFS[0];
      return { id: this.newId(idPrefix({ kind: 'node', ntype: nd.t })), kind: 'node', ntype: nd.t, x: pb.x, y: pb.y, w: nd.w, h: nd.h, text: '', status: 'idle' };
    }
    const id = this.newId(PREFIX[kind] || 'i'), count = items.filter((o) => o.kind === kind).length;
    if (kind === 'sticky') return { id, kind, x: pb.x, y: pb.y, w: 200, h: 200, color: STICKY_COLORS[count % STICKY_COLORS.length][0], rot: [-0.6, 0.5, -0.3, 0.7][count % 4], style: 'body', text: '' } as BoardItem;
    if (kind === 'text') return { id, kind, x: pb.x, y: pb.y, style: 'body', color: '#111114', text: '' } as BoardItem;
    if (kind === 'frame') return { id, kind, x: pb.x, y: pb.y, w: 640, h: 400, label: 'Frame ' + (count + 1), fill: '#F8F8F9' } as BoardItem;
    if (kind === 'shape') { const sh = SHAPES.find((x) => x.id === s.shapeKind) || SHAPES[0]; return { id, kind: 'shape', shape: sh.id, x: pb.x, y: pb.y, w: sh.w, h: sh.h, fill: '#D0D0D0', style: 'body', align: 'center', text: '' } as BoardItem; }
    return { id, kind: 'sticker', sticker: s.stickerId || 'heart', x: pb.x, y: pb.y, w: 88, h: 88 } as BoardItem;
  }

  addAt(kind: string, p: { x: number; y: number }, ntype?: string) {
    const items = this.cleanItems(null), it = this.create(kind, p, items, ntype);
    const edit = kind === 'text' || kind === 'sticky';
    this.setItems(items.concat([it]), { selected: it.id, multi: [], editing: edit ? it.id : null, tool: 'select', panel: null, welcome: false });
  }

  pickTool(id: string) {
    const s = this.state;
    if (id === 'node') { this.setState({ panel: s.panel === 'nodes' ? null : 'nodes', tool: s.panel === 'nodes' ? 'select' : s.tool, menu: null }); return; }
    if (id === 'shape') { this.setState({ tool: 'shape', panel: s.panel === 'shape' ? null : 'shape' }); return; }
    if (id === 'sticker') { this.setState({ tool: 'sticker', panel: s.panel === 'sticker' ? null : 'sticker' }); return; }
    this.setState({ tool: s.tool === id && id !== 'select' ? 'select' : id, panel: null, editing: null });
  }

  placeNode(t: string) { this.setState({ nodeType: t, tool: 'node', panel: null, selected: null, multi: [], welcome: false }); }

  togglePin(t: string) {
    const s = this.state, on = s.pins.includes(t);
    if (!on && s.pins.length >= PIN_MAX) { this.flash(fmt('The toolbar holds {0} nodes. Unpin one first.', PIN_MAX)); return; }
    const pins = on ? s.pins.filter((x: string) => x !== t) : s.pins.concat([t]);
    this.setState({ pins });
    prefs.put({ pins }).catch((e) => this.flash(e.message));
  }

  loadTemplate(key: string) {
    const items = key === 'Welcome' ? [] : starterItems(key) || [];
    this.clearRun();
    this.setItems(items, { selected: null, multi: [], editing: null, out: {}, welcome: key === 'Welcome', running: false }, true);
    if (items.length) setTimeout(() => this.zoomFit(), 0);
  }

  // ---- pointer

  hitItem(p: { x: number; y: number }, skip?: string): BoardItem | null {
    const s = this.state, byId = index(s.items as BoardItem[]);
    // Drawn order is frames first, then the rest; the topmost thing is hit first.
    const order = [...s.items.filter((o: BoardItem) => o.kind === 'frame'), ...s.items.filter((o: BoardItem) => o.kind !== 'frame')].reverse();
    for (const o of order) {
      if (o.id === skip || o.kind === 'arrow' || o.kind === 'pen') continue;
      const b = bounds(o, byId);
      if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) return o;
    }
    return null;
  }

  boardDown(e: any) {
    if (e.button === 2) return;
    const s = this.state, p = this.toWorld(e);
    this.focusBoard();
    if (s.menu || s.acctMenu || s.zoomMenu || s.bgMenu) this.setState({ menu: null, acctMenu: null, zoomMenu: false, bgMenu: false });
    if (s.area && !s.chat) this.setState({ area: null });
    if (s.tool === 'hand' || e.button === 1 || this._space) { this.startPan(e); return; }
    if (s.editing) { this.setState({ editing: null }); }
    if (s.tool === 'node') { this.addAt('node', p); return; }
    if (['text', 'frame', 'sticky', 'shape', 'sticker'].includes(s.tool)) { this.addAt(s.tool, p); return; }
    if (s.tool === 'draw') {
      if (s.drawMode === 'pen') { this.startPen(e, p); return; }
      const hit = this.hitItem(p);
      this.startConnector(e, hit && CONNECTABLE[hit.kind] ? { id: hit.id, side: nearestSide(bounds(hit, index(s.items)), p) } : null, p, this.cleanItems(null));
      return;
    }
    // Select tool on empty board: drag a box.
    this.drag = { mode: 'marquee', x0: p.x, y0: p.y };
    this.capture(e);
    this.setState({ selected: null, multi: [], marquee: { x: p.x, y: p.y, w: 0, h: 0 }, area: null, panel: null });
  }

  startPan(e: any) {
    this.drag = { mode: 'pan', x0: e.clientX, y0: e.clientY, pan0: { ...this.state.pan } };
    this.capture(e);
    this.setState({ panning: true });
  }

  startPen(e: any, p: { x: number; y: number }) {
    const id = this.newId('ink');
    this.drag = { mode: 'pen', id };
    this.dragBase = this.state.items;
    this.capture(e);
    this.setState({ items: this.state.items.concat([{ id, kind: 'pen', x: p.x, y: p.y, pts: [[0, 0]], color: this.state.ink, weight: 5 } as BoardItem]) });
  }

  startConnector(e: any, from: { id: string; side: string } | null, p: { x: number; y: number }, items: BoardItem[]) {
    const byId = index(items);
    let start = { x: this.snapV(p.x), y: this.snapV(p.y) };
    if (from && byId[from.id]) start = sidePoint(bounds(byId[from.id], byId), from.side as any);
    const id = this.newId('e'), color = this.state.tool === 'draw' ? this.state.ink : '#111111';
    this.drag = { mode: 'connect', id, fromId: from ? from.id : null };
    this.dragBase = this.state.items;
    this.capture(e);
    this.setState({ items: items.concat([{ id, kind: 'arrow', from: from as any, to: null, x1: start.x, y1: start.y, x2: p.x, y2: p.y, color, weight: 2, dash: false, head: !(this.state.tool === 'draw' && this.state.lineOnly) } as BoardItem]), selected: id, editing: null });
  }

  dotDown(id: string, side: string, e: any) {
    e.stopPropagation();
    if (this.state.role === 'viewer') return;
    this.focusBoard();
    const items = this.cleanItems(null), byId = index(items);
    if (!byId[id]) return;
    this.startConnector(e, { id, side }, sidePoint(bounds(byId[id], byId), side as any), items);
  }

  itemDown(it: BoardItem, e: any) {
    if (e.button === 2) return;
    const s = this.state;
    if (s.tool === 'hand' || e.button === 1 || this._space) { e.stopPropagation(); this.startPan(e); return; }
    if (s.tool !== 'select') return; // the board handles placing and drawing
    e.stopPropagation();
    this.focusBoard();
    if (s.editing === it.id) return;
    if (s.menu || s.acctMenu) this.setState({ menu: null, acctMenu: null });
    const wasSel = s.selected === it.id && !s.multi.length;
    let multi = s.multi.length ? s.multi.slice() : s.selected ? [s.selected] : [];
    if (e.shiftKey) {
      multi = multi.includes(it.id) ? multi.filter((x: string) => x !== it.id) : multi.concat([it.id]);
      this.setState({ multi: multi.length > 1 ? multi : [], selected: multi.length === 1 ? multi[0] : null, editing: null });
      return;
    }
    const inSel = multi.includes(it.id) && multi.length > 1;
    const ids = inSel ? multi : [it.id];
    const p = this.toWorld(e);
    const moving = new Set(ids);
    // A frame carries what sits inside it.
    const byId = index(s.items as BoardItem[]);
    for (const id of ids) {
      const f = byId[id];
      if (f && f.kind === 'frame') for (const o of s.items as BoardItem[]) { if (o.kind === 'arrow' || o.id === f.id) continue; const b = bounds(o, byId); if (b.x >= f.x && b.y >= f.y && b.x + b.w <= f.x + f.w && b.y + b.h <= f.y + f.h) moving.add(o.id); }
    }
    this.drag = { mode: 'move', id: it.id, ids: [...moving], p0: p, start: Object.fromEntries((s.items as BoardItem[]).filter((o) => moving.has(o.id)).map((o) => [o.id, { x: (o as any).x ?? 0, y: (o as any).y ?? 0, x1: (o as any).x1, y1: (o as any).y1, x2: (o as any).x2, y2: (o as any).y2 }])), moved: false, wasSel, collapse: inSel };
    this.capture(e);
    this.setState({ selected: inSel ? s.selected : it.id, multi: inSel ? multi : [], editing: null, panel: null });
  }

  itemDbl(it: BoardItem, e: any) {
    e.stopPropagation();
    if (editable(it) && this.state.role !== 'viewer') this.setState({ editing: it.id, selected: it.id, multi: [] });
  }

  handleDown(id: string, corner: string, e: any) {
    e.stopPropagation();
    const it = this.find(id) as any;
    if (!it) return;
    this.drag = { mode: 'resize', id, corner, b0: { x: it.x, y: it.y, w: it.w, h: it.h }, p0: this.toWorld(e) };
    this.dragBase = this.state.items;
    this.capture(e);
  }

  move(e: any) {
    const d = this.drag;
    if (!d) return;
    const s = this.state;
    if (d.mode === 'pan') { this.setState({ pan: { x: d.pan0.x + e.clientX - d.x0, y: d.pan0.y + e.clientY - d.y0 } }); return; }
    const p = this.toWorld(e);
    if (d.mode === 'marquee') {
      const x = Math.min(d.x0, p.x), y = Math.min(d.y0, p.y), w = Math.abs(p.x - d.x0), h = Math.abs(p.y - d.y0);
      const byId = index(s.items as BoardItem[]);
      const inside = (s.items as BoardItem[]).filter((o) => o.kind !== 'arrow' && (() => { const b = bounds(o, byId); return b.x >= x && b.y >= y && b.x + b.w <= x + w && b.y + b.h <= y + h; })()).map((o) => o.id);
      this.setState({ marquee: { x, y, w, h }, multi: inside.length > 1 ? inside : [], selected: inside.length === 1 ? inside[0] : null });
      return;
    }
    if (d.mode === 'move') {
      let dx = p.x - d.p0.x, dy = p.y - d.p0.y;
      if (!d.moved && Math.hypot(dx, dy) * s.zoom < 3) return;
      if (!d.moved) { d.moved = true; this.dragBase = s.items; }
      if (s.snap) { const st = d.start[d.id]; if (st) { dx = this.snapV(st.x + dx) - st.x; dy = this.snapV(st.y + dy) - st.y; } }
      const ids = new Set(d.ids as string[]);
      this.setState({ items: (s.items as BoardItem[]).map((o) => {
        if (!ids.has(o.id)) return o;
        const st = d.start[o.id];
        if (o.kind === 'arrow') return { ...o, x1: st.x1 + dx, y1: st.y1 + dy, x2: st.x2 + dx, y2: st.y2 + dy };
        return { ...o, x: st.x + dx, y: st.y + dy } as BoardItem;
      }) });
      return;
    }
    if (d.mode === 'resize') {
      const b = d.b0, dx = p.x - d.p0.x, dy = p.y - d.p0.y, c = d.corner;
      const it = this.find(d.id) as any;
      const min = it?.kind === 'node' ? { w: (NODE_BY[it.ntype] || NODE_DEFS[0]).w * 0.8, h: 160 } : { w: 40, h: 40 };
      let x = b.x, y = b.y, w = b.w, h = b.h;
      if (c[1] === 'r') w = Math.max(min.w, this.snapV(b.w + dx)); else { w = Math.max(min.w, this.snapV(b.w - dx)); x = b.x + b.w - w; }
      if (c[0] === 'b') h = Math.max(min.h, this.snapV(b.h + dy)); else { h = Math.max(min.h, this.snapV(b.h - dy)); y = b.y + b.h - h; }
      this.setState({ items: (s.items as BoardItem[]).map((o) => (o.id === d.id ? ({ ...o, x, y, w, h } as BoardItem) : o)) });
      return;
    }
    if (d.mode === 'pen') {
      this.setState({ items: (s.items as BoardItem[]).map((o) => (o.id === d.id && o.kind === 'pen' ? { ...o, pts: o.pts.concat([[p.x - o.x, p.y - o.y]]) } : o)) });
      return;
    }
    if (d.mode === 'connect') {
      const hit = this.hitItem(p, d.id), byId = index(s.items as BoardItem[]), src = d.fromId ? byId[d.fromId] : null;
      let to: any = null;
      d.reject = null;
      if (hit && hit.id !== d.fromId && CONNECTABLE[hit.kind]) {
        if (hit.kind === 'node' && src && src.kind === 'node' && !canTake(hit, src)) d.reject = hit;
        else to = { id: hit.id, side: hit.kind === 'node' ? 'left' : nearestSide(bounds(hit, byId), p) };
      }
      this.setState({ items: (s.items as BoardItem[]).map((o) => (o.id === d.id ? ({ ...o, to, x2: p.x, y2: p.y } as BoardItem) : o)) });
    }
  }

  up() {
    const d = this.drag;
    this.drag = null;
    if (!d) return;
    const s = this.state;
    if (d.mode === 'pan') { this.setState({ panning: false }); return; }
    if (d.mode === 'marquee') {
      // A real box (not a slip of the hand) stays on the board and asks what to build inside it.
      const box = s.marquee, bz = s.zoom;
      if (box && box.w * bz >= 48 && box.h * bz >= 48 && !s.multi.length && !s.selected) { this.setState({ marquee: null, area: box }); this.setChat(true); }
      else this.setState({ marquee: null });
      return;
    }
    if (d.mode === 'move' && !d.moved) {
      if (d.collapse) { this.setState({ multi: [], selected: d.id }); return; }
      if (d.wasSel) { const it = this.find(d.id); if (it && editable(it) && s.role !== 'viewer') this.setState({ editing: it.id }); }
      return;
    }
    if (d.mode === 'connect') {
      if (d.reject) {
        const rd = NODE_BY[d.reject.ntype] || NODE_DEFS[0], rs = d.fromId ? this.find(d.fromId) : null;
        this.flash(rd.cat === 'info' ? fmt('{0} nodes only send, they have no input', tr(rd.label)) : fmt("{0} can't take {1} as input", tr(rd.label), outType(rs) || 'context'));
      }
      const a = this.find(d.id) as any;
      if (a) {
        const box = ptsBox(arrowPts(a, index(s.items as BoardItem[])));
        if (!a.to && box.w + box.h < 12) {
          if (a.from) { this.setState({ items: this.removeFrom(s.items, [a.id]), selected: null }); this.dragBase = null; return; }
          this.setState({ items: (s.items as BoardItem[]).map((o) => (o.id === a.id ? ({ ...o, x2: a.x1 + 160, y2: a.y1 } as BoardItem) : o)) });
        }
        if (a.from && !a.to) { this.setState({ items: this.removeFrom(s.items, [a.id]), selected: null }); this.dragBase = null; return; }
      }
    }
    if (this.dragBase) { this.pushHist(this.dragBase); this.dragBase = null; this.queueSave(); }
  }

  // ---- keys

  onWinKeyUp = (e: KeyboardEvent) => { if (e.key === ' ') this._space = false; };
  onWinKey = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement, typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    const s = this.state, mod = e.metaKey || e.ctrlKey;
    if (e.key === 'Escape') {
      if (s.viewer) this.setState({ viewer: null });
      else if (s.editing) this.setState({ editing: null });
      else if (s.chat) this.setChat(false);
      else this.setState({ selected: null, multi: [], panel: null, tool: 'select', menu: null, area: null });
      return;
    }
    if (typing) return;
    if (s.viewer && s.viewer.id && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) { const n = (s.slideAt[s.viewer.id] || 0) + (e.key === 'ArrowRight' ? 1 : -1); this.slideGo(s.viewer.id, n); return; }
    if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) this.redo(); else this.undo(); return; }
    if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); this.redo(); return; }
    if (mod && e.key.toLowerCase() === 'a') { e.preventDefault(); this.setState({ multi: s.items.map((o: BoardItem) => o.id), selected: null }); return; }
    if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); this.duplicateSelected(); return; }
    if (mod) return;
    if (e.key === 'Delete' || e.key === 'Backspace') { if (this.selIds().length) { e.preventDefault(); this.removeSelected(); } return; }
    if (e.key === ' ') { this._space = true; return; }
    if (e.key === 'Enter' && s.selected) { const it = this.find(s.selected); if (it && editable(it)) { e.preventDefault(); this.setState({ editing: it.id }); } return; }
    const k = e.key.toLowerCase();
    const map: Record<string, string> = { v: 'select', '1': 'select', h: 'hand', t: 'text', '8': 'text', f: 'frame', s: 'sticky', r: 'shape', e: 'sticker' };
    if (map[k]) { this.pickTool(map[k]); return; }
    if (k === 'n') { this.pickTool('node'); return; }
    if (k === 'p') { this.setState({ tool: 'draw', drawMode: 'pen', panel: null }); return; }
    if (k === 'a') { this.setState({ tool: 'draw', drawMode: 'arrow', panel: null }); return; }
    if (k === '/') { e.preventDefault(); this.setChat(true); return; }
    if (k === '+' || k === '=') { this.zoomTo(s.zoom * 1.25); return; }
    if (k === '-') { this.zoomTo(s.zoom / 1.25); return; }
  };

  removeSelected() {
    const ids = this.selIds();
    if (!ids.length || this.state.role === 'viewer') return;
    this.setItems(this.removeFrom(this.state.items, ids), { selected: null, multi: [], editing: null });
  }

  duplicateSelected() {
    const ids = new Set(this.selIds());
    if (!ids.size) return;
    const items = this.state.items as BoardItem[], map: Record<string, string> = {}, add: BoardItem[] = [];
    let taken = new Set(items.map((o) => o.id));
    const fresh = (p: string) => { let n = 1; while (taken.has(p + n)) n++; taken.add(p + n); return p + n; };
    for (const o of items) if (ids.has(o.id) && o.kind !== 'arrow') { const id = fresh(idPrefix(o)); map[o.id] = id; add.push({ ...o, id, x: (o as any).x + 40, y: (o as any).y + 40, ...(o.kind === 'node' ? { status: 'idle' } : {}) } as BoardItem); }
    for (const o of items) if (o.kind === 'arrow' && o.from && o.to && map[o.from.id] && map[o.to.id]) add.push({ ...o, id: fresh('e'), from: { ...o.from, id: map[o.from.id] }, to: { ...o.to, id: map[o.to.id] } });
    taken = new Set();
    this.setItems(items.concat(add), { multi: add.length > 1 ? add.map((o) => o.id) : [], selected: add.length === 1 ? add[0].id : null });
  }

  // ---- zoom

  wheelZoom(e: any) {
    const s = this.state, r = this.rect();
    if (!e.ctrlKey && !e.metaKey) { this.setState({ pan: { x: s.pan.x - e.deltaX, y: s.pan.y - e.deltaY } }); return; }
    const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    let nz = Math.max(0.25, Math.min(3, s.zoom * Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0015))));
    nz = Math.round(nz * 1000) / 1000;
    if (nz === s.zoom) return;
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    this.setState({ zoom: nz, zoomMenu: false, menu: null, pan: { x: mx - (mx - s.pan.x) * (nz / s.zoom), y: my - (my - s.pan.y) * (nz / s.zoom) } });
  }

  zoomTo(nz: number) {
    nz = Math.max(0.25, Math.min(3, Math.round(nz * 100) / 100));
    const r = this.rect(), s = this.state, cx = r.width / 2, cy = r.height / 2;
    this.setState({ zoom: nz, zoomMenu: false, pan: { x: cx - (cx - s.pan.x) * (nz / s.zoom), y: cy - (cy - s.pan.y) * (nz / s.zoom) } });
  }

  zoomFit() {
    const items = this.state.items as BoardItem[], byId = index(items);
    if (!items.length) { this.setState({ zoom: 1, pan: { x: 160, y: 96 }, zoomMenu: false }); return; }
    let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
    for (const it of items) { const b = bounds(it, byId); minx = Math.min(minx, b.x); miny = Math.min(miny, b.y - (it.kind === 'frame' ? 30 : 0)); maxx = Math.max(maxx, b.x + b.w); maxy = Math.max(maxy, b.y + b.h); }
    const r = this.rect(), top = 80, avail = r.height - top - 170;
    const bw = Math.max(1, maxx - minx), bh = Math.max(1, maxy - miny);
    const nz = Math.round(Math.max(0.25, Math.min(1.5, (r.width - 160) / bw, avail / bh)) * 100) / 100;
    this.setState({ zoom: nz, zoomMenu: false, pan: { x: (r.width - bw * nz) / 2 - minx * nz, y: top + (avail - bh * nz) / 2 - miny * nz } });
  }

  // ---- running

  clearRun() {
    clearTimeout(this.runTimer);
    for (const r of Object.values(this.runs)) { r.ctrl.abort(); if (r.runId) void agent.stop(r.runId); }
    this.runs = {};
    this.runQ = null;
    this.runGen++;
  }

  runFlow() {
    if (this.state.proposal && this.state.items.some((o: any) => o.proposed)) { this.flash('Accept or reject the proposal first'); return; }
    const items = this.cleanItems(null), G = flowGraph(items), byId = index(items);
    const order = G.order.filter((id) => byId[id].kind === 'node');
    if (!order.length) { this.flash('Connect two nodes to make a flow'); return; }
    this.clearRun();
    const inRun = new Set(order);
    this.runQ = order.slice();
    this.runCount = 0;
    this.setState({ items: items.map((it) => (inRun.has(it.id) ? ({ ...it, status: 'queued' } as BoardItem) : it)), running: true, runDone: 0, runTotal: order.length, menu: null, editing: null, welcome: false, out: {}, hz: {}, kept: {} });
    this.runTimer = setTimeout(() => this.stepRun(), 250);
  }

  stepRun() {
    if (!this.runQ) return;
    if (!this.runQ.length) { this.finishRun(); return; }
    const id = this.runQ.shift()!, it = this.find(id) as NodeItem | undefined;
    if (!it) { this.runCount++; this.stepRun(); return; }
    if (it.ntype === 'gate') { this.setState({ items: setStatus(this.state.items, { [id]: 'waiting' }) }); return; }
    if (isHarness(it)) {
      let ids = [id];
      if (it.opt) {
        const q = this.runQ, mates = (this.state.items as BoardItem[]).filter((o) => o.kind === 'node' && o.opt === it.opt && (o.id === id || q.includes(o.id))).map((o) => o.id);
        this.runQ = q.filter((x) => !mates.includes(x));
        if (mates.length) ids = mates;
      }
      void this.agentRun(ids, 'queue');
      return;
    }
    this.execNode(id, 'queue');
  }

  /** What flows into a node right now: the outputs of the nodes linked to it. */
  inputsFor(id: string): NodeInput[] {
    const s = this.state, items = s.items as BoardItem[], G = flowGraph(items), byId = index(items), list: NodeInput[] = [];
    for (const uid of G.ins[id] || []) {
      const u = byId[uid];
      if (!u) continue;
      if (u.kind !== 'node') { const tx = itemText(u); if (tx) list.push({ from: uid, type: 'text', value: tx }); continue; }
      if (u.opt && s.kept[u.opt] && s.kept[u.opt] !== uid) continue;
      let o = s.out[uid];
      if ((NODE_BY[u.ntype] || NODE_DEFS[0]).cat === 'info') { try { o = infoOut(u); } catch { o = undefined; } }
      if (o && !o.error) {
        const one: NodeInput = { from: uid, type: o.type, value: o.value };
        if ((o.value === null || o.value === undefined) && (o.type === 'image' || o.type === 'video' || (o.type === 'approval' && o.text))) one.label = o.text || '';
        list.push(one);
      }
    }
    return list;
  }

  services = {
    backend: (kind: string, body: unknown) => backend(kind, body),
    script: (src: string, input: unknown, inputs: Record<string, unknown>) => runJs(src, input, inputs),
    agent: async () => { throw new Error('Agent steps run through agentRun'); },
  };

  execNode(id: string, after: 'queue' | 'solo') {
    const it = this.find(id) as NodeItem | undefined;
    if (!it) return;
    const quick = (NODE_BY[it.ntype] || NODE_DEFS[0]).cat === 'info', gen = this.runGen, tok = ++this.execSeq;
    this.execTok[id] = tok;
    const out0 = { ...this.state.out };
    delete out0[id];
    this.setState({ items: setStatus(this.state.items, { [id]: 'running' }), out: out0 });
    let parts = 0, result: NodeResult | null = null, failure: Error | null = null;
    const apply = () => {
      if (this.runGen !== gen || this.execTok[id] !== tok || !this.find(id)) return;
      const out = { ...this.state.out };
      if (failure) { out[id] = { error: failure.message } as any; this.failRun(id, out, { [id]: 'error' }); return; }
      out[id] = result!;
      if (after === 'queue') {
        this.runCount++;
        this.setState({ items: setStatus(this.state.items, { [id]: 'done' }), out, runDone: this.runCount });
        this.runTimer = setTimeout(() => this.stepRun(), 120);
      } else this.setState({ items: setStatus(this.state.items, { [id]: 'done' }), out });
    };
    const part = () => { if (++parts === 2) apply(); };
    setTimeout(part, quick ? 480 : 900);
    executeNode(it, this.inputsFor(id), this.state.perms, this.services as any, this.state.id || '')
      .then((r) => { result = r; }, (e: Error) => { failure = e; })
      .finally(part);
  }

  /** Types of the nodes a step feeds, looking through review gates. */
  feedsOf(id: string): string[] {
    const items = this.state.items as BoardItem[], G = flowGraph(items), byId = index(items), out: string[] = [], seen = new Set<string>();
    const q = (G.outs[id] || []).slice();
    while (q.length) {
      const n = byId[q.shift()!];
      if (!n || seen.has(n.id) || n.kind !== 'node') continue;
      seen.add(n.id);
      if (n.ntype === 'gate') q.push(...(G.outs[n.id] || []));
      else out.push(n.ntype);
    }
    return out;
  }

  /** Agent steps run on the server; options of one step run side by side. */
  async agentRun(ids: string[], after: 'queue' | 'solo') {
    const gen = this.runGen;
    const hz = { ...this.state.hz };
    for (const id of ids) hz[id] = { calls: [], asking: null, runId: null, sim: false, last: '' };
    const out0 = { ...this.state.out };
    for (const id of ids) delete out0[id];
    this.setState({ items: setStatus(this.state.items, Object.fromEntries(ids.map((i) => [i, 'running']))), hz, out: out0 });
    const patchHz = (id: string, p: Record<string, unknown>) => { if (this.runGen === gen) this.setState((st: any) => ({ hz: { ...st.hz, [id]: { ...st.hz[id], ...p } } })); };
    const one = async (id: string): Promise<NodeResult | Error> => {
      const it = this.find(id) as NodeItem;
      try {
        const items = this.state.items as BoardItem[], G = flowGraph(items), byId = index(items);
        const req = nodeRequest(it, this.inputsFor(id), this.state.perms, this.state.id || '').body as any;
        req.context = { text: upText(id, G, byId), feeds: this.feedsOf(id) };
        const ctrl = new AbortController();
        this.runs[id] = { ctrl };
        let res: NodeResult | Error = new Error('The run ended without an answer');
        await agent.run(req, (e: AgentEvent) => {
          if (this.runGen !== gen) return;
          const cur = this.state.hz[id] || { calls: [] };
          if (e.type === 'run') { this.runs[id].runId = e.runId; patchHz(id, { runId: e.runId, sim: e.simulated, reason: e.reason }); }
          else if (e.type === 'tool_call') patchHz(id, { calls: cur.calls.concat([{ id: e.id, res: e.res, title: e.title, status: 'pending' }]), last: e.title });
          else if (e.type === 'tool_call_update') patchHz(id, { calls: cur.calls.map((c: any) => (c.id === e.id ? { ...c, status: e.status } : c)) });
          else if (e.type === 'permission_request') { patchHz(id, { asking: { requestId: e.requestId, title: e.title, res: e.res } }); this.setState({ items: setStatus(this.state.items, { [id]: 'waiting' }) }); }
          else if (e.type === 'message') patchHz(id, { last: e.text.split('\n')[0] });
          else if (e.type === 'result') {
            res = e.status === 'success' ? { type: 'text', value: e.output.value, text: String(e.output.value ?? ''), sim: e.simulated, meta: e.note ? { note: e.note } : undefined } : new Error(e.error || 'The run failed');
          }
        }, ctrl.signal);
        return res;
      } catch (err) {
        return (err as Error).name === 'AbortError' ? new Error('Stopped') : (err as Error);
      } finally { delete this.runs[id]; }
    };
    const results = await Promise.all(ids.map(one));
    if (this.runGen !== gen) return;
    const out = { ...this.state.out }, st: Record<string, string> = {};
    let failed: string | null = null;
    ids.forEach((id, i) => {
      const r = results[i];
      if (r instanceof Error) { out[id] = { error: r.message } as any; st[id] = 'error'; failed = failed || id; }
      else { out[id] = r; st[id] = 'done'; }
    });
    if (failed) { this.failRun(failed, out, st); return; }
    if (after === 'queue') {
      this.runCount += ids.length;
      this.setState({ items: setStatus(this.state.items, st), out, runDone: this.runCount });
      this.runTimer = setTimeout(() => this.stepRun(), 120);
    } else this.setState({ items: setStatus(this.state.items, st), out });
  }

  answerAgent(id: string, decision: 'allow_once' | 'allow_always' | 'deny') {
    const h = this.state.hz[id];
    if (!h || !h.asking || !h.runId) return;
    void agent.answer(h.runId, h.asking.requestId, decision).catch((e) => this.flash(e.message));
    this.setState((st: any) => ({ hz: { ...st.hz, [id]: { ...st.hz[id], asking: null } }, items: setStatus(st.items, { [id]: 'running' }) }));
  }

  failRun(id: string, out: Record<string, any>, dp: Record<string, string>) {
    const wasFlow = this.state.running, msg = out[id].error;
    if (wasFlow) this.clearRun();
    let items = setStatus(this.state.items, dp);
    if (wasFlow) items = items.map((o) => (o.kind === 'node' && (o.status === 'queued' || o.status === 'running' || o.status === 'waiting') ? { ...o, status: 'idle' } : o));
    this.setState({ items, out, running: wasFlow ? false : this.state.running });
    this.flash(fmt('#{0} failed: {1}', id, tr(msg)));
  }

  approve(id: string) {
    const it = this.find(id) as NodeItem | undefined;
    if (!it || it.ntype !== 'gate' || it.status !== 'waiting') return;
    this.runCount++;
    const gIn = this.inputsFor(id), gOut = { ...this.state.out };
    gOut[id] = { type: 'approval', value: gIn.length ? gIn[0].value : null, text: gIn.map((i) => showVal(i.value) || i.label || '').filter(Boolean).join('\n\n') };
    this.setState({ out: gOut, items: setStatus(this.state.items, { [id]: 'done' }), runDone: this.runCount });
    if (this.runQ) this.runTimer = setTimeout(() => this.stepRun(), 200);
  }

  /** Send back: the review gate stops the flow and the steps before it run again on the next run. */
  sendBack(id: string) {
    const items = this.state.items as BoardItem[], G = flowGraph(items);
    const back = new Set<string>(), q = [...(G.ins[id] || [])];
    while (q.length) { const u = q.shift()!; if (back.has(u)) continue; back.add(u); q.push(...(G.ins[u] || [])); }
    this.clearRun();
    const out = { ...this.state.out };
    this.setState({ running: false, out, items: items.map((o) => (o.kind === 'node' && (o.id === id || o.status === 'queued' || o.status === 'running' || o.status === 'waiting') ? { ...o, status: 'idle' } : o)) });
    this.flash(fmt('Sent back from #{0}. Change the steps before it and run again.', id));
  }

  finishRun() { this.runQ = null; this.setState({ running: false }); }

  stopRun() {
    this.clearRun();
    this.setState({ running: false, items: (this.state.items as BoardItem[]).map((it) => (it.kind === 'node' && (it.status === 'queued' || it.status === 'running' || it.status === 'waiting') ? { ...it, status: 'idle' } : it)) });
  }

  runNode(id: string) {
    if (this.state.running) { this.flash('A flow is already running'); return; }
    const solo = this.find(id);
    if (!solo) return;
    this.setState({ welcome: false, menu: null });
    if (isHarness(solo)) { void this.agentRun([id], 'solo'); return; }
    this.execNode(id, 'solo');
  }

  // ---- the toolbar chat

  setChat(on: boolean) {
    this.setState({ chat: on, panel: null, ...(on ? {} : { area: null }) }, () => { if (on) setTimeout(() => this.inputRef.current?.focus(), 30); });
  }

  submitPrompt(e: any) {
    e.preventDefault();
    const text = (this.state.prompt || '').trim();
    if (!text) return;
    void this.chatStart(text);
  }

  async chatStart(text: string) {
    const s = this.state;
    if (s.proposal) this.rejectProposal();
    const items = (this.state.items as BoardItem[]).filter((o) => !(o as any).proposed), selIt = s.selected ? items.find((o) => o.id === s.selected) : null;
    const mode = s.chatMode === 'auto' ? (await import('@paradigm/shared')).chatModeOf(text, items, selIt || null) : s.chatMode;
    const area = s.area ? { ...s.area, contains: [] } : null;
    this.chatCtrl?.abort();
    const ctrl = (this.chatCtrl = new AbortController());
    this.setState({ prompt: '', welcome: false, chatRun: { text, mode, calls: [], n: 0, done: false }, proposal: null });
    let note = '';
    try {
      await agent.run({ harness: 'pi', instruction: text, inputs: [], permissions: this.state.perms, workspace: s.id || '', surface: 'chat', chat: { mode, board: items, selected: s.selected ? [s.selected] : [], area, tools: [] } } as any, (ev: AgentEvent) => {
        if (ctrl.signal.aborted) return;
        if (ev.type === 'tool_call') {
          const add = ((ev.add || []) as BoardItem[]).map((o) => ({ ...o, proposed: true }) as BoardItem);
          this.setState((st: any) => ({ items: st.items.concat(add), chatRun: { ...st.chatRun, calls: st.chatRun.calls.concat([{ line: ev.title, tool: ev.tool }]), n: st.chatRun.n + 1 } }));
        } else if (ev.type === 'result') {
          if (ev.status === 'success') note = (ev.output.value as any)?.note || '';
          else this.flash(ev.error || 'The board agent stopped');
        }
      }, ctrl.signal);
    } catch (err) { if ((err as Error).name !== 'AbortError') this.flash((err as Error).message); }
    if (ctrl.signal.aborted) return;
    const any = (this.state.items as any[]).some((o) => o.proposed);
    this.setState((st: any) => ({ chatRun: st.chatRun ? { ...st.chatRun, done: true } : null, proposal: any ? { note: note || tr('Proposal') } : null, area: null }));
    setTimeout(() => { if (this.state.chatRun?.done) this.setState({ chatRun: null }); }, any ? 1400 : 2600);
  }

  acceptProposal() {
    const items = (this.state.items as any[]).map((o) => { if (!o.proposed) return o; const { proposed, ...rest } = o; void proposed; return rest; });
    this.setItems(items as BoardItem[], { proposal: null, chatRun: null }, true);
  }

  rejectProposal() {
    this.chatCtrl?.abort();
    this.setState({ items: (this.state.items as any[]).filter((o) => !o.proposed), proposal: null, chatRun: null });
  }

  // ---- full view and files

  openViewer(id: string) { this.setState({ viewer: { id, src: false, col: -1, dir: 1 }, menu: null }); }

  slideGo(id: string, n: number) {
    const res = this.state.out[id], vw = res && res.view;
    if (!vw || vw.kind !== 'slides') return;
    this.setState({ slideAt: { ...this.state.slideAt, [id]: Math.max(0, Math.min(vw.slides.length - 1, n)) } });
  }

  saveText(name: string, mime: string, text: string) {
    try {
      const url = URL.createObjectURL(new Blob([text], { type: mime })), link = document.createElement('a');
      link.href = url; link.download = name; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      this.flash(fmt('Downloaded {0}', name));
    } catch { this.flash('Downloads are blocked in this preview'); }
  }

  copyText(text: string, done: string) {
    navigator.clipboard?.writeText(text).then(() => this.flash(done), () => this.flash('Copying is blocked here'));
  }

  exportFile(id: string, format: 'docx' | 'xlsx' | 'pptx') {
    const res = this.state.out[id], vw = res && (res.view as any);
    if (!vw) return;
    this.flash(fmt('Asking the backend for a .{0} file', format));
    files.export(format, vw.title || slugOf(vw.title) || id, { kind: vw.kind, blocks: vw.blocks, head: vw.head, rows: vw.rows, slides: vw.slides }).then((r) => {
      const a = document.createElement('a');
      a.href = fileUrl(r.url); a.download = r.name; a.click();
      this.flash(fmt('Your .{0} file is ready', format));
    }, (e) => this.flash(e.message));
  }

  downloadFile() {
    const items = (this.state.items as any[]).filter((o) => !o.proposed);
    this.saveText((slugOf(this.state.title) || 'board') + '.flowboard.json', 'application/json', JSON.stringify(toFile(items), null, 2));
  }

  blocksToHtml = blocksToHtml;

  render() {
    const s = this.state;
    if (!s.loaded) return <div style={{ minHeight: '100vh', background: '#FFFFFF' }} />;
    if (s.loadError) return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, fontFamily: 'Inter, sans-serif' }}>
        <p style={{ margin: 0, fontSize: 18 }}>{tr(s.loadError)}</p>
        <button className="wb-primary" type="button" onClick={() => this.props.goHome()} style={{ background: '#2457C5', color: '#FFFFFF' }}>{tr('All boards')}</button>
      </div>
    );
    return <BoardView v={renderVals(this)} />;
  }
}

export { STARTERS, HARNESSES };
