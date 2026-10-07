/*
 * 参考様式第１－５号 特定技能雇用契約書
 * 参考様式第１－６号 雇用条件書 ／ 同 別紙 賃金の支払
 */
(function () {
  'use strict';
  var SKS = window.SKS, h = SKS.UI.h, D = SKS.Doc, t = D.t, box = D.box, v = D.v;
  var MY_WEEK = 'တစ်ပတ်လျှင်', MY_MONTH = 'တစ်လလျှင်';

  SKS.DOC_INPUTS = SKS.DOC_INPUTS || [];
  SKS.DOC_INPUTS.push({
    key: 'contract', title: '雇用契約書・雇用条件書（1-5・1-6）',
    defaults: {
      renewal: '自動的に更新する', employType: '直接雇用', variable: 'なし', overtime: '有', annualLeave: '10', shortLeave: '無',
      prem60in: '25', prem60out: '50', premScheduled: '25', premLegalHoliday: '35', premOtherHoliday: '25', premNight: '25',
      closingDay: '末', payMethod: '口座振込', laborDeduct: '無', raise: '無', bonus: '無', retireAllow: '無', leaveAllowRate: '60',
      selfResignDays: '30', dismissDays: '30', dismissPayDays: '30',
      insKousei: '加入', insKenkou: '加入', insKoyou: '加入', insRousai: '加入', healthInterval: '1年'
    },
    fields: [
      { group: 'Ⅰ 雇用契約期間・更新' },
      { key: 'renewal', label: '契約の更新の有無', type: 'select', options: ['自動的に更新する', '更新する場合があり得る', '契約の更新はしない'] },
      { key: 'crit', label: '更新の判断基準（「更新する場合があり得る」の場合）', type: 'checks', options: [
        ['crit1', '契約期間満了時の業務量'], ['crit2', '労働者の勤務成績，態度'], ['crit3', '労働者の業務を遂行する能力'],
        ['crit4', '会社の経営状況'], ['crit5', '従事している業務の進捗状況'], ['crit6', 'その他']] },
      { key: 'critOther', label: '判断基準「その他」の内容' },
      { group: 'Ⅱ 就業の場所' },
      { key: 'employType', label: '雇用形態', type: 'select', options: ['直接雇用', '派遣雇用'], hint: '就業場所は受入機関の「就業する事業所」を使います' },
      { group: 'Ⅳ 労働時間等' },
      { key: 'variable', label: '変形労働時間制', type: 'select', options: ['なし', '1年単位', '1か月単位'] },
      { key: 'shifts', label: '交代制の勤務時間の組合せ（交代制の場合のみ）', type: 'list', max: 5, columns: [
        { key: 'start', label: '始業', type: 'time' }, { key: 'end', label: '終業', type: 'time' },
        { key: 'hours', label: '所定労働時間', type: 'time', placeholder: '08:00' }, { key: 'from', label: '適用日', type: 'date' }] },
      { key: 'daysWeek', label: '所定労働日数 週（日）', type: 'number', hint: '空欄のときは年間休日から自動計算' },
      { key: 'daysMonth', label: '所定労働日数 月（日）', type: 'number' },
      { key: 'daysYear', label: '所定労働日数 年（日）', type: 'number' },
      { key: 'overtime', label: '所定時間外労働の有無', type: 'select', options: ['有', '無'] },
      { key: 'rulesHours', label: '就業規則の該当条文（労働時間）', placeholder: '第10条～第15条' },
      { group: 'Ⅴ 休日' },
      { key: 'holidayRegular', label: '定例日', placeholder: '毎週土曜日・日曜日、日本の国民の祝日' },
      { key: 'holidayRegular_my', label: '定例日（ミャンマー語）', my: true },
      { key: 'holidayIrregularPer', label: '非定例日の単位', type: 'select', options: ['週当たり', '月当たり'] },
      { key: 'holidayIrregularDays', label: '非定例日（日）', type: 'number' },
      { key: 'holidayOther', label: '非定例日 その他', placeholder: '週休二日制' },
      { key: 'holidayOther_my', label: '非定例日 その他（ミャンマー語）', my: true },
      { key: 'rulesHoliday', label: '就業規則の該当条文（休日）' },
      { group: 'Ⅵ 休暇' },
      { key: 'annualLeave', label: '6か月継続勤務した場合の年次有給休暇（日）', type: 'number' },
      { key: 'shortLeave', label: '継続勤務6か月未満の年次有給休暇', type: 'select', options: ['無', '有'] },
      { key: 'shortLeaveText', label: '6か月未満の有給休暇の内容', placeholder: '3か月経過で5日' },
      { key: 'leavePaid', label: 'その他の休暇（有給）', placeholder: '慶弔休暇' },
      { key: 'leavePaid_my', label: 'その他の休暇（有給・ミャンマー語）', my: true },
      { key: 'leaveUnpaid', label: 'その他の休暇（無給）' },
      { key: 'leaveUnpaid_my', label: 'その他の休暇（無給・ミャンマー語）', my: true },
      { key: 'rulesLeave', label: '就業規則の該当条文（休暇）' },
      { group: 'Ⅶ 賃金（基本賃金・手当は「給与・労働条件」の入力を使います）' },
      { key: 'prem60in', label: '割増 法定超 月60時間以内（％）', type: 'number' },
      { key: 'prem60out', label: '割増 法定超 月60時間超（％）', type: 'number' },
      { key: 'premScheduled', label: '割増 所定超（％）', type: 'number' },
      { key: 'premLegalHoliday', label: '割増 法定休日（％）', type: 'number' },
      { key: 'premOtherHoliday', label: '割増 法定外休日（％）', type: 'number' },
      { key: 'premNight', label: '割増 深夜（％）', type: 'number' },
      { key: 'closingDay', label: '賃金締切日（毎月〇日）', required: true, placeholder: '末' },
      { key: 'payDay', label: '賃金支払日（毎月〇日）', required: true, placeholder: '25' },
      { key: 'payMethod', label: '賃金支払方法', type: 'select', options: ['口座振込', '通貨払'] },
      { key: 'laborDeduct', label: '労使協定に基づく賃金支払時の控除', type: 'select', options: ['無', '有'] },
      { key: 'raise', label: '昇給', type: 'select', options: ['無', '有'] },
      { key: 'raiseText', label: '昇給の時期・金額等' },
      { key: 'raiseText_my', label: '昇給の時期・金額等（ミャンマー語）', my: true },
      { key: 'bonus', label: '賞与', type: 'select', options: ['無', '有'] },
      { key: 'bonusText', label: '賞与の時期・金額等' },
      { key: 'bonusText_my', label: '賞与の時期・金額等（ミャンマー語）', my: true },
      { key: 'retireAllow', label: '退職金', type: 'select', options: ['無', '有'] },
      { key: 'retireAllowText', label: '退職金の時期・金額等' },
      { key: 'retireAllowText_my', label: '退職金の時期・金額等（ミャンマー語）', my: true },
      { key: 'leaveAllowRate', label: '休業手当の率（％）', type: 'number' },
      { group: 'Ⅷ 退職' },
      { key: 'selfResignDays', label: '自己都合退職の届出（退職する〇日前）', type: 'number' },
      { key: 'dismissDays', label: '解雇予告（〇日前）', type: 'number' },
      { key: 'dismissPayDays', label: '解雇予告手当（〇日分以上の平均賃金）', type: 'number' },
      { key: 'rulesRetire', label: '就業規則の該当条文（退職）' },
      { group: 'Ⅸ その他' },
      { key: 'insKousei', label: '厚生年金', type: 'select', options: ['加入', '非加入'] },
      { key: 'insKenkou', label: '健康保険', type: 'select', options: ['加入', '非加入'] },
      { key: 'insKoyou', label: '雇用保険', type: 'select', options: ['加入', '非加入'] },
      { key: 'insRousai', label: '労災保険', type: 'select', options: ['加入', '非加入'] },
      { key: 'insKokumin', label: '国民年金', type: 'select', options: ['非加入', '加入'] },
      { key: 'insKokuho', label: '国民健康保険', type: 'select', options: ['非加入', '加入'] },
      { key: 'insOther', label: 'その他の保険' },
      { key: 'healthHire', label: '雇入れ時の健康診断（年月）', type: 'month' },
      { key: 'healthFirst', label: '初回の定期健康診断（年月）', type: 'month' },
      { key: 'healthInterval', label: '定期健康診断の間隔', type: 'select', options: ['1年', '6か月'] }
    ]
  });

  // 「日本語　ミャンマー語」の形の文言を分ける
  function splitJpMy(s) {
    s = String(s).replace(/^[■□☑]\s*/, '');
    var i = s.search(/[က-႟(]/);
    if (i < 0) return { jp: s.trim(), my: '' };
    return { jp: s.slice(0, i).replace(/[\s　]+$/, ''), my: s.slice(i).trim() };
  }
  function opt(ctx, on, text) {
    var p = splitJpMy(text);
    return h('div', { class: 'opt' }, box(on) + '　' + p.jp, ctx.my && p.my ? h('span', { class: 'my inline', lang: 'my' }, '　' + p.my) : null);
  }
  function cleanIns(s) { return String(s).replace(/^[■□]\s*/, '').replace(/[\s,　]+$/, ''); }
  function myYesNo(yes) { return box(yes) + '　' + t('c16.yesWord.my').replace(/^[■□]\s*/, '') + '　' + box(!yes) + '　' + t('c16.noWord.my').replace(/^[■□]\s*/, ''); }
  function hmText(hours) { var x = D.hm(hours); return x.h + '時間' + x.m + '分'; }
  function roundUp2(x) { return Math.ceil(x * 100 - 1e-9) / 100; }

  function section(ctx, jp, my) { return h('h2', { class: 'sec' }, jp, D.myLine(ctx, my)); }
  function item(ctx, jp, my, body) {
    return h('div', { class: 'item' }, h('div', { class: 'item-title' }, jp, D.myLine(ctx, my)), body ? h('div', { class: 'item-body' }, body) : null);
  }
  function rulesLine(ctx, given, blankJp, blankMy) {
    return h('div', { class: 'rules' }, D.empty(given) ? blankJp : '○詳細は，就業規則　' + given, D.empty(given) ? D.myLine(ctx, blankMy) : null);
  }

  // ---------------- 1-5 雇用契約書 ----------------
  function renderContract(ctx) {
    var co = ctx.company, w = ctx.worker, s = ctx.case.schedule || {};
    var dm = t('c15.date.my');
    return h('section', { class: 'doc' },
      h('div', { class: 'form-no-row' }, h('div', { class: 'form-no' }, '参考様式第１－５号', D.myLine(ctx, t('c15.formNo.my'))), h('div', { class: 'muted-r' }, '（日本工業規格Ａ列４）')),
      h('h1', { class: 'doc-title' }, '特定技能雇用契約書'), D.myLine(ctx, t('c15.title.my'), 'doc-title-my'),
      h('p', { class: 'party' }, '特定技能所属機関　', v(co.name, true), '　（以下「甲」という。）と'),
      D.myLine(ctx, t('c15.kou.my') + '　' + (co.nameFor || co.name || '') + '　' + t('c15.kouSuffix.my')),
      h('p', { class: 'party' }, '特定技能外国人（候補者を含む。）　', v(w.name, true), '　（以下「乙」という。）は，'),
      D.myLine(ctx, t('c15.otsu.my') + '　' + (w.name || '') + '　' + t('c15.otsuSuffix.my')),
      D.bi(ctx, t('c15.agree'), t('c15.agree.my1') + t('c15.agree.my2'), 'para'),
      D.bi(ctx, t('c15.effect'), t('c15.effect.my'), 'para'),
      D.bi(ctx, t('c15.period'), t('c15.period.my'), 'para'),
      D.bi(ctx, t('c15.end'), t('c15.end.my'), 'para'),
      D.bi(ctx, t('c15.copies'), t('c15.copies.my'), 'para'),
      h('div', { class: 'date-right' }, D.jpDate(s.contractDate) + '　締結', D.myLine(ctx, D.myDate(s.contractDate) + dm[3])),
      h('div', { class: 'sign-two' },
        h('div', {}, h('div', {}, '甲　', v(co.name, true)), h('div', {}, '　　', v([co.repTitle, co.repName].filter(Boolean).join('　'), true), '　㊞'),
          h('div', { class: 'small' }, '（特定技能所属機関名・代表者役職名・氏名・捺印）'),
          D.myLine(ctx, t('c15.kouSign.my') + '　' + [co.repTitleFor, co.repName].filter(Boolean).join('　') + '　' + t('c15.seal.my')),
          D.myLine(ctx, t('c15.kouSignNote.my1') + t('c15.kouSignNote.my2'), 'small')),
        h('div', {}, h('div', {}, '乙　', h('span', { class: 'sign-space' }, '　')),
          h('div', { class: 'small' }, '（特定技能外国人の署名）'),
          D.myLine(ctx, t('c15.otsuSign.my')), D.myLine(ctx, t('c15.otsuSignNote.my'), 'small'))));
  }

  // ---------------- 1-6 雇用条件書 ----------------
  function renderConditions(ctx) {
    var co = ctx.company, w = ctx.worker, s = ctx.case.schedule || {}, k = (ctx.docs.contract || {});
    var lab = ctx.case.labor || {}, sal = ctx.case.salary || {}, calc = ctx.calc;
    var dm = t('c15.date.my');
    var my = ctx.my;
    // 労働時間
    var st = D.timeParts(lab.startTime), et = D.timeParts(lab.endTime), dh = D.hm(calc.dailyHours);
    var sh = t('c16.shiftTime.my');
    var hasShift = (k.shifts || []).some(function (x) { return x.start; });
    var workDaysYear = D.empty(k.daysYear) ? (lab.holidays ? 365 - D.num(lab.holidays) : '') : k.daysYear;
    var workDaysWeek = D.empty(k.daysWeek) ? (lab.holidays ? roundUp2((365 - D.num(lab.holidays)) / 365 * 7) : '') : k.daysWeek;
    var workDaysMonth = D.empty(k.daysMonth) ? (lab.holidays ? roundUp2((365 - D.num(lab.holidays)) / 12) : '') : k.daysMonth;
    var annual = calc.dailyHours !== null && lab.holidays ? calc.dailyHours * (365 - D.num(lab.holidays)) : null;
    var wk = annual !== null ? D.hm(annual / 365 * 7) : D.hm(null), mo = annual !== null ? D.hm(annual / 12) : D.hm(null), yr = annual !== null ? D.hm(annual) : D.hm(null);
    var ht = t('c16.hoursTotal.my'), dt = t('c16.days.my');
    var payWord = { '月給': t('c16.payMonthly.my'), '日給': t('c16.payDaily.my'), '時間給': t('c16.payHourly.my') };
    var allowances = (sal.allowances || []).filter(function (a) { return !D.empty(a.name); });
    var yn = function (val) { return val === '有'; };
    var detail = function (flag, text, textMy, myLabel) {
      return h('div', {},
        h('div', {}, box(yn(flag)) + ' 有（時期，金額等　', v(yn(flag) ? text : ''), '　），　' + box(!yn(flag)) + ' 無'),
        my ? h('div', { class: 'my', lang: 'my' }, myLabel + '　' + box(yn(flag)) + t('c16.yesDetail.my') + '　' + (yn(flag) ? (textMy || text || '') : '') + '　)　' + box(!yn(flag)) + t('c16.no.my')) : null);
    };
    var ins = [['insKousei', '厚生年金', 'c16.ins1.my'], ['insKenkou', '健康保険', 'c16.ins2.my'], ['insKoyou', '雇用保険', 'c16.ins3.my'],
      ['insRousai', '労災保険', 'c16.ins4.my'], ['insKokumin', '国民年金', 'c16.ins5.my'], ['insKokuho', '国民健康保険', 'c16.ins6.my']];
    var ym = function (val) { var m = /^(\d{4})-(\d{2})/.exec(val || ''); return m ? { y: +m[1], m: +m[2] } : { y: '　', m: '　' }; };
    var hh = ym(k.healthHire), hf = ym(k.healthFirst), hp = t('c16.healthDate.my');
    var intervalMy = k.healthInterval === '6か月' ? '6 လ' : '1 နှစ်';
    var dismissMy = t('c16.dismissText.my').replace('30', k.dismissDays || '　').replace('30', k.dismissPayDays || '　');

    return h('section', { class: 'doc' },
      D.docHead(ctx, '参考様式第１－６号', t('c16.formNo.my'), '雇用条件書', t('c16.title.my')),
      h('div', { class: 'date-right' }, D.jpDate(s.contractDate), D.myLine(ctx, D.myDate(s.contractDate))),
      h('div', { class: 'addressee' }, v(w.name, true), '　殿', D.myLine(ctx, t('c16.mr.my') + ' ' + (w.name || ''))),
      D.table([
        D.tr(D.th(h('div', {}, '特定技能所属機関名', D.myLine(ctx, t('c16.orgName.my')))), D.td(h('div', {}, v(co.name, true)), D.myLine(ctx, co.nameFor))),
        D.tr(D.th(h('div', {}, '所在地', D.myLine(ctx, t('c16.address.my')))), D.td(h('div', {}, v([co.addr1, co.addr2].filter(Boolean).join('　'), true)), D.myLine(ctx, co.addrFor))),
        D.tr(D.th(h('div', {}, '電話番号', D.myLine(ctx, t('c16.tel.my')))), D.td(v(co.tel))),
        D.tr(D.th(h('div', {}, '代表者　役職・氏名', D.myLine(ctx, t('c16.rep.my')))), D.td(h('div', {}, v([co.repTitle, co.repName].filter(Boolean).join('　'), true), '　㊞'), D.myLine(ctx, [co.repTitleFor, co.repName].filter(Boolean).join('　'))))
      ], 'issuer'),

      section(ctx, 'Ⅰ．雇用契約期間', t('c16.s1.my')),
      item(ctx, '１．雇用契約期間', null, [
        h('div', {}, '（　' + D.jpDate(s.employStart) + '　～　' + D.jpDate(ctx.employEnd) + '　）　　入国予定日　' + D.jpDate(s.entryDate)),
        D.myLine(ctx, '（　' + D.myDate(s.employStart) + '　～　' + D.myDate(ctx.employEnd) + '　）　' + t('c16.entryDate.my') + D.myDate(s.entryDate))]),
      item(ctx, '２．契約の更新の有無', t('c16.s2.my'), [
        opt(ctx, k.renewal === '自動的に更新する', t('c16.renew.auto')),
        opt(ctx, k.renewal === '更新する場合があり得る', t('c16.renew.maybe')),
        opt(ctx, k.renewal === '契約の更新はしない', t('c16.renew.no')),
        D.bi(ctx, '※' + t('c16.renewNote'), t('c16.renewNote.my'), 'small'),
        h('div', { class: 'indent' }, ['crit1', 'crit2', 'crit3', 'crit4', 'crit5'].map(function (c) {
          return opt(ctx, k.renewal === '更新する場合があり得る' && (k.crit || {})[c], t('c16.' + c));
        }), (function () {
          var on = k.renewal === '更新する場合があり得る' && (k.crit || {}).crit6;
          return h('div', { class: 'opt' }, box(on) + '　その他（　', v(on ? k.critOther : ''), '　）', my ? h('span', { class: 'my inline', lang: 'my' }, '　' + splitJpMy(t('c16.crit6')).my) : null);
        })())]),

      section(ctx, 'Ⅱ．就業の場所', t('c16.place.my')),
      h('div', { class: 'opts-row' },
        h('div', {}, box(k.employType !== '派遣雇用') + '　直接雇用（以下に記入）', D.myLine(ctx, t('c16.direct.my'))),
        h('div', {}, box(k.employType === '派遣雇用') + '　派遣雇用（別紙「就業条件明示書」に記入）', D.myLine(ctx, t('c16.dispatch.my')))),
      D.table([
        D.tr(D.th(h('div', {}, '事業所名', D.myLine(ctx, t('c16.siteName.my')))), D.td(h('div', {}, v(co.siteName, true)), D.myLine(ctx, co.siteNameFor))),
        D.tr(D.th(h('div', {}, '所在地', D.myLine(ctx, t('c16.siteAddr.my')))), D.td(h('div', {}, v(co.siteAddr, true)), D.myLine(ctx, co.siteAddrFor))),
        D.tr(D.th(h('div', {}, '連絡先', D.myLine(ctx, t('c16.siteTel.my')))), D.td(v(co.siteTel)))
      ]),

      section(ctx, 'Ⅲ．従事すべき業務の内容', t('c16.job.my')),
      item(ctx, '１．分　　野（　' + (co.field || '　　　　') + '　）', my ? t('c16.field.my') + ' ( ' + (co.fieldFor || '') + ' )' : null),
      item(ctx, '２．業務区分（　' + (co.category || '　　　　') + '　）', my ? t('c16.category.my') + ' ( ' + (co.categoryFor || '') + ' )' : null),

      section(ctx, 'Ⅳ．労働時間等', t('c16.hours.my')),
      item(ctx, '１．始業・終業の時刻等', t('c16.hours1.my'), [
        h('div', {}, '(1) 始業（' + st.h + '時' + st.m + '分）　終業（' + et.h + '時' + et.m + '分）　（１日の所定労働時間数　' + dh.h + '時間' + dh.m + '分）'),
        D.myLine(ctx, '(၁) ' + D.fill(sh.slice(1), [st.h, st.m, et.h, et.m, dh.h, dh.m])),
        h('div', {}, '(2) 【次の制度が労働者に適用される場合】'), D.myLine(ctx, t('c16.variable.my')),
        h('div', { class: 'indent' },
          h('div', {}, box(k.variable && k.variable !== 'なし') + '　変形労働時間制：（　' + (k.variable && k.variable !== 'なし' ? k.variable.replace('単位', '') : '　　') + '　）単位の変形労働時間制'),
          D.myLine(ctx, t('c16.variableUnit.my') + ' ' + (k.variable === '1年単位' ? '1 နှစ်' : k.variable === '1か月単位' ? '1 လ' : '　') + ' )'),
          D.bi(ctx, '※' + t('c16.variableNote'), t('c16.variableNote.my'), 'small'),
          h('div', {}, box(hasShift) + '　交代制として，次の勤務時間の組合せによる。'), D.myLine(ctx, t('c16.shift.my')),
          (hasShift ? k.shifts : [{}]).filter(function (x, i) { return hasShift ? x.start : i === 0; }).map(function (x) {
            var a = D.timeParts(x.start), b = D.timeParts(x.end), hrs = D.timeParts(x.hours);
            var from = x.from ? x.from.replace(/-0?/g, '/') : '　　　　';
            return h('div', { class: 'shift' },
              h('div', {}, '始業（' + a.h + '時' + a.m + '分）　終業（' + b.h + '時' + b.m + '分）　（適用日 ' + from + '，１日の所定労働時間数 ' + hrs.h + '時間' + hrs.m + '分）'),
              D.myLine(ctx, D.fill(sh.slice(1), [a.h, a.m, b.h, b.m, hrs.h, hrs.m]) + (x.from ? ' (' + from + ')' : '')));
          }))]),
      item(ctx, '２．休憩時間（　' + (lab.breakMin || '　') + '　分）', my ? t('c16.break.my') + ' ' + (lab.breakMin || '　') + ' ' + t('c16.breakUnit.my') : null),
      item(ctx, '３．所定労働時間数　①週（' + wk.h + '時間' + wk.m + '分）　②月（' + mo.h + '時間' + mo.m + '分）　③年（' + yr.h + '時間' + yr.m + '分）',
        my ? D.fill(ht, [wk.h, wk.m, mo.h, mo.m, yr.h, yr.m]) : null),
      item(ctx, '４．所定労働日数　①週（' + workDaysWeek + '日）　②月（' + workDaysMonth + '日）　③年（' + workDaysYear + '日）',
        my ? D.fill(dt, [workDaysWeek, workDaysMonth, workDaysYear]) : null),
      item(ctx, '５．所定時間外労働の有無　' + box(k.overtime === '有') + '　有　　' + box(k.overtime !== '有') + '　無', my ? t('c16.overtime.my') + '　' + myYesNo(k.overtime === '有') : null),
      rulesLine(ctx, k.rulesHours, t('c16.rulesHours'), t('c16.rules.my')),

      section(ctx, 'Ⅴ．休日', t('c16.holiday.my')),
      item(ctx, '１．定例日：　' + (k.holidayRegular || '　　　　') + '　（年間合計休日日数：' + (lab.holidays || '　') + '日）',
        my ? t('c16.holiday1.my') + ' ' + (k.holidayRegular_my || '') + ' ' + D.fill(t('c16.holidayTotal.my'), [lab.holidays || '　']) : null),
      item(ctx, '２．非定例日：' + (k.holidayIrregularPer || '週・月当たり') + '　' + (k.holidayIrregularDays || '　') + '　日、その他（　' + (k.holidayOther || '　　') + '　）',
        my ? t('c16.holiday2.my') + ' ' + (k.holidayIrregularPer === '月当たり' ? MY_MONTH : k.holidayIrregularPer === '週当たり' ? MY_WEEK : MY_WEEK + ' . ' + MY_MONTH) + ' ' + (k.holidayIrregularDays || '　') + ' ' + t('c16.holidayOther.my') + ' ' + (k.holidayOther_my || '') + ' )' : null),
      rulesLine(ctx, k.rulesHoliday, t('c16.rulesHoliday'), t('c16.rulesHoliday.my')),

      section(ctx, 'Ⅵ．休暇', t('c16.leave.my')),
      item(ctx, '１．年次有給休暇　　６か月継続勤務した場合→　' + (k.annualLeave || '　') + '　日', null, [
        D.myLine(ctx, D.fill(t('c16.annualLeave.my'), [k.annualLeave || '　'])),
        h('div', {}, '継続勤務６か月未満の年次有給休暇（' + box(k.shortLeave === '有') + '有　' + box(k.shortLeave !== '有') + '無）　→　' + (k.shortLeave === '有' ? (k.shortLeaveText || '') : 'ヶ月経過で　　日')),
        D.myLine(ctx, t('c16.shortLeave.my')[0] + box(k.shortLeave === '有') + t('h116.yes.my') + '　' + box(k.shortLeave !== '有') + t('h116.no.my') + t('c16.shortLeave.my')[1].replace(/→.*$/, '→ ' + (k.shortLeave === '有' ? (k.shortLeaveText || '') : '')))]),
      item(ctx, '２．その他の休暇　　有給（　' + (k.leavePaid || '　　') + '　）　無給（　' + (k.leaveUnpaid || '　　') + '　）',
        my ? t('c16.leaveOther.my') + ' ' + (k.leavePaid_my || '') + ' ' + t('c16.leaveUnpaid.my') + ' ' + (k.leaveUnpaid_my || '') + ' )' : null),
      item(ctx, '３．一時帰国休暇', t('c16.homeLeave.my'), D.bi(ctx, t('c16.homeLeaveText'), t('c16.homeLeaveText.my'))),
      rulesLine(ctx, k.rulesLeave, t('c16.rulesLeave'), t('c16.rulesLeave.my')),

      section(ctx, 'Ⅶ．賃金', t('c16.wage.my')),
      item(ctx, '１．基本賃金', null, [
        h('div', { class: 'opts-row' }, ['月給', '日給', '時間給'].map(function (p) {
          var on = (sal.payType || '月給') === p;
          return h('div', {}, box(on) + '　' + p + '（', v(on ? D.yen(sal.basePay) : ''), '円）');
        })),
        D.myLine(ctx, t('c16.basePay.my') + '　' + ['月給', '日給', '時間給'].map(function (p) {
          var on = (sal.payType || '月給') === p;
          return box(on) + payWord[p] + ' (' + (on ? D.yen(sal.basePay) : '　') + ' ' + t('w16.yen.my') + ')';
        }).join('　')),
        D.bi(ctx, '※詳細は別紙のとおり', t('c16.detailAttached.my'), 'small')]),
      item(ctx, '２．諸手当（時間外労働の割増賃金は除く）', t('c16.allow.my'), [
        h('div', {}, '（' + (allowances.length ? allowances.map(function (a) { return a.name.replace(/手当$/, '') + '手当'; }).join('，') : '　　　手当，　　　手当，　　　手当') + '）'),
        D.myLine(ctx, '(' + allowances.map(function (a) { return a.name_my || a.name; }).join('၊ ') + ')'),
        D.bi(ctx, '※詳細は別紙のとおり', t('c16.detailAttached.my'), 'small')]),
      item(ctx, '３．所定時間外，休日又は深夜労働に対して支払われる割増賃金率', t('c16.premium.my'), [
        h('div', {}, '(1) 所定時間外　法定超月60時間以内（' + (k.prem60in || '　') + '）％　法定超月60時間超（' + (k.prem60out || '　') + '）％　所定超（' + (k.premScheduled || '　') + '）％'),
        D.myLine(ctx, t('c16.prem1.my') + ' ' + t('c16.prem1a.my') + ' (' + (k.prem60in || '　') + ')%　' + t('c16.prem1b.my') + ' (' + (k.prem60out || '　') + ')%　' + t('c16.prem1c.my') + ' (' + (k.premScheduled || '　') + ')%'),
        h('div', {}, '(2) 休日　法定休日（' + (k.premLegalHoliday || '　') + '）％，法定外休日（' + (k.premOtherHoliday || '　') + '）％'),
        D.myLine(ctx, t('c16.prem2.my') + ' ' + t('c16.prem2a.my') + ' ' + (k.premLegalHoliday || '　') + ' )%　' + t('c16.prem2b.my') + ' (' + (k.premOtherHoliday || '　') + ')%'),
        h('div', {}, '(3) 深夜（' + (k.premNight || '　') + '）％'),
        D.myLine(ctx, t('c16.prem3.my') + ' (' + (k.premNight || '　') + ')%')]),
      item(ctx, '４．賃金締切日　■　毎月　' + (k.closingDay || '　') + '　日，　□　毎月　　　日',
        my ? D.fill(t('c16.closing.my'), [k.closingDay === '末' ? 'အဆုံး' : (k.closingDay || '　')]) : null),
      item(ctx, '５．賃金支払日　■　毎月　' + (k.payDay || '　') + '　日，　□　毎月　　　日',
        my ? D.fill(t('c16.payday.my'), [k.payDay === '末' ? 'အဆုံး' : (k.payDay || '　')]) : null),
      item(ctx, '６．賃金支払方法　' + box(k.payMethod !== '通貨払') + '　口座振込　' + box(k.payMethod === '通貨払') + '　通貨払',
        my ? t('c16.method.my') + '　' + box(k.payMethod !== '通貨払') + ' ' + t('c16.transfer.my') + '　' + box(k.payMethod === '通貨払') + ' ' + t('c16.cash.my') : null),
      item(ctx, '７．労使協定に基づく賃金支払時の控除　' + box(k.laborDeduct !== '有') + '　無，　' + box(k.laborDeduct === '有') + '　有',
        my ? t('c16.deduct.my').split(/\s+□/)[0] + '　' + box(k.laborDeduct !== '有') + '　' + t('c16.no.my') + '　' + box(k.laborDeduct === '有') + '　' + t('c16.yesWord.my').replace(/^[■□]\s*/, '') : null),
      D.bi(ctx, '※詳細は別紙のとおり', t('c16.detailAttached.my'), 'small indent'),
      item(ctx, '８．昇給', null, detail(k.raise, k.raiseText, k.raiseText_my, t('c16.raise.my'))),
      item(ctx, '９．賞与', null, detail(k.bonus, k.bonusText, k.bonusText_my, t('c16.bonus.my'))),
      item(ctx, '10．退職金', null, detail(k.retireAllow, k.retireAllowText, k.retireAllowText_my, t('c16.retire.my'))),
      item(ctx, '11．休業手当　■　有（率　' + (k.leaveAllowRate || '　') + '　％）', my ? t('c16.leaveAllow.my') + ' ' + (k.leaveAllowRate || '　') + ' ' + t('c16.rate.my') : null),

      section(ctx, 'Ⅷ．退職に関する事項', t('c16.retireSec.my')),
      item(ctx, '１．自己都合退職の手続（退職する　' + (k.selfResignDays || '　') + '　日前に社長・工場長等に届けること）',
        my ? D.fill(t('c16.selfResign.my'), [k.selfResignDays || '　']) : null),
      item(ctx, '２．解雇の事由及び手続', t('c16.dismiss.my'), [
        h('div', {}, t('c16.dismissText1') + '　' + (k.dismissDays || '　') + '　' + t('c16.dismissMid') + '　' + (k.dismissPayDays || '　') + '　' + t('c16.dismissText2')),
        D.myLine(ctx, dismissMy)]),
      rulesLine(ctx, k.rulesRetire, t('c16.rulesRetire'), t('c16.rulesShort.my')),

      section(ctx, 'Ⅸ．その他', t('c16.other.my')),
      item(ctx, '１．社会保険の加入状況・労働保険の適用状況', t('c16.insurance.my'), [
        h('div', {}, ins.map(function (x) { return box(k[x[0]] === '加入') + '　' + x[1]; }).join('　，') + '　，' + box(!D.empty(k.insOther)) + '　その他（　' + (k.insOther || '　　') + '　）'),
        D.myLine(ctx, ins.map(function (x) { return box(k[x[0]] === '加入') + ' ' + cleanIns(t(x[2])); }).join('၊ ') + '၊ ' + box(!D.empty(k.insOther)) + ' ' + cleanIns(t('c16.ins7.my')))]),
      item(ctx, '２．雇入れ時の健康診断　　' + hh.y + '年' + hh.m + '月', my ? t('c16.health.my') + '　' + hh.y + hp[0] + hh.m + ' လ' : null),
      item(ctx, '３．初回の定期健康診断　　' + hf.y + '年' + hf.m + '月（その後　' + (k.healthInterval || '　') + '　ごとに実施）',
        my ? t('c16.firstCheck.my') + '　' + hf.y + hp[0] + hf.m + hp[1] + ' ' + intervalMy + ' ' + t('c16.everyCheck.my') : null),
      item(ctx, t('c16.returnFare').replace(/\n\s*/g, ''), t('c16.returnFare.my')),
      h('div', { class: 'receiver' }, '受取人（署名）', D.myLine(ctx, t('c16.receiver.my')), h('span', { class: 'sign-space' }, '　')));
  }

  // ---------------- 1-6 別紙 賃金の支払 ----------------
  function renderWage(ctx) {
    var sal = ctx.case.salary || {}, c = ctx.calc, d = sal.deductions || {};
    var payMy = { '月給': t('w16.monthly.my'), '日給': t('w16.daily.my'), '時間給': t('w16.hourly.my') };
    var type = sal.payType || '月給';
    var ap = t('w16.approxPat.my'), yenMy = t('w16.yen.my');
    var approxMy = function (n) { return D.fill(ap, [D.yen(n) || '　']); };
    var allowances = sal.allowances || [];
    var letters = ['a', 'b', 'c', 'd', 'e'];
    var allowMy = t('w16.allow.my').replace(/^\([a-e]\)\s*/, '');
    var others = (sal.otherDeductions || []);
    var dedRows = [
      ['(a) 税　　　金', 'w16.tax.my', d.incomeTax], ['(b) 社会保険料', 'w16.social.my', d.socialIns], ['(c) 雇用保険料', 'w16.empIns.my', d.empIns],
      ['(d) 食　　　費', 'w16.food.my', d.food], ['(e) 居　住　費', 'w16.housing.my', d.housing]
    ];
    var util = splitJpMy(t('w16.utility'));
    return h('section', { class: 'doc' },
      D.docHead(ctx, '参考様式第１－６号　別紙', t('w16.formNo.my'), '賃　　金　　の　　支　　払', t('w16.title.my')),
      item(ctx, '１．基本賃金　　' + type + '　' + (D.yen(sal.basePay) || '　　') + '　円', my(ctx, t('w16.s1.my') + '　' + payMy[type] + '　' + (D.yen(sal.basePay) || '　') + ' ' + yenMy), [
        h('div', {}, t('w16.fixed') + '　' + (D.yen(c.monthlyA) || '　') + '　円'),
        D.myLine(ctx, t('w16.fixed.my') + '　' + (D.yen(c.monthlyA) || '　') + ' ' + yenMy + ')'),
        type !== '時間給' ? h('div', {}, t('w16.perHour') + '　（' + (c.hourly !== null ? Math.floor(c.hourly).toLocaleString('ja-JP') : '　') + '円）') : null,
        type !== '時間給' ? D.myLine(ctx, t('w16.perHour.my') + ' (' + (c.hourly !== null ? Math.floor(c.hourly).toLocaleString('ja-JP') : '　') + ' ' + yenMy + ')') : null,
        type !== '月給' ? h('div', {}, t('w16.perMonth') + '　（' + D.yen(c.monthlyBase) + '円）') : null,
        type !== '月給' ? D.myLine(ctx, t('w16.perMonth.my') + ' (' + D.yen(c.monthlyBase) + ' ' + yenMy + ')') : null]),
      item(ctx, t('w16.s2'), t('w16.s2.my'), letters.map(function (l, i) {
        var a = allowances[i] || {};
        var on = !D.empty(a.name);
        return h('div', { class: 'allow-row' },
          h('div', {}, '(' + l + ') （' + (on ? a.name : '　　　　') + '　' + (on ? D.yen(a.amount) : '　　') + '　円／計算方法：' + (on ? (a.method || '') : '　　') + '）'),
          on ? D.myLine(ctx, '(' + l + ') ' + allowMy + ' ' + (a.name_my || a.name) + ' ' + D.yen(a.amount) + ' ' + t('w16.calc.my') + ' ' + (a.method_my || a.method || '') + ')') : null);
      })),
      item(ctx, '３．１か月当たりの支払概算額（１＋２）　約　' + D.yen(c.monthlyC) + '　円（合計）',
        my(ctx, t('w16.s3.my') + '　' + t('w16.approx.my') + ' ' + D.yen(c.monthlyC) + ' ' + t('w16.yenTotal.my'))),
      item(ctx, '４．賃金支払時に控除する項目', t('w16.s4.my'), [
        D.table(dedRows.map(function (r) {
          return D.tr(D.td(h('div', {}, r[0]), D.myLine(ctx, t(r[1]))), D.td('（約　' + (D.yen(r[2]) || '　　') + '　円）', { class: 'num' }), ctx.my ? D.td(approxMy(r[2]), { class: 'my', lang: 'my' }) : null);
        }).concat([
          D.tr(D.td(h('div', {}, '(f) その他' + util.jp), D.myLine(ctx, t('w16.other.my') + ' ' + util.my)), D.td('（約　' + (D.yen(d.utility) || '　　') + '　円）', { class: 'num' }), ctx.my ? D.td(approxMy(d.utility), { class: 'my', lang: 'my' }) : null)
        ]).concat([0, 1, 2].map(function (i) {
          var o = others[i] || {};
          return D.tr(D.td('　　（　' + (o.name || '　　　　') + '　）'), D.td('（約　' + (D.yen(o.amount) || '　　') + '　円）', { class: 'num' }), ctx.my ? D.td(approxMy(o.amount), { class: 'my', lang: 'my' }) : null);
        })).concat([
          D.tr(D.td(h('div', {}, '控除する金額'), D.myLine(ctx, t('w16.deductTotal.my'))), D.td('約　' + D.yen(c.deductionTotal) + '　円（合計）', { class: 'num strong' }), ctx.my ? D.td(approxMy(c.deductionTotal), { class: 'my', lang: 'my' }) : null)
        ]), 'plain')]),
      item(ctx, '５．手取り支給額（３－４）　約　' + D.yen(c.takeHome) + '　円（合計）', my(ctx, t('w16.s5.my') + '　' + t('w16.approx.my') + ' ' + D.yen(c.takeHome) + ' ' + t('w16.yenTotal.my'))),
      D.bi(ctx, t('w16.note'), t('w16.note.my'), 'small'));
  }
  function my(ctx, s) { return ctx.my ? s : null; }

  SKS.DOCS.push({ id: '1-5', no: '参考様式第1-5号', title: '特定技能雇用契約書', group: '雇用', input: 'contract', bilingual: true, render: renderContract });
  SKS.DOCS.push({ id: '1-6', no: '参考様式第1-6号', title: '雇用条件書', group: '雇用', input: 'contract', bilingual: true, render: renderConditions });
  SKS.DOCS.push({ id: '1-6b', no: '参考様式第1-6号 別紙', title: '賃金の支払', group: '雇用', input: 'contract', bilingual: true, render: renderWage });
})();
