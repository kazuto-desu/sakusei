/*
 * マスタ・案件の入力項目の定義
 *   type: text(既定) / textarea / date / time / number / select / combo / list
 *   my: true … 翻訳（ミャンマー語）を付ける書類で使う外国語表記の欄
 */
(function () {
  'use strict';
  var F = {};

  // ---------------- 外国人（申請人） ----------------
  F.worker = [
    { group: '基本情報' },
    { key: 'name', label: '氏名（旅券どおりのローマ字）', required: true, placeholder: 'NGUYEN VAN A' },
    { key: 'gender', label: '性別', type: 'select', options: ['男', '女'], required: true },
    { key: 'birthDate', label: '生年月日', type: 'date', required: true },
    { key: 'nationality', label: '国籍・地域', type: 'combo', options: ['ミャンマー', 'ベトナム', 'インドネシア', 'フィリピン', 'ネパール', 'カンボジア', 'タイ', 'モンゴル', 'スリランカ', 'バングラデシュ'], required: true },
    { key: 'nationalityFor', label: '国籍（外国語表記）', placeholder: 'Myanmar', my: true },
    { key: 'birthPlace', label: '出生地' },
    { key: 'homeAddress', label: '本国における居住地', type: 'textarea' },
    { group: '日本での連絡先' },
    { key: 'addressJapan', label: '日本における住所（予定）', type: 'textarea' },
    { key: 'mobile', label: '携帯電話番号' },
    { group: '旅券' },
    { key: 'passportNo', label: '旅券番号', pattern: '^[A-Z0-9]{6,12}$', patternMsg: '英大文字と数字（6〜12文字）' },
    { key: 'passportExpiry', label: '旅券の有効期限', type: 'date' }
  ];

  // ---------------- 受入機関（特定技能所属機関） ----------------
  F.company = [
    { group: '基本情報' },
    { key: 'name', label: '名称', required: true },
    { key: 'nameFor', label: '名称（外国語）', my: true },
    { key: 'nameKana', label: '名称（ふりがな）' },
    { key: 'corpNo', label: '法人番号（13桁）', pattern: '^\\d{13}$', patternMsg: '数字13桁' },
    { key: 'repName', label: '代表者氏名', required: true },
    { key: 'repTitle', label: '代表者役職', required: true },
    { key: 'repTitleFor', label: '代表者役職（外国語）', my: true },
    { group: '所在地' },
    { key: 'zip', label: '郵便番号', pattern: '^\\d{3}-?\\d{4}$', patternMsg: '例: 100-0001' },
    { key: 'addr1', label: '住所1', required: true },
    { key: 'addr2', label: '住所2（建物名など）' },
    { key: 'addrFor', label: '住所（外国語）', my: true },
    { key: 'tel', label: '電話番号', required: true },
    { group: '受入分野' },
    { key: 'field', label: '特定産業分野', required: true, placeholder: '介護' },
    { key: 'fieldFor', label: '特定産業分野（外国語）', my: true },
    { key: 'category', label: '業務区分', required: true, placeholder: '介護' },
    { key: 'categoryFor', label: '業務区分（外国語）', my: true },
    { group: '書類作成責任者' },
    { key: 'docOwner', label: '作成責任者 役職・氏名', required: true, placeholder: '施設長　山田 太郎' },
    { group: '就業する事業所' },
    { key: 'siteName', label: '事業所名', required: true },
    { key: 'siteNameFor', label: '事業所名（外国語）', my: true },
    { key: 'siteAddr', label: '事業所の所在地', required: true },
    { key: 'siteAddrFor', label: '事業所の所在地（外国語）', my: true },
    { key: 'siteTel', label: '事業所の電話番号' },
    { group: '標準の労働条件（新しい案件の初期値になります）' },
    { key: 'holidays', label: '年間休日日数', type: 'number' },
    { key: 'startTime', label: '始業時刻', type: 'time' },
    { key: 'endTime', label: '終業時刻', type: 'time' },
    { key: 'breakMin', label: '休憩（分）', type: 'number' },
    { group: '自社で支援する場合の支援体制（支援計画書 Ⅱ-4）' },
    { key: 'spMgrName', label: '支援責任者 氏名' },
    { key: 'spMgrKana', label: '支援責任者 ふりがな' },
    { key: 'spMgrTitle', label: '支援責任者 役職' },
    { key: 'spStaffName', label: '支援担当者 氏名' },
    { key: 'spStaffTitle', label: '支援担当者 役職' },
    { key: 'spSupported', label: '支援している1号特定技能外国人数', type: 'number' },
    { key: 'spStaffCount', label: '支援担当者数', type: 'number' },
    { key: 'spOffice', label: '支援を行う事務所の所在地（本店と異なる場合）' },
    { key: 'spOfficeTel', label: '支援を行う事務所の電話番号' }
  ];

  // ---------------- 登録支援機関 ----------------
  F.support = [
    { group: '基本情報' },
    { key: 'name', label: '名称', required: true },
    { key: 'nameKana', label: '名称（ふりがな）' },
    { key: 'regNo', label: '登録番号', required: true, placeholder: '19登-000000' },
    { key: 'regDate', label: '登録年月日', type: 'date', required: true },
    { group: '代表者' },
    { key: 'repName', label: '代表者氏名', required: true },
    { key: 'repKana', label: '代表者氏名（ふりがな）' },
    { key: 'repTitle', label: '代表者役職', required: true },
    { group: '所在地' },
    { key: 'zip', label: '郵便番号', pattern: '^\\d{3}-?\\d{4}$', patternMsg: '例: 100-0001' },
    { key: 'addr1', label: '住所1', required: true },
    { key: 'addr2', label: '住所2（建物名など）' },
    { key: 'tel', label: '電話番号', required: true },
    { group: '支援を行う事務所' },
    { key: 'officeZip', label: '郵便番号', pattern: '^\\d{3}-?\\d{4}$', patternMsg: '例: 100-0001' },
    { key: 'officeAddr', label: '所在地' },
    { key: 'officeTel', label: '電話番号' },
    { group: '支援体制' },
    { key: 'mgrName', label: '支援責任者 氏名', required: true },
    { key: 'mgrKana', label: '支援責任者 ふりがな' },
    { key: 'mgrTitle', label: '支援責任者 役職' },
    { key: 'staffName', label: '支援担当者 氏名', required: true },
    { key: 'staffTitle', label: '支援担当者 役職' },
    { key: 'staffTel', label: '支援担当者 電話番号' },
    { key: 'staffMail', label: '支援担当者 メールアドレス' },
    { key: 'supportedCount', label: '支援している1号特定技能外国人数', type: 'number' },
    { key: 'staffCount', label: '支援担当者数', type: 'number' },
    { group: '支援委託契約（支援委託契約書）' },
    { key: 'court', label: '専属的合意管轄裁判所', placeholder: '〇〇地方裁判所' },
    { key: 'payTerms', label: '委託料の支払条件', type: 'textarea', placeholder: '翌月末日までに振込送金' },
    { key: 'feeItems', label: '支援委託費用内訳（1名当たり）', type: 'list', max: 10, columns: [
      { key: 'name', label: '名目' }, { key: 'amount', label: '金額（円／実費）' },
      { key: 'unit', label: '単位', placeholder: '円/回' }, { key: 'timing', label: '徴収時期', type: 'select', options: ['定期', '随時'] }] },
    { key: 'memoItems', label: '覚書の項目（任意）', type: 'list', max: 10, columns: [
      { key: 'name', label: '項目' }, { key: 'unit', label: '単位' }, { key: 'amount', label: '金額' }, { key: 'tax', label: '税', placeholder: '税別' }] }
  ];

  // ---------------- 案件：日程 ----------------
  F.schedule = [
    { group: '日程' },
    { key: 'entryDate', label: '入国予定日', type: 'date', required: true },
    { key: 'contractDate', label: '雇用契約締結日', type: 'date', required: true },
    { key: 'employStart', label: '雇用開始日（雇用契約の始期）', type: 'date', required: true },
    { key: 'employEnd', label: '雇用契約の終期', type: 'date', hint: '空欄のときは開始日から1年間' },
    { key: 'applyDate', label: '申請日', type: 'date' },
    { key: 'docDate', label: '書類作成日', type: 'date', required: true, hint: '各説明書・計画書の作成日' },
    { group: '支援委託' },
    { key: 'supportContractDate', label: '支援委託契約の締結日', type: 'date' },
    { key: 'supportFrom', label: '支援委託契約の期間（開始）', type: 'date', hint: '空欄のときは締結日' },
    { key: 'supportTo', label: '支援委託契約の期間（終了）', type: 'date', hint: '空欄のときは開始日から1年間' },
    { key: 'supportStart', label: '支援業務を開始する予定日', type: 'date' },
    { group: '翻訳' },
    { key: 'lang', label: '翻訳文を付ける言語', type: 'select', options: ['なし（日本語のみ）', 'ミャンマー語'], hint: '雇用契約書・雇用条件書・賃金の支払・雇用の経緯説明書・支援計画書に併記します' }
  ];

  F.labor = [
    { key: 'holidays', label: '年間休日日数', type: 'number', required: true },
    { key: 'startTime', label: '始業時刻', type: 'time', required: true },
    { key: 'endTime', label: '終業時刻', type: 'time', required: true },
    { key: 'breakMin', label: '休憩（分）', type: 'number', required: true }
  ];
  F.salary = [
    { key: 'payType', label: '賃金形態', type: 'select', options: ['月給', '日給', '時間給'], required: true },
    { key: 'basePay', label: '基本賃金（円）', type: 'number', required: true }
  ];
  F.allowanceKinds = [
    { value: 1, label: '1：住宅手当・通勤手当' },
    { value: 2, label: '2：固定支給' },
    { value: 3, label: '3：固定支給以外（残業・皆勤手当など）' }
  ];
  F.deductions = [
    { key: 'incomeTax', label: '所得税' },
    { key: 'socialIns', label: '社会保険料', hint: '健康保険・厚生年金などの本人負担額' },
    { key: 'empIns', label: '雇用保険料' },
    { key: 'food', label: '食費' },
    { key: 'housing', label: '居住費' },
    { key: 'utility', label: '水道光熱費' }
  ];

  window.SKS = window.SKS || {};
  window.SKS.FIELDS = F;
})();
