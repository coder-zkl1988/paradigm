  componentWillUnmount() {
    clearTimeout(this.hzTimer); clearTimeout(this.foldTimer); clearTimeout(this.toastTimer); clearTimeout(this.runTimer); clearTimeout(this.soloTimer); clearTimeout(this.moodTimer); clearTimeout(this.botTimer);
    this.clearRun();
    this.stopSpeech();
    this.liveStop();
    if (this.saveTimer) { clearTimeout(this.saveTimer); this.saveNow(); }
  }
