// renderVals(): the view object the generated board markup reads. Ported from
// the draft's renderVals, renderItem, renderNode, renderView and renderViewer.
// Parts of the draft not built yet (the robot, the tool ring, the market, the
// inspector, comments) are left out, and their markup stays hidden.

import type { BoardItem, NodeItem, View } from '@paradigm/shared';
import {
  CATS, GRID, HARNESSES, NODE_BY, NODE_DEFS, PIN_MAX, SHAPES, STARTERS, STICKER_LIBRARY, TEXT_STYLES, arrowPts, bounds, canRunDef, clipText, flowGraph, index,
  numOf, okHex, outType, outVec, polyMid, ptsBox, roundedPath, penD, shapeHasText, shapeLayers, sidePoint, slugOf, upText, blocksToHtml, type FlowGraph,
} from '@paradigm/shared';
import { fileUrl } from '../lib/api';
import { fmt, labels, tr, trOut } from '../lib/i18n';
import { AREA_COL, CHIP_STK, DOCK, DOT, IMG_ICON, L, MONO, NODE_STK, PLAY_ICON, arrowStk, drawBlocks, penStk, shapeStk, stickyStk, textCss } from './draw';
import AVATARS from './avatars.json';
import type { Board } from './Board';

const STICKERS = STICKER_LIBRARY.map((s) => ({ ...s, layers: s.layers.map((l) => L(l)) }));
const STICKER_BY_ID: Record<string, (typeof STICKERS)[number]> = Object.fromEntries(STICKERS.map((s) => [s.id, s]));
const SHAPE_BY_ID: Record<string, (typeof SHAPES)[number]> = Object.fromEntries(SHAPES.map((s) => [s.id, s]));
const INK: [string, string][] = [['#111111', 'Black'], ['#E07A5F', 'Orange'], ['#2F7FD0', 'Blue'], ['#2E8B57', 'Green'], ['#7E57C2', 'Purple']];

function renderView(self: Board, it: NodeItem, o: any, vw: View, base: string, pvTop: number, bottom: number, accent: string) {
  const s = self.state, TH = { bg: '#FFFFFF', ink: '#111114', accent, center: false };
  const small = (label: string, right: number, run: () => void, off: boolean) => ({ label, disabled: off, pick: run, style: 'position: absolute; right: ' + right + 'px; bottom: ' + (bottom + 6) + 'px; height: 26px; padding: 0 9px; border-radius: 8px; font-size: 11px; background: #ECEDEF; color: #111114;' + (off ? ' opacity: 0.45;' : '') });
  o.pvShow = true;
  if (vw.kind === 'doc') {
    o.pv = base + 'gap: 5px; padding: 12px 14px; background: #FFFFFF; border: 1px solid #D7D8DD;';
    o.blocks = drawBlocks(vw.blocks, 0.7, TH, 12, 150);
  } else if (vw.kind === 'sheet') {
    o.pv = base + 'background: #FFFFFF; border: 1px solid #C9CBD2;';
    o.blocks = drawBlocks([{ k: 'table', text: '', head: vw.head, rows: vw.rows }], 0.8, { bg: '#FFFFFF', ink: '#111114', accent: '#1F6B3A', center: false }, 1, 60);
    o.blocks[0].style = 'flex: 1 1 auto; min-height: 0; overflow: hidden; box-sizing: border-box;';
    o.pvCap = true; o.pvCapText = fmt('{0} rows · {1} columns', vw.total, vw.head.length);
    o.pvCapStyle = 'flex: 0 0 auto; padding: 4px 8px; border-top: 1px solid #E3E4E8; background: #F6F6F8; font-size: 11.5px; color: #3A3B40;';
  } else if (vw.kind === 'slides') {
    const n = Math.max(0, Math.min(vw.slides.length - 1, s.slideAt[it.id] || 0)), sl = vw.slides[n], solo = !sl.items.length;
    o.pv = base + 'gap: 4px; padding: 12px 14px 38px; background: #FFFFFF; border: 1px solid #D7D8DD;' + (solo ? ' justify-content: center;' : '');
    o.blocks = drawBlocks([{ k: 'h2', text: sl.title || fmt('Slide {0}', n + 1) }, ...sl.items], 0.72, { ...TH, center: solo }, 7, 110);
    o.pvCap = true; o.pvCapText = n + 1 + ' / ' + vw.slides.length;
    o.pvCapStyle = 'position: absolute; left: 12px; bottom: 9px; ' + MONO + ' font-size: 11px; color: #6B6C73;';
    o.acts = [small('Next slide', 18, () => self.slideGo(it.id, n + 1), n >= vw.slides.length - 1), small('Previous slide', 96, () => self.slideGo(it.id, n - 1), n <= 0)];
  } else if (vw.kind === 'page') {
    const phone = it.device === 'phone', th = vw.theme || ({} as any), pth = { bg: okHex(th.bg) || '#FFFFFF', ink: okHex(th.ink) || '#111114', accent: okHex(th.accent) || accent, center: !!th.center };
    o.pv = 'position: absolute; top: ' + pvTop + 'px; bottom: ' + bottom + 'px; ' + (phone ? 'left: 50%; width: 148px; margin-left: -74px;' : 'left: 12px; right: 12px;') + ' box-sizing: border-box; border-radius: 8px; overflow: hidden; display: flex; flex-direction: column; gap: 6px; background: ' + pth.bg + '; border: 1px solid #C9CBD2;';
    o.pvChrome = true;
    o.blocks = drawBlocks(vw.blocks, phone ? 0.66 : 0.72, pth, 10, 120, phone ? 9 : 14);
    const seg = (label: string, key: string, right: number) => {
      const on = (it.device || 'desktop') === key;
      return { label, disabled: false, pick: () => self.update(it.id, { device: key }), style: 'position: absolute; right: ' + right + 'px; bottom: ' + (bottom + 6) + 'px; height: 26px; padding: 0 9px; border-radius: 8px; font-size: 11px; ' + (on ? 'background: ' + accent + '; color: #FFFFFF;' : 'background: #ECEDEF; color: #111114;') };
    };
    o.acts = [seg('Phone', 'phone', 18), seg('Desktop', 'desktop', 74)];
  } else {
    o.pv = base + 'gap: 7px; padding: 12px; background: #FFFFFF; border: 1px solid #D7D8DD;';
    o.pvPre = true; o.pvPreText = clipText(vw.source, 900);
    o.pvPreStyle = MONO + ' flex: 1 1 auto; min-height: 0; overflow: hidden; font-size: 12px; line-height: 1.45; white-space: pre-wrap; overflow-wrap: anywhere; color: #3A3B40;';
  }
}

function renderNode(self: Board, it: NodeItem, o: any, byId: Record<string, BoardItem>, accent: string, G: FlowGraph, editing: boolean) {
  const s = self.state, def = NODE_BY[it.ntype] || NODE_DEFS[0], cat = CATS[def.cat], st = it.status || 'idle';
  const keptId = it.opt ? s.kept[it.opt] : null, isKept = !!keptId && keptId === it.id, aside = !!keptId && !isKept;
  const res = s.out[it.id] || null, failed = st === 'error', hz = s.hz[it.id];
  const ins = G.ins[it.id] || [], runnable = canRunDef(def), dark = def.t === 'terminal', harness = !!HARNESSES[def.t];
  const tint = 'color-mix(in srgb, ' + accent + ' 12%, #FFFFFF)';
  o.isNode = true;
  o.card = 'position: absolute; inset: 0; box-sizing: border-box; overflow: hidden; background: #FFFFFF; border-radius: 14px; border: ' + ((it as any).proposed ? '1.5px dashed ' + accent : failed ? '1.5px solid #B42318' : st === 'running' ? '1.5px solid ' + accent : st === 'waiting' ? '2px solid #B45309' : isKept ? '2px solid ' + accent : '1px solid #D2D3D9') + '; opacity: ' + ((it as any).proposed ? 0.86 : aside ? 0.55 : 1) + '; transition: opacity 240ms ease; box-shadow: 0 1px 2px rgba(20,20,30,0.05), 0 6px 16px rgba(20,20,30,0.06);';
  o.head = 'position: absolute; left: 0; right: 0; top: 0; height: 40px; box-sizing: border-box; display: flex; align-items: center; gap: 8px; padding: 0 6px 0 8px; border-bottom: 1px solid #EEEFF2; color: #111114;';
  o.chip = 'flex: 0 0 auto; width: 26px; height: 26px; border-radius: 8px; display: flex; align-items: center; justify-content: center; background: ' + cat.bg + '; color: ' + cat.fg + ';' + CHIP_STK;
  o.icon = def.icon;
  o.stk = NODE_STK[def.t] || NODE_STK[def.pkg ? 'pkg' : 'llm'];
  o.title = it.optName ? fmt('Option {0}', it.optName) : tr(def.label);
  if (res && res.view && st === 'done') {
    o.canOpen = true; o.openLabel = 'Open the full view'; o.expanded = s.viewer && s.viewer.id === it.id ? 'true' : 'false';
    o.openStyle = 'width: 32px; height: 32px; border-radius: 9px;';
    o.toggleOpen = () => self.openViewer(it.id);
  }
  o.idLabel = '#' + it.id;
  o.idStyle = 'flex: 0 0 auto; ' + MONO + ' font-size: 11px; color: #6B6C73; background: #F3F4F6; padding: 2px 6px; border-radius: 6px;';
  o.canRun = runnable && s.role !== 'viewer';
  o.run = () => self.runNode(it.id);
  o.hasIn = def.cat !== 'info';
  o.portIn = 'position: absolute; left: -7px; top: 50%; width: 12px; height: 12px; margin-top: -6px; box-sizing: border-box; border-radius: 50%; background: #FFFFFF; border: 2px solid ' + DOT + '; pointer-events: none;';
  o.portOut = 'position: absolute; right: -8px; top: 50%; width: 14px; height: 14px; margin-top: -7px; border-radius: 50%; background: ' + DOT + '; box-shadow: 0 0 0 2px #FFFFFF; cursor: crosshair;';
  o.portDown = (e: any) => self.dotDown(it.id, 'right', e);

  let statText = ({ queued: 'Queued', running: 'Running', waiting: 'Waiting', error: 'Failed', done: it.optName ? (isKept ? 'Kept' : aside ? 'Set aside' : 'Ready') : 'Done' } as Record<string, string>)[st] || '';
  let statCss = ({ queued: 'background: #ECEDEF; color: #3A3B40;', running: 'background: ' + tint + '; color: ' + accent + ';', waiting: 'background: #FFE9C7; color: #7A4100;', error: 'background: #FDE7E4; color: #B42318;', done: 'background: #DDF3E4; color: #1F6B3A;' } as Record<string, string>)[st] || '';
  if (st === 'done' && aside) statCss = 'background: #ECEDEF; color: #3A3B40;';
  if ((it as any).proposed) { statText = 'Proposed'; statCss = 'background: ' + tint + '; color: ' + accent + ';'; }
  o.stat = statText;
  o.statStyle = statText ? 'flex: 0 0 auto; padding: 1px 7px; border-radius: 999px; font-family: Inter, sans-serif; font-weight: 400; ' + statCss : 'display: none;';
  o.io = (G.step[it.id] ? 'step ' + G.step[it.id] + ' · ' : '') + (ins.length ? 'in ' + ins.map((i) => '#' + i).join(' ') + ' → ' : '') + 'out ' + def.out;
  o.foot = 'position: absolute; left: 0; right: 0; bottom: 0; height: 28px; box-sizing: border-box; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 0 10px; border-top: 1px solid #EEEFF2; background: #FAFAFB; ' + MONO + ' font-size: 11.5px; color: #6B6C73;';

  const fTop = 46, bottom = 34;
  let fh = def.field ? def.fh || it.h - fTop - bottom : 0;
  if (def.field && !def.fh && res && (failed || def.t === 'code')) fh = Math.round(fh * 0.5);
  if (def.field) {
    const empty = !it.text;
    const fcss = (def.mono ? MONO + ' font-size: 12.5px; line-height: 1.5;' : 'font-size: 14px; line-height: 1.4;') + ' color: ' + (dark ? '#F3F4F6' : '#111114') + '; white-space: pre-wrap; overflow-wrap: anywhere;';
    o.textBox = 'position: absolute; left: ' + (dark ? 22 : 12) + 'px; right: ' + (dark ? 22 : 12) + 'px; top: ' + (dark ? 54 : fTop) + 'px; height: ' + fh + 'px; overflow: auto;';
    o.text = editing ? it.text || '' : empty ? tr(def.field) : dark ? '$ ' + it.text : it.text;
    o.textStyle = fcss + (empty ? ' color: ' + (dark ? '#A4A5AB' : '#74757C') + ';' : '');
    o.taStyle = fcss + ' width: 100%; height: 100%;';
    o.placeholder = tr(def.field);
    o.ariaText = tr(def.label) + ' input';
    o.showText = !editing; o.editText = editing;
  }

  const pvTop = def.field ? fTop + fh + 8 : fTop + 2;
  const base = 'position: absolute; left: 12px; right: 12px; top: ' + pvTop + 'px; bottom: ' + bottom + 'px; box-sizing: border-box; border-radius: 8px; overflow: hidden; display: flex; flex-direction: column; ';
  const bar = (w: string, extra?: string) => ({ style: 'display: block; flex: 0 0 auto; height: 7px; border-radius: 4px; background: #E3E4E8; width: ' + w + ';' + (extra || '') });
  const msg = (text: string, busy?: boolean) => {
    o.pvShow = true;
    o.pv = base + 'align-items: center; justify-content: center; text-align: center; padding: 0 8px; border: 1px dashed #D7D8DD; ' + (busy ? 'background: linear-gradient(90deg, #F3F4F6 0px, #E3E4E8 100px, #F3F4F6 200px); background-size: 400px 100%; animation: wb-shimmer 1.1s linear infinite;' : 'background: #F6F6F8;');
    o.pvHead = true; o.pvHeadText = text; o.pvHeadStyle = 'font-size: 12.5px; color: #6B6C73;';
  };
  const pending = st === 'queued' ? 'Queued' : st === 'running' ? 'Running' : def.cat === 'render' ? 'Renders when its inputs arrive' : 'Not run yet';
  const done = st === 'done', t = def.t;
  const cap = (text: string, color: string) => { o.pvCap = true; o.pvCapText = text; o.pvCapStyle = 'font-size: 12px; color: ' + color + ';'; };
  const pre = (text: string, color: string) => { o.pvPre = true; o.pvPreText = clipText(text, 900); o.pvPreStyle = MONO + ' flex: 1 1 auto; min-height: 0; overflow: hidden; font-size: 12px; line-height: 1.45; white-space: pre-wrap; overflow-wrap: anywhere; color: ' + color + ';'; };
  const simTag = res && res.sim ? ' · ' + tr('simulated') : '';
  const meta = (r: any) => (r && r.meta ? (typeof r.meta === 'string' ? r.meta : t === 'terminal' ? 'exit ' + r.meta.exit : t === 'http' ? r.meta.status + ' ' + r.meta.statusText : [r.meta.ratio, r.meta.seconds ? r.meta.seconds + ' s' : ''].filter(Boolean).join(' · ')) : '');

  if (failed && res && (res as any).error && t !== 'terminal') {
    o.pvShow = true;
    o.pv = base + 'align-items: flex-start; justify-content: center; padding: 6px 10px; border: 1px dashed #E9A8A0; background: #FEF3F2;';
    o.pvHead = true; o.pvHeadText = tr((res as any).error);
    o.pvHeadStyle = 'max-width: 100%; font-size: 12.5px; line-height: 1.35; color: #B42318; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;';
  } else if (def.pkg && done && res && res.view) renderView(self, it, o, res.view, base, pvTop, bottom, accent);
  else if (t === 'code') {
    if (done && res) { o.pvShow = true; o.pv = base + 'padding: 8px 10px; background: #F6F6F8;'; pre((res.text || tr('No value returned')) + (res.sim ? '\n' + (res.logs || []).join('\n') : ''), '#111114'); }
  } else if (t === 'ref') {
    o.pvShow = true; o.pv = base + 'align-items: center; justify-content: center; gap: 6px; background: #EEF3FB; color: #3A5C96;';
    o.pvIcon = true; o.pvIconD = IMG_ICON; cap('Reference image placeholder', '#33496F');
  } else if (t === 'palette') {
    const hexes = (it.text || '').match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g) || [];
    if (!hexes.length) msg('Add hex colors above');
    else { o.pvShow = true; o.pv = base + 'flex-direction: row; gap: 6px; align-items: stretch; border-radius: 0; overflow: visible;'; o.bars = hexes.slice(0, 8).map((h) => ({ style: 'display: block; flex: 1 1 0; border-radius: 8px; border: 1px solid rgba(0,0,0,0.14); background: ' + h + ';' })); }
  } else if (harness) {
    if (st === 'waiting' && hz && hz.asking) {
      // The agent asks before a tool it may only use with your OK.
      const gw = it.w - 24, g1 = Math.round((gw - 12) / 3), gy = it.h - bottom - 40;
      o.pvShow = true;
      o.pv = 'position: absolute; left: 12px; right: 12px; top: ' + (gy - 21) + 'px; height: 16px; overflow: hidden;';
      o.pvHead = true; o.pvHeadText = fmt('Asks to: {0}', clipText(hz.asking.title, 60));
      o.pvHeadStyle = 'font-size: 12px; line-height: 16px; color: #7A4100; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
      const btn = (label: string, n: number, d: 'allow_once' | 'allow_always' | 'deny', bg: string, fg: string) => ({ label, disabled: false, pick: () => self.answerAgent(it.id, d), style: 'position: absolute; left: ' + (12 + n * (g1 + 6)) + 'px; width: ' + g1 + 'px; top: ' + gy + 'px; height: 32px; padding: 0; font-size: 13px; background: ' + bg + '; color: ' + fg + ';' });
      o.acts = [btn('Allow once', 0, 'allow_once', accent, '#FFFFFF'), btn('Always', 1, 'allow_always', '#F3F4F6', '#111114'), btn('Deny', 2, 'deny', '#FDE7E4', '#B42318')];
    } else if (!done) msg(st === 'running' && hz && hz.last ? clipText(tr(hz.last), 70) : pending, st === 'running');
    else {
      const answer = String((res && res.text) || '').replace(/^#+\s*/, '').split('\n').find((l) => l.trim()) || '';
      o.pvShow = true; o.pv = base + 'justify-content: center; gap: 6px; padding: 8px 10px; background: #F6F6F8;';
      o.pvHead = true;
      o.pvHeadText = res && res.sim ? (ins.length ? fmt('Simulated result from {0}', ins.map((i) => '#' + i).join(', ')) : tr('Simulated result')) : clipText(answer, 80) || tr('Done');
      o.pvHeadStyle = 'font-size: 12px; font-weight: 400; color: #3A3B40; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
      o.bars = [bar('92%'), bar('64%')];
    }
  } else if (t === 'imagegen') {
    if (!done) msg(pending, st === 'running');
    else if (res && res.value) { o.pvShow = true; o.pv = base + "background: #EFEAFB url('" + fileUrl(String(res.value)) + "') center / cover no-repeat;"; }
    else { o.pvShow = true; o.pv = base + 'align-items: center; justify-content: center; gap: 6px; background: #EFEAFB; color: #5B3FB8;'; o.pvIcon = true; o.pvIconD = IMG_ICON; cap(meta(res) ? fmt('Simulated image · {0}', meta(res)) : 'Generated image placeholder', '#4A3296'); }
  } else if (t === 'videogen') {
    if (!done) msg(pending, st === 'running');
    else { o.pvShow = true; o.pv = base + 'align-items: center; justify-content: center; gap: 6px; background: #24252B; color: #FFFFFF;'; o.pvIcon = true; o.pvIconD = PLAY_ICON; cap(meta(res) ? fmt(res && res.sim ? 'Simulated video · {0}' : 'Video · {0}', meta(res)) : 'Generated video placeholder', '#E3E4E8'); }
  } else if (t === 'terminal') {
    o.pvShow = true;
    o.pv = 'position: absolute; left: 10px; right: 10px; top: 46px; bottom: ' + bottom + 'px; box-sizing: border-box; border-radius: 8px; background: #1E1F24; display: flex; flex-direction: column; justify-content: flex-end; padding: 8px 12px;';
    const line = failed && res ? tr((res as any).error) : done ? (meta(res) || 'exit 0') + simTag : st === 'running' ? 'running' : st === 'queued' ? 'queued' : '';
    if (done && res && res.text) { o.pvPre = true; o.pvPreText = clipText(res.text, 400); o.pvPreStyle = MONO + ' flex: 0 1 auto; min-height: 0; overflow: hidden; font-size: 12px; line-height: 1.45; white-space: pre-wrap; overflow-wrap: anywhere; color: #C9CBD2;'; }
    o.pvCap = !!line; o.pvCapText = line; o.pvCapStyle = MONO + ' flex: 0 0 auto; font-size: 12px; color: ' + (failed ? '#FFB4A8' : done ? '#7EE2B8' : '#C9CBD2') + ';';
  } else if (t === 'http') {
    if (!done) msg(pending, st === 'running');
    else { o.pvShow = true; o.pv = base + 'justify-content: center; padding: 0 10px; background: #F6F6F8;'; o.pvHead = true; o.pvHeadText = (meta(res) || '200 OK') + simTag; o.pvHeadStyle = MONO + ' font-size: 12px; color: #1F6B3A; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;'; }
  } else if (def.cat === 'render' || def.pkg) {
    if (done && res && res.view) renderView(self, it, o, res.view, base, pvTop, bottom, accent);
    else msg(done ? 'Run it again to see the result' : pending, st === 'running');
  } else if (t === 'gate') {
    if (st === 'waiting') {
      const gw = it.w - 24, g1 = Math.round(gw * 0.56), gy = Math.min(90, it.h - bottom - 40);
      o.pvShow = true;
      o.pv = 'position: absolute; left: 12px; right: 12px; top: ' + (gy - 19) + 'px; height: 16px; overflow: hidden;';
      o.pvHead = true; o.pvHeadText = 'Waiting for you';
      o.pvHeadStyle = 'font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.04em; color: #7A4100; white-space: nowrap;';
      o.acts = [
        { label: 'Approve', disabled: false, pick: () => self.approve(it.id), style: 'position: absolute; left: 12px; width: ' + g1 + 'px; top: ' + gy + 'px; height: 36px; padding: 0; background: ' + accent + '; color: #FFFFFF;' },
        { label: 'Send back', disabled: false, pick: () => self.sendBack(it.id), style: 'position: absolute; left: ' + (18 + g1) + 'px; width: ' + (gw - g1 - 6) + 'px; top: ' + gy + 'px; height: 36px; padding: 0; background: #F3F4F6; color: #111114;' },
      ];
    } else {
      o.acts = [{ label: done ? 'Approved' : 'Waits for the flow', disabled: true, pick: () => undefined, style: 'position: absolute; left: 12px; right: 12px; top: 76px; height: 44px; cursor: default; ' + (done ? 'background: #DDF3E4; color: #1F6B3A;' : 'background: #F3F4F6; color: #6B6C73;') }];
    }
  }
}

function renderItem(self: Board, it: BoardItem, byId: Record<string, BoardItem>, accent: string, cursor: string, G: FlowGraph) {
  const s = self.state, on = !!self._selSet[it.id], editing = s.editing === it.id;
  const curs = (it as any).locked && s.tool === 'select' ? 'default' : cursor;
  const o: any = {
    layers: [], showText: false, editText: false, showLabel: false, editLabel: false,
    isNode: false, stk: [], bars: [], blocks: [], acts: [], canRun: false, canOpen: false, helper: false, showStk: true, hasChips: false, chips: [], pvPre: false, pvShow: false, pvChrome: false, pvIcon: false, pvHead: false, pvCap: false, hasIn: false,
    isSticky: it.kind === 'sticky', text: (it as any).text || '', label: (it as any).label || '',
    wrap: 'soft', placeholder: '', ariaText: 'Text', textBox: '', textStyle: '', taStyle: '', labelStyle: '',
    down: (e: any) => self.itemDown(it, e), dbl: (e: any) => self.itemDbl(it, e), menu: (e: any) => e.preventDefault(),
    onText: (e: any) => self.update(it.id, { text: e.target.value }), onLabel: (e: any) => self.update(it.id, { label: e.target.value }),
  };
  const pos = (b: { x: number; y: number; w: number; h: number }) => 'position: absolute; left: ' + b.x + 'px; top: ' + b.y + 'px; width: ' + b.w + 'px; height: ' + b.h + 'px; box-sizing: border-box; cursor: ' + curs + ';';
  const k = it.kind;
  if (k === 'text') {
    const tb = bounds(it, byId), tc = textCss(it as any, accent);
    o.style = pos(tb); o.textBox = 'position: absolute; inset: 0;'; o.textStyle = tc + ' white-space: pre;'; o.taStyle = tc + ' width: 100%; height: 100%; white-space: pre;';
    o.wrap = 'off'; o.placeholder = tr('Type here'); o.ariaText = 'Text'; o.showText = !editing; o.editText = editing;
  } else if (k === 'sticky') {
    const sc = textCss(it as any, accent);
    o.style = pos(it) + ' background: ' + it.color + '; border-radius: 3px; box-shadow: 0 1px 2px rgba(0,0,0,0.06), 0 8px 18px rgba(0,0,0,0.07); transform: rotate(' + (it.rot || 0) + 'deg);';
    o.textBox = 'position: absolute; left: 18px; right: 18px; top: 16px; bottom: 34px; overflow: hidden;';
    o.textStyle = sc + ' white-space: pre-wrap; overflow-wrap: anywhere;'; o.taStyle = sc + ' width: 100%; height: 100%; white-space: pre-wrap;';
    o.placeholder = tr('Type something'); o.ariaText = 'Sticky note text'; o.showText = !editing; o.editText = editing;
  } else if (k === 'shape') {
    o.style = pos(it); o.layers = shapeLayers(it).map((l) => L(l));
    if (shapeHasText(it.shape)) {
      const stl = (TEXT_STYLES as any)[it.style || 'body'] || TEXT_STYLES.body;
      const cpl = Math.max(4, (it.w - 28) / (stl.fs * 0.56));
      let lines = 0;
      (it.text || ' ').split('\n').forEach((l) => { lines += Math.max(1, Math.ceil(l.length / cpl)); });
      const th = Math.max(stl.fs * 1.4, Math.min(it.h - 20, Math.ceil(lines * stl.fs * 1.35) + 4));
      const dark = it.fill === '#2A2B30';
      o.textBox = 'position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; padding: 10px 14px; box-sizing: border-box; overflow: hidden;' + (editing ? '' : ' pointer-events: none;');
      o.textStyle = textCss(it as any, accent) + ' width: 100%; white-space: pre-wrap; overflow-wrap: anywhere;' + (dark ? ' color: #FFFFFF;' : '');
      o.taStyle = o.textStyle + ' height: ' + th + 'px;';
      o.placeholder = tr('Add text'); o.ariaText = 'Shape text'; o.showText = !editing && !!it.text; o.editText = editing;
    }
    if ((it as any).proposed) o.style += ' opacity: 0.86; outline: 1.5px dashed ' + accent + '; outline-offset: 3px;';
  } else if (k === 'frame') {
    o.style = pos(it) + ' background: ' + it.fill + '; border: 1.5px solid #D7D8DD; border-radius: 16px;';
    o.labelStyle = 'position: absolute; left: 4px; top: -28px; height: 22px; font-size: 14px; color: #6B6C73; white-space: nowrap; width: ' + Math.max(6, (it.label || '').length + 3) + 'ch;';
    o.showLabel = !editing; o.editLabel = editing;
  } else if (k === 'sticker') {
    const def = STICKER_BY_ID[it.sticker] || STICKERS[0];
    o.style = pos(it) + ' filter: drop-shadow(0 1px 1.5px rgba(0,0,0,0.25));' + (def.flip ? ' transform: scaleY(-1);' : '');
    o.layers = def.layers;
  } else if (k === 'node') {
    o.style = pos(it);
    renderNode(self, it, o, byId, accent, G, editing);
  } else if (k === 'arrow') {
    const pts = arrowPts(it, byId), bx = ptsBox(pts), pad = 24;
    const ox = bx.x - pad, oy = bx.y - pad, Wd = bx.w + pad * 2, Hd = bx.h + pad * 2, vb = '0 0 ' + Wd + ' ' + Hd;
    const loc = pts.map((p) => [p[0] - ox, p[1] - oy] as [number, number]);
    const d = roundedPath(loc, 14), wgt = it.weight || 2;
    let col = it.color || '#111111';
    o.style = 'position: absolute; left: ' + ox + 'px; top: ' + oy + 'px; width: ' + Wd + 'px; height: ' + Hd + 'px; pointer-events: none;';
    if (on) o.layers.push(L({ vb, d, s: DOT, w: wgt + 8, op: 0.85 }));
    o.layers.push(L({ vb, d, s: 'transparent', w: wgt + 16, pe: 'pointer-events: stroke; cursor: ' + curs + ';' }));
    const src = it.from ? byId[it.from.id] : null, dst = it.to ? byId[it.to.id] : null;
    const live = !!dst && dst.kind === 'node' && dst.status === 'running';
    if (live || (it as any).proposed) col = accent;
    o.layers.push(L({ vb, d, s: col, w: wgt, dash: live ? '6 6' : it.dash || (it as any).proposed ? wgt * 3 + ' ' + wgt * 3 : 'none', pe: live ? 'pointer-events: none; animation: wb-dash 0.5s linear infinite;' : 'pointer-events: none;' }));
    if (src && dst && (src.kind === 'node' || dst.kind === 'node')) {
      const mid = polyMid(loc);
      o.showLabel = true; o.label = outType(src) || 'context';
      o.labelStyle = 'position: absolute; left: ' + mid[0] + 'px; top: ' + mid[1] + 'px; transform: translate(-50%, -50%); padding: 1px 7px; border-radius: 999px; background: #FFFFFF; border: 1px solid ' + (live ? accent : '#D2D3D9') + '; ' + MONO + ' font-size: 11px; color: ' + (live ? accent : '#6B6C73') + '; white-space: nowrap; pointer-events: none;';
    }
    if (it.head !== false && loc.length > 1) {
      const a = loc[loc.length - 2], b = loc[loc.length - 1];
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), hl = 9 + wgt * 1.5;
      const hd = 'M' + (b[0] - hl * Math.cos(ang - 0.5)).toFixed(1) + ' ' + (b[1] - hl * Math.sin(ang - 0.5)).toFixed(1) + 'L' + b[0].toFixed(1) + ' ' + b[1].toFixed(1) + 'L' + (b[0] - hl * Math.cos(ang + 0.5)).toFixed(1) + ' ' + (b[1] - hl * Math.sin(ang + 0.5)).toFixed(1);
      o.layers.push(L({ vb, d: hd, s: col, w: wgt }));
    }
    o.down = (e: any) => self.itemDown(it, e);
  } else if (k === 'pen') {
    const abs = it.pts.map((p) => [it.x + p[0], it.y + p[1]] as [number, number]);
    const pb = ptsBox(abs), pw = it.weight || 5, pp = pw + 12;
    const pox = pb.x - pp, poy = pb.y - pp, PW = pb.w + pp * 2, PH = pb.h + pp * 2, pvb = '0 0 ' + PW + ' ' + PH;
    const pd = penD(abs.map((p) => [p[0] - pox, p[1] - poy] as [number, number]));
    o.style = 'position: absolute; left: ' + pox + 'px; top: ' + poy + 'px; width: ' + PW + 'px; height: ' + PH + 'px; pointer-events: none;';
    if (on) o.layers.push(L({ vb: pvb, d: pd, s: DOT, w: pw + 8, op: 0.85 }));
    o.layers.push(L({ vb: pvb, d: pd, s: 'transparent', w: pw + 14, pe: 'pointer-events: stroke; cursor: ' + curs + ';' }));
    o.layers.push(L({ vb: pvb, d: pd, s: it.color || '#111111', w: pw }));
  }
  return o;
}

function renderViewer(self: Board, byId: Record<string, BoardItem>, accent: string) {
  const s = self.state, v = s.viewer, it = (v ? byId[v.id] : null) as NodeItem | null, res = it ? s.out[it.id] : null, vw = res && (res.view as any);
  const nop = () => undefined;
  const off: any = { open: false, blocks: [], cols: [], rows: [], thumbs: [], acts: [], sums: [], grid: '', headRow: '', corner: '', paper: '', pos: '', prev: nop, next: nop, prevLabel: '', nextLabel: '', noPrev: true, noNext: true, heading: { text: '' }, src: { text: '' } };
  if (!v || !it || !vw) return off;
  const def = NODE_BY[it.ntype] || NODE_DEFS[0], TH = { bg: '#FFFFFF', ink: '#111114', accent, center: false };
  const name = slugOf(vw.title) || it.id, kind = vw.kind;
  const act = (label: string, run: () => void, primary?: boolean) => ({ label, run, style: 'height: 40px; padding: 0 14px; ' + (primary ? 'background: ' + accent + '; color: #FFFFFF;' : 'background: #F3F4F6; color: #111114;') });
  const set = (patch: Record<string, unknown>) => self.setState({ viewer: { ...s.viewer, ...patch } });
  const paper = 'box-sizing: border-box; width: 100%; margin: 0 auto; display: flex; flex-direction: column; background: #FFFFFF; border: 1px solid #E3E4E8;';
  const o = Object.assign(off, {
    open: true, title: tr(def.label) + ' · #' + it.id, heading: { _v: 1, text: vw.title || tr(def.label) }, close: () => self.setState({ viewer: null }), closeLabel: 'Close full view',
    sim: false, simLabel: 'Built from a simulated answer', note: '', isBlocks: false, isSheet: false, isSlides: false, showSrc: false, hasSums: false,
    stage: 'flex: 1 1 auto; min-height: 0; overflow: auto; box-sizing: border-box; padding: 18px; border-radius: 12px; background: #F0F1F4;',
  });
  const G = flowGraph(s.items), seen: Record<string, 1> = {};
  let q = (G.ins[it.id] || []).slice();
  while (q.length) { const u = q.shift()!; if (seen[u]) continue; seen[u] = 1; if (s.out[u] && s.out[u].sim) o.sim = true; q = q.concat(G.ins[u] || []); }
  if (kind === 'doc') {
    o.isBlocks = true; o.blocks = drawBlocks(vw.blocks, 1, TH, 600, 0);
    o.paper = paper + ' max-width: 760px; gap: 11px; padding: 40px 44px; border-radius: 6px;';
    o.note = fmt('{0} words · about {1} min to read', vw.words, Math.max(1, Math.round(vw.words / 220)));
    o.acts = [act('Download .md', () => self.saveText(name + '.md', 'text/markdown', vw.source), true), act('Download .html', () => self.saveText(name + '.html', 'text/html', blocksToHtml(vw.blocks, vw.title))), act('Export .docx', () => self.exportFile(it.id, 'docx'))];
  } else if (kind === 'sheet') {
    o.isSheet = true;
    const rows = vw.rows.map((r: string[], i: number) => ({ r, i })), col = v.col, dir = v.dir;
    if (col >= 0 && col < vw.head.length) {
      rows.sort((a: any, b: any) => {
        const x = a.r[col], y = b.r[col], nx = numOf(x), ny = numOf(y);
        let c: number;
        if (x === '' || y === '') c = x === y ? 0 : x === '' ? 1 : -1;
        else if (nx !== null && ny !== null) c = (nx - ny) * dir;
        else c = (String(x).toLowerCase() < String(y).toLowerCase() ? -1 : String(x).toLowerCase() > String(y).toLowerCase() ? 1 : 0) * dir;
        return c || a.i - b.i;
      });
    }
    const numCol = vw.head.map((_: string, c: number) => vw.rows.some((r: string[]) => r[c] !== '') && vw.rows.every((r: string[]) => r[c] === '' || numOf(r[c]) !== null));
    const cw = 'flex: 1 0 120px; min-width: 0; box-sizing: border-box;';
    o.grid = 'min-width: ' + (vw.head.length * 120 + 44) + 'px; background: #FFFFFF; border: 1px solid #D2D3D9; border-radius: 8px; overflow: hidden;';
    o.headRow = 'display: flex; background: #EAF4EE; position: sticky; top: 0;';
    o.corner = 'flex: 0 0 44px; box-sizing: border-box; border-right: 1px solid #D2D3D9;';
    o.cols = vw.head.map((h: string, c: number) => {
      const on = col === c;
      return { _v: 1, label: h, mark: on ? (dir > 0 ? '↑' : '↓') : '', sort: on ? (dir > 0 ? 'ascending' : 'descending') : 'none', hint: fmt('Sort by {0}', h),
        pick: () => set(on ? (dir > 0 ? { dir: -1 } : { col: -1, dir: 1 }) : { col: c, dir: 1 }),
        style: cw + ' border-right: 1px solid #D2D3D9;',
        btn: 'width: 100%; height: 36px; box-sizing: border-box; display: flex; align-items: center; gap: 6px; padding: 0 10px; border-radius: 0; background: transparent; font-size: 13px; color: #14532D; text-align: left;' + (numCol[c] ? ' justify-content: flex-end;' : '') };
    });
    o.rows = rows.map((x: any) => ({ _v: 1, style: 'display: flex; border-top: 1px solid #E3E4E8;', num: String(x.i + 1), numStyle: 'flex: 0 0 44px; box-sizing: border-box; padding: 7px 8px; border-right: 1px solid #E3E4E8; background: #F6F6F8; ' + MONO + ' font-size: 11.5px; color: #6B6C73; text-align: right;',
      cells: x.r.map((c: string, k: number) => ({ text: c, style: cw + ' padding: 7px 10px; border-right: 1px solid #EEEFF2; font-size: 13.5px; line-height: 1.4; color: #111114; overflow-wrap: anywhere;' + (numCol[k] ? ' text-align: right; font-variant-numeric: tabular-nums;' : '') })) }));
    o.note = fmt('{0} rows · {1} columns', vw.total, vw.head.length) + (vw.total > vw.rows.length ? ' · ' + fmt('showing the first {0}', vw.rows.length) : '') + ' · ' + tr('Select a column name to sort');
    o.hasSums = vw.sums.length > 0;
    o.sums = vw.sums.map((x: any) => ({ _v: 1, text: fmt('Sum of {0}: {1}', x.label, x.value) }));
    o.acts = [act('Download .csv', () => self.saveText(name + '.csv', 'text/csv', vw.source), true), act('Copy as CSV', () => self.copyText(vw.source, 'Table copied')), act('Export .xlsx', () => self.exportFile(it.id, 'xlsx'))];
  } else if (kind === 'slides') {
    const n = Math.max(0, Math.min(vw.slides.length - 1, s.slideAt[it.id] || 0)), sl = vw.slides[n], solo = !sl.items.length;
    o.isBlocks = true; o.isSlides = true;
    o.blocks = drawBlocks([{ k: 'h1', text: sl.title || fmt('Slide {0}', n + 1) }, ...sl.items], 1.15, { ...TH, center: solo }, 40, 0);
    o.paper = paper + ' max-width: 800px; aspect-ratio: 16 / 9; gap: 12px; padding: 44px 52px; border-radius: 10px; overflow: hidden;' + (solo ? ' justify-content: center;' : '');
    o.note = fmt('Slide {0} of {1}', n + 1, vw.slides.length) + ' · ' + tr('Arrow keys change the slide');
    o.pos = n + 1 + ' / ' + vw.slides.length;
    o.noPrev = n <= 0; o.noNext = n >= vw.slides.length - 1;
    o.prev = () => self.slideGo(it.id, n - 1); o.next = () => self.slideGo(it.id, n + 1);
    o.prevLabel = 'Previous slide'; o.nextLabel = 'Next slide';
    o.thumbs = vw.slides.map((x: any, j: number) => ({ _v: 1, label: String(j + 1), name: fmt('Slide {0}: {1}', j + 1, x.title || ''), current: j === n ? 'true' : 'false', pick: () => self.slideGo(it.id, j),
      style: 'flex: 0 0 auto; width: 44px; height: 32px; border-radius: 7px; font-size: 12px; ' + (j === n ? 'background: ' + accent + '; color: #FFFFFF;' : 'background: #FFFFFF; border: 1px solid #D2D3D9; color: #111114;') }));
    o.acts = [act('Download outline (.md)', () => self.saveText(name + '.md', 'text/markdown', vw.source), true), act('Export .pptx', () => self.exportFile(it.id, 'pptx'))];
  } else if (kind === 'page') {
    const phone = it.device === 'phone', th = vw.theme || {}, pth = { bg: okHex(th.bg) || '#FFFFFF', ink: okHex(th.ink) || '#111114', accent: okHex(th.accent) || accent, center: !!th.center };
    o.isBlocks = !v.src; o.showSrc = !!v.src;
    o.blocks = v.src ? [] : drawBlocks(vw.blocks, 1, pth, 600, 0);
    o.paper = paper + ' gap: 14px; background: ' + pth.bg + '; ' + (phone ? 'max-width: 390px; min-height: 640px; padding: 28px 20px; border-radius: 28px;' : 'max-width: 860px; min-height: 420px; padding: 36px 44px; border-radius: 10px;');
    o.note = tr(vw.fromHtml ? 'A safe preview of the page: its text, order and colours. Scripts and style sheets do not run here.' : 'A page made from the text that flows in.');
    o.acts = [act('Download .html', () => self.saveText(name + '.html', 'text/html', vw.source), true), act(v.src ? 'Show the page' : 'Show the source', () => set({ src: !v.src })), act(phone ? 'Desktop width' : 'Phone width', () => self.update(it.id, { device: phone ? 'desktop' : 'phone' })), act('Copy the source', () => self.copyText(vw.source, 'Source copied'))];
  } else {
    o.showSrc = true; o.note = fmt('{0} characters', vw.source.length);
    o.acts = [act('Download .md', () => self.saveText(name + '.md', 'text/markdown', vw.source), true), act('Copy the text', () => self.copyText(vw.source, 'Text copied'))];
  }
  o.src = { _v: 1, text: o.showSrc ? clipText(vw.source, 60000) : '' };
  return o;
}

export function renderVals(self: Board): any {
  const s = self.state, p = self.props;
  const accent = p.accent ?? '#2457C5';
  const tint = 'color-mix(in srgb, ' + accent + ' 12%, #FFFFFF)';
  const activeCss = 'background: ' + tint + '; color: ' + accent + ';';
  const tool = s.tool, z = s.zoom, byId = index(s.items as BoardItem[]);
  const G = flowGraph(s.items);
  const selList = self.selIds(), isMulti = selList.length > 1;
  self._selSet = {};
  selList.forEach((id) => { self._selSet[id] = 1; });
  const cursor = tool === 'select' ? 'move' : tool === 'hand' ? (s.panning ? 'grabbing' : 'grab') : 'crosshair';
  const frames = s.items.filter((it: BoardItem) => it.kind === 'frame'), rest = s.items.filter((it: BoardItem) => it.kind !== 'frame');
  const items = frames.concat(rest).map((it: BoardItem) => renderItem(self, it, byId, accent, cursor, G));
  const selItem = isMulti ? null : s.selected ? byId[s.selected] : null;
  const d = self.drag, busy = !!d && (d.mode !== 'move' || d.moved);

  let hasSelBox = false, selBoxStyle = '', handles: any[] = [];
  if (selItem && selItem.kind !== 'arrow' && selItem.kind !== 'pen') {
    const sk = selItem.kind, b = bounds(selItem, byId), bw = sk === 'sticky' || sk === 'text' ? 1.5 : 2, ps = sk === 'text' ? 4 : 0;
    hasSelBox = true;
    selBoxStyle = 'position: absolute; left: ' + (b.x - ps) + 'px; top: ' + (b.y - ps) + 'px; width: ' + (b.w + ps * 2) + 'px; height: ' + (b.h + ps * 2) + 'px; box-sizing: border-box; border: ' + bw / z + 'px solid ' + accent + '; pointer-events: none;' + (sk === 'node' ? ' border-radius: 16px;' : '') + (sk === 'sticky' ? ' transform: rotate(' + ((selItem as any).rot || 0) + 'deg);' : '');
    if ((sk === 'frame' || sk === 'shape' || sk === 'sticker' || sk === 'node') && !(selItem as any).locked && s.editing !== selItem.id && s.role !== 'viewer') {
      const hs = 11 / z;
      handles = ['tl', 'tr', 'bl', 'br'].map((c) => ({
        down: (e: any) => self.handleDown(selItem.id, c, e),
        style: 'position: absolute; left: ' + (c[1] === 'l' ? 0 : 100) + '%; top: ' + (c[0] === 't' ? 0 : 100) + '%; width: ' + hs + 'px; height: ' + hs + 'px; transform: translate(-50%, -50%); box-sizing: border-box; background: #FFFFFF; border: ' + 2 / z + 'px solid ' + accent + '; pointer-events: auto; cursor: ' + (c === 'tl' || c === 'br' ? 'nwse-resize' : 'nesw-resize') + ';',
      }));
    }
  }
  let dotTargets: BoardItem[] = [];
  if (tool === 'draw' && s.drawMode === 'arrow') dotTargets = s.items.filter((o: BoardItem) => ['sticky', 'shape', 'frame', 'text', 'sticker'].includes(o.kind));
  else if (tool === 'select' && selItem && (selItem.kind === 'sticky' || selItem.kind === 'shape') && s.editing !== selItem.id && !busy) dotTargets = [selItem];
  const dots: any[] = [];
  for (const o of dotTargets) {
    const ob = bounds(o, byId);
    for (const side of ['top', 'right', 'bottom', 'left'] as const) {
      const pt = sidePoint(ob, side), sz = 14 / z;
      void outVec(side);
      dots.push({ down: (e: any) => self.dotDown(o.id, side, e), style: 'position: absolute; left: ' + pt.x + 'px; top: ' + pt.y + 'px; width: ' + sz + 'px; height: ' + sz + 'px; transform: translate(-50%, -50%); border-radius: 50%; background: ' + DOT + '; box-shadow: 0 0 0 ' + 2 / z + 'px #FFFFFF; cursor: crosshair; pointer-events: auto;' });
    }
  }
  const mBoxes: any[] = [];
  let mc: any = { show: false };
  if (isMulti) {
    let ux0 = Infinity, uy0 = Infinity, ux1 = -Infinity, uy1 = -Infinity;
    for (const id of selList) {
      const o = byId[id];
      if (!o) continue;
      const ob = bounds(o, byId);
      ux0 = Math.min(ux0, ob.x); uy0 = Math.min(uy0, ob.y); ux1 = Math.max(ux1, ob.x + ob.w); uy1 = Math.max(uy1, ob.y + ob.h);
      if (o.kind !== 'arrow' && o.kind !== 'pen') mBoxes.push({ style: 'position: absolute; left: ' + ob.x + 'px; top: ' + ob.y + 'px; width: ' + ob.w + 'px; height: ' + ob.h + 'px; box-sizing: border-box; border: ' + 1.5 / z + 'px solid ' + accent + '; border-radius: ' + (o.kind === 'node' ? 15 : 2) + 'px; pointer-events: none;' });
    }
    const pad = 10 / z;
    mBoxes.push({ style: 'position: absolute; left: ' + (ux0 - pad) + 'px; top: ' + (uy0 - pad) + 'px; width: ' + (ux1 - ux0 + pad * 2) + 'px; height: ' + (uy1 - uy0 + pad * 2) + 'px; box-sizing: border-box; border: ' + 1.5 / z + 'px dashed ' + accent + '; border-radius: ' + 8 / z + 'px; pointer-events: none;' });
    if (!busy) {
      const bw0 = self.boardEl ? self.boardEl.clientWidth : 1440;
      const mcx = Math.max(220, Math.min(bw0 - 220, s.pan.x + ((ux0 + ux1) / 2) * z));
      let mty = s.pan.y + uy0 * z - 78;
      if (mty < 72) mty = s.pan.y + uy1 * z + 24;
      mc = { show: true, count: fmt('{0} selected', selList.length), style: 'position: absolute; left: ' + mcx + 'px; top: ' + mty + 'px; transform: translateX(-50%); display: flex; align-items: center; gap: 2px; padding: 5px; z-index: 4; white-space: nowrap;',
        groupLabel: 'Group', groupTip: 'Group (Ctrl+G)', toggleGroup: () => self.flash('Grouping comes in the next update'), tidy: () => self.flash('Tidy up comes in the next update'),
        saveLabel: 'Save to library', saveTip: 'Reuse this selection from the node panel', saveLib: () => self.flash('The library comes in the next update'),
        duplicate: () => self.duplicateSelected(), remove: () => self.removeSelected() };
    }
  }
  const hasProposal = !!s.proposal && s.items.some((o: any) => o.proposed);
  const btn = 'width: 38px; height: 38px; border-radius: 11px;';
  const dockOn = 'background: #FFFFFF; color: ' + accent + '; box-shadow: 0 1px 3px rgba(20,20,30,0.16), 0 0 0 1px rgba(20,20,30,0.04);';
  const softBtn = 'display: flex; align-items: center; gap: 6px; height: 38px; padding: 0 12px 0 10px; border: 0; border-radius: 11px; font: inherit; font-size: 14px; font-weight: 400; cursor: pointer; ';
  const nextSticky = STICKY_NEXT(s.items);
  const mk = (id: string, label: string, keyHint: string) => {
    const on = tool === id && !s.panel;
    return { label, stk: id === 'sticky' ? stickyStk(nextSticky) : DOCK[id], tip: tr(label) + ' (' + keyHint + ')', pressed: on ? 'true' : 'false', pick: () => self.pickTool(id), style: btn + (on ? ' ' + dockOn : '') };
  };
  const drawOn = tool === 'draw', shapeOn = tool === 'shape' || s.panel === 'shape', stickerOn = tool === 'sticker' || s.panel === 'sticker';
  const q = (s.stickerQuery || '').trim().toLowerCase();
  const stickerOpts = STICKERS.filter((st) => !q || st.name.toLowerCase().includes(q) || st.id.includes(q)).map((st) => ({ name: st.name, layers: st.layers, flip: st.flip, inner: 'display: block; position: relative; width: 36px; height: 36px; filter: drop-shadow(0 1px 1.5px rgba(0,0,0,0.22));' + (st.flip ? ' transform: scaleY(-1);' : ''), pick: () => self.setState({ stickerId: st.id, tool: 'sticker', panel: null }), checked: s.stickerId === st.id ? 'true' : 'false', style: s.stickerId === st.id ? activeCss : '' }));
  const curSticker = STICKER_BY_ID[s.stickerId] || STICKERS[0];
  const chat = s.chat, gpx = GRID * z, dotR = Math.max(0.9, Math.min(1.6, 1.3 * Math.sqrt(z)));
  const me = p.me, wsList = (s.workspaces || []) as any[];
  const i = { ...labels(), k66: me.name, k67: me.email || tr('Guest') };

  const out = {
    i, accent, links: { SignIn: '/signin', Workspace: '/' },
    follow: (e: any) => { e.preventDefault(); const h = e.currentTarget.getAttribute('href'); if (h === '/signin') p.signOut(); else p.goHome(); },
    acct: {
      embedded: true, homeLabel: 'All boards', goHome: (e: any) => { if (e && e.preventDefault) e.preventDefault(); p.goHome(); },
      signedIn: !me.guest, guest: me.guest,
      wsAria: 'Workspace', userAria: 'Account', langTip: 'Language', wsHeading: 'Workspaces', allBoards: 'All boards', membersLabel: 'Members and invites',
      guestLabel: 'Guest board', guestNote: 'You are working as a guest. Add an email to keep this board when you sign in elsewhere.',
      signInLabel: 'Sign in', signInStyle: 'width: auto; min-height: 38px; height: 38px; padding: 0 14px; border-radius: 11px; background: #111114; color: #FFFFFF; font-size: 14px;',
      shareLabel: 'Share', shareExpanded: 'false',
      openShare: () => self.copyText(window.location.href, 'Link to this board copied'),
      newBoardLabel: 'New empty board', newBoard: () => { self.setState({ acctMenu: null }); self.loadTemplate('Welcome'); },
      downloadLabel: 'Download board file', download: () => self.downloadFile(),
      saveLabel: s.role === 'viewer' ? 'View only' : s.saveState === 'off' ? 'Not saved' : s.saveState === 'saved' ? 'Saved' : 'Saving',
      saveStyle: 'display: flex; align-items: center; gap: 6px; padding: 0 10px 0 6px; font-size: 12.5px; white-space: nowrap; color: ' + (s.saveState === 'off' ? '#B42318' : '#6B6C73') + ';',
      saveDot: 'width: 7px; height: 7px; border-radius: 50%; background: ' + (s.saveState === 'off' ? '#B42318' : s.saveState === 'saved' ? '#2E8B57' : '#B4B5BB') + ';',
      wsOpen: s.acctMenu === 'ws', userOpen: s.acctMenu === 'user',
      wsExpanded: s.acctMenu === 'ws' ? 'true' : 'false', userExpanded: s.acctMenu === 'user' ? 'true' : 'false',
      toggleWs: () => self.setState({ acctMenu: s.acctMenu === 'ws' ? null : 'ws', menu: null }),
      toggleUser: () => self.setState({ acctMenu: s.acctMenu === 'user' ? null : 'user', menu: null }),
      flipLang: () => p.flipLang(), langShort: p.lang === 'zh' ? '中' : 'EN',
      wsName: s.wsName || s.title,
      wsChip: 'width: 26px; height: 26px; border-radius: 8px; display: flex; align-items: center; justify-content: center; background: ' + tint + '; color: ' + accent + ';' + CHIP_STK,
      wsList: wsList.map((w) => ({ name: w.personal ? tr('Personal') : w.name, on: w.id === self.wsId, checked: w.id === self.wsId ? 'true' : 'false', pick: () => p.goHome() })),
      langs: ([['en', 'English'], ['zh', '简体中文']] as const).map((l) => ({ name: l[1], on: p.lang === l[0], checked: p.lang === l[0] ? 'true' : 'false', pick: () => { p.setLang(l[0]); self.setState({ acctMenu: null }); } })),
    },
    welcome: s.welcome, welcomeTop: 'calc(34% + min(100px, 13vh) + 24px)',
    mBoxes, mc, kcShow: false, kcBox: '',
    hasMarquee: !!s.marquee || !!s.area,
    marqueeStyle: (() => {
      const b = s.marquee || s.area;
      if (!b) return '';
      return 'position: absolute; left: ' + b.x + 'px; top: ' + b.y + 'px; width: ' + b.w + 'px; height: ' + b.h + 'px; box-sizing: border-box; border: ' + 1.5 / z + 'px solid ' + AREA_COL + '; border-radius: ' + Math.min(24 / z, b.w / 2, b.h / 2) + 'px; background: color-mix(in srgb, ' + AREA_COL + ' 6%, transparent); pointer-events: none;';
    })(),
    ca: (() => {
      const run = s.chatRun;
      if (!run || s.welcome) return { show: false, rows: [], hasMore: false, busy: false, done: false };
      const done = run.calls.slice(0, run.n), from = Math.max(0, done.length - 4);
      return {
        show: true, title: run.mode === 'diagram' ? 'Board agent: diagram' : 'Board agent: workflow',
        busy: !run.done, done: run.done, stopLabel: 'Stop', stop: () => self.rejectProposal(), count: run.n + ' / ' + Math.max(run.n, run.calls.length), ask: { _v: 1, text: run.text },
        rows: done.slice(from).map((c: any) => ({ _v: 1, line: tr(c.line), tool: c.tool })), hasMore: from > 0, more: fmt('{0} earlier steps', from),
        waiting: run.n === 0, waitText: 'Thinking', foot: 'Our own agent, built on Pi.',
        spin: 'flex: 0 0 auto; width: 14px; height: 14px; box-sizing: border-box; border-radius: 50%; border: 2px solid ' + tint + '; border-top-color: ' + accent + '; animation: wb-spin 0.9s linear infinite;',
        tick: 'flex: 0 0 auto; width: 14px; height: 14px; border-radius: 50%; background: #1F6B3A;',
      };
    })(),
    cmode: (() => {
      const m = s.chatMode, next = m === 'auto' ? 'diagram' : m === 'diagram' ? 'flow' : 'auto';
      return { label: m === 'auto' ? 'Auto' : m === 'diagram' ? 'Diagram' : 'Workflow', pre: 'Draws as',
        tip: m === 'auto' ? 'Auto: shapes on a diagram board, workflow nodes on a workflow board. Select to change.' : m === 'diagram' ? 'Always draws shapes and arrows. Select to change.' : 'Always adds workflow nodes. Select to change.',
        cycle: () => self.setState({ chatMode: next }),
        style: 'height: 24px; padding: 0 9px; border-radius: 999px; font-size: 12px; background: ' + (m === 'auto' ? '#F3F4F6' : tint) + '; color: ' + (m === 'auto' ? '#3A3B40' : accent) + ';' };
    })(),
    pp: { show: hasProposal && !s.welcome && !(s.chatRun && !s.chatRun.done), note: s.proposal ? s.proposal.note : '', dot: 'flex: 0 0 auto; width: 8px; height: 8px; border-radius: 50%; background: ' + accent + ';', acceptStyle: 'background: ' + accent + '; color: #FFFFFF;', accept: () => self.acceptProposal(), reject: () => self.rejectProposal() },
    emptyHint: !s.welcome && s.items.length === 0 && tool === 'select' && !chat && !s.menu,
    undo: () => self.undo(), redo: () => self.redo(), undoDisabled: !s.canUndo, redoDisabled: !s.canRedo,
    undoStyle: btn + (s.canUndo ? '' : ' color: #B4B5BB; cursor: default;'), redoStyle: btn + (s.canRedo ? '' : ' color: #B4B5BB; cursor: default;'),
    mono: { wrap: 'display: none;' },
    vw: renderViewer(self, byId, accent),
    stopEv: (e: any) => e.stopPropagation(),
    starters: STARTERS.map((st) => ({ who: st.who, title: st.title, desc: st.desc, layers: ((AVATARS as any)[st.av] || []).map((l: any) => L(l)), pick: () => self.loadTemplate(st.key) })),
    running: s.running, runIdle: !s.running,
    runLabel: s.running ? tr('Stop') + '  ' + Math.min(s.runTotal, s.runDone + 1) + '/' + s.runTotal : 'Run flow',
    runToggle: () => { if (self.state.running) self.stopRun(); else self.runFlow(); },
    runStyle: 'display: flex; align-items: center; gap: 6px; height: 38px; padding: 0 14px 0 12px; border-radius: 11px; font-weight: 400; ' + (s.running ? 'background: #111114; color: #FFFFFF;' : 'background: ' + accent + '; color: #FFFFFF;'),
    hasGhost: false,
    bgMenu: s.bgMenu, bgExpanded: s.bgMenu ? 'true' : 'false', bgIsGrid: s.bg === 'grid', bgIsDots: s.bg === 'dots',
    toggleBgMenu: () => self.setState({ bgMenu: !s.bgMenu, zoomMenu: false }),
    bgOpts: (['grid', 'dots'] as const).map((k) => ({ label: k === 'grid' ? 'Grid' : 'Dots', checked: s.bg === k ? 'true' : 'false', pick: () => { self.setState({ bg: k }); self.queueSave(); }, style: 'flex: 1 1 0; height: 40px; border-radius: 10px; font-size: 14px;' + (s.bg === k ? ' ' + activeCss : ' background: #F3F4F6;') })),
    snapChecked: s.snap ? 'true' : 'false', toggleSnap: () => self.setState({ snap: !s.snap }),
    snapTrack: 'position: relative; flex: 0 0 auto; width: 36px; height: 22px; border-radius: 999px; transition: background-color 160ms ease; background: ' + (s.snap ? accent : '#C9CBD2') + ';',
    snapKnob: 'position: absolute; top: 2px; left: ' + (s.snap ? 16 : 2) + 'px; width: 18px; height: 18px; border-radius: 50%; background: #FFFFFF; box-shadow: 0 1px 2px rgba(0,0,0,0.25); transition: left 160ms cubic-bezier(0.2, 0.8, 0.2, 1);',
    mainStyle: 'position: relative; width: 100%; height: 100vh; min-height: 720px; overflow: hidden; user-select: none; touch-action: none; background-color: ' + (s.bg === 'dots' ? '#FCFCFD' : '#FFFFFF') + '; ' + (s.bg === 'dots'
      ? 'background-image: radial-gradient(circle at ' + dotR + 'px ' + dotR + 'px, #DCDDE2 ' + dotR + 'px, transparent ' + (dotR + 0.6) + 'px); background-size: ' + gpx + 'px ' + gpx + 'px; background-position: ' + (s.pan.x - dotR) + 'px ' + (s.pan.y - dotR) + 'px;'
      : 'background-image: linear-gradient(rgba(0,0,0,0.016) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.016) 1px, transparent 1px); background-size: ' + gpx + 'px ' + gpx + 'px; background-position: ' + s.pan.x + 'px ' + s.pan.y + 'px;'),
    onLeave: () => undefined,
    boardStyle: 'position: absolute; inset: 0; cursor: ' + (tool === 'hand' ? (s.panning ? 'grabbing' : 'grab') : tool === 'select' ? 'default' : 'crosshair') + ';',
    worldStyle: 'position: absolute; left: 0; top: 0; width: 0; height: 0; transform-origin: 0 0; transform: translate(' + s.pan.x + 'px, ' + s.pan.y + 'px) scale(' + z + ');',
    boardRef: self.boardRef,
    onBoardDown: (e: any) => self.boardDown(e), onBoardDbl: () => undefined, onWheel: (e: any) => self.wheelZoom(e), onBoardMenu: (e: any) => e.preventDefault(),
    m: { show: false, rows: [] },
    onMove: (e: any) => self.move(e), onUp: () => self.up(), onKey: () => undefined, onKeyUp: () => undefined,
    caretEnd: (e: any) => { try { const n = e.target.value.length; e.target.setSelectionRange(n, n); } catch { /* not a text field */ } },
    items, hasSelBox, selBoxStyle, handles, dots, ah: [], badges: [], c: { show: false },
    hasHint: tool === 'node' && !s.panel && !s.welcome, hint: fmt('Click to place {0}', self.nodeName(s.nodeType)),
    zoomLabel: Math.round(z * 100) + '%', zoomMenu: s.zoomMenu, zoomExpanded: s.zoomMenu ? 'true' : 'false',
    toggleZoomMenu: () => self.setState({ zoomMenu: !s.zoomMenu, bgMenu: false }),
    zoomIn: () => self.zoomTo(s.zoom * 1.25), zoomOut: () => self.zoomTo(s.zoom / 1.25), zoomFit: () => self.zoomFit(), zoomReset: () => self.zoomTo(1),
    toolsA: [mk('select', 'Select', 'V / 1'), mk('hand', 'Hand', 'H / Space')],
    toolsB: [mk('text', 'Text', 'T / 8'), mk('frame', 'Frame', 'F'), mk('sticky', 'Sticky note', 'S')],
    drawSlot: { stk: s.drawMode === 'pen' ? penStk(s.ink) : arrowStk(s.ink), label: s.drawMode === 'pen' ? 'Pen' : 'Arrow', tip: s.drawMode === 'pen' ? 'Pen (P)' : 'Arrow (A)', pressed: drawOn ? 'true' : 'false', style: btn + (drawOn ? ' ' + dockOn : ''), pick: () => self.pickTool('draw') },
    shapeSlot: { stk: shapeStk((SHAPE_BY_ID[s.shapeKind] || SHAPES[0]).icon), tip: tr('Shapes') + ' (R): ' + tr((SHAPE_BY_ID[s.shapeKind] || SHAPES[0]).label), pressed: shapeOn ? 'true' : 'false', expanded: s.panel === 'shape' ? 'true' : 'false', style: btn + (shapeOn ? ' ' + dockOn : ''), pick: () => self.pickTool('shape') },
    stickerSlot: { tip: tr('Stickers') + ' (E): ' + tr(curSticker.name), layers: curSticker.layers, inner: 'display: block; position: relative; width: 24px; height: 24px; filter: drop-shadow(0 1px 1px rgba(0,0,0,0.22));' + (curSticker.flip ? ' transform: scaleY(-1);' : ''), pressed: stickerOn ? 'true' : 'false', expanded: s.panel === 'sticker' ? 'true' : 'false', style: btn + (stickerOn ? ' ' + dockOn : ''), pick: () => self.pickTool('sticker') },
    showDraw: drawOn && !chat,
    penPressed: s.drawMode === 'pen' ? 'true' : 'false', arrowPressed: s.drawMode === 'arrow' ? 'true' : 'false',
    penBtnStyle: 'width: 38px; height: 38px;' + (s.drawMode === 'pen' ? ' ' + activeCss : ''), arrowBtnStyle: 'width: 38px; height: 38px;' + (s.drawMode === 'arrow' ? ' ' + activeCss : ''),
    setPen: () => self.setState({ drawMode: 'pen' }), setArrow: () => self.setState({ drawMode: 'arrow', lineOnly: false }),
    inkOpts: INK.map((ic) => { const on = s.ink === ic[0]; return { label: ic[1], pressed: on ? 'true' : 'false', pick: () => self.setState({ ink: ic[0] }), style: 'width: 38px; height: 38px;' + (on ? ' background: ' + tint + ';' : ''), dot: 'display: block; width: 24px; height: 24px; border-radius: 7px; background: ' + ic[0] + '; border: 1px solid rgba(0,0,0,0.15);' }; }),
    showShapes: s.panel === 'shape' && !chat,
    shapeOpts: SHAPES.map((sh) => { const on = s.shapeKind === sh.id; return { label: sh.label, icon: sh.icon, checked: on ? 'true' : 'false', pick: () => self.setState({ shapeKind: sh.id, tool: 'shape', panel: null }), style: 'width: 44px; height: 44px;' + (on ? ' ' + activeCss : '') }; }),
    showNodes: s.panel === 'nodes' && !chat,
    dock: DOCK,
    stkLib: 'display: block; flex: 0 0 auto; position: relative; width: 28px; height: 28px; filter: drop-shadow(0 1px 1px rgba(0,0,0,0.26));',
    stkBox: 'display: block; flex: 0 0 auto; position: relative; width: 26px; height: 26px; filter: drop-shadow(0 1px 1px rgba(0,0,0,0.26));',
    stkSm: 'display: block; flex: 0 0 auto; position: relative; width: 20px; height: 20px; filter: drop-shadow(0 1px 1px rgba(0,0,0,0.26));',
    undoStk: s.canUndo ? DOCK.undo : DOCK.undoOff, redoStk: s.canRedo ? DOCK.redo : DOCK.redoOff,
    runStk: s.running ? DOCK.stop : DOCK.play, bgStk: s.bg === 'dots' ? DOCK.dots : DOCK.grid,
    grp: 'display: flex; align-items: center; gap: 2px; padding: 3px; border-radius: 14px; background: #F3F4F6;',
    viewBtn: btn + (s.bgMenu ? ' ' + activeCss : ''),
    nodeSlot: { tip: tr('All nodes') + ' (N)', stk: NODE_STK.more, pressed: (tool === 'node' && !s.pins.includes(s.nodeType)) || s.panel === 'nodes' ? 'true' : 'false', expanded: s.panel === 'nodes' ? 'true' : 'false', style: btn + ((tool === 'node' && !s.pins.includes(s.nodeType)) || s.panel === 'nodes' ? ' ' + dockOn : ''), pick: () => self.pickTool('node') },
    pinBtns: s.pins.filter((t: string) => !!NODE_BY[t]).map((t: string) => {
      const on = tool === 'node' && s.nodeType === t && s.panel !== 'nodes', name = self.nodeName(t);
      return { _v: 1, name, tip: name, stk: NODE_STK[t] || NODE_STK.pkg, pressed: on ? 'true' : 'false', style: btn + (on ? ' ' + dockOn : ''), pick: () => { if (on) self.setState({ tool: 'select' }); else self.placeNode(t); } };
    }),
    nodeCats: (() => {
      const tile = (t: string) => {
        const nd = NODE_BY[t], cg = CATS[nd.cat], on = tool === 'node' && s.nodeType === t, pinned = s.pins.includes(t), label = self.nodeName(t);
        return { _v: 1, label, icon: nd.icon, stk: NODE_STK[t] || NODE_STK.llm, chip: 'flex: 0 0 auto; width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; background: ' + cg.bg + '; color: ' + cg.fg + ';' + CHIP_STK,
          pick: () => self.setState({ nodeType: t, tool: 'node', panel: null, selected: null, welcome: false }), canPin: true, pinPressed: pinned ? 'true' : 'false',
          pinTip: fmt(pinned ? 'Unpin {0} from the toolbar' : 'Pin {0} to the toolbar', label), togglePin: () => self.togglePin(t),
          pinStyle: 'position: absolute; right: 4px; top: 6px; width: 28px; height: 28px; border-radius: 8px; ' + (pinned ? 'color: ' + accent + ';' : 'color: #8A8B93;'), pinFill: pinned ? 'currentColor' : 'none',
          style: (on ? activeCss : '') + ' width: 100%; box-sizing: border-box; padding-right: 36px;' };
      };
      const pinned = s.pins.filter((t: string) => !!NODE_BY[t]);
      const restT = s.shelf.concat(s.installed.map((id: string) => 'pkg:' + id)).filter((t: string) => !!NODE_BY[t] && !pinned.includes(t));
      const outC: any[] = [];
      if (pinned.length) outC.push({ label: 'On the toolbar', hint: fmt('{0} of {1} places used', pinned.length, PIN_MAX), types: pinned.map(tile) });
      if (restT.length) outC.push({ label: 'Your nodes', hint: 'Pin the ones you use most', types: restT.map(tile) });
      return outC;
    })(),
    lib: { has: false, marketLabel: 'Find more in the node market', openMarket: () => self.flash('The node market opens in the next update'), marketStyle: 'height: 36px; background: ' + accent + '; color: #FFFFFF;', hint: 'Nodes you do not see here are in the market.' },
    showStickers: s.panel === 'sticker' && !chat, stickerQuery: s.stickerQuery, onStickerQuery: (e: any) => self.setState({ stickerQuery: e.target.value }), stickerOpts, noStickers: stickerOpts.length === 0,
    chatPressed: chat ? 'true' : 'false', toggleChat: () => self.setChat(!chat),
    chatStyle: softBtn + (chat ? activeCss : 'background: transparent; color: #111114;'),
    promptHidden: chat ? 'false' : 'true',
    promptWrapStyle: 'width: 100%; max-width: 520px; transform-origin: 50% 100%; transition: opacity 180ms ease, transform 240ms cubic-bezier(0.2, 0.8, 0.2, 1), visibility 0s linear ' + (chat ? '0s' : '240ms') + '; ' + (chat ? 'opacity: 1; transform: translateY(0) scale(1); visibility: visible; pointer-events: auto;' : 'opacity: 0; transform: translateY(16px) scale(0.97); visibility: hidden; pointer-events: none; position: absolute;'),
    promptFormStyle: 'box-sizing: border-box; display: flex; align-items: center; gap: 6px; padding: 6px 6px 6px 16px; background: #FFFFFF; border: 1.5px solid ' + (s.prompt ? accent : '#DCDDE2') + '; border-radius: 18px; box-shadow: 0 10px 30px rgba(20,20,30,0.10), 0 2px 6px rgba(20,20,30,0.05); transition: border-color 160ms ease;',
    placeholder: s.welcome ? 'Describe what to build' : s.area ? 'Describe what to build inside this box' : s.selected ? 'Describe what comes after the selected item' : 'Describe what to draw or build',
    inputRef: self.inputRef, prompt: s.prompt, onPrompt: (e: any) => self.setState({ prompt: e.target.value }), onSubmit: (e: any) => self.submitPrompt(e),
    micPressed: 'false', micLabel: 'Dictate', toggleMic: () => self.flash('Voice input comes in the next update'), micStyle: 'width: 40px; height: 40px;',
    sendDisabled: !(s.prompt || '').trim(),
    sendStyle: 'width: 40px; height: 40px; border: 0; border-radius: 12px; display: flex; align-items: center; justify-content: center; ' + ((s.prompt || '').trim() ? 'background: ' + accent + '; color: #FFFFFF; cursor: pointer;' : 'background: #F3F4F6; color: #8A8B92;'),
    hasToast: !!s.toast, toast: s.toast,
    toastStyle: 'position: absolute; left: 50%; bottom: ' + ((chat ? 186 : 102) + (s.chatRun && !s.welcome ? 290 : 0) + (hasProposal && !s.welcome && !(s.chatRun && !s.chatRun.done) ? 60 : 0)) + 'px; display: flex; align-items: center; gap: 8px; max-width: calc(100% - 32px); box-sizing: border-box; padding: 10px 16px; border-radius: 999px; background: #111114; color: #FFFFFF; font-size: 14px; font-weight: 400; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; pointer-events: none; animation: wb-toast 2.6s ease forwards; transform: translateX(-50%);',
  };
  void upText; void HARNESSES;
  return trOut(out);
}

function STICKY_NEXT(items: BoardItem[]) {
  const n = items.filter((o) => o.kind === 'sticky').length;
  return ['#FFE38A', '#ADE2A9', '#BFD7FF', '#FFC9D6', '#E3D3FF', '#FFD3A8'][n % 6];
}
