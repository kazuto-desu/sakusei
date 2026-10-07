/*
 * 書類作成の共通部品
 * 書類はすべて DOM で組み立てる（入力値は常にテキストとして扱い、HTMLとして解釈しない）
 */
(function () {
  'use strict';
  var SKS = window.SKS;
  var h = SKS.UI.h;
  var T = SKS.TEXTS;
  var Calc = SKS.Calc;

  function t(key) {
    var v = T[key];
    if (v === undefined) { console.warn('文言がありません: ' + key); return ''; }
    return v;
  }
  function empty(v) { return v === undefined || v === null || String(v).trim() === ''; }
  function num(v) { return Calc.num(v); }
  function yen(v) {
    if (empty(v)) return '';
    var n = num(v);
    return isNaN(n) ? String(v) : Math.round(n).toLocaleString('ja-JP');
  }
  function parts(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    return m ? { y: +m[1], m: +m[2], d: +m[3] } : null;
  }
  // 2026年12月1日（未入力は「　　年　　月　　日」）
  function jpDate(iso) {
    var p = parts(iso);
    return p ? p.y + '年' + p.m + '月' + p.d + '日' : '　　　　年　　月　　日';
  }
  function jpMonth(ym) {
    var m = /^(\d{4})-(\d{2})/.exec(ym || '');
    return m ? +m[1] + '年' + +m[2] + '月' : '　　　　年　　月';
  }
  // ミャンマー語の日付（2026 နှစ် 12 လ 1 ရက်）
  function myDate(iso) {
    var p = parts(iso), f = t('c15.date.my');
    return p ? p.y + f[0] + p.m + f[1] + p.d + f[2] : f[0] + '　' + f[1] + '　' + f[2];
  }
  function addMonths(iso, n) {
    var p = parts(iso);
    if (!p) return '';
    var d = new Date(Date.UTC(p.y, p.m - 1 + n, p.d));
    // EDATE と同じく月末を超える場合は月末に丸める
    if (d.getUTCDate() !== p.d) d = new Date(Date.UTC(p.y, p.m - 1 + n + 1, 0));
    return d.toISOString().slice(0, 10);
  }
  function addDays(iso, n) {
    var p = parts(iso);
    if (!p) return '';
    return new Date(Date.UTC(p.y, p.m - 1, p.d + n)).toISOString().slice(0, 10);
  }
  function box(on) { return on ? '■' : '□'; }
  // パターン（文字列の断片の配列）と値を交互につなぐ
  function fill(pattern, values) {
    var out = '';
    pattern.forEach(function (p, i) { out += p + (i < values.length ? values[i] : ''); });
    return out;
  }
  function hm(hours) {
    if (hours === null || hours === undefined || isNaN(hours)) return { h: '　', m: '　' };
    var mins = Math.round(hours * 60);
    return { h: Math.floor(mins / 60), m: ('0' + (mins % 60)).slice(-2) };
  }
  function timeParts(hhmm) {
    var m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || '');
    return m ? { h: +m[1], m: m[2] } : { h: '　', m: '　' };
  }

  // 日本語＋（翻訳ありの場合）外国語を縦に併記
  function bi(ctx, jp, my, cls) {
    return h('div', { class: 'bi ' + (cls || '') },
      h('div', { class: 'jp' }, jp),
      ctx.my && !empty(my) ? h('div', { class: 'my', lang: 'my' }, my) : null);
  }
  // 外国語だけの行
  function myLine(ctx, my, cls) {
    return ctx.my && !empty(my) ? h('div', { class: 'my ' + (cls || ''), lang: 'my' }, my) : null;
  }
  // 入力値（未入力は下線の空欄）
  function v(value, wide) {
    return h('span', { class: 'val' + (empty(value) ? ' blank' : '') + (wide ? ' wide' : '') }, empty(value) ? '　' : String(value));
  }
  function multiline(text) {
    if (empty(text)) return h('div', { class: 'val blank block' }, '　');
    return h('div', { class: 'val block' }, String(text));
  }
  function docHead(ctx, formNo, formNoMy, title, titleMy) {
    return h('div', { class: 'doc-head' },
      h('div', { class: 'form-no' }, formNo, myLine(ctx, formNoMy)),
      h('h1', { class: 'doc-title' }, title),
      myLine(ctx, titleMy, 'doc-title-my'));
  }
  function note(text) { return h('div', { class: 'note' }, text); }
  function table(rows, cls) {
    return h('table', { class: 'form-table ' + (cls || '') }, h('tbody', {}, rows));
  }
  function tr() { return h.apply(null, ['tr', {}].concat([].slice.call(arguments))); }
  // th/td(内容..., 属性) … 最後の引数が通常のオブジェクトなら属性として扱う
  function cell(tag, args) {
    args = [].slice.call(args);
    var last = args[args.length - 1];
    var attrs = last && typeof last === 'object' && !Array.isArray(last) && !(last instanceof Node) ? args.pop() : {};
    return h(tag, attrs, args);
  }
  function th() { return cell('th', arguments); }
  function td() { return cell('td', arguments); }

  // 署名欄（作成日・機関名・作成責任者）
  function signBlock(ctx, opts) {
    opts = opts || {};
    var co = ctx.company || {};
    return h('div', { class: 'sign-block' },
      opts.declare ? h('p', {}, opts.declare) : null,
      h('div', { class: 'sign-row right' }, jpDate(ctx.case.schedule.docDate), '　作成'),
      h('div', { class: 'sign-row' }, h('span', { class: 'sign-label' }, '特定技能所属機関の氏名又は名称'), v(co.name, true)),
      h('div', { class: 'sign-row' }, h('span', { class: 'sign-label' }, opts.ownerLabel || '作成責任者　役職・氏名'), v(co.docOwner, true)));
  }

  // 書類の共通コンテキスト
  function context(c, state) {
    var byId = function (list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; };
    var s = c.schedule || {};
    var ctx = {
      case: c,
      worker: byId(state.workers, c.workerId) || {},
      company: byId(state.companies, c.companyId) || {},
      support: byId(state.supports, c.supportId),
      calc: Calc.compute(c),
      my: s.lang === 'ミャンマー語',
      docs: c.docs || {}
    };
    ctx.employEnd = s.employEnd || (s.employStart ? addDays(addMonths(s.employStart, 12), -1) : '');
    ctx.supportFrom = s.supportFrom || s.supportContractDate || '';
    ctx.supportTo = s.supportTo || (ctx.supportFrom ? addDays(addMonths(ctx.supportFrom, 12), -1) : '');
    return ctx;
  }

  SKS.Doc = {
    t: t, empty: empty, num: num, yen: yen, jpDate: jpDate, jpMonth: jpMonth, myDate: myDate,
    addMonths: addMonths, addDays: addDays, box: box, fill: fill, hm: hm, timeParts: timeParts,
    bi: bi, myLine: myLine, v: v, multiline: multiline, docHead: docHead, note: note,
    table: table, tr: tr, th: th, td: td, signBlock: signBlock, context: context
  };
  SKS.DOCS = [];
})();
