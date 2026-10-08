/*
 * 標準入力の JSON 文字列配列のうち、Zawgyi で書かれた文字列を Unicode に変換して標準出力に返す。
 * （tools/build_template.py から呼び出す。cd tools && npm install が必要）
 */
const Rabbit = require('rabbit-node');

// Zawgyi 固有の字形コード（U+1060〜U+1097）、子音より前に置かれた U+1031、
// U+1039 を asat として使う（Unicode では U+1039 の後は必ず子音）文字列を Zawgyi とみなす
function isZawgyi(s) {
  if (!/[က-႟]/.test(s)) return false;
  return /[ၠ-႗]/.test(s) || /(^|[^က-အျ-ှ])ေ/.test(s) ||
    /္($|[^က-အ])/.test(s) || (/္/.test(s) && !/်/.test(s));
}
// 1つのセルに日本語と Zawgyi が混在するため、ミャンマー文字の連続部分ごとに判定・変換する
function fix(s) {
  return s.replace(/[က-႟][က-႟\s()（）\-/.,၊။0-9a-zA-Z]*/g, (part) => isZawgyi(part) ? Rabbit.zg2uni(part) : part);
}

let input = '';
process.stdin.on('data', (d) => { input += d; });
process.stdin.on('end', () => {
  const arr = JSON.parse(input);
  process.stdout.write(JSON.stringify(arr.map(fix)));
});
