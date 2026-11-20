  clearRun() {
    this.chatStop(); clearTimeout(this.runTimer); clearTimeout(this.soloTimer); clearTimeout(this.hzTimer); clearTimeout(this.foldTimer);
    var bt = this.hzBatch;
    if (bt) Object.keys(bt.runs).forEach(function (id) { var r = bt.runs[id]; if (r.ctrl) r.ctrl.abort(); if (r.runId) agentApi.stop(r.runId); });
    this.runQ = null; this.hzBatch = null; this.pickAfter = null; this.botNode = null; this.runGen++;
  }
