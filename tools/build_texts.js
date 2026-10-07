/*
 * extract_texts.py の出力(JSON)から app/js/docs/texts.js を作る。
 * ミャンマー語のうち旧来の Zawgyi で入力された文字列は Unicode に変換する
 * （Windows 標準の「Myanmar Text」フォントなど Unicode フォントで正しく表示・印刷するため）。
 *
 *   cd tools && npm install
 *   node build_texts.js texts.json > ../app/js/docs/texts.js
 */
const fs = require('fs');
const Rabbit = require('rabbit-node');

// Zawgyi 判定：Zawgyi 固有の字形コード（U+1060〜U+1097）、子音より前に置かれた U+1031（ေ）、
// Unicode の asat（U+103A）を使わず U+1039 を asat として使っている文字列を Zawgyi とみなす
function isZawgyi(s) {
  if (!/[က-႟]/.test(s)) return false;
  return /[ၠ-႗]/.test(s) || /(^|[^က-အျ-ှ])ေ/.test(s) ||
    (/္/.test(s) && !/်/.test(s));
}
function fix(s) {
  if (typeof s !== 'string') return s;
  return isZawgyi(s) ? Rabbit.zg2uni(s) : s;
}

const src = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const out = {};
let converted = 0;
for (const [k, v] of Object.entries(src)) {
  const nv = Array.isArray(v) ? v.map(fix) : fix(v);
  if (JSON.stringify(nv) !== JSON.stringify(v)) { converted++; if (process.env.SHOW) console.error(k, JSON.stringify(v).slice(0, 60), '=>', JSON.stringify(nv).slice(0, 60)); }
  out[k] = nv;
}
// 変換後も Zawgyi 固有の字形が残っていないか確認（Unicode のパーリ語の重ね字 U+1039 は正しいため対象外）
for (const [k, v] of Object.entries(out)) {
  for (const s of [].concat(v)) if (/[\u1060-\u1097]/.test(s) || /(^|[^\u1000-\u1021\u103B-\u103E])\u1031/.test(s)) { console.error('Zawgyi が残っています: ' + k); process.exit(1); }
}
console.error(`${Object.keys(out).length} 件（うち Zawgyi→Unicode 変換 ${converted} 件）`);
process.stdout.write('/* 自動生成ファイル（tools/build_texts.js）。様式の固定文言・ミャンマー語訳。個人情報は含まない。 */\n');
process.stdout.write('window.SKS = window.SKS || {};\nwindow.SKS.TEXTS = ' + JSON.stringify(out, null, 1) + ';\n');
