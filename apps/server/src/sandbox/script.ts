// Runs JavaScript for the Code node and market nodes. The script runs in a
// worker thread, in a fresh V8 context with no require, process, network or
// file access, with a memory cap and a time limit. This keeps honest mistakes
// contained; it is not a boundary against someone attacking the server, so
// run the server itself in a container when people you do not trust can use it.

import { Worker } from 'node:worker_threads';
import { SCRIPT_BODY } from '@paradigm/shared';

export interface ScriptOut { value: unknown; logs: string[]; error?: string }

const WORKER = `
const { parentPort, workerData } = require('node:worker_threads');
const vm = require('node:vm');
const ctx = vm.createContext({}, { codeGeneration: { strings: true, wasm: false } });
ctx.__in = workerData.json;
ctx.__post = (s) => parentPort.postMessage(s);
vm.runInContext(${JSON.stringify(`
  (function () {
    var d = JSON.parse(__in), src = d.src, input = d.input, inputs = d.inputs, post = __post;
    var done = function (err, v, logs) {
      var s; try { s = JSON.stringify({ error: err, value: v === undefined ? null : v, logs: logs }); }
      catch (x) { s = JSON.stringify({ error: 'The result cannot be passed on (return plain data)', value: null, logs: logs }); }
      post(s);
    };
    ${SCRIPT_BODY}
  })();
`)}, ctx, { timeout: workerData.ms });
`;

export function runScript(src: string, input: unknown, inputs: Record<string, unknown>, ms = 5000): Promise<ScriptOut> {
  return new Promise((resolve) => {
    let json: string;
    try { json = JSON.stringify({ src, input: input === undefined ? null : input, inputs }); }
    catch { resolve({ value: null, logs: [], error: 'What flows in cannot be passed to a script' }); return; }
    const w = new Worker(WORKER, { eval: true, workerData: { json, ms }, resourceLimits: { maxOldGenerationSizeMb: 96, maxYoungGenerationSizeMb: 16, stackSizeMb: 4 } });
    let settled = false;
    const end = (r: ScriptOut) => { if (settled) return; settled = true; clearTimeout(timer); w.terminate(); resolve(r); };
    const timer = setTimeout(() => end({ value: null, logs: [], error: `The script ran longer than ${ms / 1000} s` }), ms + 200);
    w.on('message', (s: string) => {
      try { const r = JSON.parse(s); end({ value: r.value, logs: r.logs || [], error: r.error || undefined }); }
      catch { end({ value: null, logs: [], error: 'The script answered with something unreadable' }); }
    });
    w.on('error', (e) => end({ value: null, logs: [], error: /memory/i.test(e.message) ? 'The script used too much memory' : /timed out/i.test(e.message) ? `The script ran longer than ${ms / 1000} s` : e.message }));
    w.on('exit', () => end({ value: null, logs: [], error: 'The script stopped without an answer' }));
  });
}

/** Python runs through the sandbox: the source becomes a function body, like JavaScript. */
export function pythonProgram(src: string): string {
  const body = src.split('\n').map((l) => '    ' + l).join('\n');
  return `import json, sys
__d = json.loads(sys.stdin.read() or '{}')
def __node(input, inputs):
${body || '    return None'}
__v = __node(__d.get('input'), __d.get('inputs') or {})
print('\\n__PARADIGM_RESULT__' + json.dumps(__v, default=str))
`;
}

export function readPython(stdout: string): { value: unknown; logs: string[] } {
  const k = stdout.lastIndexOf('__PARADIGM_RESULT__');
  const logs = (k >= 0 ? stdout.slice(0, k) : stdout).split('\n').map((l) => l.trimEnd()).filter(Boolean);
  if (k < 0) return { value: null, logs };
  try { return { value: JSON.parse(stdout.slice(k + 19).trim()), logs }; } catch { return { value: null, logs }; }
}
