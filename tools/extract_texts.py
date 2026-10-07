"""
社内の申請書類Excelから、様式の「固定文言」（見出し・条文・注意書き・ミャンマー語訳）だけを抜き出す。

  python3 tools/extract_texts.py 申請書類.xlsx > texts.json
  node tools/build_texts.js texts.json > app/js/docs/texts.js

- 黄色（記入・選択）セルは個人情報が入るため、指定しても抜き出さない（エラーにする）。
- 数式セルは、数式中の "..." の文字列（n番目）を抜き出せる（'セル#n'）。
- 出力（texts.json）は一時ファイル。リポジトリには texts.js のみを置く。
"""
import json
import re
import sys
import openpyxl

S_14, S_15, S_16, S_19, S_110, S_117, S_1525, S_510 = 10, 12, 13, 15, 14, 16, 17, 22

# key: (シート番号, セル)  ※シート番号は 0 始まり
SPEC = {
    # ---------- 1-4 報酬に関する説明書（日本語のみ） ----------
    "r14.note1": (S_14, "B15"), "r14.note2": (S_14, "B35"), "r14.note3": (S_14, "B57"),
    "r14.intro": (S_14, "A5"),

    # ---------- 1-5 雇用契約書 / 1-6 雇用条件書 ----------
    "c15.formNo.my": (S_15, "A2"), "c15.title.my": (S_15, "B5"),
    "c15.kou.my": (S_15, "A8"), "c15.kouSuffix.my": (S_15, "A9"),
    "c15.otsu.my": (S_15, "A12"), "c15.otsuSuffix.my": (S_15, "I13"),
    "c15.agree": (S_15, "A15"), "c15.agree.my1": (S_15, "A16"), "c15.agree.my2": (S_15, "A17"),
    "c15.effect": (S_15, "A20"), "c15.effect.my": (S_15, "A24"),
    "c15.period": (S_15, "A32"), "c15.period.my": (S_15, "A34"),
    "c15.end": (S_15, "A40"), "c15.end.my": (S_15, "A42"),
    "c15.copies": (S_15, "A49"), "c15.copies.my": (S_15, "A50"),
    "c15.date.my": (S_15, "AK55#*"),
    "c15.kouSign.my": (S_15, "A61"), "c15.seal.my": (S_15, "N61"), "c15.otsuSign.my": (S_15, "R61"),
    "c15.kouSignNote.my1": (S_15, "A62"), "c15.kouSignNote.my2": (S_15, "A63"), "c15.otsuSignNote.my": (S_15, "S62"),
    "c16.formNo.my": (S_15, "A67"), "c16.title.my": (S_15, "F71"), "c16.mr.my": (S_15, "B77"),
    "c16.orgName.my": (S_15, "A79"), "c16.address.my": (S_15, "N81"), "c16.tel.my": (S_15, "M83"),
    "c16.rep.my": (S_15, "H85"), "c16.seal.my": (S_15, "AA85"),
    "c16.s1.my": (S_15, "B89"), "c16.entryDate.my": (S_15, "AO91#0"),
    "c16.s2.my": (S_15, "B94"),
    "c16.renew.auto": (S_15, "AK94"), "c16.renew.maybe": (S_15, "AL94"), "c16.renew.no": (S_15, "AM94"),
    "c16.renewNote": (S_15, "D95"), "c16.renewNote.my": (S_15, "D96"),
    "c16.crit1": (S_15, "AK98"), "c16.crit2": (S_15, "AL98"), "c16.crit3": (S_15, "AM98"),
    "c16.crit4": (S_15, "AN98"), "c16.crit5": (S_15, "AO98"), "c16.crit6": (S_15, "AP99"),
    "c16.place.my": (S_15, "B107"), "c16.direct.my": (S_15, "D109"), "c16.dispatch.my": (S_15, "O109"),
    "c16.siteName.my": (S_15, "C112"), "c16.siteAddr.my": (S_15, "D114"), "c16.siteTel.my": (S_15, "B116"),
    "c16.job.my": (S_15, "B120"), "c16.field.my": (S_15, "C122"), "c16.category.my": (S_15, "C124"),
    "c16.hours.my": (S_15, "B128"), "c16.hours1.my": (S_15, "C130"),
    "c16.variable.my": (S_15, "C134"), "c16.variableUnit.my": (S_15, "E136"),
    "c16.variableNote": (S_15, "F137"), "c16.variableNote.my": (S_15, "F139"),
    "c16.shift.my": (S_15, "E143"),
    "c16.break.my": (S_15, "C157"),
    "c16.overtime.my": (S_15, "C163"),
    "c16.rules.my": (S_15, "F165"),
    "c16.holiday.my": (S_15, "B169"), "c16.holiday1.my": (S_15, "C171"), "c16.holiday2.my": (S_15, "C174"),
    "c16.holidayOther.my": (S_15, "Q174"),
    "c16.leave.my": (S_15, "B180"), "c16.leaveOther.my": (S_15, "C187"), "c16.leaveUnpaid.my": (S_15, "T187"),
    "c16.homeLeave.my": (S_15, "C189"), "c16.homeLeaveText": (S_15, "D190"), "c16.homeLeaveText.my": (S_15, "D191"),
    "c16.wage.my": (S_15, "B197"), "c16.basePay.my": (S_15, "H198"),
    "c16.payMonthly.my": (S_15, "AO198"), "c16.payDaily.my": (S_15, "AO199"), "c16.payHourly.my": (S_15, "AO200"),
    "c16.detailAttached.my": (S_15, "E201"),
    "c16.allow.my": (S_15, "C203"),
    "c16.premium.my": (S_15, "C211"), "c16.prem1.my": (S_15, "C215"), "c16.prem1a.my": (S_15, "K215"),
    "c16.prem1b.my": (S_15, "H216"), "c16.prem1c.my": (S_15, "K217"),
    "c16.prem2.my": (S_15, "C219"), "c16.prem2a.my": (S_15, "I219"), "c16.prem2b.my": (S_15, "S219"),
    "c16.prem3.my": (S_15, "C221"),
    "c16.closing.my": (S_15, "AK222#*"), "c16.payday.my": (S_15, "AK224#*"),
    "c16.method.my": (S_15, "C227"), "c16.transfer.my": (S_15, "M227"), "c16.cash.my": (S_15, "S227"),
    "c16.deduct.my": (S_15, "AK228#1"),
    "c16.raise.my": (S_15, "C233"), "c16.yesDetail.my": (S_15, "I233"), "c16.no.my": (S_15, "AC233"),
    "c16.bonus.my": (S_15, "C235"), "c16.retire.my": (S_15, "C237"), "c16.leaveAllow.my": (S_15, "C239"),
    "c16.retireSec.my": (S_15, "B243"), "c16.selfResign.my": (S_15, "AK243#*"),
    "c16.dismiss.my": (S_15, "C248"), "c16.dismissText1": (S_15, "D249"), "c16.dismissText2": (S_15, "D250"),
    "c16.dismissText.my": (S_15, "AK251"),
    "c16.rulesShort.my": (S_15, "F258"),
    "c16.other.my": (S_15, "B262"), "c16.insurance.my": (S_15, "C266"),
    "c16.ins1.my": (S_15, "AM263#1"), "c16.ins2.my": (S_15, "AM264#1"), "c16.ins3.my": (S_15, "AM265#1"),
    "c16.ins4.my": (S_15, "AM266#1"), "c16.ins5.my": (S_15, "AM267#1"), "c16.ins6.my": (S_15, "AM268#1"),
    "c16.ins7.my": (S_15, "AM269#1"),
    "c16.health.my": (S_15, "C270"), "c16.firstCheck.my": (S_15, "C272"), "c16.healthDate.my": (S_15, "AL271#*"),
    "c16.everyCheck.my": (S_15, "X272"),
    "c16.returnFare": (S_15, "C273"), "c16.returnFare.my": (S_15, "D275"),
    "c16.receiver.my": (S_15, "B284"),
    "c16.annualLeave.my": (S_15, "AK183#*"),
    "c16.shortLeave.my": (S_15, "AK184#*"),
    "c16.hoursTotal.my": (S_15, "AL155#*"),
    "c16.days.my": (S_15, "AL163#*"),
    "c16.holidayTotal.my": (S_15, "S172#*"),
    "c16.shiftTime.my": (S_15, "AL131#*"),
    "c16.breakUnit.my": (S_15, "K157"), "c16.yesWord.my": (S_15, "AK160#1"), "c16.noWord.my": (S_15, "AK161#1"),
    "c16.rulesHours": (S_15, "F164"), "c16.rulesHoliday": (S_15, "M175"), "c16.rulesHoliday.my": (S_15, "F176"),
    "c16.rulesLeave": (S_15, "M192"), "c16.rulesLeave.my": (S_15, "F193"), "c16.rulesRetire": (S_15, "M257"),
    "c16.dismissMid": (S_15, "U249"), "c16.rate.my": (S_15, "Q239"),
    "w16.approxPat.my": (S_16, "AB37#*"),

    # ---------- 1-6 別紙 賃金の支払 ----------
    "w16.formNo.my": (S_16, "A2"), "w16.title.my": (S_16, "A5"), "w16.s1.my": (S_16, "A8"),
    "w16.monthly.my": (S_16, "X8#1"), "w16.daily.my": (S_16, "X8#3"), "w16.hourly.my": (S_16, "X8#4"),
    "w16.yen.my": (S_16, "M8"), "w16.fixed": (S_16, "B9"), "w16.fixed.my": (S_16, "B10"),
    "w16.perHour": (S_16, "B11"), "w16.perMonth": (S_16, "B12"),
    "w16.perHour.my": (S_16, "B13"), "w16.perMonth.my": (S_16, "B14"),
    "w16.s2": (S_16, "A17"), "w16.s2.my": (S_16, "A18"), "w16.allow.my": (S_16, "B25"), "w16.calc.my": (S_16, "K24"),
    "w16.s3.my": (S_16, "A32"), "w16.approx.my": (S_16, "N32"), "w16.yenTotal.my": (S_16, "B33"),
    "w16.s4.my": (S_16, "A36"),
    "w16.tax.my": (S_16, "E37"), "w16.social.my": (S_16, "E38"), "w16.empIns.my": (S_16, "E39"),
    "w16.food.my": (S_16, "E40"), "w16.housing.my": (S_16, "E41"), "w16.other.my": (S_16, "E42"),
    "w16.utility": (S_16, "B43"),
    "w16.deductTotal.my": (S_16, "G48"), "w16.s5.my": (S_16, "A51"),
    "w16.note": (S_16, "E52"), "w16.note.my": (S_16, "B53"),

    # ---------- 1-9 徴収費用の説明書（日本語のみ） ----------
    "f19.note1": (S_19, "B9"), "f19.note2": (S_19, "B21"), "f19.note3": (S_19, "B35"),
    "f19.note4": (S_19, "B46"), "f19.note5": (S_19, "B62"),

    # ---------- 1-16 雇用の経緯に係る説明書 ----------
    "h116.formNo.my": (S_110, "A2"), "h116.title.my": (S_110, "D5"),
    "h116.intro.my1": (S_110, "B9"), "h116.intro.my2": (S_110, "B10"), "h116.intro.my3": (S_110, "B11"),
    "h116.s1.my": (S_110, "C14"), "h116.s1q1.my": (S_110, "B16"), "h116.yes.my": (S_110, "I16"), "h116.no.my": (S_110, "M16"),
    "h116.s1q2.my": (S_110, "B19"), "h116.s1q3.my": (S_110, "B22"), "h116.paid.my": (S_110, "G22"), "h116.free.my": (S_110, "L22"),
    "h116.s1q4.my": (S_110, "B25"), "h116.zip.my": (S_110, "G28"), "h116.s1q5.my": (S_110, "B29"), "h116.tel.my": (S_110, "K30"),
    "h116.s1q6.my": (S_110, "B33"), "h116.amount.my": (S_110, "J32"), "h116.yen.my": (S_110, "P32"),
    "h116.seeker.my": (S_110, "G33"), "h116.purpose.my": (S_110, "J34"), "h116.as.my": (S_110, "L34"),
    "h116.employer.my": (S_110, "G37"),
    "h116.note1": (S_110, "B39"), "h116.note1.my": (S_110, "B44"),
    "h116.s2.my": (S_110, "B54"), "h116.s2q1.my": (S_110, "B56"), "h116.s2q2.my": (S_110, "B58"),
    "h116.s2q3.my": (S_110, "B61"), "h116.s2q4.my": (S_110, "B63"), "h116.s2q5.my": (S_110, "B67"),
    "h116.note2": (S_110, "B73"), "h116.note2.my": (S_110, "B78"),
    "h116.s3.my": (S_110, "B86"), "h116.s3q.my": (S_110, "B88"),
    "h116.declare": (S_110, "B91"), "h116.declare.my": (S_110, "B94"),
    "h116.created.my": (S_110, "I102"), "h116.org.my": (S_110, "D105"), "h116.owner.my": (S_110, "D109"),
    "h116.s4.my": (S_110, "B112"), "h116.payee.my": (S_110, "C114"), "h116.name.my": (S_110, "H114"),
    "h116.payDate.my": (S_110, "J114"), "h116.payAmount.my": (S_110, "M114"),
    "h116.note4": (S_110, "B127"), "h116.note4.my": (S_110, "B130"),
    "h116.confirm": (S_110, "B137"), "h116.confirm.my": (S_110, "B140"), "h116.sign.my": (S_110, "F147"),

    # ---------- 1-17 支援計画書 ----------
    "p117.formNo.my": (S_117, "B3"), "p117.title.my": (S_117, "P9"), "p117.created.my": (S_117, "AY16"),
    "p117.s1.my": (S_117, "A20"), "p117.name.my": (S_117, "D24"), "p117.others.my": (S_117, "AL24"),
    "p117.gender.my": (S_117, "AT24"), "p117.birth.my": (S_117, "D32"), "p117.nat.my": (S_117, "AT32"),
    "p117.s2.my": (S_117, "A36"), "p117.orgName.my": (S_117, "D40"), "p117.addr.my": (S_117, "D50"),
    "p117.office.my": (S_117, "D57"), "p117.mgr.my": (S_117, "P68"), "p117.kanaName.my": (S_117, "AD68"),
    "p117.title2.my": (S_117, "AZ68"), "p117.supported.my": (S_117, "P77"), "p117.persons.my": (S_117, "AP77"),
    "p117.structure.my": (S_117, "D82"), "p117.staffCount.my": (S_117, "P89"),
    "p117.neutral.my": (S_117, "AT83"), "p117.neutralText": (S_117, "AU76"), "p117.neutralText.my": (S_117, "AU86"),
    "p117.s3.my": (S_117, "A98"), "p117.regNo.my": (S_117, "D102"), "p117.regDate.my": (S_117, "AB102"),
    "p117.startDate.my": (S_117, "AV102"), "p117.orgName4.my": (S_117, "D110"), "p117.addr5.my": (S_117, "D120"),
    "p117.rep6.my": (S_117, "F129"), "p117.office7.my": (S_117, "D138"), "p117.structure8.my": (S_117, "D158"),
    "p117.proper.my": (S_117, "AT162"), "p117.properText": (S_117, "AU155"), "p117.properText.my": (S_117, "AU165"),
    "p117.s4.my": (S_117, "A188"), "p117.s4cont.my": (S_117, "A227"),
    "p117.colContent.my": (S_117, "H193"), "p117.colPlan.my": (S_117, "T193"), "p117.colEntrust.my": (S_117, "AD193"),
    "p117.colPerson.my": (S_117, "AH190"), "p117.colName.my": (S_117, "AH196"), "p117.colAddr.my": (S_117, "AP196"),
    "p117.colMethod.my": (S_117, "BD193"),
    "p117.m.face.my": (S_117, "BE200"), "p117.m.tv.my": (S_117, "BE204"), "p117.m.other.my": (S_117, "BE208"),
    "p117.free.my": (S_117, "H310"), "p117.lang.my": (S_117, "F319"), "p117.langUnit.my": (S_117, "Z319"),
    "p117.interp.my": (S_117, "AD319"), "p117.time.my": (S_117, "F324"), "p117.total.my": (S_117, "T324"), "p117.hours.my": (S_117, "AA324"),
    "p117.m.airportIn.my": (S_117, "BE339"), "p117.m.transport.my": (S_117, "BE347"), "p117.m.airportOut.my": (S_117, "BE353"),
    "p117.m.info.my": (S_117, "BD511"), "p117.m.accompany.my": (S_117, "BE515"),
    "p117.m.video.my": (S_117, "BE579"), "p117.m.radio.my": (S_117, "BE1137"),
    "p117.house.secured.my": (S_117, "U478"), "p117.house.later.my": (S_117, "U483"),
    "p117.house.room.my": (S_117, "T488"), "p117.house.people.my": (S_117, "AI488"),
    "p117.house.per75.my": (S_117, "T493"), "p117.house.bed.my": (S_117, "AK492"), "p117.house.per45.my": (S_117, "AL497"),
    "p117.consult.hours.my": (S_117, "H831"), "p117.consult.method.my": (S_117, "H851"), "p117.consult.emergency.my": (S_117, "H871"),
    "p117.mon.my": (S_117, "T833"), "p117.tue.my": (S_117, "AD833"), "p117.wed.my": (S_117, "AN833"), "p117.thu.my": (S_117, "AX833"),
    "p117.weekday.my": (S_117, "J835"), "p117.sat.my": (S_117, "J841"), "p117.sun.my": (S_117, "J845"), "p117.holiday.my": (S_117, "J849"),
    "p117.consult.check.my": (S_117, "J853"), "p117.c.face.my": (S_117, "K857"), "p117.c.tel.my": (S_117, "K861"),
    "p117.c.mail.my": (S_117, "K865"), "p117.c.other.my": (S_117, "K869"),
    "p117.s9note.my": (S_117, "AH1121"), "p117.s9note": (S_117, "AH1119"),
    "p117.note": (S_117, "B1238"), "p117.note.my": (S_117, "B1276"),
    "p117.declare": (S_117, "B1310"), "p117.declare.my": (S_117, "B1315"),
    "p117.signOrg.my": (S_117, "S1327"), "p117.signOwner.my": (S_117, "T1335"),
    "p117.understood.pre.my": (S_117, "B1343"), "p117.understood": (S_117, "O1340"), "p117.understood.my": (S_117, "AA1343"),
    "p117.signDate.my": (S_117, "AA1351"), "p117.workerSign.my": (S_117, "AA1359"),
}

# 支援計画書 Ⅳ の各項目（日本語・ミャンマー語）
for k, (jp, my) in {
    "1": ("E188", "D188"), "1a": ("H198", "H204"), "1b": ("H210", "H214"), "1c": ("H218", "H223"), "1d": ("H227", "H233"),
    "1e": ("H242", "H250"), "1f": ("H263", "H267"), "1g": ("H271", "H275"), "1h": ("H279", "H283"), "1i": ("H287", "H291"),
    "1j": ("H295", "H299"),
    "2": ("E327", "D327"), "2a": ("F337", "F342"), "2b": ("F351", "F356"),
    "3": ("E373", "D373"), "3A": ("G373", "F373"), "3a": ("H383", "H406"), "3b": ("H434", "H442"), "3c": ("H451", "H459"),
    "3d": ("H475", "H485"), "3B": ("G499", "F499"), "3Ba": ("H509", "H516"), "3Bb": ("H525", "H530"), "3Bc": ("H539", "H546"),
    "4": ("E561", "D561"), "4a": ("H571", "H575"), "4b": ("H579", "H591"), "4c": ("H608", "H614"), "4d": ("H625", "H631"),
    "4e": ("H639", "H645"), "4f": ("H654", "H662"),
    "5": ("E691", "D691"), "5a": ("F701", "F709"), "5b": ("F718", "F731"), "5c": ("F744", "F752"),
    "6": ("E769", "D769"), "6a": ("H779", "H787"), "6b": ("H800", "H808"),
    "7": ("E895", "D895"), "7a": ("F905", "F922"), "7b": ("F943", "F953"),
    "8": ("E974", "D974"), "8a": ("F984", "F990"), "8b": ("F999", "F1007"), "8c": ("F1020", "F1030"), "8d": ("F1047", "F1055"),
    "8e": ("F1062", "F1066"), "8f": ("F1074", "F1079"), "8g": ("F1086", "F1094"),
    "9": ("E1115", "D1115"), "9a": ("H1131", "H1142"), "9b": ("H1157", "H1164"), "9c": ("H1173", "H1183"), "9d": ("H1196", "H1206"),
}.items():
    SPEC[f"p117.i{k}"] = (S_117, jp)
    SPEC[f"p117.i{k}.my"] = (S_117, my)
SPEC["p117.info.my"] = (S_117, "F188")       # ア 情報提供内容等
SPEC["p117.resp.my"] = (S_117, "F769")       # ア 対応内容等
SPEC["p117.method6.my"] = (S_117, "F831")    # イ 実施方法
SPEC["p117.interview.my"] = (S_117, "F1115") # ア 面談内容等

# ---------- 5-10 支援委託契約書（日本語のみ） ----------
for i, cell in enumerate(["B13", "B17", "B18", "B21", "B32", "B34", "B35", "B38", "B39", "B42"], start=1):
    SPEC[f"e510.a1.{i}"] = (S_510, cell)
for key, cell in {"a1": "A11", "a2.2": "B51", "a2.3": "B52", "a2.4": "B54", "a3": "B58", "a4.1": "B61", "a4.2": "B62",
                  "a5": "B67", "a6.2": "B74", "a7": "B79", "a9": "B88", "closing": "B91"}.items():
    SPEC[f"e510.{key}"] = (S_510, cell)

YELLOW = "FFFFFFCC"


def literal(formula, n):
    lits = re.findall(r'"((?:[^"]|"")*)"', formula)
    return lits[n].replace('""', '"')


def main(path):
    wb = openpyxl.load_workbook(path)
    out = {}
    for key, (si, ref) in SPEC.items():
        ws = wb.worksheets[si]
        cell, _, n = ref.partition("#")
        c = ws[cell]
        if c.fill.fill_type == "solid" and str(c.fill.fgColor.rgb).upper() == YELLOW:
            raise SystemExit(f"{key}: {ws.title}!{cell} は入力欄（黄色）のため抜き出せません")
        v = c.value
        if v is None:
            raise SystemExit(f"{key}: {ws.title}!{cell} が空です")
        if n and not str(v).startswith("="):
            raise SystemExit(f"{key}: {ws.title}!{cell} は数式ではありません")
        v = str(v)
        if n == "*":
            v = [x.replace('""', '"') for x in re.findall(r'"((?:[^"]|"")*)"', v)]
        elif n:
            v = literal(v, int(n))
        elif v.startswith("="):
            raise SystemExit(f"{key}: {ws.title}!{cell} は数式です（'#番号' で文字列を指定してください）")
        out[key] = v
    json.dump(out, sys.stdout, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main(sys.argv[1])
