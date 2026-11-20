  // Server: the market lists the built-in nodes and every node people published.
  openMarket(tab) {
    var self = this;
    this.setState({ market: { tab: tab || 'browse', q: '', cat: 'all' }, panel: null, menu: null });
    api('GET', '/v1/market/nodes').then(function (r) { setMarket(r.nodes); self.forceUpdate(); }, function (err) { self.flash(String(err.message || err)); });
  }
