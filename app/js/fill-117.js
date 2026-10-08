/*
 * 参考様式第１－１７号 １号特定技能外国人支援計画書（公式 Excel 版）への書き込み
 */
(function () {
  'use strict';
  var SKS = window.SKS, X = SKS.Xlsx, T = SKS.FillUtil, Calc = SKS.Calc;
  var empty = T.empty;

  /*
   * Ⅳ 支援内容の「実施予定」の欄（公式様式の並び順）。
   * group: 委託の有無・担当者・実施方法を共有する欄のまとまり
   */
  var BLOCKS = [
    { key: '1', sec: '1 事前ガイダンスの提供', label: 'ａ〜ｊ（情報提供内容等）', methods: ['対面', 'テレビ電話装置', 'その他'], def: { m: { '対面': true } } },
    { key: '1free', sec: '1 事前ガイダンスの提供', label: '自由記入', free: true },
    { key: '2a', sec: '2 出入国する際の送迎', label: 'ａ 到着空港等での出迎え及び送迎', airport: 'in' },
    { key: '2b', sec: '2 出入国する際の送迎', label: 'ｂ 出国予定空港等までの送迎・出国手続の補助', airport: 'out', presetWhen: '契約終了後適宜実施' },
    { key: '2free', sec: '2 出入国する際の送迎', label: '自由記入', free: true },
    { key: '3a', sec: '3 住居の確保・生活に必要な契約', label: 'ア-ａ 住居探しの補助・連帯保証人等', def: { plan: '無' } },
    { key: '3b', sec: '3 住居の確保・生活に必要な契約', label: 'ア-ｂ 自ら賃借人となり住居として提供' },
    { key: '3c', sec: '3 住居の確保・生活に必要な契約', label: 'ア-ｃ 所有する社宅等を住居として提供', def: { plan: '無' } },
    { key: '3Afree', sec: '3 住居の確保・生活に必要な契約', label: 'ア 自由記入', free: true },
    { key: '3Ba', sec: '3 住居の確保・生活に必要な契約', label: 'イ-ａ 預貯金口座の開設の手続の補助', methods: ['手続に係る情報提供', '必要に応じて手続に同行', 'その他'], def: { m: { '手続に係る情報提供': true, '必要に応じて手続に同行': true } } },
    { key: '3Bb', sec: '3 住居の確保・生活に必要な契約', label: 'イ-ｂ 携帯電話の契約の手続の補助', methods: ['手続に係る情報提供', '必要に応じて手続に同行', 'その他'], def: { m: { '手続に係る情報提供': true, '必要に応じて手続に同行': true } } },
    { key: '3Bc', sec: '3 住居の確保・生活に必要な契約', label: 'イ-ｃ ライフラインの手続の補助', methods: ['手続に係る情報提供', '必要に応じて手続に同行', 'その他'], def: { m: { '手続に係る情報提供': true, '必要に応じて手続に同行': true } } },
    { key: '3Bfree', sec: '3 住居の確保・生活に必要な契約', label: 'イ 自由記入', free: true },
    { key: '4', sec: '4 生活オリエンテーションの実施', label: 'ａ〜ｆ（情報提供内容等）', methods: ['対面', 'テレビ電話やＤＶＤ等の動画視聴等'], def: { m: { '対面': true } } },
    { key: '4free', sec: '4 生活オリエンテーションの実施', label: '自由記入', free: true },
    { key: '5a', sec: '5 日本語学習の機会の提供', label: 'ａ 日本語教室等の入学案内・手続の補助' },
    { key: '5b', sec: '5 日本語学習の機会の提供', label: 'ｂ 自主学習の教材・オンライン講座の情報提供' },
    { key: '5c', sec: '5 日本語学習の機会の提供', label: 'ｃ 日本語教師と契約して講習の機会を提供', def: { plan: '無' } },
    { key: '5free', sec: '5 日本語学習の機会の提供', label: '自由記入', free: true },
    { key: '6', sec: '6 相談又は苦情への対応', label: 'ａ・ｂ（対応内容等）', presetWhen: '適宜実施' },
    { key: '6free', sec: '6 相談又は苦情への対応', label: '自由記入', free: true },
    { key: '7', sec: '7 日本人との交流促進', label: 'ａ・ｂ' },
    { key: '7free', sec: '7 日本人との交流促進', label: '自由記入', free: true },
    { key: '8a', sec: '8 非自発的離職時の転職支援', label: 'ａ 業界団体等を通じた受入れ先の情報提供' },
    { key: '8b', sec: '8 非自発的離職時の転職支援', label: 'ｂ 公共職業安定所等の案内・同行' },
    { key: '8c', sec: '8 非自発的離職時の転職支援', label: 'ｃ 推薦状の作成' },
    { key: '8d', sec: '8 非自発的離職時の転職支援', label: 'ｄ 職業紹介（許可等を受けている場合）', def: { plan: '無' } },
    { key: '8e', sec: '8 非自発的離職時の転職支援', label: 'ｅ 求職活動のための有給休暇の付与', noEntrust: true },
    { key: '8f', sec: '8 非自発的離職時の転職支援', label: 'ｆ 離職時の行政手続の情報提供' },
    { key: '8g', sec: '8 非自発的離職時の転職支援', label: 'ｇ 倒産等に備えた支援者の確保' },
    { key: '8free', sec: '8 非自発的離職時の転職支援', label: '自由記入', free: true },
    { key: '9ab', sec: '9 定期的な面談・行政機関への通報', label: 'ａ・ｂ 定期的な面談（3か月に1回以上）', methods: ['対面', 'オンライン', '無線や船舶電話'], def: { m: { '対面': true } } },
    { key: '9cd', sec: '9 定期的な面談・行政機関への通報', label: 'ｃ・ｄ 法令違反等を知ったときの通報', presetWhen: '認知次第実施', noEntrust: true },
    { key: '9free', sec: '9 定期的な面談・行政機関への通報', label: '自由記入', free: true }
  ];

  // 担当者・委託の初期値（登録支援機関があれば委託）
  function blockState(ctx, b) {
    var p = ctx.docs.plan || {}, it = (p.items || {})[b.key] || {};
    var sup = ctx.support, co = ctx.company || {};
    var d = b.def || {};
    // 委託の有無は、支援の一部を第三者（登録支援機関以外）に委託する場合のみ「有」（様式の注意５）
    var entrust = it.entrust || '無';
    var person = !empty(it.person) ? it.person
      : sup ? (sup.staffName || '') + (sup.staffTitle ? '（' + sup.staffTitle + '）' : '')
        : (co.spStaffName || '') + (co.spStaffTitle ? '（' + co.spStaffTitle + '）' : '');
    return {
      plan: it.plan || d.plan || (b.free ? '無' : '有'),
      when: it.when !== undefined && it.when !== '' ? it.when : (b.presetWhen || ''),
      entrust: entrust, person: person, addr: it.addr || '', m: it.m || d.m || {}, mOther: it.mOther || '', free: (p.free || {})[b.key] || ''
    };
  }

  function rowOf(r) { return X.parseRef(r).row; }
  // 「年・月・日」の左の欄に数字を入れる
  function datePart(sh, unitCell, n) { sh.set(sh.leftOf(unitCell), String(n)); }

  function fill(sh, ctx) {
    var w = ctx.worker || {}, co = ctx.company || {}, sup = ctx.support, s = ctx.case.schedule || {}, p = ctx.docs.plan || {};
    var fees = ctx.docs.fees || {}, sal = ctx.case.salary || {}, d = sal.deductions || {};
    var cb = ctx.combined;
    var setR = function (needle, v, opts) { var r = sh.find(needle, opts); if (r && !empty(v)) sh.set(sh.rightOf(r), String(v)); return r; };
    // 作成日
    var made = sh.find('作成日：');
    if (made) {
      var dd = T.ymd(s.docDate);
      if (dd) ['年', '月', '日'].forEach(function (u, i) {
        var c = sh.find(new RegExp('^' + u + '$'), { after: rowOf(made) - 1, before: rowOf(made) + 1 });
        if (c) datePart(sh, c, [dd.y, dd.m, dd.d][i]);
      });
    }
    // Ⅰ 支援対象者
    setR(/１[　 ]*氏[　 ]*名$/, cb ? '別紙の名簿のとおり' : w.name);
    var others = sh.find('（ほか');
    if (others) sh.set(sh.rightOf(others), String(cb ? ctx.workers.length - 1 : (p.others || 0)));
    if (!cb) {
      var g = sh.find(/^男[　 ]*・[　 ]*女$/);
      if (g && w.gender) sh.edit(g, function (t) { return T.pick(t, '男', '女', w.gender); });
      var bd = T.ymd(w.birthDate), birth = sh.find('生　年　月　日');
      if (bd && birth) ['年', '月', '日'].forEach(function (u, i) {
        var c = sh.find(new RegExp('^' + u + '$'), { after: rowOf(birth) - 1, before: rowOf(birth) + 1 });
        if (c) datePart(sh, c, [bd.y, bd.m, bd.d][i]);
      });
      setR('国籍・地域', w.nationality);
    }
    // Ⅱ 特定技能所属機関
    var s2 = sh.find('Ⅱ　特定技能所属機関'), s3 = sh.find('Ⅲ　登録支援機関'), s4 = sh.find('Ⅳ　支援内容');
    var r2 = rowOf(s2), r3 = rowOf(s3), r4 = rowOf(s4);
    var kanaName = function (label, kana, name, range) {
      var l = sh.find(label, range); if (!l) return;
      var kc = sh.rightOf(l);
      if (!empty(kana)) sh.set(kc, kana);
      if (!empty(name)) sh.set(sh.below(kc), name);
    };
    var address = function (labelRe, zip, addr, tel, range, addrBelow) {
      var l = sh.find(labelRe, range); if (!l) return;
      var lr = rowOf(l);
      var z = sh.find('〒', { after: lr - 1, before: lr + 1 });
      var m = /^(\d{3})-?(\d{4})$/.exec(String(zip || '').replace(/^〒/, ''));
      if (z && m) {
        sh.set(sh.rightOf(z), m[1]);
        var dash = sh.find(/^[－-]$/, { after: lr - 1, before: lr + 1 });
        if (dash) sh.set(sh.rightOf(dash), m[2]);
      }
      if (!empty(addr) && z) {
        var below = sh.below(z);
        sh.set(below, addr, { wrap: !!addrBelow });
      }
      var t = sh.find('（電話', { after: lr - 1, before: lr + 6 });
      if (t && !empty(tel)) sh.set(t, '（電話　' + tel + '　）');
    };
    kanaName('氏名又は名称', co.nameKana, co.name, { after: r2 - 1, before: r3 });
    address(/２[　 ]*住[　 ]*所/, co.zip, [co.addr1, co.addr2].filter(Boolean).join('　'), co.tel, { after: r2 - 1, before: r3 });
    if (!sup) {
      address('支援を行う事務所の所', '', co.spOffice, co.spOfficeTel, { after: r2 - 1, before: r3 });
      structure(sh, { after: r2 - 1, before: r3 }, co.spMgrKana, co.spMgrName, co.spMgrTitle, co.spSupported, co.spStaffCount, p.neutral || '有');
    }
    // Ⅲ 登録支援機関
    if (sup) {
      var reg = sh.find('登　録　番　号');
      var mm = /^(\d+)\s*登\s*[－-]\s*(\d+)$/.exec(sup.regNo || '');
      if (reg && mm) {
        var to = sh.find(/^登$/, { after: rowOf(reg) - 1, before: rowOf(reg) + 1 });
        var dash = sh.find(/^[－-]$/, { after: rowOf(reg) - 1, before: rowOf(reg) + 1 });
        if (to) sh.set(sh.leftOf(to), mm[1]);
        if (dash) sh.set(sh.rightOf(dash), mm[2]);
      } else if (reg && sup.regNo) sh.set(sh.rightOf(reg), sup.regNo);
      var rd = T.ymd(sup.regDate), regd = sh.find('登録年月日');
      if (rd && regd) ['年', '月', '日'].forEach(function (u, i) {
        var c = sh.find(new RegExp('^' + u + '$'), { after: rowOf(regd) - 1, before: rowOf(regd) + 1 });
        if (c) datePart(sh, c, [rd.y, rd.m, rd.d][i]);
      });
      kanaName('氏名又は名称', sup.nameKana, sup.name, { after: r3 - 1, before: r4 });
      address(/４[　 ]*住[　 ]*所/, sup.zip, [sup.addr1, sup.addr2].filter(Boolean).join('　'), sup.tel, { after: r3 - 1, before: r4 }, true);
      kanaName('代表者の氏名', sup.repKana, sup.repName, { after: r3 - 1, before: r4 });
      address('支援を行う事務所の所', sup.officeZip, sup.officeAddr, sup.officeTel, { after: r3 - 1, before: r4 }, true);
      structure(sh, { after: r3 - 1, before: r4 }, sup.mgrKana, sup.mgrName, sup.mgrTitle, sup.supportedCount, sup.staffCount, p.proper || '有');
    }
    // Ⅳ 支援内容
    var plans = [];
    Object.keys(sh.cells).forEach(function (r) {
      var pr = X.parseRef(r);
      if (pr.row <= r4 || X.numToCol(pr.col) !== 'S' || sh.text(r).trim() !== '□') return;
      var tx = sh.text(sh.rightOf(r));
      if (/^有/.test(tx)) plans.push(pr.row);
    });
    plans.sort(function (a, b) { return a - b; });
    var acs = sh.findAll(/^有・無$/, { after: r4, col: 'AC' }).map(rowOf);
    BLOCKS.forEach(function (b, i) {
      var row = plans[i]; if (!row) return;
      var st = blockState(ctx, b);
      var yesC = X.ref(X.colToNum('S'), row);
      var noC = sh.find('□', { after: row, before: row + 6, col: 'S' });
      sh.set(st.plan === '有' ? yesC : noC, '■');
      if (st.plan === '有') {
        sh.edit(sh.rightOf(yesC), function (t) {
          if (b.free) return empty(st.free) ? t : '有（' + st.free + '）';
          return empty(st.when) ? t : t.replace(/（.*）/, '（' + st.when + '）');
        });
      }
      // 委託の有無・担当者（このまとまりの最初の行）
      var ac = acs.filter(function (a) { return a <= row; }).pop();
      var shared = BLOCKS.slice(0, i).some(function (x, j) { return plans[j] && acs.filter(function (a) { return a <= plans[j]; }).pop() === ac; });
      if (ac && !shared && st.plan === '有') {
        var acRef = X.ref(X.colToNum('AC'), ac);
        if (!b.noEntrust) sh.edit(acRef, function (t) { return T.pick(t, '有', '無', st.entrust); });
        sh.set(X.ref(X.colToNum('AG'), ac), st.person);
        // 委託を受けた第三者の所在地（委託「有」のときのみ）
        if (st.entrust === '有' && !empty(st.addr)) {
          var z = X.ref(X.colToNum('AO'), ac);
          var m = /^〒?\s*(\d{3})-?(\d{4})\s*(.*)$/.exec(String(st.addr));
          if (m) { sh.set(sh.rightOf(z), m[1]); var dash2 = sh.find(/^[－-]$/, { after: ac - 1, before: ac + 1, col: 'AS' }); if (dash2) sh.set(sh.rightOf(dash2), m[2]); }
          sh.set(sh.below(z), m ? m[3] : st.addr);
        }
      }
      // 実施方法
      if (st.plan === '有' && b.methods) {
        var next = acs.filter(function (a) { return a > (ac || row); })[0] || row + 30;
        b.methods.forEach(function (lbl) {
          if (!st.m[lbl]) return;
          var hit = sh.find(new RegExp('^(□[\\u3000 ]*)?' + lbl.replace(/[()（）]/g, '.')), { after: (ac || row) - 1, before: next, col: 'BD' }) ||
            sh.find(new RegExp('□[\\u3000 ]*' + lbl), { after: (ac || row) - 1, before: next, col: 'BC' });
          if (!hit) return;
          if (X.numToCol(X.parseRef(hit).col) === 'BC') sh.edit(hit, function (t) { return T.check(t, lbl, true); });
          else {
            sh.set(sh.leftOf(hit), '■');
            if (lbl === 'その他' && st.mOther) sh.edit(hit, function (t) { return T.between(t, 'その他（', '）', st.mOther); });
          }
        });
      }
      if (st.plan === '有' && b.airport) {
        var lbl2 = b.airport === 'in' ? '出迎え空港等' : '出国予定空港等';
        var ap = sh.find(lbl2, { after: row - 1, before: row + 6 });
        if (ap) {
          sh.set(sh.leftOf(ap), '■');
          var paren = sh.find(/^（$/, { after: row, before: row + 4, col: 'BD' });
          var name = b.airport === 'in' ? p.airportIn : p.airportOut;
          if (paren && !empty(name)) sh.set(sh.rightOf(paren), name);
          var tr = sh.find('送迎方法（', { after: row, before: row + 6 });
          var how = b.airport === 'in' ? p.transportIn : p.transportOut;
          if (tr && !empty(how)) { sh.set(sh.leftOf(tr), '■'); sh.edit(tr, function (t) { return T.between(t, '送迎方法（', '）', how); }); }
        }
      }
    });
    // 実施言語・通訳・時間
    var langs = sh.findAll(/[イウ][　 ]*実施言語/);
    var langName = !empty(p.lang) ? p.lang : (ctx.my ? 'ミャンマー' : '');
    langs.forEach(function (r) {
      if (!empty(langName)) sh.set(sh.rightOf(r), String(langName).replace(/語$/, ''));
      var it = sh.find('通訳者の所属・氏名', { after: rowOf(r) - 1, before: rowOf(r) + 1 });
      if (it && !empty(p.interp)) sh.edit(it, function (t) { return t + '　' + p.interp; });
    });
    var times = sh.findAll(/^合計$/, { after: r4, col: 'S' });
    [p.hours1, p.hours4].forEach(function (h, i) { if (times[i] && !empty(h)) sh.set(sh.rightOf(times[i]), String(h)); });
    // 3 ア ｄ 住居の概要（居住費）
    var house = sh.find('情報提供する又は住居として提供する住居の概要');
    if (house) {
      var hr = rowOf(house);
      var secured = p.houseStatus !== '申請の後に確保する';
      var cbx = sh.findAll('□', { after: hr - 1, before: hr + 6, col: 'S' });
      if (cbx[secured ? 0 : 1]) sh.set(cbx[secured ? 0 : 1], '■');
      var ppl = sh.find('（同居人数計', { after: hr }); if (ppl && !empty(p.housePeople)) sh.set(sh.rightOf(ppl), String(p.housePeople));
      var room = Calc.num(p.houseRoom), people = Calc.num(p.housePeople) || 1, bed = Calc.num(p.houseBed);
      var c75 = sh.find('１人当たり7.5', { after: hr }); if (c75 && room && room / people >= 7.5) sh.set(sh.leftOf(c75), '■');
      var c45 = sh.find('１人当たり4.5', { after: hr }); if (c45 && bed && bed / people >= 4.5) sh.set(sh.leftOf(c45), '■');
      var housing = Calc.num(d.housing);
      var q1 = sh.find('居住費の徴収の有無', { after: hr });
      if (q1) {
        var yes = sh.find(/^有$/, { after: rowOf(q1) - 1, before: rowOf(q1) + 1 }), no = sh.find(/^無$/, { after: rowOf(q1) - 1, before: rowOf(q1) + 1 });
        var mark = housing > 0 ? yes : no;
        if (mark) sh.set(sh.leftOf(mark), '■');
      }
      var q2 = sh.find('１か月当たり　約', { after: hr }); if (q2 && housing > 0) sh.set(sh.rightOf(q2), T.yen(housing));
      if (housing > 0) {
        var own = sh.find(/^自己所有物件$/, { after: hr }), rent = sh.find(/^借上物件$/, { after: hr });
        var type = (p.housingType || fees.housingType) === '自己所有物件' ? own : rent;
        if (type) sh.set(sh.leftOf(type), '■');
        var q4 = sh.find('費用が実費に相当する額その他の適正な額であることの説明', { after: hr });
        var reason = p.housingReason || fees.housingReason;
        if (q4 && !empty(reason)) sh.set(sh.rightOf(q4), reason);
      }
    }
    // 6 イ 実施方法（相談の対応時間・方法）
    var hoursTxt = function (v) {
      if (empty(v)) return null;
      var m = /(\d{1,2})(?::\d{2})?\s*時?\s*[～~\-ー－]\s*(\d{1,2})(?::\d{2})?\s*時?/.exec(v);
      return m ? m[1] + '時　～　' + m[2] + '時' : v;
    };
    var wd = sh.find(/^平日$/, { after: r4 });
    if (wd) {
      var hrow = rowOf(wd);
      var t1 = hoursTxt(p.hoursWeekday);
      if (t1) sh.findAll(/^時[　 ]*～[　 ]*時$/, { after: hrow, before: hrow + 5 }).forEach(function (r) { sh.set(r, t1); });
      [['土曜', p.hoursSat], ['日曜', p.hoursSun], ['祝日', p.hoursHoliday]].forEach(function (x) {
        var l = sh.find(new RegExp('^' + x[0] + '$'), { after: hrow }); var tx = hoursTxt(x[1]);
        if (l && tx) sh.set(sh.rightOf(l), tx);
      });
    }
    var supp = sup || {};
    var tel = p.consultTel || supp.staffTel || '', mail = p.consultMail || supp.staffMail || '';
    var methods = function (afterRow, beforeRow, tl, ml, ot) {
      var cell = function (re) { return sh.find(re, { after: afterRow, before: beforeRow, col: 'J' }); };
      var mark = function (r) { if (r) sh.set(sh.leftOf(r), '■'); };
      mark(cell(/^直接面談/));
      var t = cell(/^電話（/); if (t && tl) { mark(t); sh.set(t, '電話（　' + tl + '　）'); }
      var m2 = cell(/^メール（/); if (m2 && ml) { mark(m2); sh.set(m2, 'メール（　' + ml + '　）'); }
      var o = cell(/^その他（/); if (o && ot) { mark(o); sh.set(o, 'その他（　' + ot + '　）'); }
    };
    var how = sh.find(/以下の方法により実施/, { after: r4 }), emer = sh.find(/緊急時は、以下の方法により実施/, { after: r4 });
    if (how && emer) {
      methods(rowOf(how), rowOf(emer), tel, mail, p.consultOther);
      methods(rowOf(emer), rowOf(emer) + 14, p.emergencyTel || tel, p.emergencyMail || mail, p.emergencyOther || p.consultOther);
    }
    // 署名欄（作成日・機関名・作成責任者）
    var org = sh.find('特定技能所属機関の氏名又は名称', { after: r4 + 300 }); if (org && co.name) sh.set(sh.rightOf(org), co.name);
    var own2 = sh.find('作成責任者の氏名', { after: r4 + 300 }); if (own2 && co.docOwner) sh.set(sh.rightOf(own2), co.docOwner);
    var lang = sh.find('語による翻訳文の交付を受け', { after: r4 + 300 }); if (lang && ctx.my) sh.set(sh.leftOf(lang), 'ミャンマー');
    var sign = sh.find('１号特定技能外国人の署名', { after: r4 + 300 }); if (sign && cb) sh.set(sh.rightOf(sign), '別紙のとおり');
  }

  // 支援体制の概要（Ⅱ-4・Ⅲ-7）
  function structure(sh, range, kana, name, title, supported, staff, ok) {
    var mgr = sh.find('支援責任者', range); if (!mgr) return;
    var fr = sh.find('（ふりがな）', Object.assign({}, range, { after: X.parseRef(mgr).row - 6 }));
    if (fr) {
      var kc = sh.rightOf(fr);
      if (!empty(kana)) sh.set(kc, kana);
      if (!empty(name)) sh.set(sh.below(kc), name);
    }
    var tl = sh.find(/^役[　 ]*職$/, range); if (tl && !empty(title)) sh.set(sh.rightOf(tl), title);
    var cnt = sh.find('1号特定技能外国人数', range);
    var nums = sh.findAll(/^名$/, range);
    if (nums[0] && !empty(supported)) sh.set(sh.leftOf(nums[0]), String(supported));
    if (nums[1] && !empty(staff)) sh.set(sh.leftOf(nums[1]), String(staff));
    var y = sh.find(/^有$/, range), n = sh.find(/^無$/, range);
    if (ok === '有' && n) sh.set(n, '');
    if (ok === '無' && y) sh.set(y, '');
    return cnt;
  }

  SKS.PLAN117 = { BLOCKS: BLOCKS, blockState: blockState };
  SKS.FILL['1-17'] = fill;
})();
