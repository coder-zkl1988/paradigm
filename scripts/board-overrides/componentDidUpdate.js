  componentDidUpdate(prev, prevState) {
    if (prev.lang !== this.props.lang) this.setState({ lang: this.props.lang });
    if (prevState && prevState.mic !== this.state.mic) this.micChanged();
    if (!prevState || !this.state.loaded || !prevState.loaded) return;
    if (prevState.items !== this.state.items || prevState.library !== this.state.library || prevState.installed !== this.state.installed || prevState.mine !== this.state.mine || prevState.pins !== this.state.pins || prevState.shelf !== this.state.shelf || prevState.perms !== this.state.perms || prevState.bg !== this.state.bg) this.queueSave();
    if (prevState.items === this.state.items) return;
    if (this.skipHist) { this.skipHist = false; return; }
    if (sameButStatus(prevState.items, this.state.items)) return;
    if (this.drag) { if (!this.dragBase) this.dragBase = prevState.items; return; }
    var now = Date.now();
    if (this.dragBase) { this.pushHist(this.dragBase); this.dragBase = null; }
    else if (now - this.histAt > 500 || !this.undoStack.length) this.pushHist(prevState.items);
    this.histAt = now;
  }
