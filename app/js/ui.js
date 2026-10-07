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

  window.SKS = window.SKS || {};
  window.SKS.UI = { h: h, clear: clear, toast: toast, modal: modal, confirm: confirmDialog, download: download, saveFile: saveFile, pickFile: pickFile, uid: uid, fmtDate: fmtDate, fmtDateTime: fmtDateTime, yen: yen };
})();
