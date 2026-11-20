  // Server: autosave. The board file and its settings go to the board; pins,
  // the Nodes panel and the person's own nodes go to their account.
  queueSave() {
    var self = this;
    if (!this.state.loaded || this.ro()) return;
    clearTimeout(this.saveTimer);
    if (this.state.saveState !== 'saving') this.setState({ saveState: 'saving' });
    this.saveTimer = setTimeout(function () { self.saveTimer = null; self.saveNow(); }, 600);
  }

  saveNow() {
    var self = this, s = this.state, jobs = [];
    var clean = s.items.filter(function (o) { return !o.proposed; });
    var cleanSaved = (this.savedItems || []).filter(function (o) { return !o.proposed; });
    var settings = JSON.stringify({ perms: s.perms, bg: s.bg });
    if (s.boardId && (!sameButStatus(clean, cleanSaved) || settings !== this.savedSettings)) {
      var items = s.items;
      jobs.push(boards.save(s.boardId, { file: fileDoc(clean, flowGraph(clean)), version: this.version, settings: { perms: s.perms, bg: s.bg } }).then(function (r) { self.version = r.version; self.savedItems = items; self.savedSettings = settings; }));
    }
    var np = JSON.stringify({ shelf: s.shelf, installed: s.installed, mine: s.mine, pins: s.pins });
    if (this.props.me && np !== this.savedPrefs) jobs.push(prefs.put({ shelf: s.shelf, installed: s.installed, mine: s.mine, pins: s.pins }).then(function () { self.savedPrefs = np; }));
    Promise.all(jobs).then(function () { if (!self.saveTimer) self.setState({ saveState: 'saved' }); }, function (err) {
      self.setState({ saveState: 'off' });
      self.flash(err && err.status === 409 ? 'Someone else changed this board. Reload to see their version.' : String(err.message || err));
    });
  }

  /** Viewing someone else's board, or a view link: nothing is changed or saved. */
  ro() { return this.state.role === 'viewer'; }
