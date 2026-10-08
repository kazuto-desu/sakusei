/*
 * 申請書類を Excel（公式参考様式のひな形）で作成する
 *   - 選んだ書類をすべて1つの .xlsx にまとめる（1書類＝1シート、個人ごとの書類は1人1シート）
 *   - 同時申請で連名にする書類は1シートにまとめ、名簿（別紙）のシートを付ける
 *   - 翻訳言語がミャンマー語のときは、公式のミャンマー語併記版のシートを使う
 * 処理はすべてブラウザ内で行い、通信はしない。
 */
(function () {
  'use strict';
  var SKS = window.SKS, X = SKS.Xlsx, I = SKS.Inputs;
  var ROSTER_ROWS = 20;

  // Excel のシート名に使えない文字を除き、31文字以内で重複しない名前にする
  function sheetName(base, used) {
    var b = String(base).replace(/[\\\/\?\*\[\]:]/g, '').replace(/^'+|'+$/g, '').slice(0, 31) || 'Sheet';
    var name = b, i = 2;
    while (used[name]) { var suf = '(' + i++ + ')'; name = b.slice(0, 31 - suf.length) + suf; }
    used[name] = true;
    return name;
  }
  function personLabel(w, i) {
    var n = (w && w.name || '').trim();
    return n ? n.split(/\s+/)[0] : '申請人' + (i + 1);
  }

  /*
   * 作るシートの一覧
   * 戻り値: [{ doc, sheet(ひな形のシート名), name(出力シート名), ctx, roster }]
   */
  function plan(c, state, ids) {
    var jobs = [], used = {};
    var wids = (c.workerIds || []).length ? c.workerIds : [null];
    var my = (c.schedule || {}).lang === 'ミャンマー語';
    var multi = wids.length > 1;
    SKS.DOCS.filter(function (d) { return ids.indexOf(d.id) >= 0; }).forEach(function (d) {
      var combined = I.isCombined(c, d);
      var targets = combined ? [{ wid: wids[0], combined: true }] : wids.map(function (wid) { return { wid: wid, combined: false }; });
      targets.forEach(function (t, ti) {
        var ctx = I.context(c, state, t.wid, t.combined);
        var sheets = d.sheets.map(function (s) { return my && d.my && d.my[s] ? d.my[s] : s; });
        var extra = my && d.myExtra ? d.myExtra : [];
        sheets.concat(extra).forEach(function (s) {
          if (d.skip && d.skip(ctx, s)) return;
          var base = s + (multi && !t.combined ? '_' + personLabel(ctx.worker, ti) : '');
          // extra: 翻訳文の参考シート（自動入力しない）
          jobs.push({ doc: d, sheet: s, name: sheetName(base, used), ctx: ctx, extra: extra.indexOf(s) >= 0 });
        });
        if (t.combined) jobs.push({ doc: d, sheet: '別紙名簿', name: sheetName(d.id + '別紙（名簿）', used), ctx: ctx, roster: true });
      });
    });
    return jobs;
  }

  // 立証資料の対象となる申請人の名簿（参考様式・補助用紙）
  var ZEN = '０１２３４５６７８９';
  function zen(n) { return String(n).replace(/[0-9]/g, function (d) { return ZEN[+d]; }); }
  function fillRoster(sh, ctx, doc) {
    var no = doc.no.replace('参考様式第', '').replace('号', '').replace(/(\d+)-(\d+)/, function (m, a, b) { return zen(a) + '－' + zen(b); });
    sh.set('A3', '立証資料の名称　　' + doc.title.replace(/（.*）$/, '') + '（参考様式第' + no + '号）', { fit: false });
    if (doc.signDate) sh.set('F4', '署名日・署　名', { fit: false });
    ctx.workers.forEach(function (w, i) {
      var r1 = 5 + i * 2, r2 = r1 + 1;
      if (i >= ROSTER_ROWS) {
        // 枠を超えた分は下に追記する
        sh.set(X.ref(1, r1), zen(i + 1), { fit: false });
        sh.set(X.ref(4, r1), '年', { fit: false });
        sh.set(X.ref(4, r2), '月　　日', { fit: false });
        sh.set(X.ref(5, r1), '男 ・ 女', { fit: false });
      }
      var bd = SKS.FillUtil.ymd(w.birthDate);
      if (w.name) sh.set(X.ref(2, r1), w.name);
      if (w.nationality) sh.set(X.ref(3, r1), w.nationality);
      if (bd) { sh.set(X.ref(4, r1), bd.y + '年', { fit: false }); sh.set(X.ref(4, r2), bd.m + '月　' + bd.d + '日', { fit: false }); }
      if (w.gender) sh.edit(X.ref(5, r1), function (t) { return SKS.FillUtil.pick(t, '男', '女', w.gender); });
      if (doc.signDate) sh.set(X.ref(6, r1), '署名日：　　年　　月　　日', { fit: false });
    });
  }

  /*
   * Excel ファイルを作る。戻り値: Promise<{ blob, sheets: [出力シート名], errors: [] }>
   */
  function build(c, state, ids) {
    var jobs = plan(c, state, ids);
    var errors = [];
    if ((c.workerIds || []).length > ROSTER_ROWS && jobs.some(function (j) { return j.roster; })) {
      errors.push('名簿の枠は' + ROSTER_ROWS + '名分です。' + (ROSTER_ROWS + 1) + '人目以降は枠の下に追記しています。罫線を追加してください。');
    }
    return X.Book.load(SKS.TEMPLATE_XLSX).then(function (book) {
      var seq = Promise.resolve();
      jobs.forEach(function (job) {
        seq = seq.then(function () { return book.copySheet(job.sheet, job.name); }).then(function (sh) {
          if (!sh) { errors.push(job.name + '：ひな形のシートがありません'); return; }
          try {
            if (job.roster) fillRoster(sh, job.ctx, job.doc);
            else if (!job.extra) {
              var key = job.sheet.replace('(MY)', '');
              var fn = SKS.FILL[key];
              if (fn) fn(sh, job.ctx);
            }
          } catch (e) {
            console.error(e);
            errors.push(job.name + '：一部の欄を自動入力できませんでした（' + e.message + '）');
          }
        });
      });
      return seq.then(function () {
        return book.toBlob(jobs.map(function (j) { return j.name; }));
      }).then(function (blob) {
        return { blob: blob, sheets: jobs.map(function (j) { return j.name; }), errors: errors };
      });
    });
  }

  SKS.Export = { plan: plan, build: build, ROSTER_ROWS: ROSTER_ROWS };
})();
