/* 参考様式第１－４号 特定技能外国人の報酬に関する説明書 */
(function () {
  'use strict';
  var SKS = window.SKS, h = SKS.UI.h, D = SKS.Doc;

  SKS.DOC_INPUTS = SKS.DOC_INPUTS || [];
  SKS.DOC_INPUTS.push({
    key: 'reward', title: '報酬に関する説明書（1-4）',
    fields: [
      { group: '1 申請人に対する報酬' },
      { key: 'duties', label: '②申請人の役職，職務内容，責任の程度', type: 'textarea', required: true,
        placeholder: '例）〇〇において△△業務を担当する（役職なし）。指導員の指示に従って……に従事する。' },
      { key: 'expYears', label: '③経験年数（従事させる業務に係る経験・年）', type: 'number', placeholder: '0' },
      { key: 'notes', label: '⑤その他（諸手当など特記事項）', type: 'textarea', hint: '空欄のときは手当の内訳を自動で記載します' },
      { group: '2・3 比較対象の日本人労働者' },
      { key: 'compareType', label: '比較対象', type: 'select', required: true, options: ['比較対象となる日本人労働者がいる', '比較対象となる日本人労働者がいない'] },
      { key: 'jpDuties', label: '①（最も近い職務を担う）日本人労働者の役職，職務内容，責任の程度', type: 'textarea', required: true },
      { key: 'jpAge', label: '②年齢（歳）', type: 'number' },
      { key: 'jpGender', label: '②性別', type: 'select', options: ['男', '女'] },
      { key: 'jpExp', label: '②経験年数（年）', type: 'number' },
      { key: 'jpMonthly', label: '③報酬 月給（円）', type: 'number', hint: '月給・時間給のどちらかで記載（申請人の欄と統一）' },
      { key: 'jpHourly', label: '③報酬 時間給（円）', type: 'number' },
      { key: 'wageRule', label: '④賃金規程の有無', type: 'select', options: ['無', '有'] },
      { key: 'ruleMonthly', label: '④規程に基づく報酬 月給（円）', type: 'number' },
      { key: 'ruleHourly', label: '④規程に基づく報酬 時間給（円）', type: 'number' },
      { key: 'reason', label: '⑤日本人と同等以上であると考える理由', type: 'textarea', required: true },
      { key: 'jpNotes', label: '⑥その他', type: 'textarea' }
    ]
  });

  function allowanceSummary(ctx) {
    var sal = ctx.case.salary || {};
    var list = (sal.allowances || []).filter(function (a) { return !D.empty(a.name) && D.num(a.amount); });
    if (!list.length) return '';
    return '上記月給は基本賃金' + D.yen(sal.basePay) + '円に' +
      list.map(function (a) { return a.name + D.yen(a.amount) + '円'; }).join('、') + 'を含む。';
  }

  function render(ctx) {
    var r = ctx.docs.reward || {}, w = ctx.worker, c = ctx.calc, sal = ctx.case.salary || {};
    var s = ctx.case.schedule || {};
    var age = SKS.Calc.ageAt(w.birthDate, s.applyDate || s.docDate);
    var monthlyLabel = sal.payType === '月給' || !sal.payType ? '月給' : '月給換算';
    var hourlyLabel = sal.payType === '時間給' ? '時間給' : '時間給換算';
    var rows1 = [
      D.tr(D.th('①申請人の氏名'), D.td(D.v(w.name, true))),
      D.tr(D.th('②申請人の役職，職務内容，責任の程度'), D.td(D.multiline(r.duties))),
      D.tr(D.th('③申請人の年齢，性別及び経験年数'), D.td(
        '（　', D.v(age === null ? '' : age), '歳　）　（　', D.v(w.gender), '　）　（経験　', D.v(r.expYears), '　年）')),
      D.tr(D.th('④申請人に対する報酬'), D.td(
        monthlyLabel + '　', D.v(D.yen(c.monthlyA)), '　円　　／　　' + hourlyLabel + '　', D.v(c.hourly === null ? '' : c.hourly.toLocaleString('ja-JP')), '　円')),
      D.tr(D.th('⑤その他'), D.td(D.multiline(D.empty(r.notes) ? allowanceSummary(ctx) : r.notes)))
    ];
    function compareRows(nearest) {
      var use = nearest === (r.compareType === '比較対象となる日本人労働者がいない');
      var g = function (k) { return use ? r[k] : ''; };
      var rule = use ? (r.wageRule || '無') : '';
      return [
        D.tr(D.th(nearest ? '①最も近い職務を担う日本人労働者の役職，職務内容，責任の程度' : '①比較対象となる日本人労働者の役職，職務内容，責任の程度'), D.td(D.multiline(g('jpDuties')))),
        D.tr(D.th(nearest ? '②最も近い職務を担う日本人労働者の年齢，性別及び経験年数' : '②比較対象となる日本人労働者の年齢，性別及び経験年数'),
          D.td('（　', D.v(g('jpAge')), '歳　）　（　', D.v(g('jpGender')), '　）　（経験　', D.v(g('jpExp')), '　年）')),
        D.tr(D.th('③比較対象となる日本人労働者の報酬'), D.td('月給　', D.v(D.yen(g('jpMonthly'))), '　円　　／　　時間給　', D.v(D.yen(g('jpHourly'))), '　円')),
        D.tr(D.th('④賃金規程の有無及び賃金規程に基づく賃金'), D.td(
          h('div', {}, '規程の有無　', use ? h('span', { class: 'circle-choice' }, h('span', { class: rule === '有' ? 'circled' : '' }, '有'), '・', h('span', { class: rule === '無' ? 'circled' : '' }, '無')) : '有・無'),
          h('div', {}, '有の場合　賃金規程に基づき，申請人と役職，職務内容，責任の程度が' + (nearest ? '最も近い' : '同等の') + '日本人労働者に支払われるべき報酬'),
          h('div', {}, '月給　', D.v(rule === '有' ? D.yen(r.ruleMonthly) : ''), '　円　　／　　時間給　', D.v(rule === '有' ? D.yen(r.ruleHourly) : ''), '　円'))),
        D.tr(D.th('⑤申請人に対する報酬が日本人が従事する場合の報酬の額と同等以上であると考える理由'), D.td(D.multiline(g('reason')))),
        D.tr(D.th('⑥その他'), D.td(D.multiline(g('jpNotes'))))
      ];
    }
    return h('section', { class: 'doc' },
      D.docHead(ctx, '参考様式第１－４号', null, '特 定 技 能 外 国 人 の 報 酬 に 関 す る 説 明 書'),
      h('p', {}, D.t('r14.intro')),
      h('h2', {}, '１　申請人に対する報酬'),
      D.table(rows1, 'th-wide'),
      D.note(D.t('r14.note1')),
      h('h2', {}, '２　比較対象となる日本人労働者がいる場合'),
      D.table(compareRows(false), 'th-wide'),
      D.note(D.t('r14.note2')),
      h('h2', { class: 'break-before' }, '３　比較対象となる日本人労働者がいない場合'),
      D.table(compareRows(true), 'th-wide'),
      D.note(D.t('r14.note3')),
      D.signBlock(ctx, { declare: '上記の記載内容は，事実と相違ありません。' }));
  }

  SKS.DOCS.push({ id: '1-4', no: '参考様式第1-4号', title: '特定技能外国人の報酬に関する説明書', group: '雇用', input: 'reward', render: render });
})();
