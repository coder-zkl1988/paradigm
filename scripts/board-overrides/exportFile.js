  // Server: makes the Word, Excel or PowerPoint file and downloads it.
  exportFile(id, format) {
    var self = this, res = this.state.out[id], vw = res && res.view;
    if (!vw) return;
    this.flash(fmt('Asking the backend for a .{0} file', format));
    files.export(format, vw.title || id, { kind: vw.kind, blocks: vw.blocks, head: vw.head, rows: vw.rows, slides: vw.slides }).then(function (r) {
      var a = document.createElement('a');
      a.href = fileUrl(r.url); a.download = r.name; a.click();
      self.flash(fmt('Your .{0} file is ready', format));
    }, function (err) { self.flash(String(err.message || err)); });
  }
