#!/usr/bin/env python3
"""Builds apps/web/src/board/Board.tsx from the board class of the design
draft (design/Main.dc.html). The draft's methods are kept as they are; the
ones that were simulated in the draft are replaced by the versions in the
overrides folder, which talk to the server (an empty override deletes the
method). A few small changes inside kept methods are listed as asserted
replacements below.

Change an override or this script, then regenerate; do not edit Board.tsx by
hand, or the next run will drop the edit.

Usage: port-board.py design/Main.dc.html scripts/board-overrides apps/web/src/board/Board.tsx
"""
import os, re, sys

src, over_dir, out = sys.argv[1], sys.argv[2], sys.argv[3]
s = open(src).read()
js = s[s.index('<script type="text/x-dc"'):]
js = js[js.index('>') + 1:]
cls = js[js.index('class Component'):]
cls = cls[:cls.rindex('}', 0, cls.index('</script>')) + 1]

def method_span(text, name):
    m = re.search(r'\n  ' + re.escape(name) + r'\s*\([^)]*\)\s*\{', text)
    if not m: return None
    start = m.start()
    line_end = text.index('\n', m.end())
    line = text[m.start() + 1:line_end]
    if line.count('{') == line.count('}'):  # one line
        return start, line_end
    end = text.index('\n  }\n', m.end()) + 4
    return start, end

for f in sorted(os.listdir(over_dir)):
    name = f[:-3]
    body = open(os.path.join(over_dir, f)).read().rstrip('\n')
    sp = method_span(cls, name)
    if not sp: raise SystemExit('no method ' + name)
    a, b = sp
    cls = cls[:a] + ('\n' + body if body.strip() else '') + cls[b:]

def rep(old, new, count=1):
    global cls
    n = cls.count(old)
    if n != count: raise SystemExit(f'expected {count}, found {n}: {old[:80]}')
    cls = cls.replace(old, new)

# ---- language and labels
rep("    LANG = s.lang;\n", "")
rep("    return LANG === 'zh' ? trOut(out) : out;", "    return trOut(out);")
rep("      i: s.lang === 'zh' ? I_ZH : I_EN,", "      i: Object.assign({}, s.lang === 'zh' ? I_ZH : I_EN, this.props.me ? { k66: this.props.me.name, k67: this.props.me.email || tr('Guest') } : {}),\n      links: { SignIn: '/signin', Workspace: '/', Main: '/board/new' },\n      follow: function (e) { if (e && e.preventDefault) e.preventDefault(); var h = e.currentTarget.getAttribute('href'); if (h === '/signin') self.props.signOut(); else self.props.goHome(); },")
rep("        flipLang: function () { self.setState({ lang: self.state.lang === 'zh' ? 'en' : 'zh' }); },", "        flipLang: function () { self.props.flipLang(); },")
rep("pick: function () { self.setState({ lang: l[0], acctMenu: null }); } }; })", "pick: function () { self.props.setLang(l[0]); self.setState({ acctMenu: null }); } }; })")

# ---- a placed note or text is ready to type into
rep("    if (it.kind === 'text' || it.kind === 'sticky' || (it.kind === 'node' && editable(it))) patch.editing = it.id;\n    patch.welcome = false;\n    this.setState(patch);\n",
    "    if (it.kind === 'text' || it.kind === 'sticky' || (it.kind === 'node' && editable(it))) patch.editing = it.id;\n    patch.welcome = false;\n    this.setState(patch);\n    if (patch.editing) this.focusEditor();\n")

# ---- live editing: while others are on the board, new ids carry this page's tag so two people never make the same one
rep("    do { this.seq[prefix] = (this.seq[prefix] || 0) + 1; id = prefix + this.seq[prefix]; } while (used[id]);\n",
    "    var self = this, tag = (this.people || []).some(function (x) { return x.conn !== self.liveConn; }) && this.liveConn ? this.liveConn.replace(/[^a-z0-9]/gi, '').slice(0, 3).toLowerCase() : '';\n    do { this.seq[prefix] = (this.seq[prefix] || 0) + 1; id = prefix + this.seq[prefix] + tag; } while (used[id]);\n")

# ---- a sticky note's colour is its paper, not its ink (the draft passed the fill to textCss, so the text was invisible)
rep("      var sc = textCss(it, accent);\n", "      var sc = textCss(Object.assign({}, it, { color: '#111114' }), accent);\n")

# ---- live editing: a sticky note keeps who wrote it, and shows "You" only on that person's page
rep("    if (kind === 'sticky') return { id: id, kind: kind, x: pb.x, y: pb.y, w: 200, h: 200, color: STICKY_COLORS[count % STICKY_COLORS.length][0], rot: [-0.6, 0.5, -0.3, 0.7][count % 4], style: 'body', text: '' };\n",
    "    if (kind === 'sticky') return { id: id, kind: kind, x: pb.x, y: pb.y, w: 200, h: 200, color: STICKY_COLORS[count % STICKY_COLORS.length][0], rot: [-0.6, 0.5, -0.3, 0.7][count % 4], style: 'body', text: '', by: this.props.me && !this.props.me.guest ? this.props.me.name : undefined };\n")
rep("      o.placeholder = 'Type something'; o.ariaText = 'Sticky note text';\n",
    "      o.placeholder = 'Type something'; o.ariaText = 'Sticky note text';\n      o.byLabel = it.by && !(this.props.me && this.props.me.name === it.by) ? it.by : 'You';\n")

# ---- in your app: the board fills the box it is given, not the window
rep("      mainStyle: 'position: relative; width: 100%; height: 100vh; min-height: 720px; overflow: hidden;",
    "      mainStyle: 'position: relative; width: 100%; ' + (this.props.local ? 'height: 100%; min-height: 0;' : 'height: 100vh; min-height: 720px;') + ' overflow: hidden;")
rep("npm install [PACKAGE NAME]\\n\\nimport { Board } from '[PACKAGE NAME]';", "npm install \" + PACKAGE_NAME + \"\\n\\nimport { Board } from '\" + PACKAGE_NAME + \"';")

# ---- a board with no toolbars (bare embed, or the package with toolbar off) fits with small margins
rep("    var r = this.rect(), top = 80, avail = r.height - top - 170;\n    var bw = Math.max(1, maxx - minx), bh = Math.max(1, maxy - miny);\n    var nz = Math.round(Math.max(0.25, Math.min(1.5, (r.width - 160) / bw, avail / bh)) * 100) / 100;\n",
    "    var bare = this.props.toolbar === false && (this.props.embed || this.props.local), r = this.rect(), top = bare ? 24 : 80, avail = r.height - top - (bare ? 24 : 170);\n    var bw = Math.max(1, maxx - minx), bh = Math.max(1, maxy - miny);\n    var nz = Math.round(Math.max(0.25, Math.min(1.5, (r.width - (bare ? 48 : 160)) / bw, avail / bh)) * 100) / 100;\n")

# ---- account bar: real workspaces and saving
rep("        guestLabel: 'Guest board', guestNote: 'You are working as a guest. This board is saved on this device only.',",
    "        guestLabel: this.ro() ? (s.title || 'Board') : 'Guest board', guestNote: this.ro() ? 'You are viewing this board through a link. You cannot change it.' : 'You are working as a guest. Sign in or add an email to keep this board.',")
rep("        saveLabel: s.saveState === 'off' ? 'Not saved' : (s.saveState === 'saved' ? 'Saved on this device' : 'Saves on this device'),",
    "        saveLabel: this.ro() ? 'View only' : s.saveState === 'off' ? 'Not saved' : (s.saveState === 'saved' ? 'Saved' : 'Saving'),")
rep("        wsName: WORKSPACES[s.ws] || WORKSPACES[0],", "        wsName: (function () { var w = s.workspaces.find(function (x) { return x.id === s.wsId; }); return w ? (w.personal ? tr('Personal') : w.name) : (s.title || ''); })(),")
rep("        wsList: WORKSPACES.map(function (w, n) { return { name: w, on: s.ws === n, checked: s.ws === n ? 'true' : 'false', pick: function () { self.setState({ ws: n, acctMenu: null }); } }; }),",
    "        wsList: s.workspaces.map(function (w) { var on = w.id === s.wsId; return { name: w.personal ? tr('Personal') : w.name, on: on, checked: on ? 'true' : 'false', pick: function () { self.setState({ acctMenu: null }); if (!on) self.props.goHome(w.id); } }; }),")
rep("        newBoardLabel: 'New empty board', newBoard: function () { self.setState({ acctMenu: null }); self.loadTemplate('Welcome'); },",
    "        newBoardLabel: 'New empty board', newBoard: function () { self.setState({ acctMenu: null }); self.props.newBoard(); },")
rep("        openShare: function () { self.setState({ share: 'link', acctMenu: null, menu: null }); },",
    "        openShare: function () { if (self.ro()) self.copyText(window.location.href, 'Link copied'); else self.openShare('link'); },")

# ---- share: real links
rep("""        var code = tab === 'link' ? 'https://[YOUR DOMAIN]/b/[BOARD ID]?mode=view'
          : (tab === 'embed' ? '<iframe\\n  src="https://[YOUR DOMAIN]/embed/[BOARD ID]?mode=' + mode + (s.embedBar ? '' : '&toolbar=off') + '"\\n  width="100%" height="480"\\n  style="border: 0"></iframe>'""",
"""        var origin = window.location.origin, tok = s.link || '…';
        var code = tab === 'link' ? origin + '/v/' + tok
          : (tab === 'embed' ? '<iframe\\n  src="' + (s.embedEdit ? origin + '/b/' + s.boardId + '?embed=1' : origin + '/embed/' + tok) + (s.embedBar ? '' : (s.embedEdit ? '&' : '?') + 'toolbar=off') + '"\\n  width="100%" height="480"\\n  style="border: 0"></iframe>'""")
rep("""          note: needs ? 'Links and hosted embeds need an account, so the board has an owner. Your work stays on this device until then.'""",
    """          note: needs ? 'Links and hosted embeds need an account, so the board has an owner. Sign in to share this board.'""")
rep("""            : (tab === 'embed' ? 'Paste this into any page to show the board there.'""",
    """            : (tab === 'embed' ? (s.embedEdit ? 'Paste this into any page. People who can edit the board sign in to change it there.' : 'Paste this into any page to show the board there.')""")
rep("pick: function () { self.setState({ share: tb[0] }); }", "pick: function () { self.openShare(tb[0]); }")

# ---- chat footer, inspector and market texts
rep("          foot: 'Our own agent, built on Pi. Simulated until the backend is connected.',",
    "          foot: run.sim ? 'Our own agent, built on Pi. Simulated: no model key is set on the server.' : 'Our own agent, built on Pi.',")
rep("fmt(t === 'llm' ? 'Our own harness: {0}. Simulated until the backend is connected.' : 'Runs on {0}. Simulated until the backend is connected.', tr(hn.name))",
    "fmt(t === 'llm' ? 'Our own harness: {0}. Runs on the server.' : 'Runs on {0}, on the server.', tr(hn.name))")
rep("'Needs the backend. Results are simulated until one is connected.'", "'Runs on the server. If its service is not set up there, the result is simulated and says so.'")
rep("      note: 'Nodes from other people are sample listings. Sharing with other people needs the backend.'",
    "      note: 'Nodes other people published to this server are listed here, after the same check.'")
rep("o.copyMcp = function () { self.copyText(mcpConfig(), 'MCP settings copied'); };", "o.copyMcp = function () { self.copyMcp(); };")
rep("by: p.author + ' · ' + p.version,", "by: (p.publisher || p.author) + ' · ' + p.version,")

# ---- real images and videos on nodes
rep("""      else { o.pvShow = true; o.pv = base + 'align-items: center; justify-content: center; gap: 6px; background: #EFEAFB; color: #5B3FB8;'; o.pvIcon = true; o.pvIconD = IMG_ICON; cap(res && res.meta ? fmt('Simulated image · {0}', res.meta) : 'Generated image placeholder', '#4A3296'); }""",
    """      else if (res && res.value && !res.sim) { o.pvShow = true; o.pv = base + "background: #EFEAFB url('" + fileUrl(String(res.value)) + "') center / cover no-repeat;"; }
      else { o.pvShow = true; o.pv = base + 'align-items: center; justify-content: center; gap: 6px; background: #EFEAFB; color: #5B3FB8;'; o.pvIcon = true; o.pvIconD = IMG_ICON; cap(res && res.meta ? fmt('Simulated image · {0}', res.meta) : 'Generated image placeholder', '#4A3296'); }""")
rep("""cap(res && res.meta ? fmt('Simulated video · {0}', res.meta) : 'Generated video placeholder', '#E3E4E8'); }""",
    """cap(res && res.meta ? fmt(res.sim ? 'Simulated video · {0}' : 'Video · {0}', res.meta) : 'Generated video placeholder', '#E3E4E8'); }""")

# ---- read-only boards (view links, view-only shares)
rep("  boardDown(e) {\n", "  boardDown(e) {\n    if (this.ro() && this.state.tool !== 'select' && this.state.tool !== 'hand') this.setState({ tool: 'select', panel: null });\n")
for name in ['boardDbl(e)', 'itemDbl(it, e)', 'handleDown(id, corner, e)', 'endDown(id, which, e)', 'segDown(id, j, e)', 'dotDown(id, side, e)']:
    rep('  ' + name + ' {\n', '  ' + name + ' {\n    if (this.ro()) { if (e && e.stopPropagation) e.stopPropagation(); return; }\n')
rep("  move(e) {\n", "  move(e) {\n    if (this.ro() && this.drag && this.drag.mode !== 'pan' && this.drag.mode !== 'marquee') return;\n")
rep("  key(e) {\n", "  key(e) {\n    if (this.ro() && !this.roKey(e)) return;\n")
rep("  runFlow() {\n", "  runFlow() {\n    if (this.ro()) { this.flash('You can view this board but not change it'); return; }\n")
rep("  runNode(id) {\n", "  runNode(id) {\n    if (this.ro()) { this.flash('You can view this board but not change it'); return; }\n")
rep("  renderCtx(selItem, byId, accent, tint) {\n", "  renderCtx(selItem, byId, accent, tint) {\n    if (this.ro()) return { show: false };\n")

head = '''// @ts-nocheck
// The whiteboard. Generated: do not edit. This is the board logic of the
// design draft (design/Main.dc.html), ported method by method by
// scripts/port-board.py; change scripts/board-overrides and regenerate.
// Node, graph, file and document logic comes from @paradigm/shared through
// ./draft. What the draft only simulated (saving, agent runs, the chat, the
// market, files, sharing, voice) is marked "Server:" and talks to the server.

import { Component } from 'react';
import { executeNode, contract, mergeItems } from '@paradigm/shared';
import { BoardView } from '../views/BoardView';
import { agent as agentApi, api, backend, boards, files, fileUrl, live, prefs, workspaces } from '../lib/api';
import { runJs } from './script';
import * as D from './draft';

/** The "In your app" package (packages/board), named in the share dialog. */
const PACKAGE_NAME = '@paradigm/board';

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
  /** No server: the board shows this file and hands every change to onChange (the "In your app" package). */
  local?: { file: unknown; readOnly?: boolean; onChange?: (file: unknown) => void };
}

'''
cls = cls.replace('class Component extends DCLogic {', 'export class Board extends Component<BoardProps, any> {', 1)
extra = '''
  /** The browser moves focus to the board after the press that placed a note, so give it back to the note's editor. */
  focusEditor() {
    var self = this;
    setTimeout(function () { var el = self.boardEl && self.boardEl.querySelector('.wb-ta'); if (el && document.activeElement !== el) el.focus(); }, 0);
  }

  // Keys that only look around, allowed on a board this person cannot change.
  roKey(e) {
    var k = e.key, mod = e.metaKey || e.ctrlKey;
    if (mod) return /^[ca0=+\\-]$/i.test(k);
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
    if (!s.loaded) return <div style={{ minHeight: this.props.local ? 0 : '100vh', background: '#FFFFFF' }} />;
    if (s.loadError) return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, fontFamily: 'Inter, sans-serif' }}>
        <p style={{ margin: 0, fontSize: 18 }}>{tr(s.loadError)}</p>
        <button className="wb-primary" type="button" onClick={() => this.props.goHome()} style={{ background: '#2457C5', color: '#FFFFFF' }}>{tr('All boards')}</button>
      </div>
    );
    var v = this.renderVals();
    if (this.props.embed && this.props.toolbar === false) v = Object.assign({}, v, { embedBare: true });
    var cls = [this.ro() ? 'pd-ro' : '', this.props.embed && this.props.toolbar === false ? 'pd-embed-bare' : '', this.props.local ? 'pd-local' : ''].filter(Boolean).join(' ');
    return <div className={cls || undefined}><BoardView v={v} /></div>;
  }
}
'''
cls = cls[:cls.rindex('}')] + extra
open(out, 'w').write(head + cls + '\n')
print('ok', len(head + cls))
