  chatStop() {
    clearTimeout(this.chatTimer); this.chatTimer = null; this.chatTok = (this.chatTok || 0) + 1; this.chatAt = null;
    if (this.chatCtrl) { this.chatCtrl.abort(); this.chatCtrl = null; }
    if (this.chatRunId) { agentApi.stop(this.chatRunId); this.chatRunId = null; }
  }
