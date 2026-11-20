  constructor(props) {
    super(props);
    var self = this;
    this.nextId = 100;
    this.seq = {};
    this.undoStack = [];
    this.redoStack = [];
    this.histAt = 0;
    this.dragBase = null;
    this.skipHist = false;
    this.runQ = null;
    this.runCount = 0;
    this.hzBatch = null;
    this.hzGen = 0;
    this.pickAfter = null;
    this.botNode = null;
    this.runGen = 0;
    this.execSeq = 0;
    this.execTok = {};
    this.drag = null;
    this.boardEl = null;
    this.inputEl = null;
    this.toastTimer = null;
    this.chatTok = 0; this.chatTimer = null; this.chatAt = null; this.chatCtrl = null; this.chatRunId = null;
    this.version = 0; this.savedItems = null; this.savedPrefs = ''; this.savedSettings = '';
    this.speech = null;
    this.boardRef = function (el) { if (el) self.boardEl = el; };
    this.inputRef = function (el) { if (el) self.inputEl = el; };
    this.services = {
      backend: function (kind, body) { return backend(kind, body); },
      script: function (src, input, inputs) { return new Promise(function (resolve, reject) { runJs(src, input, inputs, function (err, r) { if (err) reject(err); else resolve(r); }); }); },
      agent: function () { return Promise.reject(new Error('Agent steps run through hzStart')); }
    };
    // Server: the board, its settings and the person's node prefs load in componentDidMount.
    this.state = {
      loaded: false, loadError: '', boardId: null, title: '', role: 'editor', workspaces: [], wsId: null, link: null,
      tool: 'select', drawMode: 'pen', shapeKind: 'square', stickerId: null, panel: null, ink: '#111111',
      welcome: false, big: false, nodeType: 'llm', mood: 'idle', look: { x: 0, y: 0 }, running: false, runDone: 0, runTotal: 0, aiOpen: false, aiTab: 'outline',
      items: [], selected: null, editing: null, popover: null,
      pan: { x: 160, y: 96 }, zoom: 1, zoomMenu: false, panning: false,
      chat: false, prompt: '', mic: false, micFrom: null, toast: '',
      stickerQuery: '', linkDraft: '', commentDraft: '',
      lang: props.lang, acctMenu: null, ws: 0,
      signedIn: !!props.me && !props.me.guest, saveState: 'saved', library: [], installed: [], mine: [], pins: DEFAULT_PINS.slice(), shelf: DEFAULT_SHELF.slice(), market: null, draft: JSON.stringify(PKG_TEMPLATE, null, 2), allNodes: false, share: null, embedEdit: false, embedBar: true, importOpen: false, importText: '', importError: false,
      help: false, toolLock: false, lineOnly: false,
      menu: null, clip: null, canUndo: false, canRedo: false, multi: [], marquee: null, area: null, kc: null, proposal: null, bg: 'grid', snap: false, bgMenu: false, ghost: null,
      hz: {}, openNode: null, openAuto: false, perms: Object.assign({}, HZ_PERMS), paused: false, pick: null, kept: {}, hzSel: null, scrub: null, compare: null,
      out: {}, inspect: null, apiOpen: false, apiStatus: null, viewer: null, slideAt: {}, chatRun: null, chatMode: 'auto'
    };
    this.isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
  }
