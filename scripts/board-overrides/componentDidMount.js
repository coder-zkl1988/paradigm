  componentDidMount() {
    this.load();
  }

  // Server: loads the board (or makes a new one), the workspaces, the person's nodes and the market.
  load() {
    var self = this, p = this.props;
    var market = api('GET', '/v1/market/nodes').then(function (r) { setMarket(r.nodes); }).catch(function () { return null; });
    var mine = p.viewToken || !p.me ? Promise.resolve(null) : prefs.get().then(function (r) { return r.prefs; }).catch(function () { return null; });
    var wsP = p.viewToken || !p.me ? Promise.resolve({ workspaces: [] }) : workspaces.list();
    var boardP;
    if (p.viewToken) boardP = api('GET', '/v1/public/' + encodeURIComponent(p.viewToken)).then(function (r) { return Object.assign({ role: 'viewer', settings: {} }, r.board); });
    else if (p.boardId === 'new') boardP = wsP.then(function (r) {
      var ws = r.workspaces, target = ws.find(function (w) { return !w.personal && w.role !== 'viewer'; }) || ws.find(function (w) { return w.role !== 'viewer'; }) || ws[0];
      return boards.create(target.id, {}).then(function (x) { p.replaceUrl(x.board.id); return x.board; });
    });
    else boardP = boards.get(p.boardId).then(function (x) { return x.board; });
    Promise.all([boardP, wsP, mine, market]).then(function (all) {
      var board = all[0], ws = all[1].workspaces, np = all[2];
      var items = [];
      try { items = loadDoc(board.file); } catch (err) { self.flash(String(err.message || err)); }
      var extra = { shelf: DEFAULT_SHELF.slice(), installed: [], mine: [], pins: DEFAULT_PINS.slice() };
      if (np) {
        (np.mine || []).forEach(function (m) { if (!validatePkg(m).length) registerPkg(m); });
        extra = { shelf: np.shelf, installed: np.installed, mine: np.mine || [], pins: np.pins };
      }
      self.version = board.version || 0;
      self.savedItems = items;
      self.savedPrefs = JSON.stringify(extra);
      var st = board.settings || {};
      self.savedSettings = JSON.stringify({ perms: st.perms || null, bg: st.bg || 'grid' });
      var fresh = p.boardId === 'new' || (!items.length && !p.viewToken && (board.nodes === 0) && board.createdAt === board.updatedAt);
      self.setState(Object.assign(extra, {
        loaded: true, boardId: board.id || null, title: board.title || '', role: board.role || 'viewer', workspaces: ws, wsId: board.workspaceId || null,
        items: items, welcome: fresh && !items.length, big: fresh && !items.length,
        perms: Object.assign({}, HZ_PERMS, st.perms || {}), bg: st.bg === 'dots' ? 'dots' : 'grid', saveState: 'saved'
      }), function () {
        var more = self.nodesFor(items);
        if (more) self.setState(more);
        if (items.length) self.zoomFit();
        self.focusBoard();
      });
    }).catch(function (err) { self.setState({ loaded: true, loadError: String(err.message || err) }); });
  }
