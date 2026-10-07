/*
 * Excel（.xlsx）ひな形の読み込み・書き込みエンジン
 *
 * ひな形のXMLを直接書き換えるため、罫線・結合セル・図形・印刷設定など
 * 元の様式のレイアウトはそのまま保持されます。
 * 通信は一切行いません（ブラウザ内のみで処理）。
 */
(function () {
  'use strict';
  var NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  var NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  var NS_PKG_REL = 'http://schemas.openxmlformats.org/package/2006/relationships';

  // 「使用方法」シートで「記入、選択」を示す色（薄い黄色）
  var INPUT_FILL_RGB = ['FFFFFFCC'];

  // ---------- セル番地ユーティリティ ----------
  function colToNum(col) {
    var n = 0;
    for (var i = 0; i < col.length; i++) n = n * 26 + (col.charCodeAt(i) - 64);
    return n;
  }
  function numToCol(n) {
    var s = '';
    while (n > 0) {
      var m = (n - 1) % 26;
      s = String.fromCharCode(65 + m) + s;
      n = Math.floor((n - 1) / 26);
    }
    return s;
  }
  function parseRef(ref) {
    var m = /^\$?([A-Z]+)\$?(\d+)$/.exec(ref);
    if (!m) return null;
    return { col: colToNum(m[1]), row: parseInt(m[2], 10) };
  }
  function parseRange(rng) {
    var parts = rng.split(':');
    var a = parseRef(parts[0]);
    var b = parts[1] ? parseRef(parts[1]) : a;
    if (!a || !b) return null;
    return { r1: Math.min(a.row, b.row), r2: Math.max(a.row, b.row), c1: Math.min(a.col, b.col), c2: Math.max(a.col, b.col) };
  }

  // ---------- 日付・時刻 ----------
  var EPOCH = Date.UTC(1899, 11, 30);
  function dateToSerial(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    if (!m) return null;
    return (Date.UTC(+m[1], +m[2] - 1, +m[3]) - EPOCH) / 86400000;
  }
  function serialToDate(serial) {
    var d = new Date(EPOCH + Math.round(serial * 86400000));
    var p = function (x) { return (x < 10 ? '0' : '') + x; };
    return d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1) + '-' + p(d.getUTCDate());
  }
  function timeToFraction(hhmm) {
    var m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || '');
    if (!m) return null;
    return (+m[1] * 60 + +m[2]) / 1440;
  }
  function fractionToTime(f) {
    var mins = Math.round((f % 1) * 1440);
    var h = Math.floor(mins / 60), mi = mins % 60;
    return (h < 10 ? '0' : '') + h + ':' + (mi < 10 ? '0' : '') + mi;
  }

  // ---------- XML ----------
  function parseXml(text) {
    var doc = new DOMParser().parseFromString(text, 'application/xml');
    var err = doc.getElementsByTagName('parsererror');
    if (err.length) throw new Error('XMLの解析に失敗しました');
    return doc;
  }
  function serializeXml(doc) {
    var s = new XMLSerializer().serializeToString(doc);
    if (s.indexOf('<?xml') !== 0) s = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + s;
    return s;
  }
  function children(el, localName) {
    var out = [];
    for (var n = el.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 1 && (!localName || n.localName === localName)) out.push(n);
    }
    return out;
  }
  function child(el, localName) {
    for (var n = el.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 1 && n.localName === localName) return n;
    }
    return null;
  }
  function textOf(el) {
    // <si>/<is> 内の <t>（リッチテキストの <r><t> を含む）を連結。ふりがな <rPh> は除外
    var out = '';
    (function walk(node) {
      for (var n = node.firstChild; n; n = n.nextSibling) {
        if (n.nodeType !== 1) continue;
        if (n.localName === 'rPh' || n.localName === 'phoneticPr') continue;
        if (n.localName === 't') out += n.textContent;
        else walk(n);
      }
    })(el);
    return out;
  }

  function resolvePath(base, target) {
    if (target.charAt(0) === '/') return target.slice(1);
    var parts = base.split('/');
    parts.pop();
    target.split('/').forEach(function (seg) {
      if (seg === '..') parts.pop();
      else if (seg !== '.') parts.push(seg);
    });
    return parts.join('/');
  }

  // ---------- ひな形の読み込み ----------
  function Template() {}

  Template.load = function (arrayBuffer) {
    var tpl = new Template();
    return JSZip.loadAsync(arrayBuffer).then(function (zip) {
      tpl.zip = zip;
      return Promise.all([
        zip.file('xl/workbook.xml').async('string'),
        zip.file('xl/_rels/workbook.xml.rels').async('string'),
        zip.file('xl/sharedStrings.xml') ? zip.file('xl/sharedStrings.xml').async('string') : Promise.resolve(null),
        zip.file('xl/styles.xml') ? zip.file('xl/styles.xml').async('string') : Promise.resolve(null)
      ]);
    }).then(function (res) {
      var wb = parseXml(res[0]);
      var rels = parseXml(res[1]);
      var relMap = {};
      children(rels.documentElement, 'Relationship').forEach(function (r) {
        relMap[r.getAttribute('Id')] = resolvePath('xl/workbook.xml', r.getAttribute('Target'));
      });
      tpl.sheets = children(child(wb.documentElement, 'sheets'), 'sheet').map(function (s, idx) {
        var name = s.getAttribute('name');
        return {
          index: idx,
          name: name,
          key: normalizeSheetName(name),
          path: relMap[s.getAttributeNS(NS_R, 'id') || s.getAttribute('r:id')],
          hidden: (s.getAttribute('state') || 'visible') !== 'visible'
        };
      });
      tpl.sharedStrings = [];
      if (res[2]) {
        var sst = parseXml(res[2]);
        children(sst.documentElement, 'si').forEach(function (si) { tpl.sharedStrings.push(textOf(si)); });
      }
      tpl._parseStyles(res[3]);
      tpl._sheetCache = {};
      return tpl;
    });
  };

  function normalizeSheetName(name) {
    return String(name).replace(/[\s　]+/g, '');
  }
  Template.normalizeSheetName = normalizeSheetName;

  Template.prototype._parseStyles = function (xml) {
    this.inputStyles = {};
    this.dateStyles = {};
    this.timeStyles = {};
    this.textStyles = {};
    if (!xml) return;
    var doc = parseXml(xml);
    var root = doc.documentElement;
    var inputFills = {};
    var fills = child(root, 'fills');
    if (fills) {
      children(fills, 'fill').forEach(function (f, i) {
        var pf = child(f, 'patternFill');
        if (!pf || pf.getAttribute('patternType') !== 'solid') return;
        var fg = child(pf, 'fgColor');
        var rgb = fg && (fg.getAttribute('rgb') || '').toUpperCase();
        if (rgb && INPUT_FILL_RGB.indexOf(rgb) >= 0) inputFills[i] = true;
      });
    }
    var customFmts = {};
    var numFmts = child(root, 'numFmts');
    if (numFmts) {
      children(numFmts, 'numFmt').forEach(function (nf) {
        customFmts[nf.getAttribute('numFmtId')] = nf.getAttribute('formatCode') || '';
      });
    }
    var self = this;
    var xfs = child(root, 'cellXfs');
    if (!xfs) return;
    children(xfs, 'xf').forEach(function (xf, i) {
      if (inputFills[xf.getAttribute('fillId')]) self.inputStyles[i] = true;
      var id = parseInt(xf.getAttribute('numFmtId') || '0', 10);
      var code = customFmts[id];
      if (id === 49 || code === '@') { self.textStyles[i] = true; return; }
      if ((id >= 18 && id <= 21) || id === 45 || id === 46 || id === 47) { self.timeStyles[i] = true; return; }
      if ((id >= 14 && id <= 17) || id === 22 || (id >= 27 && id <= 36) || (id >= 50 && id <= 58)) { self.dateStyles[i] = true; return; }
      if (code) {
        var c = code.replace(/"[^"]*"/g, '').replace(/\[[^\]]*\]/g, '').toLowerCase();
        if (/[yd]/.test(c) || /mmm/.test(c)) self.dateStyles[i] = true;
        else if (/h/.test(c) && /m/.test(c)) self.timeStyles[i] = true;
      }
    });
  };

  Template.prototype.findSheet = function (name) {
    var key = normalizeSheetName(name);
    for (var i = 0; i < this.sheets.length; i++) if (this.sheets[i].key === key) return this.sheets[i];
    return null;
  };

  Template.prototype._loadSheetDoc = function (sheet) {
    var self = this;
    if (self._sheetCache[sheet.path]) return Promise.resolve(self._sheetCache[sheet.path]);
    return self.zip.file(sheet.path).async('string').then(function (xml) {
      var doc = parseXml(xml);
      self._sheetCache[sheet.path] = doc;
      return doc;
    });
  };

  // セルの値（表示用の文字列）を取得
  Template.prototype._cellInfo = function (c) {
    var t = c.getAttribute('t') || 'n';
    var s = parseInt(c.getAttribute('s') || '0', 10);
    var f = child(c, 'f');
    var v = child(c, 'v');
    var info = { style: s, formula: null, value: '', type: 'empty' };
    if (f) info.formula = f.textContent || (f.getAttribute('t') === 'shared' ? '(共有数式)' : '');
    if (t === 's' && v) { info.value = this.sharedStrings[parseInt(v.textContent, 10)] || ''; info.type = 'string'; }
    else if (t === 'inlineStr') { var is = child(c, 'is'); info.value = is ? textOf(is) : ''; info.type = 'string'; }
    else if (t === 'str' && v) { info.value = v.textContent; info.type = 'string'; }
    else if (t === 'b' && v) { info.value = v.textContent === '1' ? 'TRUE' : 'FALSE'; info.type = 'string'; }
    else if (v && v.textContent !== '') {
      var num = parseFloat(v.textContent);
      if (this.dateStyles[s]) { info.value = serialToDate(num); info.type = 'date'; }
      else if (this.timeStyles[s]) { info.value = fractionToTime(num); info.type = 'time'; }
      else { info.value = String(num); info.type = 'number'; }
    }
    if (info.type === 'empty') {
      if (this.dateStyles[s]) info.type = 'date-empty';
      else if (this.timeStyles[s]) info.type = 'time-empty';
    }
    return info;
  };

  /*
   * 黄色（記入・選択）セルを抽出し、近くの見出し文字列からラベルを推定する。
   * 戻り値: [{cell, row, col, label, section, value, formula, kind, options}]
   */
  Template.prototype.scanInputs = function (sheetName) {
    var self = this;
    var sheet = self.findSheet(sheetName);
    if (!sheet) return Promise.resolve([]);
    return self._loadSheetDoc(sheet).then(function (doc) {
      var root = doc.documentElement;
      var nonTopLeft = {};
      var mc = child(root, 'mergeCells');
      if (mc) {
        children(mc, 'mergeCell').forEach(function (m) {
          var r = parseRange(m.getAttribute('ref'));
          if (!r) return;
          for (var rr = r.r1; rr <= r.r2; rr++)
            for (var cc = r.c1; cc <= r.c2; cc++)
              if (rr !== r.r1 || cc !== r.c1) nonTopLeft[rr + ':' + cc] = true;
        });
      }
      // 入力規則（リスト）
      var lists = [];
      var dvs = child(root, 'dataValidations');
      if (dvs) {
        children(dvs, 'dataValidation').forEach(function (dv) {
          if (dv.getAttribute('type') !== 'list') return;
          var f1 = child(dv, 'formula1');
          var txt = f1 ? f1.textContent : '';
          var m = /^"(.*)"$/.exec(txt);
          if (!m) return;
          var opts = m[1].split(',');
          (dv.getAttribute('sqref') || '').split(/\s+/).forEach(function (rng) {
            var r = parseRange(rng);
            if (r) lists.push({ r: r, options: opts });
          });
        });
      }
      function optionsFor(row, col) {
        for (var i = 0; i < lists.length; i++) {
          var r = lists[i].r;
          if (row >= r.r1 && row <= r.r2 && col >= r.c1 && col <= r.c2) return lists[i].options;
        }
        return null;
      }
      // 全セルを行ごとに収集
      var rows = {};
      var inputs = [];
      var sd = child(root, 'sheetData');
      children(sd, 'row').forEach(function (rowEl) {
        children(rowEl, 'c').forEach(function (c) {
          var ref = parseRef(c.getAttribute('r'));
          if (!ref) return;
          var info = self._cellInfo(c);
          info.cell = c.getAttribute('r');
          info.row = ref.row;
          info.col = ref.col;
          info.input = !!self.inputStyles[info.style] && !nonTopLeft[ref.row + ':' + ref.col];
          (rows[ref.row] = rows[ref.row] || []).push(info);
          if (info.input) inputs.push(info);
        });
      });
      function isLabelText(ci) {
        if (ci.input || ci.formula || ci.type !== 'string') return false;
        var s = ci.value.replace(/[\s　]/g, '');
        return s.length > 0;
      }
      function cleanLabel(s) { return s.replace(/[\r\n]+/g, ' ').replace(/[\s　]+/g, ' ').trim().slice(0, 60); }

      return inputs.map(function (ci) {
        var rowCells = rows[ci.row] || [];
        // 同じ行で左側の最も近い見出し
        var left = '';
        var leftCells = rowCells.filter(function (x) { return x.col < ci.col && isLabelText(x); })
          .sort(function (a, b) { return b.col - a.col; });
        if (leftCells.length) {
          left = leftCells[0].value;
          if (left.replace(/[\s　]/g, '').length <= 2 && leftCells[1]) left = leftCells[1].value + ' ' + left;
        }
        // 上方向の見出し（A〜D列のテキスト）
        var section = '';
        for (var r = ci.row; r >= Math.max(1, ci.row - 40); r--) {
          var cand = (rows[r] || []).filter(function (x) { return x.col <= 4 && x.col < ci.col && isLabelText(x); });
          if (cand.length) { section = cand[0].value; if (r !== ci.row || !left) break; }
          if (section) break;
        }
        var opts = optionsFor(ci.row, ci.col);
        var v = ci.value;
        var kind;
        var isCheck = /^[□■☑☐]$/.test(String(v).trim()) || (opts && opts.join('') === '□■');
        if (isCheck) {
          // チェック欄は右側に項目名がある（例: ■ Ｖ「特定技能（1号）」）
          var right = rowCells.filter(function (x) { return x.col > ci.col && x.col <= ci.col + 12 && isLabelText(x); })
            .sort(function (a, b) { return a.col - b.col; })[0];
          if (right) left = right.value;
        }
        if (isCheck && !opts) kind = 'check';
        else if (opts) kind = 'select';
        else if (ci.type === 'date' || ci.type === 'date-empty') kind = 'date';
        else if (ci.type === 'time' || ci.type === 'time-empty') kind = 'time';
        else if (ci.type === 'number') kind = 'number';
        else kind = 'text';
        return {
          cell: ci.cell, row: ci.row, col: ci.col,
          label: cleanLabel(left), section: cleanLabel(section) === cleanLabel(left) ? '' : cleanLabel(section),
          value: v, formula: ci.formula, kind: kind,
          options: opts || (kind === 'check' ? ['□', '■'] : null)
        };
      });
    });
  };

  // ---------- 書き込み ----------
  function findOrCreateCell(doc, ref) {
    var root = doc.documentElement;
    var sd = child(root, 'sheetData');
    var pr = parseRef(ref);
    var rowEl = null, beforeRow = null;
    var rows = children(sd, 'row');
    for (var i = 0; i < rows.length; i++) {
      var rn = parseInt(rows[i].getAttribute('r'), 10);
      if (rn === pr.row) { rowEl = rows[i]; break; }
      if (rn > pr.row) { beforeRow = rows[i]; break; }
    }
    if (!rowEl) {
      rowEl = doc.createElementNS(NS, 'row');
      rowEl.setAttribute('r', String(pr.row));
      sd.insertBefore(rowEl, beforeRow);
    }
    var cells = children(rowEl, 'c');
    var beforeCell = null;
    for (var j = 0; j < cells.length; j++) {
      var cr = parseRef(cells[j].getAttribute('r'));
      if (cr.col === pr.col) return cells[j];
      if (cr.col > pr.col) { beforeCell = cells[j]; break; }
    }
    var c = doc.createElementNS(NS, 'c');
    c.setAttribute('r', ref);
    // 行のスタイルを引き継ぐ
    if (rowEl.getAttribute('customFormat') === '1' && rowEl.getAttribute('s')) c.setAttribute('s', rowEl.getAttribute('s'));
    rowEl.insertBefore(c, beforeCell);
    return c;
  }

  function clearCellContent(c) {
    ['f', 'v', 'is'].forEach(function (n) {
      var el;
      while ((el = child(c, n))) c.removeChild(el);
    });
    c.removeAttribute('t');
  }

  /*
   * value: {t:'s', v:'文字列'} | {t:'n', v:数値} | {t:'clear'}
   */
  function writeCell(doc, ref, value) {
    var c = findOrCreateCell(doc, ref);
    var f = child(c, 'f');
    // 共有数式の起点セルを消すと、同じ数式を参照する他のセルが壊れるため上書きしない
    if (f && f.getAttribute('t') === 'shared' && f.getAttribute('ref')) return false;
    clearCellContent(c);
    if (!value || value.t === 'clear') return true;
    if (value.t === 'n') {
      var v = doc.createElementNS(NS, 'v');
      v.textContent = String(value.v);
      c.appendChild(v);
    } else {
      c.setAttribute('t', 'inlineStr');
      var is = doc.createElementNS(NS, 'is');
      var t = doc.createElementNS(NS, 't');
      t.setAttributeNS('http://www.w3.org/XML/1998/namespace', 'xml:space', 'preserve');
      t.textContent = String(value.v);
      is.appendChild(t);
      c.appendChild(is);
    }
    return true;
  }

  // 数式セルのキャッシュ値を削除（古い案件の値が残らないようにし、Excelに再計算させる）
  function stripFormulaCache(doc) {
    var cs = doc.getElementsByTagNameNS(NS, 'c');
    for (var i = 0; i < cs.length; i++) {
      var c = cs[i];
      if (!child(c, 'f')) continue;
      var v = child(c, 'v');
      if (v) c.removeChild(v);
      if (c.getAttribute('t') === 'str' || c.getAttribute('t') === 'e' || c.getAttribute('t') === 'b' || c.getAttribute('t') === 'n') c.removeAttribute('t');
    }
  }

  /*
   * writes: { シート名: { セル番地: value } }
   * opts: { stripMetadata: true }
   * 戻り値: Promise<Blob>
   */
  Template.prototype.exportFilled = function (writes, opts) {
    opts = opts || {};
    var self = this;
    // 元データを壊さないよう、ひな形を読み直してから書き込む
    return self.zip.generateAsync({ type: 'arraybuffer' }).then(function (buf) {
      return JSZip.loadAsync(buf);
    }).then(function (zip) {
      var missing = [];
      var skipped = [];
      var tasks = self.sheets.map(function (sheet) {
        var sheetWrites = null;
        Object.keys(writes).forEach(function (name) {
          if (normalizeSheetName(name) === sheet.key) sheetWrites = Object.assign(sheetWrites || {}, writes[name]);
        });
        return zip.file(sheet.path).async('string').then(function (xml) {
          var doc = parseXml(xml);
          if (sheetWrites) {
            Object.keys(sheetWrites).forEach(function (ref) {
              if (writeCell(doc, ref, sheetWrites[ref]) === false) skipped.push(sheet.name.trim() + '!' + ref);
            });
          }
          stripFormulaCache(doc);
          zip.file(sheet.path, serializeXml(doc));
        });
      });
      Object.keys(writes).forEach(function (name) {
        if (!self.findSheet(name)) missing.push(name);
      });
      return Promise.all(tasks).then(function () {
        return Promise.all([
          zip.file('xl/workbook.xml').async('string'),
          zip.file('xl/_rels/workbook.xml.rels').async('string'),
          zip.file('[Content_Types].xml').async('string'),
          zip.file('_rels/.rels').async('string'),
          zip.file('docProps/core.xml') ? zip.file('docProps/core.xml').async('string') : Promise.resolve(null)
        ]);
      }).then(function (res) {
        // 開いたときに全数式を再計算させる
        var wb = parseXml(res[0]);
        var calcPr = child(wb.documentElement, 'calcPr');
        if (!calcPr) {
          calcPr = wb.createElementNS(NS, 'calcPr');
          var after = child(wb.documentElement, 'definedNames') || child(wb.documentElement, 'sheets');
          wb.documentElement.insertBefore(calcPr, after.nextSibling);
        }
        calcPr.setAttribute('fullCalcOnLoad', '1');
        zip.file('xl/workbook.xml', serializeXml(wb));

        // 計算チェーンは再計算時に再生成されるため削除（数式を値に置き換えた場合の不整合を防ぐ）
        var wbRels = parseXml(res[1]);
        var ct = parseXml(res[2]);
        children(wbRels.documentElement, 'Relationship').forEach(function (r) {
          if (/\/calcChain$/.test(r.getAttribute('Type'))) wbRels.documentElement.removeChild(r);
        });
        zip.remove('xl/calcChain.xml');
        var removeParts = ['/xl/calcChain.xml'];

        if (opts.stripMetadata !== false) {
          // 作成者名・最終更新者（PC名など）を消去
          if (res[4]) {
            var core = parseXml(res[4]);
            ['creator', 'lastModifiedBy'].forEach(function (n) {
              var els = core.getElementsByTagName('*');
              for (var i = 0; i < els.length; i++) if (els[i].localName === n) els[i].textContent = '';
            });
            zip.file('docProps/core.xml', serializeXml(core));
          }
          // アドイン（作業ウィンドウ）の参照を削除
          var pkgRels = parseXml(res[3]);
          children(pkgRels.documentElement, 'Relationship').forEach(function (r) {
            if (/webextension/i.test(r.getAttribute('Type') || '') || /webextensions\//.test(r.getAttribute('Target') || '')) {
              pkgRels.documentElement.removeChild(r);
            }
          });
          zip.file('_rels/.rels', serializeXml(pkgRels));
          Object.keys(zip.files).forEach(function (p) {
            if (/^xl\/webextensions\//.test(p)) { zip.remove(p); removeParts.push('/' + p); }
          });
        }
        children(ct.documentElement, 'Override').forEach(function (o) {
          if (removeParts.indexOf(o.getAttribute('PartName')) >= 0) ct.documentElement.removeChild(o);
        });
        zip.file('xl/_rels/workbook.xml.rels', serializeXml(wbRels));
        zip.file('[Content_Types].xml', serializeXml(ct));
        return zip.generateAsync({
          type: 'blob',
          compression: 'DEFLATE',
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
      }).then(function (blob) {
        return { blob: blob, missingSheets: missing, skippedCells: skipped };
      });
    });
  };

  window.SKS = window.SKS || {};
  window.SKS.Xlsx = {
    Template: Template,
    colToNum: colToNum, numToCol: numToCol, parseRef: parseRef,
    dateToSerial: dateToSerial, serialToDate: serialToDate,
    timeToFraction: timeToFraction, fractionToTime: fractionToTime,
    NS_PKG_REL: NS_PKG_REL
  };
})();
