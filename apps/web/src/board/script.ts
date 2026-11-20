// Runs JavaScript from Code nodes and market nodes in a Web Worker: no access
// to the page, stopped after 3 seconds. Same contract as the draft's runJs:
// cb(error) or cb(null, { value, logs }), or { blocked: true } when this page
// cannot run scripts (then the server runs them).

import { SCRIPT_WORKER } from '@paradigm/shared';

export function runJs(src: string, input: unknown, inputs: Record<string, unknown>, cb: (err: Error | null, res?: { value?: unknown; logs?: string[]; blocked?: boolean }) => void) {
  let settled = false, w: Worker | null = null, timer: ReturnType<typeof setTimeout> | null = null;
  const finish = (err: Error | null, res?: { value?: unknown; logs?: string[]; blocked?: boolean }) => {
    if (settled) return;
    settled = true;
    if (timer) clearTimeout(timer);
    if (w) { try { w.terminate(); } catch { /* gone */ } }
    cb(err, res);
  };
  try {
    w = new Worker(URL.createObjectURL(new Blob([SCRIPT_WORKER], { type: 'text/javascript' })));
    w.onmessage = (e) => {
      const d = e.data || {};
      if (d.error && /EvalError|unsafe-eval|Content Security Policy/i.test(d.error)) finish(null, { blocked: true });
      else if (d.error) finish(new Error(d.error));
      else finish(null, { value: d.value, logs: d.logs || [] });
    };
    w.onerror = (e) => { if (e && e.preventDefault) e.preventDefault(); finish(null, { blocked: true }); };
    timer = setTimeout(() => finish(new Error('Stopped after 3 seconds. Check for an endless loop.')), 3000);
    w.postMessage({ src, input, inputs });
  } catch { finish(null, { blocked: true }); }
}
