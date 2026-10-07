/*
 * ブラウザ操作による結合テスト（ダミーのひな形を使用。実データは使わない）
 *   cd tests && npm install && npm test
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const TPL = path.resolve(__dirname, 'fixtures/dummy-template.xlsx');
const OUT = path.resolve(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });
const EXE = process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
(async () => {
  const browser = await chromium.launch(Object.assign({ args: ['--disable-background-networking', '--disable-component-update', '--no-first-run'] }, EXE ? { executablePath: EXE } : {}));
  const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1360, height: 900 } });
  await ctx.addInitScript(() => { delete window.showSaveFilePicker; window.showSaveFilePicker = undefined; });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' || m.type()==='warning') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERR ' + e.message));
  page.on('request', r => { if (!/^(file|blob|data):/.test(r.url())) errors.push('NETWORK ' + r.url()); });
  const base = 'file://' + path.resolve(__dirname, '../app/index.html');
  await page.goto(base);
  await page.fill('#pass', 'testpass123'); await page.fill('#pass2', 'testpass123');
  await page.click('button[type=submit]');
  await page.waitForSelector('.topbar');
  await page.goto(base + '#/templates');
  const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('text=＋ Excelを登録')]);
  await fc.setFiles(TPL);
  await page.waitForSelector('.modal', { timeout: 30000 });
  await page.click('text=選択したシートを空にする');
  await page.screenshot({ path: OUT + '/01-templates.png' });

  async function fill(label, value) {
    const esc = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); const el = page.getByLabel(new RegExp('^' + esc + '(必須)?$')).first();
    const tag = await el.evaluate(e => e.tagName);
    if (tag === 'SELECT') await el.selectOption(value); else await el.fill(value);
  }
  // worker
  await page.goto(base + '#/workers'); await page.click('text=＋ 新規登録');
  const W = { '氏名（旅券どおりのローマ字）': 'TEST TARO', '性別': '男', '生年月日': '2000-05-10', '国籍・地域': 'ベトナム', '出生地': 'HANOI',
    '本国における居住地': 'DUMMY ADDRESS 1-2-3', '日本における連絡先（住所）': 'テスト県テスト市1-1', '携帯電話番号': '090-0000-0000',
    '旅券番号': 'TZ0000001', '旅券の有効期限': '2030-01-31', '査証申請予定地': 'HANOI', '職業（現在）': '学生' };
  for (const [k, v] of Object.entries(W)) await fill(k, v);
  await page.screenshot({ path: OUT + '/02-worker.png', fullPage: true });
  // company
  await page.goto(base + '#/companies'); await page.click('text=＋ 新規登録');
  const C = { '名称': 'テスト株式会社', '法人番号（13桁）': '1234567890123', '代表者氏名': '試験 一郎', '代表者氏名（ふりがな）': 'しけん いちろう', '代表者役職': '代表取締役',
    '郵便番号（〒なし）': '100-0001', '住所1': 'テスト県テスト市2-2', '電話番号': '03-0000-0000', '受入分野': '介護', '事業所名': 'テスト事業所',
    '事業所 住所1': 'テスト県テスト市3-3', '雇用保険適用事業所番号（11桁）': '1234-567890-1', '労働保険番号（14桁）': '12-3-45-678901-234',
    '売上高 前年度': '100000000', '年間休日日数': '110', '始業時刻': '08:30', '終業時刻': '17:30', '休憩（分）': '60' };
  for (const [k, v] of Object.entries(C)) await fill(k, v);
  await page.click('text=＋ 行を追加');
  await page.getByLabel('ふりがな 2').fill('やくいん じろう'); await page.getByLabel('氏名 2').fill('役員 次郎'); await page.getByLabel('役職 2').fill('取締役');
  // support
  await page.goto(base + '#/supports'); await page.click('text=＋ 新規登録');
  const SP = { '名称': 'テスト支援協同組合', '登録番号': '19登-999999', '登録年月日': '2019-07-01', '代表者氏名': '支援 花子', '住所1行目': 'テスト県テスト市4-4',
    '電話番号': '03-1111-1111', '支援責任者': '責任 三郎', '支援担当者': '担当 四郎', '支援委託手数料（月額／人・円）': '20000' };
  for (const [k, v] of Object.entries(SP)) await fill(k, v);
  // case
  await page.goto(base + '#/cases'); await page.click('text=＋ 新しい案件');
  const sels = page.locator('.modal select');
  await sels.nth(0).selectOption({ label: 'TEST TARO' });
  await sels.nth(1).selectOption({ label: 'テスト株式会社' });
  await sels.nth(2).selectOption({ label: 'テスト支援協同組合' });
  await page.click('.modal >> text=作成する');
  await page.waitForSelector('.tabs');
  await page.click('text=2. 日程・入国');
  const SC = { '入国予定日': '2026-12-01', '雇用契約締結日': '2026-09-01', '雇用開始日': '2026-12-01', '申請日': '2026-10-10', '上陸予定港': '成田空港', '滞在予定期間': '1年',
    '書類作成日（説明書・誓約書などの日付）': '2026-10-01' };
  for (const [k, v] of Object.entries(SC)) await fill(k, v);
  await page.click('text=3. 給与・労働条件');
  await fill('賃金形態', '月給'); await fill('基本賃金（円）', '180000');
  await page.getByLabel('手当1 内容').fill('住宅手当'); await page.getByLabel('手当1 月額').fill('10000'); await page.getByLabel('手当1 区分').selectOption('1');
  await page.getByLabel('手当2 内容').fill('資格手当'); await page.getByLabel('手当2 月額').fill('5000'); await page.getByLabel('手当2 区分').selectOption('2');
  await fill('所得税', '3000'); await fill('居住費', '20000');
  await page.waitForTimeout(300);
  await page.screenshot({ path: OUT + '/03-salary.png', fullPage: true });
  console.log('CALC', (await page.textContent('.calc-panel')).slice(0, 400));
  await page.click('text=4. 様式ごとの入力');
  await page.waitForSelector('.sheet-editor');
  await page.screenshot({ path: OUT + '/04-sheets.png' });
  await page.click('text=5. チェック・Excel出力');
  await page.waitForSelector('text=Excelファイルを出力');
  await page.screenshot({ path: OUT + '/05-output.png', fullPage: true });
  console.log('ISSUES', await page.textContent('.issues'));
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('text=Excelファイルを出力')]);
  await dl.saveAs(OUT + '/out.xlsx');
  console.log('saved', dl.suggestedFilename());
  // lock / unlock persistence
  await page.click('text=ロック');
  await page.waitForSelector('#pass');
  await page.fill('#pass', 'wrongpass'); await page.click('button[type=submit]');
  await page.waitForTimeout(1500);
  console.log('WRONG', await page.textContent('.error-text'));
  await page.fill('#pass', 'testpass123'); await page.click('button[type=submit]');
  await page.waitForSelector('.topbar');
  console.log('CASES', await page.textContent('.table tbody'));
  await page.screenshot({ path: OUT + '/06-cases.png' });
  // 案件の4タブ：様式ごとの入力で1欄を上書き
  await page.click('text=TEST TARO ／ テスト株式会社');
  await page.click('text=4. 様式ごとの入力');
  await page.locator('.sheet-editor select').first().selectOption('1-9徴収費用説明（★）');
  await page.locator('.sheet-editor .toolbar input[type=checkbox]').uncheck();
  await page.getByLabel(/^H10 /).fill('新しい説明文');
  await page.click('text=5. チェック・Excel出力');
  const [dl2] = await Promise.all([page.waitForEvent('download'), page.click('text=Excelファイルを出力')]);
  await dl2.saveAs(OUT + '/out.xlsx');
  console.log('ERRORS', errors);
  await browser.close();
  if (errors.length) { console.error('ブラウザでエラーまたは外部通信が発生しました'); process.exit(1); }
})().catch(e => { console.error(e); process.exit(1); });
