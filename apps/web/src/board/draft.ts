// @ts-nocheck
// The names the board logic uses, as in the design draft (design/Main.dc.html).
// Logic and registries come from @paradigm/shared, where they are written and
// tested in TypeScript; this file maps the draft's names onto them and adds the
// draft's own interface constants (sticker layers, labels, panel settings),
// which are read from draft-data.json, extracted from the draft as is.

import * as S from '@paradigm/shared';
import ZH from '../i18n/zh.json';
import { getLang, tr as trLang } from '../lib/i18n';
import D from './draft-data.json';
import { drawBlocks as drawBlocksImpl, textCss as textCssImpl, stickyStk, penStk, arrowStk, shapeStk, L } from './draw';

export const {
  ACCEPTS, AGAP, API, ARROW_WEIGHTS, BOARD_TOOLS, BUILTIN_BACKEND, CATS, DEFAULT_PINS, DEFAULT_SHELF, FRAME_FILLS, GRID, MCP_TOOLS, NEXT_STEP,
  NODE_BY, NODE_DEFS, NODE_HINT, PEN_WEIGHTS, PIN_MAX, SHAPE_FILLS, STARTERS, STICKY_COLORS, TEXT_COLORS, TEXT_STYLES, UI_RULES,
  arrowPts, blocksToHtml, bounds, canRunDef, canTake, cfgOf, chatModeOf, clipText, endPoint, flowGraph, idPrefix, index, infoOut, isBuiltin, isHarness,
  itemText, makeView, mkEdge, nearestSide, nodeRequest, numOf, okHex, outType, outVec, penD, planChat, polyMid, ptsBox, roundedPath, shapeHasText,
  showVal, sidePoint, simAnswer, slugOf, upText, viaFrom, viaShift, typeName,
} = S;
export const HARNESS = S.HARNESSES;
export const NODE_OPTS = S.NODE_OPTIONS;
export const PKG_TEMPLATE = S.MANIFEST_TEMPLATE;
export const validatePkg = S.validateManifest;
export const pkgOut = S.packageResult;
export const fileDoc = (items, G) => S.toFile(items, G);
export const loadDoc = (doc) => S.fromFile(doc);
export const tplItems = (name) => (name && name !== 'Welcome' ? S.starterItems(name) : null);
export const mcpConfig = S.mcpConfig;
export const skillText = S.skillText;
export const shapeLayers = (it) => S.shapeLayers(it).map(L);

// ---- the draft's interface constants
export const {
  HZ_OPW, HZ_ORDER, HZ_PCOL, HZ_PERMS, HZ_PNAME, HZ_PNEXT, HZ_RES, HZ_STK, HZ_SUBS, API_ORDER, API_USER, KEYS, STICKERS, SHAPES, AVATARS, DOCK,
  I_EN, I_ZH, INK, PREFIX, CONNECTABLE, MONO, CHIP_STK, DOT, AREA_COL, IMG_ICON, PLAY_ICON,
} = D;
export const BUILTIN_SUM = D.BUILTIN_SUM;
export const NODE_STK = D.NODE_STK;
export const STICKER_BY_ID = Object.fromEntries(STICKERS.map((s) => [s.id, s]));
export const SHAPE_BY_ID = Object.fromEntries(SHAPES.map((s) => [s.id, s]));
export { stickyStk, penStk, arrowStk, shapeStk, L };
export const drawBlocks = drawBlocksImpl;
export const textCss = textCssImpl;

// ---- language
export const tr = (t) => trLang(t);
export const fmt = (t, ...a) => tr(t).replace(/\{(\d)\}/g, (m, n) => String(a[Number(n)]));
function deepTr(v, depth) {
  if (typeof v === 'string') return ZH[v] || v;
  if (Array.isArray(v)) return v.map((x) => deepTr(x, depth));
  if (v && typeof v === 'object') {
    if (v._v || v.$$typeof || v.current !== undefined && Object.keys(v).length === 1) return v;
    const o = {};
    for (const k in v) {
      const x = v[k];
      if (typeof x === 'function' || k === 'from' || (depth === 1 && (k === 'text' || k === 'label'))) o[k] = x;
      else o[k] = deepTr(x, depth ? 2 : 0);
    }
    return o;
  }
  return v;
}
/** Translates the view object, as the draft does, when the page is in Chinese. */
export function trOut(out) {
  if (getLang() !== 'zh') return out;
  const o = {};
  for (const k in out) {
    const x = out[k];
    if (typeof x === 'function' || k === 'prompt' || k === 'stickerQuery' || k === 'i' || k === 'boardRef' || k === 'inputRef') o[k] = x;
    else if (k === 'items') o[k] = x.map((it) => deepTr(it, 1));
    else o[k] = deepTr(x, 0);
  }
  return o;
}

// ---- small helpers the draft keeps next to the board
export function editable(it) {
  if (it.kind === 'node') return !!(NODE_BY[it.ntype] || {}).field;
  if (it.kind === 'shape') return shapeHasText(it.shape);
  return it.kind === 'text' || it.kind === 'sticky' || it.kind === 'frame';
}
export function sameButStatus(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i], y = b[i];
    if (x === y) continue;
    if (x.id !== y.id) return false;
    for (const key of Object.keys({ ...x, ...y })) if (key !== 'status' && x[key] !== y[key]) return false;
  }
  return true;
}
export function samePts(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (Math.abs(a[i][0] - b[i][0]) + Math.abs(a[i][1] - b[i][1]) > 0.5) return false;
  return true;
}
export function setStatus(items, patch) {
  return items.map((it) => (patch[it.id] && it.status !== patch[it.id] ? { ...it, status: patch[it.id] } : it));
}
export function rr(w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  return 'M' + r + ' 0H' + (w - r) + 'A' + r + ' ' + r + ' 0 0 1 ' + w + ' ' + r + 'V' + (h - r) + 'A' + r + ' ' + r + ' 0 0 1 ' + (w - r) + ' ' + h + 'H' + r + 'A' + r + ' ' + r + ' 0 0 1 0 ' + (h - r) + 'V' + r + 'A' + r + ' ' + r + ' 0 0 1 ' + r + ' 0z';
}
export function aiDoc(items, G) {
  const byId = index(items);
  return {
    order: G.order,
    nodes: items.filter((o) => o.kind !== 'arrow').map((o) => {
      const n = { id: o.id, type: typeName(o) }, t = itemText(o);
      if (t) n.text = t;
      if (G.step[o.id]) n.step = G.step[o.id];
      if (G.ins[o.id]) n.inputs = G.ins[o.id];
      if (G.outs[o.id]) n.next = G.outs[o.id];
      const ot = outType(o);
      if (ot) n.output = ot;
      if (o.status && o.status !== 'idle') n.status = o.status;
      if (o.group) n.group = o.group;
      if (o.proposed) n.proposed = true;
      return n;
    }),
    edges: G.edges.map((e) => ({ from: e.from, to: e.to, carries: outType(byId[e.from]) || 'context' })),
  };
}

// ---- agent runs: what the tool ring shows
export const hzText = (ev) => (ev.tpl ? fmt(ev.tpl, ev.arg) : tr(ev.arg));
export function hzFacts(h, n, perms) {
  const stats = {}, subs = {}, targets = {};
  let ok = 0, blocked = 0;
  HZ_ORDER.forEach((id) => { stats[id] = { count: 0, blocked: 0, ops: {} }; targets[id] = []; });
  for (let i = 0; i < n && i < h.log.length; i++) {
    const ev = h.script[i], st = stats[ev.res];
    if (!st) continue;
    if (h.log[i] === 'blocked') { st.blocked++; blocked++; continue; }
    st.count++; ok++; st.ops[ev.op] = (st.ops[ev.op] || 0) + 1;
    if (ev.sub) subs[ev.sub] = (subs[ev.sub] || 0) + 1;
    if (ev.target && targets[ev.res].indexOf(ev.target) < 0) targets[ev.res].push(ev.target);
  }
  const next = h.script && h.log.length < h.script.length ? h.script[h.log.length] : null;
  return { stats, subs, targets, ok, blocked, next, pend: !!h.pend && !!next && (perms[next.res] || 'ask') === 'ask', used: HZ_ORDER.filter((id) => stats[id].count > 0) };
}
export function hzSum(f) {
  return fmt(f.used.length === 1 ? '{0} tool' : '{0} tools', f.used.length) + ' · ' + fmt(f.ok === 1 ? '{0} step' : '{0} steps', f.ok) + (f.blocked ? ' · ' + fmt('{0} blocked', f.blocked) : '');
}

// ---- market nodes: the market list comes from the server
export const PKG_BY = {};
export const MARKET = [];
export function registerPkg(p) {
  const t = S.registerManifest(p);
  PKG_BY[p.id] = p;
  NODE_STK[t] = NODE_STK[S.PACKAGE_STICKER[p.sticker] || 'pkg'] || NODE_STK.pkg;
  return t;
}
for (const m of S.SAMPLE_MANIFESTS) registerPkg(m);
/** Replaces the market list with what the server lists, and registers every node in it. */
export function setMarket(list) {
  MARKET.length = 0;
  for (const m of list) {
    if (S.validateManifest(m).length) continue;
    registerPkg(m);
    MARKET.push(m);
  }
}
setMarket(S.SAMPLE_MANIFESTS);
