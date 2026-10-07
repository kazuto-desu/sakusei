/*
 * 特定技能 申請書類作成アプリ 本体
 */
(function () {
  'use strict';
  var SKS = window.SKS;
  var UI = SKS.UI, h = UI.h, F = SKS.FIELDS, Vault = SKS.Vault, Calc = SKS.Calc, Builder = SKS.Builder;
  var Template = SKS.Xlsx.Template;
  var normalize = Template.normalizeSheetName;
  var DATA_KEY = normalize(SKS.SHEETS.DATA);

  var S = { state: null, tplCache: {}, saveTimer: null, idleTimer: null };
  var app = document.getElementById('app');

  // ======================= 状態 =======================
  function emptyState() {
    return {
      version: 1, workers: [], companies: [], supports: [], cases: [], templates: [],
      agent: {}, settings: { autoLockMin: 15, stripMetadata: true, activeTemplateId: null }
    };
  }
  function save(immediate) {
    clearTimeout(S.saveTimer);
    setSaveStatus('保存中…');
    var run = function () {
      Vault.saveJson('state', S.state).then(function () { setSaveStatus('保存済み'); }, function (e) {
        setSaveStatus('保存できませんでした'); UI.toast('保存に失敗しました: ' + e.message, 'error');
      });
    };
    if (immediate) run(); else S.saveTimer = setTimeout(run, 400);
  }
  function setSaveStatus(t) { var el = document.getElementById('save-status'); if (el) el.textContent = t; }
  function byId(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }
  function now() { return Date.now(); }

  var KINDS = {
    worker: { list: 'workers', title: '外国人（申請人）', fields: F.worker, nameOf: function (o) { return o.name || '（氏名未入力）'; },
      sub: function (o) { return [o.nationality, o.birthDate ? UI.fmtDate(o.birthDate) + '生' : ''].filter(Boolean).join(' / '); } },
    company: { list: 'companies', title: '受入機関', fields: F.company, nameOf: function (o) { return o.name || '（名称未入力）'; },
      sub: function (o) { return [o.field, o.siteName].filter(Boolean).join(' / '); } },
    support: { list: 'supports', title: '登録支援機関', fields: F.support, nameOf: function (o) { return o.name || '（名称未入力）'; },
      sub: function (o) { return o.regNo || ''; } }
  };

  // ======================= ひな形 =======================
  function getTemplate(id) {
    if (!id) return Promise.resolve(null);
    if (S.tplCache[id]) return Promise.resolve(S.tplCache[id]);
    return Vault.loadBinary('tpl-' + id).then(function (buf) {
      if (!buf) return null;
      return Template.load(buf).then(function (tpl) {
        var mapped = Builder.mappedCellSet();
        var entry = { tpl: tpl, inputs: {}, sheets: [] };
        return Promise.all(tpl.sheets.map(function (sh) {
          return tpl.scanInputs(sh.name).then(function (list) {
            if (sh.key === DATA_KEY) return;
            var filtered = list.filter(function (x) { return !mapped[sh.key + '!' + x.cell]; });
            if (!filtered.length) return;
            entry.inputs[sh.key] = filtered;
          });
        })).then(function () {
          entry.sheets = tpl.sheets.filter(function (sh) { return entry.inputs[sh.key]; });
          entry.hasDataSheet = !!tpl.findSheet(SKS.SHEETS.DATA);
          S.tplCache[id] = entry;
          return entry;
        });
      });
    });
  }

  function uploadTemplate() {
    UI.pickFile('.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').then(function (file) {
      if (!file) return;
      if (!/\.xlsx$/i.test(file.name)) { UI.toast('.xlsx 形式のファイルを選択してください', 'error'); return; }
      file.arrayBuffer().then(function (buf) {
        return Template.load(buf).then(function (tpl) {
          if (!tpl.findSheet(SKS.SHEETS.DATA)) throw new Error('「データ（★）」シートが見つかりません。申請書類のExcelを選択してください');
          var id = UI.uid();
          return Vault.saveBinary('tpl-' + id, buf).then(function () {
            var meta = { id: id, name: file.name.replace(/\.xlsx$/i, ''), fileName: file.name, size: file.size, uploadedAt: now(), defaults: {} };
            S.state.templates.push(meta);
            if (!S.state.settings.activeTemplateId) S.state.settings.activeTemplateId = id;
            save(true);
            return getTemplate(id).then(function (entry) { showResidualDialog(meta, entry); });
          });
        });
      }).catch(function (e) { UI.toast('読み込みに失敗しました: ' + e.message, 'error'); });
    });
  }

  // 前の案件の値が黄色欄に残っている場合、シートごとに空にするか選んでもらう
  function residualBySheet(entry, meta) {
    var out = [];
    entry.sheets.forEach(function (sh) {
      var vals = entry.inputs[sh.key].filter(function (x) {
        var d = (meta.defaults[sh.key] || {})[x.cell];
        var v = d !== undefined ? d : x.value;
        return !x.formula && !Builder.isEmpty(v) && x.kind !== 'check' && x.kind !== 'select';
      });
      if (vals.length) out.push({ sheet: sh, count: vals.length });
    });
    return out;
  }
  function clearSheetDefaults(meta, entry, sheetKey) {
    var d = meta.defaults[sheetKey] = meta.defaults[sheetKey] || {};
    entry.inputs[sheetKey].forEach(function (x) {
      if (x.formula || x.kind === 'check' || x.kind === 'select') return;
      if (!Builder.isEmpty(x.value)) d[x.cell] = '';
    });
  }
  function showResidualDialog(meta, entry) {
    var res = residualBySheet(entry, meta);
    if (!res.length) { UI.toast('ひな形を登録しました'); route(); return; }
    var checks = {};
    var body = h('div', {},
      h('p', { text: '黄色の入力欄に、前に作成した案件の値（氏名・住所・金額など）が残っています。新しい案件に前の情報が混ざらないよう、空欄にするシートを選んでください。' }),
      h('p', { class: 'muted', text: '雇用契約書の翻訳文など、毎回同じ定型文が入っているシートはチェックを外すと既定値として残せます。あとから「ひな形」画面でいつでも変更できます。チェック欄（□/■）と選択欄はそのまま残ります。' }),
      h('div', { class: 'check-list' }, res.map(function (r) {
        var cb = h('input', { type: 'checkbox', checked: true });
        checks[r.sheet.key] = cb;
        return h('label', { class: 'check-row' }, cb, ' ' + r.sheet.name.trim() + '（' + r.count + '欄）');
      })));
    UI.modal('前の案件の値が残っています', body, [
      { label: 'あとで確認する', onClick: function () { route(); } },
      { label: '選択したシートを空にする', primary: true, onClick: function () {
        Object.keys(checks).forEach(function (k) {
          if (checks[k].checked) clearSheetDefaults(meta, entry, k);
        });
        save(true); UI.toast('ひな形を登録しました'); route();
      } }
    ]);
  }

  // ======================= 画面の枠 =======================
  function shell(active, content) {
    UI.clear(app);
    var nav = [
      ['cases', '案件'], ['workers', '外国人'], ['companies', '受入機関'], ['supports', '登録支援機関'], ['templates', 'ひな形（Excel）'], ['settings', '設定']
    ];
    app.appendChild(h('header', { class: 'topbar' },
      h('div', { class: 'brand' }, h('span', { class: 'logo', text: '特' }), h('span', { text: '特定技能 申請書類作成' })),
      h('nav', {}, nav.map(function (n) {
        return h('a', { href: '#/' + n[0], class: active === n[0] ? 'active' : '' , text: n[1] });
      })),
      h('div', { class: 'top-right' },
        h('span', { id: 'save-status', class: 'save-status', text: '保存済み' }),
        h('span', { class: 'local-badge', title: 'データはこのPCのブラウザ内に暗号化して保存され、外部には送信されません', text: '🔒 このPC内のみ' }),
        h('button', { class: 'btn small', type: 'button', text: 'ロック', on: { click: lockNow } }))));
    var main = h('main', { class: 'main' });
    main.appendChild(content);
    app.appendChild(main);
  }

  function lockNow() {
    clearTimeout(S.saveTimer);
    var p = S.state ? Vault.saveJson('state', S.state) : Promise.resolve();
    p.then(function () {
      Vault.lock(); S.state = null; S.tplCache = {};
      location.hash = '';
      renderLock();
    });
  }

  function resetIdle() {
    clearTimeout(S.idleTimer);
    if (!S.state) return;
    var min = parseInt(S.state.settings.autoLockMin, 10);
    if (!min || min <= 0) return;
    S.idleTimer = setTimeout(function () { UI.toast('一定時間操作がなかったためロックしました'); lockNow(); }, min * 60000);
  }
  ['mousemove', 'keydown', 'click', 'touchstart'].forEach(function (ev) { document.addEventListener(ev, function () { if (S.state) resetIdle(); }, { passive: true }); });

  // ======================= ロック画面 =======================
  function renderLock() {
    UI.clear(app);
    Vault.isSetUp().then(function (setUp) {
      var pass = h('input', { type: 'password', id: 'pass', autocomplete: setUp ? 'current-password' : 'new-password', required: true });
      var pass2 = h('input', { type: 'password', id: 'pass2', autocomplete: 'new-password' });
      var err = h('p', { class: 'error-text' });
      var form = h('form', { class: 'lock-card' },
        h('div', { class: 'logo big', text: '特' }),
        h('h1', { text: '特定技能 申請書類作成' }),
        setUp ? h('p', { class: 'muted', text: 'パスワードを入力してロックを解除してください。' })
          : h('div', {},
            h('p', { text: 'はじめにパスワードを設定してください。' }),
            h('ul', { class: 'muted small-list' },
              h('li', { text: '入力したデータとExcelひな形は、このパスワードで暗号化してこのPCにだけ保存されます。' }),
              h('li', { text: 'データが社外やインターネットに送信されることはありません。' }),
              h('li', { text: 'パスワードを忘れるとデータは復元できません。忘れないよう管理してください。' }))),
        h('label', { for: 'pass', text: 'パスワード' + (setUp ? '' : '（8文字以上）') }), pass,
        setUp ? null : h('label', { for: 'pass2', text: 'パスワード（確認）' }), setUp ? null : pass2,
        err,
        h('button', { class: 'btn primary wide', type: 'submit', text: setUp ? 'ロック解除' : '設定してはじめる' }),
        setUp ? h('button', { class: 'btn link', type: 'button', text: 'パスワードを忘れた場合', on: { click: forgot } }) : null);
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        err.textContent = '';
        var btn = form.querySelector('button[type=submit]');
        if (!setUp) {
          if (pass.value.length < 8) { err.textContent = 'パスワードは8文字以上にしてください'; return; }
          if (pass.value !== pass2.value) { err.textContent = '確認用のパスワードが一致しません'; return; }
        }
        btn.disabled = true; btn.textContent = '処理中…';
        (setUp ? Vault.unlock(pass.value) : Vault.setUp(pass.value)).then(function () {
          return Vault.loadJson('state');
        }).then(function (st) {
          S.state = st || emptyState();
          migrate(S.state);
          if (!st) save(true);
          resetIdle();
          if (!location.hash || location.hash === '#') location.hash = '#/cases'; else route();
        }).catch(function (e2) {
          err.textContent = e2.message; btn.disabled = false; btn.textContent = setUp ? 'ロック解除' : '設定してはじめる';
        });
      });
      app.appendChild(h('div', { class: 'lock-wrap' }, form));
      pass.focus();
    });
  }
  function migrate(st) {
    var e = emptyState();
    Object.keys(e).forEach(function (k) { if (st[k] === undefined) st[k] = e[k]; });
    Object.keys(e.settings).forEach(function (k) { if (st.settings[k] === undefined) st.settings[k] = e.settings[k]; });
  }
  function forgot() {
    UI.confirm('すべてのデータを削除', 'パスワードを忘れた場合、保存されているデータを復元する方法はありません。このPCに保存されたすべてのデータ（案件・マスタ・ひな形）を削除して最初からやり直しますか？（バックアップファイルがあれば、新しいパスワード設定後に復元できます）', '削除してやり直す', true)
      .then(function (ok) { if (ok) Vault.wipe().then(renderLock); });
  }

  // ======================= 入力フォーム部品 =======================
  function fieldInput(def, value, onChange) {
    var id = 'f-' + def.key + '-' + Math.random().toString(36).slice(2, 7);
    var input;
    var t = def.type || 'text';
    if (t === 'select') {
      input = h('select', { id: id }, h('option', { value: '', text: '（選択）' }), def.options.map(function (o) { return h('option', { value: o, text: o }); }));
      input.value = value || '';
    } else if (t === 'textarea') {
      input = h('textarea', { id: id, rows: 2, placeholder: def.placeholder || '' });
      input.value = value || '';
    } else if (t === 'combo') {
      var listId = id + '-list';
      input = h('input', { id: id, type: 'text', list: listId, placeholder: def.placeholder || '', autocomplete: 'off' });
      input.value = value || '';
      input = h('span', { class: 'combo' }, input, h('datalist', { id: listId }, def.options.map(function (o) { return h('option', { value: o }); })));
    } else {
      var type = t === 'date' ? 'date' : t === 'time' ? 'time' : 'text';
      input = h('input', { id: id, type: type, placeholder: def.placeholder || '', inputmode: t === 'number' ? 'decimal' : null, autocomplete: 'off' });
      input.value = value || '';
    }
    var el = input.tagName === 'SPAN' ? input.querySelector('input') : input;
    if (def.required) el.setAttribute('aria-required', 'true');
    var msg = h('span', { class: 'field-msg' });
    function check() {
      var v = el.value.trim();
      msg.textContent = '';
      el.classList.remove('invalid');
      if (v && def.pattern && !(new RegExp(def.pattern)).test(v)) { msg.textContent = def.patternMsg; el.classList.add('invalid'); }
      if (v && t === 'number' && isNaN(parseFloat(v.replace(/[,，]/g, '')))) { msg.textContent = '数値を入力してください'; el.classList.add('invalid'); }
    }
    el.addEventListener(t === 'select' ? 'change' : 'input', function () { check(); onChange(el.value); });
    el.addEventListener('change', function () { onChange(el.value); });
    check();
    return h('div', { class: 'field' + (t === 'textarea' ? ' wide' : '') },
      h('label', { for: id }, def.label, def.required ? h('span', { class: 'req', 'aria-hidden': 'true', text: '必須' }) : null),
      input, def.hint ? h('span', { class: 'hint', text: def.hint }) : null, msg);
  }

  function fieldGrid(defs, obj, onChange) {
    var wrap = h('div', {});
    var grid = null;
    defs.forEach(function (def) {
      if (def.group) {
        wrap.appendChild(h('h3', { class: 'group', text: def.group }));
        grid = h('div', { class: 'grid' }); wrap.appendChild(grid); return;
      }
      if (def.type === 'list') { if (!grid) { grid = h('div', { class: 'grid' }); wrap.appendChild(grid); } wrap.appendChild(listEditor(def, obj, onChange)); grid = null; return; }
      if (!grid) { grid = h('div', { class: 'grid' }); wrap.appendChild(grid); }
      grid.appendChild(fieldInput(def, obj[def.key], function (v) { obj[def.key] = v; onChange(); }));
    });
    return wrap;
  }

  function listEditor(def, obj, onChange) {
    obj[def.key] = obj[def.key] || [];
    var rows = obj[def.key];
    var box = h('div', { class: 'list-editor' });
    function render() {
      UI.clear(box);
      var table = h('table', { class: 'table compact' },
        h('thead', {}, h('tr', {}, h('th', { text: '#' }), def.columns.map(function (c) { return h('th', { text: c.label }); }), h('th', {}))),
        h('tbody', {}, rows.map(function (r, i) {
          return h('tr', {}, h('td', { text: String(i + 2) }), def.columns.map(function (c) {
            var inp = h('input', { type: 'text', value: r[c.key] || '', 'aria-label': c.label + ' ' + (i + 2) });
            inp.addEventListener('input', function () { r[c.key] = inp.value; onChange(); });
            return h('td', {}, inp);
          }), h('td', {}, h('button', { class: 'btn small', type: 'button', text: '削除', on: { click: function () { rows.splice(i, 1); onChange(); render(); } } })));
        })));
      box.appendChild(table);
      if (rows.length < def.max) box.appendChild(h('button', { class: 'btn small', type: 'button', text: '＋ 行を追加', on: { click: function () { rows.push({}); onChange(); render(); } } }));
    }
    render();
    return box;
  }

  // ======================= 案件一覧 =======================
  function caseTitle(c) {
    var w = byId(S.state.workers, c.workerId), co = byId(S.state.companies, c.companyId);
    return (w ? (w.name || '（氏名未入力）') : '（外国人未選択）') + ' ／ ' + (co ? (co.name || '（名称未入力）') : '（受入機関未選択）');
  }
  function progressOf(c) {
    var ctx = caseCtx(c);
    var errors = Builder.validate(ctx).filter(function (i) { return i.level === 'error'; }).length;
    return errors;
  }
  function caseCtx(c, entry) {
    return {
      case: c,
      worker: byId(S.state.workers, c.workerId),
      company: byId(S.state.companies, c.companyId),
      support: byId(S.state.supports, c.supportId),
      agent: S.state.agent,
      template: byId(S.state.templates, c.templateId),
      inputs: entry ? entry.inputs : {}
    };
  }

  function casesView() {
    var q = h('input', { type: 'search', placeholder: '氏名・受入機関・メモで検索', class: 'search' });
    var statusSel = h('select', {}, ['すべて', '作成中', '申請済', '許可', '完了'].map(function (s) { return h('option', { value: s, text: s }); }));
    var tbody = h('tbody');
    function render() {
      UI.clear(tbody);
      var kw = q.value.trim().toLowerCase();
      var list = S.state.cases.slice().sort(function (a, b) { return b.updatedAt - a.updatedAt; }).filter(function (c) {
        if (statusSel.value !== 'すべて' && (c.status || '作成中') !== statusSel.value) return false;
        if (!kw) return true;
        return (caseTitle(c) + ' ' + (c.memo || '')).toLowerCase().indexOf(kw) >= 0;
      });
      if (!list.length) tbody.appendChild(h('tr', {}, h('td', { colspan: 6, class: 'empty', text: S.state.cases.length ? '該当する案件がありません' : 'まだ案件がありません。「＋ 新しい案件」から作成してください。' })));
      list.forEach(function (c) {
        var errs = progressOf(c);
        tbody.appendChild(h('tr', {},
          h('td', {}, h('a', { href: '#/case/' + c.id + '/basic', text: caseTitle(c) }), c.memo ? h('div', { class: 'muted small', text: c.memo }) : null),
          h('td', { text: UI.fmtDate((c.schedule || {}).applyDate) || '—' }),
          h('td', {}, h('span', { class: 'status s-' + (c.status || '作成中'), text: c.status || '作成中' })),
          h('td', {}, errs ? h('span', { class: 'pill warn', text: '未入力 ' + errs }) : h('span', { class: 'pill ok', text: '入力完了' })),
          h('td', { class: 'muted', text: UI.fmtDateTime(c.updatedAt) }),
          h('td', { class: 'actions' },
            h('a', { class: 'btn small', href: '#/case/' + c.id + '/output', text: 'Excel出力' }),
            h('button', { class: 'btn small', type: 'button', text: '複製', title: '同じ受入機関で別の外国人の案件を作る', on: { click: function () { duplicateCase(c); } } }),
            h('button', { class: 'btn small danger-text', type: 'button', text: '削除', on: { click: function () { deleteCase(c); } } }))));
      });
    }
    q.addEventListener('input', render);
    statusSel.addEventListener('change', render);
    render();
    var noTpl = !S.state.templates.length;
    return h('section', {},
      h('div', { class: 'page-head' }, h('h1', { text: '案件' }),
        h('button', { class: 'btn primary', type: 'button', text: '＋ 新しい案件', on: { click: newCaseDialog } })),
      noTpl ? h('div', { class: 'notice' }, 'はじめに ', h('a', { href: '#/templates', text: '「ひな形（Excel）」' }), ' で申請書類のExcelを登録してください。') : null,
      h('div', { class: 'toolbar' }, q, statusSel),
      h('table', { class: 'table' },
        h('thead', {}, h('tr', {}, ['外国人 ／ 受入機関', '申請日', '状況', 'チェック', '更新日時', ''].map(function (t) { return h('th', { text: t }); }))),
        tbody));
  }

  function masterSelect(kind, value, allowNone) {
    var K = KINDS[kind];
    var sel = h('select', {}, h('option', { value: '', text: allowNone ? '（なし）' : '（選択してください）' }),
      S.state[K.list].map(function (o) { return h('option', { value: o.id, text: K.nameOf(o) }); }),
      h('option', { value: '__new', text: '＋ 新しく登録する' }));
    sel.value = value || '';
    return sel;
  }
  function templateSelect(value) {
    var sel = h('select', {}, S.state.templates.map(function (t) { return h('option', { value: t.id, text: t.name }); }));
    if (value) sel.value = value;
    return sel;
  }

  function newCaseDialog() {
    if (!S.state.templates.length) { UI.toast('先に「ひな形（Excel）」を登録してください', 'error'); location.hash = '#/templates'; return; }
    var w = masterSelect('worker'), co = masterSelect('company'), su = masterSelect('support', null, true);
    var tp = templateSelect(S.state.settings.activeTemplateId);
    var carry = h('input', { type: 'checkbox', checked: true });
    var body = h('div', { class: 'form-stack' },
      h('label', { text: '外国人（申請人）' }), w,
      h('label', { text: '受入機関' }), co,
      h('label', { text: '登録支援機関' }), su,
      h('label', { text: '使用するひな形' }), tp,
      h('label', { class: 'check-row' }, carry, ' 同じ受入機関の直近の案件から、給与・労働条件・様式ごとの入力内容を引き継ぐ'),
      h('p', { class: 'muted small', text: '「＋ 新しく登録する」を選ぶと、案件の作成後にその登録画面が開きます。' }));
    UI.modal('新しい案件', body, [
      { label: 'キャンセル' },
      { label: '作成する', primary: true, onClick: function () {
        var c = {
          id: UI.uid(), status: '作成中', createdAt: now(), updatedAt: now(), templateId: tp.value,
          workerId: null, companyId: null, supportId: null,
          schedule: {}, labor: {}, salary: { payType: '月給', allowances: [], deductions: {}, otherDeductions: [] }, sheetValues: {}
        };
        var goto = null;
        function resolve(sel, kind, field) {
          if (sel.value === '__new') { var o = newMaster(kind); c[field] = o.id; if (!goto) goto = '#/' + kind + '/' + o.id; }
          else c[field] = sel.value || null;
        }
        resolve(w, 'worker', 'workerId'); resolve(co, 'company', 'companyId'); resolve(su, 'support', 'supportId');
        applyCarryOver(c, carry.checked);
        S.state.cases.push(c);
        save(true);
        location.hash = goto || '#/case/' + c.id + '/basic';
      } }
    ]);
  }

  function applyCarryOver(c, carry) {
    var company = byId(S.state.companies, c.companyId);
    var prev = null;
    if (carry && c.companyId) {
      S.state.cases.forEach(function (x) { if (x.companyId === c.companyId && x.id !== c.id && (!prev || x.updatedAt > prev.updatedAt)) prev = x; });
    }
    if (prev) {
      c.labor = JSON.parse(JSON.stringify(prev.labor || {}));
      c.salary = JSON.parse(JSON.stringify(prev.salary || {}));
      c.sheetValues = JSON.parse(JSON.stringify(prev.sheetValues || {}));
      var ps = prev.schedule || {};
      ['port', 'stayPeriod', 'agencyName', 'agencyFee', 'jpSalary'].forEach(function (k) { if (ps[k]) c.schedule[k] = ps[k]; });
      if (!c.supportId) c.supportId = prev.supportId;
      UI.toast('「' + caseTitle(prev) + '」から内容を引き継ぎました');
    } else if (company) {
      ['holidays', 'startTime', 'endTime', 'breakMin'].forEach(function (k) { if (company[k]) c.labor[k] = company[k]; });
    }
  }

  function duplicateCase(c) {
    var copy = JSON.parse(JSON.stringify(c));
    copy.id = UI.uid(); copy.createdAt = now(); copy.updatedAt = now(); copy.status = '作成中';
    copy.workerId = null;
    ['entryDate', 'contractDate', 'employStart', 'supportContractDate', 'applyDate', 'docDate'].forEach(function (k) { delete copy.schedule[k]; });
    copy.memo = '';
    S.state.cases.push(copy);
    save(true);
    UI.toast('案件を複製しました。外国人を選択してください');
    location.hash = '#/case/' + copy.id + '/basic';
  }
  function deleteCase(c) {
    UI.confirm('案件を削除', '「' + caseTitle(c) + '」を削除します。元に戻せません。', '削除する', true).then(function (ok) {
      if (!ok) return;
      S.state.cases = S.state.cases.filter(function (x) { return x.id !== c.id; });
      save(true); route();
    });
  }

  // ======================= 案件編集 =======================
  var CASE_TABS = [['basic', '1. 紐付け'], ['schedule', '2. 日程・入国'], ['salary', '3. 給与・労働条件'], ['sheets', '4. 様式ごとの入力'], ['output', '5. チェック・Excel出力']];

  function caseView(id, tab) {
    var c = byId(S.state.cases, id);
    if (!c) return h('section', {}, h('p', { text: '案件が見つかりません。' }), h('a', { href: '#/cases', text: '案件一覧へ' }));
    tab = tab || 'basic';
    function touch() { c.updatedAt = now(); save(); }
    var body = h('div', { class: 'tab-body' });
    var head = h('div', { class: 'page-head' },
      h('div', {}, h('a', { href: '#/cases', class: 'back', text: '← 案件一覧' }), h('h1', { text: caseTitle(c) })),
      h('a', { class: 'btn primary', href: '#/case/' + c.id + '/output', text: 'Excelを出力' }));
    var tabs = h('div', { class: 'tabs', role: 'tablist' }, CASE_TABS.map(function (t) {
      return h('a', { href: '#/case/' + c.id + '/' + t[0], class: t[0] === tab ? 'active' : '', role: 'tab', text: t[1] });
    }));
    if (tab === 'basic') body.appendChild(caseBasic(c, touch));
    else if (tab === 'schedule') body.appendChild(h('div', { class: 'card' }, fieldGrid(F.schedule, c.schedule, touch)));
    else if (tab === 'salary') body.appendChild(caseSalary(c, touch));
    else if (tab === 'sheets') body.appendChild(caseSheets(c, touch));
    else if (tab === 'output') body.appendChild(caseOutput(c, touch));
    return h('section', {}, head, tabs, body);
  }

  function masterSummary(kind, obj) {
    var K = KINDS[kind];
    if (!obj) return h('div', { class: 'muted', text: '未選択' });
    var missing = K.fields.filter(function (d) { return d.required && Builder.isEmpty(obj[d.key]); }).length;
    return h('div', { class: 'summary' },
      h('strong', { text: K.nameOf(obj) }), ' ', h('span', { class: 'muted', text: K.sub(obj) }), ' ',
      missing ? h('span', { class: 'pill warn', text: '必須未入力 ' + missing }) : h('span', { class: 'pill ok', text: 'OK' }), ' ',
      h('a', { href: '#/' + kind + '/' + obj.id, text: '内容を確認・編集' }));
  }

  function caseBasic(c, touch) {
    var card = h('div', { class: 'card' });
    function row(kind, field, label, allowNone) {
      var sel = masterSelect(kind, c[field], allowNone);
      var sum = h('div');
      function refresh() { UI.clear(sum).appendChild(masterSummary(kind, byId(S.state[KINDS[kind].list], c[field]))); }
      sel.addEventListener('change', function () {
        if (sel.value === '__new') { var o = newMaster(kind); c[field] = o.id; touch(); location.hash = '#/' + kind + '/' + o.id; return; }
        c[field] = sel.value || null;
        if (field === 'companyId' && sel.value) {
          var co = byId(S.state.companies, sel.value);
          ['holidays', 'startTime', 'endTime', 'breakMin'].forEach(function (k) { if (co[k] && !c.labor[k]) c.labor[k] = co[k]; });
        }
        touch(); refresh();
      });
      refresh();
      return h('div', { class: 'link-row' }, h('label', { text: label }), sel, sum);
    }
    var status = h('select', {}, ['作成中', '申請済', '許可', '完了'].map(function (s) { return h('option', { value: s, text: s }); }));
    status.value = c.status || '作成中';
    status.addEventListener('change', function () { c.status = status.value; touch(); });
    var tp = templateSelect(c.templateId);
    tp.addEventListener('change', function () { c.templateId = tp.value; touch(); });
    var memo = h('textarea', { rows: 3, placeholder: '社内メモ（Excelには出力されません）' });
    memo.value = c.memo || '';
    memo.addEventListener('input', function () { c.memo = memo.value; touch(); });
    card.appendChild(row('worker', 'workerId', '外国人（申請人）'));
    card.appendChild(row('company', 'companyId', '受入機関'));
    card.appendChild(row('support', 'supportId', '登録支援機関', true));
    card.appendChild(h('div', { class: 'link-row' }, h('label', { text: 'ひな形' }), tp));
    card.appendChild(h('div', { class: 'link-row' }, h('label', { text: '状況' }), status));
    card.appendChild(h('div', { class: 'link-row' }, h('label', { text: 'メモ' }), memo));
    return card;
  }

  function caseSalary(c, touch) {
    c.salary = c.salary || {};
    var sal = c.salary;
    sal.allowances = sal.allowances || [];
    sal.deductions = sal.deductions || {};
    sal.otherDeductions = sal.otherDeductions || [];
    var calcBox = h('div', { class: 'calc-panel' });
    function update() { touch(); renderCalc(); }
    function renderCalc() {
      var r = Calc.compute(c);
      UI.clear(calcBox);
      calcBox.appendChild(h('h3', { text: '自動計算（Excelの計算式と同じ）' }));
      var rows = [
        ['1日の労働時間', r.dailyHours !== null ? r.dailyHours.toFixed(2) + ' 時間' : '—'],
        ['年間労働時間', r.annualHours !== null ? r.annualHours + ' 時間' : '—'],
        ['週平均 / 月平均', r.annualHours !== null ? r.weeklyHours + ' 時間 / ' + r.monthlyHours + ' 時間' : '—'],
        ['月給換算（基本給）', UI.yen(r.monthlyBase)],
        ['月給 a（固定支給を含む）', UI.yen(r.monthlyA)],
        ['月給 b（住宅・通勤手当を除く）', UI.yen(r.monthlyB)],
        ['月給 c（総額）', UI.yen(r.monthlyC)],
        ['時給換算（固定支給を含む）', r.hourly !== null ? r.hourly.toLocaleString('ja-JP') + ' 円' : '—'],
        ['控除合計', UI.yen(r.deductionTotal)],
        ['手取り額', UI.yen(r.takeHome)]
      ];
      calcBox.appendChild(h('dl', { class: 'calc' }, rows.map(function (x) { return [h('dt', { text: x[0] }), h('dd', { text: x[1] })]; })));
      if (r.warnings.length) calcBox.appendChild(h('ul', { class: 'warn-list' }, r.warnings.map(function (w) { return h('li', { text: w }); })));
    }
    var left = h('div', { class: 'card' });
    left.appendChild(h('h3', { class: 'group', text: '労働時間' }));
    left.appendChild(fieldGrid(F.labor, c.labor = c.labor || {}, update));
    left.appendChild(h('h3', { class: 'group', text: '賃金' }));
    left.appendChild(fieldGrid(F.salary, sal, update));

    left.appendChild(h('h3', { class: 'group', text: '手当（最大5件）' }));
    var allowTable = h('table', { class: 'table compact' },
      h('thead', {}, h('tr', {}, ['#', '手当の内容', '月額（円）', '区分'].map(function (t) { return h('th', { text: t }); }))),
      h('tbody', {}, F.allowanceCells.map(function (_, i) {
        var a = sal.allowances[i] = sal.allowances[i] || {};
        var nm = h('input', { type: 'text', value: a.name || '', placeholder: i === 0 ? '住宅手当' : '', 'aria-label': '手当' + (i + 1) + ' 内容' });
        var am = h('input', { type: 'text', inputmode: 'decimal', value: a.amount || '', 'aria-label': '手当' + (i + 1) + ' 月額' });
        var kd = h('select', { 'aria-label': '手当' + (i + 1) + ' 区分' }, h('option', { value: '', text: '（区分）' }), F.allowanceKinds.map(function (k) { return h('option', { value: String(k.value), text: k.label }); }));
        kd.value = a.kind ? String(a.kind) : '';
        nm.addEventListener('input', function () { a.name = nm.value; update(); });
        am.addEventListener('input', function () { a.amount = am.value; update(); });
        kd.addEventListener('change', function () { a.kind = kd.value; update(); });
        return h('tr', {}, h('td', { text: String(i + 1) }), h('td', {}, nm), h('td', {}, am), h('td', {}, kd));
      })));
    left.appendChild(allowTable);

    left.appendChild(h('h3', { class: 'group', text: '控除（月額・円）' }));
    left.appendChild(fieldGrid(F.deductions.map(function (d) { return Object.assign({ type: 'number' }, d); }), sal.deductions, update));
    var odTable = h('table', { class: 'table compact' },
      h('thead', {}, h('tr', {}, ['#', 'その他控除の内容', '月額（円）'].map(function (t) { return h('th', { text: t }); }))),
      h('tbody', {}, F.otherDeductionCells.map(function (_, i) {
        var o = sal.otherDeductions[i] = sal.otherDeductions[i] || {};
        var nm = h('input', { type: 'text', value: o.name || '', 'aria-label': 'その他控除' + (i + 1) + ' 内容' });
        var am = h('input', { type: 'text', inputmode: 'decimal', value: o.amount || '', 'aria-label': 'その他控除' + (i + 1) + ' 月額' });
        nm.addEventListener('input', function () { o.name = nm.value; update(); });
        am.addEventListener('input', function () { o.amount = am.value; update(); });
        return h('tr', {}, h('td', { text: String(i + 1) }), h('td', {}, nm), h('td', {}, am));
      })));
    left.appendChild(odTable);
    renderCalc();
    return h('div', { class: 'two-col' }, left, h('aside', { class: 'sticky' }, calcBox));
  }

  // ---------- 様式ごとの入力欄（ひな形の黄色セル） ----------
  function sheetEditor(entry, opts) {
    var wrap = h('div', { class: 'sheet-editor' });
    if (!entry.sheets.length) { wrap.appendChild(h('p', { class: 'muted', text: '個別に入力する欄はありません。' })); return wrap; }
    var sheetSel = h('select', { 'aria-label': 'シート' }, entry.sheets.map(function (sh) {
      return h('option', { value: sh.key, text: sh.name.trim() + '（' + entry.inputs[sh.key].length + '欄）' });
    }));
    if (opts.initialSheet && entry.inputs[opts.initialSheet]) sheetSel.value = opts.initialSheet;
    var q = h('input', { type: 'search', placeholder: '項目名・値・セル番地で絞り込み', class: 'search' });
    var onlyFilled = h('input', { type: 'checkbox', checked: true });
    var listEl = h('div');
    var limit = 150;
    function render() {
      var sk = sheetSel.value;
      var items = entry.inputs[sk];
      var kw = q.value.trim().toLowerCase();
      var shown = items.filter(function (x) {
        var cur = opts.get(sk, x.cell), base = opts.base(sk, x);
        if (onlyFilled.checked && Builder.isEmpty(cur) && Builder.isEmpty(base) && !x.formula && x.kind !== 'check' && x.kind !== 'select') return false;
        if (!kw) return true;
        return (x.cell + ' ' + x.label + ' ' + x.section + ' ' + (cur || '') + ' ' + (base || '')).toLowerCase().indexOf(kw) >= 0;
      });
      UI.clear(listEl);
      listEl.appendChild(h('p', { class: 'muted small', text: shown.length + ' 欄を表示中（全 ' + items.length + ' 欄）。セル番地はExcelの位置です。' }));
      var tbody = h('tbody');
      shown.slice(0, limit).forEach(function (x) { tbody.appendChild(cellRow(sk, x)); });
      listEl.appendChild(h('table', { class: 'table compact cells' },
        h('thead', {}, h('tr', {}, ['セル', '項目（Excelの見出しから推定）', '入力', opts.baseLabel, ''].map(function (t) { return h('th', { text: t }); }))), tbody));
      if (shown.length > limit) listEl.appendChild(h('button', { class: 'btn', type: 'button', text: 'さらに表示（残り ' + (shown.length - limit) + ' 欄）', on: { click: function () { limit += 300; render(); } } }));
    }
    function cellRow(sk, x) {
      var cur = opts.get(sk, x.cell);
      var base = opts.base(sk, x);
      var overridden = cur !== undefined;
      var val = overridden ? cur : base;
      var input;
      if (x.options) {
        input = h('select', {}, h('option', { value: '', text: '（空欄）' }), x.options.map(function (o) { return h('option', { value: o, text: o }); }));
        if (val && x.options.indexOf(val) < 0) input.appendChild(h('option', { value: val, text: val }));
        input.value = val || '';
      } else if (x.kind === 'date' || x.kind === 'time') {
        input = h('input', { type: x.kind });
        input.value = val || '';
      } else if (String(val || '').length > 40 || /\n/.test(val || '')) {
        input = h('textarea', { rows: 2 }); input.value = val || '';
      } else {
        input = h('input', { type: 'text' }); input.value = val || '';
        if (x.formula && !overridden) input.placeholder = '（自動計算: =' + x.formula.slice(0, 40) + '）';
      }
      input.setAttribute('aria-label', x.cell + ' ' + x.label);
      if (x.formula && !overridden) input.value = '';
      var reset = h('button', { class: 'btn small', type: 'button', title: opts.baseLabel + 'に戻す', text: '↺' });
      reset.disabled = !overridden;
      var tr = h('tr', { class: overridden ? 'overridden' : '' },
        h('td', { class: 'mono', text: x.cell }),
        h('td', {}, x.section ? h('div', { class: 'muted small', text: x.section }) : null, h('div', { text: x.label || '（見出しなし）' })),
        h('td', {}, input),
        h('td', { class: 'muted small base-val', text: x.formula ? '数式: =' + x.formula.slice(0, 50) : (base || '') }),
        h('td', {}, reset));
      input.addEventListener(input.tagName === 'SELECT' ? 'change' : 'input', function () {
        opts.set(sk, x.cell, input.value);
        tr.classList.add('overridden'); reset.disabled = false;
      });
      reset.addEventListener('click', function () { opts.set(sk, x.cell, undefined); render(); });
      return tr;
    }
    sheetSel.addEventListener('change', function () { limit = 150; if (opts.onSheet) opts.onSheet(sheetSel.value); render(); });
    q.addEventListener('input', function () { limit = 150; render(); });
    onlyFilled.addEventListener('change', render);
    var tools = h('div', { class: 'toolbar' }, sheetSel, q, h('label', { class: 'check-row' }, onlyFilled, ' 値のある欄・選択欄のみ'));
    if (opts.extraTools) tools.appendChild(opts.extraTools(function () { return sheetSel.value; }, render));
    wrap.appendChild(tools);
    wrap.appendChild(listEl);
    render();
    return wrap;
  }

  function caseSheets(c, touch) {
    var box = h('div', { class: 'card' }, h('p', { class: 'muted', text: '読み込み中…' }));
    getTemplate(c.templateId).then(function (entry) {
      UI.clear(box);
      if (!entry) { box.appendChild(h('p', { text: 'ひな形が見つかりません。「1. 紐付け」でひな形を選択してください。' })); return; }
      var meta = byId(S.state.templates, c.templateId);
      c.sheetValues = c.sheetValues || {};
      box.appendChild(h('p', { class: 'muted', text: 'マスタや給与の画面で入力した項目は自動で書き込まれるため、ここには表示されません。ここでは各様式に直接入力する欄（チェック欄・説明文など）を入力します。黄色背景の行は、この案件で変更した欄です。' }));
      box.appendChild(sheetEditor(entry, {
        baseLabel: 'ひな形の既定値',
        initialSheet: S.lastSheet,
        onSheet: function (sk) { S.lastSheet = sk; },
        get: function (sk, cell) { return (c.sheetValues[sk] || {})[cell]; },
        base: function (sk, x) { var d = (meta.defaults[sk] || {})[x.cell]; return d !== undefined ? d : x.value; },
        set: function (sk, cell, v) {
          c.sheetValues[sk] = c.sheetValues[sk] || {};
          if (v === undefined) delete c.sheetValues[sk][cell]; else c.sheetValues[sk][cell] = v;
          touch();
        }
      }));
    });
    return box;
  }

  function caseOutput(c, touch) {
    var box = h('div', {});
    var issuesBox = h('div', { class: 'card' }, h('p', { class: 'muted', text: 'チェック中…' }));
    box.appendChild(issuesBox);
    getTemplate(c.templateId).then(function (entry) {
      var ctx = caseCtx(c, entry);
      var issues = Builder.validate(ctx);
      if (!entry) issues.unshift({ level: 'error', area: 'ひな形', msg: 'ひな形が選択されていません', link: 'basic' });
      var meta = byId(S.state.templates, c.templateId);
      UI.clear(issuesBox);
      var errors = issues.filter(function (i) { return i.level === 'error'; });
      issuesBox.appendChild(h('h3', { text: errors.length ? '未入力・要確認の項目があります' : (issues.length ? '確認事項があります' : 'チェックOK') }));
      if (!issues.length) issuesBox.appendChild(h('p', { class: 'ok-text', text: '必須項目はすべて入力されています。' }));
      issuesBox.appendChild(h('ul', { class: 'issues' }, issues.map(function (i) {
        var href = i.link ? (i.link.charAt(0) === '#' ? i.link : '#/case/' + c.id + '/' + i.link) : null;
        return h('li', { class: i.level }, h('span', { class: 'pill ' + (i.level === 'error' ? 'err' : 'warn'), text: i.level === 'error' ? '必須' : '確認' }), ' [' + i.area + '] ' + i.msg, href ? [' ', h('a', { href: href, text: '入力する' })] : null);
      })));
      // ひな形の既定値がそのまま使われる欄
      if (entry && meta) {
        var residual = 0;
        Object.keys(entry.inputs).forEach(function (sk) {
          entry.inputs[sk].forEach(function (x) {
            if (x.formula || x.kind === 'check' || x.kind === 'select') return;
            if ((c.sheetValues[sk] || {})[x.cell] !== undefined) return;
            var d = (meta.defaults[sk] || {})[x.cell];
            var v = d !== undefined ? d : x.value;
            if (!Builder.isEmpty(v)) residual++;
          });
        });
        if (residual) issuesBox.appendChild(h('p', { class: 'notice' }, 'ひな形の既定値がそのまま出力される欄が ' + residual + ' 欄あります。前の案件の情報が残っていないか ', h('a', { href: '#/case/' + c.id + '/sheets', text: '「4. 様式ごとの入力」' }), ' で確認してください。'));
      }
      var strip = h('input', { type: 'checkbox', checked: S.state.settings.stripMetadata !== false });
      var btn = h('button', { class: 'btn primary big', type: 'button', text: 'Excelファイルを出力' });
      btn.disabled = !entry;
      btn.addEventListener('click', function () {
        var w = ctx.worker || {};
        var name = [(c.schedule || {}).applyDate || new Date().toISOString().slice(0, 10), (w.name || '未入力'), '特定技能申請書類'].join('_').replace(/[\\/:*?"<>|\s]+/g, '_') + '.xlsx';
        var missingSheets = [], skippedCells = [];
        btn.disabled = true; btn.textContent = '作成中…';
        UI.saveFile(name, 'Excel ブック', { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }, function () {
          var writes = Builder.build(caseCtx(c, entry));
          return entry.tpl.exportFilled(writes, { stripMetadata: strip.checked }).then(function (res) {
            missingSheets = res.missingSheets; skippedCells = res.skippedCells;
            return res.blob;
          });
        }).then(function (saved) {
          if (!saved) return;
          c.exportedAt = now(); touch();
          UI.toast('出力しました。個人情報を含むため、保存先・送付先に注意してください。');
          if (missingSheets.length) UI.toast('ひな形に見つからないシートがありました: ' + missingSheets.join('、'), 'error');
          if (skippedCells.length) UI.toast('数式を保護するため書き込まなかった欄があります: ' + skippedCells.join('、'), 'error');
        }).catch(function (e) { UI.toast('出力に失敗しました: ' + e.message, 'error'); })
          .then(function () { btn.disabled = false; btn.textContent = 'Excelファイルを出力'; });
      });
      box.appendChild(h('div', { class: 'card' },
        h('h3', { text: 'Excel出力' }),
        h('p', { text: '登録したひな形に入力内容を書き込んだExcelファイルを作成します。様式のレイアウトはひな形のまま保持され、開いたときにExcelが全シートを再計算します。' }),
        h('label', { class: 'check-row' }, strip, ' ファイルの作成者情報（PC名など）とアドインの参照を取り除く'),
        errors.length ? h('p', { class: 'muted', text: '未入力の項目があっても出力はできます（該当欄は空欄になります）。' }) : null,
        btn,
        c.exportedAt ? h('p', { class: 'muted small', text: '前回の出力: ' + UI.fmtDateTime(c.exportedAt) }) : null,
        h('p', { class: 'muted small', text: '印刷・PDF化はExcelで行ってください（各シートの印刷範囲はひな形の設定どおりです）。' })));
    });
    return box;
  }

  // ======================= マスタ =======================
  function newMaster(kind) {
    var o = { id: UI.uid(), createdAt: now(), updatedAt: now() };
    if (kind === 'company') o.officers = [];
    S.state[KINDS[kind].list].push(o);
    save(true);
    return o;
  }
  function masterListView(kind) {
    var K = KINDS[kind];
    var q = h('input', { type: 'search', placeholder: '検索', class: 'search' });
    var tbody = h('tbody');
    function usage(o) {
      var f = kind === 'worker' ? 'workerId' : kind === 'company' ? 'companyId' : 'supportId';
      return S.state.cases.filter(function (c) { return c[f] === o.id; }).length;
    }
    function render() {
      UI.clear(tbody);
      var kw = q.value.trim().toLowerCase();
      var list = S.state[K.list].filter(function (o) { return !kw || (K.nameOf(o) + ' ' + K.sub(o)).toLowerCase().indexOf(kw) >= 0; });
      if (!list.length) tbody.appendChild(h('tr', {}, h('td', { colspan: 4, class: 'empty', text: 'まだ登録がありません。' })));
      list.forEach(function (o) {
        var missing = K.fields.filter(function (d) { return d.required && Builder.isEmpty(o[d.key]); }).length;
        tbody.appendChild(h('tr', {},
          h('td', {}, h('a', { href: '#/' + kind + '/' + o.id, text: K.nameOf(o) }), h('div', { class: 'muted small', text: K.sub(o) })),
          h('td', {}, missing ? h('span', { class: 'pill warn', text: '必須未入力 ' + missing }) : h('span', { class: 'pill ok', text: 'OK' })),
          h('td', { class: 'muted', text: usage(o) + ' 件の案件' }),
          h('td', { class: 'actions' }, h('button', { class: 'btn small danger-text', type: 'button', text: '削除', on: { click: function () {
            if (usage(o)) { UI.toast('案件で使用中のため削除できません', 'error'); return; }
            UI.confirm('削除', '「' + K.nameOf(o) + '」を削除します。元に戻せません。', '削除する', true).then(function (ok) {
              if (!ok) return;
              S.state[K.list] = S.state[K.list].filter(function (x) { return x.id !== o.id; });
              save(true); render();
            });
          } } }))));
      });
    }
    q.addEventListener('input', render);
    render();
    return h('section', {},
      h('div', { class: 'page-head' }, h('h1', { text: K.title }),
        h('button', { class: 'btn primary', type: 'button', text: '＋ 新規登録', on: { click: function () { var o = newMaster(kind); location.hash = '#/' + kind + '/' + o.id; } } })),
      h('p', { class: 'muted', text: kind === 'worker' ? '一度登録すれば、複数の案件（認定・変更・更新など）で使い回せます。' : '一度登録すれば、この機関のすべての案件に自動で反映されます。' }),
      h('div', { class: 'toolbar' }, q),
      h('table', { class: 'table' }, h('thead', {}, h('tr', {}, ['名称', '入力状況', '使用', ''].map(function (t) { return h('th', { text: t }); }))), tbody));
  }
  function masterEditView(kind, id) {
    var K = KINDS[kind];
    var o = byId(S.state[K.list], id);
    if (!o) return h('section', {}, h('p', { text: '見つかりません。' }));
    var title = h('h1', { text: K.nameOf(o) });
    var form = fieldGrid(K.fields, o, function () { o.updatedAt = now(); title.textContent = K.nameOf(o); save(); });
    var related = S.state.cases.filter(function (c) { return c[kind + 'Id'] === o.id; });
    return h('section', {},
      h('div', { class: 'page-head' }, h('div', {}, h('a', { href: '#/' + K.list, class: 'back', text: '← ' + K.title + '一覧' }), title)),
      related.length ? h('div', { class: 'notice' }, 'この内容は ' + related.length + ' 件の案件に反映されます: ',
        related.slice(0, 5).map(function (c, i) { return [i ? '、' : '', h('a', { href: '#/case/' + c.id + '/basic', text: caseTitle(c) })]; })) : null,
      h('div', { class: 'card' }, form));
  }

  // ======================= ひな形 =======================
  function templatesView() {
    var list = h('tbody');
    S.state.templates.forEach(function (t) {
      var active = S.state.settings.activeTemplateId === t.id;
      list.appendChild(h('tr', {},
        h('td', {}, h('a', { href: '#/template/' + t.id, text: t.name }), active ? h('span', { class: 'pill ok', text: '既定' }) : null,
          h('div', { class: 'muted small', text: t.fileName + '（' + Math.round(t.size / 1024) + ' KB）' })),
        h('td', { class: 'muted', text: UI.fmtDateTime(t.uploadedAt) }),
        h('td', { class: 'actions' },
          active ? null : h('button', { class: 'btn small', type: 'button', text: '既定にする', on: { click: function () { S.state.settings.activeTemplateId = t.id; save(true); route(); } } }),
          h('a', { class: 'btn small', href: '#/template/' + t.id, text: '既定値を編集' }),
          h('button', { class: 'btn small danger-text', type: 'button', text: '削除', on: { click: function () {
            if (S.state.cases.some(function (c) { return c.templateId === t.id; })) { UI.toast('案件で使用中のため削除できません', 'error'); return; }
            UI.confirm('ひな形を削除', '「' + t.name + '」を削除します。', '削除する', true).then(function (ok) {
              if (!ok) return;
              Vault.removeBinary('tpl-' + t.id);
              delete S.tplCache[t.id];
              S.state.templates = S.state.templates.filter(function (x) { return x.id !== t.id; });
              if (S.state.settings.activeTemplateId === t.id) S.state.settings.activeTemplateId = S.state.templates[0] ? S.state.templates[0].id : null;
              save(true); route();
            });
          } } }))));
    });
    if (!S.state.templates.length) list.appendChild(h('tr', {}, h('td', { colspan: 3, class: 'empty', text: 'まだひな形が登録されていません。' })));
    return h('section', {},
      h('div', { class: 'page-head' }, h('h1', { text: 'ひな形（Excel）' }),
        h('button', { class: 'btn primary', type: 'button', text: '＋ Excelを登録', on: { click: uploadTemplate } })),
      h('div', { class: 'card' },
        h('p', { text: '社内で使っている申請書類のExcel（「データ（★）」シートがあるもの）を登録します。出力時は、このExcelの黄色い入力欄に案件の内容を書き込みます。' }),
        h('ul', { class: 'muted small-list' },
          h('li', { text: '登録したExcelは暗号化してこのPCのブラウザ内にだけ保存されます。アップロード（送信）はされません。' }),
          h('li', { text: '様式が改訂されたら、新しいExcelを登録して「既定」にしてください。古い案件は元のひな形のまま出力できます。' }))),
      h('table', { class: 'table' }, h('thead', {}, h('tr', {}, ['名前', '登録日時', ''].map(function (t) { return h('th', { text: t }); }))), list));
  }

  function templateEditView(id) {
    var meta = byId(S.state.templates, id);
    if (!meta) return h('section', {}, h('p', { text: '見つかりません。' }));
    var box = h('div', { class: 'card' }, h('p', { class: 'muted', text: '読み込み中…' }));
    var nameInput = h('input', { type: 'text', value: meta.name });
    nameInput.addEventListener('input', function () { meta.name = nameInput.value; save(); });
    getTemplate(id).then(function (entry) {
      UI.clear(box);
      if (!entry) { box.appendChild(h('p', { text: 'ひな形を読み込めませんでした。' })); return; }
      var res = residualBySheet(entry, meta);
      box.appendChild(h('p', { class: 'muted', text: 'ここで設定した値は、このひな形を使うすべての案件の初期値になります（案件ごとに上書きできます）。毎回同じ定型文はここに入れ、前の案件の個人情報は空にしてください。' }));
      if (res.length) box.appendChild(h('p', { class: 'notice', text: '値が入っている欄があるシート: ' + res.map(function (r) { return r.sheet.name.trim() + '（' + r.count + '）'; }).join('、') }));
      box.appendChild(sheetEditor(entry, {
        baseLabel: '元のExcelの値',
        get: function (sk, cell) { return (meta.defaults[sk] || {})[cell]; },
        base: function (sk, x) { return x.value; },
        set: function (sk, cell, v) {
          meta.defaults[sk] = meta.defaults[sk] || {};
          if (v === undefined) delete meta.defaults[sk][cell]; else meta.defaults[sk][cell] = v;
          save();
        },
        extraTools: function (getSheet, rerender) {
          return h('button', { class: 'btn small', type: 'button', text: 'このシートの黄色欄を空にする', on: { click: function () {
            clearSheetDefaults(meta, entry, getSheet()); save(true); rerender(); UI.toast('空にしました（数式・チェック欄・選択欄はそのままです）');
          } } });
        }
      }));
    });
    return h('section', {},
      h('div', { class: 'page-head' }, h('div', {}, h('a', { href: '#/templates', class: 'back', text: '← ひな形一覧' }), h('h1', { text: 'ひな形の既定値' }))),
      h('div', { class: 'card' }, h('div', { class: 'field' }, h('label', { text: 'ひな形の名前' }), nameInput)),
      box);
  }

  // ======================= 設定 =======================
  function settingsView() {
    var st = S.state.settings;
    var agentCard = h('div', { class: 'card' }, h('h3', { text: '取次者（申請人等作成用３の「※取次者」欄）' }),
      h('p', { class: 'muted small', text: '自社で取次を行う場合に入力します。すべての案件に反映されます。' }),
      fieldGrid(F.agent, S.state.agent, function () { save(); }));
    var lockMin = h('input', { type: 'number', min: 0, max: 240, value: st.autoLockMin });
    lockMin.addEventListener('change', function () { st.autoLockMin = parseInt(lockMin.value, 10) || 0; save(); resetIdle(); });
    var strip = h('input', { type: 'checkbox', checked: st.stripMetadata !== false });
    strip.addEventListener('change', function () { st.stripMetadata = strip.checked; save(); });

    var securityCard = h('div', { class: 'card' }, h('h3', { text: 'セキュリティ' }),
      h('div', { class: 'field' }, h('label', { text: '自動ロックまでの時間（分。0で無効）' }), lockMin),
      h('label', { class: 'check-row' }, strip, ' Excel出力時に作成者情報（PC名など）を取り除く（既定）'),
      h('div', { class: 'btn-row' }, h('button', { class: 'btn', type: 'button', text: 'パスワードを変更', on: { click: changePassword } })));

    var backupCard = h('div', { class: 'card' }, h('h3', { text: 'バックアップ・引き継ぎ' }),
      h('p', { class: 'muted small', text: 'データはこのPCのブラウザ内にだけ保存されています。PCの故障やブラウザのデータ削除に備えて、定期的にバックアップしてください。バックアップファイルはパスワードで暗号化され、社内の決められた場所に保存してください。' }),
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn', type: 'button', text: 'バックアップを作成', on: { click: makeBackup } }),
        h('button', { class: 'btn', type: 'button', text: 'バックアップから復元', on: { click: restoreBackup } })));

    var dangerCard = h('div', { class: 'card danger-zone' }, h('h3', { text: 'データの全削除' }),
      h('p', { class: 'muted small', text: 'PCを返却・廃棄する場合などに、このPCに保存されたすべてのデータを削除します。' }),
      h('button', { class: 'btn danger', type: 'button', text: 'すべてのデータを削除', on: { click: function () {
        UI.confirm('すべてのデータを削除', '案件・マスタ・ひな形をすべて削除します。元に戻せません。', '削除する', true).then(function (ok) {
          if (ok) Vault.wipe().then(function () { S.state = null; location.hash = ''; renderLock(); });
        });
      } } }));
    return h('section', {}, h('div', { class: 'page-head' }, h('h1', { text: '設定' })), agentCard, securityCard, backupCard, dangerCard,
      h('p', { class: 'muted small center', text: 'このアプリは通信を一切行いません（ネットワークへのアクセスはブラウザの設定で禁止しています）。' }));
  }

  function passwordDialog(title, labels, onOk) {
    var inputs = labels.map(function () { return h('input', { type: 'password', autocomplete: 'new-password' }); });
    var err = h('p', { class: 'error-text' });
    var body = h('div', { class: 'form-stack' }, labels.map(function (l, i) { return [h('label', { text: l }), inputs[i]]; }), err);
    UI.modal(title, body, [{ label: 'キャンセル' }, { label: 'OK', primary: true, onClick: function (close) {
      err.textContent = '';
      onOk(inputs.map(function (x) { return x.value; }), function (m) { err.textContent = m; }, close);
      return false;
    } }]);
  }
  function changePassword() {
    passwordDialog('パスワードを変更', ['現在のパスワード', '新しいパスワード（8文字以上）', '新しいパスワード（確認）'], function (v, fail, close) {
      if (v[1].length < 8) return fail('8文字以上にしてください');
      if (v[1] !== v[2]) return fail('確認用のパスワードが一致しません');
      Vault.saveJson('state', S.state).then(function () { return Vault.changePassword(v[0], v[1]); })
        .then(function () { close(); UI.toast('パスワードを変更しました'); }, function (e) { fail(e.message); });
    });
  }
  function makeBackup() {
    passwordDialog('バックアップを作成', ['バックアップ用パスワード（8文字以上）', 'バックアップ用パスワード（確認）'], function (v, fail, close) {
      if (v[0].length < 8) return fail('8文字以上にしてください');
      if (v[0] !== v[1]) return fail('確認用のパスワードが一致しません');
      Promise.all(S.state.templates.map(function (t) {
        return Vault.loadBinary('tpl-' + t.id).then(function (buf) { return { id: t.id, data: buf ? Vault.b64(new Uint8Array(buf)) : null }; });
      })).then(function (tpls) {
        return Vault.exportBackup(v[0], { state: S.state, templates: tpls, createdAt: now() });
      }).then(function (text) {
        var d = new Date();
        var name = 'sakusei-backup-' + d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2) + '.sksbak';
        close();
        // 暗号化に時間がかかり保存ダイアログの操作許可が切れるため、確認ボタンを押してから保存する
        UI.modal('バックアップの準備ができました', h('p', { text: '「保存する」を押して、保存先を選んでください。' }), [
          { label: 'キャンセル' },
          { label: '保存する', primary: true, onClick: function () {
            UI.saveFile(name, 'バックアップ', { 'application/octet-stream': ['.sksbak'] }, function () {
              return Promise.resolve(new Blob([text], { type: 'application/octet-stream' }));
            }).then(function (saved) { if (saved) UI.toast('バックアップを保存しました'); });
          } }
        ]);
      }, function (e) { fail(e.message); });
    });
  }
  function restoreBackup() {
    UI.pickFile('.sksbak,application/octet-stream').then(function (file) {
      if (!file) return;
      file.text().then(function (text) {
        passwordDialog('バックアップから復元', ['バックアップ用パスワード'], function (v, fail, close) {
          Vault.readBackup(text, v[0]).then(function (payload) {
            close();
            UI.confirm('復元', '現在のデータを、バックアップの内容（案件 ' + payload.state.cases.length + ' 件、ひな形 ' + payload.templates.length + ' 件）で置き換えます。よろしいですか？', '置き換える', true).then(function (ok) {
              if (!ok) return;
              Promise.all(payload.templates.map(function (t) { return t.data ? Vault.saveBinary('tpl-' + t.id, Vault.unb64(t.data)) : null; })).then(function () {
                S.state = payload.state; migrate(S.state); S.tplCache = {};
                save(true); UI.toast('復元しました'); location.hash = '#/cases'; route();
              });
            });
          }, function (e) { fail(e.message); });
        });
      });
    });
  }

  // ======================= ルーティング =======================
  function route() {
    if (!S.state) { renderLock(); return; }
    var parts = (location.hash || '#/cases').replace(/^#\/?/, '').split('/');
    var view, active = parts[0];
    switch (parts[0]) {
      case 'case': view = caseView(parts[1], parts[2]); active = 'cases'; break;
      case 'workers': view = masterListView('worker'); break;
      case 'worker': view = masterEditView('worker', parts[1]); active = 'workers'; break;
      case 'companies': view = masterListView('company'); break;
      case 'company': view = masterEditView('company', parts[1]); active = 'companies'; break;
      case 'supports': view = masterListView('support'); break;
      case 'support': view = masterEditView('support', parts[1]); active = 'supports'; break;
      case 'templates': view = templatesView(); break;
      case 'template': view = templateEditView(parts[1]); active = 'templates'; break;
      case 'settings': view = settingsView(); break;
      default: view = casesView(); active = 'cases';
    }
    shell(active, view);
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);
  window.addEventListener('beforeunload', function () { if (S.state && S.saveTimer) Vault.saveJson('state', S.state); });

  // 起動
  if (!window.crypto || !crypto.subtle || !window.indexedDB) {
    app.appendChild(h('div', { class: 'lock-wrap' }, h('div', { class: 'lock-card' },
      h('h1', { text: 'このブラウザでは利用できません' }),
      h('p', { text: 'Microsoft Edge または Google Chrome の最新版で開いてください。' }))));
  } else {
    renderLock();
  }
})();
