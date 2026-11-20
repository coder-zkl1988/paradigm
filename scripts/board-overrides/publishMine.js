  publishMine() {
    var self = this, p = this.addMine();
    if (!p) return;
    backend('marketPublish', { manifest: p }).then(function (r) {
      if (!r.ok) { self.flash(fmt('The market refused it: {0}', (r.problems[0] || {}).text || '')); return; }
      self.flash(fmt('Published {0} to the market', p.name));
      api('GET', '/v1/market/nodes').then(function (x) { setMarket(x.nodes); self.forceUpdate(); }, function () { return null; });
    }, function (err) { self.flash(String(err.message || err)); });
  }

  // Server: MCP settings carry a fresh API token, so a coding agent can publish as this person.
  copyMcp() {
    var self = this;
    api('POST', '/v1/me/tokens', { label: 'MCP' }).then(function (r) {
      self.copyText(mcpConfig(window.location.origin, r.token), 'MCP settings copied, with a new token');
    }, function (err) { self.flash(String(err.message || err)); });
  }
