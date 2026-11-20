  // Runs one node. cb(error) or cb(null, { type, value, text, sim, meta, logs }).
  // Server: executeNode() runs it in the page or calls the server, as the node needs.
  nodeRun(it, cb) {
    var def = NODE_BY[it.ntype] || NODE_DEFS[0], t = def.t, inputs;
    try { inputs = def.cat === 'info' ? [] : this.inputsFor(it.id); } catch (err) { cb(err); return; }
    executeNode(it, inputs, this.state.perms, this.services, this.state.boardId || '').then(function (r) {
      var m = r && r.meta;
      if (m && typeof m === 'object') {
        if (t === 'terminal') r.meta = 'exit ' + m.exit;
        else if (t === 'http') r.meta = m.status + ' ' + m.statusText;
        else if (t === 'imagegen' || t === 'videogen') r.meta = m.ratio + (m.seconds ? ' · ' + m.seconds + ' s' : '');
        else r.meta = '';
      }
      cb(null, r);
    }, function (err) { cb(err); });
  }
