// What a node needs to run: where it runs (in the page or on the server) and
// what is sent. The run engine in the web app calls this for each node in
// order; the server validates the same shapes.

import type { NodeInput, NodeItem } from './types';
import type { AgentRunRequest, ApiKind } from './api';
import type { Perm, ToolRes } from './harness';
import { HARNESSES } from './harness';
import { NODE_BY, cfgOf, parseHttp, showVal } from './nodes';

export interface NodeRequest {
  where: 'local' | 'backend';
  kind: ApiKind | string;
  body: unknown;
}

/** Throws with a message the person can act on when the node is not ready. */
export function nodeRequest(it: NodeItem, inputs: NodeInput[], perms: Partial<Record<ToolRes, Perm>>, workspace = ''): NodeRequest {
  const t = it.ntype, text = (it.text || '').trim();
  const up = inputs.map((i) => showVal(i.value)).filter(Boolean).join('\n\n');
  const pk = NODE_BY[t]?.pkg;
  if (pk) {
    const config: Record<string, unknown> = {};
    for (const o of pk.options || []) config[o.key] = cfgOf(it, o.key);
    return { where: pk.runs === 'backend' ? 'backend' : 'local', kind: 'marketRun', body: { node: pk.id, version: pk.version, input: inputs.length ? inputs[0].value : null, inputs, config, text: it.text || '' } };
  }
  if (HARNESSES[t]) {
    const body: AgentRunRequest = { harness: HARNESSES[t].id, instruction: text, inputs, permissions: perms, workspace };
    if (t === 'acp') body.agent = String(cfgOf(it, 'agent'));
    if (it.optName) body.optName = it.optName;
    return { where: 'backend', kind: 'agent', body };
  }
  if (t === 'terminal') {
    if (!text) throw new Error('Add a command first');
    return { where: 'backend', kind: 'terminal', body: { command: text, stdin: up || null, timeoutSec: Number(cfgOf(it, 'timeout')), workspace } };
  }
  if (t === 'code') {
    if (!text) throw new Error('Write a script first');
    const js = cfgOf(it, 'lang') === 'js';
    return { where: js ? 'local' : 'backend', kind: 'code', body: { language: js ? 'javascript' : 'python', source: it.text, input: inputs.length ? inputs[0].value : null } };
  }
  if (t === 'http') return { where: 'backend', kind: 'http', body: parseHttp(it.text) };
  if (t === 'imagegen' || t === 'videogen') {
    const prompt = [text, up].filter(Boolean).join('\n\n');
    if (!prompt) throw new Error('Describe what to make first');
    const b: Record<string, unknown> = { prompt, ratio: cfgOf(it, 'ratio') };
    if (t === 'videogen') b.seconds = cfgOf(it, 'seconds');
    const refs = inputs.filter((i) => i.type === 'image').map((i) => i.from);
    if (refs.length) b.references = refs;
    return { where: 'backend', kind: t, body: b };
  }
  return { where: 'local', kind: t, body: null };
}

/**
 * The body of the function that runs a script, shared by the browser worker
 * and the server. It defines `logs` and calls `done(error, value, logs)`.
 * Expects `src`, `input`, `inputs` and `done` in scope.
 */
export const SCRIPT_BODY = 'var logs=[];var put=function(){logs.push(Array.prototype.map.call(arguments,function(a){return typeof a==="string"?a:JSON.stringify(a)}).join(" "))};var con={log:put,info:put,warn:put,error:put};var fail=function(x){return String(x&&x.message?(x.name||"Error")+": "+x.message:x)};try{var f=new Function("input","inputs","console","\\"use strict\\";\\n"+src);var r=f(input,inputs,con);if(r&&typeof r.then==="function")r.then(function(v){done(null,v,logs)},function(x){done(fail(x),null,logs)});else done(null,r,logs)}catch(x){done(fail(x),null,logs)}';

/** The worker source: receives {src, input, inputs}, posts back {error, value, logs}. */
export const SCRIPT_WORKER = 'onmessage=function(e){var src=e.data.src,input=e.data.input,inputs=e.data.inputs;var done=function(err,v,logs){try{postMessage({error:err,value:v,logs:logs})}catch(x){postMessage({error:"The result cannot be passed on (return plain data)",logs:logs})}};' + SCRIPT_BODY + '};';

/** Prefix that gives a market node its `config` and `text`. */
export function packageSource(run: string, config: Record<string, unknown>, text: string): string {
  return 'var config = ' + JSON.stringify(config) + ', text = ' + JSON.stringify(text) + ';\n' + run;
}
