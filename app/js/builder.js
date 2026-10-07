/*
 * 案件データ → Excelセルへの書き込み内容を組み立てる
 */
(function () {
  'use strict';
  var F = window.SKS.FIELDS;
  var X = window.SKS.Xlsx;
  var normalize = X.Template.normalizeSheetName;

  function isEmpty(v) { return v === undefined || v === null || String(v).trim() === ''; }
  function toNumber(v) {
    var n = parseFloat(String(v).replace(/[,，円\s]/g, ''));
    return isNaN(n) ? null : n;
  }

  // 値を書式に従ってセル値に変換
  function convert(value, fmt, fieldType) {
    if (isEmpty(value)) return { t: 'clear' };
    var s = String(value).trim();
    if (fmt === 'date') { var d = X.dateToSerial(s); return d === null ? { t: 's', v: s } : { t: 'n', v: d }; }
    if (fmt === 'time') { var tm = X.timeToFraction(s); return tm === null ? { t: 's', v: s } : { t: 'n', v: tm }; }
    if (fmt === 'year' || fmt === 'month' || fmt === 'day') {
      var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
      if (!m) return { t: 'clear' };
      return { t: 'n', v: parseInt(fmt === 'year' ? m[1] : fmt === 'month' ? m[2] : m[3], 10) };
    }
    if (fmt && fmt.indexOf('digit:') === 0) {
      var digits = s.replace(/\D/g, '');
      var ch = digits.charAt(parseInt(fmt.slice(6), 10));
      return ch === '' ? { t: 'clear' } : { t: 'n', v: parseInt(ch, 10) };
    }
    if (fmt === 'text') return { t: 's', v: s };
    if (fmt === 'number' || fieldType === 'number') { var n = toNumber(s); return n === null ? { t: 's', v: s } : { t: 'n', v: n }; }
    return { t: 's', v: s };
  }

  function convertGeneric(value, kind) {
    if (isEmpty(value)) return { t: 'clear' };
    if (kind === 'date') return convert(value, 'date');
    if (kind === 'time') return convert(value, 'time');
    if (kind === 'number') return convert(value, 'number');
    return { t: 's', v: String(value) };
  }

  function Writes() { this.map = {}; this.mapped = {}; }
  Writes.prototype.set = function (sheet, cell, value) {
    var k = normalize(sheet);
    (this.map[k] = this.map[k] || {})[cell] = value;
    this.mapped[k + '!' + cell] = true;
  };
  Writes.prototype.setGeneric = function (sheetKey, cell, value) {
    if (this.mapped[sheetKey + '!' + cell]) return;
    (this.map[sheetKey] = this.map[sheetKey] || {})[cell] = value;
  };

  function applyFields(w, defs, obj) {
    obj = obj || {};
    defs.forEach(function (def) {
      if (!def.cells) return;
      var v = obj[def.key];
      if (def.keepTemplateIfEmpty && isEmpty(v)) return;
      def.cells.forEach(function (c) { w.set(c.sheet, c.cell, convert(v, c.fmt, def.type)); });
    });
  }

  // 書き込み対象として扱う（＝様式ごとの入力欄に出さない）セルの一覧
  function mappedCellSet() {
    var set = {};
    function add(c) { set[normalize(c.sheet) + '!' + c.cell] = true; }
    ['worker', 'company', 'support', 'agent', 'schedule', 'labor', 'salary', 'deductions'].forEach(function (g) {
      F[g].forEach(function (d) { (d.cells || []).forEach(add); });
    });
    F.allowanceCells.forEach(function (a) { add(a.name); add(a.amount); add(a.kind); });
    F.otherDeductionCells.forEach(function (a) { add(a.name); add(a.amount); });
    var off = F.company.filter(function (d) { return d.key === 'officers'; })[0];
    for (var i = 0; i < off.max; i++) { var rc = off.rowCells(i); add(rc.kana); add(rc.name); add(rc.title); }
    return set;
  }

  /*
   * ctx: { case, worker, company, support, agent, template(meta), inputs: {sheetKey: [scan results]} }
   */
  function build(ctx) {
    var w = new Writes();
    var c = ctx.case;
    applyFields(w, F.worker, ctx.worker);
    applyFields(w, F.company.filter(function (d) { return d.type !== 'list'; }), ctx.company);
    applyFields(w, F.support, ctx.support);
    applyFields(w, F.agent, ctx.agent);
    applyFields(w, F.schedule, c.schedule);
    applyFields(w, F.labor, c.labor);
    applyFields(w, F.salary, c.salary);
    applyFields(w, F.deductions, (c.salary || {}).deductions);

    var allowances = (c.salary || {}).allowances || [];
    F.allowanceCells.forEach(function (cells, i) {
      var a = allowances[i] || {};
      w.set(cells.name.sheet, cells.name.cell, convert(a.name));
      w.set(cells.amount.sheet, cells.amount.cell, convert(a.amount, 'number'));
      w.set(cells.kind.sheet, cells.kind.cell, convert(isEmpty(a.name) && isEmpty(a.amount) ? '' : a.kind, 'number'));
    });
    var others = (c.salary || {}).otherDeductions || [];
    F.otherDeductionCells.forEach(function (cells, i) {
      var o = others[i] || {};
      w.set(cells.name.sheet, cells.name.cell, convert(o.name));
      w.set(cells.amount.sheet, cells.amount.cell, convert(o.amount, 'number'));
    });
    var off = F.company.filter(function (d) { return d.key === 'officers'; })[0];
    var officers = (ctx.company || {}).officers || [];
    for (var i = 0; i < off.max; i++) {
      var o = officers[i] || {}, rc = off.rowCells(i);
      w.set(rc.kana.sheet, rc.kana.cell, convert(o.kana));
      w.set(rc.name.sheet, rc.name.cell, convert(o.name));
      w.set(rc.title.sheet, rc.title.cell, convert(o.title));
    }

    // 様式ごとの入力欄：案件の値 → ひな形の既定値 → （どちらも無ければExcelのまま）
    var caseVals = c.sheetValues || {};
    var tplVals = (ctx.template && ctx.template.defaults) || {};
    Object.keys(ctx.inputs || {}).forEach(function (sk) {
      (ctx.inputs[sk] || []).forEach(function (inp) {
        var cv = (caseVals[sk] || {})[inp.cell];
        var tv = (tplVals[sk] || {})[inp.cell];
        if (cv !== undefined) w.setGeneric(sk, inp.cell, convertGeneric(cv, inp.kind));
        else if (tv !== undefined) w.setGeneric(sk, inp.cell, convertGeneric(tv, inp.kind));
      });
    });
    return w.map;
  }

  // 必須項目・整合性チェック
  function validate(ctx) {
    var issues = [];
    function req(defs, obj, area, link) {
      defs.forEach(function (d) {
        if (!d.key || d.type === 'list') return;
        var v = (obj || {})[d.key];
        if (d.required && isEmpty(v)) issues.push({ level: 'error', area: area, msg: d.label + ' が未入力です', link: link });
        if (!isEmpty(v) && d.pattern && !(new RegExp(d.pattern)).test(String(v).trim())) {
          issues.push({ level: 'warn', area: area, msg: d.label + ' の形式を確認してください（' + d.patternMsg + '）', link: link });
        }
      });
    }
    var c = ctx.case;
    if (!ctx.worker) issues.push({ level: 'error', area: '紐付け', msg: '外国人（申請人）が選択されていません', link: 'basic' });
    else req(F.worker, ctx.worker, '外国人', '#/worker/' + ctx.worker.id);
    if (!ctx.company) issues.push({ level: 'error', area: '紐付け', msg: '受入機関が選択されていません', link: 'basic' });
    else req(F.company, ctx.company, '受入機関', '#/company/' + ctx.company.id);
    if (!ctx.support) issues.push({ level: 'warn', area: '紐付け', msg: '登録支援機関が選択されていません（自社支援の場合は不要）', link: 'basic' });
    else req(F.support, ctx.support, '登録支援機関', '#/support/' + ctx.support.id);
    req(F.schedule, c.schedule, '日程・入国', 'schedule');
    req(F.labor, c.labor, '労働条件', 'salary');
    req(F.salary, c.salary, '給与', 'salary');

    var s = c.schedule || {}, wk = ctx.worker || {};
    var Calc = window.SKS.Calc;
    if (s.entryDate && wk.birthDate) {
      var age = Calc.ageAt(wk.birthDate, s.entryDate);
      if (age !== null && age < 18) issues.push({ level: 'error', area: '外国人', msg: '入国予定日時点で18歳未満です（' + age + '歳）' });
    }
    if (s.entryDate && wk.passportExpiry && wk.passportExpiry <= s.entryDate) {
      issues.push({ level: 'error', area: '外国人', msg: '旅券の有効期限が入国予定日より前です' });
    }
    if (s.contractDate && s.employStart && s.contractDate > s.employStart) issues.push({ level: 'warn', area: '日程', msg: '雇用契約締結日が雇用開始日より後になっています', link: 'schedule' });
    if (s.applyDate && s.contractDate && s.applyDate < s.contractDate) issues.push({ level: 'warn', area: '日程', msg: '申請日が雇用契約締結日より前になっています', link: 'schedule' });
    if (s.entryDate && s.employStart && s.employStart < s.entryDate) issues.push({ level: 'warn', area: '日程', msg: '雇用開始日が入国予定日より前になっています', link: 'schedule' });
    if (s.applyDate && s.entryDate && s.applyDate > s.entryDate) issues.push({ level: 'warn', area: '日程', msg: '申請日が入国予定日より後になっています', link: 'schedule' });

    Calc.compute(c).warnings.forEach(function (m) { issues.push({ level: 'warn', area: '給与・労働条件', msg: m, link: 'salary' }); });
    return issues;
  }

  window.SKS = window.SKS || {};
  window.SKS.Builder = { build: build, validate: validate, mappedCellSet: mappedCellSet, convert: convert, isEmpty: isEmpty };
})();
