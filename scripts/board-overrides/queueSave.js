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
    // In your app: the file goes back to the host instead of a server.
    if (this.props.local) {
      if (!sameButStatus(clean, cleanSaved)) {
        var doc = fileDoc(clean, flowGraph(clean));
        this.lastFile = doc; this.savedItems = clean;
        if (this.props.local.onChange) this.props.local.onChange(doc);
      }
      this.setState({ saveState: 'saved' });
      return;
    }
    var settings = JSON.stringify({ perms: s.perms, bg: s.bg });
    var conflicted = false;
    if (s.boardId && !this.saving && (!sameButStatus(clean, cleanSaved) || settings !== this.savedSettings)) {
      this.saving = true;
      jobs.push(boards.save(s.boardId, { file: fileDoc(clean, flowGraph(clean)), version: this.version, settings: { perms: s.perms, bg: s.bg }, conn: this.liveConn }).then(function (r) {
        self.version = r.version; self.savedItems = clean; self.savedSettings = settings;
      }, function (err) {
        // Someone saved first: merge their version in, then save again.
        if (err && err.status === 409) { conflicted = true; return; }
        throw err;
      }).finally(function () { self.saving = false; }));
    } else if (this.saving) {
      jobs.push(new Promise(function (ok) { setTimeout(ok, 300); }).then(function () { self.queueSave(); }));
    }
    var np = JSON.stringify({ shelf: s.shelf, installed: s.installed, mine: s.mine, pins: s.pins });
    if (this.props.me && np !== this.savedPrefs) jobs.push(prefs.put({ shelf: s.shelf, installed: s.installed, mine: s.mine, pins: s.pins }).then(function () { self.savedPrefs = np; }));
    Promise.all(jobs).then(function () {
      if (conflicted) { self.livePull(function () { self.queueSave(); }); return; }
      if (self.pullAfter) { self.pullAfter = false; self.livePull(); }
      if (!self.saveTimer && !self.saving) self.setState({ saveState: 'saved' });
    }, function (err) {
      self.setState({ saveState: 'off' });
      self.flash(String(err.message || err));
    });
  }

  /** Viewing someone else's board, or a view link: nothing is changed or saved. */
  ro() { return this.state.role === 'viewer'; }
