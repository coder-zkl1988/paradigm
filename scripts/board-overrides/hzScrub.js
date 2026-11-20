  hzScrub(id, v) {
    var s = this.state, h = s.hz[id];
    if (!h) return;
    var n = Math.max(0, Math.min(v, h.log.length));
    if (n >= h.log.length) { this.setState({ scrub: null }); return; }
    if (this.hzBatch && !s.paused) this.hzPause();
    this.setState({ scrub: { id: id, n: n } });
  }
