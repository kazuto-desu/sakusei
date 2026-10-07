/* 画面部品の小さなヘルパー（innerHTMLは使わず、利用者の入力は常にテキストとして扱う） */
(function () {
  'use strict';
  function h(tag, attrs) {
    var el = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === undefined || v === null || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'on') Object.keys(v).forEach(function (ev) { el.addEventListener(ev, v[ev]); });
      else if (k === 'value') el.value = v;
      else if (k === 'checked') el.checked = !!v;
      else if (k === 'dataset') Object.keys(v).forEach(function (d) { el.dataset[d] = v[d]; });
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, String(v));
    });
    for (var i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }
  function append(el, c) {
    if (c === null || c === undefined || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { append(el, x); }); return; }
    if (typeof c === 'string' || typeof c === 'number') el.appendChild(document.createTextNode(String(c)));
    else el.appendChild(c);
  }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }

  var toastTimer = null;
  function toast(msg, kind) {
    var el = document.getElementById('toast');
    el.textContent = msg;
    el.className = 'toast show ' + (kind || '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.className = 'toast'; }, 3500);
  }

  // モーダルダイアログ。content は要素、buttons は [{label, primary, danger, onClick(close)}]
  function modal(title, content, buttons) {
    var overlay = h('div', { class: 'modal-overlay' });
    function close() { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }
    var box = h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true' },
      h('h2', { text: title }),
      h('div', { class: 'modal-body' }, content),
      h('div', { class: 'modal-actions' }, (buttons || [{ label: '閉じる' }]).map(function (b) {
        return h('button', {
          class: 'btn' + (b.primary ? ' primary' : '') + (b.danger ? ' danger' : ''),
          type: 'button', text: b.label,
          on: { click: function () { if (b.onClick) { if (b.onClick(close) !== false) close(); } else close(); } }
        });
      })));
    overlay.appendChild(box);
    overlay.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    document.body.appendChild(overlay);
    var first = box.querySelector('input,select,textarea,button');
    if (first) first.focus();
    return close;
  }

  function confirmDialog(title, message, okLabel, danger) {
    return new Promise(function (resolve) {
      var done = false;
      modal(title, h('p', { text: message }), [
        { label: 'キャンセル', onClick: function () { done = true; resolve(false); } },
        { label: okLabel || 'OK', primary: !danger, danger: danger, onClick: function () { done = true; resolve(true); } }
      ]);
    });
  }

  function download(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = h('a', { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1000);
  }

  /*
   * 保存ダイアログでファイルを保存する。
   * file:// で開いた場合、ブラウザは <a download> のファイル名指定を無視するため、
   * Edge/Chrome の「名前を付けて保存」ダイアログ（File System Access API）を優先して使う。
   * produce: Blob を返す Promise 関数（ダイアログを先に開いてから生成する）
   */
  function saveFile(name, description, accept, produce) {
    if (window.showSaveFilePicker) {
      var types = [{ description: description, accept: accept }];
      return window.showSaveFilePicker({ suggestedName: name, types: types }).then(function (handle) {
        return produce().then(function (blob) {
          return handle.createWritable().then(function (w) {
            return w.write(blob).then(function () { return w.close(); });
          });
        }).then(function () { return true; });
      }, function (e) {
        if (e && e.name === 'AbortError') return false;
        return produce().then(function (blob) { download(blob, name); return true; });
      });
    }
    return produce().then(function (blob) { download(blob, name); return true; });
  }

  function pickFile(accept) {
    return new Promise(function (resolve) {
      var input = h('input', { type: 'file', accept: accept, class: 'hidden' });
      input.addEventListener('change', function () { resolve(input.files[0] || null); input.remove(); });
      document.body.appendChild(input);
      input.click();
    });
  }

  function uid() {
    var b = crypto.getRandomValues(new Uint8Array(9));
    return Array.prototype.map.call(b, function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
  }

  function fmtDate(iso) {
    if (!iso) return '';
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
    return m ? m[1] + '/' + m[2] + '/' + m[3] : iso;
  }
  function fmtDateTime(ts) {
    if (!ts) return '';
    var d = new Date(ts);
    var p = function (x) { return (x < 10 ? '0' : '') + x; };
    return d.getFullYear() + '/' + p(d.getMonth() + 1) + '/' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }
  function yen(n) { return (n === null || n === undefined || isNaN(n)) ? '—' : Math.round(n).toLocaleString('ja-JP') + ' 円'; }


  // ---------- 日付・時刻の入力（ブラウザ標準の日付欄は使わず、自由な書き方を受け付けて整える） ----------
  var ERAS = { R: 2018, '令和': 2018, H: 1988, '平成': 1988, S: 1925, '昭和': 1925 };
  function validYmd(y, m, d) {
    var dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
  }
  function p2(n) { return (n < 10 ? '0' : '') + n; }
  // 「2026/12/1」「2026-12-01」「2026年12月1日」「20261201」「R8.12.1」「令和8年12月1日」→ 2026-12-01
  // month: true のときは年月（2026/12、202612、R8.12）→ 2026-12
  function parseDate(str, month) {
    var s = String(str || '').trim().replace(/[０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); })
      .replace(/[／．。・\s]/g, '/').replace(/[－ー]/g, '-').replace(/元年/, '1年');
    if (!s) return '';
    var y, m, d = 1, mm;
    var era = /^(R|H|S|令和|平成|昭和)\s*(\d{1,2})[\/.\-年]?(\d{1,2})(?:[\/.\-月](\d{1,2})日?)?月?$/i.exec(s);
    if (era) {
      y = ERAS[era[1].length === 1 ? era[1].toUpperCase() : era[1]] + +era[2]; m = +era[3]; d = era[4] ? +era[4] : (month ? 1 : NaN);
    } else if ((mm = /^(\d{4})(\d{2})(\d{2})?$/.exec(s))) {
      y = +mm[1]; m = +mm[2]; d = mm[3] ? +mm[3] : (month ? 1 : NaN);
    } else if ((mm = /^(\d{4})[\/.\-年](\d{1,2})(?:[\/.\-月](\d{1,2})日?)?月?$/.exec(s))) {
      y = +mm[1]; m = +mm[2]; d = mm[3] ? +mm[3] : (month ? 1 : NaN);
    } else return null;
    if (!validYmd(y, m, d) || y < 1900 || y > 2200) return null;
    return month ? y + '-' + p2(m) : y + '-' + p2(m) + '-' + p2(d);
  }
  var WEEK = '日月火水木金土';
  function wareki(y) {
    if (y >= 2019) return '令和' + (y - 2018 === 1 ? '元' : y - 2018) + '年';
    if (y >= 1989) return '平成' + (y - 1988 === 1 ? '元' : y - 1988) + '年';
    return '昭和' + (y - 1925) + '年';
  }
  function showDate(iso) {
    var m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(iso || '');
    if (!m) return '';
    return m[3] ? m[1] + '/' + m[2] + '/' + m[3] : m[1] + '/' + m[2];
  }
  function dateHint(iso) {
    var m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(iso || '');
    if (!m) return '';
    var y = +m[1], s = wareki(y) + +m[2] + '月';
    if (m[3]) s += +m[3] + '日（' + WEEK[new Date(Date.UTC(y, +m[2] - 1, +m[3])).getUTCDay()] + '）';
    return s;
  }
  // 「830」「8:30」「08:30」「8時30分」「17」→ 08:30 / 17:00
  function parseTime(str) {
    var s = String(str || '').trim().replace(/[０-９：]/g, function (c) { return c === '：' ? ':' : String.fromCharCode(c.charCodeAt(0) - 0xFEE0); });
    if (!s) return '';
    var m = /^(\d{1,2})(?:[:時.](\d{1,2})分?)?時?$/.exec(s) || /^(\d{1,2})(\d{2})$/.exec(s);
    if (!m) return null;
    var h = +m[1], mi = m[2] ? +m[2] : 0;
    if (h > 29 || mi > 59) return null;
    return p2(h) + ':' + p2(mi);
  }
  /*
   * 日付（mode: 'date' | 'month'）・時刻（'time'）の入力欄。値は ISO 形式（2026-12-01 / 2026-12 / 08:30）で onChange に渡す
   */
  function dateInput(mode, value, onChange, attrs) {
    var inp = h('input', Object.assign({ type: 'text', inputmode: 'numeric', autocomplete: 'off',
      placeholder: mode === 'time' ? '例 8:30' : mode === 'month' ? '例 2026/12' : '例 2026/12/1・R8.12.1' }, attrs || {}));
    var hint = h('span', { class: 'date-hint' });
    var wrap = h('span', { class: 'date-input' }, inp, hint);
    function show(v) {
      inp.value = mode === 'time' ? (v || '') : showDate(v);
      hint.textContent = mode === 'time' ? '' : dateHint(v);
    }
    show(value);
    function commit() {
      var v = mode === 'time' ? parseTime(inp.value) : parseDate(inp.value, mode === 'month');
      inp.classList.toggle('invalid', v === null);
      if (v === null) { hint.textContent = mode === 'time' ? '時刻の形式が正しくありません' : '日付の形式が正しくありません'; return; }
      show(v);
      onChange(v);
    }
    inp.addEventListener('change', commit);
    inp.addEventListener('blur', commit);
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') commit(); });
    wrap.input = inp;
    return wrap;
  }

  window.SKS = window.SKS || {};
  window.SKS.UI = { h: h, clear: clear, toast: toast, modal: modal, confirm: confirmDialog, download: download, saveFile: saveFile, pickFile: pickFile, uid: uid, fmtDate: fmtDate, fmtDateTime: fmtDateTime, yen: yen, dateInput: dateInput, parseDate: parseDate, parseTime: parseTime, showDate: showDate };
})();
