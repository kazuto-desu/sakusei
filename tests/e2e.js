/*
 * ブラウザ操作による結合テスト（すべて架空のダミーデータ）
 *   cd tests && npm install && npm test
 * 入力 → Excel（公式参考様式）の出力までを確認し、外部通信やエラーが発生したら失敗にする。
 */
const { chromium } = require('playwright');
const JSZip = require('jszip');
const path = require('path');
const fs = require('fs');
const OUT = path.resolve(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });
const EXE = process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const base = 'file://' + path.resolve(__dirname, '../app/index.html');

// xlsx の各シートの文字をまとめて読む（シート名 → 文字列）
async function readBook(file) {
  const zip = await JSZip.loadAsync(fs.readFileSync(file));
  const wb = await zip.file('xl/workbook.xml').async('string');
  const rels = await zip.file('xl/_rels/workbook.xml.rels').async('string');
  const sstXml = zip.file('xl/sharedStrings.xml') ? await zip.file('xl/sharedStrings.xml').async('string') : '';
  const unesc = t => t.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
  const sst = (sstXml.match(/<si>[\s\S]*?<\/si>/g) || []).map(si => (si.match(/<t[^>]*>[\s\S]*?<\/t>/g) || []).map(t => unesc(t.replace(/<[^>]+>/g, ''))).join(''));
  const out = {};
  for (const m of wb.matchAll(/<sheet [^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/g)) {
    const target = new RegExp('Id="' + m[2] + '"[^>]*Target="([^"]+)"').exec(rels) || new RegExp('Target="([^"]+)"[^>]*Id="' + m[2] + '"').exec(rels);
    const xml = await zip.file('xl/' + target[1].replace(/^\/?xl\//, '')).async('string');
    const texts = [];
    for (const c of xml.matchAll(/<c [^>]*?(?:t="(\w+)")?[^>]*>([\s\S]*?)<\/c>/g)) {
      if (c[1] === 's') { const v = /<v>(\d+)<\/v>/.exec(c[2]); if (v) texts.push(sst[+v[1]]); }
      else texts.push(unesc((c[2].match(/<t[^>]*>[\s\S]*?<\/t>/g) || []).map(t => t.replace(/<[^>]+>/g, '')).join('') || (/<v>([^<]*)<\/v>/.exec(c[2]) || [])[1] || ''));
    }
    out[unesc(m[1])] = texts.join('\n');
  }
  return out;
}

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
  await page.locator('.combine-box input[type=checkbox]').nth(0).check();   // 1-4 も連名にする
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
  await fillAll({ '賃金締切日（毎月〇日）': '末', '賃金支払日（毎月〇日）': '25', '定例日 毎週〇曜日': '土・日', '３．更新上限の有無': '有',
    '更新上限（更新〇回まで）': '4', '更新上限（通算契約期間〇年まで）': '5', '５．雇用管理の改善等の相談窓口 部署名': '総務部' });
  await page.click('.side-nav >> text=支援計画書（1-17）');
  await fillAll({ '出迎え空港等': '成田', '送迎方法（入国時）': '社用車', '居室の広さ（㎡）': '18', '同居人数計（人）': '1', '寝室の広さ（㎡）': '12' });
  await page.getByLabel('1 時期', { exact: true }).fill('2026年10月5日');
  await page.screenshot({ path: OUT + '/01-plan-input.png', fullPage: false });

  // 書類の作成（Excel）
  await page.click('text=5. 書類の作成（Excel）');
  await page.screenshot({ path: OUT + '/02-export-select.png', fullPage: true });
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('text=選択した書類をExcelファイルで保存')]);
  const file = OUT + '/output.xlsx';
  await dl.saveAs(file);
  // ファイル名は保存ダイアログ（showSaveFilePicker）で付く。file:// のダウンロードでは Chromium が名前を無視するため確認しない
  const book = await readBook(file);
  {
    // Excel は styles.xml の要素順が仕様と違うと「修復」になる
    const st = await (await JSZip.loadAsync(fs.readFileSync(file))).file('xl/styles.xml').async('string');
    const ORDER = ['numFmts', 'fonts', 'fills', 'borders', 'cellStyleXfs', 'cellXfs', 'cellStyles', 'dxfs', 'tableStyles', 'colors', 'extLst'];
    const seq = [...st.matchAll(/<(\w+)[ >\/]/g)].map(m => m[1]).filter(n => ORDER.includes(n));
    const top = seq.filter((n, i) => seq.indexOf(n) === i);
    assert(top.every((n, i) => i === 0 || ORDER.indexOf(top[i - 1]) < ORDER.indexOf(n)) && !/<numFmts count="0"\/>/.test(st), 'styles.xml の要素順が Excel の仕様どおり（' + top.join(',') + '）');
  }
  const names = Object.keys(book);
  console.log('   シート: ' + names.join(', '));
  const all = names.map(n => book[n]).join('\n');
  assert(names.includes('1-5(MY)_TEST') && names.includes('1-5(MY)_SAMPLE'), '雇用契約書はミャンマー語併記版で1人1シート');
  assert(names.includes('1-6(MY)_TEST') && names.includes('1-6別紙1(MY)_TEST') && !names.some(n => /別紙2/.test(n)), '雇用条件書＋別紙１（別紙２は無期転換の変更がないので作らない）');
  assert(names.includes('1-17') && names.includes('1-17別紙（名簿）') && names.includes('1-17(MY)'), '支援計画書は連名1シート＋名簿＋翻訳様式');
  assert(names.includes('5-10') && names.includes('5-10別紙（名簿）') && names.includes('1-25'), '支援委託契約書・説明書は連名');
  assert(!names.includes('別紙名簿') && !names.includes('1-6'), 'ひな形の元シートは残らない');
  assert(book['1-17'].includes('別紙の名簿のとおり'), '支援計画書の氏名欄が「別紙の名簿のとおり」');
  assert(book['1-17別紙（名簿）'].includes('TEST TARO') && book['1-17別紙（名簿）'].includes('SAMPLE HANAKO'), '名簿に2名が載る');
  assert(book['1-25'].includes('別紙のとおり') && book['5-10'].includes('別紙のとおり'), '1-25・5-10 の申請人欄が「別紙のとおり」');
  assert(book['1-5(MY)_TEST'].includes('テスト株式会社') && book['1-5(MY)_TEST'].includes('TEST TARO'), '雇用契約書に甲乙の名称が入る');
  const c6 = book['1-6(MY)_TEST'];
  assert(c6.includes('2026年12月1日') && c6.includes('2027年11月30日'), '雇用契約期間が1年間で自動計算される');
  assert(c6.includes('■　自動的に更新する') || c6.includes('■ 自動的に更新する'), '契約更新の□が■になる');
  assert(c6.includes('更新　4回まで') && c6.includes('総務部'), '更新上限・相談窓口が入る');
  assert(c6.includes('180,000円'), '基本賃金が入る');
  assert(/[က-႟]/.test(c6) && !/[ၠ-႗]/.test(all) && !/္($|[^က-အ])/m.test(all), 'ミャンマー語（Unicode）の文言が残り、Zawgyi の文字はない');
  assert(book['1-6別紙1(MY)_TEST'].includes('住宅手当　10,000円') && book['1-6別紙1(MY)_TEST'].includes('（約　20,000円）'), 'ミャンマー語版の別紙１にも手当・控除が入る');
  assert(book['1-4'].includes('185,000') && book['1-4'].includes('別紙のとおり') && names.includes('1-4別紙（名簿）'), '報酬説明書を連名にでき、月給（固定支給込み）185,000円が入る');
  assert(book['1-17別紙（名簿）'].includes('署名日') && book['1-25別紙（名簿）'].includes('登録支援機関との支援委託契約に関する説明書（参考様式第１－２５号）'), '名簿は補助用紙の形式（立証資料の名称・1-17は署名日欄）');
  assert(book['1-17'].includes('別紙のとおり'), '支援計画書の外国人の署名欄が「別紙のとおり」');
  assert(book['5-10'].includes('月額　20,000円'), '支援委託料（定期分）が委託契約書に入る');
  assert(book['5-10'].includes('テスト地方裁判所'), '合意管轄裁判所が入る');
  assert(book['1-17'].includes('テスト支援協同組合') && book['1-17'].includes('2026年10月5日'), '支援計画書に登録支援機関・実施時期が入る');
  assert(book['1-16(MY)_SAMPLE'].includes('SAMPLE HANAKO'), '雇用の経緯説明書は1人1シート');

  // 1人だけ・連名なし・日本語のみ
  await page.click('text=2. 日程・翻訳');
  await fill('翻訳文を付ける言語', 'なし（日本語のみ）');
  await page.click('text=1. 紐付け');
  await page.locator('.combine-box input[type=checkbox]').nth(3).uncheck();   // 1-25 を個別に
  await page.click('text=5. 書類の作成（Excel）');
  const [dl2] = await Promise.all([page.waitForEvent('download'), page.click('text=選択した書類をExcelファイルで保存')]);
  await dl2.saveAs(OUT + '/output2.xlsx');
  const book2 = await readBook(OUT + '/output2.xlsx');
  const n2 = Object.keys(book2);
  console.log('   シート: ' + n2.join(', '));
  assert(n2.includes('1-5_TEST') && !n2.some(n => /MY/.test(n)), '日本語のみのときは日本語版のシート');
  assert(n2.includes('1-25_TEST') && n2.includes('1-25_SAMPLE') && !n2.includes('1-25別紙（名簿）'), '連名にしない書類は1人1シート');
  assert(book2['1-25_SAMPLE'].includes('SAMPLE HANAKO'), '個別の説明書に本人の氏名が入る');

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
