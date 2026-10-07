/*
 * 参考様式第１－２５号 登録支援機関との支援委託契約に関する説明書
 * 参考様式第５－１０号 支援委託契約書（別紙 支援委託費用内訳・覚書）
 */
(function () {
  'use strict';
  var SKS = window.SKS, h = SKS.UI.h, D = SKS.Doc, t = D.t, v = D.v;

  // 支援委託費用（登録支援機関マスタの内訳）から月額（定期分）を求める
  function fees(sup) {
    var items = ((sup || {}).feeItems || []).filter(function (x) { return !D.empty(x.name); });
    var total = 0, regular = 0;
    items.forEach(function (x) {
      var n = parseFloat(String(x.amount || '').replace(/[,，円\s]/g, ''));
      if (isNaN(n)) return;
      total += n;
      if (x.timing === '定期') regular += n;
    });
    return { items: items, total: total, regular: regular, occasional: total - regular };
  }
  SKS.entrustFees = fees;

  function render125(ctx) {
    var w = ctx.worker, sup = ctx.support || {}, s = ctx.case.schedule || {};
    var f = fees(ctx.support);
    var row = function (n, label, content) { return D.tr(D.td(n, { class: 'center' }), D.th(label), D.td(content)); };
    return h('section', { class: 'doc' },
      D.docHead(ctx, '参考様式第１－２５号', null, '登録支援機関との支援委託契約に関する説明書'),
      h('p', {}, '　登録支援機関との１号特定技能外国人支援計画の全部の委託契約の概要は下記のとおりです。'),
      h('p', { class: 'center' }, '記'),
      D.table([
        row('1', '申請人（支援対象者）', v(ctx.combined ? '別紙のとおり' : w.name, true)),
        row('2', '契約の相手方（登録支援機関）', [v(sup.name, true), '　（', v(sup.regNo), '）']),
        row('3', '契約年月日', D.jpDate(s.supportContractDate)),
        row('4', '委託する支援業務（１号特定技能外国人支援計画の全部であること）', '該当'),
        row('5', '委託料（１名当たりの月額）', [v(f.regular ? f.regular.toLocaleString('ja-JP') : ''), '　円']),
        row('6', '契約期間', [D.jpDate(ctx.supportFrom), '　から　', D.jpDate(ctx.supportTo), '　まで'])
      ], 'th-mid'),
      D.note('（注意）\n１　項番１に関し，複数の申請人（同時申請に限る。）について，全ての項目の内容が同一の場合には「別紙のとおり」として別紙を添付して差し支えない。\n２　項番２に関し，登録支援機関登録簿に登録された氏名又は名称を記載すること。'),
      D.signBlock(ctx));
  }
  function rosterCols() {
    return [['氏名', function (x) { return x.name || ''; }], ['国籍・地域', function (x) { return x.nationality || ''; }],
      ['生年月日', function (x) { return D.jpDate(x.birthDate); }]];
  }
  function render125All(ctx) {
    var main = render125(ctx);
    return ctx.combined ? [main, D.roster(ctx, '登録支援機関との支援委託契約に関する説明書　申請人（支援対象者）', rosterCols())] : main;
  }

  function partyBlock(label, org, rep) {
    return h('div', { class: 'party-block' },
      h('div', {}, label), h('div', {}, org.addr || ''), h('div', {}, org.name || ''), h('div', {}, (rep || '') + '　㊞'));
  }

  function render510(ctx) {
    var co = ctx.company, sup = ctx.support || {}, w = ctx.worker, s = ctx.case.schedule || {};
    var f = fees(ctx.support);
    var court = (sup.court || '').replace(/地方裁判所$/, '');
    var art = function (title) { return h('h3', { class: 'article' }, title); };
    var p = function (n, text) { return h('div', { class: 'clause' }, n ? h('span', { class: 'cn' }, n) : null, h('span', {}, text)); };
    var kou = { addr: [co.addr1, co.addr2].filter(Boolean).join('　'), name: co.name };
    var otsu = { addr: [sup.addr1, sup.addr2].filter(Boolean).join('　'), name: sup.name };
    var page1 = h('section', { class: 'doc' },
      D.docHead(ctx, '参考様式第５－１０号', null, '支援委託契約書'),
      h('p', {}, '　特定技能所属機関　' + (co.name || '　　　　') + '（以下「甲」という。）は，登録支援機関　' + (sup.name || '　　　　') +
        '（以下「乙」という。）に，甲が雇用する１号特定技能外国人　' + (ctx.combined ? '別紙のとおり' : (w.name || '　　　　')) + '（以下「丙」という。）に対する１号特定技能外国人支援計画について，以下のとおり支援業務委託契約を締結する。'),
      art('第１条（委託する支援業務）'), p(null, t('e510.a1')),
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (i) { return p(String(i), t('e510.a1.' + i)); }),
      p('11', '　この他，甲が属する' + (co.field || '特定産業分野') + 'を所管する関係行政機関の長が基準を定める告示の規定に基づいて定められた支援を実施すること。'),
      art('第２条（委託料）'),
      p('1', '甲は，乙に対し，別紙に記載した内訳のとおり，本件業務の対価として，月額　' + (f.regular ? f.regular.toLocaleString('ja-JP') : '　　　') + '円（税別）を支払う。'),
      p('2', t('e510.a2.2')), p('3', t('e510.a2.3')), p('4', t('e510.a2.4')),
      art('第３条（費用の負担）'), p(null, t('e510.a3')),
      art('第４条（乙の遵守すべき事項）'), p('1', t('e510.a4.1')), p('2', t('e510.a4.2')),
      art('第５条（実施状況の報告）'), p(null, t('e510.a5')),
      art('第６条（契約期間等）'),
      p('1', '　本契約の期間は，' + D.jpDate(ctx.supportFrom) + 'から' + D.jpDate(ctx.supportTo) + 'までとする。ただし，期間満了１か月前までに，甲または乙から別段の意思表示がないときは，本契約と同一条件にて更新され，以後も同様とする。'),
      p('2', t('e510.a6.2')),
      art('第７条（解除）'), p(null, t('e510.a7')),
      art('第８条（専属的合意管轄裁判所）'), p(null, '　本契約に関する一切の争訟は' + (court || '　　　') + '地方裁判所を第一審の専属的合意管轄裁判所とする。'),
      art('第９条（協議）'), p(null, t('e510.a9')),
      p(null, t('e510.closing')),
      h('div', { class: 'date-right' }, D.jpDate(s.supportContractDate) + '　締結'),
      h('div', { class: 'sign-two' },
        partyBlock('（甲）', kou, [co.repTitle, co.repName].filter(Boolean).join('　')),
        partyBlock('（乙）', otsu, [sup.repTitle, sup.repName].filter(Boolean).join('　'))));

    var rows = [];
    for (var i = 0; i < 10; i++) {
      var it = f.items[i] || {};
      var on = !D.empty(it.name);
      rows.push(h('tr', {}, h('td', { class: 'center', rowspan: 2 }, String(i + 1)), h('td', { rowspan: 2 }, on ? it.name : ''),
        h('td', {}, '金　　額：　' + (on ? (isNaN(parseFloat(it.amount)) ? (it.amount || '') : D.yen(it.amount)) : '') + '　' + (on ? (it.unit || '円') : '円'))));
      rows.push(h('tr', {}, h('td', {}, '徴収時期：　' + D.box(on && it.timing === '定期') + '　定期　　' + D.box(on && it.timing !== '定期') + '　随時')));
    }
    var page2 = h('section', { class: 'doc' },
      h('div', { class: 'form-no' }, '参考様式第５－１０号・別紙'),
      h('h1', { class: 'doc-title' }, '支援委託費用内訳（特定技能外国人１名当たりの月額）'),
      h('table', { class: 'form-table cols' },
        h('thead', {}, h('tr', {}, h('th', {}, '項'), h('th', {}, '名目'), h('th', {}, '額及び徴収時期'))),
        h('tbody', {}, rows.concat([
          h('tr', {}, h('td', { colspan: 2, class: 'right' }, '合計'), h('td', { class: 'strong' }, f.total.toLocaleString('ja-JP') + '　円')),
          h('tr', {}, h('td', { colspan: 2, class: 'right' }, '（随時'), h('td', {}, f.occasional.toLocaleString('ja-JP') + '　円）')),
          h('tr', {}, h('td', { colspan: 2, class: 'right' }, '（定期'), h('td', {}, f.regular.toLocaleString('ja-JP') + '　円）'))]))),
      D.note('（注意）\n１　１号特定技能外国人１名当たりの支援委託費用の月額を記載すること\n２　合計欄には1から10までの費用の合計を記載すること。'));

    var memo = ((sup.memoItems) || []).filter(function (x) { return !D.empty(x.name); });
    var page3 = memo.length ? h('section', { class: 'doc' },
      h('h1', { class: 'doc-title' }, '覚　書'),
      h('p', {}, D.jpDate(s.supportContractDate) + '付「支援委託契約書」以外の事項について、以下の通り合意する。'),
      h('p', {}, '対象者　：　' + (ctx.combined ? '別紙のとおり' : (w.name || ''))),
      h('table', { class: 'form-table cols' },
        h('thead', {}, h('tr', {}, h('th', {}, '項目'), h('th', {}, '単位'), h('th', {}, '金額'), h('th', {}, '税'))),
        h('tbody', {}, memo.map(function (m) {
          return h('tr', {}, h('td', {}, m.name), h('td', { class: 'center' }, m.unit || ''), h('td', { class: 'num' }, isNaN(parseFloat(m.amount)) ? (m.amount || '') : D.yen(m.amount) + '円'), h('td', { class: 'center' }, m.tax || ''));
        }))),
      h('p', {}, '覚書に無い事項については、都度相談のうえ決定する。'),
      h('div', { class: 'date-right' }, D.jpDate(s.supportContractDate)),
      h('div', { class: 'sign-two' },
        partyBlock('甲', kou, [co.repTitle, co.repName].filter(Boolean).join('　')),
        partyBlock('乙', otsu, [sup.repTitle, sup.repName].filter(Boolean).join('　')))) : null;
    return [page1, page2, page3, ctx.combined ? D.roster(ctx, '支援委託契約書　１号特定技能外国人（丙）', rosterCols()) : null];
  }

  SKS.DOCS.push({ id: '1-25', no: '参考様式第1-25号', title: '登録支援機関との支援委託契約に関する説明書', group: '支援', needsSupport: true, combinable: true, render: render125All });
  SKS.DOCS.push({ id: '5-10', no: '参考様式第5-10号', title: '支援委託契約書（別紙・覚書）', group: '支援', needsSupport: true, combinable: true, render: render510 });
})();
