/* 参考様式第１－１７号 １号特定技能外国人支援計画書 */
(function () {
  'use strict';
  var SKS = window.SKS, h = SKS.UI.h, D = SKS.Doc, t = D.t, box = D.box, v = D.v;

  var METHODS = {
    face: ['対面', 'p117.m.face.my'],
    tv: ['テレビ電話装置', 'p117.m.tv.my'],
    video: ['テレビ電話やＤＶＤ等の動画視聴等（質問に応じる体制あり）', 'p117.m.video.my'],
    info: ['手続に係る情報提供', 'p117.m.info.my'],
    accompany: ['必要に応じて手続に同行', 'p117.m.accompany.my'],
    radio: ['無線や船舶電話（漁船漁業のみ）', 'p117.m.radio.my'],
    other: ['その他', 'p117.m.other.my']
  };
  // 支援計画の構成（項目の文言は様式どおり texts.js から）
  var SECTIONS = [
    { n: '1', head: 'ア　情報提供内容等', headMy: 'p117.info.my', items: ['1a', '1b', '1c', '1d', '1e', '1f', '1g', '1h', '1i', '1j'], methods: ['face', 'tv', 'other'], lang: true, hours: true },
    { n: '2', items: ['2a', '2b'], airport: true },
    { n: '3', groups: [
      { head: 'p117.i3A', headMy: 'p117.i3A.my', items: ['3a', '3b', '3c'], house: true },
      { head: 'p117.i3B', headMy: 'p117.i3B.my', items: ['3Ba', '3Bb', '3Bc'], methods: ['info', 'accompany', 'other'] }] },
    { n: '4', head: 'ア　情報提供内容等', headMy: 'p117.info.my', items: ['4a', '4b', '4c', '4d', '4e', '4f'], methods: ['face', 'video', 'other'], lang: true, hours: true },
    { n: '5', items: ['5a', '5b', '5c'] },
    { n: '6', head: 'ア　対応内容等', headMy: 'p117.resp.my', items: ['6a', '6b'], consult: true, lang: true },
    { n: '7', items: ['7a', '7b'] },
    { n: '8', items: ['8a', '8b', '8c', '8d', '8e', '8f', '8g'] },
    { n: '9', head: 'ア　面談内容等', headMy: 'p117.interview.my', items: ['9a', '9b', '9c', '9d'], methods: ['face', 'tv', 'radio', 'other'], lang: true }
  ];
  // 既定で「無」にする項目（いずれかを選ぶ項目など）
  var DEFAULT_NO = { '3a': true, '3c': true, '5c': true };

  SKS.PLAN = { SECTIONS: SECTIONS, METHODS: METHODS, DEFAULT_NO: DEFAULT_NO };
  SKS.DOC_INPUTS = SKS.DOC_INPUTS || [];
  SKS.DOC_INPUTS.push({
    key: 'plan', title: '支援計画書（1-17）', planEditor: true,
    defaults: { others: '0', neutral: '有', proper: '有', houseStatus: '申請時点で確保している', hours1: '', hours4: '8' },
    fields: [
      { group: '支援対象者・体制' },
      { key: 'others', label: 'Ⅰ 支援対象者 ほか（名）', type: 'number' },
      { key: 'neutral', label: 'Ⅱ-4 支援の中立性を確保していることの有無（自社支援の場合）', type: 'select', options: ['有', '無'] },
      { key: 'proper', label: 'Ⅲ-8 支援の適正性を確保していることの有無（委託の場合）', type: 'select', options: ['有', '無'] },
      { group: '実施言語・時間' },
      { key: 'lang', label: '実施言語', placeholder: '日本語・ミャンマー語' },
      { key: 'interp', label: '通訳者の所属・氏名（支援担当者以外が通訳する場合）' },
      { key: 'hours1', label: '1 事前ガイダンスの実施予定時間（合計・時間）', type: 'number', hint: '3時間以上' },
      { key: 'hours4', label: '4 生活オリエンテーションの実施予定時間（合計・時間）', type: 'number', hint: '8時間以上' },
      { group: '2 出入国する際の送迎' },
      { key: 'airportIn', label: '出迎え空港等', placeholder: '成田' },
      { key: 'transportIn', label: '送迎方法（入国時）', placeholder: '所属機関の社用車' },
      { key: 'airportOut', label: '出国予定空港等', placeholder: '成田' },
      { key: 'transportOut', label: '送迎方法（出国時）', placeholder: '所属機関の社用車' },
      { group: '3 住居の概要' },
      { key: 'houseStatus', label: '住居の確保', type: 'select', options: ['申請時点で確保している', '申請の後に確保する'] },
      { key: 'houseRoom', label: '居室の広さ（㎡）', type: 'number' },
      { key: 'housePeople', label: '同居人数計（人）', type: 'number' },
      { key: 'houseBed', label: '寝室の広さ（㎡）', type: 'number' },
      { group: '6 相談又は苦情への対応 イ 実施方法' },
      { key: 'hoursWeekday', label: '対応時間 平日（月〜金）', placeholder: '9時～18時' },
      { key: 'hoursSat', label: '対応時間 土曜', placeholder: '9時～18時' },
      { key: 'hoursSun', label: '対応時間 日曜' },
      { key: 'hoursHoliday', label: '対応時間 祝日' },
      { key: 'consultTel', label: '相談方法 電話番号', hint: '空欄のときは支援担当者の電話番号' },
      { key: 'consultMail', label: '相談方法 メール', hint: '空欄のときは支援担当者のメール' },
      { key: 'consultOther', label: '相談方法 その他', placeholder: 'LINE 等' },
      { key: 'emergencyTel', label: '緊急時 電話番号', hint: '空欄のときは相談方法と同じ' },
      { key: 'emergencyMail', label: '緊急時 メール' },
      { key: 'emergencyOther', label: '緊急時 その他' }
    ]
  });

  function itemState(ctx, key) {
    var p = ctx.docs.plan || {}, it = (p.items || {})[key] || {};
    var sup = ctx.support, co = ctx.company;
    var entrust = it.entrust || (sup ? '有' : '無');
    var person = it.person !== undefined && it.person !== '' ? it.person
      : sup ? [sup.staffName, sup.staffTitle ? '（' + sup.staffTitle + '）' : ''].join('')
        : [co.spStaffName, co.spStaffTitle ? '（' + co.spStaffTitle + '）' : ''].join('');
    var addr = it.addr !== undefined && it.addr !== '' ? it.addr : (entrust === '有' && sup ? [sup.zip ? '〒' + sup.zip : '', sup.addr1, sup.addr2].filter(Boolean).join(' ') : '');
    return {
      plan: it.plan || (DEFAULT_NO[key] ? '無' : '有'), when: it.when || '', entrust: entrust,
      person: person, addr: addr, m: it.m || null, mOther: it.mOther || ''
    };
  }
  SKS.PLAN.itemState = itemState;

  function defaultMethods(sec) {
    var m = {};
    if (!sec.methods) return m;
    if (sec.methods.indexOf('face') >= 0) m.face = true;
    if (sec.methods.indexOf('info') >= 0) { m.info = true; m.accompany = true; }
    return m;
  }
  SKS.PLAN.defaultMethods = defaultMethods;

  function cleanMy(s) { return String(s || '').replace(/\s*\(\s*\)\s*$/, '').replace(/\s+\(\s+\)\s*$/, '').trim(); }

  function methodCell(ctx, sec, st, key) {
    var p = ctx.docs.plan || {};
    if (sec.airport && key === '2a') {
      return [h('div', {}, box(true) + ' 出迎え空港等（' + (p.airportIn || '　　') + ' 空港）'), D.myLine(ctx, t('p117.m.airportIn.my') + ' (' + (p.airportIn || '') + ')'),
        h('div', {}, box(true) + ' 送迎方法（' + (p.transportIn || '　　') + '）'), D.myLine(ctx, cleanMy(t('p117.m.transport.my').replace(/\(.*\)$/, '')) + ' (' + (p.transportIn || '') + ')')];
    }
    if (sec.airport && key === '2b') {
      return [h('div', {}, box(true) + ' 出国予定空港等（' + (p.airportOut || '　　') + ' 空港）'), D.myLine(ctx, t('p117.m.airportOut.my') + ' (' + (p.airportOut || '') + ')'),
        h('div', {}, box(true) + ' 送迎方法（' + (p.transportOut || '　　') + '）'), D.myLine(ctx, cleanMy(t('p117.m.transport.my').replace(/\(.*\)$/, '')) + ' (' + (p.transportOut || '') + ')')];
    }
    if (!sec.methods) return '';
    var m = st.m || defaultMethods(sec);
    return sec.methods.map(function (mk) {
      var on = st.plan === '有' && !!m[mk];
      var lbl = METHODS[mk][0] + (mk === 'other' ? '（' + (on ? st.mOther : '　　') + '）' : '');
      return h('div', { class: 'm' }, box(on) + ' ' + lbl, D.myLine(ctx, cleanMy(t(METHODS[mk][1])) + (mk === 'other' && on ? ' (' + st.mOther + ')' : '')));
    });
  }

  function itemRow(ctx, sec, key, freeText) {
    var st = itemState(ctx, key);
    var yes = st.plan === '有';
    var isFree = key.slice(-4) === 'free';
    var jp = isFree ? '（自由記入）' + (freeText ? '　' + freeText : '') : t('p117.i' + key);
    var my = isFree ? t('p117.free.my') : t('p117.i' + key + '.my');
    return h('tr', {},
      h('td', { class: 'content' }, jp, D.myLine(ctx, my)),
      h('td', { class: 'plan' }, h('div', {}, box(yes) + ' 有（' + (yes ? st.when : '　') + '）'), h('div', {}, box(!yes) + ' 無'),
        D.myLine(ctx, box(yes) + ' ' + t('h116.yes.my') + '　' + box(!yes) + ' ' + t('h116.no.my'))),
      h('td', { class: 'entrust center' }, yes ? (st.entrust === '有' ? '有' : '無') : '', ctx.my && yes ? D.myLine(ctx, st.entrust === '有' ? t('h116.yes.my') : t('h116.no.my')) : null),
      h('td', {}, yes ? st.person : ''),
      h('td', {}, yes && st.entrust === '有' ? st.addr : ''),
      h('td', { class: 'method' }, yes ? methodCell(ctx, sec, st, key) : ''));
  }
  function headRow(ctx, withMethod) {
    return h('thead', {}, h('tr', {},
      h('th', {}, '支援内容', D.myLine(ctx, t('p117.colContent.my'))),
      h('th', {}, '実施予定', D.myLine(ctx, t('p117.colPlan.my'))),
      h('th', {}, '委託の有無', D.myLine(ctx, t('p117.colEntrust.my'))),
      h('th', {}, '支援担当者又は委託を受けた実施担当者 氏名（役職）', D.myLine(ctx, t('p117.colName.my'))),
      h('th', {}, '住所（委託を受けた場合のみ）', D.myLine(ctx, t('p117.colAddr.my'))),
      h('th', {}, withMethod ? '実施方法（該当するもの全てにチェック）' : '実施方法', D.myLine(ctx, t('p117.colMethod.my')))));
  }
  function itemsTable(ctx, sec, items, freeKey) {
    var p = ctx.docs.plan || {};
    var rows = items.map(function (k) { return itemRow(ctx, sec, k); });
    rows.push(itemRow(ctx, sec, freeKey, ((p.free || {})[freeKey] || '')));
    return h('table', { class: 'form-table plan-table' }, headRow(ctx, !!sec.methods), h('tbody', {}, rows));
  }

  function langBlock(ctx, label) {
    var p = ctx.docs.plan || {};
    return D.table([D.tr(D.th(h('div', {}, label + '　実施言語'), D.myLine(ctx, t('p117.lang.my'))),
      D.td(v(p.lang || (ctx.my ? '日本語・ミャンマー語' : ''))), D.th(h('div', {}, '（支援担当者以外の者が通訳を担う場合）通訳者の所属・氏名'), D.myLine(ctx, t('p117.interp.my'))), D.td(v(p.interp)))], 'plain');
  }
  function hoursBlock(ctx, label, hours) {
    return D.table([D.tr(D.th(h('div', {}, label + '　実施予定時間'), D.myLine(ctx, t('p117.time.my'))),
      D.td('合計　', v(hours), '　時間', D.myLine(ctx, t('p117.total.my') + ' ' + (hours || '　') + ' ' + t('p117.hours.my'))))], 'plain');
  }
  function houseBlock(ctx) {
    var p = ctx.docs.plan || {};
    var secured = p.houseStatus !== '申請の後に確保する';
    return h('div', { class: 'house' },
      h('div', { class: 'strong' }, t('p117.i3d'), D.myLine(ctx, t('p117.i3d.my'))),
      h('div', {}, box(secured) + ' 在留資格変更許可申請（又は在留資格認定証明書交付申請）の時点で確保しているもの', D.myLine(ctx, t('p117.house.secured.my'))),
      h('div', {}, box(!secured) + ' 在留資格変更許可申請（又は在留資格認定証明書交付申請）の後に確保するもの', D.myLine(ctx, t('p117.house.later.my'))),
      h('div', {}, '居室の広さ　', v(p.houseRoom), '　㎡（同居人数計　', v(p.housePeople), '　人）　', box(true), ' １人当たり7.5㎡以上を確保',
        D.myLine(ctx, t('p117.house.room.my') + ' ' + (p.houseRoom || '') + ' m2 ' + t('p117.house.people.my').replace(/\s{4,}/, ' ' + (p.housePeople || '　') + ' ') + ' ' + t('p117.house.per75.my'))),
      h('div', {}, '寝室の広さ　', v(p.houseBed), '　㎡　', box(true), ' １人当たり4.5㎡以上を確保',
        D.myLine(ctx, t('p117.house.bed.my') + ' ' + (p.houseBed || '') + ' m2 ' + t('p117.house.per45.my'))));
  }
  function consultBlock(ctx) {
    var p = ctx.docs.plan || {}, sup = ctx.support || {}, co = ctx.company;
    var tel = p.consultTel || sup.staffTel || '', mail = p.consultMail || sup.staffMail || '';
    var eTel = p.emergencyTel || tel, eMail = p.emergencyMail || mail, eOther = p.emergencyOther || p.consultOther || '';
    var line = function (label, labelMy, value) {
      return h('div', {}, box(!D.empty(value)) + ' ' + label + '（' + (value || '　　　') + '）', D.myLine(ctx, cleanMy(t(labelMy).replace(/\(.*$/, '')) + ' (' + (value || '') + ')'));
    };
    var methods = function (tl, ml, ot) {
      return [h('div', {}, box(true) + ' 直接面談', D.myLine(ctx, t('p117.c.face.my'))), line('電話', 'p117.c.tel.my', tl), line('メール', 'p117.c.mail.my', ml), line('その他', 'p117.c.other.my', ot)];
    };
    return D.table([
      D.tr(D.th(h('div', {}, 'イ　実施方法'), D.myLine(ctx, t('p117.method6.my'))), D.td('')),
      D.tr(D.th(h('div', {}, '対応時間'), D.myLine(ctx, t('p117.consult.hours.my'))), D.td(
        h('div', {}, '平日（月～金）　', v(p.hoursWeekday), D.myLine(ctx, t('p117.weekday.my') + ' (' + [t('p117.mon.my'), t('p117.tue.my'), t('p117.wed.my'), t('p117.thu.my')].join('၊ ') + '...)')),
        h('div', {}, '土曜　', v(p.hoursSat), D.myLine(ctx, t('p117.sat.my'))),
        h('div', {}, '日曜　', v(p.hoursSun), D.myLine(ctx, t('p117.sun.my'))),
        h('div', {}, '祝日　', v(p.hoursHoliday), D.myLine(ctx, t('p117.holiday.my'))))),
      D.tr(D.th(h('div', {}, '相談方法'), D.myLine(ctx, t('p117.consult.method.my'))), D.td(h('div', { class: 'small' }, '以下の方法により実施（該当するものを全てチェックすること。）', D.myLine(ctx, t('p117.consult.check.my'))), methods(tel, mail, p.consultOther))),
      D.tr(D.th(h('div', {}, '緊急時対応'), D.myLine(ctx, t('p117.consult.emergency.my'))), D.td(h('div', { class: 'small' }, '以下の方法により実施（該当するものを全てチェックすること。）', D.myLine(ctx, t('p117.consult.check.my'))), methods(eTel, eMail, eOther)))
    ], 'plain');
  }

  function orgRow(ctx, label, labelMy, content) {
    return D.tr(D.th(h('div', {}, label), D.myLine(ctx, labelMy)), D.td(content));
  }
  function addrContent(zip, addr, tel) {
    return [h('div', {}, '〒', v(zip), '　', v(addr, true)), h('div', {}, '（電話　', v(tel), '　）')];
  }

  function render(ctx) {
    var p = ctx.docs.plan || {}, w = ctx.worker, co = ctx.company, sup = ctx.support;
    var s = ctx.case.schedule || {};
    var self = !sup;
    var supV = function (k) { return sup ? sup[k] : ''; };
    var out = [];
    out.push(D.docHead(ctx, '参考様式第１－１７号', t('p117.formNo.my'), '１号特定技能外国人支援計画書', t('p117.title.my')));
    out.push(h('div', { class: 'date-right' }, '作成日：' + D.jpDate(s.docDate), D.myLine(ctx, t('p117.created.my').split(/[\t-]/)[0] + ' - ' + D.myDate(s.docDate))));

    out.push(h('h2', {}, 'Ⅰ　支援対象者', D.myLine(ctx, t('p117.s1.my'))));
    out.push(D.table([
      orgRow(ctx, '１　氏名', t('p117.name.my'), [v(w.name, true), '　（ほか　', v(p.others || '0'), '　名）']),
      orgRow(ctx, '２　性別', t('p117.gender.my'), [v(w.gender), D.myLine(ctx, w.gender === '男' ? 'ကျား' : w.gender === '女' ? 'မ' : '')]),
      orgRow(ctx, '３　生年月日', t('p117.birth.my'), [D.jpDate(w.birthDate), D.myLine(ctx, D.myDate(w.birthDate))]),
      orgRow(ctx, '４　国籍・地域', t('p117.nat.my'), [v(w.nationality), D.myLine(ctx, w.nationalityFor)])
    ], 'th-mid'));

    out.push(h('h2', {}, 'Ⅱ　特定技能所属機関', D.myLine(ctx, t('p117.s2.my'))));
    out.push(D.table([
      orgRow(ctx, '（ふりがな）１　氏名又は名称', t('p117.orgName.my'), [h('div', { class: 'kana' }, co.nameKana || ''), v(co.name, true), D.myLine(ctx, co.nameFor)]),
      orgRow(ctx, '２　住所', t('p117.addr.my'), addrContent(co.zip, [co.addr1, co.addr2].filter(Boolean).join('　'), co.tel)),
      orgRow(ctx, '３　支援を行う事務所の所在地（２と異なる場合に記入）', t('p117.office.my'), addrContent('', self ? co.spOffice : '', self ? co.spOfficeTel : '')),
      orgRow(ctx, '４　支援業務を行う体制の概要', t('p117.structure.my'), self ? [
        h('div', {}, '支援責任者　（ふりがな）', co.spMgrKana || '', '　氏名　', v(co.spMgrName), '　役職　', v(co.spMgrTitle), D.myLine(ctx, t('p117.mgr.my'))),
        h('div', {}, '支援を行っている１号特定技能外国人数　', v(co.spSupported), '　名　　支援担当者数　', v(co.spStaffCount), '　名'),
        h('div', {}, '支援の中立性を確保していることの有無　' + box(p.neutral !== '無') + ' 有　' + box(p.neutral === '無') + ' 無', D.myLine(ctx, t('p117.neutral.my'))),
        h('div', { class: 'small' }, t('p117.neutralText'), D.myLine(ctx, t('p117.neutralText.my')))
      ] : h('div', { class: 'muted' }, '（登録支援機関に全部委託のため記載不要）'))
    ], 'th-mid'));

    out.push(h('h2', { class: 'break-before' }, 'Ⅲ　登録支援機関', D.myLine(ctx, t('p117.s3.my'))));
    out.push(D.table([
      orgRow(ctx, '１　登録番号', t('p117.regNo.my'), v(supV('regNo'))),
      orgRow(ctx, '２　登録年月日', t('p117.regDate.my'), [sup ? D.jpDate(sup.regDate) : '　　年　　月　　日', sup ? D.myLine(ctx, D.myDate(sup.regDate)) : null]),
      orgRow(ctx, '３　支援業務を開始する予定年月日', t('p117.startDate.my'), [sup ? D.jpDate(s.supportStart) : '　　年　　月　　日', sup ? D.myLine(ctx, D.myDate(s.supportStart)) : null]),
      orgRow(ctx, '（ふりがな）４　氏名又は名称', t('p117.orgName4.my'), [h('div', { class: 'kana' }, supV('nameKana') || ''), v(supV('name'), true)]),
      orgRow(ctx, '５　住所', t('p117.addr5.my'), addrContent(supV('zip'), sup ? [sup.addr1, sup.addr2].filter(Boolean).join('　') : '', supV('tel'))),
      orgRow(ctx, '法人の場合（ふりがな）６　代表者の氏名', t('p117.rep6.my'), [h('div', { class: 'kana' }, supV('repKana') || ''), v(supV('repName'))]),
      orgRow(ctx, '７　支援を行う事務所の所在地', t('p117.office7.my'), addrContent(supV('officeZip'), supV('officeAddr'), supV('officeTel'))),
      orgRow(ctx, '８　支援業務を行う体制の概要', t('p117.structure8.my'), sup ? [
        h('div', {}, '支援責任者　（ふりがな）', sup.mgrKana || '', '　氏名　', v(sup.mgrName), '　役職　', v(sup.mgrTitle), D.myLine(ctx, t('p117.mgr.my'))),
        h('div', {}, '支援を行っている１号特定技能外国人数　', v(sup.supportedCount), '　名　　支援担当者数　', v(sup.staffCount), '　名'),
        h('div', {}, '支援の適正性を確保していることの有無　' + box(p.proper !== '無') + ' 有　' + box(p.proper === '無') + ' 無', D.myLine(ctx, t('p117.proper.my'))),
        h('div', { class: 'small' }, t('p117.properText'), D.myLine(ctx, t('p117.properText.my')))
      ] : '')
    ], 'th-mid'));

    out.push(h('h2', { class: 'break-before' }, 'Ⅳ　支援内容', D.myLine(ctx, t('p117.s4.my'))));
    SECTIONS.forEach(function (sec, si) {
      var block = h('div', { class: 'plan-sec' + (si ? ' break-before' : '') });
      block.appendChild(h('h3', {}, t('p117.i' + sec.n), D.myLine(ctx, t('p117.i' + sec.n + '.my'))));
      if (sec.groups) {
        sec.groups.forEach(function (g, gi) {
          block.appendChild(h('h4', {}, t(g.head), D.myLine(ctx, t(g.headMy))));
          var sub = Object.assign({}, sec, { methods: g.methods });
          block.appendChild(itemsTable(ctx, sub, g.items, sec.n + (gi ? 'B' : 'A') + 'free'));
          if (g.house) block.appendChild(houseBlock(ctx));
        });
      } else {
        if (sec.head) block.appendChild(h('h4', {}, sec.head, D.myLine(ctx, t(sec.headMy))));
        block.appendChild(itemsTable(ctx, sec, sec.items, sec.n + 'free'));
        if (sec.n === '9') block.appendChild(h('div', { class: 'small' }, t('p117.s9note'), D.myLine(ctx, t('p117.s9note.my'))));
        if (sec.consult) block.appendChild(consultBlock(ctx));
        if (sec.lang) block.appendChild(langBlock(ctx, sec.consult ? 'ウ' : 'イ'));
        if (sec.hours) block.appendChild(hoursBlock(ctx, 'ウ', sec.n === '1' ? p.hours1 : p.hours4));
      }
      out.push(block);
    });

    out.push(h('div', { class: 'note break-before' }, t('p117.note'), D.myLine(ctx, t('p117.note.my'))));
    out.push(D.bi(ctx, t('p117.declare'), t('p117.declare.my'), 'para'));
    out.push(h('div', { class: 'sign-block' },
      h('div', { class: 'sign-row right' }, D.jpDate(s.docDate)),
      h('div', { class: 'sign-row' }, h('span', { class: 'sign-label' }, '特定技能所属機関の氏名又は名称', D.myLine(ctx, t('p117.signOrg.my'))), v(co.name, true)),
      h('div', { class: 'sign-row' }, h('span', { class: 'sign-label' }, '作成責任者の氏名', D.myLine(ctx, t('p117.signOwner.my'))), v(co.docOwner, true))));
    out.push(h('div', { class: 'confirm' },
      h('p', {}, '本書面について，', v(ctx.my ? 'ミャンマー' : ''), t('p117.understood')),
      D.myLine(ctx, t('p117.understood.pre.my') + ' ' + 'မြန်မာ' + t('p117.understood.my')),
      h('div', { class: 'sign-row' }, h('span', { class: 'sign-label' }, '署名日', D.myLine(ctx, t('p117.signDate.my'))), '　　　　年　　　月　　　日'),
      h('div', { class: 'sign-row' }, h('span', { class: 'sign-label' }, '１号特定技能外国人の署名', D.myLine(ctx, t('p117.workerSign.my'))), h('span', { class: 'sign-space' }, '　'))));
    return h('section', { class: 'doc doc-wide' }, out);
  }

  SKS.DOCS.push({ id: '1-17', no: '参考様式第1-17号', title: '１号特定技能外国人支援計画書', group: '支援', input: 'plan', bilingual: true, landscape: false, render: render });
})();
