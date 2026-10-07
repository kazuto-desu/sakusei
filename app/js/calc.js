/*
 * 「データ（★）」シートの計算式をアプリ上で再現し、入力中にすぐ確認できるようにする
 */
(function () {
  'use strict';
  var ANNUAL_LIMIT = 2085.7; // 年間労働時間の上限目安（Excelの警告条件と同じ）

  function num(v) {
    if (v === '' || v === null || v === undefined) return 0;
    var n = parseFloat(String(v).replace(/[,，円\s]/g, ''));
    return isNaN(n) ? 0 : n;
  }
  function minutes(hhmm) {
    var m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || '');
    return m ? +m[1] * 60 + +m[2] : null;
  }
  function roundDown(x, d) { var p = Math.pow(10, d || 0); return Math.floor(x * p + 1e-9) / p; }
  function roundUp(x, d) { var p = Math.pow(10, d || 0); return Math.ceil(x * p - 1e-9) / p; }
  function round(x, d) { var p = Math.pow(10, d || 0); return Math.round(x * p) / p; }

  function compute(c) {
    var labor = c.labor || {}, sal = c.salary || {};
    var r = { warnings: [] };
    var holidays = num(labor.holidays);
    var s = minutes(labor.startTime), e = minutes(labor.endTime);
    var dailyMin = (s !== null && e !== null) ? (e - s - num(labor.breakMin)) : null;
    r.dailyHours = dailyMin !== null ? dailyMin / 60 : null;
    // E35 =ROUNDUP((365-E27)*(HOUR(E34)+MINUTE(E34)/60),1)
    r.annualHours = r.dailyHours !== null ? roundUp((365 - holidays) * r.dailyHours, 1) : null;
    if (r.annualHours !== null) {
      r.weeklyHours = round(r.annualHours / 365 * 7, 1);
      r.monthlyHours = round(r.annualHours / 12, 1);
      if (r.annualHours > ANNUAL_LIMIT) r.warnings.push('年間労働時間が ' + ANNUAL_LIMIT + ' 時間を超えています（' + r.annualHours + ' 時間）');
      if (r.dailyHours > 8) r.warnings.push('1日の所定労働時間が8時間を超えています');
      if (r.weeklyHours > 40) r.warnings.push('週平均の所定労働時間が40時間を超えています（' + r.weeklyHours + ' 時間）');
    }
    var base = num(sal.basePay);
    var type = sal.payType || '月給';
    // K30（端数切捨て）/ N30（端数あり）
    var monthlyRaw;
    if (type === '時間給') monthlyRaw = r.annualHours ? base * r.annualHours / 12 : 0;
    else if (type === '日給') monthlyRaw = base * (365 - holidays) / 12;
    else monthlyRaw = base;
    r.monthlyBase = roundDown(monthlyRaw, 0);

    var sums = { 1: 0, 2: 0, 3: 0 };
    (sal.allowances || []).forEach(function (a) {
      var k = parseInt(a.kind, 10);
      if (sums[k] !== undefined) sums[k] += num(a.amount);
    });
    r.allowHousing = sums[1];
    r.allowFixed = sums[2];
    r.allowVariable = sums[3];
    r.allowTotal = sums[1] + sums[2] + sums[3];
    r.monthlyA = r.monthlyBase + sums[2];             // K31 固定支給を含む
    r.monthlyB = r.monthlyBase + sums[2] + sums[3];   // K32 住宅手当(1)を除く
    r.monthlyC = r.monthlyBase + r.allowTotal;        // K33 総額
    // K34 =ROUNDDOWN(N31*12/E35,1)
    r.hourly = r.annualHours ? roundDown((monthlyRaw + sums[2]) * 12 / r.annualHours, 1) : null;

    var d = sal.deductions || {};
    var ded = num(d.incomeTax) + num(d.socialIns) + num(d.empIns) + num(d.food) + num(d.housing) + num(d.utility);
    (sal.otherDeductions || []).forEach(function (o) { ded += num(o.amount); });
    r.deductionTotal = ded;
    r.takeHome = r.monthlyC - ded;
    if (base && r.takeHome < 0) r.warnings.push('手取り額がマイナスになっています');
    var jp = num((c.schedule || {}).jpSalary);
    if (jp && r.monthlyA && r.monthlyA < jp) r.warnings.push('月給（固定支給込み）が、同等業務の日本人の報酬（' + jp.toLocaleString() + '円）を下回っています');
    return r;
  }

  function ageAt(birthIso, atIso) {
    if (!birthIso || !atIso) return null;
    var b = birthIso.split('-').map(Number), a = atIso.split('-').map(Number);
    var age = a[0] - b[0];
    if (a[1] < b[1] || (a[1] === b[1] && a[2] < b[2])) age--;
    return age;
  }

  window.SKS = window.SKS || {};
  window.SKS.Calc = { compute: compute, num: num, ageAt: ageAt, ANNUAL_LIMIT: ANNUAL_LIMIT };
})();
