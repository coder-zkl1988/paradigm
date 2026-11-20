// @ts-nocheck
// The whiteboard. Generated: do not edit. This is the board logic of the
// design draft (design/Main.dc.html), ported method by method by
// scripts/port-board.py; change scripts/board-overrides and regenerate.
// Node, graph, file and document logic comes from @paradigm/shared through
// ./draft. What the draft only simulated (saving, agent runs, the chat, the
// market, files, sharing, voice) is marked "Server:" and talks to the server.

import { Component } from 'react';
import { executeNode, contract } from '@paradigm/shared';
import { BoardView } from '../views/BoardView';
import { agent as agentApi, api, backend, boards, files, fileUrl, prefs, workspaces } from '../lib/api';
import { runJs } from './script';
import * as D from './draft';

const {
  ACCEPTS, AGAP, API, API_ORDER, API_USER, AREA_COL, ARROW_WEIGHTS, AVATARS, BOARD_TOOLS, BUILTIN_BACKEND, BUILTIN_SUM, CATS, CHIP_STK, CONNECTABLE,
  DEFAULT_PINS, DEFAULT_SHELF, DOCK, DOT, FRAME_FILLS, GRID, HARNESS, HZ_OPW, HZ_ORDER, HZ_PCOL, HZ_PERMS, HZ_PNAME, HZ_PNEXT, HZ_RES, HZ_STK, HZ_SUBS,
  I_EN, I_ZH, IMG_ICON, INK, KEYS, L, MARKET, MCP_TOOLS, MONO, NEXT_STEP, NODE_BY, NODE_DEFS, NODE_HINT, NODE_OPTS, NODE_STK, PEN_WEIGHTS, PIN_MAX,
  PKG_BY, PKG_TEMPLATE, PLAY_ICON, PREFIX, SHAPES, SHAPE_BY_ID, SHAPE_FILLS, STARTERS, STICKERS, STICKER_BY_ID, STICKY_COLORS, TEXT_COLORS, TEXT_STYLES,
  UI_RULES, aiDoc, arrowPts, arrowStk, blocksToHtml, bounds, canRunDef, canTake, cfgOf, chatModeOf, clipText, drawBlocks, editable, endPoint, fileDoc,
  flowGraph, fmt, hzFacts, hzSum, hzText, idPrefix, index, infoOut, isBuiltin, isHarness, itemText, loadDoc, makeView, mcpConfig, mkEdge, nearestSide,
  nodeRequest, numOf, okHex, outType, outVec, penD, penStk, pkgOut, planChat, polyMid, ptsBox, registerPkg, roundedPath, rr, sameButStatus, samePts,
  setMarket, setStatus, shapeHasText, shapeLayers, shapeStk, showVal, sidePoint, simAnswer, skillText, slugOf, stickyStk, textCss, tplItems, tr, trOut,
  upText, validatePkg, viaFrom, viaShift,
} = D;

export interface BoardProps {
  boardId: string;
  viewToken?: string;
  embed?: boolean;
  toolbar?: boolean;
  me: { id: string; name: string; email: string; guest: boolean } | null;
  lang: 'en' | 'zh';
  flipLang(): void;
  setLang(l: 'en' | 'zh'): void;
  goHome(workspaceId?: string): void;
  newBoard(): void;
  signOut(): void;
  replaceUrl(id: string): void;
  accent?: string;
}

export class Board extends Component<BoardProps, any> {
  constructor(props) {
    super(props);
    var self = this;
    this.nextId = 100;
    this.seq = {};
    this.undoStack = [];
    this.redoStack = [];
    this.histAt = 0;
    this.dragBase = null;
    this.skipHist = false;
    this.runQ = null;
    this.runCount = 0;
    this.hzBatch = null;
    this.hzGen = 0;
    this.pickAfter = null;
    this.botNode = null;
    this.runGen = 0;
    this.execSeq = 0;
    this.execTok = {};
    this.drag = null;
    this.boardEl = null;
    this.inputEl = null;
    this.toastTimer = null;
    this.chatTok = 0; this.chatTimer = null; this.chatAt = null; this.chatCtrl = null; this.chatRunId = null;
    this.version = 0; this.savedItems = null; this.savedPrefs = ''; this.savedSettings = '';
    this.speech = null;
    this.boardRef = function (el) { if (el) self.boardEl = el; };
    this.inputRef = function (el) { if (el) self.inputEl = el; };
    this.services = {
      backend: function (kind, body) { return backend(kind, body); },
      script: function (src, input, inputs) { return new Promise(function (resolve, reject) { runJs(src, input, inputs, function (err, r) { if (err) reject(err); else resolve(r); }); }); },
      agent: function () { return Promise.reject(new Error('Agent steps run through hzStart')); }
    };
    // Server: the board, its settings and the person's node prefs load in componentDidMount.
    this.state = {
      loaded: false, loadError: '', boardId: null, title: '', role: 'editor', workspaces: [], wsId: null, link: null,
      tool: 'select', drawMode: 'pen', shapeKind: 'square', stickerId: null, panel: null, ink: '#111111',
      welcome: false, big: false, nodeType: 'llm', mood: 'idle', look: { x: 0, y: 0 }, running: false, runDone: 0, runTotal: 0, aiOpen: false, aiTab: 'outline',
      items: [], selected: null, editing: null, popover: null,
      pan: { x: 160, y: 96 }, zoom: 1, zoomMenu: false, panning: false,
      chat: false, prompt: '', mic: false, micFrom: null, toast: '',
      stickerQuery: '', linkDraft: '', commentDraft: '',
      lang: props.lang, acctMenu: null, ws: 0,
      signedIn: !!props.me && !props.me.guest, saveState: 'saved', library: [], installed: [], mine: [], pins: DEFAULT_PINS.slice(), shelf: DEFAULT_SHELF.slice(), market: null, draft: JSON.stringify(PKG_TEMPLATE, null, 2), allNodes: false, share: null, embedEdit: false, embedBar: true, importOpen: false, importText: '', importError: false,
      help: false, toolLock: false, lineOnly: false,
      menu: null, clip: null, canUndo: false, canRedo: false, multi: [], marquee: null, area: null, kc: null, proposal: null, bg: 'grid', snap: false, bgMenu: false, ghost: null,
      hz: {}, openNode: null, openAuto: false, perms: Object.assign({}, HZ_PERMS), paused: false, pick: null, kept: {}, hzSel: null, scrub: null, compare: null,
      out: {}, inspect: null, apiOpen: false, apiStatus: null, viewer: null, slideAt: {}, chatRun: null, chatMode: 'auto'
    };
    this.isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
  }

  componentDidMount() {
    this.load();
  }

  // Server: loads the board (or makes a new one), the workspaces, the person's nodes and the market.
  load() {
    var self = this, p = this.props;
    var market = api('GET', '/v1/market/nodes').then(function (r) { setMarket(r.nodes); }).catch(function () { return null; });
    var mine = p.viewToken || !p.me ? Promise.resolve(null) : prefs.get().then(function (r) { return r.prefs; }).catch(function () { return null; });
    var wsP = p.viewToken || !p.me ? Promise.resolve({ workspaces: [] }) : workspaces.list();
    var boardP;
    if (p.viewToken) boardP = api('GET', '/v1/public/' + encodeURIComponent(p.viewToken)).then(function (r) { return Object.assign({ role: 'viewer', settings: {} }, r.board); });
    else if (p.boardId === 'new') boardP = wsP.then(function (r) {
      var ws = r.workspaces, target = ws.find(function (w) { return !w.personal && w.role !== 'viewer'; }) || ws.find(function (w) { return w.role !== 'viewer'; }) || ws[0];
      return boards.create(target.id, {}).then(function (x) { p.replaceUrl(x.board.id); return x.board; });
    });
    else boardP = boards.get(p.boardId).then(function (x) { return x.board; });
    Promise.all([boardP, wsP, mine, market]).then(function (all) {
      var board = all[0], ws = all[1].workspaces, np = all[2];
      var items = [];
      try { items = loadDoc(board.file); } catch (err) { self.flash(String(err.message || err)); }
      var extra = { shelf: DEFAULT_SHELF.slice(), installed: [], mine: [], pins: DEFAULT_PINS.slice() };
      if (np) {
        (np.mine || []).forEach(function (m) { if (!validatePkg(m).length) registerPkg(m); });
        extra = { shelf: np.shelf, installed: np.installed, mine: np.mine || [], pins: np.pins };
      }
      self.version = board.version || 0;
      self.savedItems = items;
      self.savedPrefs = JSON.stringify(extra);
      var st = board.settings || {};
      self.savedSettings = JSON.stringify({ perms: st.perms || null, bg: st.bg || 'grid' });
      var fresh = p.boardId === 'new' || (!items.length && !p.viewToken && (board.nodes === 0) && board.createdAt === board.updatedAt);
      self.setState(Object.assign(extra, {
        loaded: true, boardId: board.id || null, title: board.title || '', role: board.role || 'viewer', workspaces: ws, wsId: board.workspaceId || null,
        items: items, welcome: fresh && !items.length, big: fresh && !items.length,
        perms: Object.assign({}, HZ_PERMS, st.perms || {}), bg: st.bg === 'dots' ? 'dots' : 'grid', saveState: 'saved'
      }), function () {
        var more = self.nodesFor(items);
        if (more) self.setState(more);
        if (items.length) self.zoomFit();
        self.focusBoard();
      });
    }).catch(function (err) { self.setState({ loaded: true, loadError: String(err.message || err) }); });
  }

  componentDidUpdate(prev, prevState) {
    if (prev.lang !== this.props.lang) this.setState({ lang: this.props.lang });
    if (prevState && prevState.mic !== this.state.mic) this.micChanged();
    if (!prevState || !this.state.loaded || !prevState.loaded) return;
    if (prevState.items !== this.state.items || prevState.library !== this.state.library || prevState.installed !== this.state.installed || prevState.mine !== this.state.mine || prevState.pins !== this.state.pins || prevState.shelf !== this.state.shelf || prevState.perms !== this.state.perms || prevState.bg !== this.state.bg) this.queueSave();
    if (prevState.items === this.state.items) return;
    if (this.skipHist) { this.skipHist = false; return; }
    if (sameButStatus(prevState.items, this.state.items)) return;
    if (this.drag) { if (!this.dragBase) this.dragBase = prevState.items; return; }
    var now = Date.now();
    if (this.dragBase) { this.pushHist(this.dragBase); this.dragBase = null; }
    else if (now - this.histAt > 500 || !this.undoStack.length) this.pushHist(prevState.items);
    this.histAt = now;
  }

  pushHist(base) {
    this.undoStack.push(base);
    if (this.undoStack.length > 80) this.undoStack.shift();
    this.redoStack = [];
    if (!this.state.canUndo || this.state.canRedo) this.setState({ canUndo: true, canRedo: false });
  }

  undo() {
    if (!this.undoStack.length || this.state.running) return;
    this.redoStack.push(this.state.items);
    var prevItems = this.undoStack.pop();
    this.skipHist = true;
    this.setState({ items: prevItems, selected: null, editing: null, popover: null, menu: null, canUndo: this.undoStack.length > 0, canRedo: true });
  }

  redo() {
    if (!this.redoStack.length || this.state.running) return;
    this.undoStack.push(this.state.items);
    var nextItems = this.redoStack.pop();
    this.skipHist = true;
    this.setState({ items: nextItems, selected: null, editing: null, popover: null, menu: null, canUndo: true, canRedo: this.redoStack.length > 0 });
  }

  nudge(dx, dy) {
    var ids = this.selIds(), set = {};
    ids.forEach(function (id) { set[id] = 1; });
    this.setState({ items: this.state.items.map(function (it) {
      if (it.kind === 'arrow' && it.via && it.from && it.to && set[it.from.id] && set[it.to.id]) return Object.assign({}, it, { via: viaShift(it.via, dx, dy) });
      if (!set[it.id] || it.locked) return it;
      if (it.kind === 'arrow') return (it.from || it.to) ? it : Object.assign({}, it, { x1: it.x1 + dx, y1: it.y1 + dy, x2: it.x2 + dx, y2: it.y2 + dy, via: viaShift(it.via, dx, dy) });
      return Object.assign({}, it, { x: it.x + dx, y: it.y + dy });
    }) });
  }

  componentWillUnmount() {
    clearTimeout(this.hzTimer); clearTimeout(this.foldTimer); clearTimeout(this.toastTimer); clearTimeout(this.runTimer); clearTimeout(this.soloTimer); clearTimeout(this.moodTimer); clearTimeout(this.botTimer);
    this.clearRun();
    this.stopSpeech();
    if (this.saveTimer) { clearTimeout(this.saveTimer); this.saveNow(); }
  }

  rect() { return this.boardEl ? this.boardEl.getBoundingClientRect() : { left: 0, top: 0, width: 1440, height: 900 }; }
  toWorld(e) {
    var r = this.rect(), s = this.state;
    return { x: (e.clientX - r.left - s.pan.x) / s.zoom, y: (e.clientY - r.top - s.pan.y) / s.zoom };
  }
  capture(e) { try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {} }
  focusBoard() { try { if (this.boardEl) this.boardEl.focus({ preventScroll: true }); } catch (err) {} }
  newId(prefix) {
    prefix = prefix || 'i';
    var used = index(this.state.items), id;
    do { this.seq[prefix] = (this.seq[prefix] || 0) + 1; id = prefix + this.seq[prefix]; } while (used[id]);
    return id;
  }
  // Server: autosave. The board file and its settings go to the board; pins,
  // the Nodes panel and the person's own nodes go to their account.
  queueSave() {
    var self = this;
    if (!this.state.loaded || this.ro()) return;
    clearTimeout(this.saveTimer);
    if (this.state.saveState !== 'saving') this.setState({ saveState: 'saving' });
    this.saveTimer = setTimeout(function () { self.saveTimer = null; self.saveNow(); }, 600);
  }

  saveNow() {
    var self = this, s = this.state, jobs = [];
    var clean = s.items.filter(function (o) { return !o.proposed; });
    var cleanSaved = (this.savedItems || []).filter(function (o) { return !o.proposed; });
    var settings = JSON.stringify({ perms: s.perms, bg: s.bg });
    if (s.boardId && (!sameButStatus(clean, cleanSaved) || settings !== this.savedSettings)) {
      var items = s.items;
      jobs.push(boards.save(s.boardId, { file: fileDoc(clean, flowGraph(clean)), version: this.version, settings: { perms: s.perms, bg: s.bg } }).then(function (r) { self.version = r.version; self.savedItems = items; self.savedSettings = settings; }));
    }
    var np = JSON.stringify({ shelf: s.shelf, installed: s.installed, mine: s.mine, pins: s.pins });
    if (this.props.me && np !== this.savedPrefs) jobs.push(prefs.put({ shelf: s.shelf, installed: s.installed, mine: s.mine, pins: s.pins }).then(function () { self.savedPrefs = np; }));
    Promise.all(jobs).then(function () { if (!self.saveTimer) self.setState({ saveState: 'saved' }); }, function (err) {
      self.setState({ saveState: 'off' });
      self.flash(err && err.status === 409 ? 'Someone else changed this board. Reload to see their version.' : String(err.message || err));
    });
  }

  /** Viewing someone else's board, or a view link: nothing is changed or saved. */
  ro() { return this.state.role === 'viewer'; }

  fileText() { return JSON.stringify(fileDoc(this.state.items, flowGraph(this.state.items)), null, 2); }

  copyText(text, okMsg) {
    var self = this;
    try {
      navigator.clipboard.writeText(text).then(function () { self.flash(okMsg); }, function () { self.flash('Copying is blocked in this preview'); });
    } catch (err) { this.flash('Copying is blocked in this preview'); }
  }

  downloadFile() {
    var name = (slugOf(this.state.title) || 'board') + '.flowboard.json';
    try {
      var url = URL.createObjectURL(new Blob([this.fileText()], { type: 'application/json' }));
      var link = document.createElement('a');
      link.href = url; link.download = name;
      link.click();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      this.flash(fmt('Downloaded {0}', name));
    } catch (err) { this.flash('Downloads are blocked in this preview'); }
    this.setState({ acctMenu: null });
  }

  importFile(e) {
    if (e && e.preventDefault) e.preventDefault();
    var self = this, items;
    try { items = loadDoc(JSON.parse(this.state.importText)); } catch (err) { this.setState({ importError: true }); return; }
    this.clearRun();
    this.setState({ items: items, area: null, welcome: false, selected: null, multi: [], editing: null, popover: null, proposal: null, running: false, importOpen: false, importText: '', importError: false });
    this.flash('Board loaded from file');
    setTimeout(function () { self.zoomFit(); }, 0);
  }

  saveToLibrary() {
    var ids = this.selIds();
    if (!ids.length) { this.flash('Select something to save first'); return; }
    var list = this.clipFrom(ids), n = this.state.library.length + 1;
    this.setState({ library: this.state.library.concat([{ id: 'lib' + Date.now(), n: n, count: list.filter(function (o) { return o.kind !== 'arrow'; }).length, list: list }]), menu: null });
    this.flash('Saved to your library');
  }

  insertFromLibrary(entry) {
    var r = this.rect(), s = this.state;
    this.setState({ panel: null, welcome: false });
    this.paste({ x: (r.width / 2 - s.pan.x) / s.zoom, y: (r.height / 2 - s.pan.y) / s.zoom }, entry.list);
  }

  selIds() {
    var s = this.state, m = s.multi || [], byId = index(s.items);
    if (m.length > 1 && s.selected && m.indexOf(s.selected) >= 0) return m.filter(function (id) { return byId[id]; });
    return s.selected && byId[s.selected] ? [s.selected] : [];
  }

  collect(ids) {
    var set = {};
    ids.forEach(function (id) { set[id] = 1; });
    return this.state.items.filter(function (o) {
      if (o.kind !== 'arrow') return !!set[o.id];
      if (o.from && o.to && set[o.from.id] && set[o.to.id]) return true;
      return !!set[o.id] && (ids.length === 1 || (!o.from && !o.to));
    });
  }

  cloneList(list, dx, dy) {
    var self = this, ref = index(this.state.items.concat(list)), map = {}, gmap = {};
    list.forEach(function (o) { if (o.kind !== 'arrow') map[o.id] = self.newId(idPrefix(o)); });
    return list.map(function (o) {
      var c = JSON.parse(JSON.stringify(o));
      c.locked = false; c.comments = []; delete c.proposed;
      if (c.kind === 'node') c.status = 'idle';
      if (c.group) { gmap[c.group] = gmap[c.group] || self.newId('g'); c.group = gmap[c.group]; }
      if (c.kind === 'arrow') {
        var a = endPoint(o, 'a', ref).p, b = endPoint(o, 'b', ref).p;
        c.id = self.newId('e');
        c.from = o.from && map[o.from.id] ? { id: map[o.from.id], side: o.from.side } : null;
        c.to = o.to && map[o.to.id] ? { id: map[o.to.id], side: o.to.side } : null;
        c.x1 = a.x + dx; c.y1 = a.y + dy; c.x2 = b.x + dx; c.y2 = b.y + dy;
      } else { c.id = map[o.id]; c.x += dx; c.y += dy; }
      return c;
    });
  }

  selectAll() {
    var ids = this.state.items.filter(function (o) { return o.kind !== 'arrow'; }).map(function (o) { return o.id; });
    if (!ids.length) return;
    this.setState({ multi: ids.length > 1 ? ids : [], selected: ids[ids.length - 1], editing: null, popover: null, menu: null, tool: 'select' });
  }

  group() {
    var ids = this.selIds();
    if (ids.length < 2) return;
    var gid = this.newId('g');
    this.setState({ items: this.state.items.map(function (o) { return ids.indexOf(o.id) >= 0 ? Object.assign({}, o, { group: gid }) : o; }), menu: null });
    this.flash(fmt('Grouped {0} items', ids.length));
  }

  ungroup() {
    var ids = this.selIds(), byId = index(this.state.items), gs = {};
    ids.forEach(function (id) { if (byId[id] && byId[id].group) gs[byId[id].group] = 1; });
    if (!Object.keys(gs).length) return;
    this.setState({ items: this.state.items.map(function (o) { if (!o.group || !gs[o.group]) return o; var c = Object.assign({}, o); delete c.group; return c; }), menu: null });
    this.flash('Ungrouped');
  }

  tidy() {
    var ids = this.selIds(), byId = index(this.state.items);
    var list = ids.map(function (id) { return byId[id]; }).filter(function (o) { return o && o.kind !== 'arrow' && o.kind !== 'pen' && !o.locked; });
    if (list.length < 2) return;
    list.sort(function (a, b) { return (a.x - b.x) || (a.y - b.y); });
    var x = list[0].x, y = Infinity, pos = {};
    list.forEach(function (o) { y = Math.min(y, o.y); });
    list.forEach(function (o) { pos[o.id] = { x: x, y: y }; x += bounds(o, byId).w + GRID; });
    this.setState({ items: this.state.items.map(function (o) {
      if (o.kind === 'arrow' && o.via && ((o.from && pos[o.from.id]) || (o.to && pos[o.to.id]))) return Object.assign({}, o, { via: undefined });
      return pos[o.id] ? Object.assign({}, o, pos[o.id]) : o;
    }), menu: null });
  }

  // ----- connect with the keyboard
  kcList(srcId) {
    var items = this.state.items, byId = index(items), src = byId[srcId], linked = {};
    items.forEach(function (a) { if (a.kind === 'arrow' && a.from && a.to && a.from.id === srcId) linked[a.to.id] = 1; });
    return items.filter(function (o) { return CONNECTABLE[o.kind] && o.id !== srcId && !linked[o.id] && !o.proposed && canTake(o, src); })
      .sort(function (a, b) { return (a.x - b.x) || (a.y - b.y); });
  }

  kcStart() {
    var ids = this.selIds(), src = ids.length === 1 ? this.find(ids[0]) : null;
    if (!src || !CONNECTABLE[src.kind]) { this.flash('Select one item first, then press C'); return; }
    var list = this.kcList(src.id);
    if (!list.length) { this.flash(fmt('Nothing here can take #{0} as input', src.id)); return; }
    var byId = index(this.state.items), sb = bounds(src, byId), best = list[0], bd = Infinity;
    list.forEach(function (o) {
      var ob = bounds(o, byId), dx = (ob.x + ob.w / 2) - (sb.x + sb.w / 2), dy = (ob.y + ob.h / 2) - (sb.y + sb.h / 2);
      var dist = Math.hypot(dx, dy) + (dx < 0 ? 100000 : 0);
      if (dist < bd) { bd = dist; best = o; }
    });
    this.setState({ kc: { from: src.id, target: best.id }, popover: null, menu: null, editing: null });
  }

  kcStep(dir) {
    var kc = this.state.kc;
    if (!kc) return;
    var list = this.kcList(kc.from);
    if (!list.length) { this.setState({ kc: null }); return; }
    var i = 0;
    list.forEach(function (o, n) { if (o.id === kc.target) i = n; });
    this.setState({ kc: { from: kc.from, target: list[(i + dir + list.length) % list.length].id } });
  }

  kcCommit() {
    var kc = this.state.kc, items = this.state.items, byId = index(items);
    var a = kc && byId[kc.from], b = kc && byId[kc.target];
    if (!a || !b) { this.setState({ kc: null }); return; }
    var ab = bounds(a, byId), bb = bounds(b, byId);
    var sa = a.kind === 'node' ? 'right' : nearestSide(ab, { x: bb.x + bb.w / 2, y: bb.y + bb.h / 2 });
    var sb = b.kind === 'node' ? 'left' : nearestSide(bb, { x: ab.x + ab.w / 2, y: ab.y + ab.h / 2 });
    this.setState({ items: items.concat([mkEdge(this.newId('e'), a.id, b.id, sa, sb)]), kc: null, selected: b.id, multi: [] });
    this.flash(fmt('Connected #{0} to #{1}', a.id, b.id));
  }

  // ----- proposals the person accepts or rejects
  baseForProposal() {
    return this.cleanItems(null).map(function (o) { if (!o.proposed) return o; var c = Object.assign({}, o); delete c.proposed; return c; });
  }

  propose(base, added, note) {
    added.forEach(function (o) { o.proposed = true; });
    this.chatStop();
    this.setState({ chatRun: null, items: base.concat(added), proposal: { ids: added.map(function (o) { return o.id; }), note: note }, prompt: '', mic: false, welcome: false, selected: null, multi: [], editing: null, popover: null, menu: null });
    this.setMood('thinking', 1500);
  }

  acceptProposal() {
    this.chatStop();
    this.setState({ items: this.state.items.map(function (o) { if (!o.proposed) return o; var c = Object.assign({}, o); delete c.proposed; return c; }), proposal: null, chatRun: null });
    this.flash('Added to the board');
    this.setMood('happy', 1500);
  }

  rejectProposal() {
    var ids = this.state.items.filter(function (o) { return o.proposed; }).map(function (o) { return o.id; });
    this.chatStop();
    if (this.state.mood === 'thinking') this.setMood('idle');
    this.setState({ items: this.removeFrom(this.state.items, ids), proposal: null, selected: null, multi: [], chatRun: null });
    this.flash('Proposal rejected');
  }

  suggestNext() {
    var self = this, base = this.baseForProposal(), byId = index(base), G = flowGraph(base);
    var ids = this.selIds(), src = ids.length === 1 && byId[ids[0]] && CONNECTABLE[byId[ids[0]].kind] ? byId[ids[0]] : null;
    if (!src) { var nodes = G.order.filter(function (id) { return byId[id].kind === 'node'; }); src = nodes.length ? byId[nodes[nodes.length - 1]] : base.filter(function (o) { return o.kind === 'node'; }).pop(); }
    if (!src) { this.flash('Add or select a node first'); return; }
    var def = NODE_BY[NEXT_STEP[outType(src) || 'context'] || 'llm'], sb = bounds(src, byId);
    var x = Math.round((sb.x + sb.w + 80) / GRID) * GRID, y = Math.round(sb.y / GRID) * GRID;
    var hits = function () { return base.some(function (o) { if (o.kind === 'arrow' || o.kind === 'frame') return false; var b = bounds(o, byId); return x < b.x + b.w + 20 && x + def.w + 20 > b.x && y < b.y + b.h + 20 && y + def.h + 20 > b.y; }); };
    for (var tries = 0; tries < 8 && hits(); tries++) y += def.h + GRID;
    var n = { id: this.newId(def.short), kind: 'node', ntype: def.t, x: x, y: y, w: def.w, h: def.h, text: '', status: 'idle' };
    this.propose(base, [n, mkEdge(this.newId('e'), src.id, n.id, src.kind === 'node' ? 'right' : nearestSide(sb, { x: x, y: y + def.h / 2 }), 'left')], fmt('Suggestion: add {0} after #{1}', tr(def.label), src.id));
    setTimeout(function () { self.zoomFit(); }, 0);
  }

  find(id) { return this.state.items.filter(function (o) { return o.id === id; })[0]; }

  update(id, patch) {
    this.setState({ items: this.state.items.map(function (it) { return it.id === id ? Object.assign({}, it, patch) : it; }) });
  }
  patchSel(patch, closePop) {
    var sel = this.state.selected;
    if (!sel) return;
    var next = { items: this.state.items.map(function (it) { return it.id === sel ? Object.assign({}, it, patch) : it; }) };
    if (closePop) next.popover = null;
    this.setState(next);
  }

  removeFrom(items, ids) {
    var byId = index(items);
    return items.filter(function (o) { return ids.indexOf(o.id) < 0; }).map(function (o) {
      if (o.kind !== 'arrow') return o;
      var c = o;
      if (c.from && ids.indexOf(c.from.id) >= 0) { var a = endPoint(c, 'a', byId).p; c = Object.assign({}, c, { from: null, x1: a.x, y1: a.y }); }
      if (c.to && ids.indexOf(c.to.id) >= 0) { var b = endPoint(c, 'b', byId).p; c = Object.assign({}, c, { to: null, x2: b.x, y2: b.y }); }
      return c;
    });
  }

  cleanItems(keepId) {
    var s = this.state, ed = s.editing;
    if (!ed || ed === keepId) return s.items;
    var it = s.items.filter(function (o) { return o.id === ed; })[0];
    if (it && it.kind === 'text' && !(it.text || '').trim()) return this.removeFrom(s.items, [ed]);
    return s.items;
  }

  stopEditing() {
    var self = this, items = this.cleanItems(null), ed = this.state.editing;
    var still = items.some(function (o) { return o.id === ed; });
    this.setState({ items: items, editing: null, selected: still ? this.state.selected : null });
    setTimeout(function () { self.focusBoard(); }, 0);
  }

  snapV(v) { return this.state.snap ? Math.round(v / GRID) * GRID : v; }

  placeBox(kind, p, ntype) {
    var s = this.state, sz;
    if (kind === 'node') { var nd = NODE_BY[ntype || s.nodeType] || NODE_DEFS[0]; sz = { w: nd.w, h: nd.h }; }
    else if (kind === 'sticky') sz = { w: 200, h: 200 };
    else if (kind === 'frame') sz = { w: 640, h: 400 };
    else if (kind === 'shape') { var sh = SHAPE_BY_ID[s.shapeKind] || SHAPES[0]; sz = { w: sh.w, h: sh.h }; }
    else if (kind === 'sticker') sz = { w: 88, h: 88 };
    else sz = { w: 2, h: 26 };
    var x = kind === 'text' ? p.x : p.x - sz.w / 2, y = kind === 'text' ? p.y - 12 : p.y - sz.h / 2;
    return { kind: kind, x: this.snapV(x), y: this.snapV(y), w: sz.w, h: sz.h };
  }

  create(kind, p, items, ntype) {
    var s = this.state, pb = this.placeBox(kind, p, ntype);
    if (kind === 'node') {
      var nd = NODE_BY[ntype || s.nodeType] || NODE_DEFS[0];
      return { id: this.newId(nd.short), kind: 'node', ntype: nd.t, x: pb.x, y: pb.y, w: nd.w, h: nd.h, text: '', status: 'idle' };
    }
    var id = this.newId(PREFIX[kind] || 'i');
    var count = items.filter(function (o) { return o.kind === kind; }).length;
    if (kind === 'sticky') return { id: id, kind: kind, x: pb.x, y: pb.y, w: 200, h: 200, color: STICKY_COLORS[count % STICKY_COLORS.length][0], rot: [-0.6, 0.5, -0.3, 0.7][count % 4], style: 'body', text: '' };
    if (kind === 'text') return { id: id, kind: kind, x: pb.x, y: pb.y, style: 'body', color: '#111114', text: '' };
    if (kind === 'frame') return { id: id, kind: kind, x: pb.x, y: pb.y, w: 640, h: 400, label: 'Frame ' + (count + 1), fill: '#F8F8F9' };
    if (kind === 'shape') {
      var sh = SHAPE_BY_ID[s.shapeKind] || SHAPES[0];
      return { id: id, kind: 'shape', shape: sh.id, x: pb.x, y: pb.y, w: sh.w, h: sh.h, fill: '#D0D0D0', style: 'body', align: 'center', text: '' };
    }
    return { id: id, kind: 'sticker', sticker: s.stickerId || 'heart', x: pb.x, y: pb.y, w: 88, h: 88 };
  }

  startPan(e) {
    this.drag = { mode: 'pan', sx: e.clientX, sy: e.clientY, ox: this.state.pan.x, oy: this.state.pan.y };
    this.capture(e);
    this.setState({ panning: true });
  }

  startPen(e, p, items) {
    var id = this.newId('ink');
    this.drag = { mode: 'pen', id: id };
    this.capture(e);
    this.setState({ items: items.concat([{ id: id, kind: 'pen', x: p.x, y: p.y, pts: [[0, 0]], color: this.state.ink, weight: 5 }]), selected: null });
  }

  startConnector(e, from, p, items) {
    var byId = index(items), start = { x: this.snapV(p.x), y: this.snapV(p.y) };
    if (from && byId[from.id]) start = sidePoint(bounds(byId[from.id], byId), from.side);
    var id = this.newId('e');
    var color = this.state.tool === 'draw' ? this.state.ink : '#111111';
    this.drag = { mode: 'connect', id: id, fromId: from ? from.id : null };
    this.capture(e);
    this.setState({ items: items.concat([{ id: id, kind: 'arrow', from: from, to: null, x1: start.x, y1: start.y, x2: p.x, y2: p.y, color: color, weight: 2, dash: false, head: !(this.state.tool === 'draw' && this.state.lineOnly) }]), selected: id, editing: null, popover: null });
  }

  hitItem(p, excludeId, items, byId, m) {
    m = m || 8;
    var c = items.filter(function (o) { return CONNECTABLE[o.kind] && o.id !== excludeId; });
    for (var pass = 0; pass < 2; pass++) {
      for (var i = c.length - 1; i >= 0; i--) {
        var o = c[i];
        if ((o.kind === 'frame') !== (pass === 1)) continue;
        var b = bounds(o, byId);
        if (p.x >= b.x - m && p.x <= b.x + b.w + m && p.y >= b.y - m && p.y <= b.y + b.h + m) return o;
      }
    }
    return null;
  }

  boardDown(e) {
    if (this.ro() && this.state.tool !== 'select' && this.state.tool !== 'hand') this.setState({ tool: 'select', panel: null });
    if (e.button === 2) return;
    this.focusBoard();
    var s = this.state, tool = s.tool;
    var items = this.cleanItems(null);
    var patch = { items: items, zoomMenu: false, bgMenu: false, popover: null, editing: null, menu: null, kc: null, acctMenu: null, help: false };
    var p = this.toWorld(e), ar = s.area, panning = tool === 'hand' || e.button === 1;
    var inArea = !!ar && p.x >= ar.x && p.x <= ar.x + ar.w && p.y >= ar.y && p.y <= ar.y + ar.h;
    // The kept box goes away only when the person clicks somewhere else. Panning does not count.
    if (ar && !inArea && !panning) patch.area = null;
    if (s.chat && !s.welcome && !(s.prompt || '').trim() && !(inArea || (ar && panning))) { patch.chat = false; patch.mic = false; }
    if (s.panel) patch.panel = null;
    if (panning) { this.setState(patch); this.startPan(e); return; }
    if (tool === 'select') {
      var keep = e.shiftKey ? this.selIds() : [];
      if (!e.shiftKey) { patch.selected = null; patch.multi = []; }
      this.drag = { mode: 'marquee', x0: p.x, y0: p.y, add: keep, moved: false };
      this.capture(e);
      this.setState(patch);
      return;
    }
    if (tool === 'draw') {
      patch.welcome = false;
      this.setState(patch);
      if (s.drawMode === 'pen') this.startPen(e, p, items); else this.startConnector(e, null, p, items);
      return;
    }
    if (tool === 'sticker' && !s.stickerId) { this.setState(patch); return; }
    var it = this.create(tool, p, items);
    patch.items = items.concat([it]);
    patch.selected = it.id;
    if (!s.toolLock) patch.tool = 'select';
    if (it.kind === 'text' || it.kind === 'sticky' || (it.kind === 'node' && editable(it))) patch.editing = it.id;
    patch.welcome = false;
    this.setState(patch);
  }

  boardDbl(e) {
    if (this.ro()) { if (e && e.stopPropagation) e.stopPropagation(); return; }
    if (this.state.tool !== 'select') return;
    var p = this.toWorld(e), items = this.cleanItems(null);
    var it = this.create('text', p, items);
    this.setState({ items: items.concat([it]), selected: it.id, editing: it.id, popover: null, welcome: false });
  }

  itemDown(it, e) {
    e.stopPropagation();
    if (e.button === 2) return;
    if (this.state.menu) this.setState({ menu: null });
    var s = this.state, tool = s.tool;
    if (tool === 'hand' || e.button === 1) { this.focusBoard(); this.startPan(e); return; }
    if (s.area) {
      var ab = bounds(it, index(s.items)), ar = s.area;
      if (!(ab.x < ar.x + ar.w && ab.x + ab.w > ar.x && ab.y < ar.y + ar.h && ab.y + ab.h > ar.y)) this.setState({ area: null });
    }
    if (tool === 'draw') {
      this.focusBoard();
      var p = this.toWorld(e), items0 = this.cleanItems(null);
      if (s.drawMode === 'pen') this.startPen(e, p, items0);
      else if (CONNECTABLE[it.kind]) this.startConnector(e, { id: it.id, side: it.kind === 'node' ? 'right' : nearestSide(bounds(it, index(items0)), p) }, p, items0);
      else this.startConnector(e, null, p, items0);
      return;
    }
    if (tool !== 'select') { this.boardDown(e); return; }
    if (s.editing === it.id) return;
    if (e.button === 2) return;
    var items = this.cleanItems(it.id), byId = index(items);
    this.focusBoard();
    var cur = this.selIds();
    var members = it.group ? items.filter(function (o) { return o.group === it.group; }).map(function (o) { return o.id; }) : [it.id];
    if (e.shiftKey) {
      var next = cur.slice(), has = next.indexOf(it.id) >= 0;
      members.forEach(function (id) { var i = next.indexOf(id); if (has) { if (i >= 0) next.splice(i, 1); } else if (i < 0) next.push(id); });
      this.setState({ items: items, multi: next.length > 1 ? next : [], selected: next.length ? (has ? next[next.length - 1] : it.id) : null, editing: null, popover: null, zoomMenu: false, kc: null });
      return;
    }
    var inMulti = cur.length > 1 && cur.indexOf(it.id) >= 0;
    var moveIds = inMulti ? cur : members;
    var wasSel = moveIds.length === 1 && s.selected === it.id;
    var base = { items: items, selected: it.id, multi: moveIds.length > 1 ? moveIds : [], editing: null, popover: null, zoomMenu: false, kc: null };
    if (it.locked) { this.setState(base); return; }
    var group = [], seen = {};
    var addSnap = function (o) {
      if (!o || seen[o.id] || o.locked) return;
      if (o.kind === 'arrow') {
        if (moveIds.length > 1 && (o.from || o.to)) return;
        var a = endPoint(o, 'a', byId).p, b = endPoint(o, 'b', byId).p;
        seen[o.id] = 1;
        group.push(Object.assign({}, o, { from: null, to: null, x1: a.x, y1: a.y, x2: b.x, y2: b.y }));
        return;
      }
      seen[o.id] = 1;
      group.push(Object.assign({}, o));
      if (o.kind !== 'frame') return;
      items.forEach(function (c) {
        if (seen[c.id] || c.kind === 'frame' || c.locked) return;
        if (c.kind === 'arrow' && (c.from || c.to)) return;
        var bb = bounds(c, byId), cx = bb.x + bb.w / 2, cy = bb.y + bb.h / 2;
        if (cx > o.x && cx < o.x + o.w && cy > o.y && cy < o.y + o.h) { seen[c.id] = 1; group.push(Object.assign({}, c)); }
      });
    };
    addSnap(it);
    moveIds.forEach(function (id) { addSnap(byId[id]); });
    if (!group.length) { this.setState(base); return; }
    this.drag = { mode: 'move', id: it.id, sx: e.clientX, sy: e.clientY, group: group, moved: false, wasSel: wasSel, collapse: inMulti && !it.group };
    this.capture(e);
    this.setState(base);
  }

  itemDbl(it, e) {
    if (this.ro()) { if (e && e.stopPropagation) e.stopPropagation(); return; }
    e.stopPropagation();
    if (this.state.tool !== 'select' || it.locked || !editable(it)) return;
    this.setState({ selected: it.id, multi: [], editing: it.id, popover: null });
  }

  handleDown(id, corner, e) {
    if (this.ro()) { if (e && e.stopPropagation) e.stopPropagation(); return; }
    e.stopPropagation();
    var it = this.find(id);
    if (!it) return;
    this.drag = { mode: 'resize', id: id, corner: corner, kind: it.kind, sx: e.clientX, sy: e.clientY, ob: { x: it.x, y: it.y, w: it.w, h: it.h } };
    this.capture(e);
    this.setState({ popover: null });
  }

  endDown(id, which, e) {
    if (this.ro()) { if (e && e.stopPropagation) e.stopPropagation(); return; }
    e.stopPropagation();
    var it = this.find(id);
    if (!it || it.kind !== 'arrow' || it.locked) return;
    this.focusBoard();
    this.drag = { mode: 'end', id: id, which: which, ref0: which === 'a' ? it.from : it.to, via0: it.via, reject: null, sx: e.clientX, sy: e.clientY, moved: false };
    this.capture(e);
    this.setState({ popover: null, menu: null });
  }

  segDown(id, j, e) {
    if (this.ro()) { if (e && e.stopPropagation) e.stopPropagation(); return; }
    e.stopPropagation();
    var it = this.find(id);
    if (!it || it.kind !== 'arrow' || it.locked) return;
    var pts = arrowPts(it, index(this.state.items)), m = pts.length - 1;
    if (m < 1 || j < 0 || j >= m) return;
    var via = viaFrom(pts), c = via.c.slice(), a = pts[j], b = pts[j + 1], horiz = Math.abs(a[1] - b[1]) < 0.5, cur = horiz ? a[1] : a[0], idx;
    var stub = function (p, q) { var ax = horiz ? 0 : 1, len = q[ax] - p[ax]; return p[ax] + (len < 0 ? -1 : 1) * Math.min(18, Math.abs(len) / 2); };
    if (m === 1) { c = [stub(a, b), cur, stub(b, a)]; idx = 1; }
    else if (j === 0) { c = [stub(a, b), cur].concat(c); idx = 1; }
    else if (j === m - 1) { idx = c.length; c = c.concat([cur, stub(b, a)]); }
    else idx = j - 1;
    this.focusBoard();
    this.drag = { mode: 'seg', id: id, o: via.o, c: c, idx: idx, horiz: horiz, sx: e.clientX, sy: e.clientY, moved: false };
    this.capture(e);
    this.setState({ popover: null, menu: null });
  }

  resetRoute(id, e) {
    if (e && e.stopPropagation) e.stopPropagation();
    var it = this.find(id);
    if (it && it.via) this.setState({ items: this.state.items.map(function (o) { return o.id === id ? Object.assign({}, o, { via: undefined }) : o; }), menu: null });
  }

  dotDown(id, side, e) {
    if (this.ro()) { if (e && e.stopPropagation) e.stopPropagation(); return; }
    e.stopPropagation();
    this.focusBoard();
    var items = this.cleanItems(null), byId = index(items);
    if (!byId[id]) return;
    this.startConnector(e, { id: id, side: side }, sidePoint(bounds(byId[id], byId), side), items);
  }

  move(e) {
    if (this.ro() && this.drag && this.drag.mode !== 'pan' && this.drag.mode !== 'marquee') return;
    var d = this.drag;
    var s = this.state, z = s.zoom;
    var r0 = this.rect();
    var bigBot = s.welcome;
    var ldx = e.clientX - (bigBot ? r0.left + r0.width / 2 : r0.left + 42), ldy = e.clientY - (bigBot ? r0.top + r0.height * 0.34 : r0.top + 40);
    var ld = Math.hypot(ldx, ldy) || 1, lm = Math.min(1, ld / 160);
    var lx = Math.round(ldx / ld * lm * 4) / 4, ly = Math.round(ldy / ld * lm * 4) / 4;
    if (lx !== s.look.x || ly !== s.look.y) this.setState({ look: { x: lx, y: ly } });
    if (!d) {
      var gk = s.tool === 'sticker' ? (s.stickerId ? 'sticker' : null) : (['sticky', 'text', 'frame', 'shape', 'node'].indexOf(s.tool) >= 0 ? s.tool : null);
      var onBoard = this.boardEl && e.target && this.boardEl.contains(e.target);
      if (!gk || !onBoard || s.menu || s.panel) { if (s.ghost) this.setState({ ghost: null }); return; }
      var gb = this.placeBox(gk, this.toWorld(e));
      if (!s.ghost || s.ghost.kind !== gk || s.ghost.x !== gb.x || s.ghost.y !== gb.y || s.ghost.w !== gb.w) this.setState({ ghost: gb });
      return;
    }
    if (d.mode === 'marquee') {
      var mq = this.toWorld(e);
      if (!d.moved && Math.abs(mq.x - d.x0) + Math.abs(mq.y - d.y0) < 4 / z) return;
      d.moved = true;
      var mr = { x: Math.min(d.x0, mq.x), y: Math.min(d.y0, mq.y), w: Math.abs(mq.x - d.x0), h: Math.abs(mq.y - d.y0) };
      var mById = index(s.items), hit = d.add.slice();
      s.items.forEach(function (o) {
        var b = bounds(o, mById), inside;
        if (o.kind === 'frame') inside = b.x >= mr.x && b.y >= mr.y && b.x + b.w <= mr.x + mr.w && b.y + b.h <= mr.y + mr.h;
        else inside = b.x < mr.x + mr.w && b.x + b.w > mr.x && b.y < mr.y + mr.h && b.y + b.h > mr.y;
        if (inside && !(o.kind === 'arrow' && (o.from || o.to)) && hit.indexOf(o.id) < 0) hit.push(o.id);
      });
      this.setState({ marquee: mr, multi: hit.length > 1 ? hit : [], selected: hit.length ? hit[hit.length - 1] : null });
      return;
    }
    if (d.mode === 'pan') { this.setState({ pan: { x: d.ox + e.clientX - d.sx, y: d.oy + e.clientY - d.sy } }); return; }
    if (d.mode === 'pen') {
      var p = this.toWorld(e);
      this.setState({ items: s.items.map(function (it) {
        if (it.id !== d.id) return it;
        var last = it.pts[it.pts.length - 1], rx = p.x - it.x, ry = p.y - it.y;
        if (Math.abs(last[0] - rx) + Math.abs(last[1] - ry) < 2) return it;
        return Object.assign({}, it, { pts: it.pts.concat([[rx, ry]]) });
      }) });
      return;
    }
    if (d.mode === 'connect') {
      var q = this.toWorld(e), byId = index(s.items);
      var tgt = this.hitItem(q, d.fromId, s.items, byId);
      if (tgt && !canTake(tgt, d.fromId ? byId[d.fromId] : null)) { d.reject = tgt; tgt = null; } else d.reject = null;
      this.update(d.id, { x2: tgt ? q.x : this.snapV(q.x), y2: tgt ? q.y : this.snapV(q.y), to: tgt ? { id: tgt.id, side: tgt.kind === 'node' ? 'left' : nearestSide(bounds(tgt, byId), q) } : null });
      return;
    }
    if (d.mode === 'end') {
      if (!d.moved && Math.abs(e.clientX - d.sx) + Math.abs(e.clientY - d.sy) < 3) return;
      d.moved = true;
      var eq = this.toWorld(e), eById = index(s.items), ea = eById[d.id];
      if (!ea) return;
      var oRef = d.which === 'a' ? ea.to : ea.from, oIt = oRef ? eById[oRef.id] : null;
      var et = this.hitItem(eq, oRef ? oRef.id : null, s.items, eById, AGAP + 10);
      d.reject = null;
      if (et && d.which === 'b' && !canTake(et, oIt)) { d.reject = { tgt: et, src: oIt }; et = null; }
      else if (et && d.which === 'a' && oIt && !canTake(oIt, et)) { d.reject = { tgt: oIt, src: et }; et = null; }
      var nRef = et ? { id: et.id, side: et.kind === 'node' ? (d.which === 'a' ? 'right' : 'left') : nearestSide(bounds(et, eById), eq) } : null;
      var pr = d.ref0, changed = !!nRef && (!pr || pr.id !== nRef.id || pr.side !== nRef.side);
      var ep = d.which === 'a' ? { from: nRef, x1: this.snapV(eq.x), y1: this.snapV(eq.y) } : { to: nRef, x2: this.snapV(eq.x), y2: this.snapV(eq.y) };
      ep.via = changed ? undefined : d.via0;
      this.update(d.id, ep);
      return;
    }
    if (d.mode === 'seg') {
      if (!d.moved && Math.abs(e.clientX - d.sx) + Math.abs(e.clientY - d.sy) < 3) return;
      d.moved = true;
      var sq = this.toWorld(e), sc = d.c.slice();
      sc[d.idx] = this.snapV(d.horiz ? sq.y : sq.x);
      this.update(d.id, { via: { o: d.o, c: sc } });
      return;
    }
    if (d.mode === 'resize') {
      var o = d.ob, dx = (e.clientX - d.sx) / z, dy = (e.clientY - d.sy) / z;
      var left = d.corner.indexOf('l') >= 0, top = d.corner.indexOf('t') >= 0;
      var x = o.x, y = o.y, w = left ? o.w - dx : o.w + dx, h = top ? o.h - dy : o.h + dy;
      var min = d.kind === 'frame' ? 160 : (d.kind === 'sticker' ? 32 : 40);
      if (d.kind === 'sticker') { var sz = Math.max(min, w, h); w = sz; h = sz; }
      var minW = min, minH = min, rIt = d.kind === 'node' ? this.find(d.id) : null;
      if (rIt) { minW = 200; minH = (NODE_BY[rIt.ntype] || NODE_DEFS[0]).h; }
      w = Math.max(minW, w); h = Math.max(minH, h);
      if (left) x = o.x + o.w - w;
      if (top) y = o.y + o.h - h;
      if (s.snap && d.kind !== 'sticker') {
        if (left) { x = Math.min(this.snapV(x), o.x + o.w - minW); w = o.x + o.w - x; } else { w = Math.max(minW, this.snapV(o.x + w) - o.x); }
        if (top) { y = Math.min(this.snapV(y), o.y + o.h - minH); h = o.y + o.h - y; } else { h = Math.max(minH, this.snapV(o.y + h) - o.y); }
      }
      this.update(d.id, { x: x, y: y, w: w, h: h });
      return;
    }
    if (d.mode === 'move') {
      if (!d.moved && Math.abs(e.clientX - d.sx) + Math.abs(e.clientY - d.sy) < 3) return;
      d.moved = true;
      var mx = (e.clientX - d.sx) / z, my = (e.clientY - d.sy) / z, orig = {};
      if (s.snap) {
        var g0 = d.group[0];
        if (g0.kind === 'pen') { var pbx = ptsBox(g0.pts.map(function (q) { return [g0.x + q[0], g0.y + q[1]]; })); mx = this.snapV(pbx.x + mx) - pbx.x; my = this.snapV(pbx.y + my) - pbx.y; }
        else if (g0.kind === 'arrow') { mx = this.snapV(g0.x1 + mx) - g0.x1; my = this.snapV(g0.y1 + my) - g0.y1; }
        else { mx = this.snapV(g0.x + mx) - g0.x; my = this.snapV(g0.y + my) - g0.y; }
      }
      d.group.forEach(function (g) { orig[g.id] = g; });
      d.viaBase = d.viaBase || {};
      this.setState({ items: s.items.map(function (it) {
        var g = orig[it.id];
        if (!g) {
          if (it.kind !== 'arrow' || !it.from || !it.to || !orig[it.from.id] || !orig[it.to.id]) return it;
          if (!(it.id in d.viaBase)) d.viaBase[it.id] = it.via;
          return d.viaBase[it.id] ? Object.assign({}, it, { via: viaShift(d.viaBase[it.id], mx, my) }) : it;
        }
        if (g.kind === 'arrow') return Object.assign({}, it, { from: g.from, to: g.to, x1: g.x1 + mx, y1: g.y1 + my, x2: g.x2 + mx, y2: g.y2 + my, via: viaShift(g.via, mx, my) });
        return Object.assign({}, it, { x: g.x + mx, y: g.y + my });
      }) });
    }
  }

  up() {
    var d = this.drag;
    this.drag = null;
    if (!d) return;
    if (this.dragBase) { this.pushHist(this.dragBase); this.dragBase = null; this.histAt = Date.now(); }
    if (d.mode === 'marquee') {
      // A real box (not a slip of the hand) stays on the board and asks what to build inside it.
      var box = this.state.marquee, bz = this.state.zoom;
      if (box && box.w * bz >= 48 && box.h * bz >= 48) { this.setState({ marquee: null, area: box }); this.setChat(true); }
      else if (box) this.setState({ marquee: null });
      return;
    }
    if (d.mode === 'move' && !d.moved && d.collapse) { this.setState({ multi: [], selected: d.id, panning: false }); return; }
    if (d.mode === 'move' && !d.moved && d.wasSel) {
      var it = this.find(d.id);
      if (it && editable(it) && !it.locked) { this.setState({ editing: it.id, panning: false }); return; }
    }
    if (d.mode === 'end' && d.reject) {
      var jd = NODE_BY[d.reject.tgt.ntype] || NODE_DEFS[0];
      this.flash(jd.cat === 'info' ? fmt('{0} nodes only send, they have no input', tr(jd.label)) : fmt("{0} can't take {1} as input", tr(jd.label), outType(d.reject.src) || 'context'));
      if (d.ref0) this.update(d.id, d.which === 'a' ? { from: d.ref0, via: d.via0 } : { to: d.ref0, via: d.via0 });
    }
    if (d.mode === 'seg' && d.moved) {
      var sIt = this.find(d.id);
      if (sIt && sIt.via) {
        var sById = index(this.state.items), sp = arrowPts(sIt, sById), auto = arrowPts(Object.assign({}, sIt, { via: undefined }), sById);
        this.update(d.id, { via: samePts(sp, auto) ? undefined : viaFrom(sp) });
      }
    }
    if (d.mode === 'connect') {
      if (d.reject) {
        var rd = NODE_BY[d.reject.ntype] || NODE_DEFS[0], rs = d.fromId ? this.find(d.fromId) : null;
        this.flash(rd.cat === 'info' ? fmt('{0} nodes only send, they have no input', tr(rd.label)) : fmt("{0} can't take {1} as input", tr(rd.label), outType(rs) || 'context'));
      }
      var a = this.find(d.id);
      if (a) {
        var box = ptsBox(arrowPts(a, index(this.state.items)));
        if (!a.to && box.w + box.h < 12) {
          if (a.from) { this.setState({ items: this.removeFrom(this.state.items, [a.id]), selected: null, panning: false }); return; }
          this.update(a.id, { x2: a.x1 + 160, y2: a.y1 });
        }
      }
    }
    this.setState({ panning: false });
  }

  pickTool(id) {
    var s = this.state;
    var patch = { items: this.cleanItems(null), editing: null, popover: null, zoomMenu: false, bgMenu: false, chat: false, mic: false, menu: null, ghost: null };
    if (id === 'node') {
      patch.panel = s.panel === 'nodes' ? null : 'nodes';
      if (s.tool !== 'node') patch.tool = 'select';
    } else if (id === 'shape') {
      patch.panel = s.panel === 'shape' ? null : 'shape';
      patch.tool = 'shape';
    } else if (id === 'sticker') {
      if (s.panel === 'sticker') { patch.panel = null; }
      else { patch.panel = 'sticker'; patch.stickerQuery = ''; if (s.tool !== 'sticker') patch.tool = 'select'; }
    } else {
      patch.tool = id;
      patch.panel = null;
    }
    if (id !== 'select') patch.selected = null;
    if (id !== 'select' && id !== 'hand') patch.welcome = false;
    this.setState(patch);
  }

  setChat(open) {
    var self = this;
    this.setState({ chat: open, mic: false, zoomMenu: false, panel: open ? null : this.state.panel });
    if (open) setTimeout(function () { try { if (self.inputEl) self.inputEl.focus({ preventScroll: true }); } catch (err) {} }, 80);
    else this.focusBoard();
  }

  submitPrompt(e) {
    if (e && e.preventDefault) e.preventDefault();
    var text = (this.state.prompt || '').trim();
    if (!text) return;
    this.chatStart(text);
  }

  // One chat request: a run of the built-in agent with the board tools.
  // One chat request: a run of the built-in agent with the board tools.
  // Server: the agent runs on the server and streams its board tool calls;
  // each call's items are added as a proposal while it works.
  chatStart(text) {
    var self = this, s = this.state, ids = this.selIds(), items = this.baseForProposal(), byId = index(items);
    if (this.ro()) { this.flash('You can view this board but not change it'); return; }
    this.chatStop();
    var selIt = ids.length === 1 ? byId[ids[0]] : null, area = s.area;
    var inside = area ? items.filter(function (o) { if (o.kind === 'arrow') return false; var b = bounds(o, byId); return b.x < area.x + area.w && b.x + b.w > area.x && b.y < area.y + area.h && b.y + b.h > area.y; }) : [];
    var mode = chatModeOf(text, inside.length ? inside : items, selIt, s.chatMode);
    var fromY = inside.reduce(function (m, o) { var b = bounds(o, byId); return Math.max(m, b.y + b.h + 40); }, 0);
    var tok = ++this.chatTok, ctrl = new AbortController();
    this.chatCtrl = ctrl;
    this.chatAt = null;
    this.chatRunId = null;
    this.setState({ items: items, proposal: null, chatRun: { text: text, mode: mode, calls: [], n: 0, done: false, note: '', sim: false }, prompt: '', mic: false, welcome: false, selected: selIt ? selIt.id : null, multi: [], editing: null, popover: null, menu: null });
    this.setMood('thinking');
    var body = {
      harness: 'pi', surface: 'chat', instruction: text, inputs: [], permissions: Object.assign({ board: 'allow' }, s.perms), workspace: s.boardId || '',
      chat: { mode: mode, board: items, selected: ids, area: area ? { x: Math.round(area.x), y: Math.round(area.y + (fromY > area.y ? fromY - area.y : 0)), w: Math.round(area.w), h: Math.round(area.h), contains: inside.map(function (o) { return o.id; }) } : null, tools: BOARD_TOOLS.map(function (t) { return t[0]; }) }
    };
    var note = '', fit = false, failed = '';
    agentApi.run(body, function (ev) {
      if (self.chatTok !== tok) return;
      // Events can arrive several at a time, so every change is made on the latest state.
      if (ev.type === 'run') { self.chatRunId = ev.runId; self.setState(function (cur) { return cur.chatRun ? { chatRun: Object.assign({}, cur.chatRun, { sim: ev.simulated }) } : null; }); }
      else if (ev.type === 'permission_request') agentApi.answer(self.chatRunId, ev.requestId, 'allow_once');
      else if (ev.type === 'tool_call') {
        var added = (ev.add || []).map(function (o) { return Object.assign({}, o, { proposed: true }); });
        var spot = added.filter(function (o) { return o.kind !== 'arrow'; })[0];
        if (spot) self.chatAt = spot.id;
        var call = { tool: ev.tool, line: ev.title, add: added };
        self.setState(function (cur) {
          if (self.chatTok !== tok || !cur.chatRun) return null;
          var run = cur.chatRun;
          return { items: added.length ? cur.items.concat(added) : cur.items, chatRun: Object.assign({}, run, { calls: run.calls.concat([call]), n: run.n + 1 }), proposal: added.length || cur.proposal ? { ids: [], note: '' } : null };
        });
      } else if (ev.type === 'result') {
        if (ev.status === 'success' && ev.output && ev.output.value) { note = ev.output.value.note || ''; fit = !!ev.output.value.fit; }
        else failed = ev.error || 'The board agent stopped';
      }
    }, ctrl.signal).catch(function (err) { if (err && err.name !== 'AbortError') failed = String(err.message || err); }).then(function () {
      if (self.chatTok !== tok) return;
      self.chatCtrl = null;
      var ids2 = [];
      self.setState(function (cur) {
        ids2 = cur.items.filter(function (o) { return o.proposed; }).map(function (o) { return o.id; });
        if (failed && !ids2.length) return { chatRun: null, proposal: null };
        return { chatRun: cur.chatRun ? Object.assign({}, cur.chatRun, { done: true, note: note }) : null, proposal: ids2.length ? { ids: ids2, note: note || tr('Proposal') } : null };
      }, function () {
        if (failed && !ids2.length) { self.setMood('idle'); self.flash(failed); return; }
        self.setMood('happy', 1500);
        if (fit && ids2.length) setTimeout(function () { self.zoomFit(); }, 0);
        if (!ids2.length) setTimeout(function () { if (self.chatTok === tok) self.setState({ chatRun: null }); }, 2600);
      });
    });
  }


  chatStop() {
    clearTimeout(this.chatTimer); this.chatTimer = null; this.chatTok = (this.chatTok || 0) + 1; this.chatAt = null;
    if (this.chatCtrl) { this.chatCtrl.abort(); this.chatCtrl = null; }
    if (this.chatRunId) { agentApi.stop(this.chatRunId); this.chatRunId = null; }
  }

  removeSelected() {
    var byId = index(this.state.items);
    var ids = this.selIds().filter(function (id) { return !byId[id].locked; });
    if (!ids.length) return;
    this.setState({ items: this.removeFrom(this.state.items, ids), selected: null, multi: [], editing: null, popover: null, menu: null });
  }

  duplicateSelected() {
    var ids = this.selIds();
    if (!ids.length) return;
    var dd = this.state.snap ? GRID : 24, clones = this.cloneList(this.collect(ids), dd, dd);
    var picked = clones.filter(function (c) { return c.kind !== 'arrow' || clones.length === 1; }).map(function (c) { return c.id; });
    if (!picked.length) picked = clones.map(function (c) { return c.id; });
    this.setState({ items: this.state.items.concat(clones), selected: picked[picked.length - 1], multi: picked.length > 1 ? picked : [], popover: null, editing: null, menu: null });
  }

  reorder(toFront) {
    var sel = this.state.selected, it = this.find(sel);
    if (!it) return;
    var rest = this.state.items.filter(function (o) { return o.id !== sel; });
    this.setState({ items: toFront ? rest.concat([it]) : [it].concat(rest), popover: null, menu: null });
  }

  toggleList() {
    var it = this.find(this.state.selected);
    if (!it) return;
    var lines = (it.text || '').split('\n');
    var text = it.list ? lines.map(function (l) { return l.replace(/^• /, ''); }).join('\n') : lines.map(function (l) { return '• ' + l.replace(/^• /, ''); }).join('\n');
    this.patchSel({ list: !it.list, text: text });
  }

  openMenu(e, it) {
    e.preventDefault();
    e.stopPropagation();
    var r = this.rect(), p = this.toWorld(e);
    this.focusBoard();
    this.setState({
      items: this.cleanItems(it ? it.id : null),
      menu: { x: e.clientX - r.left, y: e.clientY - r.top, wx: p.x, wy: p.y, id: it ? it.id : null },
      selected: it ? it.id : null, editing: null, popover: null, zoomMenu: false, panel: null, kc: null,
      multi: it ? (this.selIds().length > 1 && this.selIds().indexOf(it.id) >= 0 ? this.selIds() : (it.group ? this.state.items.filter(function (o) { return o.group === it.group; }).map(function (o) { return o.id; }) : [])) : []
    });
  }

  shiftItem(it, dx, dy) {
    if (it.kind === 'arrow') return Object.assign({}, it, { x1: it.x1 + dx, y1: it.y1 + dy, x2: it.x2 + dx, y2: it.y2 + dy, via: viaShift(it.via, dx, dy) });
    return Object.assign({}, it, { x: it.x + dx, y: it.y + dy });
  }

  clipFrom(ids) {
    var byId = index(this.state.items);
    return this.collect(ids).map(function (o) {
      var c = JSON.parse(JSON.stringify(o));
      if (c.kind === 'arrow') { var a = endPoint(o, 'a', byId).p, b = endPoint(o, 'b', byId).p; c.x1 = a.x; c.y1 = a.y; c.x2 = b.x; c.y2 = b.y; }
      return c;
    });
  }

  copySel() {
    var ids = this.selIds();
    if (!ids.length) return;
    this.setState({ clip: this.clipFrom(ids), menu: null });
    this.flash(ids.length > 1 ? fmt('Copied {0} items', ids.length) : 'Copied');
  }

  cutSel() {
    var byId = index(this.state.items);
    var ids = this.selIds().filter(function (id) { return !byId[id].locked; });
    if (!ids.length) return;
    this.setState({ clip: this.clipFrom(ids), items: this.removeFrom(this.state.items, ids), selected: null, multi: [], editing: null, popover: null, menu: null });
  }

  paste(at, override) {
    var self = this, list = override || this.state.clip;
    if (!list || !list.length) return;
    var ref = index(this.state.items.concat(list)), minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
    list.forEach(function (o) { var b = bounds(o, ref); minx = Math.min(minx, b.x); miny = Math.min(miny, b.y); maxx = Math.max(maxx, b.x + b.w); maxy = Math.max(maxy, b.y + b.h); });
    var dd = this.state.snap ? GRID : 24, dx = dd, dy = dd;
    if (at) { dx = at.x - (minx + maxx) / 2; dy = at.y - (miny + maxy) / 2; }
    if (this.state.snap) { dx = this.snapV(minx + dx) - minx; dy = this.snapV(miny + dy) - miny; }
    var clones = this.cloneList(list, dx, dy);
    var picked = clones.filter(function (c) { return c.kind !== 'arrow' || clones.length === 1; }).map(function (c) { return c.id; });
    if (!picked.length) picked = clones.map(function (c) { return c.id; });
    var next = { items: this.state.items.concat(clones), selected: picked[picked.length - 1], multi: picked.length > 1 ? picked : [], editing: null, popover: null, menu: null, tool: 'select', panel: null, welcome: false };
    if (!at && !override) next.clip = list.map(function (o) { return self.shiftItem(o, dx, dy); });
    this.setState(next);
  }

  toggleLockSel() {
    var it = this.find(this.state.selected);
    if (!it) return;
    this.update(it.id, { locked: !it.locked });
    this.setState({ menu: null, popover: null });
  }

  addAt(kind, at, ntype) {
    var items = this.cleanItems(null), it = this.create(kind, at, items, ntype);
    this.setState({ items: items.concat([it]), selected: it.id, editing: (kind === 'text' || kind === 'sticky' || (kind === 'node' && editable(it))) ? it.id : null, menu: null, tool: 'select', welcome: false });
  }

  flash(msg) {
    var self = this;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.setState({ toast: tr(msg) });
    this.toastTimer = setTimeout(function () { self.setState({ toast: '' }); }, 1600);
  }

  renderMenu(byId) {
    var self = this, s = this.state, mn = s.menu;
    var mac = this.isMac;
    var kb = function (macK, winK) { return mac ? macK : winK; };
    var it = mn.id ? byId[mn.id] : null;
    var rows = [];
    var sep = function () { rows.push({ sep: true, item: false }); };
    var add = function (label, kbd, fn, opts) {
      opts = opts || {};
      var dis = !!opts.disabled;
      rows.push({
        sep: false, item: true, label: label, kbd: kbd, disabled: dis,
        pick: function () { if (dis) return; self.setState({ menu: null }); fn(); },
        style: dis ? 'color: #A4A5AB;' : (opts.danger ? 'color: #B42318;' : ''),
        kbdStyle: dis ? 'color: #B8B9BE;' : (opts.danger ? 'color: #B42318;' : '')
      });
    };
    var at = { x: mn.wx, y: mn.wy };
    var mIds = this.selIds();
    if (mIds.length > 1) {
      var anyGroup = mIds.some(function (id) { return byId[id] && byId[id].group; });
      add('Cut', kb('⌘X', 'Ctrl+X'), function () { self.cutSel(); });
      add('Copy', kb('⌘C', 'Ctrl+C'), function () { self.copySel(); });
      add('Paste', kb('⌘V', 'Ctrl+V'), function () { self.paste(at); }, { disabled: !s.clip });
      add('Duplicate', kb('⌘D', 'Ctrl+D'), function () { self.duplicateSelected(); });
      sep();
      add('Group', kb('⌘G', 'Ctrl+G'), function () { self.group(); });
      add('Ungroup', kb('⇧⌘G', 'Ctrl+Shift+G'), function () { self.ungroup(); }, { disabled: !anyGroup });
      add('Tidy up', '', function () { self.tidy(); });
      add('Save to library', '', function () { self.saveToLibrary(); });
      sep();
      add('Delete', kb('⌫', 'Del'), function () { self.removeSelected(); }, { danger: true });
    } else if (it) {
      if (CONNECTABLE[it.kind]) add('Connect to…', 'C', function () { self.kcStart(); });
      if (it.kind === 'arrow' && it.via && !it.locked) add('Reset bends', '', function () { self.resetRoute(it.id); });
      add('Save to library', '', function () { self.saveToLibrary(); });
      add(it.locked ? 'Unlock' : 'Lock', kb('⇧⌘L', 'Ctrl+Shift+L'), function () { self.toggleLockSel(); });
      if (it.kind === 'node' && canRunDef(NODE_BY[it.ntype] || NODE_DEFS[0])) add('Run this node', '', function () { self.runNode(it.id); });
      if (it.kind === 'node') add('Inspect node', '', function () { self.setState({ inspect: it.id, hzSel: null, menu: null }); });
      if (it.kind === 'node' && NODE_BY[it.ntype]) add(s.pins.indexOf(it.ntype) >= 0 ? 'Unpin from the toolbar' : 'Pin to the toolbar', '', function () { self.togglePin(it.ntype); });
      if (it.kind === 'node' && s.out[it.id] && s.out[it.id].view) add('Open the full view', '', function () { self.openViewer(it.id); });
      sep();
      add('Cut', kb('⌘X', 'Ctrl+X'), function () { self.cutSel(); }, { disabled: !!it.locked });
      add('Copy', kb('⌘C', 'Ctrl+C'), function () { self.copySel(); });
      add('Paste', kb('⌘V', 'Ctrl+V'), function () { self.paste(at); }, { disabled: !s.clip });
      add('Duplicate', kb('⌘D', 'Ctrl+D'), function () { self.duplicateSelected(); });
      sep();
      add('Bring to front', ']', function () { self.reorder(true); });
      add('Send to back', '[', function () { self.reorder(false); });
      if (editable(it) && !it.locked) add(it.kind === 'frame' ? 'Rename' : 'Edit text', 'Enter', function () { self.setState({ editing: it.id }); });
      sep();
      add('Delete', kb('⌫', 'Del'), function () { self.removeSelected(); }, { danger: true, disabled: !!it.locked });
      sep();
      add('Ask AI', kb('⌘K', 'Ctrl+K'), function () { self.setChat(true); });
    } else {
      add('Paste here', kb('⌘V', 'Ctrl+V'), function () { self.paste(at); }, { disabled: !s.clip });
      sep();
      add('Add AI step', 'N', function () { self.addAt('node', at, 'llm'); });
      add('Add prompt', '', function () { self.addAt('node', at, 'prompt'); });
      add('Add sticky note', 'S', function () { self.addAt('sticky', at); });
      add('Add text', 'T', function () { self.addAt('text', at); });
      add(fmt('Add shape: {0}', tr((SHAPE_BY_ID[s.shapeKind] || SHAPES[0]).label)), 'R', function () { self.addAt('shape', at); });
      add('Add frame', 'F', function () { self.addAt('frame', at); });
      sep();
      add('Zoom to fit', '1', function () { self.zoomFit(); });
      add('Zoom to 100%', '0', function () { self.zoomTo(1); });
      sep();
      add(s.aiOpen ? 'Close AI view' : 'AI view', '', function () { self.setState({ aiOpen: !self.state.aiOpen, menu: null, zoomMenu: false, bgMenu: false }); });
      add('Node market', '', function () { self.openMarket('browse'); });
      add('Backend interfaces', '', function () { self.setState({ apiOpen: true, menu: null }); });
      add('Ask AI', kb('⌘K', 'Ctrl+K'), function () { self.setChat(true); });
    }
    var r = this.rect(), mw = 264;
    var nItems = rows.filter(function (x) { return x.item; }).length, nSep = rows.length - nItems;
    var mh = nItems * 40 + nSep * 13 + 14;
    var x = mn.x, y = mn.y;
    if (x + mw > r.width - 8) x = Math.max(8, x - mw);
    if (y + mh > r.height - 8) y = Math.max(8, r.height - mh - 8);
    return {
      show: true,
      label: it ? 'Item actions' : 'Board actions',
      rows: rows,
      block: function (e) { e.preventDefault(); },
      stop: function (e) { e.stopPropagation(); },
      style: 'position: absolute; left: ' + x + 'px; top: ' + y + 'px; width: ' + mw + 'px; box-sizing: border-box; padding: 6px; border-radius: 16px; z-index: 30; box-shadow: 0 14px 40px rgba(20,20,30,0.16), 0 2px 6px rgba(20,20,30,0.06);'
    };
  }

  settleBot() {
    var self = this;
    clearTimeout(this.botTimer);
    this.botTimer = setTimeout(function () { if (self.state.big) self.setState({ big: false }); }, 1800);
  }

  // A template brings its nodes with it: whatever it uses is put in the Nodes panel.
  nodesFor(items) {
    var s = this.state, shelf = s.shelf.slice(), installed = s.installed.slice();
    (items || []).forEach(function (o) {
      var d = o.kind === 'node' ? NODE_BY[o.ntype] : null;
      if (!d) return;
      if (d.pkg) { if (installed.indexOf(d.pkg.id) < 0) installed.push(d.pkg.id); }
      else if (shelf.indexOf(d.t) < 0) shelf.push(d.t);
    });
    return shelf.length === s.shelf.length && installed.length === s.installed.length ? null : { shelf: shelf, installed: installed };
  }

  loadTemplate(name) {
    var self = this, items = tplItems(name);
    this.clearRun();
    var extra = this.nodesFor(items);
    if (extra) this.setState(extra);
    this.setState({ items: items || [], area: null, welcome: !items, big: !items, chat: false, selected: null, editing: null, popover: null, menu: null, panel: null, tool: 'select', running: false, mood: 'idle', pan: { x: 160, y: 96 }, zoom: 1, out: {}, inspect: null, hz: {}, openNode: null, openAuto: false, paused: false, pick: null, kept: {}, hzSel: null, scrub: null, compare: null });
    if (items) setTimeout(function () { self.zoomFit(); }, 0);
  }

  setMood(m, ms) {
    var self = this;
    clearTimeout(this.moodTimer);
    this.setState({ mood: m });
    if (m === 'idle') this.botNode = null;
    if (ms) this.moodTimer = setTimeout(function () { self.botNode = null; self.setState({ mood: 'idle' }); }, ms);
  }

  clearRun() {
    this.chatStop(); clearTimeout(this.runTimer); clearTimeout(this.soloTimer); clearTimeout(this.hzTimer); clearTimeout(this.foldTimer);
    var bt = this.hzBatch;
    if (bt) Object.keys(bt.runs).forEach(function (id) { var r = bt.runs[id]; if (r.ctrl) r.ctrl.abort(); if (r.runId) agentApi.stop(r.runId); });
    this.runQ = null; this.hzBatch = null; this.pickAfter = null; this.botNode = null; this.runGen++;
  }

  runFlow() {
    if (this.ro()) { this.flash('You can view this board but not change it'); return; }
    if (this.state.proposal && this.state.items.some(function (o) { return o.proposed; })) { this.flash('Accept or reject the proposal first'); return; }
    var self = this, items = this.cleanItems(null), G = flowGraph(items), byId = index(items);
    var order = G.order.filter(function (id) { return byId[id].kind === 'node'; });
    if (!order.length) { this.flash('Connect two nodes to make a flow'); return; }
    this.clearRun();
    clearTimeout(this.moodTimer);
    var inRun = {};
    order.forEach(function (id) { inRun[id] = 1; });
    this.runQ = order.slice();
    this.runCount = 0;
    this.botNode = order[0];
    this.setState({ items: items.map(function (it) { return inRun[it.id] ? Object.assign({}, it, { status: 'queued' }) : it; }), running: true, runDone: 0, runTotal: order.length, mood: 'working', menu: null, popover: null, editing: null, welcome: false, out: {}, hz: {}, kept: {}, pick: null, paused: false, scrub: null, hzSel: null, compare: null });
    this.runTimer = setTimeout(function () { self.stepRun(); }, 250);
  }

  stepRun() {
    var self = this;
    if (!this.runQ) return;
    if (!this.runQ.length) { this.finishRun(); return; }
    var id = this.runQ.shift(), it = this.find(id);
    if (!it) { this.runCount++; this.stepRun(); return; }
    this.botNode = id;
    if (it.ntype === 'gate') { this.setState({ items: setStatus(this.state.items, (function () { var p = {}; p[id] = 'waiting'; return p; })()), mood: 'waiting' }); return; }
    if (isHarness(it)) {
      var ids = [id];
      if (it.opt) {
        var q = this.runQ, mates = this.state.items.filter(function (o) { return o.kind === 'node' && o.opt === it.opt && (o.id === id || q.indexOf(o.id) >= 0); }).map(function (o) { return o.id; });
        this.runQ = q.filter(function (x) { return mates.indexOf(x) < 0; });
        if (mates.length) ids = mates;
      }
      this.hzStart(ids, 'queue');
      return;
    }
    this.execNode(id, 'queue');
  }

  // What flows into a node right now: the outputs of the nodes linked to it.
  inputsFor(id) {
    var s = this.state, items = s.items, G = flowGraph(items), byId = index(items), list = [];
    (G.ins[id] || []).forEach(function (uid) {
      var u = byId[uid];
      if (!u) return;
      if (u.kind !== 'node') { var tx = itemText(u); if (tx) list.push({ from: uid, type: 'text', value: tx }); return; }
      if (u.opt && s.kept[u.opt] && s.kept[u.opt] !== uid) return;
      var o = s.out[uid];
      if ((NODE_BY[u.ntype] || NODE_DEFS[0]).cat === 'info') { try { o = infoOut(u); } catch (err) { o = null; } }
      if (o && !o.error) { var one = { from: uid, type: o.type, value: o.value }; if ((o.value === null || o.value === undefined) && (o.type === 'image' || o.type === 'video' || (o.type === 'approval' && o.text))) one.label = o.text || ''; list.push(one); }
    });
    return list;
  }

  // Runs one node. cb(error) or cb(null, { type, value, text, sim, meta, logs }).
  // Runs one node. cb(error) or cb(null, { type, value, text, sim, meta, logs }).
  // Server: executeNode() runs it in the page or calls the server, as the node needs.
  nodeRun(it, cb) {
    var def = NODE_BY[it.ntype] || NODE_DEFS[0], t = def.t, inputs;
    try { inputs = def.cat === 'info' ? [] : this.inputsFor(it.id); } catch (err) { cb(err); return; }
    executeNode(it, inputs, this.state.perms, this.services, this.state.boardId || '').then(function (r) {
      var m = r && r.meta;
      if (m && typeof m === 'object') {
        if (t === 'terminal') r.meta = 'exit ' + m.exit;
        else if (t === 'http') r.meta = m.status + ' ' + m.statusText;
        else if (t === 'imagegen' || t === 'videogen') r.meta = m.ratio + (m.seconds ? ' · ' + m.seconds + ' s' : '');
        else r.meta = '';
      }
      cb(null, r);
    }, function (err) { cb(err); });
  }

  execNode(id, after) {
    var self = this, it = this.find(id);
    if (!it) return;
    var quick = (NODE_BY[it.ntype] || NODE_DEFS[0]).cat === 'info', gen = this.runGen, tok = ++this.execSeq, parts = 0, result = null, failure = null;
    this.execTok[id] = tok;
    var sp = {}; sp[id] = 'running';
    var out0 = Object.assign({}, this.state.out);
    delete out0[id];
    this.setState({ items: setStatus(this.state.items, sp), out: out0, mood: 'working' });
    var apply = function () {
      if (self.runGen !== gen || self.execTok[id] !== tok || !self.find(id)) return;
      var out = Object.assign({}, self.state.out), dp = {};
      if (failure) {
        out[id] = { error: String(failure.message || failure) };
        dp[id] = 'error';
        self.failRun(id, out, dp);
        return;
      }
      out[id] = result;
      dp[id] = 'done';
      if (after === 'queue') {
        self.runCount++;
        self.setState({ items: setStatus(self.state.items, dp), out: out, runDone: self.runCount });
        self.runTimer = setTimeout(function () { self.stepRun(); }, 120);
      } else {
        self.setState({ items: setStatus(self.state.items, dp), out: out });
        self.setMood('happy', 1500);
      }
    };
    var part = function () { if (++parts === 2) apply(); };
    setTimeout(part, quick ? 480 : 900);
    this.nodeRun(it, function (err, res) { failure = err || null; result = res || null; part(); });
  }

  failRun(id, out, dp) {
    var wasFlow = this.state.running, msg = out[id].error;
    if (wasFlow) this.clearRun();
    clearTimeout(this.moodTimer);
    this.botNode = null;
    var items = setStatus(this.state.items, dp);
    if (wasFlow) items = items.map(function (o) { return o.kind === 'node' && (o.status === 'queued' || o.status === 'running' || o.status === 'waiting') ? Object.assign({}, o, { status: 'idle' }) : o; });
    this.setState({ items: items, out: out, running: wasFlow ? false : this.state.running, mood: 'idle' });
    this.flash(fmt('#{0} failed: {1}', id, tr(msg)));
  }

  setCfg(id, key, v) {
    var it = this.find(id);
    if (!it) return;
    var cfg = Object.assign({}, it.cfg);
    cfg[key] = v;
    this.update(id, { cfg: cfg });
  }

  approve(id) {
    var self = this, it = this.find(id);
    if (!it || it.ntype !== 'gate' || it.status !== 'waiting') return;
    this.runCount++;
    var ap = {}; ap[id] = 'done';
    this.botNode = this.state.running ? id : null;
    var gIn = this.inputsFor(id), gOut = Object.assign({}, this.state.out);
    gOut[id] = { type: 'approval', value: gIn.length ? gIn[0].value : null, text: gIn.map(function (i) { return showVal(i.value) || i.label || ''; }).filter(Boolean).join('\n\n') };
    this.setState({ out: gOut });
    this.setState({ items: setStatus(this.state.items, ap), mood: this.state.running ? 'working' : 'idle', runDone: this.runCount });
    if (this.runQ) this.runTimer = setTimeout(function () { self.stepRun(); }, 200);
  }

  finishRun() {
    this.runQ = null;
    this.setState({ running: false });
    this.setMood('happy', 2200);
  }

  stopRun() {
    this.clearRun();
    clearTimeout(this.moodTimer);
    var hz = {}, old = this.state.hz;
    Object.keys(old).forEach(function (k) { hz[k] = old[k].pend ? Object.assign({}, old[k], { pend: false }) : old[k]; });
    this.setState({ hz: hz, pick: null, paused: false, scrub: null, running: false, mood: 'idle', items: this.state.items.map(function (it) { return it.kind === 'node' && (it.status === 'queued' || it.status === 'running' || it.status === 'waiting') ? Object.assign({}, it, { status: 'idle' }) : it; }) });
  }

  runNode(id) {
    if (this.ro()) { this.flash('You can view this board but not change it'); return; }
    var self = this;
    if (this.state.running) { this.flash('A flow is already running'); return; }
    var solo = this.find(id);
    if (!solo) return;
    if (this.hzBatch || this.state.pick) { this.flash('A flow is already running'); return; }
    clearTimeout(this.soloTimer);
    clearTimeout(this.moodTimer);
    this.botNode = id;
    if (isHarness(solo)) { this.setState({ welcome: false, menu: null }); this.hzStart([id], 'solo'); return; }
    this.setState({ welcome: false, menu: null });
    this.execNode(id, 'solo');
  }

  // Server: each agent step runs on the server. Its tool calls stream in and are
  // kept in the shape the tool ring draws: script (what it did), log (allowed
  // or blocked, in order) and pend (waiting for the person).
  hzStart(ids, after, extraStatus) {
    var self = this, s = this.state, items = s.items, byId = index(items), hz = Object.assign({}, s.hz), patch = Object.assign({}, extraStatus || {});
    ids.forEach(function (id) { hz[id] = { harness: (HARNESS[byId[id].ntype] || HARNESS.llm).id, script: [], agent: '', log: [], pend: false, calls: {}, asking: null, live: true }; patch[id] = 'running'; });
    clearTimeout(this.foldTimer);
    this.botNode = ids[Math.floor(ids.length / 2)];
    var gen = ++this.hzGen;
    this.hzBatch = { ids: ids.slice(), rr: 0, after: after, gen: gen, runs: {}, results: {} };
    var open = s.openNode, auto = s.openAuto;
    if (!open || auto || !byId[open]) { open = ids.length === 1 ? ids[0] : null; auto = ids.length === 1; }
    this.setState({ hz: hz, items: setStatus(items, patch), openNode: open, openAuto: auto, paused: false, scrub: null, pick: null, mood: 'working' }, function () {
      ids.forEach(function (id) { self.hzRun(id, gen); });
    });
  }

  hzRun(id, gen) {
    var self = this, s = this.state, bt = this.hzBatch, it = this.find(id);
    if (!bt || bt.gen !== gen || !it) return;
    var items = s.items, G = flowGraph(items), byId = index(items), req;
    try { req = nodeRequest(it, this.inputsFor(id), s.perms, s.boardId || '').body; }
    catch (err) { bt.results[id] = { error: String(err.message || err) }; this.hzCheck(gen); return; }
    var feeds = [], seen = {}, q = (G.outs[id] || []).slice();
    while (q.length) { var n = byId[q.shift()]; if (!n || seen[n.id] || n.kind !== 'node') continue; seen[n.id] = 1; if (n.ntype === 'gate') q = q.concat(G.outs[n.id] || []); else feeds.push(n.ntype); }
    req.context = { text: upText(id, G, byId), feeds: feeds };
    var ctrl = new AbortController(), run = bt.runs[id] = { ctrl: ctrl, runId: null };
    // Events can arrive several at a time, so every change is made on the latest state.
    var patchH = function (fn) {
      if (!self.hzBatch || self.hzBatch.gen !== gen) return;
      self.setState(function (cur) {
        if (!self.hzBatch || self.hzBatch.gen !== gen || !cur.hz[id]) return null;
        var hz = Object.assign({}, cur.hz), st = {};
        hz[id] = fn(Object.assign({}, cur.hz[id]));
        st[id] = hz[id].done ? null : hz[id].pend ? 'waiting' : 'running';
        if (!st[id]) delete st[id];
        var anyWait = self.hzBatch.ids.some(function (x) { return hz[x] && hz[x].pend; });
        return { hz: hz, items: setStatus(cur.items, st), mood: anyWait ? 'waiting' : 'working' };
      });
    };
    var relog = function (h) {
      var log = [];
      for (var i = 0; i < h.script.length; i++) { var c = h.calls[h.script[i].id]; if (c === 'blocked') log.push('blocked'); else if (c && c !== 'pending') log.push('ok'); else break; }
      h.log = log;
      return h;
    };
    agentApi.run(req, function (e) {
      if (!self.hzBatch || self.hzBatch.gen !== gen) return;
      if (e.type === 'run') { run.runId = e.runId; patchH(function (h) { h.runId = e.runId; h.sim = e.simulated; h.reason = e.reason || ''; return h; }); if (self.state.paused) agentApi.pause(e.runId); }
      else if (e.type === 'tool_call') patchH(function (h) {
        var ev = { id: e.id, res: e.res, op: e.op, tpl: '', arg: e.title, tool: e.tool, target: e.target, sub: e.sub, raw: e.raw };
        h.script = h.script.concat([ev]); h.calls = Object.assign({}, h.calls); h.calls[e.id] = 'pending';
        if (e.res === 'agent' && e.op === 'spawn' && e.target) h.agent = e.target;
        return relog(h);
      });
      else if (e.type === 'tool_call_update') patchH(function (h) { h.calls = Object.assign({}, h.calls); h.calls[e.id] = e.status; if (h.asking && h.asking.toolCallId === e.id) { h.asking = null; h.pend = false; } return relog(h); });
      else if (e.type === 'permission_request') patchH(function (h) {
        // Show the call being asked about as the next step of the ring.
        var at = h.script.findIndex(function (x) { return x.id === e.toolCallId; });
        if (at < 0) { h.script = h.script.concat([{ id: e.toolCallId, res: e.res, op: 'call', tpl: '', arg: e.title, tool: '', target: '' }]); h.calls = Object.assign({}, h.calls); h.calls[e.toolCallId] = 'pending'; }
        h.asking = { requestId: e.requestId, toolCallId: e.toolCallId, res: e.res, title: e.title }; h.pend = true;
        return relog(h);
      });
      else if (e.type === 'message') patchH(function (h) { h.said = e.text; return h; });
      else if (e.type === 'result') {
        bt.results[id] = e.status === 'success' ? { type: 'text', value: e.output.value, text: String(e.output.value == null ? '' : e.output.value), sim: !!e.simulated, note: e.note } : { error: e.error || 'The run failed' };
      }
    }, ctrl.signal).catch(function (err) {
      if (err && err.name === 'AbortError') return;
      bt.results[id] = bt.results[id] || { error: String(err.message || err) };
    }).then(function () {
      if (!bt.results[id]) bt.results[id] = { error: 'The run ended without an answer' };
      patchH(function (h) { h.pend = false; h.asking = null; h.done = true; return relog(h); });
      self.hzCheck(gen);
    });
  }

  /** When every step of the batch has answered: done, failed, or pick one of the options. */
  hzCheck(gen) {
    var self = this, bt = this.hzBatch;
    if (!bt || bt.gen !== gen || !bt.ids.every(function (x) { return !!bt.results[x]; })) return;
    var failed = bt.ids.filter(function (x) { return bt.results[x].error; })[0];
    var done = {};
    bt.ids.forEach(function (x) { if (!bt.results[x].error) done[x] = 'done'; });
    this.setState(function (cur) { return { items: setStatus(cur.items, done) }; });
    clearTimeout(this.hzTimer);
    this.hzTimer = setTimeout(function () { self.hzDone(gen); }, 500);
  }

  hzDone(gen) {
    var self = this, bt = this.hzBatch, s = this.state;
    if (!bt || (gen && bt.gen !== gen)) return;
    this.hzBatch = null;
    var out = Object.assign({}, s.out), failed = null, st = {};
    bt.ids.forEach(function (nid) {
      var r = bt.results[nid];
      if (r.error) { out[nid] = { error: r.error }; st[nid] = 'error'; failed = failed || nid; }
      else out[nid] = r;
    });
    if (failed) { this.failRun(failed, out, st); return; }
    this.setState({ out: out });
    if (s.openNode && bt.ids.indexOf(s.openNode) >= 0 && s.openAuto) {
      clearTimeout(this.foldTimer);
      var open = s.openNode;
      this.foldTimer = setTimeout(function () { var t = self.state; if (t.openNode === open && t.openAuto) self.setState({ openNode: null, openAuto: false }); }, 1100);
    }
    var first = this.find(bt.ids[0]), group = first && first.opt;
    if (bt.ids.length > 1 && group && !s.kept[group]) { this.pickAfter = { after: bt.after, n: bt.ids.length }; this.setState({ pick: group, mood: 'waiting' }); return; }
    this.hzAfter(bt.after, bt.ids.length, null);
  }

  hzKick() {}



  hzDone() {
    var self = this, bt = this.hzBatch, s = this.state;
    if (!bt) return;
    this.hzBatch = null;
    var out = Object.assign({}, s.out), G = flowGraph(s.items), byId = index(s.items);
    bt.ids.forEach(function (nid) {
      var n = self.find(nid);
      if (!n) return;
      var ans = simAnswer(n, G, byId, self.inputsFor(nid));
      out[nid] = { type: 'text', value: ans, text: ans, sim: true };
    });
    this.setState({ out: out });
    var first = this.find(bt.ids[0]), group = first && first.opt;
    if (bt.ids.length > 1 && group && !s.kept[group]) { this.pickAfter = { after: bt.after, n: bt.ids.length }; this.setState({ pick: group, mood: 'waiting' }); return; }
    this.hzAfter(bt.after, bt.ids.length, null);
  }

  hzAfter(after, n, extra) {
    var self = this, s = this.state;
    if (after === 'queue') {
      this.runCount += n;
      this.setState(Object.assign({ runDone: this.runCount, mood: 'working' }, extra || {}));
      this.runTimer = setTimeout(function () { self.stepRun(); }, 160);
    } else if (after && after.gate) {
      var p = {}; p[after.gate] = 'waiting';
      this.setState(Object.assign({ items: setStatus(s.items, p), mood: 'waiting' }, extra || {}));
    } else {
      if (extra) this.setState(extra);
      this.setMood('happy', 1500);
    }
  }

  // Server: answers the agent's permission question.
  hzAnswer(id, kind) {
    var s = this.state, h = s.hz[id];
    if (!h || !h.pend || !h.asking || !h.runId) return;
    var ask = h.asking, extra = {};
    if (kind === 'always') { var perms = Object.assign({}, s.perms); perms[ask.res] = 'allow'; extra.perms = perms; }
    agentApi.answer(h.runId, ask.requestId, kind === 'always' ? 'allow_always' : kind === 'deny' ? 'deny' : 'allow_once');
    var hz = Object.assign({}, s.hz), st = {};
    hz[id] = Object.assign({}, h, { pend: false, asking: null });
    st[id] = 'running';
    var anyWait = Object.keys(hz).some(function (x) { return hz[x].pend; });
    this.setState(Object.assign({ hz: hz, items: setStatus(s.items, st), mood: anyWait ? 'waiting' : 'working' }, extra));
  }

  hzCycle(res) {
    var self = this, perms = Object.assign({}, this.state.perms);
    perms[res] = HZ_PNEXT[perms[res] || 'ask'];
    this.setState({ perms: perms });
    // A question already asked about this tool is answered by the new setting.
    var hz = this.state.hz;
    Object.keys(hz).forEach(function (id) {
      var h = hz[id];
      if (!h.pend || !h.asking || h.asking.res !== res) return;
      if (perms[res] === 'allow') self.hzAnswer(id, 'once');
      else if (perms[res] === 'blocked') self.hzAnswer(id, 'deny');
    });
  }

  // Server: pausing holds every tool call of the batch until resumed.
  hzPause() {
    var bt = this.hzBatch;
    if (bt) Object.keys(bt.runs).forEach(function (id) { if (bt.runs[id].runId) agentApi.pause(bt.runs[id].runId); });
    this.setState({ paused: true });
  }

  hzResume() {
    var bt = this.hzBatch;
    if (bt) Object.keys(bt.runs).forEach(function (id) { if (bt.runs[id].runId) agentApi.resume(bt.runs[id].runId); });
    this.setState({ paused: false, scrub: null });
  }

  hzCycle(res) {
    var perms = Object.assign({}, this.state.perms);
    perms[res] = HZ_PNEXT[perms[res] || 'ask'];
    this.setState({ perms: perms });
    if (this.hzBatch && !this.state.paused) this.hzKick(200);
  }

  hzPause() { clearTimeout(this.hzTimer); this.setState({ paused: true }); }

  hzResume() { this.setState({ paused: false, scrub: null }); if (this.hzBatch) this.hzKick(300); }

  hzScrub(id, v) {
    var s = this.state, h = s.hz[id];
    if (!h) return;
    var n = Math.max(0, Math.min(v, h.log.length));
    if (n >= h.log.length) { this.setState({ scrub: null }); return; }
    if (this.hzBatch && !s.paused) this.hzPause();
    this.setState({ scrub: { id: id, n: n } });
  }

  keepOpt(id) {
    var s = this.state, it = this.find(id);
    if (!it || !it.opt) return;
    var kept = Object.assign({}, s.kept);
    kept[it.opt] = id;
    if (s.pick === it.opt && this.pickAfter) {
      var pa = this.pickAfter;
      this.pickAfter = null;
      this.hzAfter(pa.after, pa.n, { kept: kept, pick: null, compare: null });
    } else this.setState({ kept: kept, compare: null });
  }

  sendBack(id) {
    var s = this.state, gate = this.find(id);
    if (!gate || gate.status !== 'waiting' || this.hzBatch) return;
    var G = flowGraph(s.items), byId = index(s.items), seen = {}, q = (G.ins[id] || []).slice(), target = null;
    while (q.length && !target) {
      var c = q.shift(), o = byId[c];
      if (seen[c] || !o) continue;
      seen[c] = 1;
      if (isHarness(o)) { if (!o.opt || !s.kept[o.opt] || s.kept[o.opt] === o.id) target = o; continue; }
      q = q.concat(G.ins[c] || []);
    }
    if (!target) { this.flash('Nothing upstream to send it back to'); return; }
    var p = {}; p[id] = 'queued';
    this.hzStart([target.id], { gate: id }, p);
  }

  makeOptions(id) {
    var s = this.state, it = this.find(id);
    if (!isHarness(it) || it.opt || s.running || this.hzBatch) return;
    var taken = {}, gi = 1;
    s.items.forEach(function (o) { if (o.opt) taken[o.opt] = 1; });
    while (taken['opt' + gi]) gi++;
    var g = 'opt' + gi, H = Math.max(it.h, 240), aId = this.newId('ai'), cId = this.newId('ai');
    var a = Object.assign({}, it, { id: aId, y: it.y - H - 30, h: H, opt: g, optName: 'A', status: 'idle' });
    var items = s.items.map(function (o) { return o.id === id ? Object.assign({}, o, { h: H, opt: g, optName: 'B', status: 'idle' }) : o; }).concat([a]);
    var c = Object.assign({}, it, { id: cId, y: it.y + H + 30, h: H, opt: g, optName: 'C', status: 'idle' }), extra = [c], n = 0;
    s.items.forEach(function (o) {
      if (o.kind !== 'arrow' || !o.from || !o.to) return;
      [aId, cId].forEach(function (nid) {
        if (o.to.id === id) extra.push(Object.assign({}, o, { id: 'e' + g + (++n), to: Object.assign({}, o.to, { id: nid }) }));
        else if (o.from.id === id) extra.push(Object.assign({}, o, { id: 'e' + g + (++n), from: Object.assign({}, o.from, { id: nid }) }));
      });
    });
    this.setState({ items: items.concat(extra), selected: id, multi: [], popover: null, menu: null });
    this.flash('Made three options. Run the flow to compare them.');
  }

  botTarget() {
    var s = this.state, items = s.items, run = null, i, o;
    if (s.welcome) return null;
    if (s.chatRun && !s.chatRun.done && this.chatAt) { for (i = 0; i < items.length; i++) { if (items[i].id === this.chatAt) return items[i]; } }
    for (i = 0; i < items.length; i++) { o = items[i]; if (o.kind === 'node' && o.status === 'waiting') return o; }
    if (s.pick) { var m = items.filter(function (x) { return x.kind === 'node' && x.opt === s.pick; }).sort(function (x, y) { return x.y - y.y; }); if (m.length) return m[Math.floor(m.length / 2)]; }
    for (i = 0; i < items.length; i++) { o = items[i]; if (o.kind === 'node' && o.status === 'running') { if (o.id === this.botNode) return o; if (!run) run = o; } }
    if (run) return run;
    if (this.botNode && (s.running || this.hzBatch || s.mood === 'working' || s.mood === 'happy')) {
      for (i = 0; i < items.length; i++) { if (items[i].id === this.botNode && items[i].kind === 'node') return items[i]; }
    }
    return null;
  }

  copyJson() {
    var self = this, text = this.fileText();
    try {
      navigator.clipboard.writeText(text).then(function () { self.flash('Copied the board as JSON'); }, function () { self.flash('Copying is blocked in this preview'); });
    } catch (err) { this.flash('Copying is blocked in this preview'); }
  }

  renderMono(accent) {
    var self = this, s = this.state, w = s.welcome;
    var botMic = s.mic && s.micFrom === 'bot';
    var mood = botMic ? 'listening' : (s.mood || 'idle');
    var ink = '#2B2B2B', bw = 'max(1.5px, 0.03em)', ab = 'display: block; position: absolute; ';
    var ease = 'cubic-bezier(0.3, 0.9, 0.3, 1)';
    var ps = mood === 'listening' || mood === 'happy' ? 0.31 : 0.25;
    var say = '', at = this._botAt, bl = 16, bt = 14, bs = 52;
    if (!w && at) {
      var BW = this.boardEl ? this.boardEl.clientWidth : 1440, BH = this.boardEl ? this.boardEl.clientHeight : 900;
      bs = 46;
      bl = Math.round(Math.max(8, Math.min(BW - 64, s.pan.x + at.x * s.zoom - 56)));
      bt = Math.round(Math.max(8, Math.min(BH - 170, s.pan.y + (at.y + (at.h || 0) / 2) * s.zoom - 62)));
    }
    var sayLeft = !w && !!at && bl > 200, again = !!this.hzBatch && !!this.hzBatch.after && !!this.hzBatch.after.gate;
    if (!w) {
      if (mood === 'thinking') say = s.chatRun && !s.chatRun.done ? (s.chatRun.n ? clipText(s.chatRun.calls[s.chatRun.n - 1].line, 34) : 'Thinking') : 'Laying out nodes';
      else if (mood === 'working') say = s.paused ? 'Paused' : (again ? 'Running it again' : (s.running ? fmt('Running step {0} of {1}', Math.min(s.runTotal, s.runDone + 1), s.runTotal) : 'Running'));
      else if (mood === 'waiting') say = s.pick ? 'Pick one to keep' : (isHarness(at) ? 'Needs your OK' : 'Waiting for your review');
      else if (mood === 'happy') say = 'Done';
    }
    return {
      aria: botMic ? 'Listening. Click to stop voice input' : 'Board assistant. Click to start voice input',
      click: function () {
        var on = !(self.state.mic && self.state.micFrom === 'bot');
        self.setState({ mic: on, micFrom: on ? 'bot' : null, panel: null, zoomMenu: false, bgMenu: false, acctMenu: null });
      },
      pressed: botMic ? 'true' : 'false',
      title: botMic ? 'Stop listening' : 'Click to talk',
      listening: mood === 'listening',
      listenLabel: 'Listening', stopLabel: 'Stop listening',
      capsule: 'position: absolute; ' + (w ? 'left: 0; right: 0; width: max-content; margin: 0 auto; top: calc(34% + min(100px, 13vh) + 26px);' : 'left: ' + (bl + 68) + 'px; top: ' + (bt + 6) + 'px;') + ' z-index: 7; display: flex; align-items: center; gap: 10px; height: 40px; box-sizing: border-box; padding: 0 6px 0 14px; border-radius: 999px; background: #111114; color: #FFFFFF; box-shadow: 0 8px 22px rgba(20,20,30,0.2); animation: wb-pop 220ms cubic-bezier(0.2, 0.8, 0.2, 1);',
      bars: [[0.9, 0], [0.7, 0.15], [1.1, 0.05], [0.6, 0.3], [0.95, 0.1], [0.75, 0.25], [1.05, 0.18]].map(function (b) { return { style: 'display: block; width: 3px; height: 4px; border-radius: 2px; background: color-mix(in srgb, ' + accent + ' 45%, #FFFFFF); animation: wb-eq ' + b[0] + 's ease-in-out ' + b[1] + 's infinite;' }; }),
      halo: ab + 'inset: -0.16em; border-radius: 50%; background: color-mix(in srgb, ' + accent + ' 16%, transparent); ' + (mood === 'listening' ? 'animation: wb-breathe 1.6s ease-in-out infinite;' : 'display: none;'),
      wave1: mood === 'listening' ? 'transform-box: view-box; transform-origin: 50% 50%; stroke-width: 3.4; opacity: 0; animation: wb-wave2 1.5s cubic-bezier(0.3, 0.7, 0.3, 1) 0s infinite;' : 'display: none;',
      wave2: mood === 'listening' ? 'transform-box: view-box; transform-origin: 50% 50%; stroke-width: 2.6; opacity: 0; animation: wb-wave2 1.5s cubic-bezier(0.3, 0.7, 0.3, 1) 0.22s infinite;' : 'display: none;',
      wave3: mood === 'listening' ? 'transform-box: view-box; transform-origin: 50% 50%; stroke-width: 1.8; opacity: 0; animation: wb-wave2 1.5s cubic-bezier(0.3, 0.7, 0.3, 1) 0.44s infinite;' : 'display: none;',
      hasSay: !!say, say: say,
      sayStyle: 'position: absolute; ' + (sayLeft ? 'left: ' + (bl - 10) + 'px; transform: translateX(-100%); top: ' + (bt + 8) + 'px;' : 'left: ' + (bl + bs + 16) + 'px; top: ' + (bt + 12) + 'px;') + ' z-index: 7; padding: 6px 12px; border-radius: 999px; background: #111114; color: #FFFFFF; font-size: 13px; font-weight: 400; white-space: nowrap; pointer-events: none; transition: left 650ms ' + ease + ', top 650ms ' + ease + ';',
      rings: mood === 'listening', spinner: mood === 'working', alert: mood === 'waiting' && !w,
      wrap: 'position: absolute; z-index: 7; width: 1em; height: 1em; line-height: 1; ' + (w ? 'left: calc(50% - 0.5em); top: calc(34% - 0.5em); font-size: min(200px, 26vh);' : 'left: ' + bl + 'px; top: ' + bt + 'px; font-size: ' + bs + 'px;') + ' transition: left 650ms ' + ease + ', top 650ms ' + ease + ', font-size 650ms ' + ease + ';',
      brows: 'transition: transform 200ms ease; transform: translateY(' + (mood === 'listening' || mood === 'waiting' ? -3 : (mood === 'happy' ? -1.5 : 0)) + 'px);',
      eyesOuter: mood === 'thinking' ? 'animation: wb-eyes 1.3s linear infinite;' : 'transition: transform 140ms ease-out; transform: translate(' + (s.look.x * 4.6) + 'px, ' + (s.look.y * 5.4) + 'px);',
      eyesInner: 'transform-box: fill-box; transform-origin: center;' + (mood === 'thinking' || mood === 'happy' ? '' : ' animation: wb-blink 4.6s infinite;'),
      cheek: 'transition: opacity 200ms ease; opacity: ' + (mood === 'happy' ? 0.85 : 0.5) + ';',
      whites: 'transition: opacity 160ms ease; opacity: ' + (mood === 'happy' ? 0 : 1) + ';',
      eyeL: mood === 'happy' ? 'M30.5 52.5Q37 43.5 43.5 52.5' : 'M37 50h.01',
      eyeR: mood === 'happy' ? 'M56.5 52.5Q63 43.5 69.5 52.5' : 'M63 50h.01',
      eyeW: mood === 'happy' ? 4.6 : (mood === 'listening' ? 12.5 : 10.5),
      mouth: mood === 'happy' ? 'M41.5 70.5Q51 81 61 70' : (mood === 'listening' ? 'M47.5 74a3.8 3.2 0 1 0 7.6 0a3.8 3.2 0 1 0 -7.6 0' : (mood === 'thinking' ? 'M47 74.5Q51 73 55 74.5' : 'M43.5 72Q51 77.5 59.5 71.5')),
      ring1: ab + 'inset: 0; border-radius: 50%; border: 2px solid ' + accent + '; animation: wb-ring 1.4s ease-out infinite;',
      ring2: ab + 'inset: 0; border-radius: 50%; border: 2px solid ' + accent + '; animation: wb-ring 1.4s ease-out 0.7s infinite;',
      bob: ab + 'inset: 0; animation: ' + (mood === 'happy' ? 'wb-hop 0.7s ease 3' : 'wb-float 3.2s ease-in-out infinite') + ';',
      legL: ab + 'left: 0.24em; bottom: 0; width: 0.13em; height: 0.14em; background: ' + ink + '; border-radius: 0 0 0.05em 0.05em;',
      legR: ab + 'right: 0.24em; bottom: 0; width: 0.13em; height: 0.14em; background: ' + ink + '; border-radius: 0 0 0.05em 0.05em;',
      body: ab + 'inset: 0; box-sizing: border-box; border-radius: 50%; background: #BFD7FF; border: max(1.5px, 0.034em) solid #2B2B2B; transition: box-shadow 200ms ease; box-shadow: 0 0 0 max(2px, 0.05em) #FFFFFF, ' + (mood === 'listening' ? '0 0 0 max(4px, 0.085em) ' + accent + ', ' : '') + '0 0.07em 0.14em 0.03em rgba(20,20,30,0.28);',
      tray: ab + 'left: 0.2em; right: 0.2em; bottom: 0.055em; height: 0.045em; border-radius: 0.03em; background: ' + accent + ';',
      cheekL: ab + 'left: 0.09em; top: 0.57em; width: 0.11em; height: 0.06em; border-radius: 50%; background: #F6A6C1; opacity: ' + (mood === 'happy' ? 1 : 0.8) + ';',
      cheekR: ab + 'right: 0.09em; top: 0.57em; width: 0.11em; height: 0.06em; border-radius: 50%; background: #F6A6C1; opacity: ' + (mood === 'happy' ? 1 : 0.8) + ';',
      eye: ab + 'left: 50%; top: 46%; width: 0.5em; height: 0.5em; margin: -0.25em 0 0 -0.25em; box-sizing: border-box; overflow: hidden; border-radius: 50%; background: #FFFFFF; border: ' + bw + ' solid ' + ink + '; animation: wb-blink 4.6s infinite;',
      orbit: ab + 'inset: 0;' + (mood === 'thinking' ? ' animation: wb-orbit 1.3s linear infinite;' : ''),
      pupil: ab + 'left: 50%; top: 50%; width: ' + ps + 'em; height: ' + ps + 'em; margin: ' + (-ps / 2) + 'em 0 0 ' + (-ps / 2) + 'em; border-radius: 50%; background: ' + ink + '; transform: translate(' + (mood === 'thinking' ? 0 : s.look.x * 0.085) + 'em, ' + (mood === 'thinking' ? 0 : s.look.y * 0.085) + 'em); transition: transform 140ms ease-out, width 200ms ease, height 200ms ease;',
      glint: 'transition: opacity 160ms ease; opacity: ' + (mood === 'happy' ? 0 : 1) + ';',
      spin: ab + 'inset: -0.07em; box-sizing: border-box; border-radius: 50%; border: max(2px, 0.035em) solid transparent; border-top-color: ' + accent + '; border-right-color: ' + accent + '; animation: wb-spin 1.1s linear infinite;',
      badge: ab + 'right: -0.1em; top: -0.1em; width: 0.38em; height: 0.38em; border-radius: 50%; background: #B45309; color: #FFFFFF; font-size: 0.26em; font-weight: 400; display: flex; align-items: center; justify-content: center; width: 1.4em; height: 1.4em; right: -0.4em; top: -0.4em; animation: wb-wiggle 0.5s ease-in-out infinite;'
    };
  }

  renderNode(it, o, byId, accent, G, editing) {
    var self = this, s = this.state, def = NODE_BY[it.ntype] || NODE_DEFS[0], cat = CATS[def.cat], st = it.status || 'idle';
    var keptId = it.opt ? s.kept[it.opt] : null, isKept = !!keptId && keptId === it.id, aside = !!keptId && !isKept, isOpen = s.openNode === it.id;
    var res = s.out[it.id] || null, failed = st === 'error';
    var ins = G.ins[it.id] || [], runnable = canRunDef(def), dark = def.t === 'terminal';
    var tint = 'color-mix(in srgb, ' + accent + ' 12%, #FFFFFF)';
    o.isNode = true;
    o.card = 'position: absolute; inset: 0; box-sizing: border-box; overflow: hidden; background: #FFFFFF; border-radius: 14px; border: ' + (it.proposed ? '1.5px dashed ' + accent : failed ? '1.5px solid #B42318' : (st === 'running' ? '1.5px solid ' + accent : (st === 'waiting' ? '2px solid #B45309' : (isKept ? '2px solid ' + accent : (isOpen ? '1.5px solid #111114' : '1px solid #D2D3D9'))))) + '; opacity: ' + (it.proposed ? 0.86 : (aside && !isOpen ? 0.55 : 1)) + '; transition: opacity 240ms ease; box-shadow: 0 1px 2px rgba(20,20,30,0.05), 0 6px 16px rgba(20,20,30,0.06);';
    o.head = 'position: absolute; left: 0; right: 0; top: 0; height: 40px; box-sizing: border-box; display: flex; align-items: center; gap: 8px; padding: 0 6px 0 8px; border-bottom: 1px solid #EEEFF2; color: #111114;';
    o.chip = 'flex: 0 0 auto; width: 26px; height: 26px; border-radius: 8px; display: flex; align-items: center; justify-content: center; background: ' + cat.bg + '; color: ' + cat.fg + ';' + CHIP_STK;
    o.icon = def.icon;
    o.stk = NODE_STK[def.t] || NODE_STK.llm;
    o.title = it.optName ? fmt('Option {0}', it.optName) : def.label;
    if (HARNESS[def.t]) {
      o.canOpen = true;
      o.openLabel = isOpen ? 'Fold this step back into one node' : 'Open this step to see what it touches';
      o.expanded = isOpen ? 'true' : 'false';
      o.openStyle = 'width: 32px; height: 32px; border-radius: 9px;' + (isOpen ? ' background: ' + tint + '; color: ' + accent + ';' : '');
      o.toggleOpen = function () { self.setState({ openNode: self.state.openNode === it.id ? null : it.id, openAuto: false, hzSel: null, scrub: null }); };
      o.helper = st === 'running' && !s.paused && !!this.hzBatch && this.hzBatch.ids.length > 1 && (!this._botAt || this._botAt.id !== it.id);
      o.showStk = !o.helper;
    }
    if (res && res.view && st === 'done') {
      o.canOpen = true;
      o.openLabel = 'Open the full view';
      o.expanded = s.viewer && s.viewer.id === it.id ? 'true' : 'false';
      o.openStyle = 'width: 32px; height: 32px; border-radius: 9px;';
      o.toggleOpen = function () { self.openViewer(it.id); };
    }
    o.idLabel = '#' + it.id;
    o.idStyle = 'flex: 0 0 auto; ' + MONO + ' font-size: 11px; color: #6B6C73; background: #F3F4F6; padding: 2px 6px; border-radius: 6px;';
    o.canRun = runnable;
    o.run = function () { self.runNode(it.id); };
    o.hasIn = def.cat !== 'info';
    o.portIn = 'position: absolute; left: -7px; top: 50%; width: 12px; height: 12px; margin-top: -6px; box-sizing: border-box; border-radius: 50%; background: #FFFFFF; border: 2px solid ' + DOT + '; pointer-events: none;';
    o.portOut = 'position: absolute; right: -8px; top: 50%; width: 14px; height: 14px; margin-top: -7px; border-radius: 50%; background: ' + DOT + '; box-shadow: 0 0 0 2px #FFFFFF; cursor: crosshair;';
    o.portDown = function (e) { self.dotDown(it.id, 'right', e); };

    var statText = { queued: 'Queued', running: s.paused && s.hz[it.id] ? 'Paused' : 'Running', waiting: 'Waiting', error: 'Failed', done: it.optName ? (isKept ? 'Kept' : (aside ? 'Set aside' : 'Ready')) : 'Done' }[st] || '';
    var statCss = { queued: 'background: #ECEDEF; color: #3A3B40;', running: 'background: ' + tint + '; color: ' + accent + ';', waiting: 'background: #FFE9C7; color: #7A4100;', error: 'background: #FDE7E4; color: #B42318;', done: 'background: #DDF3E4; color: #1F6B3A;' }[st] || '';
    if (st === 'done' && aside) statCss = 'background: #ECEDEF; color: #3A3B40;';
    if (it.proposed) { statText = 'Proposed'; statCss = 'background: ' + tint + '; color: ' + accent + ';'; }
    o.stat = statText;
    o.statStyle = statText ? 'flex: 0 0 auto; padding: 1px 7px; border-radius: 999px; font-family: Inter, sans-serif; font-weight: 400; ' + statCss : 'display: none;';
    o.io = (G.step[it.id] ? 'step ' + G.step[it.id] + ' · ' : '') + (ins.length ? 'in ' + ins.map(function (i) { return '#' + i; }).join(' ') + ' → ' : '') + 'out ' + def.out;
    o.foot = 'position: absolute; left: 0; right: 0; bottom: 0; height: 28px; box-sizing: border-box; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 0 10px; border-top: 1px solid #EEEFF2; background: #FAFAFB; ' + MONO + ' font-size: 11.5px; color: #6B6C73;';

    var fTop = 46, bottom = 34, fh = def.field ? (def.fh || (it.h - fTop - bottom)) : 0;
    if (def.field && !def.fh && res && (failed || def.t === 'code')) fh = Math.round(fh * 0.5);
    if (def.field) {
      var empty = !it.text;
      var fcss = (def.mono ? MONO + ' font-size: 12.5px; line-height: 1.5;' : 'font-size: 14px; line-height: 1.4;') + ' color: ' + (dark ? '#F3F4F6' : '#111114') + '; white-space: pre-wrap; overflow-wrap: anywhere;';
      o.textBox = 'position: absolute; left: ' + (dark ? 22 : 12) + 'px; right: ' + (dark ? 22 : 12) + 'px; top: ' + (dark ? 54 : fTop) + 'px; height: ' + fh + 'px; overflow: auto;';
      o.text = editing ? (it.text || '') : (empty ? tr(def.field) : (dark ? '$ ' + it.text : it.text));
      o.textStyle = fcss + (empty ? ' color: ' + (dark ? '#A4A5AB' : '#74757C') + ';' : '');
      o.taStyle = fcss + ' width: 100%; height: 100%;';
      o.placeholder = def.field;
      o.ariaText = def.label + ' input';
      o.showText = !editing;
      o.editText = editing;
    }

    var pvTop = def.field ? fTop + fh + 8 : fTop + 2;
    var base = 'position: absolute; left: 12px; right: 12px; top: ' + pvTop + 'px; bottom: ' + bottom + 'px; box-sizing: border-box; border-radius: 8px; overflow: hidden; display: flex; flex-direction: column; ';
    var bar = function (w, extra) { return { style: 'display: block; flex: 0 0 auto; height: 7px; border-radius: 4px; background: #E3E4E8; width: ' + w + ';' + (extra || '') }; };
    var msg = function (text, busy) {
      o.pvShow = true;
      o.pv = base + 'align-items: center; justify-content: center; text-align: center; padding: 0 8px; border: 1px dashed #D7D8DD; ' + (busy ? 'background: linear-gradient(90deg, #F3F4F6 0px, #E3E4E8 100px, #F3F4F6 200px); background-size: 400px 100%; animation: wb-shimmer 1.1s linear infinite;' : 'background: #F6F6F8;');
      o.pvHead = true;
      o.pvHeadText = text;
      o.pvHeadStyle = 'font-size: 12.5px; color: #6B6C73;';
    };
    var pending = st === 'queued' ? 'Queued' : (st === 'running' ? 'Running' : (def.cat === 'render' ? 'Renders when its inputs arrive' : 'Not run yet'));
    var done = st === 'done';
    var title = upText(it.id, G, byId) || def.label;
    var cap = function (text, color) { o.pvCap = true; o.pvCapText = text; o.pvCapStyle = 'font-size: 12px; color: ' + color + ';'; };
    var t = def.t;
    var pre = function (text, color) { o.pvPre = true; o.pvPreText = clipText(text, 900); o.pvPreStyle = MONO + ' flex: 1 1 auto; min-height: 0; overflow: hidden; font-size: 12px; line-height: 1.45; white-space: pre-wrap; overflow-wrap: anywhere; color: ' + color + ';'; };
    var simTag = res && res.sim ? ' · ' + tr('simulated') : '';

    if (failed && res && res.error && t !== 'terminal') {
      o.pvShow = true;
      o.pv = base + 'align-items: flex-start; justify-content: center; padding: 6px 10px; border: 1px dashed #E9A8A0; background: #FEF3F2;';
      o.pvHead = true; o.pvHeadText = tr(res.error);
      o.pvHeadStyle = 'max-width: 100%; font-size: 12.5px; line-height: 1.35; color: #B42318; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;';
    } else if (def.pkg && done && res && res.view) {
      this.renderView(it, o, res.view, base, pvTop, bottom, accent);
    } else if (t === 'code') {
      if (done && res) { o.pvShow = true; o.pv = base + 'padding: 8px 10px; background: #F6F6F8;'; pre((res.text || tr('No value returned')) + (res.sim ? '\n' + (res.logs || []).join('\n') : ''), '#111114'); }
    } else if (t === 'ref') {
      o.pvShow = true; o.pv = base + 'align-items: center; justify-content: center; gap: 6px; background: #EEF3FB; color: #3A5C96;';
      o.pvIcon = true; o.pvIconD = IMG_ICON; cap('Reference image placeholder', '#33496F');
    } else if (t === 'palette') {
      var hexes = (it.text || '').match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g) || [];
      if (!hexes.length) msg('Add hex colors above');
      else { o.pvShow = true; o.pv = base + 'flex-direction: row; gap: 6px; align-items: stretch; border-radius: 0; overflow: visible;'; o.bars = hexes.slice(0, 8).map(function (h) { return { style: 'display: block; flex: 1 1 0; border-radius: 8px; border: 1px solid rgba(0,0,0,0.14); background: ' + h + ';' }; }); }
    } else if (HARNESS[t] && this.renderHzNode(it, o, st, pvTop, bottom, accent, msg, aside)) {
      o.isHz = true;
    } else if (HARNESS[t]) {
      if (!done) msg(pending, st === 'running');
      else { o.pvShow = true; o.pv = base + 'justify-content: center; gap: 6px; padding: 8px 10px; background: #F6F6F8;'; o.pvHead = true; o.pvHeadText = ins.length ? fmt('Simulated result from {0}', ins.map(function (i) { return '#' + i; }).join(', ')) : tr('Simulated result'); o.pvHeadStyle = 'font-size: 12px; font-weight: 400; color: #3A3B40; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;'; o.bars = [bar('92%'), bar('64%')]; }
    } else if (t === 'imagegen') {
      if (!done) msg(pending, st === 'running');
      else if (res && res.value && !res.sim) { o.pvShow = true; o.pv = base + "background: #EFEAFB url('" + fileUrl(String(res.value)) + "') center / cover no-repeat;"; }
      else { o.pvShow = true; o.pv = base + 'align-items: center; justify-content: center; gap: 6px; background: #EFEAFB; color: #5B3FB8;'; o.pvIcon = true; o.pvIconD = IMG_ICON; cap(res && res.meta ? fmt('Simulated image · {0}', res.meta) : 'Generated image placeholder', '#4A3296'); }
    } else if (t === 'videogen') {
      if (!done) msg(pending, st === 'running');
      else { o.pvShow = true; o.pv = base + 'align-items: center; justify-content: center; gap: 6px; background: #24252B; color: #FFFFFF;'; o.pvIcon = true; o.pvIconD = PLAY_ICON; cap(res && res.meta ? fmt(res.sim ? 'Simulated video · {0}' : 'Video · {0}', res.meta) : 'Generated video placeholder', '#E3E4E8'); }
    } else if (t === 'terminal') {
      o.pvShow = true;
      o.pv = 'position: absolute; left: 10px; right: 10px; top: 46px; bottom: ' + bottom + 'px; box-sizing: border-box; border-radius: 8px; background: #1E1F24; display: flex; flex-direction: column; justify-content: flex-end; padding: 8px 12px;';
      var line = failed && res ? tr(res.error) : (done ? ((res && res.meta) || 'exit 0') + simTag : (st === 'running' ? 'running' : (st === 'queued' ? 'queued' : '')));
      if (done && res && res.text) { o.pvPre = true; o.pvPreText = clipText(res.text, 400); o.pvPreStyle = MONO + ' flex: 0 1 auto; min-height: 0; overflow: hidden; font-size: 12px; line-height: 1.45; white-space: pre-wrap; overflow-wrap: anywhere; color: #C9CBD2;'; }
      o.pvCap = !!line; o.pvCapText = line; o.pvCapStyle = MONO + ' flex: 0 0 auto; font-size: 12px; color: ' + (failed ? '#FFB4A8' : (done ? '#7EE2B8' : '#C9CBD2')) + ';';
    } else if (t === 'http') {
      if (!done) msg(pending, st === 'running');
      else { o.pvShow = true; o.pv = base + 'justify-content: center; padding: 0 10px; background: #F6F6F8;'; o.pvHead = true; o.pvHeadText = ((res && res.meta) || '200 OK') + simTag; o.pvHeadStyle = MONO + ' font-size: 12px; color: #1F6B3A; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;'; }
    } else if (def.cat === 'render' || def.pkg) {
      if (done && res && res.view) this.renderView(it, o, res.view, base, pvTop, bottom, accent);
      else msg(done ? 'Run it again to see the result' : pending, st === 'running');
    } else if (t === 'gate') {
      var waiting = st === 'waiting';
      if (waiting) {
        var gw = it.w - 24, g1 = Math.round(gw * 0.56), gy = Math.min(90, it.h - bottom - 40);
        o.pvShow = true;
        o.pv = 'position: absolute; left: 12px; right: 12px; top: ' + (gy - 19) + 'px; height: 16px; overflow: hidden;';
        o.pvHead = true; o.pvHeadText = 'Waiting for you';
        o.pvHeadStyle = 'font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.04em; color: #7A4100; white-space: nowrap;';
        o.acts = [
          { label: 'Approve', disabled: false, pick: function () { self.approve(it.id); }, style: 'position: absolute; left: 12px; width: ' + g1 + 'px; top: ' + gy + 'px; height: 36px; padding: 0; background: ' + accent + '; color: #FFFFFF;' },
          { label: 'Send back', disabled: false, pick: function () { self.sendBack(it.id); }, style: 'position: absolute; left: ' + (18 + g1) + 'px; width: ' + (gw - g1 - 6) + 'px; top: ' + gy + 'px; height: 36px; padding: 0; background: #F3F4F6; color: #111114;' }
        ];
      } else {
        o.acts = [{
          label: done ? 'Approved' : 'Waits for the flow', disabled: true, pick: function () {},
          style: 'position: absolute; left: 12px; right: 12px; top: 76px; height: 44px; cursor: default; ' + (done ? 'background: #DDF3E4; color: #1F6B3A;' : 'background: #F3F4F6; color: #6B6C73;')
        }];
      }
    }
  }

  renderHzNode(it, o, st, pvTop, bottom, accent, msg, aside) {
    var self = this, s = this.state, h = s.hz[it.id];
    if (!h) return false;
    var f = hzFacts(h, h.log.length, s.perms), btnY = it.h - bottom - 40;
    if (st === 'waiting' && f.pend) {
      var ev = f.next, inner = it.w - 24, w1 = Math.round(inner * 0.4), w2 = Math.round(inner * 0.3), w3 = inner - w1 - w2 - 12;
      var ab = function (label, x, w, css, kind) { return { label: label, disabled: false, pick: function () { self.hzAnswer(it.id, kind); }, style: 'position: absolute; left: ' + x + 'px; width: ' + w + 'px; top: ' + btnY + 'px; height: 34px; padding: 0; font-size: 13px; ' + css }; };
      o.showText = false; o.editText = false;
      o.pvShow = true;
      o.pv = 'position: absolute; left: 12px; right: 12px; top: 48px; bottom: ' + (bottom + 46) + 'px; overflow: hidden; display: flex; flex-direction: column; gap: 6px;';
      o.pvHead = true; o.pvHeadText = 'Waiting for you';
      o.pvHeadStyle = 'flex: 0 0 auto; font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.04em; color: #7A4100;';
      o.pvCap = true; o.pvCapText = tr(HZ_RES[ev.res].kind) + ': ' + hzText(ev); o.pvCapStyle = 'font-size: 14px; line-height: 1.4; color: #111114;';
      o.acts = [ab('Allow once', 12, w1, 'background: ' + accent + '; color: #FFFFFF;', 'once'), ab('Always', 18 + w1, w2, 'background: #F3F4F6; color: #111114;', 'always'), ab('Deny', 24 + w1 + w2, w3, 'background: #F3F4F6; color: #B42318;', 'deny')];
      return true;
    }
    if (st === 'running' || st === 'waiting') {
      msg(fmt('step {0} of {1}', h.log.length, h.script.length) + (h.log.length ? ' · ' + hzText(h.script[h.log.length - 1]) : ''), !s.paused);
      o.pvHeadStyle += ' max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
      return true;
    }
    if (st !== 'done') return false;
    var act = null;
    if (it.opt && s.pick === it.opt) act = ['Keep this one', 'background: ' + accent + '; color: #FFFFFF;'];
    else if (it.opt && aside) act = ['Keep this instead', 'background: #F3F4F6; color: #111114;'];
    o.pvShow = true;
    o.pv = 'position: absolute; left: 12px; right: 12px; top: ' + pvTop + 'px; bottom: ' + (bottom + (act ? 40 : 0)) + 'px; box-sizing: border-box; border-radius: 8px; overflow: hidden; display: flex; flex-direction: column; justify-content: center; gap: 5px; padding: 4px 10px; background: #F6F6F8;';
    o.pvHead = true; o.pvHeadText = hzSum(f);
    o.pvHeadStyle = MONO + ' flex: 0 0 auto; font-size: 11.5px; color: #3A3B40; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
    var used = f.used.slice(0, f.used.length > 5 ? 4 : 5);
    o.chips = used.map(function (id) { return { stk: HZ_STK[id], count: '×' + f.stats[id].count, name: tr(HZ_RES[id].kind) }; });
    if (f.used.length > used.length) o.chips.push({ stk: [], count: '+' + (f.used.length - used.length), name: '' });
    o.hasChips = o.chips.length > 0;
    if (act) o.acts = [{ label: act[0], disabled: false, pick: function () { self.keepOpt(it.id); }, style: 'position: absolute; left: 12px; right: 12px; top: ' + (btnY + 2) + 'px; height: 34px; font-size: 13.5px; ' + act[1] }];
    return true;
  }


  renderHz(byId, accent) {
    var self = this, s = this.state, it = s.openNode ? byId[s.openNode] : null, links = {};
    HZ_ORDER.forEach(function (id) { links[id] = { d: 'M0 0', stroke: '#6B6C73', w: 1.6, op: 0, style: '' }; });
    if (!isHarness(it)) return { show: false, links: links, labels: [], tools: [] };
    var h = s.hz[it.id] || { script: [], log: [], pend: false, agent: 'helper' };
    var total = h.log.length, max = h.script.length, view = s.scrub && s.scrub.id === it.id ? Math.min(s.scrub.n, total) : total, live = view === total;
    var f = hzFacts(h, view, s.perms), cx = it.x + it.w / 2, cy = it.y + it.h / 2, NW = 180;
    var batchOn = !!this.hzBatch && this.hzBatch.ids.indexOf(it.id) >= 0, running = batchOn && total < max;
    var activeRes = running && !s.paused && live ? (f.pend ? f.next.res : (total ? h.script[total - 1].res : null)) : null;
    var labels = [], tools = [];
    HZ_ORDER.forEach(function (id) {
      var r = HZ_RES[id], stt = f.stats[id], perm = s.perms[id] || 'ask';
      var subs = id === 'agent' ? Object.keys(f.subs).map(function (k) { return { stk: HZ_STK[HZ_SUBS[k].stk], name: tr(HZ_SUBS[k].name) + ' ×' + f.subs[k] }; }) : [];
      var nh = subs.length ? 142 : 112, tx = cx + (r.col - 1) * 225 - NW / 2, ty = r.row ? it.y + it.h + 46 : it.y - 46 - nh;
      if (id === 'tool') { tx = cx + it.w / 2 + 14; ty = cy - nh / 2; }
      var tcx = tx + NW / 2, tcy = ty + nh / 2;
      var used = stt.count + stt.blocked > 0, ghost = stt.count === 0, active = activeRes === id, asking = live && f.pend && f.next.res === id;
      if (id === 'tool' && !used && !asking) return;
      var names = f.targets[id], target = names.length ? names.slice(0, 2).join(', ') + (names.length > 2 ? ' +' + (names.length - 2) : '') : (id === 'agent' ? h.agent : r.target);
      var col = perm === 'blocked' ? HZ_PCOL.blocked : (perm === 'ask' ? HZ_PCOL.ask : (active ? accent : '#6B6C73'));
      var picked = !!s.hzSel && s.hzSel.id === it.id && s.hzSel.res === id;
      links[id] = { d: 'M' + cx + ' ' + cy + 'L' + tcx + ' ' + tcy, stroke: col, w: 1.6 + Math.min(stt.count, 8) * 0.5, op: used ? (ghost ? 0.45 : 1) : (asking ? 1 : 0), style: active ? 'animation: wb-dash 0.5s linear infinite;' : '' };
      var parts = Object.keys(stt.ops).map(function (k) { return tr(HZ_OPW[k]) + ' ' + stt.ops[k]; });
      if (stt.blocked) parts.push(fmt('blocked {0}', stt.blocked));
      if (stt.count && id !== 'tool') labels.push({ text: '×' + stt.count, style: 'position: absolute; left: ' + Math.round(cx + (tcx - cx) * 0.56) + 'px; top: ' + Math.round(cy + (tcy - cy) * 0.56) + 'px; transform: translate(-50%, -50%); padding: 1px 8px; border-radius: 999px; background: #FFFFFF; border: 1px solid ' + col + '; ' + MONO + ' font-size: 12px; color: ' + col + '; z-index: 5; pointer-events: none;' });
      tools.push({
        stk: HZ_STK[id], kind: r.kind, target: target, summary: parts.length ? parts.join(' · ') : 'Not used yet', state: HZ_PNAME[perm],
        hasSubs: subs.length > 0, subs: subs, usesLabel: 'uses', pressed: picked ? 'true' : 'false', pickTip: 'See what it did here', cycleTip: 'Change what AI steps may do here',
        pick: function () { var cur = self.state.hzSel; self.setState({ hzSel: cur && cur.id === it.id && cur.res === id ? null : { id: it.id, res: id }, aiOpen: false, inspect: null }); },
        cycle: function () { self.hzCycle(id); },
        dot: 'width: 8px; height: 8px; border-radius: 50%; background: ' + HZ_PCOL[perm] + ';',
        style: 'position: absolute; left: ' + tx + 'px; top: ' + ty + 'px; width: ' + NW + 'px; min-height: ' + nh + 'px; box-sizing: border-box; padding: 10px 12px; display: flex; flex-direction: column; gap: 6px; background: #FFFFFF; border-radius: 14px; z-index: 5; cursor: default; animation: wb-hzpop 240ms cubic-bezier(0.2, 0.8, 0.2, 1)' + (active && !asking ? ', wb-hzpulse 1.2s ease-out infinite' : '') + '; opacity: ' + (ghost && !asking ? 0.72 : 1) + '; border: ' + (picked ? '2px solid ' + accent : (asking ? '2px solid #B45309' : (ghost ? '1.5px dashed ' + (perm === 'allow' ? '#A9ABB4' : HZ_PCOL[perm]) : (active ? '1.5px solid ' + accent : '1px solid #D2D3D9')))) + '; box-shadow: 0 1px 2px rgba(20,20,30,0.05), 0 6px 16px rgba(20,20,30,0.06);'
      });
    });
    return {
      show: true, links: links, labels: labels, tools: tools,
      region: 'position: absolute; left: ' + (cx - 340) + 'px; top: ' + (it.y - 226) + 'px; width: 680px; height: ' + (it.h + 450) + 'px; box-sizing: border-box; border: 1.5px dashed #8FA9E0; border-radius: 28px; background: rgba(246,248,253,0.95); box-shadow: 0 18px 48px rgba(20,20,30,0.14); z-index: 4; cursor: default; animation: wb-open 300ms cubic-bezier(0.2, 0.8, 0.2, 1);',
      title: fmt('Inside #{0}: what it touches', it.id),
      canPause: batchOn || !live,
      pauseLabel: !live ? 'Back to live' : (s.paused ? 'Resume' : 'Pause'),
      pauseStyle: 'flex: 0 0 auto; height: 34px; padding: 0 12px; font-size: 13px; background: ' + accent + '; color: #FFFFFF;',
      pause: function () { if (!live || self.state.paused) self.hzResume(); else self.hzPause(); },
      replayLabel: 'Replay', max: max, val: view,
      onScrub: function (e) { self.hzScrub(it.id, Number(e.target.value)); },
      stepLabel: fmt('step {0} / {1}', view, max),
      now: view ? hzText(h.script[view - 1]) + (h.log[view - 1] === 'blocked' ? ' ' + tr('(blocked)') : '') : 'Nothing has run yet. Run the flow to see what this step touches.'
    };
  }

  renderInspect(selItem, byId, accent, tint) {
    var self = this, s = this.state, it = s.inspect ? (selItem && selItem.kind === 'node' ? selItem : byId[s.inspect]) : null;
    if (!it || it.kind !== 'node') return { show: false, groups: [] };
    var def = NODE_BY[it.ntype] || NODE_DEFS[0], t = def.t, res = s.out[it.id] || null, inputs = this.inputsFor(it.id), req = null, reqErr = '';
    try { if (def.cat === 'fn' || def.pkg) req = nodeRequest(it, inputs, s.perms); } catch (err) { reqErr = String(err.message || err); }
    var api = req && req.where === 'backend' ? API[req.kind] : null, local = !!req && req.where === 'local';
    var hn = HARNESS[t] || null;
    var where = hn ? fmt(t === 'llm' ? 'Our own harness: {0}. Runs on the server.' : 'Runs on {0}, on the server.', tr(hn.name)) : def.cat === 'info' ? 'Holds content. There is nothing to run.' : (t === 'gate' ? 'Waits for a person to approve.' : ((def.cat === 'render' && !api) || local ? 'Runs in your browser, for real.' : 'Runs on the server. If its service is not set up there, the result is simulated and says so.'));
    var preCss = MONO + ' margin: 0; padding: 10px; border-radius: 10px; font-size: 12px; line-height: 1.5; white-space: pre-wrap; overflow-wrap: anywhere; max-height: 180px; overflow: auto; ';
    var filled = preCss + 'background: #F6F6F8; color: #111114;', hollow = preCss + 'background: #FAFAFB; color: #6B6C73; border: 1px dashed #D7D8DD;';
    var inText = inputs.map(function (i) { return '#' + i.from + '  ' + i.type + '\n' + clipText(showVal(i.value), 500); }).join('\n\n');
    var outText = '', badge = '', badgeCss = 'display: none;';
    var chip = function (bg, fg) { return 'flex: 0 0 auto; padding: 1px 8px; border-radius: 999px; font-size: 11.5px; background: ' + bg + '; color: ' + fg + ';'; };
    if (res && res.error) { outText = tr(res.error); badge = 'Failed'; badgeCss = chip('#FDE7E4', '#B42318'); }
    else if (res) {
      outText = ((res.logs && res.logs.length ? res.logs.join('\n') + '\n\n' : '') + (res.meta ? res.meta + '\n' : '') + (res.text || tr('No value returned')));
      badge = res.sim ? 'Simulated' : 'Real result';
      badgeCss = res.sim ? chip('#FFE9C7', '#7A4100') : chip('#DDF3E4', '#1F6B3A');
    }
    return {
      show: true, title: tr(def.label) + '  #' + it.id, where: where, closeLabel: 'Close inspector', close: function () { self.setState({ inspect: null }); },
      groups: (NODE_OPTS[t] || []).map(function (g) {
        var cur = cfgOf(it, g.key);
        return { label: g.label, opts: g.opts.map(function (op) {
          var on = cur === op[0];
          return { label: op[1], pressed: on ? 'true' : 'false', pick: function () { self.setCfg(it.id, g.key, op[0]); }, style: 'height: 34px; padding: 0 12px; border-radius: 9px; font-size: 13px; border: 1px solid ' + (on ? accent : '#DCDDE2') + ';' + (on ? ' background: ' + tint + '; color: ' + accent + ';' : ' background: #FFFFFF; color: #111114;') };
        }) };
      }),
      hasHint: !!NODE_HINT[t], hint: NODE_HINT[t] || '',
      inLabel: 'Flows in', inText: inText || tr('Nothing flows in yet.'), inStyle: inText ? filled : hollow,
      outLabel: 'Flows out', outText: outText || tr('Not run yet.'), outStyle: res && res.error ? preCss + 'background: #FEF3F2; color: #B42318;' : (outText ? filled : hollow), badge: badge, badgeStyle: badgeCss,
      canRun: canRunDef(def), runLabel: 'Run this node', run: function () { self.runNode(it.id); },
      isFn: def.cat === 'fn' || !!def.pkg, reqLabel: 'Backend request',
      hasReq: !!api, reqLine: api ? api.method + ' ' + api.path : '', reqBody: api ? JSON.stringify(req.body, null, 2) : '', reqStyle: filled, reqNote: api ? api.note : '',
      reqPlain: !api, reqText: reqErr ? tr(reqErr) : 'No backend call. This node runs in the browser.', reqTextStyle: 'margin: 0; font-size: 13px; line-height: 1.45; color: ' + (reqErr ? '#B42318' : '#6B6C73') + ';',
      hasMap: !!hn, mapLabel: 'How its tool calls become nodes', mapNote: hn ? fmt('Listens to: {0}', hn.stream) : '', gateNote: hn ? hn.gate : '',
      maps: hn ? hn.map.map(function (m) { return { from: m[0], to: HZ_RES[m[1]].kind }; }).concat(t === 'acp' ? [] : [{ from: tr('anything else'), to: HZ_RES.tool.kind }]) : [],
      apiLabel: 'All backend interfaces', openApi: function () { self.setState({ apiOpen: true }); }
    };
  }

  // Server: the market lists the built-in nodes and every node people published.
  openMarket(tab) {
    var self = this;
    this.setState({ market: { tab: tab || 'browse', q: '', cat: 'all' }, panel: null, menu: null });
    api('GET', '/v1/market/nodes').then(function (r) { setMarket(r.nodes); self.forceUpdate(); }, function (err) { self.flash(String(err.message || err)); });
  }

  nodeName(t) { var d = NODE_BY[t]; return d ? (d.pkg ? d.label : tr(d.label)) : t; }

  hasNode(t) { var d = NODE_BY[t]; return !!d && (d.pkg ? this.state.installed.indexOf(d.pkg.id) >= 0 : this.state.shelf.indexOf(t) >= 0); }

  // Puts a node in the Nodes panel. Works for built-in nodes and market nodes alike.
  installNode(t, quiet) {
    var d = NODE_BY[t], s = this.state;
    if (!d || this.hasNode(t)) return;
    if (d.pkg) this.setState({ installed: s.installed.concat([d.pkg.id]) });
    else this.setState({ shelf: s.shelf.concat([t]) });
    if (!quiet) this.flash(fmt('Installed {0}. It is in the node panel.', this.nodeName(t)));
  }

  removeNode(t) {
    var d = NODE_BY[t], s = this.state;
    if (!d) return;
    var patch = { pins: s.pins.filter(function (x) { return x !== t; }) };
    if (d.pkg) patch.installed = s.installed.filter(function (x) { return x !== d.pkg.id; });
    else patch.shelf = s.shelf.filter(function (x) { return x !== t; });
    this.setState(patch);
    this.flash(fmt('Removed {0}. Nodes already on the board keep working.', this.nodeName(t)));
  }

  placeNode(t) { this.setState({ nodeType: t, tool: 'node', market: null, panel: null, selected: null, welcome: false, menu: null }); }

  // The toolbar is for the nodes this person uses most. They decide which.
  togglePin(t) {
    var s = this.state, on = s.pins.indexOf(t) >= 0;
    if (!NODE_BY[t]) return;
    if (!on && s.pins.length >= PIN_MAX) { this.flash(fmt('The toolbar holds {0} nodes. Unpin one first.', PIN_MAX)); return; }
    if (!on) this.installNode(t, true);
    this.setState({ pins: on ? s.pins.filter(function (x) { return x !== t; }) : s.pins.concat([t]), menu: null });
    this.flash(fmt(on ? 'Unpinned {0}. It is still in the node panel.' : 'Pinned {0} to the toolbar', this.nodeName(t)));
  }

  installPkg(id) { this.installNode('pkg:' + id); }

  removePkg(id) { this.removeNode('pkg:' + id); }

  placePkg(id) { this.placeNode('pkg:' + id); }

  // Reads the manifest being written. { p, errs, parseErr }
  readDraft() {
    var p = null, parseErr = '';
    try { p = JSON.parse(this.state.draft); } catch (err) { parseErr = String(err.message || err); }
    var errs = parseErr ? [] : validatePkg(p);
    if (!parseErr && !errs.length && (MARKET.some(function (m) { return m.id === p.id; }) || isBuiltin(p.id))) errs.push({ path: 'id', text: tr('This id is already taken in the market') });
    return { p: p, errs: errs, parseErr: parseErr };
  }

  addMine() {
    var d = this.readDraft();
    if (d.parseErr || d.errs.length) { this.flash('Fix the problems in the list first'); return null; }
    registerPkg(d.p);
    var s = this.state;
    this.setState({ mine: s.mine.filter(function (m) { return m.id !== d.p.id; }).concat([d.p]), installed: s.installed.indexOf(d.p.id) >= 0 ? s.installed.slice() : s.installed.concat([d.p.id]) });
    this.flash(fmt('Added {0} to your nodes. It is in the node panel.', d.p.name));
    return d.p;
  }

  publishMine() {
    var self = this, p = this.addMine();
    if (!p) return;
    backend('marketPublish', { manifest: p }).then(function (r) {
      if (!r.ok) { self.flash(fmt('The market refused it: {0}', (r.problems[0] || {}).text || '')); return; }
      self.flash(fmt('Published {0} to the market', p.name));
      api('GET', '/v1/market/nodes').then(function (x) { setMarket(x.nodes); self.forceUpdate(); }, function () { return null; });
    }, function (err) { self.flash(String(err.message || err)); });
  }

  // Server: MCP settings carry a fresh API token, so a coding agent can publish as this person.
  copyMcp() {
    var self = this;
    api('POST', '/v1/me/tokens', { label: 'MCP' }).then(function (r) {
      self.copyText(mcpConfig(window.location.origin, r.token), 'MCP settings copied, with a new token');
    }, function (err) { self.flash(String(err.message || err)); });
  }

  renderMarket(accent, tint) {
    var self = this, s = this.state, m = s.market;
    var nop = function () {};
    var off = { open: false, tabs: [], filters: [], cards: [], checks: [], tools: [], rules: [], isBrowse: false, isPublish: false, empty: false, emptyText: '', pubIntro: '', draftLabel: '', draft: '', onDraft: nop, checkTitle: '', blocked: 'true', tryIt: nop, tryStyle: '', tryLabel: '', publish: nop, pubStyle: '', pubLabel: '', reset: nop, resetLabel: '', rulesTitle: '', agentTitle: '', agentNote: '', copySkill: nop, copyMcp: nop, agentBtn: '', skillLabel: '', mcpLabel: '' };
    if (!m) return off;
    var set = function (patch) { self.setState({ market: Object.assign({}, self.state.market, patch) }); };
    var pill = function (on) { return 'height: 36px; padding: 0 14px; border-radius: 10px; font-size: 13.5px; ' + (on ? 'background: ' + tint + '; color: ' + accent + ';' : 'background: transparent; color: #3A3B40;'); };
    var chip = function (bg, fg) { return 'flex: 0 0 auto; padding: 1px 8px; border-radius: 999px; font-size: 11.5px; background: ' + bg + '; color: ' + fg + ';'; };
    var o = Object.assign(off, {
      open: true, title: 'Node market', closeLabel: 'Close the node market', close: function () { self.setState({ market: null }); },
      intro: 'Every node there is: ours and the ones other people made. Install what you need, and pin what you use most to the toolbar.',
      tabs: [['browse', 'Browse'], ['installed', fmt('Installed ({0})', s.installed.length + s.shelf.length)], ['publish', 'Make your own']].map(function (t) {
        return { label: t[1], current: m.tab === t[0] ? 'true' : 'false', pick: function () { set({ tab: t[0] }); }, style: pill(m.tab === t[0]) };
      }),
      isBrowse: m.tab !== 'publish', isPublish: m.tab === 'publish',
      q: m.q, onQ: function (e) { set({ q: e.target.value }); }, searchLabel: 'Search nodes', searchHint: 'Search by name or what it does',
      note: 'Nodes other people published to this server are listed here, after the same check.'
    });
    if (o.isBrowse) {
      var q = m.q.trim().toLowerCase(), mineIds = s.mine.map(function (x) { return x.id; });
      var wires = function (t) { var d = NODE_BY[t]; return d.cat === 'info' ? tr('nothing') : (ACCEPTS[t] ? ACCEPTS[t].filter(function (w) { return w !== 'context' && w !== 'approval'; }).join(', ') : tr('anything')); };
      var all = NODE_DEFS.map(function (d) {
        return { t: d.t, builtin: true, name: tr(d.label), by: 'flowboard', summary: tr(BUILTIN_SUM[d.t] || ''), io: wires(d.t) + ' → ' + d.out, local: !BUILTIN_BACKEND[d.t], words: d.label + ' ' + (BUILTIN_SUM[d.t] || '') + ' ' + d.t };
      }).concat(MARKET.concat(s.mine).map(function (p) {
        return { t: 'pkg:' + p.id, builtin: false, name: p.name, by: (p.publisher || p.author) + ' · ' + p.version, summary: p.summary, io: p.accepts.join(', ') + ' → ' + p.output, local: p.runs === 'browser', words: p.name + ' ' + p.summary + ' ' + p.author + ' ' + p.id, yours: mineIds.indexOf(p.id) >= 0 };
      }));
      all.forEach(function (e, i) { e.has = self.hasNode(e.t); e.rank = (e.has ? 2 : (e.builtin ? 0 : 1)) * 1000 + i; });
      all.sort(function (a, b) { return a.rank - b.rank; });
      o.filters = [['all', 'All'], ['builtin', 'Built in'], ['others', 'From others']].map(function (f) {
        return { label: f[1], pressed: m.cat === f[0] ? 'true' : 'false', pick: function () { set({ cat: f[0] }); }, style: 'height: 32px; padding: 0 12px; border-radius: 999px; font-size: 13px; border: 1px solid ' + (m.cat === f[0] ? accent : '#DCDDE2') + ';' + (m.cat === f[0] ? ' background: ' + tint + '; color: ' + accent + ';' : ' background: #FFFFFF; color: #111114;') };
      });
      o.cards = all.filter(function (e) {
        if (m.tab === 'installed' && !e.has) return false;
        if (m.cat === 'builtin' && !e.builtin) return false;
        if (m.cat === 'others' && e.builtin) return false;
        return !q || (e.words + ' ' + e.name + ' ' + e.summary).toLowerCase().indexOf(q) >= 0;
      }).map(function (e) {
        var pinned = s.pins.indexOf(e.t) >= 0;
        return {
          t: { _v: 1, name: e.name, by: e.by, summary: e.summary, io: e.io },
          stk: NODE_STK[e.t] || NODE_STK.pkg,
          runs: e.local ? 'Runs in the browser' : 'Needs the backend', runsStyle: e.local ? chip('#DDF3E4', '#1F6B3A') : chip('#FFE9C7', '#7A4100'),
          yours: !!e.yours, yoursLabel: 'Yours', yoursStyle: chip('#E7EEFB', '#1A46A8'),
          checked: e.builtin ? 'Built in' : 'Passed the check', checkedStyle: chip('#F3F4F6', '#3A3B40'),
          mainLabel: e.has ? 'Add to the board' : 'Install', main: function () { if (e.has) self.placeNode(e.t); else self.installNode(e.t); },
          mainStyle: 'height: 36px; padding: 0 14px; ' + (e.has ? 'background: #F3F4F6; color: #111114;' : 'background: ' + accent + '; color: #FFFFFF;'),
          has: e.has, removeLabel: 'Remove', remove: function () { self.removeNode(e.t); },
          pinLabel: pinned ? 'Unpin' : 'Pin to the toolbar', pinPressed: pinned ? 'true' : 'false', pin: function () { self.togglePin(e.t); },
          pinStyle: 'height: 36px; padding: 0 12px; ' + (pinned ? 'background: ' + tint + '; color: ' + accent + ';' : 'background: transparent; color: #3A3B40;')
        };
      });
      o.empty = !o.cards.length;
      o.emptyText = m.tab === 'installed' && !q ? 'Nothing installed yet. Find a node under Browse.' : 'No node matches. Try other words, or make your own.';
    } else {
      var d = this.readDraft(), ok = !d.parseErr && !d.errs.length;
      var row = function (c) { return 'display: flex; align-items: baseline; gap: 8px; padding: 7px 10px; border-radius: 9px; font-size: 13px; line-height: 1.4; ' + (c ? 'background: #FEF3F2; color: #8A1C12;' : 'background: #EAF4EE; color: #14532D;'); };
      o.pubIntro = 'You describe the node. The board draws it. Say what it takes, what it gives back, its settings, and write the one function that does the work.';
      o.draft = s.draft; o.onDraft = function (e) { self.setState({ draft: e.target.value }); }; o.draftLabel = 'Node manifest (JSON)';
      o.checkTitle = 'Check';
      o.checks = d.parseErr ? [{ _v: 1, path: 'JSON', text: fmt('This is not valid JSON: {0}', d.parseErr), style: row(true) }]
        : (ok ? [{ _v: 1, path: '', text: tr('No problems. The board can draw and run this node.'), style: row(false) }] : d.errs.map(function (e) { return { _v: 1, path: e.path, text: e.text, style: row(true) }; }));
      o.tryLabel = 'Add to my nodes'; o.tryIt = function () { self.addMine(); };
      o.tryStyle = 'height: 40px; padding: 0 16px; background: ' + accent + '; color: #FFFFFF;' + (ok ? '' : ' opacity: 0.45;');
      o.pubLabel = 'Publish to the market'; o.publish = function () { self.publishMine(); };
      o.pubStyle = 'height: 40px; padding: 0 16px; background: #F3F4F6; color: #111114;' + (ok ? '' : ' opacity: 0.45;');
      o.blocked = ok ? 'false' : 'true';
      o.resetLabel = 'Start from the example'; o.reset = function () { self.setState({ draft: JSON.stringify(PKG_TEMPLATE, null, 2) }); };
      o.rulesTitle = 'What keeps every node looking the same';
      o.rules = UI_RULES.map(function (r) { return { text: r }; });
      o.agentTitle = 'Let your coding agent build it';
      o.agentNote = 'Give your agent the skill or connect it to our MCP server. Both carry the same format and rules as the check above, so what it builds fits in.';
      o.tools = MCP_TOOLS.map(function (t) { return { name: { _v: 1, text: t[0] }, text: t[1] }; });
      o.skillLabel = 'Copy the skill'; o.copySkill = function () { self.copyText(skillText(), 'Skill copied'); };
      o.mcpLabel = 'Copy the MCP settings'; o.copyMcp = function () { self.copyMcp(); };
      o.agentBtn = 'height: 36px; padding: 0 14px; background: #F3F4F6; color: #111114;';
    }
    return o;
  }

  saveText(name, mime, text) {
    try {
      var url = URL.createObjectURL(new Blob([text], { type: mime }));
      var link = document.createElement('a');
      link.href = url; link.download = name;
      link.click();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      this.flash(fmt('Downloaded {0}', name));
    } catch (err) { this.flash('Downloads are blocked in this preview'); }
  }

  // Server: makes the Word, Excel or PowerPoint file and downloads it.
  exportFile(id, format) {
    var self = this, res = this.state.out[id], vw = res && res.view;
    if (!vw) return;
    this.flash(fmt('Asking the backend for a .{0} file', format));
    files.export(format, vw.title || id, { kind: vw.kind, blocks: vw.blocks, head: vw.head, rows: vw.rows, slides: vw.slides }).then(function (r) {
      var a = document.createElement('a');
      a.href = fileUrl(r.url); a.download = r.name; a.click();
      self.flash(fmt('Your .{0} file is ready', format));
    }, function (err) { self.flash(String(err.message || err)); });
  }

  openViewer(id) { this.setState({ viewer: { id: id, src: false, col: -1, dir: 1 }, menu: null }); }

  slideGo(id, n) {
    var res = this.state.out[id], vw = res && res.view;
    if (!vw || vw.kind !== 'slides') return;
    var at = Object.assign({}, this.state.slideAt);
    at[id] = Math.max(0, Math.min(vw.slides.length - 1, n));
    this.setState({ slideAt: at });
  }

  // Draws what a render node made, inside the node.
  renderView(it, o, vw, base, pvTop, bottom, accent) {
    var self = this, s = this.state, TH = { bg: '#FFFFFF', ink: '#111114', accent: accent, center: false };
    var small = function (label, right, run, off) { return { label: label, disabled: !!off, pick: run, style: 'position: absolute; right: ' + right + 'px; bottom: ' + (bottom + 6) + 'px; height: 26px; padding: 0 9px; border-radius: 8px; font-size: 11px; background: #ECEDEF; color: #111114;' + (off ? ' opacity: 0.45;' : '') }; };
    o.pvShow = true;
    if (vw.kind === 'doc') {
      o.pv = base + 'gap: 5px; padding: 12px 14px; background: #FFFFFF; border: 1px solid #D7D8DD;';
      o.blocks = drawBlocks(vw.blocks, 0.7, TH, 12, 150);
    } else if (vw.kind === 'sheet') {
      o.pv = base + 'background: #FFFFFF; border: 1px solid #C9CBD2;';
      o.blocks = drawBlocks([{ k: 'table', head: vw.head, rows: vw.rows }], 0.8, { bg: '#FFFFFF', ink: '#111114', accent: '#1F6B3A', center: false }, 1, 60);
      o.blocks[0].style = 'flex: 1 1 auto; min-height: 0; overflow: hidden; box-sizing: border-box;';
      o.pvCap = true; o.pvCapText = fmt('{0} rows · {1} columns', vw.total, vw.head.length);
      o.pvCapStyle = 'flex: 0 0 auto; padding: 4px 8px; border-top: 1px solid #E3E4E8; background: #F6F6F8; font-size: 11.5px; color: #3A3B40;';
    } else if (vw.kind === 'slides') {
      var n = Math.max(0, Math.min(vw.slides.length - 1, s.slideAt[it.id] || 0)), sl = vw.slides[n], solo = !sl.items.length;
      o.pv = base + 'gap: 4px; padding: 12px 14px 38px; background: #FFFFFF; border: 1px solid #D7D8DD;' + (solo ? ' justify-content: center;' : '');
      o.blocks = drawBlocks([{ k: 'h2', text: sl.title || fmt('Slide {0}', n + 1) }].concat(sl.items), 0.72, Object.assign({}, TH, { center: solo }), 7, 110);
      o.pvCap = true; o.pvCapText = (n + 1) + ' / ' + vw.slides.length;
      o.pvCapStyle = 'position: absolute; left: 12px; bottom: 9px; ' + MONO + ' font-size: 11px; color: #6B6C73;';
      o.acts = [small('Next slide', 18, function () { self.slideGo(it.id, n + 1); }, n >= vw.slides.length - 1), small('Previous slide', 96, function () { self.slideGo(it.id, n - 1); }, n <= 0)];
    } else if (vw.kind === 'page') {
      var phone = it.device === 'phone', th = vw.theme || {}, pth = { bg: okHex(th.bg) || '#FFFFFF', ink: okHex(th.ink) || '#111114', accent: okHex(th.accent) || accent, center: !!th.center };
      o.pv = 'position: absolute; top: ' + pvTop + 'px; bottom: ' + bottom + 'px; ' + (phone ? 'left: 50%; width: 148px; margin-left: -74px;' : 'left: 12px; right: 12px;') + ' box-sizing: border-box; border-radius: 8px; overflow: hidden; display: flex; flex-direction: column; gap: 6px; background: ' + pth.bg + '; border: 1px solid #C9CBD2;';
      o.pvChrome = true;
      o.blocks = drawBlocks(vw.blocks, phone ? 0.66 : 0.72, pth, 10, 120, phone ? 9 : 14);
      var seg = function (label, key, right) {
        var on = (it.device || 'desktop') === key;
        return { label: label, disabled: false, pick: function () { self.update(it.id, { device: key }); }, style: 'position: absolute; right: ' + right + 'px; bottom: ' + (bottom + 6) + 'px; height: 26px; padding: 0 9px; border-radius: 8px; font-size: 11px; ' + (on ? 'background: ' + accent + '; color: #FFFFFF;' : 'background: #ECEDEF; color: #111114;') };
      };
      o.acts = [seg('Phone', 'phone', 18), seg('Desktop', 'desktop', 74)];
    } else {
      o.pv = base + 'gap: 7px; padding: 12px; background: #FFFFFF; border: 1px solid #D7D8DD;';
      o.pvPre = true; o.pvPreText = clipText(vw.source, 900);
      o.pvPreStyle = MONO + ' flex: 1 1 auto; min-height: 0; overflow: hidden; font-size: 12px; line-height: 1.45; white-space: pre-wrap; overflow-wrap: anywhere; color: #3A3B40;';
    }
  }

  // The full view of a render node: the whole document, a sortable table, the
  // deck with a pager, or the page with its source.
  renderViewer(byId, accent) {
    var self = this, s = this.state, v = s.viewer, it = v ? byId[v.id] : null, res = it ? s.out[it.id] : null, vw = res && res.view;
    var nop = function () {};
    var off = { open: false, blocks: [], cols: [], rows: [], thumbs: [], acts: [], sums: [], grid: '', headRow: '', corner: '', paper: '', pos: '', prev: nop, next: nop, prevLabel: '', nextLabel: '', noPrev: true, noNext: true, heading: { text: '' }, src: { text: '' } };
    if (!v || !it || !vw) return off;
    var def = NODE_BY[it.ntype] || NODE_DEFS[0], TH = { bg: '#FFFFFF', ink: '#111114', accent: accent, center: false };
    var name = slugOf(vw.title) || it.id, kind = vw.kind;
    var act = function (label, run, primary) { return { label: label, run: run, style: 'height: 40px; padding: 0 14px; ' + (primary ? 'background: ' + accent + '; color: #FFFFFF;' : 'background: #F3F4F6; color: #111114;') }; };
    var set = function (patch) { self.setState({ viewer: Object.assign({}, self.state.viewer, patch) }); };
    var paper = 'box-sizing: border-box; width: 100%; margin: 0 auto; display: flex; flex-direction: column; background: #FFFFFF; border: 1px solid #E3E4E8;';
    var o = Object.assign(off, {
      open: true, title: tr(def.label) + ' · #' + it.id, heading: { _v: 1, text: vw.title || tr(def.label) }, close: function () { self.setState({ viewer: null }); }, closeLabel: 'Close full view',
      sim: false, simLabel: 'Built from a simulated answer', note: '', isBlocks: false, isSheet: false, isSlides: false, showSrc: false, hasSums: false,
      stage: 'flex: 1 1 auto; min-height: 0; overflow: auto; box-sizing: border-box; padding: 18px; border-radius: 12px; background: #F0F1F4;'
    });
    var G = flowGraph(s.items), seen = {}, q = (G.ins[it.id] || []).slice();
    while (q.length) { var u = q.shift(); if (seen[u]) continue; seen[u] = 1; if (s.out[u] && s.out[u].sim) o.sim = true; q = q.concat(G.ins[u] || []); }
    if (kind === 'doc') {
      o.isBlocks = true;
      o.blocks = drawBlocks(vw.blocks, 1, TH, 600, 0);
      o.paper = paper + ' max-width: 760px; gap: 11px; padding: 40px 44px; border-radius: 6px;';
      o.note = fmt('{0} words · about {1} min to read', vw.words, Math.max(1, Math.round(vw.words / 220)));
      o.acts = [act('Download .md', function () { self.saveText(name + '.md', 'text/markdown', vw.source); }, true), act('Download .html', function () { self.saveText(name + '.html', 'text/html', blocksToHtml(vw.blocks, vw.title)); }), act('Export .docx', function () { self.exportFile(it.id, 'docx'); })];
    } else if (kind === 'sheet') {
      o.isSheet = true;
      var rows = vw.rows.map(function (r, i) { return { r: r, i: i }; }), col = v.col, dir = v.dir;
      if (col >= 0 && col < vw.head.length) {
        rows.sort(function (a, b) {
          var x = a.r[col], y = b.r[col], nx = numOf(x), ny = numOf(y), c;
          if (x === '' || y === '') c = x === y ? 0 : (x === '' ? 1 : -1);
          else if (nx !== null && ny !== null) c = (nx - ny) * dir;
          else c = (String(x).toLowerCase() < String(y).toLowerCase() ? -1 : (String(x).toLowerCase() > String(y).toLowerCase() ? 1 : 0)) * dir;
          return c || a.i - b.i;
        });
      }
      var numCol = vw.head.map(function (h, c) { return vw.rows.some(function (r) { return r[c] !== ''; }) && vw.rows.every(function (r) { return r[c] === '' || numOf(r[c]) !== null; }); });
      var cw = 'flex: 1 0 120px; min-width: 0; box-sizing: border-box;';
      o.grid = 'min-width: ' + (vw.head.length * 120 + 44) + 'px; background: #FFFFFF; border: 1px solid #D2D3D9; border-radius: 8px; overflow: hidden;';
      o.headRow = 'display: flex; background: #EAF4EE; position: sticky; top: 0;';
      o.corner = 'flex: 0 0 44px; box-sizing: border-box; border-right: 1px solid #D2D3D9;';
      o.cols = vw.head.map(function (h, c) {
        var on = col === c;
        return { _v: 1, label: h, mark: on ? (dir > 0 ? '↑' : '↓') : '', sort: on ? (dir > 0 ? 'ascending' : 'descending') : 'none', hint: fmt('Sort by {0}', h),
          pick: function () { set(on ? (dir > 0 ? { dir: -1 } : { col: -1, dir: 1 }) : { col: c, dir: 1 }); },
          style: cw + ' border-right: 1px solid #D2D3D9;',
          btn: 'width: 100%; height: 36px; box-sizing: border-box; display: flex; align-items: center; gap: 6px; padding: 0 10px; border-radius: 0; background: transparent; font-size: 13px; color: #14532D; text-align: left;' + (numCol[c] ? ' justify-content: flex-end;' : '') };
      });
      o.rows = rows.map(function (x, j) {
        return { _v: 1, style: 'display: flex; border-top: 1px solid #E3E4E8;', num: String(x.i + 1), numStyle: 'flex: 0 0 44px; box-sizing: border-box; padding: 7px 8px; border-right: 1px solid #E3E4E8; background: #F6F6F8; ' + MONO + ' font-size: 11.5px; color: #6B6C73; text-align: right;',
          cells: x.r.map(function (c, k) { return { text: c, style: cw + ' padding: 7px 10px; border-right: 1px solid #EEEFF2; font-size: 13.5px; line-height: 1.4; color: #111114; overflow-wrap: anywhere;' + (numCol[k] ? ' text-align: right; font-variant-numeric: tabular-nums;' : '') }; }) };
      });
      o.note = fmt('{0} rows · {1} columns', vw.total, vw.head.length) + (vw.total > vw.rows.length ? ' · ' + fmt('showing the first {0}', vw.rows.length) : '') + ' · ' + tr('Select a column name to sort');
      o.hasSums = vw.sums.length > 0;
      o.sums = vw.sums.map(function (x) { return { _v: 1, text: fmt('Sum of {0}: {1}', x.label, x.value) }; });
      o.acts = [act('Download .csv', function () { self.saveText(name + '.csv', 'text/csv', vw.source); }, true), act('Copy as CSV', function () { self.copyText(vw.source, 'Table copied'); }), act('Export .xlsx', function () { self.exportFile(it.id, 'xlsx'); })];
    } else if (kind === 'slides') {
      var n = Math.max(0, Math.min(vw.slides.length - 1, s.slideAt[it.id] || 0)), sl = vw.slides[n], solo = !sl.items.length;
      o.isBlocks = true; o.isSlides = true;
      o.blocks = drawBlocks([{ k: 'h1', text: sl.title || fmt('Slide {0}', n + 1) }].concat(sl.items), 1.15, Object.assign({}, TH, { center: solo }), 40, 0);
      o.paper = paper + ' max-width: 800px; aspect-ratio: 16 / 9; gap: 12px; padding: 44px 52px; border-radius: 10px; overflow: hidden;' + (solo ? ' justify-content: center;' : '');
      o.note = fmt('Slide {0} of {1}', n + 1, vw.slides.length) + ' · ' + tr('Arrow keys change the slide');
      o.pos = (n + 1) + ' / ' + vw.slides.length;
      o.noPrev = n <= 0; o.noNext = n >= vw.slides.length - 1;
      o.prev = function () { self.slideGo(it.id, n - 1); }; o.next = function () { self.slideGo(it.id, n + 1); };
      o.prevLabel = 'Previous slide'; o.nextLabel = 'Next slide';
      o.thumbs = vw.slides.map(function (x, j) {
        return { _v: 1, label: String(j + 1), name: fmt('Slide {0}: {1}', j + 1, x.title || ''), current: j === n ? 'true' : 'false', pick: function () { self.slideGo(it.id, j); },
          style: 'flex: 0 0 auto; width: 44px; height: 32px; border-radius: 7px; font-size: 12px; ' + (j === n ? 'background: ' + accent + '; color: #FFFFFF;' : 'background: #FFFFFF; border: 1px solid #D2D3D9; color: #111114;') };
      });
      o.acts = [act('Download outline (.md)', function () { self.saveText(name + '.md', 'text/markdown', vw.source); }, true), act('Export .pptx', function () { self.exportFile(it.id, 'pptx'); })];
    } else if (kind === 'page') {
      var phone = it.device === 'phone', th = vw.theme || {}, pth = { bg: okHex(th.bg) || '#FFFFFF', ink: okHex(th.ink) || '#111114', accent: okHex(th.accent) || accent, center: !!th.center };
      o.isBlocks = !v.src; o.showSrc = !!v.src;
      o.blocks = v.src ? [] : drawBlocks(vw.blocks, 1, pth, 600, 0);
      o.paper = paper + ' gap: 14px; background: ' + pth.bg + '; ' + (phone ? 'max-width: 390px; min-height: 640px; padding: 28px 20px; border-radius: 28px;' : 'max-width: 860px; min-height: 420px; padding: 36px 44px; border-radius: 10px;');
      o.note = tr(vw.fromHtml ? 'A safe preview of the page: its text, order and colours. Scripts and style sheets do not run here.' : 'A page made from the text that flows in.');
      o.acts = [act('Download .html', function () { self.saveText(name + '.html', 'text/html', vw.source); }, true), act(v.src ? 'Show the page' : 'Show the source', function () { set({ src: !v.src }); }), act(phone ? 'Desktop width' : 'Phone width', function () { self.update(it.id, { device: phone ? 'desktop' : 'phone' }); }), act('Copy the source', function () { self.copyText(vw.source, 'Source copied'); })];
    } else {
      o.showSrc = true;
      o.note = fmt('{0} characters', vw.source.length);
      o.acts = [act('Download .md', function () { self.saveText(name + '.md', 'text/markdown', vw.source); }, true), act('Copy the text', function () { self.copyText(vw.source, 'Text copied'); })];
    }
    o.src = { _v: 1, text: o.showSrc ? clipText(vw.source, 60000) : '' };
    return o;
  }

  // Server: the calls the board makes, and whether each service is real or a stand-in.
  renderApi(accent) {
    var self = this, s = this.state;
    if (!s.apiOpen) return { open: false, rows: [] };
    var st = s.apiStatus;
    if (!st && !this.statusAsked) {
      this.statusAsked = true;
      api('GET', '/v1/status').then(function (r) { self.statusAsked = false; self.setState({ apiStatus: r }); }, function () { self.statusAsked = false; });
    }
    var state = function (k) {
      if (!st) return 'Checking';
      var one = k === 'agent' || k === 'permission' ? st.agents.pi : k === 'terminal' || k === 'code' ? st.sandbox : k === 'imagegen' ? st.images : k === 'videogen' ? st.videos : { real: true };
      return one.real ? 'Connected' : 'Simulated';
    };
    return {
      open: true, title: 'Backend interfaces', closeLabel: 'Close backend interfaces', close: function () { self.setState({ apiOpen: false, apiStatus: null }); },
      intro: 'These are the calls the board makes to its server. A service that is not set up on the server answers with a simulated result and says so. JavaScript in Code nodes, Data, Palette and the Doc, Sheet, Slides, Markdown and HTML preview nodes run in the browser.',
      rows: API_ORDER.map(function (k) {
        var a = API[k];
        return { line: a.method + ' ' + a.path, user: fmt('Used by {0}', tr(API_USER[k])), note: a.note, stream: !!a.stream, streamLabel: 'Streams', state: state(k) };
      }),
      copyLabel: 'Copy contract', copy: function () { var c = contract(); c.baseUrl = window.location.origin; self.copyText(JSON.stringify(c, null, 2), 'Contract copied'); },
      copyStyle: 'align-self: flex-start; height: 40px; padding: 0 16px; background: ' + accent + '; color: #FFFFFF;'
    };
  }

  // Voice input: the browser's speech recognition fills the prompt. Spoken to the
  // robot, the request is sent as soon as it is heard.
  micChanged() {
    var self = this, s = this.state;
    if (!s.mic) { this.stopSpeech(); return; }
    var SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SR) { this.setState({ mic: false, micFrom: null }); this.flash('Voice input is not available in this browser. Type instead.'); return; }
    this.stopSpeech();
    var rec = new SR(), from = s.micFrom, heard = '';
    rec.lang = this.props.lang === 'zh' ? 'zh-CN' : 'en-US';
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = function (e) {
      var text = '';
      for (var i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      heard = text.trim();
      self.setState({ prompt: heard });
    };
    rec.onerror = function (e) { if (e.error !== 'aborted' && e.error !== 'no-speech') self.flash(e.error === 'not-allowed' ? 'Allow the microphone to talk to the board' : 'Voice input stopped'); };
    rec.onend = function () {
      if (self.speech !== rec) return;
      self.speech = null;
      if (self.state.mic) self.setState({ mic: false, micFrom: null });
      if (heard && from === 'bot') self.chatStart(heard);
      else if (heard) self.setChat(true);
    };
    this.speech = rec;
    try { rec.start(); } catch (err) { this.speech = null; this.setState({ mic: false, micFrom: null }); }
  }

  stopSpeech() {
    var rec = this.speech;
    if (!rec) return;
    try { rec.stop(); } catch (err) { /* already stopped */ }
  }

  renderHzPanels(byId, accent) {
    var self = this, s = this.state, sel = s.hzSel, node = sel ? byId[sel.id] : null, h = node ? s.hz[node.id] : null;
    var hzd = { show: false, rows: [], isA: false, isB: false, isC: false };
    if (sel && node) {
      h = h || { script: [], log: [], pend: false, agent: 'helper' };
      var view = s.scrub && s.scrub.id === node.id ? Math.min(s.scrub.n, h.log.length) : h.log.length, rows = [], count = 0;
      var tag = function (c) { return 'flex: 0 0 auto; min-width: 46px; ' + MONO + ' font-size: 11.5px; color: ' + c + ';'; };
      for (var i = 0; i < view; i++) {
        var ev = h.script[i];
        if (ev.res !== sel.res) continue;
        var bl = h.log[i] === 'blocked';
        if (!bl) count++;
        rows.push({ tag: tr(bl ? 'blocked' : HZ_OPW[ev.op]), tagStyle: tag(bl ? HZ_PCOL.blocked : '#3A3B40'), line: hzText(ev), lineStyle: 'font-size: 13.5px; line-height: 1.4; overflow-wrap: anywhere;' + (bl ? ' color: #6B6C73; text-decoration: line-through;' : ''), from: ev.tool || '' });
      }
      hzd = {
        show: true, title: tr(HZ_RES[sel.res].kind) + ' · ' + ((hzFacts(h, view, s.perms).targets[sel.res] || [])[0] || (sel.res === 'agent' ? h.agent : HZ_RES[sel.res].target)),
        sub: '#' + node.id + '. ' + (rows.length ? tr('Everything this step did here, in order.') : tr(HZ_PNAME[s.perms[sel.res]]) + '.'),
        rows: rows, empty: rows.length === 0, emptyText: 'Nothing here yet.', closeLabel: 'Close details', close: function () { self.setState({ hzSel: null }); },
        isBrowser: sel.res === 'browser' && count > 0, isPhone: sel.res === 'phone' && count > 0, isA: node.optName === 'A', isC: node.optName === 'C', isB: node.optName !== 'A' && node.optName !== 'C'
      };
    }
    // option groups that can be compared
    var groups = {}, cmp = { show: false }, cmpd = { open: false, cols: [] };
    s.items.forEach(function (o) { if (o.kind === 'node' && o.opt) (groups[o.opt] = groups[o.opt] || []).push(o); });
    var ready = Object.keys(groups).filter(function (g) {
      return !self.hzBatch && (s.pick === g || s.kept[g]) && groups[g].length > 1 && groups[g].every(function (o) { var x = s.hz[o.id]; return x && x.log.length >= x.script.length; });
    });
    var g = s.compare && ready.indexOf(s.compare) >= 0 ? s.compare : (s.pick && ready.indexOf(s.pick) >= 0 ? s.pick : ready[0]);
    if (g) {
      var mem = groups[g].slice().sort(function (a, b) { return (a.optName || '') < (b.optName || '') ? -1 : 1; });
      var low = mem.slice().sort(function (a, b) { return (b.y + b.h) - (a.y + a.h); })[0];
      cmp = {
        show: true, label: 'Compare side by side', open: function () { self.setState({ compare: g }); },
        style: 'position: absolute; left: ' + low.x + 'px; top: ' + (low.y + low.h + 14) + 'px; width: ' + low.w + 'px; height: 40px; z-index: 3; background: #111114; color: #FFFFFF; font-size: 13.5px;'
      };
      if (s.compare === g) {
        cmpd = {
          open: true, title: 'Compare the options', closeLabel: 'Close compare', close: function () { self.setState({ compare: null }); },
          cols: mem.map(function (o) {
            var kept = s.kept[g] === o.id, f = hzFacts(s.hz[o.id], s.hz[o.id].log.length, s.perms);
            return {
              title: fmt('Option {0}', o.optName || ''), note: (o.text || '').split('\n')[0], sum: hzSum(f), isA: o.optName === 'A', isC: o.optName === 'C', isB: o.optName !== 'A' && o.optName !== 'C',
              keepLabel: kept ? 'Kept' : 'Keep this one', keep: function () { self.keepOpt(o.id); },
              style: 'display: flex; flex-direction: column; gap: 12px; padding: 12px; border-radius: 16px; border: ' + (kept ? '2px solid ' + accent : '1px solid #E3E4E8') + ';',
              btn: 'flex: 0 0 auto; height: 38px; white-space: nowrap; ' + (kept ? 'background: #DDF3E4; color: #1F6B3A;' : 'background: ' + accent + '; color: #FFFFFF;')
            };
          })
        };
      }
    }
    return { hzd: hzd, cmp: cmp, cmpd: cmpd };
  }

  wheelZoom(e) {
    var s = this.state, r = this.rect();
    var dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    var nz = Math.max(0.25, Math.min(3, s.zoom * Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0015))));
    nz = Math.round(nz * 1000) / 1000;
    if (nz === s.zoom) return;
    var mx = e.clientX - r.left, my = e.clientY - r.top;
    this.setState({ zoom: nz, zoomMenu: false, menu: null, pan: { x: mx - (mx - s.pan.x) * (nz / s.zoom), y: my - (my - s.pan.y) * (nz / s.zoom) } });
  }

  zoomTo(nz) {
    nz = Math.max(0.25, Math.min(3, Math.round(nz * 100) / 100));
    var r = this.rect(), s = this.state, cx = r.width / 2, cy = r.height / 2;
    this.setState({ zoom: nz, zoomMenu: false, pan: { x: cx - (cx - s.pan.x) * (nz / s.zoom), y: cy - (cy - s.pan.y) * (nz / s.zoom) } });
  }

  zoomFit() {
    var items = this.state.items, byId = index(items);
    if (!items.length) { this.setState({ zoom: 1, pan: { x: 160, y: 96 }, zoomMenu: false }); return; }
    var minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
    items.forEach(function (it) {
      var b = bounds(it, byId);
      minx = Math.min(minx, b.x); miny = Math.min(miny, b.y - (it.kind === 'frame' ? 30 : 0));
      maxx = Math.max(maxx, b.x + b.w); maxy = Math.max(maxy, b.y + b.h);
    });
    var r = this.rect(), top = 80, avail = r.height - top - 170;
    var bw = Math.max(1, maxx - minx), bh = Math.max(1, maxy - miny);
    var nz = Math.round(Math.max(0.25, Math.min(1.5, (r.width - 160) / bw, avail / bh)) * 100) / 100;
    this.setState({ zoom: nz, zoomMenu: false, pan: { x: (r.width - bw * nz) / 2 - minx * nz, y: top + (avail - bh * nz) / 2 - miny * nz } });
  }

  reorderStep(dir) {
    var sel = this.state.selected, items = this.state.items.slice(), i = -1;
    items.forEach(function (o, n) { if (o.id === sel) i = n; });
    var j = i + dir;
    if (i < 0 || j < 0 || j >= items.length) return;
    var tmp = items[i]; items[i] = items[j]; items[j] = tmp;
    this.setState({ items: items, popover: null, menu: null });
  }

  pickShape(kind) { this.setState({ items: this.cleanItems(null), shapeKind: kind, tool: 'shape', panel: null, selected: null, editing: null, popover: null, welcome: false }); }

  keyUp(e) {
    if (e.key === ' ' && this.spaceTool) {
      var back = this.spaceTool;
      this.spaceTool = null;
      if (this.state.tool === 'hand') this.setState({ tool: back });
    }
  }

  key(e) {
    if (this.ro() && !this.roKey(e)) return;
    var t = e.target, tag = t && t.tagName, s = this.state, k = e.key, mod = e.metaKey || e.ctrlKey;
    if (tag === 'TEXTAREA' || tag === 'INPUT') {
      if (t.id === 'wb-prompt') { if (k === 'Escape') this.setChat(false); return; }
      if (t.id === 'wb-market-search' || t.id === 'wb-market-draft') { if (k === 'Escape') { this.setState({ market: null }); this.focusBoard(); } return; }
      if (t.id === 'wb-sticker-search') { if (k === 'Escape') { this.setState({ panel: null }); this.focusBoard(); } return; }
      if (t.getAttribute && t.getAttribute('data-pop')) { if (k === 'Escape') { this.setState({ popover: null }); this.focusBoard(); } return; }
      if (s.editing) {
        if (k === 'Escape' || (k === 'Enter' && (mod || tag === 'INPUT'))) { e.preventDefault(); this.stopEditing(); return; }
        if (mod && (k === 'b' || k === 'B')) { e.preventDefault(); var ib = this.find(s.editing); if (ib) this.update(ib.id, { bold: !ib.bold }); return; }
        if (mod && (k === 'i' || k === 'I')) { e.preventDefault(); var ii = this.find(s.editing); if (ii) this.update(ii.id, { italic: !ii.italic }); return; }
      }
      return;
    }
    if (tag === 'BUTTON' && (k === ' ' || k === 'Enter')) return;
    if (s.kc) {
      e.preventDefault();
      if (k === 'Escape') this.setState({ kc: null });
      else if (k === 'Enter') this.kcCommit();
      else if (k === 'ArrowRight' || k === 'ArrowDown' || k === 'Tab') this.kcStep(1);
      else if (k === 'ArrowLeft' || k === 'ArrowUp') this.kcStep(-1);
      return;
    }
    if (s.apiOpen) { if (k === 'Escape') { e.preventDefault(); this.setState({ apiOpen: false }); } return; }
    if (s.market) { if (k === 'Escape') { e.preventDefault(); this.setState({ market: null }); } return; }
    if (s.viewer) {
      if (k === 'Escape') { e.preventDefault(); this.setState({ viewer: null }); }
      else if (k === 'ArrowRight' || k === 'ArrowLeft') { e.preventDefault(); this.slideGo(s.viewer.id, (s.slideAt[s.viewer.id] || 0) + (k === 'ArrowRight' ? 1 : -1)); }
      return;
    }
    if (s.help) { if (k === 'Escape' || k === '?') { e.preventDefault(); this.setState({ help: false }); } return; }
    if (k === '?') { e.preventDefault(); this.setState({ help: true, menu: null, popover: null, acctMenu: null }); return; }
    if (k === ' ' && !mod) { e.preventDefault(); if (!this.spaceTool && s.tool !== 'hand') { this.spaceTool = s.tool; this.setState({ tool: 'hand' }); } return; }
    if (mod && (k === ']' || k === '}')) { e.preventDefault(); if (e.shiftKey) this.reorder(true); else this.reorderStep(1); return; }
    if (mod && (k === '[' || k === '{')) { e.preventDefault(); if (e.shiftKey) this.reorder(false); else this.reorderStep(-1); return; }
    if (mod && (k === '=' || k === '+')) { e.preventDefault(); this.zoomTo(s.zoom * 1.25); return; }
    if (mod && (k === '-' || k === '_')) { e.preventDefault(); this.zoomTo(s.zoom / 1.25); return; }
    if (mod && k === '0') { e.preventDefault(); this.zoomTo(1); return; }
    if (mod && (k === 'a' || k === 'A')) { e.preventDefault(); this.selectAll(); return; }
    if (mod && (k === 'g' || k === 'G')) { e.preventDefault(); if (e.shiftKey) this.ungroup(); else this.group(); return; }
    if (mod && (k === 'z' || k === 'Z')) { e.preventDefault(); if (e.shiftKey) this.redo(); else this.undo(); return; }
    if (mod && (k === 'y' || k === 'Y')) { e.preventDefault(); this.redo(); return; }
    if (mod && (k === 'd' || k === 'D')) { e.preventDefault(); this.duplicateSelected(); return; }
    if (!mod && s.selected && k.indexOf('Arrow') === 0) {
      e.preventDefault();
      var stepN = e.shiftKey ? 1 : (s.snap ? GRID : 8);
      this.nudge(k === 'ArrowLeft' ? -stepN : (k === 'ArrowRight' ? stepN : 0), k === 'ArrowUp' ? -stepN : (k === 'ArrowDown' ? stepN : 0));
      return;
    }
    if (mod && e.shiftKey && (k === 'l' || k === 'L')) { e.preventDefault(); this.toggleLockSel(); return; }
    if (mod && (k === 'c' || k === 'C')) { if (s.selected) { e.preventDefault(); this.copySel(); } return; }
    if (mod && (k === 'x' || k === 'X')) { if (s.selected) { e.preventDefault(); this.cutSel(); } return; }
    if (mod && (k === 'v' || k === 'V')) { e.preventDefault(); this.paste(null); return; }
    if (mod && (k === 'k' || k === 'K')) { e.preventDefault(); this.setState({ menu: null }); this.setChat(true); return; }
    if (mod || e.altKey) return;
    if (k === ']' && s.selected) { this.reorder(true); return; }
    if (k === '[' && s.selected) { this.reorder(false); return; }
    if (k === '/') { e.preventDefault(); this.setChat(true); return; }
    if ((k === 'Delete' || k === 'Backspace') && s.selected) { e.preventDefault(); this.setState({ menu: null }); this.removeSelected(); return; }
    if (k === 'Escape') {
      if (s.menu) this.setState({ menu: null });
      else if (s.bgMenu) this.setState({ bgMenu: false });
      else if (s.popover) this.setState({ popover: null });
      else if (s.panel) this.setState({ panel: null });
      else if (s.chat) this.setChat(false);
      else if (s.tool !== 'select') this.setState({ tool: 'select' });
      else this.setState({ selected: null });
      return;
    }
    if (k === 'Enter' && s.selected) { var se = this.find(s.selected); if (se && editable(se) && !se.locked) { e.preventDefault(); this.setState({ editing: se.id }); } return; }
    if (k === '+' || k === '=') { this.zoomTo(s.zoom * 1.25); return; }
    if (k === '-' || k === '_') { this.zoomTo(s.zoom / 1.25); return; }
    if (k === '0') { this.zoomTo(1); return; }
    if (k === '!' || (e.shiftKey && k === '1')) { this.zoomFit(); return; }
    var lk = k.toLowerCase();
    if (lk === 'q') { this.setState({ toolLock: !s.toolLock }); this.flash(s.toolLock ? 'Tool lock off' : 'Tool lock on: the tool stays active'); return; }
    if (lk === 'c') { this.kcStart(); return; }
    if (lk === 'n' || k === '9') { this.pickTool('node'); return; }
    if (k === '1') { this.pickTool('select'); return; }
    if (lk === 'r' || k === '2') { this.pickShape('rect'); return; }
    if (lk === 'd' || k === '3') { this.pickShape('diamond'); return; }
    if (lk === 'o' || k === '4') { this.pickShape('circle'); return; }
    if (lk === 'a' || k === '5') { this.setState({ tool: 'draw', drawMode: 'arrow', lineOnly: false, panel: null, selected: null }); return; }
    if (lk === 'l' || k === '6') { this.setState({ tool: 'draw', drawMode: 'arrow', lineOnly: true, panel: null, selected: null }); return; }
    if (lk === 'p' || k === '7') { this.setState({ tool: 'draw', drawMode: 'pen', panel: null, selected: null }); return; }
    if (k === '8') { this.pickTool('text'); return; }
    if (lk === 'e') { this.pickTool('sticker'); return; }
    if (KEYS[lk]) this.pickTool(KEYS[lk]);
  }

  renderItem(it, byId, accent, cursor, G) {
    var self = this, s = this.state, on = !!(this._selSet && this._selSet[it.id]), editing = s.editing === it.id;
    var curs = it.locked && s.tool === 'select' ? 'default' : cursor;
    var o = {
      layers: [], showText: false, editText: false, showLabel: false, editLabel: false,
      isNode: false, stk: [], bars: [], blocks: [], acts: [], canRun: false, canOpen: false, helper: false, showStk: true, hasChips: false, chips: [], pvPre: false, pvShow: false, pvChrome: false, pvIcon: false, pvHead: false, pvCap: false, hasIn: false,
      isSticky: it.kind === 'sticky', text: it.text || '', label: it.label || '',
      wrap: 'soft', placeholder: '', ariaText: 'Text', textBox: '', textStyle: '', taStyle: '', labelStyle: '',
      down: function (e) { self.itemDown(it, e); },
      dbl: function (e) { self.itemDbl(it, e); },
      menu: function (e) { self.openMenu(e, it); },
      onText: function (e) { self.update(it.id, { text: e.target.value }); },
      onLabel: function (e) { self.update(it.id, { label: e.target.value }); }
    };
    var dg = this.drag, glide = s.snap && dg && (dg.mode === 'move' || dg.mode === 'resize') ? '' : '';
    var pos = function (b) { return 'position: absolute; left: ' + b.x + 'px; top: ' + b.y + 'px; width: ' + b.w + 'px; height: ' + b.h + 'px; box-sizing: border-box; cursor: ' + curs + ';' + glide; };
    var k = it.kind;
    if (k === 'text') {
      var tb = bounds(it, byId), tc = textCss(it, accent);
      o.style = pos(tb);
      o.textBox = 'position: absolute; inset: 0;';
      o.textStyle = tc + ' white-space: pre;';
      o.taStyle = tc + ' width: 100%; height: 100%; white-space: pre;';
      o.wrap = 'off'; o.placeholder = 'Type here'; o.ariaText = 'Text';
      o.showText = !editing; o.editText = editing;
    } else if (k === 'sticky') {
      var sc = textCss(it, accent);
      o.style = pos(it) + ' background: ' + it.color + '; border-radius: 3px; box-shadow: 0 1px 2px rgba(0,0,0,0.06), 0 8px 18px rgba(0,0,0,0.07); transform: rotate(' + (it.rot || 0) + 'deg);';
      o.textBox = 'position: absolute; left: 18px; right: 18px; top: 16px; bottom: 34px; overflow: hidden;';
      o.textStyle = sc + ' white-space: pre-wrap; overflow-wrap: anywhere;';
      o.taStyle = sc + ' width: 100%; height: 100%; white-space: pre-wrap;';
      o.placeholder = 'Type something'; o.ariaText = 'Sticky note text';
      o.showText = !editing; o.editText = editing;
    } else if (k === 'shape') {
      o.style = pos(it);
      o.layers = shapeLayers(it);
      if (shapeHasText(it.shape)) {
        var st = TEXT_STYLES[it.style || 'body'] || TEXT_STYLES.body;
        var cpl = Math.max(4, (it.w - 28) / (st.fs * 0.56)), lines = 0;
        (it.text || ' ').split('\n').forEach(function (l) { lines += Math.max(1, Math.ceil(l.length / cpl)); });
        var th = Math.max(st.fs * 1.4, Math.min(it.h - 20, Math.ceil(lines * st.fs * 1.35) + 4));
        var dark = it.fill === '#2A2B30' && !it.link && (!it.color || it.color === '#111114');
        o.textBox = 'position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; padding: 10px 14px; box-sizing: border-box; overflow: hidden;' + (editing ? '' : ' pointer-events: none;');
        o.textStyle = textCss(it, accent) + ' width: 100%; white-space: pre-wrap; overflow-wrap: anywhere;' + (dark ? ' color: #FFFFFF;' : '');
        o.taStyle = o.textStyle + ' height: ' + th + 'px;';
        o.placeholder = 'Add text'; o.ariaText = 'Shape text';
        o.showText = !editing && !!it.text; o.editText = editing;
      }
    } else if (k === 'frame') {
      o.style = pos(it) + ' background: ' + it.fill + '; border: 1.5px solid #D7D8DD; border-radius: 16px;';
      o.labelStyle = 'position: absolute; left: 4px; top: -28px; height: 22px; font-size: 14px; color: #6B6C73; white-space: nowrap; width: ' + Math.max(6, (it.label || '').length + 3) + 'ch;';
      o.showLabel = !editing; o.editLabel = editing;
    } else if (k === 'sticker') {
      var def = STICKER_BY_ID[it.sticker] || STICKERS[0];
      o.style = pos(it) + ' filter: drop-shadow(0 1px 1.5px rgba(0,0,0,0.25));' + (def.flip ? ' transform: scaleY(-1);' : '');
      o.layers = def.layers;
    } else if (k === 'node') {
      o.style = pos(it) + (s.openNode === it.id ? ' z-index: 5;' : '');
      this.renderNode(it, o, byId, accent, G, editing);
    } else if (k === 'arrow') {
      var pts = arrowPts(it, byId), bx = ptsBox(pts), pad = 24;
      var ox = bx.x - pad, oy = bx.y - pad, W = bx.w + pad * 2, H = bx.h + pad * 2, vb = '0 0 ' + W + ' ' + H;
      var loc = pts.map(function (p) { return [p[0] - ox, p[1] - oy]; });
      var d = roundedPath(loc, 14), wgt = it.weight || 2, col = it.color || '#111111';
      o.style = 'position: absolute; left: ' + ox + 'px; top: ' + oy + 'px; width: ' + W + 'px; height: ' + H + 'px; pointer-events: none;';
      if (on) o.layers.push(L({ vb: vb, d: d, s: DOT, w: wgt + 8, op: 0.85 }));
      o.layers.push(L({ vb: vb, d: d, s: 'transparent', w: wgt + 16, pe: 'pointer-events: stroke; cursor: ' + curs + ';' }));
      var src = it.from ? byId[it.from.id] : null, dst = it.to ? byId[it.to.id] : null;
      var live = !!dst && dst.kind === 'node' && dst.status === 'running';
      if (live || it.proposed) col = accent;
      o.layers.push(L({ vb: vb, d: d, s: col, w: wgt, dash: live ? '6 6' : ((it.dash || it.proposed) ? (wgt * 3) + ' ' + (wgt * 3) : 'none'), pe: live ? 'pointer-events: none; animation: wb-dash 0.5s linear infinite;' : 'pointer-events: none;' }));
      if (src && dst && (src.kind === 'node' || dst.kind === 'node')) {
        var mid = polyMid(loc);
        o.showLabel = true;
        o.label = outType(src) || 'context';
        o.labelStyle = 'position: absolute; left: ' + mid[0] + 'px; top: ' + mid[1] + 'px; transform: translate(-50%, -50%); padding: 1px 7px; border-radius: 999px; background: #FFFFFF; border: 1px solid ' + (live ? accent : '#D2D3D9') + '; ' + MONO + ' font-size: 11px; color: ' + (live ? accent : '#6B6C73') + '; white-space: nowrap; pointer-events: none;';
      }
      if (it.head !== false && loc.length > 1) {
        var a = loc[loc.length - 2], b = loc[loc.length - 1];
        var ang = Math.atan2(b[1] - a[1], b[0] - a[0]), hl = 9 + wgt * 1.5;
        var hd = 'M' + (b[0] - hl * Math.cos(ang - 0.5)).toFixed(1) + ' ' + (b[1] - hl * Math.sin(ang - 0.5)).toFixed(1) + 'L' + b[0].toFixed(1) + ' ' + b[1].toFixed(1) + 'L' + (b[0] - hl * Math.cos(ang + 0.5)).toFixed(1) + ' ' + (b[1] - hl * Math.sin(ang + 0.5)).toFixed(1);
        o.layers.push(L({ vb: vb, d: hd, s: col, w: wgt }));
      }
    } else if (k === 'pen') {
      var abs = it.pts.map(function (p) { return [it.x + p[0], it.y + p[1]]; });
      var pb = ptsBox(abs), pw = it.weight || 5, pp = pw + 12;
      var pox = pb.x - pp, poy = pb.y - pp, PW = pb.w + pp * 2, PH = pb.h + pp * 2, pvb = '0 0 ' + PW + ' ' + PH;
      var pd = penD(abs.map(function (p) { return [p[0] - pox, p[1] - poy]; }));
      o.style = 'position: absolute; left: ' + pox + 'px; top: ' + poy + 'px; width: ' + PW + 'px; height: ' + PH + 'px; pointer-events: none;';
      if (on) o.layers.push(L({ vb: pvb, d: pd, s: DOT, w: pw + 8, op: 0.85 }));
      o.layers.push(L({ vb: pvb, d: pd, s: 'transparent', w: pw + 14, pe: 'pointer-events: stroke; cursor: ' + curs + ';' }));
      o.layers.push(L({ vb: pvb, d: pd, s: it.color || '#111111', w: pw }));
    }
    return o;
  }

  renderCtx(selItem, byId, accent, tint) {
    if (this.ro()) return { show: false };
    var self = this, s = this.state, z = s.zoom, k = selItem.kind, pop = s.popover;
    var activeCss = 'background: ' + tint + '; color: ' + accent + ';';
    var hasText = k === 'text' || k === 'sticky' || (k === 'shape' && shapeHasText(selItem.shape));
    var b = bounds(selItem, byId);
    var W = this.boardEl ? this.boardEl.clientWidth : 1440;
    var cx = Math.max(240, Math.min(W - 240, s.pan.x + (b.x + b.w / 2) * z));
    var top = s.pan.y + b.y * z - (k === 'frame' ? 96 : 68);
    if (top < 72) top = s.pan.y + (b.y + b.h) * z + 18;
    var fillField = k === 'shape' || k === 'frame' ? 'fill' : 'color';
    var fillCur = selItem[fillField] || '#111111';
    var openPop = function (name) {
      return function () {
        var next = { popover: s.popover === name ? null : name };
        if (name === 'link') next.linkDraft = selItem.link || '';
        if (name === 'comment') next.commentDraft = '';
        self.setState(next);
      };
    };
    var align = selItem.align || (k === 'shape' ? 'center' : 'left');
    var palette = pop === 'textColor' ? TEXT_COLORS : (k === 'sticky' ? STICKY_COLORS : (k === 'shape' ? SHAPE_FILLS : (k === 'frame' ? FRAME_FILLS : INK)));
    var swField = pop === 'textColor' ? 'color' : fillField;
    var swCur = pop === 'textColor' ? (selItem.color || '#111114') : fillCur;
    var weights = k === 'pen' ? PEN_WEIGHTS : ARROW_WEIGHTS;
    var curW = selItem.weight || (k === 'pen' ? 5 : 2);
    var draft = (s.commentDraft || '').trim();
    return {
      show: true,
      style: 'position: absolute; left: ' + cx + 'px; top: ' + top + 'px; transform: translateX(-50%); display: flex; align-items: center; gap: 2px; padding: 5px; z-index: 4; white-space: nowrap;',
      node: k === 'node',
      nodeLabel: k === 'node' ? tr((NODE_BY[selItem.ntype] || NODE_DEFS[0]).label) + '  #' + selItem.id : '',
      canRun: k === 'node' && canRunDef(NODE_BY[selItem.ntype] || NODE_DEFS[0]),
      canEdit: k === 'node' && editable(selItem) && !selItem.locked,
      inspectLabel: 'Inspect', inspectTip: 'See its settings, input, output and backend request', inspecting: s.inspect ? 'true' : 'false',
      inspectStyle: 'height: 40px; padding: 0 12px; font-size: 14px;' + (s.inspect ? ' ' + activeCss : ''),
      inspect: function () { self.setState({ inspect: self.state.inspect ? null : selItem.id, hzSel: null, popover: null }); },
      canOpt: isHarness(selItem) && !selItem.opt && !selItem.locked && !s.running,
      optLabel: '3 options', optTip: 'Split this step into three options to compare',
      makeOpts: function () { self.makeOptions(selItem.id); },
      runNode: function () { self.runNode(selItem.id); },
      editNode: function () { self.setState({ editing: selItem.id, popover: null }); },
      typeIcon: k === 'text',
      fillFirst: k === 'frame' || k === 'shape' || k === 'pen',
      fillAfter: k === 'sticky',
      format: hasText,
      textColor: k === 'text',
      link: k === 'text' || k === 'sticky',
      list: k === 'text' || k === 'sticky',
      arrow: k === 'arrow',
      weight: k === 'arrow' || k === 'pen',
      lock: k !== 'text' && k !== 'sticky',
      fillDot: 'display: block; width: 22px; height: 22px; border-radius: 6px; background: ' + fillCur + '; border: 1px solid rgba(0,0,0,0.15);',
      fillOpen: pop === 'fill' ? 'true' : 'false',
      openFill: openPop('fill'),
      styleLabel: (TEXT_STYLES[selItem.style || 'body'] || TEXT_STYLES.body).label,
      styleOpen: pop === 'style' ? 'true' : 'false',
      openStyle: openPop('style'),
      textColorDot: 'display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 6px; background: ' + (selItem.color || '#111114') + '; color: #FFFFFF; font-size: 14px; font-weight: 400;',
      textColorOpen: pop === 'textColor' ? 'true' : 'false',
      openTextColor: openPop('textColor'),
      boldPressed: selItem.bold ? 'true' : 'false', boldStyle: selItem.bold ? activeCss : '',
      italicPressed: selItem.italic ? 'true' : 'false', italicStyle: selItem.italic ? activeCss : '',
      toggleBold: function () { self.patchSel({ bold: !selItem.bold }); },
      toggleItalic: function () { self.patchSel({ italic: !selItem.italic }); },
      linkOpen: pop === 'link' ? 'true' : 'false', linkStyle: selItem.link ? activeCss : '',
      openLink: openPop('link'),
      linkDraft: s.linkDraft,
      hasLink: !!selItem.link,
      onLinkDraft: function (e) { self.setState({ linkDraft: e.target.value }); },
      applyLink: function (e) { if (e && e.preventDefault) e.preventDefault(); var v = (self.state.linkDraft || '').trim(); self.patchSel({ link: v || null }, true); },
      removeLink: function () { self.patchSel({ link: null }, true); },
      applyStyle: 'background: ' + accent + '; color: #FFFFFF;',
      listPressed: selItem.list ? 'true' : 'false', listStyle: selItem.list ? activeCss : '',
      toggleList: function () { self.toggleList(); },
      alignLeft: align === 'left', alignCenter: align === 'center', alignRight: align === 'right',
      alignTip: 'Align ' + align,
      cycleAlign: function () { self.patchSel({ align: align === 'left' ? 'center' : (align === 'center' ? 'right' : 'left') }); },
      dashed: !!selItem.dash, solid: !selItem.dash, dashTip: selItem.dash ? 'Dashed line' : 'Solid line',
      toggleDash: function () { self.patchSel({ dash: !selItem.dash }); },
      weightOpen: pop === 'weight' ? 'true' : 'false',
      openWeight: openPop('weight'),
      headOn: selItem.head !== false, headOff: selItem.head === false, headPressed: selItem.head !== false ? 'true' : 'false',
      toggleHead: function () { self.patchSel({ head: selItem.head === false }); },
      locked: !!selItem.locked, unlocked: !selItem.locked, lockPressed: selItem.locked ? 'true' : 'false',
      lockLabel: selItem.locked ? 'Unlock' : 'Lock', lockStyle: selItem.locked ? activeCss : '',
      toggleLock: function () { self.patchSel({ locked: !selItem.locked }, true); },
      commentOpen: pop === 'comment' ? 'true' : 'false',
      openComment: openPop('comment'),
      moreOpen: pop === 'more' ? 'true' : 'false', moreStyle: pop === 'more' ? 'background: #F0F1F4;' : '',
      openMore: openPop('more'),
      popStyle: pop === 'style', popSwatch: pop === 'fill' || pop === 'textColor', popWeight: pop === 'weight',
      popLink: pop === 'link', popComment: pop === 'comment', popMore: pop === 'more',
      styleOpts: Object.keys(TEXT_STYLES).map(function (key) {
        var st = TEXT_STYLES[key], cur = (selItem.style || 'body') === key;
        return { label: st.label, on: cur, checked: cur ? 'true' : 'false', preview: 'font-size: ' + Math.min(st.fs, 22) + 'px; font-weight: ' + st.fw + ';', pick: function () { self.patchSel({ style: key }, true); } };
      }),
      swatchOpts: palette.map(function (pc) {
        var cur = swCur === pc[0], patch = {};
        patch[swField] = pc[0];
        return { label: pc[1], pressed: cur ? 'true' : 'false', pick: function () { self.patchSel(patch, true); }, dot: 'display: block; width: 26px; height: 26px; border-radius: 7px; background: ' + pc[0] + '; border: 1px solid rgba(0,0,0,0.15); box-shadow: ' + (cur ? '0 0 0 2px #FFFFFF, 0 0 0 4px ' + accent : 'none') + ';' };
      }),
      weightOpts: weights.map(function (wo) {
        var cur = curW === wo[0];
        return { label: wo[1], on: cur, checked: cur ? 'true' : 'false', preview: 'display: block; width: 48px; height: ' + Math.max(1.5, wo[0]) + 'px; border-radius: 9px; background: #2A2B30;', pick: function () { self.patchSel({ weight: wo[0] }, true); } };
      }),
      comments: (selItem.comments || []).map(function (t) { return { text: t }; }),
      commentDraft: s.commentDraft,
      onCommentDraft: function (e) { self.setState({ commentDraft: e.target.value }); },
      postDisabled: !draft,
      postStyle: draft ? 'background: ' + accent + '; color: #FFFFFF;' : 'background: #F3F4F6; color: #8A8B92; cursor: default;',
      postComment: function (e) {
        if (e && e.preventDefault) e.preventDefault();
        var txt = (self.state.commentDraft || '').trim();
        if (!txt) return;
        var cur = self.find(self.state.selected);
        if (!cur) return;
        self.update(cur.id, { comments: (cur.comments || []).concat([txt]) });
        self.setState({ commentDraft: '' });
      },
      duplicate: function () { self.duplicateSelected(); },
      front: function () { self.reorder(true); },
      back: function () { self.reorder(false); },
      remove: function () { self.removeSelected(); }
    };
  }

  renderVals() {
    var self = this, s = this.state;
    var accent = this.props.accent ?? '#2457C5';
    var tint = 'color-mix(in srgb, ' + accent + ' 12%, #FFFFFF)';
    var activeCss = 'background: ' + tint + '; color: ' + accent + ';';
    var tool = s.tool, z = s.zoom, byId = index(s.items);
    var G = flowGraph(s.items);
    this._botAt = this.botTarget();
    var hzPanels = this.renderHzPanels(byId, accent);
    var selList = this.selIds(), isMulti = selList.length > 1;
    this._selSet = {};
    selList.forEach(function (id) { self._selSet[id] = 1; });
    var cursor = tool === 'select' ? 'move' : (tool === 'hand' ? (s.panning ? 'grabbing' : 'grab') : 'crosshair');
    var frames = s.items.filter(function (it) { return it.kind === 'frame'; });
    var rest = s.items.filter(function (it) { return it.kind !== 'frame'; });
    var items = frames.concat(rest).map(function (it) { return self.renderItem(it, byId, accent, cursor, G); });

    var selItem = isMulti ? null : (s.selected ? byId[s.selected] : null);
    var d = this.drag;
    var busy = !!d && (d.mode !== 'move' || d.moved);

    var hasSelBox = false, selBoxStyle = '', handles = [];
    if (selItem && selItem.kind !== 'arrow' && selItem.kind !== 'pen') {
      var sk = selItem.kind, b = bounds(selItem, byId);
      var bw = (sk === 'sticky' || sk === 'text') ? 1.5 : 2, ps = sk === 'text' ? 4 : 0;
      hasSelBox = true;
      selBoxStyle = 'position: absolute; left: ' + (b.x - ps) + 'px; top: ' + (b.y - ps) + 'px; width: ' + (b.w + ps * 2) + 'px; height: ' + (b.h + ps * 2) + 'px; box-sizing: border-box; border: ' + (bw / z) + 'px solid ' + accent + '; pointer-events: none;' + (sk === 'node' ? ' border-radius: 16px;' : '') + (sk === 'sticky' ? ' transform: rotate(' + (selItem.rot || 0) + 'deg);' : '') + (s.snap && d && (d.mode === 'move' || d.mode === 'resize') ? '' : '');
      if ((sk === 'frame' || sk === 'shape' || sk === 'sticker' || sk === 'node') && !selItem.locked && s.editing !== selItem.id) {
        var hs = 11 / z;
        handles = ['tl', 'tr', 'bl', 'br'].map(function (c) {
          return {
            down: function (e) { self.handleDown(selItem.id, c, e); },
            style: 'position: absolute; left: ' + (c[1] === 'l' ? 0 : 100) + '%; top: ' + (c[0] === 't' ? 0 : 100) + '%; width: ' + hs + 'px; height: ' + hs + 'px; transform: translate(-50%, -50%); box-sizing: border-box; background: #FFFFFF; border: ' + (2 / z) + 'px solid ' + accent + '; pointer-events: auto; cursor: ' + (c === 'tl' || c === 'br' ? 'nwse-resize' : 'nesw-resize') + ';'
          };
        });
      }
    }

    var dotTargets = [];
    if (tool === 'draw' && s.drawMode === 'arrow') dotTargets = s.items.filter(function (o) { return CONNECTABLE[o.kind] && o.kind !== 'node'; });
    else if (tool === 'select' && selItem && (selItem.kind === 'sticky' || selItem.kind === 'shape') && !selItem.locked && s.editing !== selItem.id && !busy) dotTargets = [selItem];
    var dots = [];
    dotTargets.forEach(function (o) {
      var ob = bounds(o, byId);
      ['top', 'right', 'bottom', 'left'].forEach(function (side) {
        var p = sidePoint(ob, side), v = outVec(side), off = 0, sz = 14 / z;
        dots.push({
          down: function (e) { self.dotDown(o.id, side, e); },
          style: 'position: absolute; left: ' + (p.x + v[0] * off) + 'px; top: ' + (p.y + v[1] * off) + 'px; width: ' + sz + 'px; height: ' + sz + 'px; transform: translate(-50%, -50%); border-radius: 50%; background: ' + DOT + '; box-shadow: 0 0 0 ' + (2 / z) + 'px #FFFFFF; cursor: crosshair; pointer-events: auto;'
        });
      });
    });

    var ah = [];
    if (tool === 'select' && selItem && selItem.kind === 'arrow' && !selItem.locked && (!d || d.mode === 'end' || d.mode === 'seg' || (d.mode === 'move' && !d.moved))) {
      var ap = arrowPts(selItem, byId), an = ap.length - 1, aid = selItem.id;
      var aSrc = selItem.from ? byId[selItem.from.id] : null, aDst = selItem.to ? byId[selItem.to.id] : null;
      var aLab = aSrc && aDst && (aSrc.kind === 'node' || aDst.kind === 'node') ? polyMid(ap) : null;
      var hitBox = function (x, y, w, h, cur) { return 'position: absolute; left: ' + x + 'px; top: ' + y + 'px; width: ' + (w / z) + 'px; height: ' + (h / z) + 'px; transform: translate(-50%, -50%); display: flex; align-items: center; justify-content: center; pointer-events: auto; touch-action: none; cursor: ' + cur + ';'; };
      var segHandle = function (j) {
        var p0 = ap[j], p1 = ap[j + 1], hz = Math.abs(p0[1] - p1[1]) < 0.5;
        var sl = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), hx = (p0[0] + p1[0]) / 2, hy = (p0[1] + p1[1]) / 2;
        if (sl * z < 32) return;
        if (aLab && Math.abs(aLab[0] - hx) + Math.abs(aLab[1] - hy) < 24 / z && sl * z >= 110) { var off = 38 / z; if (hz) hx += (p1[0] > p0[0] ? 1 : -1) * off; else hy += (p1[1] > p0[1] ? 1 : -1) * off; }
        ah.push({
          down: function (e) { self.segDown(aid, j, e); }, dbl: function (e) { self.resetRoute(aid, e); },
          style: hitBox(hx, hy, hz ? 30 : 22, hz ? 22 : 30, hz ? 'ns-resize' : 'ew-resize'),
          dot: 'display: block; width: ' + ((hz ? 20 : 9) / z) + 'px; height: ' + ((hz ? 9 : 20) / z) + 'px; box-sizing: border-box; border-radius: ' + (9 / z) + 'px; background: ' + accent + '; border: ' + (1.5 / z) + 'px solid #FFFFFF;'
        });
      };
      for (var sj = 0; sj < an; sj++) segHandle(sj);
      ['a', 'b'].forEach(function (which) {
        var ep = which === 'a' ? ap[0] : ap[an];
        ah.push({
          down: function (e) { self.endDown(aid, which, e); }, dbl: function (e) { e.stopPropagation(); },
          style: hitBox(ep[0], ep[1], 24, 24, 'move'),
          dot: 'display: block; width: ' + (13 / z) + 'px; height: ' + (13 / z) + 'px; box-sizing: border-box; border-radius: 50%; background: #FFFFFF; border: ' + (2 / z) + 'px solid ' + accent + ';'
        });
      });
    }

    var mBoxes = [], mc = { show: false };
    if (isMulti) {
      var ux0 = Infinity, uy0 = Infinity, ux1 = -Infinity, uy1 = -Infinity, anyG = false;
      selList.forEach(function (id) {
        var o = byId[id], ob = bounds(o, byId);
        if (o.group) anyG = true;
        ux0 = Math.min(ux0, ob.x); uy0 = Math.min(uy0, ob.y); ux1 = Math.max(ux1, ob.x + ob.w); uy1 = Math.max(uy1, ob.y + ob.h);
        if (o.kind !== 'arrow' && o.kind !== 'pen') mBoxes.push({ style: 'position: absolute; left: ' + ob.x + 'px; top: ' + ob.y + 'px; width: ' + ob.w + 'px; height: ' + ob.h + 'px; box-sizing: border-box; border: ' + (1.5 / z) + 'px solid ' + accent + '; border-radius: ' + (o.kind === 'node' ? 15 : 2) + 'px; pointer-events: none;' });
      });
      var pad = 10 / z;
      mBoxes.push({ style: 'position: absolute; left: ' + (ux0 - pad) + 'px; top: ' + (uy0 - pad) + 'px; width: ' + (ux1 - ux0 + pad * 2) + 'px; height: ' + (uy1 - uy0 + pad * 2) + 'px; box-sizing: border-box; border: ' + (1.5 / z) + 'px dashed ' + accent + '; border-radius: ' + (8 / z) + 'px; pointer-events: none;' });
      if (!busy) {
        var bw0 = this.boardEl ? this.boardEl.clientWidth : 1440;
        var mcx = Math.max(220, Math.min(bw0 - 220, s.pan.x + (ux0 + ux1) / 2 * z)), mty = s.pan.y + uy0 * z - 78;
        if (mty < 72) mty = s.pan.y + uy1 * z + 24;
        mc = {
          show: true, count: fmt('{0} selected', selList.length),
          style: 'position: absolute; left: ' + mcx + 'px; top: ' + mty + 'px; transform: translateX(-50%); display: flex; align-items: center; gap: 2px; padding: 5px; z-index: 4; white-space: nowrap;',
          groupLabel: anyG ? 'Ungroup' : 'Group', groupTip: anyG ? 'Ungroup (Ctrl+Shift+G)' : 'Group (Ctrl+G)',
          toggleGroup: function () { if (anyG) self.ungroup(); else self.group(); },
          tidy: function () { self.tidy(); },
          saveLabel: 'Save to library', saveTip: 'Reuse this selection from the node panel',
          saveLib: function () { self.saveToLibrary(); },
          duplicate: function () { self.duplicateSelected(); },
          remove: function () { self.removeSelected(); }
        };
      }
    }
    var kcShow = false, kcBox = '';
    if (s.kc && byId[s.kc.target]) {
      var kb0 = bounds(byId[s.kc.target], byId), kp = 8 / z;
      kcShow = true;
      kcBox = 'position: absolute; left: ' + (kb0.x - kp) + 'px; top: ' + (kb0.y - kp) + 'px; width: ' + (kb0.w + kp * 2) + 'px; height: ' + (kb0.h + kp * 2) + 'px; box-sizing: border-box; border: ' + (2.5 / z) + 'px dashed ' + accent + '; border-radius: ' + (18 / z) + 'px; background: color-mix(in srgb, ' + accent + ' 8%, transparent); pointer-events: none;';
    }
    var hasProposal = !!s.proposal && s.items.some(function (o) { return o.proposed; });
    var badges = s.items.filter(function (o) { return o.comments && o.comments.length; }).map(function (o) {
      var ob = bounds(o, byId);
      return { count: o.comments.length, style: 'position: absolute; left: ' + (ob.x + ob.w) + 'px; top: ' + ob.y + 'px; transform: translate(-50%, -50%) scale(' + (1 / z) + '); display: flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 999px; background: ' + accent + '; color: #FFFFFF; font-size: 12px; font-weight: 400; pointer-events: none;' };
    });

    var c = selItem && !busy ? this.renderCtx(selItem, byId, accent, tint) : { show: false };

    var hint = '';
    if (s.kc) hint = fmt('Connecting #{0} to #{1}. Arrow keys change the target, Enter connects, Esc cancels', s.kc.from, s.kc.target);
    if (tool === 'node') hint = fmt('Click to place: {0}', tr((NODE_BY[s.nodeType] || NODE_DEFS[0]).label));
    if (tool === 'hand') hint = 'Drag to move around the board';
    else if (tool === 'text') hint = 'Click anywhere to add text';
    else if (tool === 'frame') hint = 'Click to place a frame';
    else if (tool === 'sticky') hint = 'Click to place a sticky note';
    else if (tool === 'draw') hint = s.drawMode === 'pen' ? 'Draw anywhere on the board' : (s.lineOnly ? 'Drag to draw a line' : 'Drag to draw an arrow — start on a dot to connect');
    else if (tool === 'shape' && s.panel !== 'shape') hint = fmt('Click to place: {0}', tr((SHAPE_BY_ID[s.shapeKind] || SHAPES[0]).label));
    else if (tool === 'sticker' && s.stickerId && s.panel !== 'sticker') hint = fmt('Click to place: {0}', tr((STICKER_BY_ID[s.stickerId] || STICKERS[0]).name));

    var btn = 'width: 38px; height: 38px; border-radius: 11px;';
    var dockOn = 'background: #FFFFFF; color: ' + accent + '; box-shadow: 0 1px 3px rgba(20,20,30,0.16), 0 0 0 1px rgba(20,20,30,0.04);';
    var softBtn = 'display: flex; align-items: center; gap: 6px; height: 38px; padding: 0 12px 0 10px; border: 0; border-radius: 11px; font: inherit; font-size: 14px; font-weight: 400; cursor: pointer; ';
    var mk = function (id, label, keyHint) {
      var on = tool === id && !s.panel;
      return {
        label: label, stk: id === 'sticky' ? stickyStk(nextSticky) : DOCK[id], tip: tr(label) + ' (' + keyHint + ')', pressed: on ? 'true' : 'false',
        pick: function () { self.pickTool(id); },
        style: btn + (on ? ' ' + dockOn : ''),
        isSelect: id === 'select', isHand: id === 'hand', isText: id === 'text', isFrame: id === 'frame', isSticky: id === 'sticky'
      };
    };
    var drawOn = tool === 'draw';
    var shapeOn = tool === 'shape' || s.panel === 'shape';
    var stickerOn = tool === 'sticker' || s.panel === 'sticker';
    var q = (s.stickerQuery || '').trim().toLowerCase();
    var stickerOpts = STICKERS.filter(function (st) { return !q || st.name.toLowerCase().indexOf(q) >= 0 || st.id.indexOf(q) >= 0; }).map(function (st) {
      return { name: st.name, layers: st.layers, inner: 'position: relative; width: 42px; height: 42px; filter: drop-shadow(0 1.5px 1.5px rgba(0,0,0,0.22));' + (st.flip ? ' transform: scaleY(-1);' : ''), pick: function () { self.setState({ stickerId: st.id, tool: 'sticker', panel: null, selected: null }); } };
    });
    var chat = s.chat, barMic = s.mic && s.micFrom === 'bar';
    var nextSticky = STICKY_COLORS[s.items.filter(function (o) { return o.kind === 'sticky'; }).length % STICKY_COLORS.length][0];
    var curNode = NODE_BY[s.nodeType] || NODE_DEFS[0];
    var curSticker = STICKER_BY_ID[s.stickerId] || STICKER_BY_ID.grin || STICKERS[0];
    var aiVals = { open: false, rows: [] };
    if (s.aiOpen) {
      var doc = aiDoc(s.items, G);
      var rows = doc.nodes.slice().sort(function (a, b) { return (a.step || 9999) - (b.step || 9999); }).map(function (n) {
        var on = n.id === s.selected;
        return {
          n: n.proposed ? '+' : (n.step ? String(n.step) : '·'), head: '#' + n.id + '  ' + n.type + (n.proposed ? '  (proposed)' : ''), text: n.text ? n.text.split('\n')[0].slice(0, 44) : (n.output ? 'outputs ' + n.output : 'no text'),
          to: n.next ? '→ ' + n.next.map(function (i) { return '#' + i; }).join(' ') : '',
          pick: function () { self.setState({ selected: n.id, editing: null, popover: null }); },
          style: 'height: auto; min-height: 44px; padding: 6px 10px; align-items: flex-start; gap: 10px;' + (on ? ' background: ' + tint + ';' : '')
        };
      });
      var tabCss = function (on) { return 'height: 32px; ' + (on ? 'background: #111114; color: #FFFFFF;' : 'background: #F3F4F6; color: #111114;'); };
      aiVals = {
        open: true, rows: rows, empty: rows.length === 0,
        sub: fmt('{0} nodes, {1} links, {2} ordered steps', doc.nodes.length, doc.edges.length, doc.order.length),
        showOutline: s.aiTab === 'outline', showJson: s.aiTab === 'json',
        outlinePressed: s.aiTab === 'outline' ? 'true' : 'false', jsonPressed: s.aiTab === 'json' ? 'true' : 'false',
        outlineStyle: tabCss(s.aiTab === 'outline'), jsonStyle: tabCss(s.aiTab === 'json'),
        setOutline: function () { self.setState({ aiTab: 'outline' }); },
        setJson: function () { self.setState({ aiTab: 'json' }); },
        json: JSON.stringify(fileDoc(s.items, G), null, 2),
        fileNote: 'This is the saved file. Edit it anywhere and load it back.',
        downloadLabel: 'Download file', importLabel: 'Load a file', importPh: 'Paste the contents of a .flowboard.json file', loadLabel: 'Load board',
        importErrorText: 'That is not a valid board file.',
        importOpen: s.importOpen, importExpanded: s.importOpen ? 'true' : 'false', importText: s.importText, importError: s.importError,
        toggleImport: function () { self.setState({ importOpen: !self.state.importOpen, importError: false }); },
        onImport: function (e) { self.setState({ importText: e.target.value, importError: false }); },
        doImport: function (e) { self.importFile(e); },
        download: function () { self.downloadFile(); },
        loadStyle: 'height: 36px; background: ' + accent + '; color: #FFFFFF;',
        copy: function () { self.copyJson(); },
        suggest: function () { self.suggestNext(); },
        suggestStyle: 'height: 36px; width: 100%; background: ' + tint + '; color: ' + accent + ';',
        close: function () { self.setState({ aiOpen: false }); }
      };
    }
    var gpx = GRID * z, dotR = Math.max(0.9, Math.min(1.6, 1.3 * Math.sqrt(z)));
    var gh = s.ghost, ghostKind = tool === 'sticker' ? (s.stickerId ? 'sticker' : null) : tool;
    var hasGhost = !!gh && gh.kind === ghostKind && !s.menu && !s.panel;
    var ghostStyle = '';
    if (hasGhost) {
      var rad = gh.kind === 'sticky' ? '3px' : (gh.kind === 'frame' ? '16px' : gh.kind === 'node' ? '14px' : (gh.kind === 'sticker' ? '50%' : (gh.kind === 'text' ? '1px' : '12px')));
      ghostStyle = 'position: absolute; left: ' + gh.x + 'px; top: ' + gh.y + 'px; width: ' + gh.w + 'px; height: ' + gh.h + 'px; box-sizing: border-box; border-radius: ' + rad + '; pointer-events: none; ' +
        (gh.kind === 'text' ? 'background: ' + accent + ';' : gh.kind === 'sticky' ? 'background: ' + nextSticky + '; opacity: 0.6; box-shadow: 0 6px 14px rgba(0,0,0,0.08);' : 'border: ' + (1.5 / z) + 'px dashed ' + accent + '; background: color-mix(in srgb, ' + accent + ' 7%, transparent);') +
        (s.snap ? '' : '');
    }
    var bgOpt = function (id, label) {
      var on = s.bg === id;
      return { label: label, checked: on ? 'true' : 'false', on: on, isGrid: id === 'grid', isDots: id === 'dots', pick: function () { self.setState({ bg: id }); }, style: 'flex-direction: column; gap: 6px; padding: 6px 6px 8px; width: 100%; box-sizing: border-box; border-radius: 12px; border: 1.5px solid ' + (on ? accent : '#E3E4E8') + ';' + (on ? ' color: ' + accent + ';' : '') };
    };

    var out = {
      accent: accent,
      i: Object.assign({}, s.lang === 'zh' ? I_ZH : I_EN, this.props.me ? { k66: this.props.me.name, k67: this.props.me.email || tr('Guest') } : {}),
      links: { SignIn: '/signin', Workspace: '/', Main: '/board/new' },
      follow: function (e) { if (e && e.preventDefault) e.preventDefault(); var h = e.currentTarget.getAttribute('href'); if (h === '/signin') self.props.signOut(); else self.props.goHome(); },
      help: (function () {
        var M = self.isMac ? '⌘' : 'Ctrl+', S = self.isMac ? '⇧' : 'Shift+';
        var g = function (title, rows) { return { title: title, rows: rows.map(function (r) { return { label: r[0], keys: r[1] }; }) }; };
        return {
          open: s.help, expanded: s.help ? 'true' : 'false', title: 'Keyboard shortcuts', tip: 'Keyboard shortcuts (?)', closeLabel: 'Close',
          toggle: function () { self.setState({ help: !self.state.help, zoomMenu: false, bgMenu: false }); },
          close: function () { self.setState({ help: false }); },
          groups: !s.help ? [] : [
            g('Tools', [['Select', 'V  1'], ['Hand', 'H  Space'], ['Rectangle', 'R  2'], ['Diamond', 'D  3'], ['Circle', 'O  4'], ['Arrow', 'A  5'], ['Line', 'L  6'], ['Pen', 'P  7'], ['Text', 'T  8'], ['Nodes', 'N  9'], ['Frame', 'F'], ['Sticky note', 'S'], ['Stickers', 'E'], ['Keep the tool active', 'Q']]),
            g('Edit', [['Undo', M + 'Z'], ['Redo', S + M + 'Z'], ['Copy', M + 'C'], ['Cut', M + 'X'], ['Paste', M + 'V'], ['Duplicate', M + 'D'], ['Delete', 'Del'], ['Select all', M + 'A'], ['Group', M + 'G'], ['Ungroup', S + M + 'G'], ['Lock', S + M + 'L'], ['Edit text', 'Enter'], ['Move the selection', '← ↑ → ↓']]),
            g('Arrange and view', [['Bring forward', M + ']'], ['Send backward', M + '['], ['Bring to front', S + M + ']'], ['Send to back', S + M + '['], ['Zoom in', M + '+'], ['Zoom out', M + '−'], ['Zoom to 100%', M + '0'], ['Zoom to fit', S + '1'], ['Zoom at the pointer', 'Scroll'], ['Connect to…', 'C'], ['Chat', '/'], ['Ask AI', M + 'K'], ['Keyboard shortcuts', '?']])
          ]
        };
      })(),
      sh: (function () {
        if (!s.share) return { open: false, tabs: [], options: [] };
        var tab = s.share, mode = s.embedEdit ? 'edit' : 'view';
        var origin = window.location.origin, tok = s.link || '…';
        var code = tab === 'link' ? origin + '/v/' + tok
          : (tab === 'embed' ? '<iframe\n  src="' + (s.embedEdit ? origin + '/b/' + s.boardId + '?embed=1' : origin + '/embed/' + tok) + (s.embedBar ? '' : (s.embedEdit ? '&' : '?') + 'toolbar=off') + '"\n  width="100%" height="480"\n  style="border: 0"></iframe>'
          : "npm install [PACKAGE NAME]\n\nimport { Board } from '[PACKAGE NAME]';\nimport file from './board.flowboard.json';\n\n<Board file={file}" + (s.embedEdit ? ' onChange={save}' : ' readOnly') + (s.embedBar ? '' : ' toolbar={false}') + ' />');
        var needs = tab !== 'package' && !s.signedIn;
        var chip = function (on) { return 'height: 36px; padding: 0 12px; gap: 8px; font-size: 14px; border: 1px solid ' + (on ? accent : '#DCDDE2') + ';' + (on ? ' background: ' + tint + '; color: ' + accent + ';' : ''); };
        return {
          open: true, title: 'Share and embed', closeLabel: 'Close',
          close: function () { self.setState({ share: null }); },
          tabs: [['link', 'Link'], ['embed', 'Embed'], ['package', 'In your app']].map(function (tb) {
            return { label: tb[1], selected: tab === tb[0] ? 'true' : 'false', pick: function () { self.openShare(tb[0]); }, style: 'height: 38px; justify-content: center; font-size: 14px; border-radius: 10px;' + (tab === tb[0] ? ' background: #FFFFFF; box-shadow: 0 1px 3px rgba(20,20,30,0.14);' : '') };
          }),
          note: needs ? 'Links and hosted embeds need an account, so the board has an owner. Sign in to share this board.'
            : (tab === 'link' ? 'Anyone with this link can view the board. They cannot change it.'
            : (tab === 'embed' ? (s.embedEdit ? 'Paste this into any page. People who can edit the board sign in to change it there.' : 'Paste this into any page to show the board there.') : 'Render a board file inside your own product. No account needed: the file is all it reads.')),
          hasOptions: tab !== 'link' && !needs,
          options: [
            { label: 'Viewers can edit', checked: s.embedEdit ? 'true' : 'false', pick: function () { self.setState({ embedEdit: !self.state.embedEdit }); }, style: chip(s.embedEdit) },
            { label: 'Show the toolbar', checked: s.embedBar ? 'true' : 'false', pick: function () { self.setState({ embedBar: !self.state.embedBar }); }, style: chip(s.embedBar) }
          ],
          hasCode: !needs, code: code,
          needsSignIn: needs, signInLabel: 'Sign in to share', canCopy: !needs, copyLabel: 'Copy',
          copy: function () { self.copyText(code, 'Copied'); },
          primary: 'height: 40px; min-height: 40px; width: auto; padding: 0 16px; justify-content: center; border-radius: 10px; background: ' + accent + '; color: #FFFFFF; font-size: 14px;'
        };
      })(),
      acct: {
        // When the workspace page shows this board inside itself, it passes goHome to get back.
        embedded: typeof this.props.goHome === 'function', homeLabel: 'All boards',
        goHome: function (e) { if (typeof self.props.goHome !== 'function') return; if (e && e.preventDefault) e.preventDefault(); self.props.goHome(); },
        signedIn: s.signedIn, guest: !s.signedIn,
        wsAria: 'Workspace', userAria: 'Account', langTip: 'Language', wsHeading: 'Workspaces', allBoards: 'All boards', membersLabel: 'Members and invites',
        guestLabel: this.ro() ? (s.title || 'Board') : 'Guest board', guestNote: this.ro() ? 'You are viewing this board through a link. You cannot change it.' : 'You are working as a guest. Sign in or add an email to keep this board.',
        signInLabel: 'Sign in', signInStyle: 'width: auto; min-height: 38px; height: 38px; padding: 0 14px; border-radius: 11px; background: #111114; color: #FFFFFF; font-size: 14px;',
        shareLabel: 'Share', shareExpanded: s.share ? 'true' : 'false',
        openShare: function () { if (self.ro()) self.copyText(window.location.href, 'Link copied'); else self.openShare('link'); },
        newBoardLabel: 'New empty board', newBoard: function () { self.setState({ acctMenu: null }); self.props.newBoard(); },
        downloadLabel: 'Download board file', download: function () { self.downloadFile(); },
        saveLabel: this.ro() ? 'View only' : s.saveState === 'off' ? 'Not saved' : (s.saveState === 'saved' ? 'Saved' : 'Saving'),
        saveStyle: 'display: flex; align-items: center; gap: 6px; padding: 0 10px 0 6px; font-size: 12.5px; white-space: nowrap; color: ' + (s.saveState === 'off' ? '#B42318' : '#6B6C73') + ';',
        saveDot: 'width: 7px; height: 7px; border-radius: 50%; background: ' + (s.saveState === 'off' ? '#B42318' : (s.saveState === 'saved' ? '#2E8B57' : '#B4B5BB')) + ';',
        wsOpen: s.acctMenu === 'ws', userOpen: s.acctMenu === 'user',
        wsExpanded: s.acctMenu === 'ws' ? 'true' : 'false', userExpanded: s.acctMenu === 'user' ? 'true' : 'false',
        toggleWs: function () { self.setState({ acctMenu: self.state.acctMenu === 'ws' ? null : 'ws', menu: null }); },
        toggleUser: function () { self.setState({ acctMenu: self.state.acctMenu === 'user' ? null : 'user', menu: null }); },
        flipLang: function () { self.props.flipLang(); },
        langShort: s.lang === 'zh' ? '中' : 'EN',
        wsName: (function () { var w = s.workspaces.find(function (x) { return x.id === s.wsId; }); return w ? (w.personal ? tr('Personal') : w.name) : (s.title || ''); })(),
        wsChip: 'width: 26px; height: 26px; border-radius: 8px; display: flex; align-items: center; justify-content: center; background: ' + tint + '; color: ' + accent + ';' + CHIP_STK,
        wsList: s.workspaces.map(function (w) { var on = w.id === s.wsId; return { name: w.personal ? tr('Personal') : w.name, on: on, checked: on ? 'true' : 'false', pick: function () { self.setState({ acctMenu: null }); if (!on) self.props.goHome(w.id); } }; }),
        langs: [['en', 'English'], ['zh', '简体中文']].map(function (l) { return { name: l[1], on: s.lang === l[0], checked: s.lang === l[0] ? 'true' : 'false', pick: function () { self.props.setLang(l[0]); self.setState({ acctMenu: null }); } }; })
      },
      welcome: s.welcome,
      welcomeTop: (s.mic && s.micFrom === 'bot') ? 'calc(34% + min(100px, 13vh) + 92px)' : 'calc(34% + min(100px, 13vh) + 24px)',
      mBoxes: mBoxes, mc: mc, kcShow: kcShow, kcBox: kcBox,
      hasMarquee: !!s.marquee || !!s.area,
      marqueeStyle: (function () {
        var b = s.marquee || s.area;
        if (!b) return '';
        return 'position: absolute; left: ' + b.x + 'px; top: ' + b.y + 'px; width: ' + b.w + 'px; height: ' + b.h + 'px; box-sizing: border-box; border: ' + (1.5 / z) + 'px solid ' + AREA_COL + '; border-radius: ' + Math.min(24 / z, b.w / 2, b.h / 2) + 'px; background: color-mix(in srgb, ' + AREA_COL + ' 6%, transparent); pointer-events: none;';
      })(),
      ca: (function () {
        var run = s.chatRun;
        if (!run || s.welcome) return { show: false, rows: [], hasMore: false, busy: false, done: false };
        var done = run.calls.slice(0, run.n), from = Math.max(0, done.length - 4);
        return {
          show: true, title: run.mode === 'diagram' ? 'Board agent: diagram' : 'Board agent: workflow',
          busy: !run.done, done: run.done, stopLabel: 'Stop', stop: function () { self.rejectProposal(); }, count: run.n + ' / ' + run.calls.length, ask: { _v: 1, text: run.text },
          rows: done.slice(from).map(function (c) { return { _v: 1, line: c.line, tool: c.tool }; }),
          hasMore: from > 0, more: fmt('{0} earlier steps', from),
          waiting: run.n === 0, waitText: 'Thinking',
          foot: run.sim ? 'Our own agent, built on Pi. Simulated: no model key is set on the server.' : 'Our own agent, built on Pi.',
          spin: 'flex: 0 0 auto; width: 14px; height: 14px; box-sizing: border-box; border-radius: 50%; border: 2px solid ' + tint + '; border-top-color: ' + accent + '; animation: wb-spin 0.9s linear infinite;',
          tick: 'flex: 0 0 auto; width: 14px; height: 14px; border-radius: 50%; background: #1F6B3A;'
        };
      })(),
      cmode: (function () {
        var m = s.chatMode, next = m === 'auto' ? 'diagram' : (m === 'diagram' ? 'flow' : 'auto');
        return {
          label: m === 'auto' ? 'Auto' : (m === 'diagram' ? 'Diagram' : 'Workflow'), pre: 'Draws as',
          tip: m === 'auto' ? 'Auto: shapes on a diagram board, workflow nodes on a workflow board. Select to change.' : (m === 'diagram' ? 'Always draws shapes and arrows. Select to change.' : 'Always adds workflow nodes. Select to change.'),
          cycle: function () { self.setState({ chatMode: next }); },
          style: 'height: 24px; padding: 0 9px; border-radius: 999px; font-size: 12px; background: ' + (m === 'auto' ? '#F3F4F6' : tint) + '; color: ' + (m === 'auto' ? '#3A3B40' : accent) + ';'
        };
      })(),
      pp: {
        show: hasProposal && !s.welcome && !(s.chatRun && !s.chatRun.done),
        note: s.proposal ? s.proposal.note : '',
        dot: 'flex: 0 0 auto; width: 8px; height: 8px; border-radius: 50%; background: ' + accent + ';',
        acceptStyle: 'background: ' + accent + '; color: #FFFFFF;',
        accept: function () { self.acceptProposal(); },
        reject: function () { self.rejectProposal(); }
      },
      emptyHint: !s.welcome && s.items.length === 0 && tool === 'select' && !chat && !s.menu,
      welcomeForm: 'pointer-events: auto; width: 100%; max-width: 520px; box-sizing: border-box; display: flex; align-items: center; gap: 6px; margin-top: 8px; padding: 6px 6px 6px 18px; background: #FFFFFF; border: 1.5px solid ' + (s.prompt ? accent : '#DCDDE2') + '; border-radius: 18px; box-shadow: 0 10px 30px rgba(20,20,30,0.08), 0 2px 6px rgba(20,20,30,0.04); transition: border-color 160ms ease;',
      undo: function () { self.undo(); },
      redo: function () { self.redo(); },
      undoDisabled: !s.canUndo, redoDisabled: !s.canRedo,
      undoStyle: btn + (s.canUndo ? '' : ' color: #B4B5BB; cursor: default;'),
      redoStyle: btn + (s.canRedo ? '' : ' color: #B4B5BB; cursor: default;'),
      mono: this.renderMono(accent),
      hz: this.renderHz(byId, accent), hzd: hzPanels.hzd, cmp: hzPanels.cmp, cmpd: hzPanels.cmpd,
      ins: this.renderInspect(selItem, byId, accent, tint), api: this.renderApi(accent), vw: this.renderViewer(byId, accent), mk: this.renderMarket(accent, tint),
      stopEv: function (e) { e.stopPropagation(); },
      starters: STARTERS.map(function (st) { return { who: st.who, title: st.title, desc: st.desc, layers: AVATARS[st.av], pick: function () { self.loadTemplate(st.key); } }; }),
      running: s.running, runIdle: !s.running,
      runLabel: s.running ? tr('Stop') + '  ' + Math.min(s.runTotal, s.runDone + 1) + '/' + s.runTotal : 'Run flow',
      runToggle: function () { if (self.state.running) self.stopRun(); else self.runFlow(); },
      runStyle: 'display: flex; align-items: center; gap: 6px; height: 38px; padding: 0 14px 0 12px; border-radius: 11px; font-weight: 400; ' + (s.running ? 'background: #111114; color: #FFFFFF;' : 'background: ' + accent + '; color: #FFFFFF;'),
      aiPressed: s.aiOpen ? 'true' : 'false',
      toggleAi: function () { self.setState({ aiOpen: !self.state.aiOpen, zoomMenu: false, bgMenu: false }); },
      aiBtnStyle: softBtn + (s.aiOpen ? activeCss : 'background: transparent; color: #111114;'),
      ai: aiVals,
      hasGhost: hasGhost, ghostStyle: ghostStyle,
      bgMenu: s.bgMenu,
      bgExpanded: s.bgMenu ? 'true' : 'false',
      bgIsGrid: s.bg === 'grid', bgIsDots: s.bg === 'dots',
      toggleBgMenu: function () { self.setState({ bgMenu: !self.state.bgMenu, zoomMenu: false }); },
      bgOpts: [bgOpt('grid', 'Grid'), bgOpt('dots', 'Dots')],
      snapChecked: s.snap ? 'true' : 'false',
      toggleSnap: function () { self.setState({ snap: !self.state.snap }); },
      snapTrack: 'position: relative; flex: 0 0 auto; width: 36px; height: 22px; border-radius: 999px; transition: background-color 160ms ease; background: ' + (s.snap ? accent : '#C9CBD2') + ';',
      snapKnob: 'position: absolute; top: 2px; left: ' + (s.snap ? 16 : 2) + 'px; width: 18px; height: 18px; border-radius: 50%; background: #FFFFFF; box-shadow: 0 1px 2px rgba(0,0,0,0.25); transition: left 160ms cubic-bezier(0.2, 0.8, 0.2, 1);',
      mainStyle: 'position: relative; width: 100%; height: 100vh; min-height: 720px; overflow: hidden; user-select: none; touch-action: none; background-color: ' + (s.bg === 'dots' ? '#FCFCFD' : '#FFFFFF') + '; ' + (s.bg === 'dots'
        ? 'background-image: radial-gradient(circle at ' + dotR + 'px ' + dotR + 'px, #DCDDE2 ' + dotR + 'px, transparent ' + (dotR + 0.6) + 'px); background-size: ' + gpx + 'px ' + gpx + 'px; background-position: ' + (s.pan.x - dotR) + 'px ' + (s.pan.y - dotR) + 'px;'
        : 'background-image: linear-gradient(rgba(0,0,0,0.016) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.016) 1px, transparent 1px); background-size: ' + gpx + 'px ' + gpx + 'px; background-position: ' + s.pan.x + 'px ' + s.pan.y + 'px;'),
      onLeave: function () { if (self.state.ghost) self.setState({ ghost: null }); },
      boardStyle: 'position: absolute; inset: 0; cursor: ' + (tool === 'hand' ? (s.panning ? 'grabbing' : 'grab') : (tool === 'select' ? 'default' : 'crosshair')) + ';',
      worldStyle: 'position: absolute; left: 0; top: 0; width: 0; height: 0; transform-origin: 0 0; transform: translate(' + s.pan.x + 'px, ' + s.pan.y + 'px) scale(' + z + ');',
      boardRef: this.boardRef,
      onBoardDown: function (e) { if (!self.boardEl) self.boardEl = e.currentTarget; self.boardDown(e); },
      onBoardDbl: function (e) { self.boardDbl(e); },
      onWheel: function (e) { self.wheelZoom(e); },
      onBoardMenu: function (e) { self.openMenu(e, null); },
      m: s.menu ? this.renderMenu(byId) : { show: false, rows: [] },
      onMove: function (e) { self.move(e); },
      onUp: function () { self.up(); },
      onKey: function (e) { self.key(e); },
      onKeyUp: function (e) { self.keyUp(e); },
      caretEnd: function (e) { try { var n = e.target.value.length; e.target.setSelectionRange(n, n); } catch (err) {} },
      items: items,
      hasSelBox: hasSelBox, selBoxStyle: selBoxStyle, handles: handles,
      dots: dots, ah: ah, badges: badges, c: c,
      hasHint: !!hint && (!!s.kc || !s.selected) && !s.menu && !s.welcome, hint: hint,

      zoomLabel: Math.round(z * 100) + '%',
      zoomMenu: s.zoomMenu,
      zoomExpanded: s.zoomMenu ? 'true' : 'false',
      toggleZoomMenu: function () { self.setState({ zoomMenu: !self.state.zoomMenu, bgMenu: false }); },
      zoomIn: function () { self.zoomTo(self.state.zoom * 1.25); },
      zoomOut: function () { self.zoomTo(self.state.zoom / 1.25); },
      zoomFit: function () { self.zoomFit(); },
      zoomReset: function () { self.zoomTo(1); },

      toolsA: [mk('select', 'Select', 'V / 1'), mk('hand', 'Hand', 'H / Space')],
      toolsB: [mk('text', 'Text', 'T / 8'), mk('frame', 'Frame', 'F'), mk('sticky', 'Sticky note', 'S')],
      drawSlot: {
        stk: s.drawMode === 'pen' ? penStk(s.ink) : arrowStk(s.ink),
        isPen: s.drawMode === 'pen', isArrow: s.drawMode === 'arrow',
        label: s.drawMode === 'pen' ? 'Pen' : 'Arrow', tip: s.drawMode === 'pen' ? 'Pen (P)' : 'Arrow (A)',
        pressed: drawOn ? 'true' : 'false', style: btn + (drawOn ? ' ' + dockOn : ''),
        pick: function () { self.pickTool('draw'); }
      },
      shapeSlot: {
        stk: shapeStk((SHAPE_BY_ID[s.shapeKind] || SHAPES[0]).icon),
        tip: tr('Shapes') + ' (R): ' + tr((SHAPE_BY_ID[s.shapeKind] || SHAPES[0]).label),
        icon: (SHAPE_BY_ID[s.shapeKind] || SHAPES[0]).icon,
        pressed: shapeOn ? 'true' : 'false', expanded: s.panel === 'shape' ? 'true' : 'false',
        style: btn + (shapeOn ? ' ' + dockOn : ''),
        pick: function () { self.pickTool('shape'); }
      },
      stickerSlot: {
        tip: tr('Stickers') + ' (E): ' + tr(curSticker.name),
        layers: curSticker.layers,
        inner: 'display: block; position: relative; width: 24px; height: 24px; filter: drop-shadow(0 1px 1px rgba(0,0,0,0.22));' + (curSticker.flip ? ' transform: scaleY(-1);' : ''),
        pressed: stickerOn ? 'true' : 'false', expanded: s.panel === 'sticker' ? 'true' : 'false',
        style: btn + (stickerOn ? ' ' + dockOn : ''),
        pick: function () { self.pickTool('sticker'); }
      },

      showDraw: drawOn && !chat,
      penPressed: s.drawMode === 'pen' ? 'true' : 'false',
      arrowPressed: s.drawMode === 'arrow' ? 'true' : 'false',
      penBtnStyle: 'width: 38px; height: 38px;' + (s.drawMode === 'pen' ? ' ' + activeCss : ''),
      arrowBtnStyle: 'width: 38px; height: 38px;' + (s.drawMode === 'arrow' ? ' ' + activeCss : ''),
      setPen: function () { self.setState({ drawMode: 'pen' }); },
      setArrow: function () { self.setState({ drawMode: 'arrow', lineOnly: false }); },
      inkOpts: INK.map(function (ic) {
        var on = s.ink === ic[0];
        return { label: ic[1], pressed: on ? 'true' : 'false', pick: function () { self.setState({ ink: ic[0] }); }, style: 'width: 38px; height: 38px;' + (on ? ' background: ' + tint + ';' : ''), dot: 'display: block; width: 24px; height: 24px; border-radius: 7px; background: ' + ic[0] + '; border: 1px solid rgba(0,0,0,0.15);' };
      }),

      showShapes: s.panel === 'shape' && !chat,
      shapeOpts: SHAPES.map(function (sh) {
        var on = s.shapeKind === sh.id;
        return { label: sh.label, icon: sh.icon, checked: on ? 'true' : 'false', pick: function () { self.setState({ shapeKind: sh.id, tool: 'shape', panel: null }); }, style: 'width: 44px; height: 44px;' + (on ? ' ' + activeCss : '') };
      }),

      showNodes: s.panel === 'nodes' && !chat,
      dock: DOCK,
      stkLib: 'display: block; flex: 0 0 auto; position: relative; width: 28px; height: 28px; filter: drop-shadow(0 1px 1px rgba(0,0,0,0.26));',
      stkBox: 'display: block; flex: 0 0 auto; position: relative; width: 26px; height: 26px; filter: drop-shadow(0 1px 1px rgba(0,0,0,0.26));',
      stkSm: 'display: block; flex: 0 0 auto; position: relative; width: 20px; height: 20px; filter: drop-shadow(0 1px 1px rgba(0,0,0,0.26));',
      undoBox: 'display: block; flex: 0 0 auto; position: relative; width: 26px; height: 26px; filter: drop-shadow(0 1px 1px rgba(0,0,0,0.26));',
      undoStk: s.canUndo ? DOCK.undo : DOCK.undoOff, redoStk: s.canRedo ? DOCK.redo : DOCK.redoOff,
      redoBox: 'display: block; flex: 0 0 auto; position: relative; width: 26px; height: 26px; filter: drop-shadow(0 1px 1px rgba(0,0,0,0.26));',
      runStk: s.running ? DOCK.stop : DOCK.play,
      bgStk: s.bg === 'dots' ? DOCK.dots : DOCK.grid,
      grp: 'display: flex; align-items: center; gap: 2px; padding: 3px; border-radius: 14px; background: #F3F4F6;',
      viewBtn: btn + (s.bgMenu ? ' ' + activeCss : ''),
      stickyFill: nextSticky,
      nodeSlot: {
        tip: tr('All nodes') + ' (N)',
        stk: NODE_STK.more,
        icon: curNode.icon,
        chip: 'width: 26px; height: 26px; border-radius: 8px; display: flex; align-items: center; justify-content: center; background: ' + CATS[curNode.cat].bg + '; color: ' + CATS[curNode.cat].fg + ';' + CHIP_STK,
        pressed: ((tool === 'node' && s.pins.indexOf(s.nodeType) < 0) || s.panel === 'nodes') ? 'true' : 'false', expanded: s.panel === 'nodes' ? 'true' : 'false',
        style: btn + (((tool === 'node' && s.pins.indexOf(s.nodeType) < 0) || s.panel === 'nodes') ? ' ' + dockOn : ''),
        pick: function () { self.pickTool('node'); }
      },
      pinBtns: s.pins.filter(function (t) { return !!NODE_BY[t]; }).map(function (t) {
        var on = tool === 'node' && s.nodeType === t && s.panel !== 'nodes', name = self.nodeName(t);
        return {
          _v: 1, name: name, tip: name, stk: NODE_STK[t] || NODE_STK.pkg, pressed: on ? 'true' : 'false', style: btn + (on ? ' ' + dockOn : ''),
          pick: function () { if (on) self.setState({ tool: 'select' }); else self.placeNode(t); }
        };
      }),
      nodeCats: (function () {
        var pickType = function (nd, cg) {
          var on = tool === 'node' && s.nodeType === nd.t;
          return { label: nd.label, icon: nd.icon, stk: NODE_STK[nd.t] || NODE_STK.llm, style: on ? activeCss : '', chip: 'flex: 0 0 auto; width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; background: ' + cg.bg + '; color: ' + cg.fg + ';' + CHIP_STK, pick: function () { self.setState({ nodeType: nd.t, tool: 'node', panel: null, selected: null, welcome: false }); } };
        };
        var out = [];
        if (s.library.length) out.push({ label: 'Your library', hint: 'Saved selections you can drop in again', types: s.library.map(function (en) {
          return { canPin: false, label: fmt('Saved flow {0} ({1})', en.n, en.count), stk: NODE_STK.lib, icon: 'M5 4h14a1 1 0 0 1 1 1v14l-4-3-4 3-4-3-4 3V5a1 1 0 0 1 1-1z', style: '', chip: 'flex: 0 0 auto; width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; background: #FFE9C7; color: #7A4100;' + CHIP_STK, pick: function () { self.insertFromLibrary(en); } };
        }) });
        var tile = function (t) {
          var nd = NODE_BY[t], one = pickType(nd, CATS[nd.cat]), pinned = s.pins.indexOf(t) >= 0;
          one._v = 1;
          one.label = self.nodeName(t);
          one.canPin = true;
          one.pinPressed = pinned ? 'true' : 'false';
          one.pinTip = fmt(pinned ? 'Unpin {0} from the toolbar' : 'Pin {0} to the toolbar', one.label);
          one.togglePin = function () { self.togglePin(t); };
          one.pinStyle = 'position: absolute; right: 4px; top: 6px; width: 28px; height: 28px; border-radius: 8px; ' + (pinned ? 'color: ' + accent + ';' : 'color: #8A8B93;');
          one.pinFill = pinned ? 'currentColor' : 'none';
          one.style = (one.style || '') + ' width: 100%; box-sizing: border-box; padding-right: 36px;';
          return one;
        };
        var pinned = s.pins.filter(function (t) { return !!NODE_BY[t]; });
        var rest = s.shelf.concat(s.installed.map(function (id) { return 'pkg:' + id; })).filter(function (t) { return !!NODE_BY[t] && pinned.indexOf(t) < 0; });
        if (pinned.length) out.push({ label: 'On the toolbar', hint: fmt('{0} of {1} places used', pinned.length, PIN_MAX), types: pinned.map(tile) });
        if (rest.length) out.push({ label: 'Your nodes', hint: 'Pin the ones you use most', types: rest.map(tile) });
        return out;
      })(),
      lib: {
        has: s.library.length > 0,
        clearLabel: 'Clear library', clear: function () { self.setState({ library: [] }); },
        marketLabel: 'Find more in the node market', openMarket: function () { self.openMarket('browse'); }, marketStyle: 'height: 36px; background: ' + accent + '; color: #FFFFFF;',
        hint: 'Nodes you do not see here are in the market.'
      },
      showStickers: s.panel === 'sticker' && !chat,
      stickerQuery: s.stickerQuery,
      onStickerQuery: function (e) { self.setState({ stickerQuery: e.target.value }); },
      stickerOpts: stickerOpts,
      noStickers: stickerOpts.length === 0,

      chatPressed: chat ? 'true' : 'false',
      toggleChat: function () { self.setChat(!self.state.chat); },
      chatStyle: softBtn + (chat ? activeCss : 'background: transparent; color: #111114;'),
      promptHidden: chat ? 'false' : 'true',
      promptWrapStyle: 'width: 100%; max-width: 520px; transform-origin: 50% 100%; transition: opacity 180ms ease, transform 240ms cubic-bezier(0.2, 0.8, 0.2, 1), visibility 0s linear ' + (chat ? '0s' : '240ms') + '; ' + (chat ? 'opacity: 1; transform: translateY(0) scale(1); visibility: visible; pointer-events: auto;' : 'opacity: 0; transform: translateY(16px) scale(0.97); visibility: hidden; pointer-events: none; position: absolute;'),
      promptFormStyle: 'box-sizing: border-box; display: flex; align-items: center; gap: 6px; padding: 6px 6px 6px 16px; background: #FFFFFF; border: 1.5px solid ' + (s.prompt ? accent : '#DCDDE2') + '; border-radius: 18px; box-shadow: 0 10px 30px rgba(20,20,30,0.10), 0 2px 6px rgba(20,20,30,0.05); transition: border-color 160ms ease;',
      placeholder: barMic ? 'Listening…' : (s.welcome ? 'Describe what to build' : s.area ? 'Describe what to build inside this box' : (s.selected ? 'Describe what comes after the selected item' : 'Describe what to draw or build')),
      inputRef: this.inputRef,
      prompt: s.prompt,
      onPrompt: function (e) { self.setState({ prompt: e.target.value }); },
      onSubmit: function (e) { self.submitPrompt(e); },
      micPressed: barMic ? 'true' : 'false',
      micLabel: barMic ? 'Stop dictation' : 'Dictate',
      toggleMic: function () { var on = !(self.state.mic && self.state.micFrom === 'bar'); self.setState({ mic: on, micFrom: on ? 'bar' : null }); },
      micStyle: 'width: 40px; height: 40px;' + (barMic ? ' background: #FDECEA; color: #B42318; animation: wb-pulse 1.2s ease-out infinite;' : ''),
      sendDisabled: !(s.prompt || '').trim(),
      sendStyle: 'width: 40px; height: 40px; border: 0; border-radius: 12px; display: flex; align-items: center; justify-content: center; ' + ((s.prompt || '').trim() ? 'background: ' + accent + '; color: #FFFFFF; cursor: pointer;' : 'background: #F3F4F6; color: #8A8B92;'),
      hasToast: !!s.toast,
      toast: s.toast,
      toastStyle: 'position: absolute; left: 50%; bottom: ' + ((chat ? 186 : 102) + (s.chatRun && !s.welcome ? 290 : 0) + (hasProposal && !s.welcome && !(s.chatRun && !s.chatRun.done) ? 60 : 0)) + 'px; display: flex; align-items: center; gap: 8px; max-width: calc(100% - 32px); box-sizing: border-box; padding: 10px 16px; border-radius: 999px; background: #111114; color: #FFFFFF; font-size: 14px; font-weight: 400; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; pointer-events: none; animation: wb-toast 2.6s ease forwards; transform: translateX(-50%);'
    };
    return trOut(out);
  }

  // Keys that only look around, allowed on a board this person cannot change.
  roKey(e) {
    var k = e.key, mod = e.metaKey || e.ctrlKey;
    if (mod) return /^[ca0=+\-]$/i.test(k);
    return ['Escape', ' ', '?', '+', '-', '=', 'h', 'v', '1'].indexOf(k) >= 0;
  }

  // Server: a view link (and the embed) for this board.
  openShare(tab) {
    var self = this, s = this.state;
    this.setState({ share: tab, acctMenu: null, menu: null });
    if (s.link || !s.signedIn || !s.boardId || tab === 'package' || this.ro()) return;
    api('POST', '/v1/boards/' + s.boardId + '/link', {}).then(function (r) { self.setState({ link: r.token }); }, function (err) { self.flash(String(err.message || err)); });
  }

  render() {
    var s = this.state;
    if (!s.loaded) return <div style={{ minHeight: '100vh', background: '#FFFFFF' }} />;
    if (s.loadError) return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, fontFamily: 'Inter, sans-serif' }}>
        <p style={{ margin: 0, fontSize: 18 }}>{tr(s.loadError)}</p>
        <button className="wb-primary" type="button" onClick={() => this.props.goHome()} style={{ background: '#2457C5', color: '#FFFFFF' }}>{tr('All boards')}</button>
      </div>
    );
    var v = this.renderVals();
    if (this.props.embed && this.props.toolbar === false) v = Object.assign({}, v, { embedBare: true });
    var cls = [this.ro() ? 'pd-ro' : '', this.props.embed && this.props.toolbar === false ? 'pd-embed-bare' : ''].filter(Boolean).join(' ');
    return <div className={cls || undefined}><BoardView v={v} /></div>;
  }
}

