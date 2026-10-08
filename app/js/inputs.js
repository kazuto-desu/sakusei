/*
 * 書類ごとの入力欄と、書類を作るときの共通コンテキスト
 * （入力欄は公式参考様式の項目に合わせている）
 */
(function () {
  'use strict';
  var SKS = window.SKS, Calc = SKS.Calc;

  function empty(v) { return v === undefined || v === null || String(v).trim() === ''; }
  function parts(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? { y: +m[1], m: +m[2], d: +m[3] } : null; }
  function addMonths(iso, n) {
    var p = parts(iso); if (!p) return '';
    var d = new Date(Date.UTC(p.y, p.m - 1 + n, p.d));
    if (d.getUTCDate() !== p.d) d = new Date(Date.UTC(p.y, p.m - 1 + n + 1, 0));   // EDATE と同じく月末に丸める
    return d.toISOString().slice(0, 10);
  }
  function addDays(iso, n) { var p = parts(iso); return p ? new Date(Date.UTC(p.y, p.m - 1, p.d + n)).toISOString().slice(0, 10) : ''; }

  // 支援委託費用（登録支援機関マスタの内訳）から月額（定期分）を求める
  function entrustFees(sup) {
    var items = ((sup || {}).feeItems || []).filter(function (x) { return !empty(x.name); });
    var total = 0, regular = 0;
    items.forEach(function (x) {
      var n = parseFloat(String(x.amount || '').replace(/[,，円\s]/g, ''));
      if (isNaN(n)) return;
      total += n;
      if (x.timing === '定期') regular += n;
    });
    return { items: items, total: total, regular: regular, occasional: total - regular };
  }

  // workerId: 個人ごとの書類の対象者。combined: true のときは同時申請の全員をまとめた（連名の）書類
  function context(c, state, workerId, combined) {
    var byId = function (list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; };
    var s = c.schedule || {};
    var workers = (c.workerIds || []).map(function (id) { return byId(state.workers, id); }).filter(Boolean);
    var docs = {};
    var per = ((c.perWorker || {})[workerId]) || {};
    Object.keys(c.docs || {}).forEach(function (k) { docs[k] = Object.assign({}, c.docs[k], per[k] || {}); });
    var ctx = {
      case: c,
      worker: byId(state.workers, workerId) || workers[0] || {},
      workers: workers,
      combined: !!combined && workers.length > 1,
      company: byId(state.companies, c.companyId) || {},
      support: byId(state.supports, c.supportId),
      calc: Calc.compute(c),
      my: s.lang === 'ミャンマー語',
      docs: docs
    };
    ctx.employEnd = s.employEnd || (s.employStart ? addDays(addMonths(s.employStart, 12), -1) : '');
    ctx.supportFrom = s.supportFrom || s.supportContractDate || '';
    ctx.supportTo = s.supportTo || (ctx.supportFrom ? addDays(addMonths(ctx.supportFrom, 12), -1) : '');
    return ctx;
  }

  var YN = ['無', '有'];
  var CHANGE = ['変更の可能性なし', '変更あり'];

  SKS.DOC_INPUTS = [
    {
      key: 'reward', title: '報酬に関する説明書（1-4）',
      fields: [
        { group: '1 申請人に対する報酬' },
        { key: 'duties', label: '②申請人の役職，職務内容，責任の程度', type: 'textarea', required: true,
          placeholder: '例）〇〇において△△業務を担当する（役職なし）。指導員の指示に従って……に従事する。' },
        { key: 'expYears', label: '③経験年数（従事させる業務に係る経験・年）', type: 'number', placeholder: '0', perWorker: true },
        { key: 'notes', label: '⑤その他（諸手当など特記事項）', type: 'textarea', hint: '空欄のときは手当の内訳を自動で記載します' },
        { group: '2・3 比較対象の日本人労働者' },
        { key: 'compareType', label: '比較対象', type: 'select', required: true, options: ['比較対象となる日本人労働者がいる', '比較対象となる日本人労働者がいない'] },
        { key: 'jpDuties', label: '①（最も近い職務を担う）日本人労働者の役職，職務内容，責任の程度', type: 'textarea', required: true },
        { key: 'jpAge', label: '②年齢（歳）', type: 'number' },
        { key: 'jpGender', label: '②性別', type: 'select', options: ['男', '女'] },
        { key: 'jpExp', label: '②経験年数（年）', type: 'number' },
        { key: 'jpMonthly', label: '③報酬 月給（円）', type: 'number', hint: '月給・時間給のどちらかで記載（申請人の欄と統一）' },
        { key: 'jpHourly', label: '③報酬 時間給（円）', type: 'number' },
        { key: 'wageRule', label: '④賃金規程の有無', type: 'select', options: YN },
        { key: 'ruleMonthly', label: '④規程に基づく報酬 月給（円）', type: 'number' },
        { key: 'ruleHourly', label: '④規程に基づく報酬 時間給（円）', type: 'number' },
        { key: 'reason', label: '⑤日本人と同等以上であると考える理由', type: 'textarea', required: true },
        { key: 'jpNotes', label: '⑥その他', type: 'textarea' }
      ]
    },
    {
      key: 'contract', title: '雇用契約書・雇用条件書（1-5・1-6）',
      defaults: {
        renewal: '自動的に更新する', renewLimit: '無', muki: '無', employType: '直接雇用', placeChange: '変更の可能性なし', jobChange: '変更の可能性なし',
        variable: 'なし', overtime: '有', annualLeave: '10', shortLeave: '無',
        prem60in: '25', prem60out: '50', premScheduled: '25', premLegalHoliday: '35', premOtherHoliday: '25', premNight: '25',
        closingDay: '末', payMethod: '口座振込', laborDeduct: '無', raise: '無', bonus: '無', retireAllow: '無', leaveAllowRate: '60',
        selfResignDays: '30', insKousei: '加入', insKenkou: '加入', insKoyou: '加入', insRousai: '加入', healthInterval: '1年'
      },
      fields: [
        { group: 'Ⅰ 雇用契約期間・更新（期間は「日程」の雇用開始日・終了日を使います）' },
        { key: 'renewal', label: '２．契約の更新の有無', type: 'select', options: ['自動的に更新する', '更新する場合があり得る', '契約の更新はしない'] },
        { key: 'crit', label: '更新の判断基準（「更新する場合があり得る」の場合）', type: 'checks', options: [
          ['crit1', '契約期間満了時の業務量'], ['crit2', '労働者の勤務成績，態度'], ['crit3', '労働者の業務を遂行する能力'],
          ['crit4', '会社の経営状況'], ['crit5', '従事している業務の進捗状況'], ['crit6', 'その他']] },
        { key: 'critOther', label: '判断基準「その他」の内容' },
        { key: 'renewLimit', label: '３．更新上限の有無', type: 'select', options: YN },
        { key: 'renewTimes', label: '更新上限（更新〇回まで）', type: 'number' },
        { key: 'renewYears', label: '更新上限（通算契約期間〇年まで）', type: 'number' },
        { key: 'muki', label: '通算契約期間が５年を超える有期雇用契約の締結か', type: 'select', options: YN, hint: '「有」のとき無期転換の欄を記入します' },
        { key: 'mukiDate', label: '無期雇用契約に転換できる日（本契約期間の末日の翌日）', type: 'date' },
        { key: 'mukiChange', label: '無期転換後の労働条件の変更', type: 'select', options: YN, hint: '「有」のとき別紙２（無期転換後の雇用条件）を作成します' },
        { group: 'Ⅱ 就業の場所（受入機関の「就業する事業所」を使います）' },
        { key: 'employType', label: '雇用形態', type: 'select', options: ['直接雇用', '派遣雇用'] },
        { key: 'placeChange', label: '就業の場所（変更の範囲）', type: 'select', options: CHANGE },
        { key: 'placeChangeName', label: '変更の範囲 事業所名' },
        { key: 'placeChangeAddr', label: '変更の範囲 所在地' },
        { key: 'placeChangeTel', label: '変更の範囲 連絡先' },
        { group: 'Ⅲ 従事すべき業務の内容（受入機関の分野・業務区分を使います）' },
        { key: 'jobChange', label: '業務の内容（変更の範囲）', type: 'select', options: CHANGE },
        { key: 'jobChangeField', label: '変更の範囲 分野' },
        { key: 'jobChangeCategory', label: '変更の範囲 業務区分' },
        { group: 'Ⅳ 労働時間等（始業・終業・休憩は「給与・労働条件」を使います）' },
        { key: 'variable', label: '変形労働時間制', type: 'select', options: ['なし', '1年単位', '1か月単位'] },
        { key: 'shifts', label: '交代制の勤務時間の組合せ（交代制の場合のみ）', type: 'list', max: 3, columns: [
          { key: 'start', label: '始業', type: 'time' }, { key: 'end', label: '終業', type: 'time' },
          { key: 'hours', label: '所定労働時間', type: 'time', placeholder: '08:00' }, { key: 'from', label: '適用日', type: 'date' }] },
        { key: 'daysWeek', label: '所定労働日数 週（日）', type: 'number', hint: '空欄のときは年間休日から自動計算' },
        { key: 'daysMonth', label: '所定労働日数 月（日）', type: 'number' },
        { key: 'daysYear', label: '所定労働日数 年（日）', type: 'number' },
        { key: 'overtime', label: '所定時間外労働の有無', type: 'select', options: ['有', '無'] },
        { key: 'rulesHours', label: '就業規則の該当条文（労働時間）', placeholder: '第10条～第15条' },
        { group: 'Ⅴ 休日' },
        { key: 'holidayWeekday', label: '定例日 毎週〇曜日', placeholder: '土・日' },
        { key: 'holidayRegularOther', label: '定例日 その他', placeholder: '年末年始（12月29日～1月3日）' },
        { key: 'holidayIrregularPer', label: '非定例日の単位', type: 'select', options: ['週当たり', '月当たり'] },
        { key: 'holidayIrregularDays', label: '非定例日（日）', type: 'number' },
        { key: 'holidayOther', label: '非定例日 その他' },
        { key: 'rulesHoliday', label: '就業規則の該当条文（休日）' },
        { group: 'Ⅵ 休暇' },
        { key: 'annualLeave', label: '6か月継続勤務した場合の年次有給休暇（日）', type: 'number' },
        { key: 'shortLeave', label: '継続勤務6か月未満の年次有給休暇', type: 'select', options: YN },
        { key: 'shortLeaveMonths', label: '6か月未満の有給休暇（〇か月経過で）', type: 'number' },
        { key: 'shortLeaveDays', label: '6か月未満の有給休暇（〇日）', type: 'number' },
        { key: 'leavePaid', label: 'その他の休暇（有給）', placeholder: '慶弔休暇' },
        { key: 'leaveUnpaid', label: 'その他の休暇（無給）' },
        { key: 'rulesLeave', label: '就業規則の該当条文（休暇）' },
        { group: 'Ⅶ 賃金（基本賃金・手当・控除は「給与・労働条件」を使います）' },
        { key: 'prem60in', label: '割増 法定超 月60時間以内（％）', type: 'number' },
        { key: 'prem60out', label: '割増 法定超 月60時間超（％）', type: 'number' },
        { key: 'premScheduled', label: '割増 所定超（％）', type: 'number' },
        { key: 'premLegalHoliday', label: '割増 法定休日（％）', type: 'number' },
        { key: 'premOtherHoliday', label: '割増 法定外休日（％）', type: 'number' },
        { key: 'premNight', label: '割増 深夜（％）', type: 'number' },
        { key: 'closingDay', label: '賃金締切日（毎月〇日）', required: true, placeholder: '末' },
        { key: 'payDay', label: '賃金支払日（毎月〇日）', required: true, placeholder: '25' },
        { key: 'payMethod', label: '賃金支払方法', type: 'select', options: ['口座振込', '通貨払'] },
        { key: 'laborDeduct', label: '労使協定に基づく賃金支払時の控除', type: 'select', options: YN },
        { key: 'raise', label: '昇給', type: 'select', options: YN },
        { key: 'raiseText', label: '昇給の時期・金額等' },
        { key: 'bonus', label: '賞与', type: 'select', options: YN },
        { key: 'bonusText', label: '賞与の時期・金額等' },
        { key: 'retireAllow', label: '退職金', type: 'select', options: YN },
        { key: 'retireAllowText', label: '退職金の時期・金額等' },
        { key: 'leaveAllowRate', label: '休業手当の率（％）', type: 'number' },
        { key: 'fixedOtName', label: '別紙１ 固定残業代の手当名', placeholder: '固定残業手当', hint: '固定残業代がある場合のみ' },
        { key: 'fixedOtAmount', label: '固定残業代の額（円）', type: 'number' },
        { key: 'fixedOtHours', label: '固定残業代に相当する時間外労働（時間）', type: 'number' },
        { group: 'Ⅷ 退職' },
        { key: 'selfResignDays', label: '自己都合退職の届出（退職する〇日前）', type: 'number' },
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
        { key: 'healthInterval', label: '定期健康診断の間隔', type: 'select', options: ['1年', '6か月'] },
        { key: 'deskDiffDept', label: '４．待遇の相違の説明窓口 部署名' },
        { key: 'deskDiffPerson', label: '４．担当者職氏名' },
        { key: 'deskDiffTel', label: '４．連絡先' },
        { key: 'deskMgmtDept', label: '５．雇用管理の改善等の相談窓口 部署名' },
        { key: 'deskMgmtPerson', label: '５．担当者職氏名' },
        { key: 'deskMgmtTel', label: '５．連絡先' },
        { key: 'rulesWhere', label: '就業規則を確認できる場所や方法', placeholder: '事務所の掲示板に掲示' }
      ]
    },
    {
      key: 'hiring', title: '雇用の経緯に係る説明書（1-16）',
      defaults: { domHas: '無', abrHas: '無', guidance: '有' },
      fields: [
        { group: '1 職業紹介事業者（国内）' },
        { key: 'domHas', label: 'あっせんの有無', type: 'select', options: YN },
        { key: 'domPermitNo', label: '許可・届出受理番号', placeholder: '00-ユ-000000' },
        { key: 'domPermitDate', label: '受理（受付）年月日', type: 'date' },
        { key: 'domKind', label: '事業者の区分', type: 'select', options: ['有料職業紹介事業者', '無料職業紹介事業者'] },
        { key: 'domName', label: '事業者の氏名・名称' },
        { key: 'domZip', label: '郵便番号' },
        { key: 'domAddr', label: '住所' },
        { key: 'domTel', label: '電話番号' },
        { key: 'domSeekerAmount', label: '求職者（申請人）が支払った額（円）', type: 'number', perWorker: true },
        { key: 'domSeekerPurpose', label: '求職者が支払った名目', perWorker: true },
        { key: 'domEmployerAmount', label: '求人者（所属機関）が支払った額（円）', type: 'number' },
        { key: 'domEmployerPurpose', label: '求人者が支払った名目' },
        { group: '2 取次機関（国外）' },
        { key: 'abrHas', label: '取次ぎの有無', type: 'select', options: YN },
        { key: 'abrName', label: '氏名又は名称' },
        { key: 'abrCountry', label: '所在国' },
        { key: 'abrAddr', label: '所在地' },
        { key: 'abrTel', label: '電話番号' },
        { key: 'abrSeekerAmount', label: '求職者が支払った額（円）', type: 'number', perWorker: true },
        { key: 'abrSeekerPurpose', label: '求職者が支払った名目', perWorker: true },
        { key: 'abrEmployerAmount', label: '求人者が支払った額（円）', type: 'number' },
        { key: 'abrEmployerPurpose', label: '求人者が支払った名目' },
        { group: '3 事前ガイダンス' },
        { key: 'guidance', label: '支援計画に定めるとおりに実施していることの有無', type: 'select', options: ['有', '無'] },
        { group: '4 求職者（申請人）が自国等の機関に支払った費用' },
        { key: 'payments', label: '4 自国等の機関に支払った費用', type: 'list', max: 5, perWorker: true, columns: [
          { key: 'payee', label: '支払先機関の名称' }, { key: 'purpose', label: '名目' },
          { key: 'date', label: '支払年月日', type: 'date' }, { key: 'foreign', label: '支払金額（現地通貨・米ドル）', placeholder: '500米ドル' },
          { key: 'yen', label: '日本円換算（円）' }] },
        { key: 'foreignTotal', label: '合計（現地通貨・米ドル）', placeholder: '1,500米ドル', perWorker: true }
      ]
    },
    {
      key: 'plan', title: '支援計画書（1-17）', planEditor: true,
      defaults: { others: '0', neutral: '有', proper: '有', houseStatus: '申請時点で確保している', hours4: '8' },
      fields: [
        { group: '支援対象者・体制' },
        { key: 'others', label: 'Ⅰ 支援対象者 ほか（名）', type: 'number', hint: '連名で作成するときは自動で人数を入れます' },
        { key: 'neutral', label: 'Ⅱ-4 支援の中立性を確保していることの有無（自社支援の場合）', type: 'select', options: ['有', '無'] },
        { key: 'proper', label: 'Ⅲ-7 支援の適正性を確保していることの有無（委託の場合）', type: 'select', options: ['有', '無'] },
        { group: '実施言語・時間' },
        { key: 'lang', label: '実施言語', placeholder: 'ミャンマー語' },
        { key: 'interp', label: '通訳者の所属・氏名（支援担当者以外が通訳する場合）' },
        { key: 'hours1', label: '1 事前ガイダンスの実施予定時間（合計・時間）', type: 'number', hint: '3時間以上' },
        { key: 'hours4', label: '4 生活オリエンテーションの実施予定時間（合計・時間）', type: 'number', hint: '8時間以上' },
        { group: '2 出入国する際の送迎' },
        { key: 'airportIn', label: '出迎え空港等', placeholder: '成田' },
        { key: 'transportIn', label: '送迎方法（入国時）', placeholder: '所属機関の社用車' },
        { key: 'airportOut', label: '出国予定空港等', placeholder: '成田' },
        { key: 'transportOut', label: '送迎方法（出国時）', placeholder: '所属機関の社用車' },
        { group: '3-ア-ｄ 住居の概要・居住費（居住費の額は「給与・労働条件」の控除を使います）' },
        { key: 'houseStatus', label: '住居の確保', type: 'select', options: ['申請時点で確保している', '申請の後に確保する'] },
        { key: 'houseRoom', label: '居室の広さ（㎡）', type: 'number' },
        { key: 'housePeople', label: '同居人数計（人）', type: 'number' },
        { key: 'houseBed', label: '寝室の広さ（㎡）', type: 'number' },
        { key: 'housingType', label: '居住費を徴収する住居の種類', type: 'select', options: ['借上物件', '自己所有物件'] },
        { key: 'housingReason', label: '居住費が実費に相当する額その他の適正な額であることの説明', type: 'textarea' },
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
    }
  ];

  /*
   * 作成できる書類（公式参考様式の Excel ひな形のシート）
   * sheets: 使うシート。my: ミャンマー語併記版のシート名（翻訳言語がミャンマー語のとき置き換える）
   * combinable: 同時申請で連名（氏名欄「別紙のとおり」＋名簿）にできる
   */
  SKS.DOCS = [
    { id: '1-4', no: '参考様式第1-4号', title: '特定技能外国人の報酬に関する説明書', group: '雇用', sheets: ['1-4'], combinable: true, combineDefault: false },
    { id: '1-5', no: '参考様式第1-5号', title: '特定技能雇用契約書', group: '雇用', sheets: ['1-5'], my: { '1-5': '1-5(MY)' } },
    { id: '1-6', no: '参考様式第1-6号', title: '雇用条件書（別紙１ 賃金の支払、別紙２ 無期転換後の雇用条件）', group: '雇用',
      sheets: ['1-6', '1-6別紙1', '1-6別紙2'], my: { '1-6': '1-6(MY)', '1-6別紙1': '1-6別紙1(MY)', '1-6別紙2': '1-6別紙2(MY)' },
      skip: function (ctx, sheet) { return /別紙2/.test(sheet) && !((ctx.docs.contract || {}).muki === '有' && (ctx.docs.contract || {}).mukiChange === '有'); } },
    { id: '1-16', no: '参考様式第1-16号', title: '雇用の経緯に係る説明書', group: '雇用', sheets: ['1-16'], my: { '1-16': '1-16(MY)' }, combinable: true, combineDefault: false },
    { id: '1-17', no: '参考様式第1-17号', title: '１号特定技能外国人支援計画書', group: '支援', sheets: ['1-17'], myExtra: ['1-17(MY)'], combinable: true, combineDefault: true, signDate: true },
    { id: '1-25', no: '参考様式第1-25号', title: '登録支援機関との支援委託契約に関する説明書', group: '支援', sheets: ['1-25'], needsSupport: true, combinable: true, combineDefault: true },
    { id: '5-10', no: '参考様式第5-10号', title: '支援委託契約書（別紙 支援委託費用内訳を含む）', group: '支援', sheets: ['5-10'], needsSupport: true, combinable: true, combineDefault: true }
  ];

  // 同時申請でこの書類を連名（1部＋名簿）にするか
  function isCombined(c, d) {
    if (!d.combinable || (c.workerIds || []).length < 2) return false;
    var v = (c.combine || {})[d.id];
    return v === undefined ? !!d.combineDefault : !!v;
  }

  SKS.Inputs = { isCombined: isCombined, context: context, entrustFees: entrustFees, addMonths: addMonths, addDays: addDays };
  SKS.entrustFees = entrustFees;
})();
