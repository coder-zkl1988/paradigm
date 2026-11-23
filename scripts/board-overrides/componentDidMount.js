  componentDidMount() {
    this.load();
  }

  // Server: loads the board (or makes a new one), the workspaces, the person's nodes and the market.
  load() {
    var self = this, p = this.props;
    var market = p.local ? Promise.resolve(null) : api('GET', '/v1/market/nodes').then(function (r) { setMarket(r.nodes); }).catch(function () { return null; });
    var mine = p.local || p.viewToken || !p.me ? Promise.resolve(null) : prefs.get().then(function (r) { return r.prefs; }).catch(function () { return null; });
    var wsP = p.local || p.viewToken || !p.me ? Promise.resolve({ workspaces: [] }) : workspaces.list();
    var boardP;
    if (p.local) boardP = Promise.resolve({ file: p.local.file, role: p.local.readOnly ? 'viewer' : 'editor', title: '', version: 0, settings: {}, nodes: -1 });
    else if (p.viewToken) boardP = api('GET', '/v1/public/' + encodeURIComponent(p.viewToken)).then(function (r) { return Object.assign({ role: 'viewer', settings: {} }, r.board); });
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
      self.lastFile = p.local ? p.local.file : null;
      var fresh = !p.local && (p.boardId === 'new' || (!items.length && !p.viewToken && (board.nodes === 0) && board.createdAt === board.updatedAt));
      self.setState(Object.assign(extra, {
        loaded: true, boardId: board.id || null, title: board.title || '', role: board.role || 'viewer', workspaces: ws, wsId: board.workspaceId || null,
        items: items, welcome: fresh && !items.length, big: fresh && !items.length,
        perms: Object.assign({}, HZ_PERMS, st.perms || {}), bg: st.bg === 'dots' ? 'dots' : 'grid', saveState: 'saved'
      }), function () {
        var more = self.nodesFor(items);
        if (more) self.setState(more);
        if (items.length) self.zoomFit();
        if (!p.local) self.focusBoard();
        self.liveStart();
      });
    }).catch(function (err) { self.setState({ loaded: true, loadError: String(err.message || err) }); });
  }

  // Server: live editing. The page listens for saves by other people and for
  // who else has the board open. A save it did not make is loaded and merged
  // item by item with this page's unsaved changes (see mergeItems).
  /** In your app: the host passed a file that is not the one this board last handed out. */
  localFile(file) {
    var items;
    try { items = loadDoc(file); } catch (err) { this.flash(String(err.message || err)); return; }
    this.lastFile = file; this.savedItems = items; this.skipHist = true;
    this.setState({ items: items, selected: null, multi: [], editing: null, popover: null });
  }

  liveStart() {
    var self = this, p = this.props, wait = 1000;
    if (this.liveCtrl || (!this.state.boardId && !p.viewToken)) return;
    var where = p.viewToken ? { viewToken: p.viewToken } : { boardId: this.state.boardId };
    var connect = function () {
      if (self.liveStopped) return;
      var ctrl = self.liveCtrl = new AbortController();
      live(where, function (e) { wait = 1000; self.liveEvent(e); }, ctrl.signal).then(function () { return null; }, function (err) { return err; }).then(function (err) {
        if (self.liveStopped || self.liveGone) return;
        // Lost the connection (or the server restarted): try again, more slowly each time.
        if (err && err.status && err.status < 500) return;
        self.liveTimer = setTimeout(connect, wait);
        wait = Math.min(wait * 2, 15000);
      });
    };
    connect();
  }

  liveStop() {
    this.liveStopped = true;
    clearTimeout(this.liveTimer); clearTimeout(this.pullTimer);
    if (this.liveCtrl) this.liveCtrl.abort();
  }

  liveEvent(e) {
    var self = this, me = this.props.me;
    if (e.type === 'hello') {
      this.liveConn = e.conn;
      this.people = e.people;
      if (e.version > this.version) this.livePull();
    } else if (e.type === 'people') {
      var before = (this.people || []).map(function (x) { return x.conn; });
      e.people.forEach(function (x) {
        if (x.conn !== self.liveConn && before.indexOf(x.conn) < 0 && !(me && x.id === me.id)) self.flash(fmt('{0} opened this board', x.name));
      });
      this.people = e.people;
    } else if (e.type === 'saved') {
      if (e.conn && e.conn === this.liveConn) return;
      if (e.version > this.version) this.livePull();
    } else if (e.type === 'gone') {
      this.liveGone = true;
      this.setState({ loadError: e.reason === 'link_off' ? 'This link was turned off.' : (e.reason === 'trashed' ? 'This board was moved to the trash.' : 'This board was deleted.') });
    }
  }

  /** Loads the newest saved board and merges this page's unsaved changes into it. */
  livePull(then) {
    var self = this, p = this.props;
    if (this.saving || this.drag) { this.pullAfter = true; clearTimeout(this.pullTimer); this.pullTimer = setTimeout(function () { if (self.pullAfter && !self.saving) { self.pullAfter = false; self.livePull(then); } }, 400); return; }
    var got = p.viewToken ? api('GET', '/v1/public/' + encodeURIComponent(p.viewToken)).then(function (r) { return r.board; }) : boards.get(this.state.boardId).then(function (r) { return r.board; });
    got.then(function (board) {
      if (board.version <= self.version) { if (then) then(); return; }
      if (self.saving || self.drag) { self.livePull(then); return; }
      var remote;
      try { remote = loadDoc(board.file); } catch (err) { self.flash(String(err.message || err)); return; }
      var s = self.state, base = self.savedItems || [];
      var used = index(s.items.concat(remote));
      var m = mergeItems(base.filter(function (o) { return !o.proposed; }), s.items.filter(function (o) { return !o.proposed; }), remote, function (id) {
        var pre = id.replace(/[0-9].*$/, '') || 'i', n;
        do { self.seq[pre] = (self.seq[pre] || 0) + 1; n = pre + self.seq[pre]; } while (used[n]);
        used[n] = true;
        return n;
      });
      if (m.renamed[s.selected]) s = Object.assign({}, s, { selected: m.renamed[s.selected], editing: s.editing && m.renamed[s.editing] ? m.renamed[s.editing] : s.editing });
      // A proposal from the toolbar chat is not saved; it stays on this page.
      var items = m.items.concat(s.items.filter(function (o) { return o.proposed && !m.items.some(function (x) { return x.id === o.id; }); }));
      var st = board.settings || {}, settings = JSON.stringify({ perms: st.perms || null, bg: st.bg || 'grid' });
      var mineSettings = JSON.stringify({ perms: s.perms, bg: s.bg }) !== self.savedSettings;
      self.version = board.version;
      self.savedItems = remote;
      var patch = { items: items, title: board.title || s.title };
      if (!mineSettings && !p.viewToken) { self.savedSettings = settings; patch.perms = Object.assign({}, HZ_PERMS, st.perms || {}); patch.bg = st.bg === 'dots' ? 'dots' : 'grid'; }
      else if (p.viewToken) patch.bg = st.bg === 'dots' ? 'dots' : 'grid';
      // Someone else's change is not a step to undo here.
      self.skipHist = true;
      // Let go of anything that someone else deleted.
      var has = function (id) { return items.some(function (o) { return o.id === id; }); };
      if (s.selected !== self.state.selected) { patch.selected = s.selected; patch.editing = s.editing; }
      if (s.selected && !has(s.selected)) { patch.selected = null; patch.popover = null; }
      if (s.editing && !has(s.editing)) patch.editing = null;
      if (s.multi && s.multi.some(function (id) { return !has(id); })) patch.multi = s.multi.filter(has);
      self.setState(patch, function () { var more = self.nodesFor(items); if (more) self.setState(more); if (then) then(); });
    }, function (err) { if (err && err.status === 404) self.liveEvent({ type: 'gone', reason: p.viewToken ? 'link_off' : 'deleted' }); });
  }
