"""出力されたExcelの中身を検証する（e2e.js の後に実行）"""
import sys
import zipfile
import datetime
from openpyxl import load_workbook

path = sys.argv[1]
z = zipfile.ZipFile(path)
names = z.namelist()
assert "xl/calcChain.xml" not in names
core = z.read("docProps/core.xml").decode()
import re
assert re.search(r"<dc:creator[^>]*/>|<dc:creator[^>]*></dc:creator>", core), core
assert 'fullCalcOnLoad="1"' in z.read("xl/workbook.xml").decode()

wb = load_workbook(path)
d = wb["データ（★）"]
a = [w for w in wb.worksheets if w.title.strip() == "申請人用（認定）"][0]
o = wb["別紙役員一覧"]
g = wb["1-9徴収費用説明（★）"]

checks = {
    "氏名": (d["B2"].value, "TEST TARO"),
    "入国予定日": (d["B3"].value, datetime.datetime(2026, 12, 1)),
    "性別": (d["B6"].value, "男"),
    "法人番号は文字列": (d["E13"].value, "1234567890123"),
    "始業時刻": (d["E28"].value, datetime.time(8, 30)),
    "基本賃金": (d["K3"].value, 180000),
    "手当1区分": (d["N4"].value, 1),
    "手当3は空": (d["K8"].value, None),
    "登録年月日": (d["H15"].value, datetime.datetime(2019, 7, 1)),
    "出生地（前の値を上書き）": (a["P23"].value, "HANOI"),
    "旅券番号": (a["I35"].value, "TZ0000001"),
    "旅券期限 年": (a["AC35"].value, 2030),
    "入国 月": (a["N55"].value, 12),
    "数式は保持": (a["G20"].value, "='データ（★）'!B2"),
    "チェック欄は保持": (a["B45"].value, "■"),
    "代表者ふりがな": (o["C3"].value, "しけん いちろう"),
    "役員②": (o["C6"].value, "役員 次郎"),
    "役員③は空": (o["C8"].value, None),
    "個別入力（案件で上書き）": (g["H10"].value, "新しい説明文"),
    "個別入力の数式は保持": (g["H14"].value, "='データ（★）'!K18"),
}
ng = [f"{k}: {v[0]!r} != {v[1]!r}" for k, v in checks.items() if v[0] != v[1]]
if ng:
    print("NG\n" + "\n".join(ng))
    sys.exit(1)
print(f"OK ({len(checks)} 項目)")
