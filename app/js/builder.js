/*
 * 入力チェック（必須項目・形式・整合性）
 */
(function () {
  'use strict';
  var F = window.SKS.FIELDS;

  function isEmpty(v) { return v === undefined || v === null || String(v).trim() === ''; }

  function validate(ctx) {
    var issues = [];
    function req(defs, obj, area, link) {
      defs.forEach(function (d) {
        if (!d.key || d.type === 'list' || d.type === 'checks') return;
        var v = (obj || {})[d.key];
        if (d.required && isEmpty(v)) issues.push({ level: 'error', area: area, msg: d.label + ' が未入力です', link: link });
        if (!isEmpty(v) && d.pattern && !(new RegExp(d.pattern)).test(String(v).trim())) {
          issues.push({ level: 'warn', area: area, msg: d.label + ' の形式を確認してください（' + d.patternMsg + '）', link: link });
        }
      });
    }
    var c = ctx.case;
    var workers = ctx.workers || (ctx.worker ? [ctx.worker] : []);
    if (!workers.length) issues.push({ level: 'error', area: '紐付け', msg: '外国人（申請人）が選択されていません', link: 'basic' });
    workers.forEach(function (w) { req(F.worker, w, '外国人（' + (w.name || '氏名未入力') + '）', '#/worker/' + w.id); });
    if (!ctx.company) issues.push({ level: 'error', area: '紐付け', msg: '受入機関が選択されていません', link: 'basic' });
    else req(F.company, ctx.company, '受入機関', '#/company/' + ctx.company.id);
    if (ctx.support) req(F.support, ctx.support, '登録支援機関', '#/support/' + ctx.support.id);
    req(F.schedule, c.schedule, '日程', 'schedule');
    req(F.labor, c.labor, '労働条件', 'salary');
    req(F.salary, c.salary, '給与', 'salary');
    (window.SKS.DOC_INPUTS || []).forEach(function (di) {
      req(di.fields, (c.docs || {})[di.key], di.title, 'docs/' + di.key);
    });

    var s = c.schedule || {}, wk = workers[0] || {};
    var Calc = window.SKS.Calc;
    workers.forEach(function (w) {
      var nm = '外国人（' + (w.name || '氏名未入力') + '）';
      if (s.entryDate && w.birthDate) {
        var age = Calc.ageAt(w.birthDate, s.entryDate);
        if (age !== null && age < 18) issues.push({ level: 'error', area: nm, msg: '入国予定日時点で18歳未満です（' + age + '歳）' });
      }
      if (s.entryDate && w.passportExpiry && w.passportExpiry <= s.entryDate) {
        issues.push({ level: 'error', area: nm, msg: '旅券の有効期限が入国予定日より前です' });
      }
    });
    if (s.contractDate && s.employStart && s.contractDate > s.employStart) issues.push({ level: 'warn', area: '日程', msg: '雇用契約締結日が雇用開始日より後になっています', link: 'schedule' });
    if (s.entryDate && s.employStart && s.employStart < s.entryDate) issues.push({ level: 'warn', area: '日程', msg: '雇用開始日が入国予定日より前になっています', link: 'schedule' });
    if (s.applyDate && s.entryDate && s.applyDate > s.entryDate) issues.push({ level: 'warn', area: '日程', msg: '申請日が入国予定日より後になっています', link: 'schedule' });
    if (ctx.support && !s.supportContractDate) issues.push({ level: 'warn', area: '支援委託', msg: '支援委託契約の締結日が未入力です', link: 'schedule' });
    if (ctx.support && !((ctx.support.feeItems || []).some(function (x) { return !isEmpty(x.name); }))) {
      issues.push({ level: 'warn', area: '登録支援機関', msg: '支援委託費用の内訳が登録されていません（支援委託契約書・説明書の委託料）', link: '#/support/' + ctx.support.id });
    }
    if (s.lang === 'ミャンマー語') {
      var co = ctx.company || {};
      if (isEmpty(co.nameFor) || isEmpty(co.addrFor)) issues.push({ level: 'warn', area: '受入機関', msg: '翻訳文に使う受入機関の外国語表記（名称・住所）が未入力です', link: ctx.company ? '#/company/' + ctx.company.id : 'basic' });
    } else if (workers.some(function (w) { return w.nationality && w.nationality !== '日本'; })) {
      issues.push({ level: 'warn', area: '翻訳', msg: '翻訳文を付ける言語が「なし」です。雇用条件書・支援計画書などは本人が十分に理解できる言語の翻訳が必要です', link: 'schedule' });
    }
    Calc.compute(c).warnings.forEach(function (m) { issues.push({ level: 'warn', area: '給与・労働条件', msg: m, link: 'salary' }); });
    return issues;
  }

  window.SKS = window.SKS || {};
  window.SKS.Builder = { validate: validate, isEmpty: isEmpty };
})();
