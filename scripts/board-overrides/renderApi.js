  // Server: the calls the board makes, and whether each service is real or a stand-in.
  renderApi(accent) {
    var self = this, s = this.state;
    if (!s.apiOpen) return { open: false, rows: [] };
    var st = s.apiStatus;
    if (!st && !this.statusAsked) {
      this.statusAsked = true;
      api('GET', '/v1/status').then(function (r) { self.statusAsked = false; self.setState({ apiStatus: r }); }, function () { self.statusAsked = false; });
    }
    var state = function (k) {
      if (!st) return 'Checking';
      var one = k === 'agent' || k === 'permission' ? st.agents.pi : k === 'terminal' || k === 'code' ? st.sandbox : k === 'imagegen' ? st.images : k === 'videogen' ? st.videos : { real: true };
      return one.real ? 'Connected' : 'Simulated';
    };
    return {
      open: true, title: 'Backend interfaces', closeLabel: 'Close backend interfaces', close: function () { self.setState({ apiOpen: false, apiStatus: null }); },
      intro: 'These are the calls the board makes to its server. A service that is not set up on the server answers with a simulated result and says so. JavaScript in Code nodes, Data, Palette and the Doc, Sheet, Slides, Markdown and HTML preview nodes run in the browser.',
      rows: API_ORDER.map(function (k) {
        var a = API[k];
        var now = state(k), real = now === 'Connected';
        return { line: a.method + ' ' + a.path, user: fmt('Used by {0}', tr(API_USER[k])), note: a.note, stream: !!a.stream, streamLabel: 'Streams', state: now,
          stateStyle: 'flex: 0 0 auto; padding: 1px 8px; border-radius: 999px; font-size: 11.5px; ' + (real ? 'background: #DDF3E4; color: #1F6B3A' : now === 'Checking' ? 'background: #F0F1F4; color: #55565C' : 'background: #FFE9C7; color: #7A4100') };
      }),
      copyLabel: 'Copy contract', copy: function () { var c = contract(); c.baseUrl = window.location.origin; self.copyText(JSON.stringify(c, null, 2), 'Contract copied'); },
      copyStyle: 'align-self: flex-start; height: 40px; padding: 0 16px; background: ' + accent + '; color: #FFFFFF;'
    };
  }

  // Voice input: the browser's speech recognition fills the prompt. Spoken to the
  // robot, the request is sent as soon as it is heard.
  micChanged() {
    var self = this, s = this.state;
    if (!s.mic) { this.stopSpeech(); return; }
    var SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SR) { this.setState({ mic: false, micFrom: null }); this.flash('Voice input is not available in this browser. Type instead.'); return; }
    this.stopSpeech();
    var rec = new SR(), from = s.micFrom, heard = '';
    rec.lang = this.props.lang === 'zh' ? 'zh-CN' : 'en-US';
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = function (e) {
      var text = '';
      for (var i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      heard = text.trim();
      self.setState({ prompt: heard });
    };
    rec.onerror = function (e) { if (e.error !== 'aborted' && e.error !== 'no-speech') self.flash(e.error === 'not-allowed' ? 'Allow the microphone to talk to the board' : 'Voice input stopped'); };
    rec.onend = function () {
      if (self.speech !== rec) return;
      self.speech = null;
      if (self.state.mic) self.setState({ mic: false, micFrom: null });
      if (heard && from === 'bot') self.chatStart(heard);
      else if (heard) self.setChat(true);
    };
    this.speech = rec;
    try { rec.start(); } catch (err) { this.speech = null; this.setState({ mic: false, micFrom: null }); }
  }

  stopSpeech() {
    var rec = this.speech;
    if (!rec) return;
    try { rec.stop(); } catch (err) { /* already stopped */ }
  }
