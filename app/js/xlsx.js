/*
 * Excel（.xlsx）ひな形の操作
 *   - シートの選択・複製・並べ替え
 *   - セルの文字の読み書き（書式・罫線・結合・図形・印刷設定はひな形のまま）
 *   - 書き込んだ文字量に合わせた行の高さの調整
 * 通信は一切行わない（ブラウザ内のみで処理）。
 */
(function () {
  'use strict';
  var NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  var NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  var NS_PKG = 'http://schemas.openxmlformats.org/package/2006/relationships';
  var NS_CT = 'http://schemas.openxmlformats.org/package/2006/content-types';

  // ---------- セル番地 ----------
  function colToNum(col) { var n = 0; for (var i = 0; i < col.length; i++) n = n * 26 + (col.charCodeAt(i) - 64); return n; }
  function numToCol(n) { var s = ''; while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }
  function parseRef(ref) { var m = /^\$?([A-Z]+)\$?(\d+)$/.exec(ref); return m ? { col: colToNum(m[1]), row: +m[2] } : null; }
  function ref(col, row) { return numToCol(col) + row; }
  function parseRange(rng) {
    var p = rng.split(':'), a = parseRef(p[0]), b = p[1] ? parseRef(p[1]) : a;
    return { r1: Math.min(a.row, b.row), r2: Math.max(a.row, b.row), c1: Math.min(a.col, b.col), c2: Math.max(a.col, b.col) };
  }

  // ---------- XML ----------
  function parseXml(text) {
    var doc = new DOMParser().parseFromString(text, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) throw new Error('XMLの解析に失敗しました');
    return doc;
  }
  function xmlString(doc) {
    var s = new XMLSerializer().serializeToString(doc);
    return s.indexOf('<?xml') === 0 ? s : '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + s;
  }
  function kids(el, name) {
    var out = [];
    for (var n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 1 && (!name || n.localName === name)) out.push(n);
    return out;
  }
  function kid(el, name) { for (var n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 1 && n.localName === name) return n; return null; }
  function textOf(el) {
    var out = '';
    (function walk(node) {
      for (var n = node.firstChild; n; n = n.nextSibling) {
        if (n.nodeType !== 1 || n.localName === 'rPh' || n.localName === 'phoneticPr') continue;
        if (n.localName === 't') out += n.textContent; else walk(n);
      }
    })(el);
    return out;
  }
  function resolve(base, target) {
    if (target.charAt(0) === '/') return target.slice(1);
    var parts = base.split('/'); parts.pop();
    target.split('/').forEach(function (s) { if (s === '..') parts.pop(); else if (s !== '.') parts.push(s); });
    return parts.join('/');
  }
  function b64ToBytes(b64) {
    var s = atob(b64), out = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }

  // 文字幅（全角=1、半角=0.5）
  function units(s) {
    var n = 0;
    for (var i = 0; i < s.length; i++) n += s.charCodeAt(i) < 0x2E80 && s[i] !== '□' && s[i] !== '■' ? 0.5 : 1;
    return n;
  }

  // ================= シート =================
  function Sheet(book, name, path, doc) {
    this.book = book; this.name = name; this.path = path; this.doc = doc;
    this._index();
  }
  Sheet.prototype._index = function () {
    var root = this.doc.documentElement, self = this;
    this.sheetData = kid(root, 'sheetData');
    this.rows = {};
    this.cells = {};
    kids(this.sheetData, 'row').forEach(function (r) {
      var rn = +r.getAttribute('r');
      self.rows[rn] = r;
      kids(r, 'c').forEach(function (c) { self.cells[c.getAttribute('r')] = c; });
    });
    this.merges = [];
    this.mergeAt = {};
    var mc = kid(root, 'mergeCells');
    if (mc) kids(mc, 'mergeCell').forEach(function (m) {
      var g = parseRange(m.getAttribute('ref'));
      self.merges.push(g);
      for (var rr = g.r1; rr <= g.r2; rr++) for (var cc = g.c1; cc <= g.c2; cc++) self.mergeAt[rr + ':' + cc] = g;
    });
    this.colWidth = {};
    var cols = kid(root, 'cols');
    var fmt = kid(root, 'sheetFormatPr');
    this.defaultWidth = fmt && fmt.getAttribute('defaultColWidth') ? +fmt.getAttribute('defaultColWidth') : 8.43;
    if (cols) kids(cols, 'col').forEach(function (c) {
      for (var i = +c.getAttribute('min'); i <= +c.getAttribute('max'); i++) self.colWidth[i] = +(c.getAttribute('width') || self.defaultWidth);
    });
  };
  Sheet.prototype.region = function (r) {
    var p = typeof r === 'string' ? parseRef(r) : r;
    return this.mergeAt[p.row + ':' + p.col] || { r1: p.row, r2: p.row, c1: p.col, c2: p.col };
  };
  Sheet.prototype.text = function (r) {
    var c = this.cells[r];
    if (!c) return '';
    var t = c.getAttribute('t');
    if (t === 's') { var v = kid(c, 'v'); return v ? this.book.sst[+v.textContent] || '' : ''; }
    if (t === 'inlineStr') { var is = kid(c, 'is'); return is ? textOf(is) : ''; }
    var vv = kid(c, 'v');
    return vv ? vv.textContent : '';
  };
  // 文字を含むセルを探す（上から順。after: この行より下から探す）
  Sheet.prototype.find = function (needle, opts) {
    opts = opts || {};
    var self = this, hits = [];
    Object.keys(this.cells).forEach(function (r) {
      var p = parseRef(r);
      if (opts.after && p.row <= opts.after) return;
      if (opts.before && p.row >= opts.before) return;
      if (opts.col && p.col !== colToNum(opts.col)) return;
      var t = self.text(r);
      if (needle instanceof RegExp ? needle.test(t) : t.indexOf(needle) >= 0) hits.push(p);
    });
    hits.sort(function (a, b) { return a.row - b.row || a.col - b.col; });
    var h = hits[opts.nth || 0];
    return h ? ref(h.col, h.row) : null;
  };
  Sheet.prototype.findAll = function (needle, opts) {
    var out = [], o = Object.assign({}, opts || {}), r;
    for (var i = 0; (r = this.find(needle, Object.assign({}, o, { nth: i }))); i++) out.push(r);
    return out;
  };
  // 見出しセルの右隣（結合範囲の次）のセル
  Sheet.prototype.rightOf = function (r) {
    var g = this.region(r);
    return ref(g.c2 + 1, g.r1);
  };
  Sheet.prototype.leftOf = function (r) {
    var g = this.region(r);
    var left = this.region({ col: g.c1 - 1, row: g.r1 });
    return ref(left.c1, left.r1);
  };
  Sheet.prototype.below = function (r) {
    var g = this.region(r);
    var b = this.region({ col: g.c1, row: g.r2 + 1 });
    return ref(b.c1, b.r1);
  };
  Sheet.prototype._cell = function (r) {
    if (this.cells[r]) return this.cells[r];
    var p = parseRef(r), doc = this.doc;
    var row = this.rows[p.row];
    if (!row) {
      row = doc.createElementNS(NS, 'row');
      row.setAttribute('r', String(p.row));
      var before = null;
      kids(this.sheetData, 'row').some(function (x) { if (+x.getAttribute('r') > p.row) { before = x; return true; } return false; });
      this.sheetData.insertBefore(row, before);
      this.rows[p.row] = row;
    }
    var c = doc.createElementNS(NS, 'c');
    c.setAttribute('r', r);
    var beforeCell = null;
    kids(row, 'c').some(function (x) { if (parseRef(x.getAttribute('r')).col > p.col) { beforeCell = x; return true; } return false; });
    // 結合範囲の左上セルの書式を引き継ぐ
    var g = this.region(p);
    var tl = this.cells[ref(g.c1, g.r1)];
    if (tl && tl.getAttribute('s')) c.setAttribute('s', tl.getAttribute('s'));
    row.insertBefore(c, beforeCell);
    this.cells[r] = c;
    return c;
  };
  Sheet.prototype.set = function (r, value, opts) {
    opts = opts || {};
    var c = this._cell(r);
    ['f', 'v', 'is'].forEach(function (n) { var x; while ((x = kid(c, n))) c.removeChild(x); });
    c.removeAttribute('t');
    if (value === null || value === undefined || value === '') return;
    this.book.ensurePlain(c);
    if (typeof value === 'number') {
      var v = this.doc.createElementNS(NS, 'v'); v.textContent = String(value); c.appendChild(v);
    } else {
      c.setAttribute('t', 'inlineStr');
      var is = this.doc.createElementNS(NS, 'is'), t = this.doc.createElementNS(NS, 't');
      t.setAttributeNS('http://www.w3.org/XML/1998/namespace', 'xml:space', 'preserve');
      t.textContent = String(value);
      is.appendChild(t); c.appendChild(is);
      if (opts.wrap !== false) this.book.ensureWrap(c);
    }
    if (opts.fit !== false) this.fit(r);
  };
  // 文字の一部を書き換える
  Sheet.prototype.edit = function (r, fn) {
    if (!r) return;
    var before = this.text(r);
    var after = fn(before);
    if (after !== before) this.set(r, after);
  };
  // 書き込んだ文字が収まるように行の高さを広げる（結合セルは Excel が自動調整しないため）
  Sheet.prototype.fit = function (r) {
    var g = this.region(r), self = this;
    var width = 0;
    for (var c = g.c1; c <= g.c2; c++) width += this.colWidth[c] || this.defaultWidth;
    var cell = this.cells[ref(g.c1, g.r1)];
    var size = this.book.fontSize(cell ? +(cell.getAttribute('s') || 0) : 0);
    var px = width * 7 + 5;
    var cap = Math.max(1, px / (size * 96 / 72) - 0.5);
    var text = this.text(ref(g.c1, g.r1));
    var lines = 0;
    text.split('\n').forEach(function (seg) { lines += Math.max(1, Math.ceil(units(seg) / cap)); });
    var need = lines * size * 1.5 + 2;
    var have = 0;
    for (var rr = g.r1; rr <= g.r2; rr++) have += this.rowHeight(rr);
    if (need > have + 0.5) {
      var last = g.r2;
      var row = this.rows[last] || (this._cell(ref(g.c1, last)), this.rows[last]);
      row.setAttribute('ht', String(Math.round((this.rowHeight(last) + need - have) * 100) / 100));
      row.setAttribute('customHeight', '1');
    }
  };
  Sheet.prototype.rowHeight = function (rn) {
    var row = this.rows[rn];
    if (row && row.getAttribute('ht')) return +row.getAttribute('ht');
    var fmt = kid(this.doc.documentElement, 'sheetFormatPr');
    return fmt && fmt.getAttribute('defaultRowHeight') ? +fmt.getAttribute('defaultRowHeight') : 15;
  };

  // ---------- 文字列の加工 ----------
  // 全角スペースの連続（空欄）。先頭の字下げは除く
  function blankRuns(text) {
    var re = /[　 ]{2,}/g, m, out = [];
    while ((m = re.exec(text))) if (m.index > 0) out.push({ i: m.index, len: m[0].length });
    return out;
  }
  // n 番目の空欄に値を入れる（{番号: 値}）。空欄の前後に全角スペースを1つずつ残す
  function slots(text, map) {
    var runs = blankRuns(text);
    var keys = Object.keys(map).map(Number).sort(function (a, b) { return b - a; });
    keys.forEach(function (k) {
      var run = runs[k];
      var v = map[k];
      if (!run || v === undefined || v === null || v === '') return;
      text = text.slice(0, run.i) + '　' + v + '　' + text.slice(run.i + run.len);
    });
    return text;
  }
  // 「□ ラベル」の□を■にする
  function check(text, label, on) {
    if (!on) return text;
    var esc = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return text.replace(new RegExp('□([\\s\\u3000]*' + esc + ')'), '■$1');
  }

  // ================= ブック =================
  function Book() {}
  Book.load = function (data) {
    var book = new Book();
    return JSZip.loadAsync(typeof data === 'string' ? b64ToBytes(data) : data).then(function (zip) {
      book.zip = zip;
      return Promise.all(['xl/workbook.xml', 'xl/_rels/workbook.xml.rels', '[Content_Types].xml', 'xl/styles.xml', 'xl/sharedStrings.xml'].map(function (p) {
        return zip.file(p) ? zip.file(p).async('string') : Promise.resolve(null);
      }));
    }).then(function (res) {
      book.wb = parseXml(res[0]);
      book.rels = parseXml(res[1]);
      book.ct = parseXml(res[2]);
      book.styles = parseXml(res[3]);
      book.sst = res[4] ? kids(parseXml(res[4]).documentElement, 'si').map(textOf) : [];
      var relMap = {};
      kids(book.rels.documentElement, 'Relationship').forEach(function (r) { relMap[r.getAttribute('Id')] = r; });
      book.relMap = relMap;
      book.order = kids(kid(book.wb.documentElement, 'sheets'), 'sheet').map(function (s) {
        var rid = s.getAttributeNS(NS_R, 'id');
        return { name: s.getAttribute('name'), path: resolve('xl/workbook.xml', relMap[rid].getAttribute('Target')), el: s };
      });
      book.loaded = {};
      book._fonts = kids(kid(book.styles.documentElement, 'fonts'), 'font').map(function (f) {
        var sz = kid(f, 'sz'); return sz ? +sz.getAttribute('val') : 11;
      });
      book._xfs = kids(kid(book.styles.documentElement, 'cellXfs'), 'xf');
      book._wrapXf = {};
      book._plainXf = {};
      return book;
    });
  };
  Book.prototype.names = function () { return this.order.map(function (s) { return s.name; }); };
  Book.prototype.fontSize = function (s) {
    var xf = this._xfs[s];
    return xf ? this._fonts[+(xf.getAttribute('fontId') || 0)] || 11 : 11;
  };
  // 折り返し表示の書式にする（文字が長くなっても隣のセルにはみ出さないように）
  Book.prototype.ensureWrap = function (c) {
    var s = +(c.getAttribute('s') || 0);
    var xf = this._xfs[s];
    if (!xf) return;
    var al = kid(xf, 'alignment');
    if (al && al.getAttribute('wrapText') === '1') return;
    if (this._wrapXf[s] === undefined) {
      var copy = xf.cloneNode(true);
      var a = kid(copy, 'alignment');
      if (!a) { a = this.styles.createElementNS(NS, 'alignment'); copy.appendChild(a); }
      a.setAttribute('wrapText', '1');
      if (!a.getAttribute('vertical')) a.setAttribute('vertical', 'center');
      copy.setAttribute('applyAlignment', '1');
      var xfs = kid(this.styles.documentElement, 'cellXfs');
      xfs.appendChild(copy);
      this._xfs.push(copy);
      xfs.setAttribute('count', String(this._xfs.length));
      this._wrapXf[s] = this._xfs.length - 1;
    }
    c.setAttribute('s', String(this._wrapXf[s]));
  };
  // 取消線・赤字の書式（様式の記入例などの名残り）のセルに書くときは、通常の黒字にする
  Book.prototype.ensurePlain = function (c) {
    var s = +(c.getAttribute('s') || 0);
    var xf = this._xfs[s];
    if (!xf) return;
    var fonts = kid(this.styles.documentElement, 'fonts');
    var fontEls = kids(fonts, 'font');
    var fid = +(xf.getAttribute('fontId') || 0);
    var f = fontEls[fid];
    if (!f) return;
    var strike = kid(f, 'strike'), color = kid(f, 'color');
    var red = color && /^(FF)?FF0000$/i.test(color.getAttribute('rgb') || '');
    if (!(strike && strike.getAttribute('val') !== '0') && !red) return;
    if (this._plainXf[s] === undefined) {
      var nf = f.cloneNode(true);
      [kid(nf, 'strike'), red ? kid(nf, 'color') : null].forEach(function (x) { if (x) nf.removeChild(x); });
      fonts.appendChild(nf);
      fonts.setAttribute('count', String(fontEls.length + 1));
      this._fonts.push(this._fonts[fid]);
      var copy = xf.cloneNode(true);
      copy.setAttribute('fontId', String(fontEls.length));
      copy.setAttribute('applyFont', '1');
      var xfs = kid(this.styles.documentElement, 'cellXfs');
      xfs.appendChild(copy);
      this._xfs.push(copy);
      xfs.setAttribute('count', String(this._xfs.length));
      this._plainXf[s] = this._xfs.length - 1;
    }
    c.setAttribute('s', String(this._plainXf[s]));
  };
  Book.prototype.sheet = function (name) {
    var self = this;
    var info = this.order.filter(function (s) { return s.name === name; })[0];
    if (!info) return Promise.resolve(null);
    if (this.loaded[name]) return Promise.resolve(this.loaded[name]);
    var p = info.xml ? Promise.resolve(info.xml) : this.zip.file(info.path).async('string');
    return p.then(function (xml) {
      var sh = new Sheet(self, name, info.path, parseXml(xml));
      self.loaded[name] = sh;
      return sh;
    });
  };
  // シートを複製（図形の関係ファイルも複製）
  Book.prototype.copySheet = function (src, newName) {
    var self = this;
    var info = this.order.filter(function (s) { return s.name === src; })[0];
    var n = 1;
    var used = {};
    Object.keys(this.zip.files).forEach(function (p) { var m = /^xl\/worksheets\/sheet(\d+)\.xml$/.exec(p); if (m) used[+m[1]] = true; });
    this.order.forEach(function (s) { var m = /sheet(\d+)\.xml$/.exec(s.path); if (m) used[+m[1]] = true; });
    while (used[n]) n++;
    var path = 'xl/worksheets/sheet' + n + '.xml';
    var loaded = this.loaded[src];
    var xmlP = loaded ? Promise.resolve(xmlString(loaded.doc)) : this.zip.file(info.path).async('string');
    return xmlP.then(function (xml) {
      self.zip.file(path, xml);
      var relsPath = info.path.replace('worksheets/', 'worksheets/_rels/') + '.rels';
      var relP = self.zip.file(relsPath) ? self.zip.file(relsPath).async('string') : Promise.resolve(null);
      return relP.then(function (relXml) {
        if (!relXml) return;
        var rels = parseXml(relXml);
        var jobs = kids(rels.documentElement, 'Relationship').map(function (r) {
          if (!/\/drawing$/.test(r.getAttribute('Type'))) return Promise.resolve();
          var dpath = resolve(info.path, r.getAttribute('Target'));
          var dn = 1;
          while (self.zip.file('xl/drawings/drawing' + dn + '.xml')) dn++;
          var newD = 'xl/drawings/drawing' + dn + '.xml';
          return self.zip.file(dpath).async('string').then(function (dx) {
            self.zip.file(newD, dx);
            r.setAttribute('Target', '../drawings/drawing' + dn + '.xml');
            self._addOverride('/' + newD, 'application/vnd.openxmlformats-officedocument.drawing+xml');
          });
        });
        return Promise.all(jobs).then(function () {
          self.zip.file(path.replace('worksheets/', 'worksheets/_rels/') + '.rels', xmlString(rels));
        });
      });
    }).then(function () {
      var rid = 'rIdS' + n;
      var rel = self.rels.createElementNS(NS_PKG, 'Relationship');
      rel.setAttribute('Id', rid);
      rel.setAttribute('Type', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet');
      rel.setAttribute('Target', 'worksheets/sheet' + n + '.xml');
      self.rels.documentElement.appendChild(rel);
      self._addOverride('/' + path, 'application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml');
      var el = self.wb.createElementNS(NS, 'sheet');
      el.setAttribute('name', newName);
      var maxId = 0;
      self.order.forEach(function (s) { maxId = Math.max(maxId, +s.el.getAttribute('sheetId')); });
      el.setAttribute('sheetId', String(maxId + 1));
      el.setAttributeNS(NS_R, 'r:id', rid);
      self.order.push({ name: newName, path: path, el: el, copyOf: src });
      return self.sheet(newName);
    });
  };
  Book.prototype._addOverride = function (part, type) {
    var o = this.ct.createElementNS(NS_CT, 'Override');
    o.setAttribute('PartName', part);
    o.setAttribute('ContentType', type);
    this.ct.documentElement.appendChild(o);
  };
  /*
   * 出力：names の順にシートを並べ、それ以外のシートは削除する
   */
  Book.prototype.toBlob = function (names) {
    var self = this;
    var keep = names.map(function (n) { return self.order.filter(function (s) { return s.name === n; })[0]; }).filter(Boolean);
    var keepPaths = {};
    keep.forEach(function (s) { keepPaths[s.path] = true; });
    // 印刷範囲などの定義名（元シートのものを引き継ぐ）
    var wbRoot = this.wb.documentElement;
    var dn = kid(wbRoot, 'definedNames');
    var oldIndex = {};
    kids(kid(wbRoot, 'sheets'), 'sheet').forEach(function (s, i) { oldIndex[i] = s.getAttribute('name'); });
    var names0 = [];
    if (dn) kids(dn, 'definedName').forEach(function (d) {
      names0.push({ name: d.getAttribute('name'), sheet: oldIndex[+d.getAttribute('localSheetId')], text: d.textContent });
      dn.removeChild(d);
    });
    var sheetsEl = kid(wbRoot, 'sheets');
    kids(sheetsEl, 'sheet').forEach(function (s) { sheetsEl.removeChild(s); });
    keep.forEach(function (s, i) {
      sheetsEl.appendChild(s.el);
      var src = s.copyOf || s.name;
      names0.filter(function (d) { return d.sheet === src; }).forEach(function (d) {
        if (!dn) { dn = self.wb.createElementNS(NS, 'definedNames'); sheetsEl.parentNode.insertBefore(dn, sheetsEl.nextSibling); }
        var x = self.wb.createElementNS(NS, 'definedName');
        x.setAttribute('name', d.name);
        x.setAttribute('localSheetId', String(i));
        x.textContent = d.text.split("'" + src + "'!").join("'" + s.name + "'!").split(src + '!').join("'" + s.name + "'!");
        dn.appendChild(x);
      });
    });
    if (dn && !kids(dn).length) dn.parentNode.removeChild(dn);
    var bv = kid(wbRoot, 'bookViews');
    if (bv) kids(bv, 'workbookView').forEach(function (v) { v.setAttribute('activeTab', '0'); v.setAttribute('firstSheet', '0'); });
    // 使わないシートのファイルと関係を削除
    kids(this.rels.documentElement, 'Relationship').forEach(function (r) {
      if (!/\/worksheet$/.test(r.getAttribute('Type'))) return;
      var p = resolve('xl/workbook.xml', r.getAttribute('Target'));
      if (!keepPaths[p]) {
        self.rels.documentElement.removeChild(r);
        self.zip.remove(p);
        self.zip.remove(p.replace('worksheets/', 'worksheets/_rels/') + '.rels');
        kids(self.ct.documentElement, 'Override').forEach(function (o) { if (o.getAttribute('PartName') === '/' + p) self.ct.documentElement.removeChild(o); });
      }
    });
    keep.forEach(function (s, i) {
      var sh = self.loaded[s.name];
      if (sh) {
        // 先頭のシートだけを選択状態にする
        var views = kid(sh.doc.documentElement, 'sheetViews');
        if (views) kids(views, 'sheetView').forEach(function (v) { if (i) v.removeAttribute('tabSelected'); else v.setAttribute('tabSelected', '1'); });
        self.zip.file(s.path, xmlString(sh.doc));
      }
    });
    this.zip.remove('xl/calcChain.xml');
    kids(this.ct.documentElement, 'Override').forEach(function (o) { if (o.getAttribute('PartName') === '/xl/calcChain.xml') self.ct.documentElement.removeChild(o); });
    this.zip.file('xl/workbook.xml', xmlString(this.wb));
    this.zip.file('xl/_rels/workbook.xml.rels', xmlString(this.rels));
    this.zip.file('[Content_Types].xml', xmlString(this.ct));
    this.zip.file('xl/styles.xml', xmlString(this.styles));
    return this.zip.generateAsync({ type: 'blob', compression: 'DEFLATE', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  };

  window.SKS = window.SKS || {};
  window.SKS.Xlsx = { Book: Book, slots: slots, check: check, blankRuns: blankRuns, parseRef: parseRef, ref: ref, colToNum: colToNum, numToCol: numToCol };
})();
