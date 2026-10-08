/*
 * 公式参考様式（Excel ひな形）への書き込みルール
 *
 * ひな形の文言は公式様式のまま。空欄（全角スペースの並び）や「□」を、
 * 入力内容に置き換える。セルは様式の文言で探すため、ミャンマー語併記版でも同じルールが使える。
 */
(function () {
  'use strict';
  var SKS = window.SKS, X = SKS.Xlsx, Calc = SKS.Calc;
  var SP = '[\\u3000 ]';

  // ---------- 値の整形 ----------
  function empty(v) { return v === undefined || v === null || String(v).trim() === ''; }
  function yen(v) { if (empty(v)) return ''; var n = Calc.num(v); return Math.round(n).toLocaleString('ja-JP'); }
  function ymd(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); return m ? { y: +m[1], m: +m[2], d: +m[3] } : null; }
  function ym(v) { var m = /^(\d{4})-(\d{2})/.exec(v || ''); return m ? { y: +m[1], m: +m[2] } : null; }
  function jpDate(iso) { var p = ymd(iso); return p ? p.y + '年' + p.m + '月' + p.d + '日' : ''; }
  function hm(hhmm) { var m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || ''); return m ? { h: +m[1], m: m[2] } : null; }
  function hours2hm(h) { if (h === null || h === undefined || isNaN(h)) return null; var mins = Math.round(h * 60); return { h: Math.floor(mins / 60), m: ('0' + mins % 60).slice(-2) }; }
  function addMonths(iso, n) {
    var p = ymd(iso); if (!p) return '';
    var d = new Date(Date.UTC(p.y, p.m - 1 + n, p.d));
    if (d.getUTCDate() !== p.d) d = new Date(Date.UTC(p.y, p.m - 1 + n + 1, 0));
    return d.toISOString().slice(0, 10);
  }
  function addDays(iso, n) { var p = ymd(iso); return p ? new Date(Date.UTC(p.y, p.m - 1, p.d + n)).toISOString().slice(0, 10) : ''; }
  function zipText(z) { return empty(z) ? '' : String(z).replace(/^〒/, ''); }

  // ---------- 文字列の書き換え ----------
  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  // 正規表現に一致した部分を置き換え、元の幅（全角スペース分）を保つように左側を詰める
  function keepWidth(text, re, rep) {
    return text.replace(re, function (m) {
      var pad = m.length - rep.length;
      var lead = m.match(/^[　 ]*/)[0];
      return (pad > 0 ? lead.slice(0, Math.min(lead.length, pad)) : '') + rep;
    });
  }
  // 「年　月　日」の空欄を順に日付で埋める
  var DATE_RE = new RegExp(SP + '*年' + SP + '*月' + SP + '*日');
  function dates(text, list) {
    list.forEach(function (iso) {
      var p = ymd(iso);
      if (!p) { text = text.replace(DATE_RE, function (m) { return m.replace(/年/, '\u0001').replace(/月/, '\u0002').replace(/日/, '\u0003'); }); return; }
      text = keepWidth(text, DATE_RE, '　' + p.y + '\u0001' + p.m + '\u0002' + p.d + '\u0003');
    });
    return text.replace(/\u0001/g, '年').replace(/\u0002/g, '月').replace(/\u0003/g, '日');
  }
  function yearMonth(text, v) {
    var p = ym(v); if (!p) return text;
    return keepWidth(text, new RegExp(SP + '*年' + SP + '*月'), '　' + p.y + '年' + p.m + '月');
  }
  // label の後ろの空欄に値を入れる（label＋空白 → label＋値）
  function after(text, label, value) {
    if (empty(value)) return text;
    var i = text.indexOf(label); if (i < 0) return text;
    var rest = text.slice(i + label.length);
    var m = rest.match(/^[　 ]*/)[0];
    var keep = m.length > 2 ? m.slice(String(value).length + 2) : '';
    return text.slice(0, i + label.length) + '　' + value + '　' + keep + rest.slice(m.length);
  }
  // before と after の間の空欄に値を入れる
  function between(text, before, afterStr, value) {
    if (empty(value)) return text;
    var re = new RegExp('(' + esc(before) + ')' + SP + '*(' + esc(afterStr) + ')');
    return text.replace(re, function (all, a, b) { return a + '　' + value + '　' + b; });
  }
  // n 番目の「（空欄 unit）」に値を入れる（例：（　　分）、（　　）％）
  function paren(text, unit, values) {
    var i = 0;
    var re = new RegExp('（' + SP + '*' + esc(unit) + '）', 'g');
    return text.replace(re, function (m) {
      var v = values[i++];
      return empty(v) ? m : '（' + v + unit + '）';
    });
  }
  function check(text, label, on) { return X.check(text, label, on); }
  // 「有　・　無」などの選択肢を、選んだ方だけにする
  function pick(text, a, b, sel) {
    if (empty(sel)) return text;
    var re = new RegExp(esc(a) + SP + '*・' + SP + '*' + esc(b));
    return text.replace(re, sel);
  }
  var T = { empty: empty, yen: yen, ymd: ymd, jpDate: jpDate, hm: hm, hours2hm: hours2hm, addMonths: addMonths, addDays: addDays,
    keepWidth: keepWidth, dates: dates, yearMonth: yearMonth, after: after, between: between, paren: paren, check: check, pick: pick, zip: zipText };

  // ---------- 共通 ----------
  function edit(sh, needle, fn, opts) { var r = sh.find(needle, opts); if (r) sh.edit(r, fn); return r; }
  function right(sh, needle, value, opts) {
    var r = sh.find(needle, opts);
    if (!r || empty(value)) return r;
    sh.set(sh.rightOf(r), String(value));
    return r;
  }
  function names(ctx) {
    var co = ctx.company || {}, w = ctx.worker || {};
    return { co: co, w: w, sup: ctx.support || {}, rep: [co.repTitle, co.repName].filter(Boolean).join('　'),
      wName: ctx.combined ? '別紙のとおり' : (w.name || '') };
  }

  var FILL = {};

  // ================= 1-4 報酬に関する説明書 =================
  FILL['1-4'] = function (sh, ctx) {
    var n = names(ctx), r = ctx.docs.reward || {}, c = ctx.calc, sal = ctx.case.salary || {}, s = ctx.case.schedule || {};
    var age = Calc.ageAt(n.w.birthDate, s.applyDate || s.docDate);
    right(sh, '①申請人の氏名', n.wName);
    right(sh, '②申請人の役職', r.duties);
    var row3 = function (a, g, e) {
      return function (t) {
        t = t.replace(new RegExp('（' + SP + '*歳）'), empty(a) ? '$&' : '（' + a + '歳）');
        if (!empty(g)) t = t.replace(new RegExp('男' + SP + '*・' + SP + '*女'), g);
        return t.replace(new RegExp('経験' + SP + '*年'), empty(e) ? '$&' : '経験　' + e + '年');
      };
    };
    var pay = function (m, hr) {
      return function (t) {
        if (!empty(m)) t = t.replace(new RegExp('月給' + SP + '*円'), '月給　' + m + '円');
        if (!empty(hr)) t = t.replace(new RegExp('時間給' + SP + '*円'), '時間給　' + hr + '円');
        return t;
      };
    };
    var age8 = sh.find('③申請人の年齢');
    if (age8) sh.edit(sh.rightOf(age8), row3(age === null ? '' : age, n.w.gender, r.expYears));
    var pay9 = sh.find('④申請人に対する報酬');
    if (pay9) sh.edit(sh.rightOf(pay9), pay(yen(c.monthlyA), c.hourly === null ? '' : c.hourly.toLocaleString('ja-JP')));
    var notes = empty(r.notes) ? allowanceNote(ctx) : r.notes;
    var sec2 = sh.find('２　比較対象となる日本人労働者がいる場合');
    var sec3 = sh.find('３　比較対象となる日本人労働者がいない場合');
    right(sh, '⑤その他', notes, { before: sec2 ? X.parseRef(sec2).row : undefined });
    // 比較対象
    var nearest = r.compareType === '比較対象となる日本人労働者がいない';
    var from = X.parseRef(nearest ? sec3 : sec2).row, to = nearest ? undefined : X.parseRef(sec3).row;
    var o = { after: from, before: to };
    right(sh, '①', r.jpDuties, o);
    var a2 = sh.find('②', o); if (a2) sh.edit(sh.rightOf(a2), row3(r.jpAge, r.jpGender, r.jpExp));
    var a3 = sh.find('③', o); if (a3) sh.edit(sh.rightOf(a3), pay(yen(r.jpMonthly), yen(r.jpHourly)));
    var rule = sh.find('規程の有無', o);
    if (rule) sh.edit(sh.rightOf(rule), function (t) { return pick(t, '有', '無', r.wageRule || '無'); });
    if (r.wageRule === '有') {
      var basis = sh.find('有の場合', o);
      if (basis) {
        var cell = sh.below(sh.rightOf(basis));
        sh.edit(cell, pay(yen(r.ruleMonthly), yen(r.ruleHourly)));
      }
    }
    right(sh, '⑤申請人に対する報酬', r.reason, o);
    right(sh, '⑥その他', r.jpNotes, o);
    signature(sh, ctx);
  };
  function allowanceNote(ctx) {
    var sal = ctx.case.salary || {};
    var list = (sal.allowances || []).filter(function (a) { return !empty(a.name) && Calc.num(a.amount); });
    if (!list.length) return '';
    return '上記月給は基本賃金' + yen(sal.basePay) + '円に' + list.map(function (a) { return a.name + yen(a.amount) + '円'; }).join('、') + 'を含む。';
  }
  // 作成日・機関名・作成責任者
  function signature(sh, ctx, opts) {
    opts = opts || {};
    var co = ctx.company || {}, d = (ctx.case.schedule || {}).docDate;
    edit(sh, /^[　 ]*年[　 ]*月[　 ]*日[　 ]*(作成)?[　 ]*$/, function (t) { return dates(t, [d]); });
    edit(sh, '作成年月日：', function (t) { return dates(t, [d]); });
    edit(sh, '特定技能所属機関の氏名又は名称', function (t) { return after(t, '特定技能所属機関の氏名又は名称', co.name); }, { after: opts.after });
    edit(sh, /作成責任者/, function (t) {
      return t.indexOf('役職・氏名') >= 0 ? after(t, '役職・氏名', co.docOwner) : after(t, t.indexOf('氏名及び役職') >= 0 ? '氏名及び役職' : '作成責任者', co.docOwner);
    }, { after: opts.after });
  }

  // ================= 1-5 特定技能雇用契約書 =================
  FILL['1-5'] = function (sh, ctx) {
    var n = names(ctx), s = ctx.case.schedule || {};
    edit(sh, /^特定技能所属機関.*（以下「甲」/, function (t) { return between(t, '特定技能所属機関', '（以下「甲」', n.co.name); });
    edit(sh, /^特定技能外国人（候補者を含む。）.*（以下「乙」/, function (t) { return between(t, '特定技能外国人（候補者を含む。）', '（以下「乙」', n.w.name); });
    edit(sh, /^[　 ]*年[　 ]*月[　 ]*日[　 ]*締結/, function (t) { return dates(t, [s.contractDate]); });
    var sig = [n.co.name, n.rep].filter(Boolean).join('　');
    edit(sh, /^甲[　 ]/, function (t) {
      if (empty(sig)) return t;
      if (t.indexOf('㊞') >= 0) return between(t, '甲', '㊞', sig);
      // ミャンマー語併記版は㊞がない：甲の後ろの空欄（乙の手前まで）に記入
      return t.replace(/^甲([　 ]+)/, function (m, sp) { return '甲　' + sig + sp.slice(Math.min(sp.length - 2, Math.ceil(sig.length) + 1)); });
    });
  };

  // ================= 1-6 雇用条件書（本体・別紙２共通） =================
  function conditions(sh, ctx, isMuki) {
    var n = names(ctx), s = ctx.case.schedule || {}, k = ctx.docs.contract || {}, lab = ctx.case.labor || {}, sal = ctx.case.salary || {}, calc = ctx.calc;
    var co = n.co;
    edit(sh, /^[　 ]*年[　 ]*月[　 ]*日[　 ]*$/, function (t) { return dates(t, [s.contractDate]); });
    edit(sh, /^[　 ]*殿/, function (t) { return keepWidth(t, /^[　 ]*殿/, (n.w.name || '') + '　殿'); });
    edit(sh, /^特定技能所属機関名/, function (t) { return after(t, '特定技能所属機関名', co.name); });
    edit(sh, /^所在地[　 ]*$/, function (t) { return after(t, '所在地', [co.addr1, co.addr2].filter(Boolean).join('　')); });
    edit(sh, /^電話番号/, function (t) { return after(t, '電話番号', co.tel); });
    edit(sh, /^代表者[　 ]*役職・氏名/, function (t) { return after(t, '役職・氏名', n.rep); });
    if (!isMuki) {
      edit(sh, /^[　 ]*（[　 ]*年.*入国予定日/, function (t) { return dates(t, [s.employStart, ctx.employEnd, s.entryDate]); });
      edit(sh, '自動的に更新する', function (t) {
        t = check(t, '自動的に更新する', k.renewal === '自動的に更新する');
        t = check(t, '更新する場合があり得る', k.renewal === '更新する場合があり得る');
        return check(t, '契約の更新はしない', k.renewal === '契約の更新はしない');
      });
      var maybe = k.renewal === '更新する場合があり得る', cr = k.crit || {};
      edit(sh, '契約期間満了時の業務量', function (t) {
        t = check(t, '契約期間満了時の業務量', maybe && cr.crit1);
        t = check(t, '労働者の勤務成績', maybe && cr.crit2);
        return check(t, '労働者の業務を遂行する能力', maybe && cr.crit3);
      });
      edit(sh, '会社の経営状況', function (t) {
        t = check(t, '会社の経営状況', maybe && cr.crit4);
        t = check(t, '従事している業務の進捗状況', maybe && cr.crit5);
        t = check(t, 'その他', maybe && cr.crit6);
        return maybe && cr.crit6 ? between(t, 'その他（', '）', k.critOther) : t;
      });
      edit(sh, '更新上限の有無', function (t) {
        if (k.renewLimit === '有') return t.replace(new RegExp('（無・有（更新' + SP + '*回まで／通算契約期間' + SP + '*年まで））'),
          '（有（更新　' + (k.renewTimes || '　') + '回まで／通算契約期間　' + (k.renewYears || '　') + '年まで））');
        if (k.renewLimit === '無') return t.replace(new RegExp('（無・有（更新' + SP + '*回まで／通算契約期間' + SP + '*年まで））'), '（無）');
        return t;
      });
      if (k.muki === '有') {
        edit(sh, '無期雇用契約）の締結の申込みをすることにより', function (t) {
          t = dates(t, [k.mukiDate]);
          return t.replace(new RegExp('（' + SP + '*無' + SP + '*・' + SP + '*有（別紙２のとおり）' + SP + '*）'), k.mukiChange === '有' ? '（有（別紙２のとおり））' : '（無）');
        });
      }
    }
    // Ⅱ 就業の場所
    edit(sh, '直接雇用（以下に記入）', function (t) { return check(t, '直接雇用', k.employType !== '派遣雇用'); });
    edit(sh, '派遣雇用（別紙「就業条件明示書」に記入）', function (t) { return check(t, '派遣雇用', k.employType === '派遣雇用'); });
    var place = sh.find('Ⅱ．就業の場所'), job = sh.find('Ⅲ．従事すべき業務の内容'), hours = sh.find('Ⅳ．労働時間等');
    var pr = place ? X.parseRef(place).row : 0, jr = job ? X.parseRef(job).row : 0, hr = hours ? X.parseRef(hours).row : 0;
    var leftCol = function (r) { return X.parseRef(r).col < 20; };
    sh.findAll(/^事業所名/, { after: pr - 1, before: jr }).forEach(function (r) {
      if (leftCol(r)) sh.edit(r, function (t) { return after(t, '事業所名', co.siteName); });
      else if (k.placeChange === '変更あり') sh.edit(r, function (t) { return after(t, '事業所名', k.placeChangeName); });
    });
    sh.findAll(/^所在地/, { after: pr - 1, before: jr }).forEach(function (r) {
      if (leftCol(r)) sh.edit(r, function (t) { return after(after(t, '所在地', co.siteAddr), '連絡先', co.siteTel); });
      else if (k.placeChange === '変更あり') sh.edit(r, function (t) { return after(t, '所在地', k.placeChangeAddr); });
    });
    sh.findAll(/^連絡先/, { after: pr - 1, before: jr }).forEach(function (r) {
      if (leftCol(r)) sh.edit(r, function (t) { return after(t, '連絡先', co.siteTel); });
      else if (k.placeChange === '変更あり') sh.edit(r, function (t) { return after(t, '連絡先', k.placeChangeTel); });
    });
    sh.findAll('（変更の範囲）', { after: pr - 1, before: hr }).forEach(function (r) {
      var isPlace = X.parseRef(r).row < jr;
      var none = isPlace ? k.placeChange !== '変更あり' : k.jobChange !== '変更あり';
      sh.edit(r, function (t) { return check(t, '変更の可能性なし', none); });
    });
    sh.findAll('１．分', { after: jr - 1, before: hr }).forEach(function (r) {
      var isLeft = leftCol(r);
      var field = isLeft ? co.field : (k.jobChange === '変更あり' ? k.jobChangeField : '');
      var cat = isLeft ? co.category : (k.jobChange === '変更あり' ? k.jobChangeCategory : '');
      sh.edit(r, function (t) { return between(between(t, '野（', '）', field), '業務区分（', '）', cat); });
    });
    sh.findAll('２．業務区分（', { after: jr - 1, before: hr }).forEach(function (r) {
      if (sh.text(r).indexOf('分　　野') >= 0) return;    // 分野と同じ行（上で記入済み）
      var cat = leftCol(r) ? co.category : (k.jobChange === '変更あり' ? k.jobChangeCategory : '');
      sh.edit(r, function (t) { return between(t, '業務区分（', '）', cat); });
    });
    // Ⅳ 労働時間等
    var st = hm(lab.startTime), et = hm(lab.endTime), dh = hours2hm(calc.dailyHours);
    edit(sh, /\(1\)[　 ]*始業/, function (t) {
      var i = 0, vals = [st, et];
      t = t.replace(new RegExp('（' + SP + '+時' + SP + '+分）', 'g'), function (m) { var v = vals[i++]; return v ? '（' + v.h + '時' + v.m + '分）' : m; });
      return dh ? t.replace(new RegExp('時間数' + SP + '+時間' + SP + '+分'), '時間数　' + dh.h + '時間' + dh.m + '分') : t;
    });
    var variable = k.variable && k.variable !== 'なし';
    edit(sh, '変形労働時間制：', function (t) {
      t = check(t, '変形労働時間制', variable);
      return variable ? t.replace(new RegExp('（' + SP + '*）単位'), '（' + k.variable.replace('単位', '') + '）単位') : t;
    });
    var shifts = (k.shifts || []).filter(function (x) { return x.start; });
    edit(sh, '交代制として', function (t) { return check(t, '交代制として', shifts.length > 0); });
    sh.findAll(/^[　 ]*始業（/).forEach(function (r, i) {
      var x = shifts[i]; if (!x) return;
      sh.edit(r, function (t) {
        var a = hm(x.start), b = hm(x.end), h = hm(x.hours), j = 0, vals = [a, b];
        t = t.replace(new RegExp('（' + SP + '+時' + SP + '+分）', 'g'), function (m) { var v = vals[j++]; return v ? '（' + v.h + '時' + v.m + '分）' : m; });
        if (x.from) t = between(t, '適用日', '、', jpDate(x.from));
        return h ? t.replace(new RegExp('所定労働時間' + SP + '+時間' + SP + '+分'), '所定労働時間　' + h.h + '時間' + h.m + '分') : t;
      });
    });
    edit(sh, '２．休憩時間', function (t) { return paren(t, '分', [lab.breakMin]); });
    var hol = Calc.num(lab.holidays);
    var annual = calc.dailyHours !== null && lab.holidays ? calc.dailyHours * (365 - hol) : null;
    var wk = annual !== null ? hours2hm(annual / 365 * 7) : null, mo = annual !== null ? hours2hm(annual / 12) : null, yr = annual !== null ? hours2hm(annual) : null;
    edit(sh, '３．所定労働時間数', function (t) {
      var i = 0, vals = [wk, mo, yr];
      return t.replace(new RegExp('（' + SP + '*時間' + SP + '*分）', 'g'), function (m) { var v = vals[i++]; return v ? '（' + v.h + '時間' + v.m + '分）' : m; });
    });
    var r2 = function (x) { return Math.ceil(x * 100 - 1e-9) / 100; };
    var dW = empty(k.daysWeek) ? (lab.holidays ? r2((365 - hol) / 365 * 7) : '') : k.daysWeek;
    var dM = empty(k.daysMonth) ? (lab.holidays ? r2((365 - hol) / 12) : '') : k.daysMonth;
    var dY = empty(k.daysYear) ? (lab.holidays ? 365 - hol : '') : k.daysYear;
    edit(sh, '４．所定労働日数', function (t) { return paren(t, '日', [dW, dM, dY]); });
    edit(sh, '所定時間外労働の有無', function (t) { return k.overtime === '無' ? check(t, '無', true) : check(t, '有', k.overtime === '有'); });
    rules(sh, '○詳細は、就業規則', [k.rulesHours, k.rulesHoliday, k.rulesLeave, k.rulesRetire]);
    // Ⅴ 休日
    edit(sh, '定例日：毎週', function (t) {
      t = between(t, '毎週', '曜日', k.holidayWeekday);
      t = between(t, 'その他（', '）', k.holidayRegularOther);
      return t.replace(new RegExp('（年間合計休日日数' + SP + '*日）'), function (m) { return lab.holidays ? '（年間合計休日日数　' + lab.holidays + '日）' : m; });
    });
    edit(sh, '非定例日：', function (t) {
      if (k.holidayIrregularPer) t = t.replace('週・月当たり', k.holidayIrregularPer);
      t = t.replace(new RegExp('当たり' + SP + '*日'), function (m) { return empty(k.holidayIrregularDays) ? m : '当たり　' + k.holidayIrregularDays + '日'; });
      return between(t, 'その他（', '）', k.holidayOther);
    });
    // Ⅵ 休暇
    edit(sh, '６か月継続勤務した場合', function (t) { return t.replace(new RegExp('→' + SP + '*日'), empty(k.annualLeave) ? '$&' : '→　' + k.annualLeave + '日'); });
    edit(sh, '継続勤務６か月未満の年次有給休暇', function (t) {
      t = k.shortLeave === '有' ? check(t, '有', true) : check(t, '無', true);
      if (k.shortLeave !== '有') return t;
      t = t.replace(new RegExp('→' + SP + '*か月経過で' + SP + '*日'), '→　' + (k.shortLeaveMonths || '　') + 'か月経過で　' + (k.shortLeaveDays || '　') + '日');
      return t;
    });
    edit(sh, '２．その他の休暇', function (t) { return between(between(t, '有給（', '）', k.leavePaid), '無給（', '）', k.leaveUnpaid); });
    // Ⅶ 賃金
    var type = sal.payType || '月給';
    edit(sh, /１．基本賃金.*月給（/, function (t) { return basePay(t, type, sal.basePay); });
    var allows = (sal.allowances || []).filter(function (a) { return !empty(a.name); });
    edit(sh, /^[　 ]*（[　 ]*手当[、，]/, function (t) {
      var i = 0;
      t = t.replace(new RegExp(SP + '+手当', 'g'), function (m) { var a = allows[i++]; return a ? '　' + a.name.replace(/手当$/, '') + '手当' : m; });
      return t;
    });
    var prem = [[k.prem60in], [k.prem60out], [k.premScheduled], [k.premLegalHoliday, k.premOtherHoliday], [k.premNight]];
    [/法定超月60時間以内/, /法定超月60時間超/, /^[　 ]*所定超/, /\(2\)[　 ]*休日/, /\(3\)[　 ]*深夜/].forEach(function (re, i) {
      edit(sh, re, function (t) {
        var j = 0;
        return t.replace(new RegExp('（' + SP + '*）％', 'g'), function (m) { var v = prem[i][j++]; return empty(v) ? m : '（' + v + '）％'; });
      });
    });
    var day = function (t, v) {
      if (empty(v)) return t;
      t = t.replace('□', '■');
      return t.replace(new RegExp('毎月' + SP + '+日'), '毎月　' + v + '日');
    };
    edit(sh, '４．賃金締切日', function (t) { return day(t, k.closingDay); });
    edit(sh, '５．賃金支払日', function (t) { return day(t, k.payDay); });
    edit(sh, '６．賃金支払方法', function (t) { return check(check(t, '口座振込', k.payMethod !== '通貨払'), '通貨払', k.payMethod === '通貨払'); });
    edit(sh, '労使協定に基づく賃金支払時の控除', function (t) { return k.laborDeduct === '有' ? check(t, '有', true) : check(t, '無', true); });
    [['８．昇給', k.raise, k.raiseText], ['９．賞与', k.bonus, k.bonusText], ['10．退職金', k.retireAllow, k.retireAllowText]].forEach(function (x) {
      edit(sh, x[0], function (t) {
        if (x[1] === '有') return between(check(t, '有', true), '時期、金額等', '）', x[2]);
        return x[1] === '無' ? t.replace(/□([　 ]*無)/, '■$1') : t;
      });
    });
    edit(sh, /11[.．][　 ]*休業手当/, function (t) {
      t = check(t, '有', true);
      return empty(k.leaveAllowRate) ? t : t.replace(new RegExp('率' + SP + '+'), '率　' + k.leaveAllowRate + '％　');
    });
    // Ⅷ 退職
    edit(sh, '自己都合退職の手続', function (t) { return between(t, '退職する', '日前', k.selfResignDays); });
    // Ⅸ その他
    var ins = [['厚生年金', k.insKousei], ['健康保険', k.insKenkou], ['雇用保険', k.insKoyou], ['労災保険', k.insRousai], ['国民年金', k.insKokumin], ['国民健康保険', k.insKokuho]];
    sh.findAll(/(厚生年金|国民年金)/).forEach(function (r) {
      sh.edit(r, function (t) {
        ins.forEach(function (x) { t = check(t, x[0], x[1] === '加入'); });
        if (!empty(k.insOther)) t = between(check(t, 'その他', true), 'その他（', '）', k.insOther);
        return t;
      });
    });
    edit(sh, '雇入れ時の健康診断', function (t) { return yearMonth(t, k.healthHire); });
    edit(sh, '初回の定期健康診断', function (t) { return between(yearMonth(t, k.healthFirst), 'その後', 'ごと', k.healthInterval); });
    var windows = sh.findAll(/^[　 ]*部署名/);
    var desks = isMuki ? [[k.deskMgmtDept, k.deskMgmtPerson, k.deskMgmtTel]] : [[k.deskDiffDept, k.deskDiffPerson, k.deskDiffTel], [k.deskMgmtDept, k.deskMgmtPerson, k.deskMgmtTel]];
    if (!isMuki && windows.length === 1) desks = [desks[1]];
    windows.forEach(function (r, i) {
      var d = desks[i]; if (!d) return;
      sh.edit(r, function (t) { return between(between(after(t, '部署名', d[0]), '担当者職氏名', '（連絡先', d[1]), '（連絡先', '）', d[2]); });
    });
    edit(sh, '就業規則を確認できる場所や方法', function (t) { return between(t, '方法（', '）', k.rulesWhere); });
  }
  function basePay(t, type, amount) {
    t = check(t, type, true);
    return empty(amount) ? t : t.replace(new RegExp(esc(type) + '（' + SP + '*円）'), type + '（' + yen(amount) + '円）');
  }
  function rules(sh, needle, list) {
    sh.findAll(needle).forEach(function (r, i) {
      var v = list[i];
      if (empty(v)) return;
      sh.edit(r, function (t) { return t.replace(/就業規則.*$/, '就業規則　' + v); });
    });
  }
  FILL['1-6'] = function (sh, ctx) { conditions(sh, ctx, false); };
  FILL['1-6別紙2'] = function (sh, ctx) { conditions(sh, ctx, true); };

  // ================= 1-6 別紙１ 賃金の支払 =================
  FILL['1-6別紙1'] = function (sh, ctx) {
    var sal = ctx.case.salary || {}, c = ctx.calc, d = sal.deductions || {}, k = ctx.docs.contract || {};
    var type = sal.payType || '月給';
    edit(sh, /^[　 ]*□[　 ]*月給（/, function (t) { return basePay(t, type, sal.basePay); });
    edit(sh, '月給・日給の場合の１時間当たりの金額', function (t) {
      return type === '時間給' || c.hourly === null ? t : t.replace(new RegExp('（' + SP + '*円）'), '（' + Math.floor(c.hourly).toLocaleString('ja-JP') + '円）');
    });
    edit(sh, '日給・時間給の場合の１か月当たりの金額', function (t) {
      return type === '月給' ? t : t.replace(new RegExp('（' + SP + '*円）'), '（' + yen(c.monthlyBase) + '円）');
    });
    var allows = (sal.allowances || []).filter(function (a) { return !empty(a.name); });
    ['(a)', '(b)', '(c)', '(d)'].forEach(function (l, i) {
      var a = allows[i]; if (!a) return;
      edit(sh, new RegExp(esc(l) + SP + '*（'), function (t) {
        t = t.replace(new RegExp('（' + SP + '*手当'), '（' + a.name.replace(/手当$/, '') + '手当');
        t = t.replace(new RegExp('手当' + SP + '*円'), '手当　' + yen(a.amount) + '円');
        return between(t, '計算方法：', '）', a.method);
      }, { before: (sh.find('【固定残業代') ? X.parseRef(sh.find('【固定残業代')).row : undefined) });
    });
    if (!empty(k.fixedOtName)) {
      edit(sh, /^\(e\)/, function (t) {
        t = t.replace(new RegExp('（' + SP + '*手当'), '（' + k.fixedOtName.replace(/手当$/, '') + '手当');
        return t.replace(new RegExp('手当' + SP + '*円'), '手当　' + yen(k.fixedOtAmount) + '円');
      });
      edit(sh, '支給要件：', function (t) { return between(t, 'かかわらず、', '時間分', k.fixedOtHours); });
      edit(sh, /^[　 ]*時間を超える時間外労働分/, function (t) { return keepWidth(t, /^[　 ]*時間を超える/, '　' + k.fixedOtHours + '時間を超える'); });
    }
    edit(sh, '１か月当たりの支払概算額', function (t) { return t.replace(new RegExp('約' + SP + '*円'), '約　' + yen(c.monthlyC) + '円'); });
    [['(a) 税', d.incomeTax], ['(b) 社会保険料', d.socialIns], ['(c) 雇用保険料', d.empIns], ['(d) 食', d.food], ['(e) 居', d.housing], ['(f) その他', d.utility]].forEach(function (x) {
      edit(sh, new RegExp(esc(x[0]).replace(' ', SP + '*')), function (t) { return empty(x[1]) ? t : t.replace(new RegExp('（約' + SP + '*円）'), '（約　' + yen(x[1]) + '円）'); });
    });
    var others = (sal.otherDeductions || []).filter(function (o) { return !empty(o.name) || Calc.num(o.amount); });
    sh.findAll(new RegExp('^' + SP + '*（' + SP + '*）' + SP + '*（約')).forEach(function (r, i) {
      var o = others[i]; if (!o) return;
      sh.edit(r, function (t) {
        t = t.replace(new RegExp('（' + SP + '*）'), '（' + (o.name || '') + '）');
        return t.replace(new RegExp('（約' + SP + '*円）'), '（約　' + yen(o.amount) + '円）');
      });
    });
    edit(sh, '控除する金額', function (t) { return t.replace(new RegExp('約' + SP + '*円'), '約　' + yen(c.deductionTotal) + '円'); });
    edit(sh, '手取り支給額', function (t) { return t.replace(new RegExp('約' + SP + '*円'), '約　' + yen(c.takeHome) + '円'); });
  };

  // ================= 1-16 雇用の経緯に係る説明書 =================
  FILL['1-16'] = function (sh, ctx) {
    var n = names(ctx), k = ctx.docs.hiring || {};
    edit(sh, /^特定技能外国人.*との間で/, function (t) { return between(t, '特定技能外国人', 'との間で', n.wName); });
    if (ctx.combined) edit(sh, /^申請人の署名/, function (t) { return keepWidth(t, /^申請人の署名[\u3000 ]*/, '申請人の署名　　　　別紙のとおり'); });
    var s2 = sh.find('２　取次機関（国外）'), s3 = sh.find('３　事前ガイダンスの実施');
    var r2 = s2 ? X.parseRef(s2).row : 9999, r3 = s3 ? X.parseRef(s3).row : 9999;
    var yn = function (t, v) { return v === '有' ? check(t, '有', true) : t.replace(/□([　 ]*無)/, '■$1'); };
    var dom = k.domHas === '有', abr = k.abrHas === '有';
    var a1 = sh.find('１　あっせんの有無'); if (a1) sh.edit(sh.rightOf(a1), function (t) { return yn(t, k.domHas || '無'); });
    if (dom) {
      var a2 = sh.find('２　許可・届出受理番号');
      if (a2) sh.set(sh.rightOf(a2), (k.domPermitNo || '') + '　（' + (jpDate(k.domPermitDate) || '　　年　　月　　日') + '）');
      var a3 = sh.find('３　職業紹介事業者の区分');
      if (a3) sh.edit(sh.rightOf(a3), function (t) { return check(t, k.domKind === '無料職業紹介事業者' ? '無料職業紹介事業者' : '有料職業紹介事業者', true); });
      right(sh, '４　職業紹介事業者の氏名', k.domName);
      var a5 = sh.find('５　職業紹介事業者の住所');
      if (a5) sh.set(sh.rightOf(a5), '〒' + zipText(k.domZip) + '　' + (k.domAddr || ''));
      var tel = sh.find('（電話番号', { before: r2 });
      if (tel) sh.edit(tel, function (t) { return empty(k.domTel) ? t : t.replace(/（電話番号.*）/, '（電話番号　' + k.domTel + '）'); });
    }
    feeBlock(sh, { before: r2 }, dom ? [k.domSeekerAmount, k.domSeekerPurpose, k.domEmployerAmount, k.domEmployerPurpose] : []);
    var b1 = sh.find('１　取次ぎの有無'); if (b1) sh.edit(sh.rightOf(b1), function (t) { return yn(t, k.abrHas || '無'); });
    if (abr) {
      right(sh, '２　氏名又は名称', k.abrName, { after: r2 });
      right(sh, '３　所在国', k.abrCountry, { after: r2 });
      var b4 = sh.find('４　所在地', { after: r2 });
      if (b4) sh.set(sh.rightOf(b4), (k.abrAddr || '') + '\n（電話番号　' + (k.abrTel || '') + '）');
    }
    feeBlock(sh, { after: r2, before: r3 }, abr ? [k.abrSeekerAmount, k.abrSeekerPurpose, k.abrEmployerAmount, k.abrEmployerPurpose] : []);
    var g = sh.find('第１号特定技能外国人支援計画に定めるとおりに実施していることの有無');
    if (g) sh.edit(sh.rightOf(g), function (t) { return pick(t, '有', '無', k.guidance || '有'); });
    signature(sh, ctx);
    // ４ 自国等の機関に支払った費用
    var head = sh.find('支払先機関の名称');
    var pays = k.payments || [];
    if (head) {
      var hr = X.parseRef(head).row;
      var total = 0;
      for (var i = 0; i < 5; i++) {
        var p = pays[i]; if (!p) continue;
        var row = hr + 1 + i;
        var no = X.ref(1, row);
        sh.set(sh.rightOf(no), p.payee || '');
        var cols = {};
        ['名目', '支払年月日', '支払金額'].forEach(function (lbl) { var r = sh.find(lbl, { after: hr - 1, before: hr + 1 }); cols[lbl] = r ? X.parseRef(r).col : null; });
        if (cols['名目']) sh.set(X.ref(cols['名目'], row), p.purpose || '');
        if (cols['支払年月日'] && p.date) sh.set(X.ref(cols['支払年月日'], row), jpDate(p.date));
        if (cols['支払金額']) sh.set(X.ref(cols['支払金額'], row), (p.foreign || '') + '（' + (yen(p.yen) || '　　') + '円）');
        total += Calc.num(p.yen);
      }
      var tot = sh.find(new RegExp('^計'), { after: hr });
      if (tot) {
        sh.edit(tot, function (t) { return empty(k.foreignTotal) ? t : '計　' + k.foreignTotal; });
        if (total) sh.edit(sh.below(tot), function (t) { return t.replace(new RegExp('（' + SP + '*円）'), '（' + total.toLocaleString('ja-JP') + '円）'); });
      }
    }
  };
  function feeBlock(sh, range, vals) {
    if (!vals.length) return;
    var amounts = sh.findAll('額', Object.assign({}, range)).filter(function (r) { return sh.text(r).trim() === '額'; });
    var purposes = sh.findAll('名目', Object.assign({}, range)).filter(function (r) { return sh.text(r).trim() === '名目'; });
    [[amounts[0], vals[0], true], [purposes[0], vals[1], false], [amounts[1], vals[2], true], [purposes[1], vals[3], false]].forEach(function (x) {
      if (!x[0] || empty(x[1])) return;
      var cell = sh.rightOf(x[0]);
      sh.edit(cell, function (t) {
        if (x[2]) return /（/.test(t) ? t.replace(new RegExp('（' + SP + '*円）'), '（' + yen(x[1]) + '円）') : keepWidth(t, new RegExp(SP + '*円'), yen(x[1]) + '円');
        return keepWidth(t, new RegExp(SP + '*として'), x[1] + '　として');
      });
    });
  }

  // ================= 1-25 支援委託契約に関する説明書 =================
  FILL['1-25'] = function (sh, ctx) {
    var n = names(ctx), s = ctx.case.schedule || {}, sup = n.sup;
    var fee = SKS.entrustFees(ctx.support);
    right(sh, '申請人（支援対象者）', n.wName);
    var p2 = sh.find('契約の相手方（登録支援機関）');
    if (p2) sh.set(sh.rightOf(p2), sup.name || '');
    edit(sh, '登－', function (t) { return empty(sup.regNo) ? t : '（' + sup.regNo + '）'; });
    var p3 = sh.find('契約年月日'); if (p3) sh.edit(sh.rightOf(p3), function (t) { return dates(t, [s.supportContractDate]); });
    var p4 = sh.find('委託する支援業務'); if (p4) sh.edit(sh.rightOf(p4), function (t) { return pick(t, '該当', '非該当', '該当'); });
    var p5 = sh.find('委託料（１名当たりの月額）'); if (p5 && fee.regular) sh.set(sh.rightOf(p5), fee.regular.toLocaleString('ja-JP') + '円');
    var p6 = sh.find(/^契約期間$/); if (p6) sh.edit(sh.rightOf(p6), function (t) { return dates(t, [ctx.supportFrom, ctx.supportTo]); });
    signature(sh, ctx);
  };

  // ================= 5-10 支援委託契約書 =================
  FILL['5-10'] = function (sh, ctx) {
    var n = names(ctx), s = ctx.case.schedule || {}, sup = n.sup, co = n.co;
    var fee = SKS.entrustFees(ctx.support);
    edit(sh, /^特定技能所属機関.*（以下「甲」/, function (t) {
      t = between(t, '特定技能所属機関', '（以下「甲」', co.name);
      t = between(t, '登録支援機関', '（以下「乙」', sup.name);
      return between(t, '１号特定技能外国人', '（以下「丙」', n.wName);
    });
    edit(sh, '●●分野', function (t) { return empty(co.field) ? t : t.replace('●●分野', co.field + '分野').replace(co.field + '分野分野', co.field + '分野'); });
    edit(sh, /^月額[　 ]*円を支払う/, function (t) { return fee.regular ? t.replace(new RegExp('月額' + SP + '*円'), '月額　' + fee.regular.toLocaleString('ja-JP') + '円') : t; });
    edit(sh, '本契約の期間は', function (t) { return dates(t, [ctx.supportFrom, ctx.supportTo]); });
    edit(sh, '地方裁判所を第一審', function (t) { var c = (sup.court || '').replace(/地方裁判所$/, ''); return empty(c) ? t : t.replace(new RegExp('争訟は' + SP + '*地方裁判所'), '争訟は' + c + '地方裁判所'); });
    edit(sh, /^[　 ]*年[　 ]*月[　 ]*日[　 ]*締結/, function (t) { return dates(t, [s.supportContractDate]); });
    edit(sh, /^（甲）.*㊞（乙）/, function (t) {
      t = between(t, '（甲）', '㊞（乙）', [co.name, [co.repTitle, co.repName].filter(Boolean).join('　')].filter(Boolean).join('　'));
      return t.replace(new RegExp('（乙）' + SP + '*(㊞)?$'), function (m, seal) { return '（乙）　' + [sup.name, [sup.repTitle, sup.repName].filter(Boolean).join('　')].filter(Boolean).join('　') + '　' + (seal || '㊞'); });
    });
    // 別紙 支援委託費用内訳
    var head = sh.find(/^名目$/);
    if (head) {
      var hr = X.parseRef(head).row;
      fee.items.forEach(function (it, i) {
        var no = sh.find(new RegExp('^' + (i + 1) + '$'), { after: hr, col: 'A' });
        if (!no) return;
        var r = X.parseRef(no).row;
        sh.set(sh.rightOf(no), it.name);
        var amt = sh.find('金', { after: r - 1, before: r + 1 });
        if (amt) sh.edit(amt, function (t) {
          var v = isNaN(parseFloat(String(it.amount).replace(/,/g, ''))) ? (it.amount || '') : yen(it.amount);
          return t.replace(new RegExp('額：' + SP + '*円'), '額：　' + v + (it.unit && it.unit !== '円' ? it.unit : '円'));
        });
        var tm = sh.find('徴収時期', { after: r, before: r + 2 });
        if (tm) sh.edit(tm, function (t) { return check(t, it.timing === '定期' ? '定期' : '随時', true); });
      });
      edit(sh, /^合計/, function (t) { return fee.total ? t.replace(new RegExp('合計' + SP + '*円'), '合計　' + fee.total.toLocaleString('ja-JP') + '円') : t; }, { after: hr });
    }
  };

  SKS.FILL = FILL;
  SKS.FillUtil = T;
})();
