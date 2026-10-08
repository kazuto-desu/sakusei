"""
Excel ブック A に、ブック B の1シートを書式・図形・印刷設定ごと追加する（XML を直接操作）。
共有文字列はインライン文字列に、セル書式は A の styles.xml に追加して番号を付け替える。
"""
import copy
import re
import zipfile

from lxml import etree

NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
R_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
PKG = 'http://schemas.openxmlformats.org/package/2006/relationships'
CT = 'http://schemas.openxmlformats.org/package/2006/content-types'
N = '{%s}' % NS


def read(z, name):
    return etree.fromstring(z.read(name))


def tostring(el):
    return etree.tostring(el, xml_declaration=True, encoding='UTF-8', standalone=True)


def resolve(base, target):
    if target.startswith('/'):
        return target[1:]
    parts = base.split('/')[:-1]
    for seg in target.split('/'):
        if seg == '..':
            parts.pop()
        elif seg != '.':
            parts.append(seg)
    return '/'.join(parts)


def merge(a_path, b_path, out_path, title, insert_at=None):
    za, zb = zipfile.ZipFile(a_path), zipfile.ZipFile(b_path)
    files = {n: za.read(n) for n in za.namelist()}

    # ---- B のシート ----
    wb_b = read(zb, 'xl/workbook.xml')
    rels_b = read(zb, 'xl/_rels/workbook.xml.rels')
    sheet_b = wb_b.find(N + 'sheets')[0]
    rid = sheet_b.get('{%s}id' % R_NS)
    target = [r for r in rels_b if r.get('Id') == rid][0].get('Target')
    sheet_path_b = resolve('xl/workbook.xml', target)
    sheet = read(zb, sheet_path_b)
    sst = []
    if 'xl/sharedStrings.xml' in zb.namelist():
        sst = list(read(zb, 'xl/sharedStrings.xml'))

    # ---- 書式の結合 ----
    st_a = etree.fromstring(files['xl/styles.xml'])
    st_b = read(zb, 'xl/styles.xml')

    def section(st, name, create_before=None):
        el = st.find(N + name)
        if el is None:
            el = etree.SubElement(st, N + name)
            el.set('count', '0')
        return el
    offsets = {}
    for name, item in (('fonts', 'font'), ('fills', 'fill'), ('borders', 'border'), ('dxfs', 'dxf')):
        sa, sb = st_a.find(N + name), st_b.find(N + name)
        if sb is None:
            offsets[name] = 0
            continue
        if sa is None:
            sa = section(st_a, name)
        offsets[name] = len(sa)
        for x in sb:
            sa.append(copy.deepcopy(x))
        sa.set('count', str(len(sa)))
    # 表示形式（独自のものは 200 番台以降に付け替え）
    numfmt_map = {}
    nf_b = st_b.find(N + 'numFmts')
    if nf_b is not None:
        nf_a = st_a.find(N + 'numFmts')
        if nf_a is None:
            nf_a = etree.Element(N + 'numFmts')
            st_a.insert(0, nf_a)
        used = {int(x.get('numFmtId')) for x in nf_a}
        nxt = max([199] + list(used)) + 1
        for x in nf_b:
            old = int(x.get('numFmtId'))
            numfmt_map[old] = nxt
            y = copy.deepcopy(x)
            y.set('numFmtId', str(nxt))
            nf_a.append(y)
            nxt += 1
        nf_a.set('count', str(len(nf_a)))
    xfs_a, xfs_b = st_a.find(N + 'cellXfs'), st_b.find(N + 'cellXfs')
    xf_off = len(xfs_a)
    for x in xfs_b:
        y = copy.deepcopy(x)
        for attr, sec in (('fontId', 'fonts'), ('fillId', 'fills'), ('borderId', 'borders')):
            if y.get(attr) is not None:
                y.set(attr, str(int(y.get(attr)) + offsets.get(sec, 0)))
        if y.get('numFmtId') is not None and int(y.get('numFmtId')) in numfmt_map:
            y.set('numFmtId', str(numfmt_map[int(y.get('numFmtId'))]))
        y.set('xfId', '0')
        xfs_a.append(y)
    xfs_a.set('count', str(len(xfs_a)))
    files['xl/styles.xml'] = tostring(st_a)

    # ---- シートの書き換え ----
    for c in sheet.iter(N + 'c'):
        if c.get('s') is not None:
            c.set('s', str(int(c.get('s')) + xf_off))
        if c.get('t') == 's':
            v = c.find(N + 'v')
            si = sst[int(v.text)]
            c.remove(v)
            c.set('t', 'inlineStr')
            is_ = etree.SubElement(c, N + 'is')
            for ch in si:
                if etree.QName(ch).localname in ('t', 'r'):
                    is_.append(copy.deepcopy(ch))
    for el in sheet.iter(N + 'row'):
        if el.get('s') is not None:
            el.set('s', str(int(el.get('s')) + xf_off))
    for el in sheet.iter(N + 'col'):
        if el.get('style') is not None:
            el.set('style', str(int(el.get('style')) + xf_off))
    for cf in sheet.iter(N + 'cfRule'):
        if cf.get('dxfId') is not None:
            cf.set('dxfId', str(int(cf.get('dxfId')) + offsets.get('dxfs', 0)))
    # プリンタ設定など、引き継がない関係を削除
    for ps in sheet.iter(N + 'pageSetup'):
        ps.attrib.pop('{%s}id' % R_NS, None)
    for tag in ('legacyDrawing', 'picture', 'oleObjects', 'controls'):
        for el in sheet.findall(N + tag):
            sheet.remove(el)

    # ---- A に追加 ----
    wb_a = etree.fromstring(files['xl/workbook.xml'])
    rels_a = etree.fromstring(files['xl/_rels/workbook.xml.rels'])
    ct = etree.fromstring(files['[Content_Types].xml'])
    nums = [int(m.group(1)) for n in files for m in [re.match(r'xl/worksheets/sheet(\d+)\.xml$', n)] if m]
    new_no = max(nums) + 1
    new_path = 'xl/worksheets/sheet%d.xml' % new_no
    new_rid = 'rIdM%d' % new_no
    etree.SubElement(rels_a, '{%s}Relationship' % PKG, Id=new_rid,
                     Type='http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet',
                     Target='worksheets/sheet%d.xml' % new_no)
    etree.SubElement(ct, '{%s}Override' % CT, PartName='/' + new_path,
                     ContentType='application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml')
    # 図形（括弧など）
    srels_name = sheet_path_b.replace('worksheets/', 'worksheets/_rels/') + '.rels'
    if srels_name in zb.namelist():
        srels = read(zb, srels_name)
        keep = etree.Element('{%s}Relationships' % PKG)
        for r in srels:
            if r.get('Type', '').endswith('/drawing'):
                dpath = resolve(sheet_path_b, r.get('Target'))
                dnums = [int(m.group(1)) for n in files for m in [re.match(r'xl/drawings/drawing(\d+)\.xml$', n)] if m]
                dno = max(dnums + [0]) + 1
                files['xl/drawings/drawing%d.xml' % dno] = zb.read(dpath)
                etree.SubElement(ct, '{%s}Override' % CT, PartName='/xl/drawings/drawing%d.xml' % dno,
                                 ContentType='application/vnd.openxmlformats-officedocument.drawing+xml')
                etree.SubElement(keep, '{%s}Relationship' % PKG, Id=r.get('Id'), Type=r.get('Type'),
                                 Target='../drawings/drawing%d.xml' % dno)
        if len(keep):
            files['xl/worksheets/_rels/sheet%d.xml.rels' % new_no] = tostring(keep)
        else:
            for el in sheet.findall(N + 'drawing'):
                sheet.remove(el)
    files[new_path] = tostring(sheet)

    sheets_a = wb_a.find(N + 'sheets')
    sid = max(int(s.get('sheetId')) for s in sheets_a) + 1
    new_sheet = etree.Element(N + 'sheet', name=title, sheetId=str(sid))
    new_sheet.set('{%s}id' % R_NS, new_rid)
    pos = len(sheets_a) if insert_at is None else insert_at
    # 既存の定義名（印刷範囲）のシート番号をずらす
    dn_a = wb_a.find(N + 'definedNames')
    if dn_a is not None:
        for d in dn_a:
            if d.get('localSheetId') is not None and int(d.get('localSheetId')) >= pos:
                d.set('localSheetId', str(int(d.get('localSheetId')) + 1))
    sheets_a.insert(pos, new_sheet)
    dn_b = wb_b.find(N + 'definedNames')
    if dn_b is not None:
        if dn_a is None:
            dn_a = etree.Element(N + 'definedNames')
            sheets_a.addnext(dn_a)
        old_name = sheet_b.get('name')
        for d in dn_b:
            if d.get('localSheetId') == '0' or (d.text and old_name in d.text):
                y = copy.deepcopy(d)
                y.set('localSheetId', str(pos))
                y.text = y.text.replace("'%s'" % old_name, "'%s'" % title).replace(old_name + '!', "'%s'!" % title)
                dn_a.append(y)
    files['xl/workbook.xml'] = tostring(wb_a)
    files['xl/_rels/workbook.xml.rels'] = tostring(rels_a)
    files['[Content_Types].xml'] = tostring(ct)
    files.pop('xl/calcChain.xml', None)
    with zipfile.ZipFile(out_path, 'w', zipfile.ZIP_DEFLATED) as zo:
        for n, d in files.items():
            zo.writestr(n, d)
