  downloadFile() {
    var name = (slugOf(this.state.title) || 'board') + '.flowboard.json';
    try {
      var url = URL.createObjectURL(new Blob([this.fileText()], { type: 'application/json' }));
      var link = document.createElement('a');
      link.href = url; link.download = name;
      link.click();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      this.flash(fmt('Downloaded {0}', name));
    } catch (err) { this.flash('Downloads are blocked in this preview'); }
    this.setState({ acctMenu: null });
  }
