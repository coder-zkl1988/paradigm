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
