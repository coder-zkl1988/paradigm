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
