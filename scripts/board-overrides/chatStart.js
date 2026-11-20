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
