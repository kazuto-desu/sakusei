/*
 * 入力項目の定義と、Excelひな形のどのセルへ書き込むかの対応表
 *
 * 書き込み先は「データ（★）」シートが中心です。各様式は「データ（★）」を
 * 数式で参照しているため、ここに書くだけで全様式へ反映されます。
 * 数式で参照されていない（様式に直接手入力していた）欄は、個別にセルを指定しています。
 *
 * fmt:
 *   (省略)   文字列または数値をそのまま
 *   'date'   日付（Excelのシリアル値）
 *   'time'   時刻（Excelの時刻値）
 *   'number' 数値
 *   'text'   常に文字列（法人番号など先頭0を保持）
 *   'year' / 'month' / 'day'  日付の年・月・日を数値で
 *   'digit:N' 数字だけを取り出したN文字目（0始まり）
 */
(function () {
  'use strict';
  var D = 'データ（★）';
  var AP1 = '申請人用（認定）';
  var AP3 = '申請人用（認定）３V';
  var ORG2 = '所属機関用（認定）V2';
  var ORG4 = '所属機関用（認定）V4';
  var OUTLINE = '1-11所属機関概要（★）';
  var OFFICERS = '別紙役員一覧';

  function digits(sheet, cells) {
    return cells.map(function (cell, i) { return { sheet: sheet, cell: cell, fmt: 'digit:' + i }; });
  }

  var FIELDS = {};

  // ---------------- 外国人（申請人） ----------------
  FIELDS.worker = [
    { group: '基本情報' },
    { key: 'name', label: '氏名（旅券どおりのローマ字）', required: true, placeholder: 'NGUYEN VAN A', cells: [{ sheet: D, cell: 'B2' }] },
    { key: 'gender', label: '性別', type: 'select', options: ['男', '女'], required: true, cells: [{ sheet: D, cell: 'B6' }] },
    { key: 'birthDate', label: '生年月日', type: 'date', required: true, cells: [{ sheet: D, cell: 'B7', fmt: 'date' }] },
    { key: 'nationality', label: '国籍・地域', type: 'combo', options: ['ベトナム', 'ミャンマー', 'インドネシア', 'フィリピン', 'ネパール', 'カンボジア', 'タイ', 'モンゴル', 'スリランカ', 'バングラデシュ'], required: true, cells: [{ sheet: D, cell: 'B9' }] },
    { key: 'birthPlace', label: '出生地', required: true, cells: [{ sheet: AP1, cell: 'P23' }] },
    { key: 'occupation', label: '職業（現在）', cells: [{ sheet: AP1, cell: 'E26' }] },
    { key: 'homeAddress', label: '本国における居住地', type: 'textarea', required: true, cells: [{ sheet: AP1, cell: 'X26' }] },
    { group: '日本での連絡先' },
    { key: 'addressJapan', label: '日本における連絡先（住所）', type: 'textarea', hint: '入国前で未定の場合は寮・社宅の住所など', cells: [{ sheet: AP1, cell: 'I29' }] },
    { key: 'mobile', label: '携帯電話番号', cells: [{ sheet: AP1, cell: 'AC32' }] },
    { group: '旅券' },
    { key: 'passportNo', label: '旅券番号', required: true, pattern: '^[A-Z0-9]{6,12}$', patternMsg: '英大文字と数字（6〜12文字）', cells: [{ sheet: AP1, cell: 'I35' }] },
    { key: 'passportExpiry', label: '旅券の有効期限', type: 'date', required: true, cells: [
      { sheet: AP1, cell: 'AC35', fmt: 'year' }, { sheet: AP1, cell: 'AI35', fmt: 'month' }, { sheet: AP1, cell: 'AM35', fmt: 'day' }] },
    { key: 'visaPlace', label: '査証申請予定地', placeholder: 'YANGON', cells: [{ sheet: AP1, cell: 'J61' }] }
  ];

  // ---------------- 受入機関（特定技能所属機関） ----------------
  FIELDS.company = [
    { group: '基本情報' },
    { key: 'name', label: '名称', required: true, cells: [{ sheet: D, cell: 'E2' }] },
    { key: 'nameFor', label: '名称（外国語）', cells: [{ sheet: D, cell: 'E3' }] },
    { key: 'nameKana', label: '名称（よみ）', cells: [{ sheet: D, cell: 'E4' }] },
    { key: 'corpNo', label: '法人番号（13桁）', required: true, pattern: '^\\d{13}$', patternMsg: '数字13桁', cells: [{ sheet: D, cell: 'E13', fmt: 'text' }] },
    { key: 'repName', label: '代表者氏名', required: true, cells: [{ sheet: D, cell: 'E5' }] },
    { key: 'repKana', label: '代表者氏名（ふりがな）', cells: [{ sheet: OFFICERS, cell: 'C3' }] },
    { key: 'repTitle', label: '代表者役職', required: true, cells: [{ sheet: D, cell: 'E6' }] },
    { key: 'repTitleFor', label: '代表者役職（外国語）', cells: [{ sheet: D, cell: 'E7' }] },
    { group: '所在地' },
    { key: 'zip', label: '郵便番号（〒なし）', pattern: '^\\d{3}-?\\d{4}$', patternMsg: '例: 100-0001', cells: [{ sheet: D, cell: 'E8', fmt: 'text' }] },
    { key: 'addr1', label: '住所1', required: true, cells: [{ sheet: D, cell: 'E9' }] },
    { key: 'addr1For', label: '住所1（外国語）', cells: [{ sheet: D, cell: 'E10' }] },
    { key: 'addr2', label: '住所2', cells: [{ sheet: D, cell: 'E11' }] },
    { key: 'tel', label: '電話番号', required: true, cells: [{ sheet: D, cell: 'E12', fmt: 'text' }] },
    { group: '受入分野' },
    { key: 'field', label: '受入分野', required: true, placeholder: '介護', cells: [{ sheet: D, cell: 'E14' }] },
    { key: 'fieldFor', label: '受入分野（外国語）', cells: [{ sheet: D, cell: 'E15' }] },
    { key: 'category', label: '業務区分', cells: [{ sheet: D, cell: 'E16' }] },
    { key: 'categoryFor', label: '業務区分（外国語）', cells: [{ sheet: D, cell: 'E17' }] },
    { key: 'industryNo', label: '業種番号（別紙「業種一覧」）', type: 'number', cells: [{ sheet: ORG2, cell: 'AK23', fmt: 'number' }] },
    { key: 'jobNo', label: '主たる職種番号（別紙「職種一覧」）', type: 'number', cells: [{ sheet: '所属機関用（認定）V1', cell: 'AE20', fmt: 'number' }] },
    { group: '書類作成責任者' },
    { key: 'docOwner', label: '書類作成責任者 役職/氏名', cells: [{ sheet: D, cell: 'E18' }] },
    { key: 'docOwnerFor', label: '書類作成責任者（外国語）', cells: [{ sheet: D, cell: 'E19' }] },
    { group: '就業する事業所' },
    { key: 'siteName', label: '事業所名', required: true, cells: [{ sheet: D, cell: 'E20' }] },
    { key: 'siteNameFor', label: '事業所名（外国語）', cells: [{ sheet: D, cell: 'E21' }] },
    { key: 'siteZip', label: '事業所 郵便番号（〒なし）', pattern: '^\\d{3}-?\\d{4}$', patternMsg: '例: 100-0001', cells: [{ sheet: D, cell: 'E22', fmt: 'text' }] },
    { key: 'siteAddr1', label: '事業所 住所1', required: true, cells: [{ sheet: D, cell: 'E23' }] },
    { key: 'siteAddr1For', label: '事業所 住所1（外国語）', cells: [{ sheet: D, cell: 'E24' }] },
    { key: 'siteAddr2', label: '事業所 住所2', cells: [{ sheet: D, cell: 'E25' }] },
    { key: 'siteTel', label: '事業所 電話番号', cells: [{ sheet: D, cell: 'E26', fmt: 'text' }] },
    { group: '標準の労働条件（新しい案件の初期値になります）' },
    { key: 'holidays', label: '年間休日日数', type: 'number', defaultFor: 'case' },
    { key: 'startTime', label: '始業時刻', type: 'time', defaultFor: 'case' },
    { key: 'endTime', label: '終業時刻', type: 'time', defaultFor: 'case' },
    { key: 'breakMin', label: '休憩（分）', type: 'number', defaultFor: 'case' },
    { group: '保険・規模' },
    { key: 'empInsNo', label: '雇用保険適用事業所番号（11桁）', pattern: '^\\d{4}-?\\d{6}-?\\d$', patternMsg: '例: 1234-567890-1',
      cells: digits(ORG2, ['T20', 'U20', 'V20', 'W20', 'Y20', 'Z20', 'AA20', 'AB20', 'AC20', 'AD20', 'AF20']) },
    { key: 'laborInsNo', label: '労働保険番号（14桁）', pattern: '^[\\d-]{14,18}$', patternMsg: '例: 12-3-45-678901-234',
      cells: digits(ORG2, ['J49', 'K49', 'M49', 'O49', 'P49', 'R49', 'S49', 'T49', 'U49', 'V49', 'W49', 'Y49', 'Z49', 'AA49']) },
    { key: 'capital', label: '資本金（円）', type: 'number', cells: [{ sheet: ORG2, cell: 'F33', fmt: 'number' }] },
    { key: 'employees', label: '常勤職員数（名）', type: 'number', cells: [{ sheet: ORG2, cell: 'K36', fmt: 'number' }] },
    { group: '決算状況（所属機関概要書）' },
    { key: 'sales0', label: '売上高 前年度', type: 'number', cells: [{ sheet: OUTLINE, cell: 'E22', fmt: 'number' }, { sheet: ORG2, cell: 'Z33', fmt: 'number' }] },
    { key: 'sales1', label: '売上高 前々年度', type: 'number', cells: [{ sheet: OUTLINE, cell: 'I22', fmt: 'number' }] },
    { key: 'sales2', label: '売上高 前々々年度', type: 'number', cells: [{ sheet: OUTLINE, cell: 'M22', fmt: 'number' }] },
    { key: 'ord0', label: '経常損益 前年度', type: 'number', cells: [{ sheet: OUTLINE, cell: 'E23', fmt: 'number' }] },
    { key: 'ord1', label: '経常損益 前々年度', type: 'number', cells: [{ sheet: OUTLINE, cell: 'I23', fmt: 'number' }] },
    { key: 'ord2', label: '経常損益 前々々年度', type: 'number', cells: [{ sheet: OUTLINE, cell: 'M23', fmt: 'number' }] },
    { key: 'net0', label: '純損益 前年度', type: 'number', cells: [{ sheet: OUTLINE, cell: 'E24', fmt: 'number' }] },
    { key: 'net1', label: '純損益 前々年度', type: 'number', cells: [{ sheet: OUTLINE, cell: 'I24', fmt: 'number' }] },
    { key: 'net2', label: '純損益 前々々年度', type: 'number', cells: [{ sheet: OUTLINE, cell: 'M24', fmt: 'number' }] },
    { key: 'assets0', label: '純資産 前年度', type: 'number', cells: [{ sheet: OUTLINE, cell: 'E25', fmt: 'number' }] },
    { key: 'assets1', label: '純資産 前々年度', type: 'number', cells: [{ sheet: OUTLINE, cell: 'I25', fmt: 'number' }] },
    { key: 'assets2', label: '純資産 前々々年度', type: 'number', cells: [{ sheet: OUTLINE, cell: 'M25', fmt: 'number' }] },
    { group: '役員（別紙役員一覧 ②〜⑧。①は代表者が自動で入ります）' },
    { key: 'officers', label: '役員', type: 'list', max: 7, columns: [
      { key: 'kana', label: 'ふりがな' }, { key: 'name', label: '氏名' }, { key: 'title', label: '役職' }],
      // ②〜⑧ は 5,7,9,...,17 行目（ふりがな C奇数行／氏名 C偶数行／役職 E奇数行）
      rowCells: function (i) {
        var r = 5 + i * 2;
        return { kana: { sheet: OFFICERS, cell: 'C' + r }, name: { sheet: OFFICERS, cell: 'C' + (r + 1) }, title: { sheet: OFFICERS, cell: 'E' + r } };
      } },
    { group: '申請代理人（申請人等作成用３ 34欄）' },
    { key: 'proxyName', label: '代理人 氏名', cells: [{ sheet: AP3, cell: 'E46' }] },
    { key: 'proxyRelation', label: '本人との関係', placeholder: '特定技能所属機関の職員', cells: [{ sheet: AP3, cell: 'Z46' }] },
    { key: 'proxyAddress', label: '代理人 住所', cells: [{ sheet: AP3, cell: 'E49' }] },
    { key: 'proxyTel', label: '代理人 電話番号', cells: [{ sheet: AP3, cell: 'G52', fmt: 'text' }] }
  ];

  // ---------------- 登録支援機関 ----------------
  FIELDS.support = [
    { group: '基本情報' },
    { key: 'name', label: '名称', required: true, cells: [{ sheet: D, cell: 'H2' }] },
    { key: 'nameFor', label: '名称（外国語）', cells: [{ sheet: D, cell: 'H3' }] },
    { key: 'nameKana', label: '名称（よみ）', cells: [{ sheet: D, cell: 'H4' }] },
    { key: 'corpNo', label: '法人番号（13桁）', pattern: '^\\d{13}$', patternMsg: '数字13桁', cells: [{ sheet: D, cell: 'H27', fmt: 'text' }] },
    { key: 'regNo', label: '登録番号', required: true, placeholder: '19登-000000', cells: [{ sheet: D, cell: 'H14' }] },
    { key: 'regDate', label: '登録年月日', type: 'date', required: true, cells: [{ sheet: D, cell: 'H15', fmt: 'date' }] },
    { key: 'empInsNo', label: '雇用保険適用事業所番号（11桁）', pattern: '^\\d{4}-?\\d{6}-?\\d$', patternMsg: '例: 1234-567890-1',
      cells: digits(ORG4, ['T90', 'U90', 'V90', 'W90', 'Y90', 'Z90', 'AA90', 'AB90', 'AC90', 'AD90', 'AF90']) },
    { group: '代表者' },
    { key: 'repName', label: '代表者氏名', required: true, cells: [{ sheet: D, cell: 'H5' }] },
    { key: 'repNameFor', label: '代表者氏名（外国語）', cells: [{ sheet: D, cell: 'H6' }] },
    { key: 'repNameKana', label: '代表者氏名（かな）', cells: [{ sheet: D, cell: 'H7' }] },
    { key: 'repTitle', label: '代表者役職', cells: [{ sheet: D, cell: 'H8' }] },
    { group: '所在地' },
    { key: 'zip', label: '郵便番号（〒なし）', pattern: '^\\d{3}-?\\d{4}$', patternMsg: '例: 100-0001', cells: [{ sheet: D, cell: 'H9', fmt: 'text' }] },
    { key: 'addr1', label: '住所1行目', required: true, cells: [{ sheet: D, cell: 'H10' }] },
    { key: 'addr1For', label: '住所（外国語）', cells: [{ sheet: D, cell: 'H11' }] },
    { key: 'addr2', label: '住所2行目', cells: [{ sheet: D, cell: 'H12' }] },
    { key: 'tel', label: '電話番号', required: true, cells: [{ sheet: D, cell: 'H13', fmt: 'text' }] },
    { group: '支援を行う事務所' },
    { key: 'officeZip', label: '支援事務所 郵便番号（〒なし）', pattern: '^\\d{3}-?\\d{4}$', patternMsg: '例: 100-0001', cells: [{ sheet: D, cell: 'H16', fmt: 'text' }] },
    { key: 'officeAddr1', label: '支援事務所 住所1行目', cells: [{ sheet: D, cell: 'H17' }] },
    { key: 'officeAddr2', label: '支援事務所 住所2行目', cells: [{ sheet: D, cell: 'H18' }] },
    { key: 'officeTel', label: '支援事務所 電話番号', cells: [{ sheet: D, cell: 'H19', fmt: 'text' }] },
    { group: '支援体制' },
    { key: 'managerName', label: '支援責任者', required: true, cells: [{ sheet: D, cell: 'H20' }] },
    { key: 'managerNameFor', label: '支援責任者（外国語）', cells: [{ sheet: D, cell: 'H21' }] },
    { key: 'managerKana', label: '支援責任者（かな）', cells: [{ sheet: D, cell: 'H22' }] },
    { key: 'managerTitle', label: '支援責任者 役職', cells: [{ sheet: D, cell: 'H23' }] },
    { key: 'managerTitleFor', label: '支援責任者 役職（外国語）', cells: [{ sheet: D, cell: 'H24' }] },
    { key: 'staffName', label: '支援担当者', required: true, cells: [{ sheet: D, cell: 'H25' }, { sheet: ORG4, cell: 'Z105' }] },
    { key: 'staffTitle', label: '支援担当者 役職', cells: [{ sheet: D, cell: 'H26' }] },
    { key: 'supportedCount', label: '支援している人数（1号）', type: 'number', cells: [{ sheet: D, cell: 'H30', fmt: 'number' }] },
    { key: 'staffCount', label: '支援担当者数', type: 'number', cells: [{ sheet: D, cell: 'H31', fmt: 'number' }] },
    { key: 'languages', label: '対応可能言語', placeholder: 'ベトナム語、ミャンマー語', cells: [{ sheet: ORG4, cell: 'H108' }] },
    { key: 'monthlyFee', label: '支援委託手数料（月額／人・円）', type: 'number', cells: [{ sheet: ORG4, cell: 'AD108', fmt: 'number' }] },
    { key: 'court', label: '合意管轄裁判所', placeholder: '〇〇地方裁判所', cells: [{ sheet: D, cell: 'H32' }] }
  ];

  // ---------------- 取次者（自社。設定画面で登録） ----------------
  FIELDS.agent = [
    { key: 'name', label: '取次者 氏名', cells: [{ sheet: AP3, cell: 'E69' }] },
    { key: 'address', label: '取次者 住所', cells: [{ sheet: AP3, cell: 'R69' }] },
    { key: 'org', label: '所属機関等', cells: [{ sheet: AP3, cell: 'C73' }] },
    { key: 'tel', label: '電話番号', cells: [{ sheet: AP3, cell: 'W73', fmt: 'text' }] }
  ];

  // ---------------- 案件ごとの情報 ----------------
  FIELDS.schedule = [
    { group: '日程' },
    { key: 'entryDate', label: '入国予定日', type: 'date', required: true, cells: [
      { sheet: D, cell: 'B3', fmt: 'date' },
      { sheet: AP1, cell: 'H55', fmt: 'year' }, { sheet: AP1, cell: 'N55', fmt: 'month' }, { sheet: AP1, cell: 'R55', fmt: 'day' }] },
    { key: 'contractDate', label: '雇用契約締結日', type: 'date', required: true, cells: [{ sheet: D, cell: 'B4', fmt: 'date' }] },
    { key: 'employStart', label: '雇用開始日', type: 'date', required: true, cells: [{ sheet: D, cell: 'B5', fmt: 'date' }] },
    { key: 'supportContractDate', label: '支援委託契約締結日', type: 'date', cells: [{ sheet: D, cell: 'B11', fmt: 'date' }] },
    { key: 'applyDate', label: '申請日', type: 'date', required: true, cells: [{ sheet: D, cell: 'B8', fmt: 'date' }] },
    { key: 'docDate', label: '書類作成日（説明書・誓約書などの日付）', type: 'date', cells: [{ sheet: D, cell: 'B27', fmt: 'date' }] },
    { group: '入国・在留' },
    { key: 'port', label: '上陸予定港', placeholder: '福岡空港', required: true, cells: [{ sheet: AP1, cell: 'AC55' }] },
    { key: 'stayPeriod', label: '滞在予定期間', placeholder: '1年', required: true, cells: [{ sheet: AP1, cell: 'H58' }] },
    { group: '外国の機関への費用（申請人等作成用３ 28欄）' },
    { key: 'agencyName', label: '外国の機関名', cells: [{ sheet: AP3, cell: 'H13' }] },
    { key: 'agencyFee', label: '支払額（日本円換算・円）', type: 'number', cells: [{ sheet: AP3, cell: 'AA13', fmt: 'number' }] },
    { group: '報酬の比較' },
    { key: 'jpSalary', label: '同等業務に従事する日本人の月額報酬（円）', type: 'number', cells: [{ sheet: '所属機関用（認定）V1', cell: 'R33', fmt: 'number' }] }
  ];

  FIELDS.labor = [
    { key: 'holidays', label: '年間休日日数', type: 'number', required: true, cells: [{ sheet: D, cell: 'E27', fmt: 'number' }] },
    { key: 'startTime', label: '始業時刻', type: 'time', required: true, cells: [{ sheet: D, cell: 'E28', fmt: 'time' }] },
    { key: 'endTime', label: '終業時刻', type: 'time', required: true, cells: [{ sheet: D, cell: 'E29', fmt: 'time' }] },
    { key: 'breakMin', label: '休憩（分）', type: 'number', required: true, cells: [{ sheet: D, cell: 'E30', fmt: 'number' }] }
  ];

  var ALLOW_CELLS = [['K4', 'K5', 'N4'], ['K6', 'K7', 'N5'], ['K8', 'K9', 'N6'], ['K10', 'K11', 'N7'], ['K12', 'K13', 'N8']];
  FIELDS.salary = [
    { key: 'payType', label: '賃金形態', type: 'select', options: ['月給', '日給', '時間給'], required: true, cells: [{ sheet: D, cell: 'K2' }] },
    { key: 'basePay', label: '基本賃金（円）', type: 'number', required: true, cells: [{ sheet: D, cell: 'K3', fmt: 'number' }] }
  ];
  FIELDS.allowanceCells = ALLOW_CELLS.map(function (a) {
    return { name: { sheet: D, cell: a[0] }, amount: { sheet: D, cell: a[1], fmt: 'number' }, kind: { sheet: D, cell: a[2], fmt: 'number' } };
  });
  FIELDS.allowanceKinds = [
    { value: 1, label: '1：住宅手当・通勤手当' },
    { value: 2, label: '2：固定支給' },
    { value: 3, label: '3：固定支給以外（残業・皆勤手当など）' }
  ];
  FIELDS.deductions = [
    { key: 'incomeTax', label: '所得税', cells: [{ sheet: D, cell: 'K14', fmt: 'number' }] },
    { key: 'socialIns', label: '社会保険料', hint: '健康保険・厚生年金などの本人負担額', cells: [{ sheet: D, cell: 'K15', fmt: 'number' }] },
    { key: 'empIns', label: '雇用保険料', cells: [{ sheet: D, cell: 'K16', fmt: 'number' }] },
    { key: 'food', label: '食費', cells: [{ sheet: D, cell: 'K17', fmt: 'number' }] },
    { key: 'housing', label: '居住費', cells: [{ sheet: D, cell: 'K18', fmt: 'number' }] },
    { key: 'utility', label: '水道光熱費', cells: [{ sheet: D, cell: 'K19', fmt: 'number' }] }
  ];
  FIELDS.otherDeductionCells = [['K20', 'K21'], ['K22', 'K23'], ['K24', 'K25']].map(function (a) {
    return { name: { sheet: D, cell: a[0] }, amount: { sheet: D, cell: a[1], fmt: 'number' } };
  });

  // 「データ（★）」の入力欄のうち、ラベルが無く使われていない欄
  FIELDS.unusedDataCells = [];

  window.SKS = window.SKS || {};
  window.SKS.FIELDS = FIELDS;
  window.SKS.SHEETS = { DATA: D, AP1: AP1, AP3: AP3, OFFICERS: OFFICERS };
})();
