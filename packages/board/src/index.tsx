// The "In your app" package: the same whiteboard as the Paradigm app, in a
// box on your own page. It reads a board file (.flowboard.json) and needs no
// account and no server. Steps that run on a server (AI steps, the terminal,
// images) say so when run; everything else works as in the app.

import { useEffect, useMemo, useState } from 'react';
import { Board as AppBoard } from '../../../apps/web/src/board/Board';
import { setLang } from '../../../apps/web/src/lib/i18n';
import appCss from '../../../apps/web/src/styles.css?raw';
import type { BoardProps } from './index.d';

// The app's styles without the ones for its own pages (body, links, sign-in).
const PAGE_ONLY = /^(html|body|\*|a\{|a:hover|\.pg-|@keyframes si-|@media \(prefers-reduced-motion: reduce\)\{\.si-|@media \(prefers-reduced-motion: reduce\)\{\.pg-)/;
const CSS = appCss.split('\n').filter((l) => !PAGE_ONLY.test(l.trim())).join('\n') + `
.pd-pkg{position:relative;overflow:hidden;font-family:Inter,system-ui,sans-serif;color:#111114;isolation:isolate}
.pd-pkg>div{position:absolute;inset:0}
.pd-local main>div:has(>div.wb-bar>span[role="status"]){display:none!important}
`;

function useStyles() {
  useEffect(() => {
    if (typeof document === 'undefined' || document.getElementById('paradigm-board-css')) return;
    const el = document.createElement('style');
    el.id = 'paradigm-board-css';
    el.textContent = CSS;
    document.head.appendChild(el);
  }, []);
}

const none = () => undefined;

export function Board({ file, onChange, readOnly = false, toolbar = true, lang, height = 480, className, style }: BoardProps) {
  useStyles();
  const [l, setL] = useState<'en' | 'zh'>(lang || 'en');
  useEffect(() => { if (lang) { setLang(lang); setL(lang); } }, [lang]);
  const local = useMemo(() => ({ file, readOnly: readOnly || !onChange, onChange }), [file, readOnly, onChange]);
  return (
    <div className={'pd-pkg' + (className ? ' ' + className : '')} style={{ height, ...style }}>
      <AppBoard boardId="" local={local} embed toolbar={toolbar} me={null} lang={l}
        flipLang={() => { const n = l === 'zh' ? 'en' : 'zh'; setLang(n); setL(n); }} setLang={(n) => { setLang(n); setL(n); }}
        goHome={none} newBoard={none} signOut={none} replaceUrl={none} />
    </div>
  );
}

export default Board;
