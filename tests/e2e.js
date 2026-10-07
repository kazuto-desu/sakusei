/*
 * ブラウザ操作による結合テスト（すべて架空のダミーデータ）
 *   cd tests && npm install && npm test
 * 入力 → 書類の表示 → PDF 出力までを確認し、外部通信やエラーが発生したら失敗にする。
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const OUT = path.resolve(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });
const EXE = process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const base = 'file://' + path.resolve(__dirname, '../app/index.html');

function assert(cond, msg) { if (!cond) { console.error('NG: ' + msg); process.exitCode = 1; } else console.log('OK: ' + msg); }

(async () => {
  const browser = await chromium.launch(Object.assign({ args: ['--disable-background-networking', '--disable-component-update', '--no-first-run'] }, EXE ? { executablePath: EXE } : {}));
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
  await ctx.addInitScript(() => { window.showSaveFilePicker = undefined; });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERR ' + e.message));
  page.on('request', r => { if (!/^(file|blob|data):/.test(r.url())) errors.push('NETWORK ' + r.url()); });

  async function fill(label, value) {
    const esc = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const el = page.getByLabel(new RegExp('^' + esc + '(必須)?$')).first();
    const tag = await el.evaluate(e => e.tagName);
    if (tag === 'SELECT') await el.selectOption(value); else { await el.fill(value); await el.press('Tab'); }
  }
  async function fillAll(obj) { for (const [k, v] of Object.entries(obj)) await fill(k, v); }

  await page.goto(base);
  await page.fill('#pass', 'testpass123'); await page.fill('#pass2', 'testpass123');
  await page.click('button[type=submit]');
  await page.waitForSelector('.topbar');

  // 外国人
  await page.goto(base + '#/workers'); await page.click('text=＋ 新規登録');
  await fillAll({ '氏名（旅券どおりのローマ字）': 'TEST TARO', '性別': '男', '生年月日': '2000-05-10', '国籍・地域': 'ミャンマー',
    '国籍（外国語表記）': 'Myanmar', '旅券番号': 'TZ0000001', '旅券の有効期限': '2030-01-31' });
  await page.goto(base + '#/workers'); await page.click('text=＋ 新規登録');
  await fillAll({ '氏名（旅券どおりのローマ字）': 'SAMPLE HANAKO', '性別': '女', '生年月日': '2001/3/3', '国籍・地域': 'ミャンマー' });
  // 受入機関
  await page.goto(base + '#/companies'); await page.click('text=＋ 新規登録');
  await fillAll({ '名称': 'テスト株式会社', '名称（外国語）': 'TEST CO., LTD.', '名称（ふりがな）': 'てすとかぶしきがいしゃ', '法人番号（13桁）': '1234567890123',
    '代表者氏名': '試験 一郎', '代表者役職': '代表取締役', '郵便番号': '100-0001', '住所1': 'テスト県テスト市2-2', '住所（外国語）': '2-2 Test City',
    '電話番号': '03-0000-0000', '特定産業分野': '介護', '業務区分': '介護', '作成責任者 役職・氏名': '施設長　試験 花子',
    '事業所名': 'テスト事業所', '事業所の所在地': 'テスト県テスト市3-3', '年間休日日数': '110', '始業時刻': '08:30', '終業時刻': '17:30', '休憩（分）': '60' });
  // 登録支援機関（費用内訳あり）
  await page.goto(base + '#/supports'); await page.click('text=＋ 新規登録');
  await fillAll({ '名称': 'テスト支援協同組合', '登録番号': '19登-999999', '登録年月日': '2019-07-01', '代表者氏名': '支援 花子', '代表者役職': '代表理事',
    '住所1': 'テスト県テスト市4-4', '電話番号': '03-1111-1111', '支援責任者 氏名': '責任 三郎', '支援担当者 氏名': '担当 四郎',
    '支援担当者 電話番号': '090-0000-1111', '専属的合意管轄裁判所': 'テスト地方裁判所' });
  const feeAdd = page.locator('.list-editor').filter({ hasText: '支援委託費用内訳' }).getByText('＋ 行を追加');
  await feeAdd.click(); await feeAdd.click();
  await page.getByLabel('名目 1').fill('月額支援費'); await page.getByLabel('金額（円／実費） 1').fill('20000'); await page.getByLabel('徴収時期 1').selectOption('定期');
  await page.getByLabel('名目 2').fill('事前ガイダンス費用'); await page.getByLabel('金額（円／実費） 2').fill('10000'); await page.getByLabel('徴収時期 2').selectOption('随時');

  // 案件
  await page.goto(base + '#/cases'); await page.click('text=＋ 新しい案件');
  const sels = page.locator('.modal select');
  await sels.nth(0).selectOption({ label: 'TEST TARO' });
  await sels.nth(1).selectOption({ label: 'テスト株式会社' });
  await sels.nth(2).selectOption({ label: 'テスト支援協同組合' });
  await page.click('.modal >> text=作成する');
  await page.waitForSelector('.tabs');
  await page.getByLabel('申請人を追加').selectOption({ label: 'SAMPLE HANAKO' });
  assert((await page.textContent('.combine-box')).includes('同時申請（2名）'), '2人目を追加すると連名の選択肢が表示される');
  await page.click('text=2. 日程・翻訳');
  await fillAll({ '入国予定日': 'R8.12.1', '雇用契約締結日': '2026/9/1', '雇用開始日（雇用契約の始期）': '20261201', '申請日': '2026年10月10日',
    '書類作成日': '２０２６／１０／１', '支援委託契約の締結日': '2026-09-01', '支援業務を開始する予定日': '2026/12/1' });
  assert(await page.getByLabel(/^入国予定日/).inputValue() === '2026/12/01', '和暦（R8.12.1）の入力が 2026/12/01 に整えられる');
  assert(await page.getByLabel(/^書類作成日/).inputValue() === '2026/10/01', '全角の日付が整えられる');
  await page.getByLabel(/^申請日/).fill('2026/2/30'); await page.getByLabel(/^申請日/).press('Tab');
  assert(await page.getByLabel(/^申請日/).evaluate(e => e.classList.contains('invalid')), '存在しない日付はエラーになる');
  await fill('申請日', '2026/10/10');
  assert(await page.getByLabel(/^翻訳文を付ける言語/).inputValue() === 'ミャンマー語', '国籍がミャンマーなら翻訳言語が自動でミャンマー語になる');
  await page.click('text=3. 給与・労働条件');
  await fill('基本賃金（円）', '180000');
  await page.getByLabel('手当1 手当の内容').fill('住宅手当'); await page.getByLabel('手当1 月額（円）').fill('10000'); await page.getByLabel('手当1 区分').selectOption('1');
  await page.getByLabel('手当2 手当の内容').fill('資格手当'); await page.getByLabel('手当2 月額（円）').fill('5000'); await page.getByLabel('手当2 区分').selectOption('2');
  await fill('所得税', '3000'); await fill('社会保険料', '22000'); await fill('居住費', '20000');
  await page.click('text=4. 書類ごとの入力');
  await fillAll({ '②申請人の役職，職務内容，責任の程度': '介護業務全般に従事する。', '比較対象': '比較対象となる日本人労働者がいる',
    '①（最も近い職務を担う）日本人労働者の役職，職務内容，責任の程度': '同じ業務に従事する。', '③報酬 月給（円）': '180000', '⑤日本人と同等以上であると考える理由': '同じ職務内容のため。' });
  await page.click('.side-nav >> text=雇用契約書・雇用条件書（1-5・1-6）');
  await fillAll({ '賃金締切日（毎月〇日）': '末', '賃金支払日（毎月〇日）': '25', '定例日': '土曜日・日曜日', '定例日（ミャンマー語）': 'စနေ၊ တနင်္ဂနွေ' });
  await page.click('.side-nav >> text=支援計画書（1-17）');
  await fillAll({ '出迎え空港等': '成田', '送迎方法（入国時）': '社用車', '居室の広さ（㎡）': '18', '同居人数計（人）': '1', '寝室の広さ（㎡）': '12' });
  await page.getByLabel('1a 時期').fill('2026年10月5日');
  await page.screenshot({ path: OUT + '/01-plan-input.png', fullPage: false });

  // 書類の作成
  await page.click('text=5. 書類の作成・印刷');
  await page.screenshot({ path: OUT + '/02-print-select.png', fullPage: true });
  await page.click('text=選択した書類を表示して印刷・PDF保存');
  await page.waitForSelector('.docs .doc');
  const docCount = await page.locator('.docs .doc').count();
  assert(docCount >= 9, '書類が表示される（' + docCount + ' ページ区切り）');
  const text = await page.textContent('.docs');
  assert(text.includes('特定技能雇用契約書') && text.includes('雇用条件書') && text.includes('支援計画書') && text.includes('支援委託契約書'), '8種類の書類の見出しがある');
  assert(text.includes('TEST TARO') && text.includes('テスト株式会社') && text.includes('テスト支援協同組合'), 'マスタの情報が反映される');
  assert(text.includes('SAMPLE HANAKO'), '2人目の個人ごとの書類が作成される');
  assert((text.match(/特定技能雇用契約書/g) || []).length >= 2, '雇用契約書は1人1部作成される');
  assert(text.includes('別紙の名簿のとおり') && text.includes('支援対象者（名簿）'), '支援計画書は連名（別紙の名簿のとおり＋名簿）になる');
  assert(text.includes('甲が雇用する１号特定技能外国人　別紙のとおり'), '支援委託契約書の丙が「別紙のとおり」になる');
  assert(text.includes('2026年12月1日　～　2027年11月30日'), '雇用契約期間が1年間で自動計算される');
  assert(text.includes('185,000'), '月給（固定支給込み）185,000円が報酬説明書に入る');
  assert(text.includes('月額　20,000円（税別）'), '支援委託料（定期分）が委託契約書に入る');
  assert(text.includes('テスト地方裁判所を第一審'), '合意管轄裁判所が入る（「地方裁判所」が重複しない）');
  assert(/[က-႟]/.test(text), 'ミャンマー語訳が併記される');
  assert(!/[ၠ-႗]/.test(text), 'Zawgyi の文字が残っていない');
  assert(text.includes('စနေ၊ တနင်္ဂနွေ'), '入力したミャンマー語が書類に入る');
  await page.screenshot({ path: OUT + '/03-docs.png', fullPage: false });
  await page.pdf({ path: OUT + '/docs.pdf', format: 'A4', printBackground: true });
  assert(fs.statSync(OUT + '/docs.pdf').size > 50000, 'PDF が作成される');

  // ロック → 再表示でデータが残っている
  await page.goto(base + '#/cases');
  await page.click('text=ロック');
  await page.waitForSelector('#pass');
  await page.fill('#pass', 'wrongpass'); await page.click('button[type=submit]');
  await page.waitForTimeout(1500);
  assert((await page.textContent('.error-text')).includes('パスワードが違います'), '間違ったパスワードでは開けない');
  await page.fill('#pass', 'testpass123'); await page.click('button[type=submit]');
  await page.waitForSelector('.topbar');
  assert((await page.textContent('.table tbody')).includes('TEST TARO'), 'ロック解除後も案件が残っている');

  // 保存データが暗号化されていること
  const raw = await page.evaluate(() => new Promise(res => {
    const req = indexedDB.open('sakusei-vault', 1);
    req.onsuccess = () => {
      const r2 = req.result.transaction('kv').objectStore('kv').get('json:state');
      r2.onsuccess = () => res(new TextDecoder().decode(r2.result.ct));
    };
  }));
  assert(!raw.includes('TEST TARO') && !raw.includes('テスト'), 'ブラウザ内の保存データは暗号化されている');

  assert(errors.length === 0, 'ブラウザのエラー・外部通信が発生しない' + (errors.length ? ': ' + errors.join(' / ') : ''));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
