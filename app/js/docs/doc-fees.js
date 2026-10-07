/* 参考様式第１－９号 徴収費用の説明書 */
(function () {
  'use strict';
  var SKS = window.SKS, h = SKS.UI.h, D = SKS.Doc, t = D.t;

  SKS.DOC_INPUTS = SKS.DOC_INPUTS || [];
  SKS.DOC_INPUTS.push({
    key: 'fees', title: '徴収費用の説明書（1-9）',
    fields: [
      { group: '金額は「給与・労働条件」の控除（食費・居住費・水道光熱費・その他）を使います' },
      { key: 'foodContent', label: '2③ 提供する食事，食材等の具体的な内容', type: 'textarea' },
      { key: 'foodReason', label: '2④ 食費が実費に相当する額その他の適正な額であることの説明', type: 'textarea' },
      { key: 'housingType', label: '3③ 提供する宿泊施設', type: 'select', options: ['借上物件', '自己所有物件'] },
      { key: 'housingDetail', label: '3③ 宿泊施設の具体的な内容（任意）', type: 'textarea' },
      { key: 'housingReason', label: '3④ 居住費が適正な額であることの説明', type: 'textarea' },
      { key: 'otherBenefit', label: '5③ 定期に負担する費用に関し受ける具体的な便益の内容', type: 'textarea' },
      { key: 'otherReason', label: '5④ 定期に負担する費用が適正な額であることの説明', type: 'textarea' }
    ]
  });

  function yesNo(on) { return D.box(on) + '　有　　' + D.box(!on) + '　無'; }

  function render(ctx) {
    var sal = ctx.case.salary || {}, d = sal.deductions || {}, f = ctx.docs.fees || {};
    var food = D.num(d.food), housing = D.num(d.housing), util = D.num(d.utility);
    var others = (sal.otherDeductions || []).filter(function (o) { return !D.empty(o.name) || D.num(o.amount); });
    var row = function (label, content) { return D.tr(D.th(label), D.td(content)); };
    var amount = function (on, n) { return ['１か月当たり　約　', D.v(on ? D.yen(n) : ''), '　円']; };
    return h('section', { class: 'doc' },
      D.docHead(ctx, '参考様式第１－９号', null, '徴収費用の説明書'),
      h('h2', {}, '１　特定技能外国人に対する報酬の支払概算額'),
      D.table([row('概算額', ['', D.v(D.yen(ctx.calc.monthlyA)), '　円（１か月当たり）'])], 'th-wide'),
      D.note(t('f19.note1')),
      h('h2', {}, '２　食費'),
      D.table([
        row('①食費，食材等の提供の有無', yesNo(food > 0)),
        row('②食費として徴収する費用', amount(food > 0, food)),
        row('③提供する食事，食材等の具体的な内容', D.multiline(food > 0 ? f.foodContent : '')),
        row('④費用が実費に相当する額その他の適正な額であることの説明', D.multiline(food > 0 ? f.foodReason : ''))
      ], 'th-wide'),
      D.note(t('f19.note2')),
      h('h2', {}, '３　居住費'),
      D.table([
        row('①居住費の徴収の有無', yesNo(housing > 0)),
        row('②居住費として徴収する費用', amount(housing > 0, housing)),
        row('③提供する宿泊施設の具体的な内容', [
          h('div', {}, h('span', { class: housing > 0 && f.housingType === '自己所有物件' ? 'circled' : '' }, '自己所有物件'), '　・　',
            h('span', { class: housing > 0 && (f.housingType || '借上物件') === '借上物件' ? 'circled' : '' }, '借上物件')),
          housing > 0 && !D.empty(f.housingDetail) ? D.multiline(f.housingDetail) : null]),
        row('④費用が実費に相当する額その他の適正な額であることの説明', D.multiline(housing > 0 ? f.housingReason : ''))
      ], 'th-wide'),
      D.note(t('f19.note3')),
      h('h2', { class: 'break-before' }, '４　水道光熱費'),
      D.table([
        row('①水道光熱費の徴収の有無', yesNo(util > 0)),
        row('②水道光熱費として徴収する費用の内容', amount(util > 0, util))
      ], 'th-wide'),
      D.note(t('f19.note4')),
      h('h2', {}, '５　その他特定技能外国人が定期に負担する費用'),
      D.table([
        row('①その他特定技能外国人が定期に負担する費用の有無', yesNo(others.length > 0)),
        row('②特定技能外国人が定期に負担する費用の内容', ['Ⅰ', 'Ⅱ', 'Ⅲ'].map(function (n, i) {
          var o = others[i] || {};
          return h('div', {}, n + '　', D.v(o.name), '　１か月当たり　約　', D.v(D.yen(o.amount)), '　円');
        })),
        row('③特定技能外国人が定期に負担する費用に関し特定技能外国人が受ける具体的な便益の内容', D.multiline(others.length ? f.otherBenefit : '')),
        row('④費用が実費に相当する額その他の適正な額であることの説明', D.multiline(others.length ? f.otherReason : ''))
      ], 'th-wide'),
      D.note(t('f19.note5')),
      h('div', { class: 'sign-block' },
        h('p', {}, '上記の記載内容は，事実と相違ありません。'),
        h('div', { class: 'sign-row right' }, D.jpDate(ctx.case.schedule.docDate), '　作成'),
        h('div', { class: 'sign-row' }, h('span', { class: 'sign-label' }, '特定技能所属機関の氏名又は名称'), D.v(ctx.company.name, true)),
        h('div', { class: 'sign-row' }, h('span', { class: 'sign-label' }, '作成責任者の氏名及び役職'), D.v(ctx.company.docOwner, true))));
  }

  SKS.DOCS.push({ id: '1-9', no: '参考様式第1-9号', title: '徴収費用の説明書', group: '雇用', input: 'fees', render: render });
})();
