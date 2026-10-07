/*
 * 特定技能 申請書類作成アプリ 本体
 */
(function () {
  'use strict';
  var SKS = window.SKS;
  var UI = SKS.UI, h = UI.h, F = SKS.FIELDS, Vault = SKS.Vault, Calc = SKS.Calc, Builder = SKS.Builder, D = SKS.Doc;

  var S = { state: null, saveTimer: null, idleTimer: null };
  var app = document.getElementById('app');

  // ======================= 状態 =======================
  function emptyState() {
    return { version: 2, workers: [], companies: [], supports: [], cases: [], settings: { autoLockMin: 15 } };
  }
  function save(immediate) {
    clearTimeout(S.saveTimer);
    setSaveStatus('保存中…');
    var run = function () {
      S.saveTimer = null;
      Vault.saveJson('state', S.state).then(function () { setSaveStatus('保存済み'); }, function (e) {
        setSaveStatus('保存できませんでした'); UI.toast('保存に失敗しました: ' + e.message, 'error');
      });
    };
    if (immediate) run(); else S.saveTimer = setTimeout(run, 400);
  }
  function setSaveStatus(t) { var el = document.getElementById('save-status'); if (el) el.textContent = t; }
  function byId(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }
  function now() { return Date.now(); }
  function clone(o) { return JSON.parse(JSON.stringify(o || {})); }

  var KINDS = {
    worker: { list: 'workers', title: '外国人（申請人）', fields: F.worker, nameOf: function (o) { return o.name || '（氏名未入力）'; },
      sub: function (o) { return [o.nationality, o.birthDate ? UI.fmtDate(o.birthDate) + '生' : ''].filter(Boolean).join(' / '); } },
    company: { list: 'companies', title: '受入機関', fields: F.company, nameOf: function (o) { return o.name || '（名称未入力）'; },
      sub: function (o) { return [o.field, o.siteName].filter(Boolean).join(' / '); } },
    support: { list: 'supports', title: '登録支援機関', fields: F.support, nameOf: function (o) { return o.name || '（名称未入力）'; },
      sub: function (o) { return o.regNo || ''; } }
  };

  // 書類ごとの入力欄に既定値を入れる
  function ensureDocs(c) {
    c.docs = c.docs || {};
    (SKS.DOC_INPUTS || []).forEach(function (di) {
      var cur = c.docs[di.key] = c.docs[di.key] || {};
      Object.keys(di.defaults || {}).forEach(function (k) { if (cur[k] === undefined) cur[k] = di.defaults[k]; });
    });
    return c.docs;
  }

  // ======================= 画面の枠 =======================
  function shell(active, content) {
    UI.clear(app);
    var nav = [['cases', '案件'], ['workers', '外国人'], ['companies', '受入機関'], ['supports', '登録支援機関'], ['settings', '設定']];
    app.appendChild(h('header', { class: 'topbar' },
      h('div', { class: 'brand' }, h('span', { class: 'logo', text: '特' }), h('span', { text: '特定技能 申請書類作成' })),
      h('nav', {}, nav.map(function (n) { return h('a', { href: '#/' + n[0], class: active === n[0] ? 'active' : '', text: n[1] }); })),
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
      Vault.lock(); S.state = null;
      document.body.classList.remove('printing');
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
              h('li', { text: '入力したデータは、このパスワードで暗号化してこのPCにだけ保存されます。' }),
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
    // 旧版（Excel出力）のデータを整理
    delete st.templates; delete st.agent; delete st.settings.stripMetadata; delete st.settings.activeTemplateId;
    st.cases.forEach(function (c) {
      delete c.sheetValues; delete c.templateId;
      // 1案件1名 → 複数名（同時申請）対応
      if (!c.workerIds) { c.workerIds = c.workerId ? [c.workerId] : []; delete c.workerId; }
      c.perWorker = c.perWorker || {};
      c.combine = c.combine || {};
    });
    st.version = 2;
  }
  function forgot() {
    UI.confirm('すべてのデータを削除', 'パスワードを忘れた場合、保存されているデータを復元する方法はありません。このPCに保存されたすべてのデータ（案件・マスタ）を削除して最初からやり直しますか？（バックアップファイルがあれば、新しいパスワード設定後に復元できます）', '削除してやり直す', true)
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
      input = h('textarea', { id: id, rows: 3, placeholder: def.placeholder || '' });
      input.value = value || '';
    } else if (t === 'combo') {
      var listId = id + '-list';
      input = h('input', { id: id, type: 'text', list: listId, placeholder: def.placeholder || '', autocomplete: 'off' });
      input.value = value || '';
      input = h('span', { class: 'combo' }, input, h('datalist', { id: listId }, def.options.map(function (o) { return h('option', { value: o }); })));
    } else if (t === 'date' || t === 'time' || t === 'month') {
      var di = UI.dateInput(t, value, function (v) { onChange(v); }, { id: id });
      if (def.required) di.input.setAttribute('aria-required', 'true');
      return h('div', { class: 'field' + (def.my ? ' is-my' : '') },
        h('label', { for: id }, def.label, def.required ? h('span', { class: 'req', 'aria-hidden': 'true', text: '必須' }) : null),
        di, def.hint ? h('span', { class: 'hint', text: def.hint }) : null);
    } else {
      input = h('input', { id: id, type: 'text', placeholder: def.placeholder || '', inputmode: t === 'number' ? 'decimal' : null, autocomplete: 'off' });
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
    return h('div', { class: 'field' + (t === 'textarea' ? ' wide' : '') + (def.my ? ' is-my' : '') },
      h('label', { for: id }, def.label, def.required ? h('span', { class: 'req', 'aria-hidden': 'true', text: '必須' }) : null),
      input, def.hint ? h('span', { class: 'hint', text: def.hint }) : null, msg);
  }

  function checksInput(def, obj, onChange) {
    var cur = obj[def.key] = obj[def.key] || {};
    return h('div', { class: 'field wide' }, h('span', { class: 'label' }, def.label),
      h('div', { class: 'checks' }, def.options.map(function (o) {
        var cb = h('input', { type: 'checkbox', checked: !!cur[o[0]] });
        cb.addEventListener('change', function () { cur[o[0]] = cb.checked; onChange(); });
        return h('label', { class: 'check-row' }, cb, ' ' + o[1]);
      })));
  }

  // opts.my: 外国語（ミャンマー語）の欄を表示するか
  function fieldGrid(defs, obj, onChange, opts) {
    opts = opts || {};
    var wrap = h('div', {});
    var grid = null;
    defs.forEach(function (def) {
      if (def.my && opts.my === false) return;
      if (def.group) {
        wrap.appendChild(h('h3', { class: 'group', text: def.group }));
        grid = h('div', { class: 'grid' }); wrap.appendChild(grid); return;
      }
      if (def.type === 'list') { wrap.appendChild(listEditor(def, obj, onChange, opts)); grid = null; return; }
      if (!grid) { grid = h('div', { class: 'grid' }); wrap.appendChild(grid); }
      if (def.type === 'checks') { grid.appendChild(checksInput(def, obj, onChange)); return; }
      grid.appendChild(fieldInput(def, obj[def.key], function (v) { obj[def.key] = v; onChange(); }));
    });
    return wrap;
  }

  function listEditor(def, obj, onChange, opts) {
    obj[def.key] = obj[def.key] || [];
    var rows = obj[def.key];
    var cols = def.columns.filter(function (c) { return !(c.my && opts && opts.my === false); });
    var box = h('div', { class: 'list-editor' }, h('h4', { class: 'list-title', text: def.label }));
    var body = h('div');
    box.appendChild(body);
    function cellInput(c, r, i) {
      var inp;
      if (c.type === 'date' || c.type === 'time') {
        return UI.dateInput(c.type, r[c.key], function (v) { r[c.key] = v; onChange(); }, { 'aria-label': c.label + ' ' + (i + 1) });
      }
      if (c.type === 'select') {
        inp = h('select', {}, h('option', { value: '', text: '（選択）' }), c.options.map(function (o) { return h('option', { value: o, text: o }); }));
      } else {
        inp = h('input', { type: 'text', placeholder: c.placeholder || '' });
      }
      inp.value = r[c.key] || '';
      inp.setAttribute('aria-label', c.label + ' ' + (i + 1));
      inp.addEventListener(inp.tagName === 'SELECT' ? 'change' : 'input', function () { r[c.key] = inp.value; onChange(); });
      return inp;
    }
    function render() {
      UI.clear(body);
      body.appendChild(h('div', { class: 'table-scroll' }, h('table', { class: 'table compact' },
        h('thead', {}, h('tr', {}, h('th', { text: '#' }), cols.map(function (c) { return h('th', { text: c.label }); }), h('th', {}))),
        h('tbody', {}, rows.map(function (r, i) {
          return h('tr', {}, h('td', { text: String(i + 1) }), cols.map(function (c) { return h('td', {}, cellInput(c, r, i)); }),
            h('td', {}, h('button', { class: 'btn small', type: 'button', text: '削除', on: { click: function () { rows.splice(i, 1); onChange(); render(); } } })));
        })))));
      if (rows.length < def.max) body.appendChild(h('button', { class: 'btn small', type: 'button', text: '＋ 行を追加', on: { click: function () { rows.push({}); onChange(); render(); } } }));
    }
    render();
    return box;
  }

  // ======================= 案件一覧 =======================
  function workersOf(c) {
    return (c.workerIds || []).map(function (id) { return byId(S.state.workers, id); }).filter(Boolean);
  }
  function caseTitle(c) {
    var ws = workersOf(c), co = byId(S.state.companies, c.companyId);
    var names = ws.length ? (ws[0].name || '（氏名未入力）') + (ws.length > 1 ? ' ほか' + (ws.length - 1) + '名' : '') : '（外国人未選択）';
    return names + ' ／ ' + (co ? (co.name || '（名称未入力）') : '（受入機関未選択）');
  }
  function caseCtx(c) {
    var ws = workersOf(c);
    return {
      case: c,
      worker: ws[0] || null,
      workers: ws,
      company: byId(S.state.companies, c.companyId),
      support: byId(S.state.supports, c.supportId)
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
        ensureDocs(c);
        var errs = Builder.validate(caseCtx(c)).filter(function (i) { return i.level === 'error'; }).length;
        tbody.appendChild(h('tr', {},
          h('td', {}, h('a', { href: '#/case/' + c.id + '/basic', text: caseTitle(c) }), c.memo ? h('div', { class: 'muted small', text: c.memo }) : null),
          h('td', { text: UI.fmtDate((c.schedule || {}).applyDate) || '—' }),
          h('td', {}, h('span', { class: 'status s-' + (c.status || '作成中'), text: c.status || '作成中' })),
          h('td', {}, errs ? h('span', { class: 'pill warn', text: '未入力 ' + errs }) : h('span', { class: 'pill ok', text: '入力完了' })),
          h('td', { class: 'muted', text: UI.fmtDateTime(c.updatedAt) }),
          h('td', { class: 'actions' },
            h('a', { class: 'btn small', href: '#/case/' + c.id + '/print', text: '書類を作成' }),
            h('button', { class: 'btn small', type: 'button', text: '複製', title: '同じ受入機関で別の外国人の案件を作る', on: { click: function () { duplicateCase(c); } } }),
            h('button', { class: 'btn small danger-text', type: 'button', text: '削除', on: { click: function () { deleteCase(c); } } }))));
      });
    }
    q.addEventListener('input', render);
    statusSel.addEventListener('change', render);
    render();
    return h('section', {},
      h('div', { class: 'page-head' }, h('h1', { text: '案件' }),
        h('button', { class: 'btn primary', type: 'button', text: '＋ 新しい案件', on: { click: newCaseDialog } })),
      h('div', { class: 'toolbar' }, q, statusSel),
      h('div', { class: 'table-scroll' }, h('table', { class: 'table' },
        h('thead', {}, h('tr', {}, ['外国人 ／ 受入機関', '申請日', '状況', 'チェック', '更新日時', ''].map(function (t) { return h('th', { text: t }); }))),
        tbody)));
  }

  function masterSelect(kind, value, allowNone) {
    var K = KINDS[kind];
    var sel = h('select', {}, h('option', { value: '', text: allowNone ? '（なし・自社で支援）' : '（選択してください）' }),
      S.state[K.list].map(function (o) { return h('option', { value: o.id, text: K.nameOf(o) }); }),
      h('option', { value: '__new', text: '＋ 新しく登録する' }));
    sel.value = value || '';
    return sel;
  }

  function newCaseDialog() {
    var w = masterSelect('worker'), co = masterSelect('company'), su = masterSelect('support', null, true);
    var carry = h('input', { type: 'checkbox', checked: true });
    var body = h('div', { class: 'form-stack' },
      h('label', { text: '外国人（申請人）' }), w,
      h('p', { class: 'muted small', text: '複数人を同時に申請する場合は、作成後の「1. 紐付け」で2人目以降を追加できます。' }),
      h('label', { text: '受入機関' }), co,
      h('label', { text: '登録支援機関' }), su,
      h('label', { class: 'check-row' }, carry, ' 同じ受入機関の直近の案件から、給与・労働条件・書類の入力内容を引き継ぐ'),
      h('p', { class: 'muted small', text: '「＋ 新しく登録する」を選ぶと、案件の作成後にその登録画面が開きます。' }));
    UI.modal('新しい案件', body, [
      { label: 'キャンセル' },
      { label: '作成する', primary: true, onClick: function () {
        var c = {
          id: UI.uid(), status: '作成中', createdAt: now(), updatedAt: now(),
          workerIds: [], companyId: null, supportId: null,
          schedule: {}, labor: {}, salary: { payType: '月給', allowances: [], deductions: {}, otherDeductions: [] }, docs: {}, perWorker: {}, combine: {}
        };
        var goto = null;
        function resolve(sel, kind, field) {
          if (sel.value === '__new') { var o = newMaster(kind); c[field] = o.id; if (!goto) goto = '#/' + kind + '/' + o.id; }
          else c[field] = sel.value || null;
        }
        resolve(w, 'worker', 'firstWorker'); resolve(co, 'company', 'companyId'); resolve(su, 'support', 'supportId');
        if (c.firstWorker) c.workerIds.push(c.firstWorker);
        delete c.firstWorker;
        applyCarryOver(c, carry.checked);
        ensureDocs(c);
        S.state.cases.push(c);
        save(true);
        location.hash = goto || '#/case/' + c.id + '/basic';
      } }
    ]);
  }

  // 個人ごとに異なる内容は引き継がない
  function stripPersonal(docs) {
    if (docs.hiring) delete docs.hiring.payments;
    if (docs.reward) delete docs.reward.expYears;
    return docs;
  }
  function applyCarryOver(c, carry) {
    var company = byId(S.state.companies, c.companyId);
    var prev = null;
    if (carry && c.companyId) {
      S.state.cases.forEach(function (x) { if (x.companyId === c.companyId && x.id !== c.id && (!prev || x.updatedAt > prev.updatedAt)) prev = x; });
    }
    if (prev) {
      c.labor = clone(prev.labor);
      c.salary = clone(prev.salary);
      c.docs = stripPersonal(clone(prev.docs));
      if ((prev.schedule || {}).lang) c.schedule.lang = prev.schedule.lang;
      if (!c.supportId) c.supportId = prev.supportId;
      UI.toast('「' + caseTitle(prev) + '」から内容を引き継ぎました');
    } else if (company) {
      ['holidays', 'startTime', 'endTime', 'breakMin'].forEach(function (k) { if (company[k]) c.labor[k] = company[k]; });
    }
    if (!c.schedule.lang) {
      var w = workersOf(c)[0];
      c.schedule.lang = w && w.nationality === 'ミャンマー' ? 'ミャンマー語' : 'なし（日本語のみ）';
    }
  }

  function duplicateCase(c) {
    var copy = clone(c);
    copy.id = UI.uid(); copy.createdAt = now(); copy.updatedAt = now(); copy.status = '作成中';
    copy.workerIds = [];
    copy.perWorker = {};
    ['entryDate', 'contractDate', 'employStart', 'employEnd', 'applyDate', 'docDate', 'supportContractDate', 'supportFrom', 'supportTo', 'supportStart'].forEach(function (k) { delete copy.schedule[k]; });
    copy.docs = stripPersonal(copy.docs || {});
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
  var CASE_TABS = [['basic', '1. 紐付け'], ['schedule', '2. 日程・翻訳'], ['salary', '3. 給与・労働条件'], ['docs', '4. 書類ごとの入力'], ['print', '5. 書類の作成・印刷']];

  function caseView(id, tab, sub) {
    var c = byId(S.state.cases, id);
    if (!c) return h('section', {}, h('p', { text: '案件が見つかりません。' }), h('a', { href: '#/cases', text: '案件一覧へ' }));
    ensureDocs(c);
    tab = tab || 'basic';
    function touch() { c.updatedAt = now(); save(); }
    var body = h('div', { class: 'tab-body' });
    var head = h('div', { class: 'page-head' },
      h('div', {}, h('a', { href: '#/cases', class: 'back', text: '← 案件一覧' }), h('h1', { text: caseTitle(c) })),
      h('a', { class: 'btn primary', href: '#/case/' + c.id + '/print', text: '書類を作成' }));
    var tabs = h('div', { class: 'tabs', role: 'tablist' }, CASE_TABS.map(function (t) {
      return h('a', { href: '#/case/' + c.id + '/' + t[0], class: t[0] === tab ? 'active' : '', role: 'tab', text: t[1] });
    }));
    if (tab === 'basic') body.appendChild(caseBasic(c, touch));
    else if (tab === 'schedule') body.appendChild(h('div', { class: 'card' }, fieldGrid(F.schedule, c.schedule, touch)));
    else if (tab === 'salary') body.appendChild(caseSalary(c, touch));
    else if (tab === 'docs') body.appendChild(caseDocs(c, touch, sub));
    else if (tab === 'print') body.appendChild(casePrint(c));
    return h('section', {}, head, tabs, body);
  }

  function masterSummary(kind, obj) {
    var K = KINDS[kind];
    if (!obj) return h('div', { class: 'muted', text: kind === 'support' ? '登録支援機関なし（自社で支援を実施）' : '未選択' });
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
    var memo = h('textarea', { rows: 3, placeholder: '社内メモ（書類には出力されません）' });
    memo.value = c.memo || '';
    memo.addEventListener('input', function () { c.memo = memo.value; touch(); });
    card.appendChild(workersRow(c, touch));
    card.appendChild(row('company', 'companyId', '受入機関'));
    card.appendChild(row('support', 'supportId', '登録支援機関', true));
    card.appendChild(h('div', { class: 'link-row' }, h('label', { text: '状況' }), status));
    card.appendChild(h('div', { class: 'link-row' }, h('label', { text: 'メモ' }), memo));
    return card;
  }

  // 申請人（複数人の同時申請に対応）
  var COMBINABLE = [
    ['1-17', '1-17 支援計画書', 'Ⅰ欄の氏名を「別紙の名簿のとおり」とし、名簿を添付（支援内容が同一の場合）'],
    ['1-25', '1-25 支援委託契約に関する説明書', '申請人欄を「別紙のとおり」とし、別紙を添付（全項目が同一の場合）'],
    ['5-10', '5-10 支援委託契約書', '丙（外国人）を「別紙のとおり」とし、別紙を添付']
  ];
  function workersRow(c, touch) {
    c.workerIds = c.workerIds || [];
    c.combine = c.combine || {};
    var box = h('div', { class: 'link-row' }, h('label', { text: '外国人（申請人）' }));
    var body = h('div');
    box.appendChild(body);
    function render() {
      UI.clear(body);
      c.workerIds.forEach(function (id, i) {
        var sel = masterSelect('worker', id);
        sel.setAttribute('aria-label', '申請人' + (i + 1));
        sel.addEventListener('change', function () {
          if (sel.value === '__new') { var o = newMaster('worker'); c.workerIds[i] = o.id; touch(); location.hash = '#/worker/' + o.id; return; }
          if (!sel.value) return;
          if (c.workerIds.indexOf(sel.value) >= 0 && c.workerIds.indexOf(sel.value) !== i) { UI.toast('同じ外国人がすでに追加されています', 'error'); sel.value = id; return; }
          c.workerIds[i] = sel.value; touch(); render();
        });
        var w = byId(S.state.workers, c.workerIds[i]);
        body.appendChild(h('div', { class: 'worker-row' }, h('span', { class: 'worker-no', text: String(i + 1) }), sel,
          w ? h('a', { href: '#/worker/' + w.id, text: '編集' }) : null,
          h('button', { class: 'btn small danger-text', type: 'button', text: '外す', on: { click: function () {
            c.workerIds.splice(i, 1); touch(); render();
          } } })));
      });
      var add = masterSelect('worker', '');
      add.options[0].text = c.workerIds.length ? '＋ 同時に申請する外国人を追加' : '（選択してください）';
      add.setAttribute('aria-label', '申請人を追加');
      add.addEventListener('change', function () {
        if (add.value === '__new') { var o = newMaster('worker'); c.workerIds.push(o.id); touch(); location.hash = '#/worker/' + o.id; return; }
        if (!add.value) return;
        if (c.workerIds.indexOf(add.value) >= 0) { UI.toast('同じ外国人がすでに追加されています', 'error'); add.value = ''; return; }
        c.workerIds.push(add.value); touch(); render();
      });
      body.appendChild(h('div', { class: 'worker-row' }, h('span', { class: 'worker-no', text: '＋' }), add));
      if (c.workerIds.length > 1) {
        body.appendChild(h('div', { class: 'combine-box' },
          h('div', { class: 'strong', text: '同時申請（' + c.workerIds.length + '名）：連名にする書類' }),
          h('p', { class: 'muted small', text: 'チェックした書類は1部にまとめ、氏名欄を「別紙のとおり」として申請人の名簿（別紙）を付けます。チェックしない書類と、雇用契約書・雇用条件書など個人ごとの書類は、1人ずつ作成します。' }),
          COMBINABLE.map(function (x) {
            var cb = h('input', { type: 'checkbox', checked: c.combine[x[0]] !== false });
            cb.addEventListener('change', function () { c.combine[x[0]] = cb.checked; touch(); });
            return h('label', { class: 'check-row' }, cb, ' ' + x[1], h('span', { class: 'muted small', text: '　' + x[2] }));
          })));
      }
    }
    render();
    return box;
  }

  function caseSalary(c, touch) {
    c.salary = c.salary || {};
    var sal = c.salary;
    sal.allowances = sal.allowances || [];
    sal.deductions = sal.deductions || {};
    sal.otherDeductions = sal.otherDeductions || [];
    var my = (c.schedule || {}).lang === 'ミャンマー語';
    var calcBox = h('div', { class: 'calc-panel' });
    function update() { touch(); renderCalc(); }
    function renderCalc() {
      var r = Calc.compute(c);
      UI.clear(calcBox);
      calcBox.appendChild(h('h3', { text: '自動計算' }));
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
      calcBox.appendChild(h('p', { class: 'muted small', text: '「月給 a」は報酬に関する説明書・徴収費用の説明書に、「月給 c」「手取り額」は賃金の支払（別紙）に記載されます。' }));
    }
    var left = h('div', { class: 'card' });
    left.appendChild(h('h3', { class: 'group', text: '労働時間' }));
    left.appendChild(fieldGrid(F.labor, c.labor = c.labor || {}, update));
    left.appendChild(h('h3', { class: 'group', text: '賃金' }));
    left.appendChild(fieldGrid(F.salary, sal, update));

    left.appendChild(h('h3', { class: 'group', text: '手当（最大5件）' }));
    var cols = [['name', '手当の内容', 'text'], ['amount', '月額（円）', 'num'], ['kind', '区分', 'kind'], ['method', '計算方法', 'text']];
    if (my) cols.push(['name_my', '手当名（ミャンマー語）', 'text'], ['method_my', '計算方法（ミャンマー語）', 'text']);
    left.appendChild(h('div', { class: 'table-scroll' }, h('table', { class: 'table compact' },
      h('thead', {}, h('tr', {}, h('th', { text: '#' }), cols.map(function (x) { return h('th', { text: x[1] }); }))),
      h('tbody', {}, [0, 1, 2, 3, 4].map(function (i) {
        var a = sal.allowances[i] = sal.allowances[i] || {};
        return h('tr', {}, h('td', { text: String(i + 1) }), cols.map(function (x) {
          var inp;
          if (x[2] === 'kind') {
            inp = h('select', {}, h('option', { value: '', text: '（区分）' }), F.allowanceKinds.map(function (k) { return h('option', { value: String(k.value), text: k.label }); }));
            inp.value = a.kind ? String(a.kind) : '';
          } else {
            inp = h('input', { type: 'text', inputmode: x[2] === 'num' ? 'decimal' : null, placeholder: i === 0 && x[0] === 'name' ? '住宅手当' : '' });
            inp.value = a[x[0]] || '';
          }
          inp.setAttribute('aria-label', '手当' + (i + 1) + ' ' + x[1]);
          inp.addEventListener(inp.tagName === 'SELECT' ? 'change' : 'input', function () { a[x[0]] = inp.value; update(); });
          return h('td', {}, inp);
        }));
      })))));

    left.appendChild(h('h3', { class: 'group', text: '控除（月額・円）' }));
    left.appendChild(fieldGrid(F.deductions.map(function (d) { return Object.assign({ type: 'number' }, d); }), sal.deductions, update));
    left.appendChild(h('table', { class: 'table compact' },
      h('thead', {}, h('tr', {}, ['#', 'その他控除の内容', '月額（円）'].map(function (t) { return h('th', { text: t }); }))),
      h('tbody', {}, [0, 1, 2].map(function (i) {
        var o = sal.otherDeductions[i] = sal.otherDeductions[i] || {};
        var nm = h('input', { type: 'text', value: o.name || '', 'aria-label': 'その他控除' + (i + 1) + ' 内容' });
        var am = h('input', { type: 'text', inputmode: 'decimal', value: o.amount || '', 'aria-label': 'その他控除' + (i + 1) + ' 月額' });
        nm.addEventListener('input', function () { o.name = nm.value; update(); });
        am.addEventListener('input', function () { o.amount = am.value; update(); });
        return h('tr', {}, h('td', { text: String(i + 1) }), h('td', {}, nm), h('td', {}, am));
      }))));
    renderCalc();
    return h('div', { class: 'two-col' }, left, h('aside', { class: 'sticky' }, calcBox));
  }

  // ---------- 書類ごとの入力 ----------
  function caseDocs(c, touch, sub) {
    var inputs = SKS.DOC_INPUTS;
    var current = sub && inputs.some(function (x) { return x.key === sub; }) ? sub : inputs[0].key;
    var my = (c.schedule || {}).lang === 'ミャンマー語';
    var nav = h('nav', { class: 'side-nav' }, inputs.map(function (di) {
      var missing = di.fields.filter(function (d) { return d.required && Builder.isEmpty(c.docs[di.key][d.key]); }).length;
      return h('a', { href: '#/case/' + c.id + '/docs/' + di.key, class: di.key === current ? 'active' : '' },
        di.title, missing ? h('span', { class: 'pill warn', text: String(missing) }) : null);
    }));
    var di = inputs.filter(function (x) { return x.key === current; })[0];
    var obj = c.docs[di.key];
    var card = h('div', { class: 'card' });
    card.appendChild(h('h2', { text: di.title }));
    if (!my && di.fields.some(function (d) { return d.my; })) card.appendChild(h('p', { class: 'muted small', text: '翻訳文（ミャンマー語）の欄は、「2. 日程・翻訳」で翻訳言語を選ぶと表示されます。' }));
    card.appendChild(fieldGrid(di.fields.filter(function (d) { return !d.perWorker; }), obj, touch, { my: my }));
    var pw = di.fields.filter(function (d) { return d.perWorker; });
    if (pw.length) {
      c.perWorker = c.perWorker || {};
      var ws = workersOf(c);
      card.appendChild(h('h3', { class: 'group', text: '申請人ごとに入力する項目' }));
      if (!ws.length) card.appendChild(h('p', { class: 'muted', text: '「1. 紐付け」で外国人を選択してください。' }));
      ws.forEach(function (w) {
        var store = c.perWorker[w.id] = c.perWorker[w.id] || {};
        var o = store[di.key] = store[di.key] || {};
        card.appendChild(h('div', { class: 'per-worker' }, h('div', { class: 'per-worker-name', text: w.name || '（氏名未入力）' }), fieldGrid(pw, o, touch, { my: my })));
      });
    }
    if (di.planEditor) card.appendChild(planEditor(c, touch));
    return h('div', { class: 'docs-layout' }, nav, card);
  }

  // 支援計画書 Ⅳ 支援内容の項目ごとの入力
  function planEditor(c, touch) {
    var P = SKS.PLAN, T = SKS.TEXTS;
    var p = c.docs.plan;
    p.items = p.items || {};
    p.free = p.free || {};
    var ctx = D.context(c, S.state, (c.workerIds || [])[0]);
    var wrap = h('div', { class: 'plan-editor' }, h('h3', { class: 'group', text: 'Ⅳ 支援内容（項目ごと）' }),
      h('p', { class: 'muted small', text: '担当者・住所は、空欄のとき登録支援機関（自社支援の場合は受入機関の支援担当者）の情報を使います。' }));
    function editorRow(sec, key, isFree) {
      var it = p.items[key] = p.items[key] || {};
      var st = P.itemState(ctx, key);
      var label = isFree ? '（自由記入）' : T['p117.i' + key];
      var planSel = h('select', { 'aria-label': key + ' 実施予定' }, h('option', { value: '有', text: '有' }), h('option', { value: '無', text: '無' }));
      planSel.value = it.plan || st.plan;
      var when = h('input', { type: 'text', placeholder: '時期（例：入国日）', 'aria-label': key + ' 時期', value: it.when || '' });
      var ent = h('select', { 'aria-label': key + ' 委託' }, h('option', { value: '有', text: '委託有' }), h('option', { value: '無', text: '委託無' }));
      ent.value = it.entrust || st.entrust;
      var person = h('input', { type: 'text', placeholder: st.person || '担当者 氏名（役職）', 'aria-label': key + ' 担当者', value: it.person || '' });
      var free = isFree ? h('input', { type: 'text', placeholder: '自由記入の内容', 'aria-label': key + ' 内容', value: p.free[key] || '' }) : null;
      planSel.addEventListener('change', function () { it.plan = planSel.value; touch(); });
      when.addEventListener('input', function () { it.when = when.value; touch(); });
      ent.addEventListener('change', function () { it.entrust = ent.value; touch(); });
      person.addEventListener('input', function () { it.person = person.value; touch(); });
      if (free) free.addEventListener('input', function () { p.free[key] = free.value; touch(); });
      var methods = null;
      if (sec.methods) {
        var m = it.m || P.defaultMethods(sec);
        methods = h('div', { class: 'checks' }, sec.methods.map(function (mk) {
          var cb = h('input', { type: 'checkbox', checked: !!m[mk] });
          cb.addEventListener('change', function () { it.m = it.m || clone(m); it.m[mk] = cb.checked; touch(); });
          return h('label', { class: 'check-row' }, cb, ' ' + P.METHODS[mk][0]);
        }), sec.methods.indexOf('other') >= 0 ? (function () {
          var o = h('input', { type: 'text', placeholder: 'その他の内容', 'aria-label': key + ' その他', value: it.mOther || '' });
          o.addEventListener('input', function () { it.mOther = o.value; touch(); });
          return o;
        })() : null);
      }
      return h('tr', {}, h('td', { class: 'small' }, label, free), h('td', {}, planSel, when), h('td', {}, ent), h('td', {}, person), h('td', {}, methods));
    }
    P.SECTIONS.forEach(function (sec) {
      var groups = sec.groups ? sec.groups.map(function (g, gi) { return { items: g.items, methods: g.methods, free: sec.n + (gi ? 'B' : 'A') + 'free', head: T[g.head] }; })
        : [{ items: sec.items, methods: sec.methods, free: sec.n + 'free' }];
      wrap.appendChild(h('h4', { class: 'list-title', text: T['p117.i' + sec.n] }));
      groups.forEach(function (g) {
        var s2 = Object.assign({}, sec, { methods: g.methods });
        if (g.head) wrap.appendChild(h('div', { class: 'muted small', text: g.head }));
        wrap.appendChild(h('div', { class: 'table-scroll' }, h('table', { class: 'table compact plan-edit' },
          h('thead', {}, h('tr', {}, ['支援内容', '実施予定・時期', '委託', '担当者', '実施方法'].map(function (t) { return h('th', { text: t }); }))),
          h('tbody', {}, g.items.map(function (k) { return editorRow(s2, k, false); }).concat([editorRow(s2, g.free, true)])))));
      });
    });
    return wrap;
  }

  // ---------- 書類の作成・印刷 ----------
  function applicableDocs(c) {
    return SKS.DOCS.filter(function (d) { return !d.needsSupport || c.supportId; });
  }
  function casePrint(c) {
    var ctx = caseCtx(c);
    var issues = Builder.validate(ctx);
    var errors = issues.filter(function (i) { return i.level === 'error'; });
    c.printSel = c.printSel || {};
    var docs = applicableDocs(c);
    var checks = {};
    var list = h('div', { class: 'doc-list' }, ['雇用', '支援'].map(function (g) {
      return h('div', { class: 'doc-group' }, h('h3', { text: g === '雇用' ? '雇用関係' : '支援関係' }),
        docs.filter(function (d) { return d.group === g; }).map(function (d) {
          var cb = h('input', { type: 'checkbox', checked: c.printSel[d.id] !== false });
          checks[d.id] = cb;
          cb.addEventListener('change', function () { c.printSel[d.id] = cb.checked; save(); });
          return h('label', { class: 'doc-item' }, cb, h('span', { class: 'doc-no', text: d.no }), h('span', { text: d.title }),
            d.bilingual ? h('span', { class: 'pill', text: '翻訳併記可' }) : null);
        }));
    }));
    var lang = (c.schedule || {}).lang || 'なし（日本語のみ）';
    var openBtn = h('button', { class: 'btn primary big', type: 'button', text: '選択した書類を表示して印刷・PDF保存', on: { click: function () {
      var ids = docs.filter(function (d) { return checks[d.id].checked; }).map(function (d) { return d.id; });
      if (!ids.length) { UI.toast('書類を選択してください', 'error'); return; }
      location.hash = '#/doc/' + c.id + '/' + ids.join(',');
    } } });
    return h('div', {},
      h('div', { class: 'card' },
        h('h3', { text: errors.length ? '未入力・要確認の項目があります' : (issues.length ? '確認事項があります' : 'チェックOK') }),
        issues.length ? h('ul', { class: 'issues' }, issues.map(function (i) {
          var href = i.link ? (i.link.charAt(0) === '#' ? i.link : '#/case/' + c.id + '/' + i.link) : null;
          return h('li', { class: i.level }, h('span', { class: 'pill ' + (i.level === 'error' ? 'err' : 'warn'), text: i.level === 'error' ? '必須' : '確認' }), ' [' + i.area + '] ' + i.msg, href ? [' ', h('a', { href: href, text: '入力する' })] : null);
        })) : h('p', { class: 'ok-text', text: '必須項目はすべて入力されています。' })),
      h('div', { class: 'card' },
        h('h3', { text: '作成する書類' }),
        h('p', { class: 'muted', text: '翻訳：' + lang + '（「2. 日程・翻訳」で変更できます）' }),
        list, openBtn,
        h('p', { class: 'muted small', text: '印刷画面で送信先に「PDFに保存」を選ぶとPDFファイルになります。未入力の欄は空欄のまま印刷されます。' })));
  }

  // 書類の表示（印刷用）
  function docView(caseId, idsText) {
    var c = byId(S.state.cases, caseId);
    if (!c) return h('section', {}, h('p', { text: '案件が見つかりません。' }));
    ensureDocs(c);
    var ids = (idsText || '').split(',');
    var pages = h('div', { class: 'docs' });
    D.plan(c, S.state, ids).forEach(function (job) {
      try {
        [].concat(job.doc.render(job.ctx)).forEach(function (el) { if (el) pages.appendChild(el); });
      } catch (e) {
        console.error(e);
        pages.appendChild(h('section', { class: 'doc' }, h('p', { class: 'error-text', text: job.doc.title + ' を作成できませんでした: ' + e.message })));
      }
    });
    var bar = h('div', { class: 'print-bar' },
      h('a', { class: 'btn', href: '#/case/' + c.id + '/print', text: '← 戻る' }),
      h('span', { class: 'muted', text: caseTitle(c) }),
      h('button', { class: 'btn primary', type: 'button', text: '印刷・PDF保存', on: { click: function () { window.print(); } } }));
    return h('div', { class: 'print-view' }, bar, pages);
  }

  // ======================= マスタ =======================
  function newMaster(kind) {
    var o = { id: UI.uid(), createdAt: now(), updatedAt: now() };
    S.state[KINDS[kind].list].push(o);
    save(true);
    return o;
  }
  function masterListView(kind) {
    var K = KINDS[kind];
    var q = h('input', { type: 'search', placeholder: '検索', class: 'search' });
    var tbody = h('tbody');
    function usage(o) { return S.state.cases.filter(function (c) { return c[kind + 'Id'] === o.id; }).length; }
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
      h('p', { class: 'muted', text: kind === 'worker' ? '一度登録すれば、複数の案件で使い回せます。' : '一度登録すれば、この機関のすべての案件に自動で反映されます。' }),
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

  // ======================= 設定 =======================
  function settingsView() {
    var st = S.state.settings;
    var lockMin = h('input', { type: 'number', min: 0, max: 240, value: st.autoLockMin });
    lockMin.addEventListener('change', function () { st.autoLockMin = parseInt(lockMin.value, 10) || 0; save(); resetIdle(); });
    var securityCard = h('div', { class: 'card' }, h('h3', { text: 'セキュリティ' }),
      h('div', { class: 'field' }, h('label', { text: '自動ロックまでの時間（分。0で無効）' }), lockMin),
      h('div', { class: 'btn-row' }, h('button', { class: 'btn', type: 'button', text: 'パスワードを変更', on: { click: changePassword } })));
    var backupCard = h('div', { class: 'card' }, h('h3', { text: 'バックアップ・引き継ぎ' }),
      h('p', { class: 'muted small', text: 'データはこのPCのブラウザ内にだけ保存されています。PCの故障やブラウザのデータ削除に備えて、定期的にバックアップしてください。バックアップファイルはパスワードで暗号化されます。社内の決められた場所に保存してください。' }),
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn', type: 'button', text: 'バックアップを作成', on: { click: makeBackup } }),
        h('button', { class: 'btn', type: 'button', text: 'バックアップから復元', on: { click: restoreBackup } })));
    var dangerCard = h('div', { class: 'card danger-zone' }, h('h3', { text: 'データの全削除' }),
      h('p', { class: 'muted small', text: 'PCを返却・廃棄する場合などに、このPCに保存されたすべてのデータを削除します。' }),
      h('button', { class: 'btn danger', type: 'button', text: 'すべてのデータを削除', on: { click: function () {
        UI.confirm('すべてのデータを削除', '案件・マスタをすべて削除します。元に戻せません。', '削除する', true).then(function (ok) {
          if (ok) Vault.wipe().then(function () { S.state = null; location.hash = ''; renderLock(); });
        });
      } } }));
    return h('section', {}, h('div', { class: 'page-head' }, h('h1', { text: '設定' })), securityCard, backupCard, dangerCard,
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
      Vault.exportBackup(v[0], { state: S.state, createdAt: now() }).then(function (text) {
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
            UI.confirm('復元', '現在のデータを、バックアップの内容（案件 ' + payload.state.cases.length + ' 件）で置き換えます。よろしいですか？', '置き換える', true).then(function (ok) {
              if (!ok) return;
              S.state = payload.state; migrate(S.state);
              save(true); UI.toast('復元しました'); location.hash = '#/cases'; route();
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
    document.body.classList.toggle('printing', parts[0] === 'doc');
    if (parts[0] === 'doc') {
      UI.clear(app).appendChild(docView(parts[1], parts[2]));
      window.scrollTo(0, 0);
      return;
    }
    var view, active = parts[0];
    switch (parts[0]) {
      case 'case': view = caseView(parts[1], parts[2], parts[3]); active = 'cases'; break;
      case 'workers': view = masterListView('worker'); break;
      case 'worker': view = masterEditView('worker', parts[1]); active = 'workers'; break;
      case 'companies': view = masterListView('company'); break;
      case 'company': view = masterEditView('company', parts[1]); active = 'companies'; break;
      case 'supports': view = masterListView('support'); break;
      case 'support': view = masterEditView('support', parts[1]); active = 'supports'; break;
      case 'settings': view = settingsView(); break;
      default: view = casesView(); active = 'cases';
    }
    shell(active, view);
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);
  window.addEventListener('beforeunload', function () { if (S.state && S.saveTimer) Vault.saveJson('state', S.state); });

  if (!window.crypto || !crypto.subtle || !window.indexedDB) {
    app.appendChild(h('div', { class: 'lock-wrap' }, h('div', { class: 'lock-card' },
      h('h1', { text: 'このブラウザでは利用できません' }),
      h('p', { text: 'Microsoft Edge または Google Chrome の最新版で開いてください。' }))));
  } else {
    renderLock();
  }
})();
