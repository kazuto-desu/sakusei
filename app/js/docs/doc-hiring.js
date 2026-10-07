/* 参考様式第１－１６号 雇用の経緯に係る説明書 */
(function () {
  'use strict';
  var SKS = window.SKS, h = SKS.UI.h, D = SKS.Doc, t = D.t, box = D.box, v = D.v;

  SKS.DOC_INPUTS = SKS.DOC_INPUTS || [];
  SKS.DOC_INPUTS.push({
    key: 'hiring', title: '雇用の経緯に係る説明書（1-16）',
    defaults: { domHas: '無', abrHas: '無', guidance: '有' },
    fields: [
      { group: '1 職業紹介事業者（国内）' },
      { key: 'domHas', label: 'あっせんの有無', type: 'select', options: ['無', '有'] },
      { key: 'domPermitNo', label: '許可・届出受理番号', placeholder: '00-ユ-000000' },
      { key: 'domPermitDate', label: '受理（受付）年月日', type: 'date' },
      { key: 'domKind', label: '事業者の区分', type: 'select', options: ['有料職業紹介事業者', '無料職業紹介事業者'] },
      { key: 'domName', label: '事業者の氏名・名称' },
      { key: 'domZip', label: '郵便番号' },
      { key: 'domAddr', label: '住所' },
      { key: 'domTel', label: '電話番号' },
      { key: 'domSeekerAmount', label: '求職者（申請人）が支払った額（円）', type: 'number' },
      { key: 'domSeekerPurpose', label: '求職者が支払った名目' },
      { key: 'domEmployerAmount', label: '求人者（所属機関）が支払った額（円）', type: 'number' },
      { key: 'domEmployerPurpose', label: '求人者が支払った名目' },
      { group: '2 取次機関（国外）' },
      { key: 'abrHas', label: '取次ぎの有無', type: 'select', options: ['無', '有'] },
      { key: 'abrName', label: '氏名又は名称' },
      { key: 'abrCountry', label: '所在国' },
      { key: 'abrAddr', label: '所在地' },
      { key: 'abrTel', label: '電話番号' },
      { key: 'abrSeekerAmount', label: '求職者が支払った額（円）', type: 'number' },
      { key: 'abrSeekerPurpose', label: '求職者が支払った名目' },
      { key: 'abrEmployerAmount', label: '求人者が支払った額（円）', type: 'number' },
      { key: 'abrEmployerPurpose', label: '求人者が支払った名目' },
      { group: '3 事前ガイダンス' },
      { key: 'guidance', label: '支援計画に定めるとおりに実施していることの有無', type: 'select', options: ['有', '無'] },
      { group: '4 求職者（申請人）が自国等の機関に支払った費用' },
      { key: 'payments', label: '支払った費用', type: 'list', max: 5, columns: [
        { key: 'payee', label: '支払先機関の名称' }, { key: 'payee_my', label: '支払先（ミャンマー語）', my: true },
        { key: 'purpose', label: '名目' }, { key: 'purpose_my', label: '名目（ミャンマー語）', my: true },
        { key: 'date', label: '支払年月日', type: 'date' }, { key: 'foreign', label: '支払金額（現地通貨・米ドル）', placeholder: '500米ドル' },
        { key: 'yen', label: '日本円換算（円）' }] },
      { key: 'foreignTotal', label: '合計（現地通貨・米ドル）', placeholder: '1,500米ドル' }
    ]
  });

  function yesNoRow(ctx, label, labelMy, on) {
    return D.tr(D.th(h('div', {}, label), D.myLine(ctx, labelMy)),
      D.td(h('div', {}, box(on) + '　有　　' + box(!on) + '　無'), D.myLine(ctx, box(on) + ' ' + t('h116.yes.my') + '　' + box(!on) + ' ' + t('h116.no.my'))));
  }
  function feeRows(ctx, prefix, k) {
    var on = k[prefix + 'Has'] === '有';
    var g = function (x) { return on ? k[prefix + x] : ''; };
    return [
      D.tr(D.th(h('div', {}, '求職者（申請人）'), D.myLine(ctx, t('h116.seeker.my'))),
        D.td(h('div', {}, '額　（', v(D.yen(g('SeekerAmount'))), '　円）　名目　', v(g('SeekerPurpose')), '　として'),
          D.myLine(ctx, t('h116.amount.my') + ' (' + (D.yen(g('SeekerAmount')) || '　') + ' ' + t('h116.yen.my') + '　' + t('h116.purpose.my') + ' ' + (g('SeekerPurpose') || '　') + ' ' + t('h116.as.my')))),
      D.tr(D.th(h('div', {}, '求人者（特定技能所属機関）'), D.myLine(ctx, t('h116.employer.my'))),
        D.td(h('div', {}, '額　（', v(D.yen(g('EmployerAmount'))), '　円）　名目　', v(g('EmployerPurpose')), '　として'),
          D.myLine(ctx, t('h116.amount.my') + ' (' + (D.yen(g('EmployerAmount')) || '　') + ' ' + t('h116.yen.my') + '　' + t('h116.purpose.my') + ' ' + (g('EmployerPurpose') || '　') + ' ' + t('h116.as.my'))))
    ];
  }

  function render(ctx) {
    var k = ctx.docs.hiring || {}, w = ctx.worker, co = ctx.company;
    var dom = k.domHas === '有', abr = k.abrHas === '有';
    var g = function (key, on) { return on ? k[key] : ''; };
    var pays = k.payments || [];
    var totalYen = pays.reduce(function (s, p) { return s + D.num(p.yen); }, 0);
    return h('section', { class: 'doc' },
      D.docHead(ctx, '参考様式第１－１６号', t('h116.formNo.my'), '雇用の経緯に係る説明書', t('h116.title.my')),
      h('p', {}, '特定技能外国人　', v(w.name, true), '　との間で特定技能雇用契約を締結するに当たっての雇用の経緯は以下のとおりです。'),
      D.myLine(ctx, t('h116.intro.my1') + ' ' + (w.name || '') + ' ' + t('h116.intro.my2') + t('h116.intro.my3')),

      h('h2', {}, '１　職業紹介事業者（国内）', D.myLine(ctx, t('h116.s1.my'))),
      D.table([
        yesNoRow(ctx, '１　あっせんの有無', t('h116.s1q1.my'), dom),
        D.tr(D.th(h('div', {}, '２　許可・届出受理番号（受理受付年月日）'), D.myLine(ctx, t('h116.s1q2.my'))),
          D.td(v(g('domPermitNo', dom)), '　（', dom && k.domPermitDate ? D.jpDate(k.domPermitDate) : '　　年　　月　　日', '）')),
        D.tr(D.th(h('div', {}, '３　職業紹介事業者の区分'), D.myLine(ctx, t('h116.s1q3.my'))),
          D.td(h('div', {}, box(dom && k.domKind !== '無料職業紹介事業者') + '　有料職業紹介事業者　　' + box(dom && k.domKind === '無料職業紹介事業者') + '　無料職業紹介事業者'),
            D.myLine(ctx, box(dom && k.domKind !== '無料職業紹介事業者') + ' ' + t('h116.paid.my') + '　' + box(dom && k.domKind === '無料職業紹介事業者') + ' ' + t('h116.free.my')))),
        D.tr(D.th(h('div', {}, '４　職業紹介事業者の氏名'), D.myLine(ctx, t('h116.s1q4.my'))), D.td(v(g('domName', dom), true))),
        D.tr(D.th(h('div', {}, '５　職業紹介事業者の住所（電話番号）'), D.myLine(ctx, t('h116.s1q5.my'))),
          D.td(h('div', {}, '〒', v(g('domZip', dom)), '　', v(g('domAddr', dom), true)), h('div', {}, '（電話番号　', v(g('domTel', dom)), '　）'))),
        D.tr(D.th(h('div', {}, '６　職業紹介事業者へ支払った費用'), D.myLine(ctx, t('h116.s1q6.my'))), D.td(D.table(feeRows(ctx, 'dom', k), 'inner')))
      ], 'th-mid'),
      h('div', { class: 'note' }, t('h116.note1'), D.myLine(ctx, t('h116.note1.my'))),

      h('h2', { class: 'break-before' }, '２　取次機関（国外）（１で有にチェックを付した場合のみ記載）', D.myLine(ctx, t('h116.s2.my'))),
      D.table([
        yesNoRow(ctx, '１　取次ぎの有無', t('h116.s2q1.my'), abr),
        D.tr(D.th(h('div', {}, '２　氏名又は名称'), D.myLine(ctx, t('h116.s2q2.my'))), D.td(v(g('abrName', abr), true))),
        D.tr(D.th(h('div', {}, '３　所在国'), D.myLine(ctx, t('h116.s2q3.my'))), D.td(v(g('abrCountry', abr)))),
        D.tr(D.th(h('div', {}, '４　所在地'), D.myLine(ctx, t('h116.s2q4.my'))), D.td(h('div', {}, v(g('abrAddr', abr), true)), h('div', {}, '（電話番号　', v(g('abrTel', abr)), '　）'))),
        D.tr(D.th(h('div', {}, '５　取次機関へ支払った費用'), D.myLine(ctx, t('h116.s2q5.my'))), D.td(D.table(feeRows(ctx, 'abr', k), 'inner')))
      ], 'th-mid'),
      h('div', { class: 'note' }, t('h116.note2'), D.myLine(ctx, t('h116.note2.my'))),

      h('h2', {}, '３　事前ガイダンスの実施', D.myLine(ctx, t('h116.s3.my'))),
      D.table([D.tr(D.th(h('div', {}, '第１号特定技能外国人支援計画に定めるとおりに実施していることの有無'), D.myLine(ctx, t('h116.s3q.my'))),
        D.td(h('span', { class: 'circle-choice' }, h('span', { class: k.guidance !== '無' ? 'circled' : '' }, '有'), '・', h('span', { class: k.guidance === '無' ? 'circled' : '' }, '無')),
          D.myLine(ctx, k.guidance !== '無' ? t('h116.yes.my') : t('h116.no.my'))))], 'th-wide'),
      D.bi(ctx, t('h116.declare'), t('h116.declare.my'), 'para'),
      h('div', { class: 'sign-block' },
        h('div', { class: 'sign-row right' }, '作成年月日：' + D.jpDate(ctx.case.schedule.docDate), D.myLine(ctx, t('h116.created.my') + ' ' + D.myDate(ctx.case.schedule.docDate))),
        h('div', { class: 'sign-row' }, h('span', { class: 'sign-label' }, '特定技能所属機関の氏名又は名称', D.myLine(ctx, t('h116.org.my'))), v(co.name, true)),
        h('div', { class: 'sign-row' }, h('span', { class: 'sign-label' }, '作成責任者の氏名及び役職', D.myLine(ctx, t('h116.owner.my'))), v(co.docOwner, true))),

      h('h2', { class: 'break-before' }, '４　求職者（申請人）が自国等の機関に支払った費用', D.myLine(ctx, t('h116.s4.my'))),
      h('table', { class: 'form-table cols' },
        h('thead', {}, h('tr', {}, h('th', {}, ''),
          [['支払先機関の名称', 'h116.payee.my'], ['名目', 'h116.name.my'], ['支払年月日', 'h116.payDate.my'], ['支払金額', 'h116.payAmount.my']].map(function (c) {
            return h('th', {}, c[0], D.myLine(ctx, t(c[1])));
          }))),
        h('tbody', {}, [0, 1, 2, 3, 4].map(function (i) {
          var p = pays[i] || {};
          return h('tr', {}, h('td', { class: 'center' }, String(i + 1)),
            h('td', {}, p.payee || '', D.myLine(ctx, p.payee_my)),
            h('td', {}, p.purpose || '', D.myLine(ctx, p.purpose_my)),
            h('td', {}, p.date ? D.jpDate(p.date) : '　　年　　月　　日', p.date ? D.myLine(ctx, D.myDate(p.date)) : null),
            h('td', {}, (p.foreign || '') + '（' + (D.yen(p.yen) || '　　') + '円）'));
        }).concat([h('tr', {}, h('td', { colspan: 4, class: 'right' }, '合計', D.myLine(ctx, 'စုစုပေါင်း')),
          h('td', { class: 'strong' }, (k.foreignTotal || '') + '（' + (totalYen ? totalYen.toLocaleString('ja-JP') : '　　') + '円）'))]))),
      h('div', { class: 'note' }, t('h116.note4'), D.myLine(ctx, t('h116.note4.my'))),
      D.bi(ctx, t('h116.confirm'), t('h116.confirm.my'), 'para'),
      h('div', { class: 'receiver' }, '申請人の署名', D.myLine(ctx, t('h116.sign.my')), h('span', { class: 'sign-space' }, '　')));
  }

  SKS.DOCS.push({ id: '1-16', no: '参考様式第1-16号', title: '雇用の経緯に係る説明書', group: '雇用', input: 'hiring', bilingual: true, render: render });
})();
