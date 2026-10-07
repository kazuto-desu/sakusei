/*
 * 暗号化保管庫
 *
 * すべてのデータ（マスタ・案件・Excelひな形）は、パスワードから導出した鍵で
 * AES-GCM 256bit 暗号化したうえで、このPCのブラウザ（IndexedDB）にのみ保存します。
 * 鍵はメモリ上にのみ保持し、ロック時・タブを閉じた時に破棄されます。
 * パスワードはどこにも保存されません（忘れると復元できません）。
 */
(function () {
  'use strict';
  var DB_NAME = 'sakusei-vault';
  var STORE = 'kv';
  var ITERATIONS = 310000;
  var enc = new TextEncoder();
  var dec = new TextDecoder();

  function openDb() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function () { req.result.createObjectStore(STORE); };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }
  function idb(mode, fn) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, mode);
        var store = tx.objectStore(STORE);
        var result;
        Promise.resolve(fn(store)).then(function (r) { result = r; });
        tx.oncomplete = function () { db.close(); resolve(result); };
        tx.onerror = function () { db.close(); reject(tx.error); };
      });
    });
  }
  function get(key) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
        req.onsuccess = function () { db.close(); resolve(req.result); };
        req.onerror = function () { db.close(); reject(req.error); };
      });
    });
  }
  function put(key, value) { return idb('readwrite', function (s) { s.put(value, key); }); }
  function del(key) { return idb('readwrite', function (s) { s.delete(key); }); }
  function keys() {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var req = db.transaction(STORE, 'readonly').objectStore(STORE).getAllKeys();
        req.onsuccess = function () { db.close(); resolve(req.result); };
        req.onerror = function () { db.close(); reject(req.error); };
      });
    });
  }

  function deriveKey(pass, salt, iterations) {
    return crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveKey']).then(function (base) {
      return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: salt, iterations: iterations, hash: 'SHA-256' },
        base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    });
  }
  function encryptBytes(key, bytes) {
    var iv = crypto.getRandomValues(new Uint8Array(12));
    return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, bytes).then(function (ct) {
      return { iv: iv, ct: new Uint8Array(ct) };
    });
  }
  function decryptBytes(key, rec) {
    return crypto.subtle.decrypt({ name: 'AES-GCM', iv: rec.iv }, key, rec.ct).then(function (pt) { return new Uint8Array(pt); });
  }

  function b64(bytes) {
    var s = '';
    for (var i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }
  function unb64(str) {
    var s = atob(str);
    var out = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }

  var key = null;

  var Vault = {
    isSetUp: function () { return get('meta').then(function (m) { return !!m; }); },
    isUnlocked: function () { return !!key; },

    setUp: function (pass) {
      var salt = crypto.getRandomValues(new Uint8Array(16));
      return deriveKey(pass, salt, ITERATIONS).then(function (k) {
        return encryptBytes(k, enc.encode('sakusei-ok')).then(function (check) {
          key = k;
          return put('meta', { v: 1, salt: salt, iterations: ITERATIONS, check: check });
        });
      });
    },

    unlock: function (pass) {
      return get('meta').then(function (meta) {
        if (!meta) throw new Error('未設定です');
        return deriveKey(pass, meta.salt, meta.iterations).then(function (k) {
          return decryptBytes(k, meta.check).then(function (pt) {
            if (dec.decode(pt) !== 'sakusei-ok') throw new Error('bad');
            key = k;
          });
        });
      }).catch(function (e) {
        if (e && e.message === '未設定です') throw e;
        throw new Error('パスワードが違います');
      });
    },

    lock: function () { key = null; },

    changePassword: function (oldPass, newPass) {
      var self = this;
      return self.unlock(oldPass).then(function () {
        return keys();
      }).then(function (ks) {
        var dataKeys = ks.filter(function (k) { return k !== 'meta'; });
        return Promise.all(dataKeys.map(function (k) {
          return get(k).then(function (rec) { return decryptBytes(key, rec).then(function (pt) { return { k: k, pt: pt }; }); });
        })).then(function (plain) {
          return self.setUp(newPass).then(function () {
            return Promise.all(plain.map(function (p) {
              return encryptBytes(key, p.pt).then(function (rec) { return put(p.k, rec); });
            }));
          });
        });
      });
    },

    saveJson: function (name, obj) {
      if (!key) return Promise.reject(new Error('ロックされています'));
      return encryptBytes(key, enc.encode(JSON.stringify(obj))).then(function (rec) { return put('json:' + name, rec); });
    },
    loadJson: function (name) {
      if (!key) return Promise.reject(new Error('ロックされています'));
      return get('json:' + name).then(function (rec) {
        if (!rec) return null;
        return decryptBytes(key, rec).then(function (pt) { return JSON.parse(dec.decode(pt)); });
      });
    },
    saveBinary: function (name, bytes) {
      if (!key) return Promise.reject(new Error('ロックされています'));
      return encryptBytes(key, new Uint8Array(bytes)).then(function (rec) { return put('bin:' + name, rec); });
    },
    loadBinary: function (name) {
      if (!key) return Promise.reject(new Error('ロックされています'));
      return get('bin:' + name).then(function (rec) {
        if (!rec) return null;
        return decryptBytes(key, rec).then(function (pt) { return pt.buffer; });
      });
    },
    removeBinary: function (name) { return del('bin:' + name); },

    // すべてのデータを消去（パスワードを忘れた場合など）
    wipe: function () {
      key = null;
      return new Promise(function (resolve, reject) {
        var req = indexedDB.deleteDatabase(DB_NAME);
        req.onsuccess = function () { resolve(); };
        req.onerror = function () { reject(req.error); };
        req.onblocked = function () { resolve(); };
      });
    },

    /*
     * バックアップ（他のPCへの移行・引き継ぎ用）。
     * 指定したパスワードで暗号化した1つのファイルにまとめる。
     */
    exportBackup: function (backupPass, payload) {
      var salt = crypto.getRandomValues(new Uint8Array(16));
      return deriveKey(backupPass, salt, ITERATIONS).then(function (k) {
        return encryptBytes(k, enc.encode(JSON.stringify(payload)));
      }).then(function (rec) {
        return JSON.stringify({
          format: 'sakusei-backup', v: 1, kdf: 'PBKDF2-SHA256', iterations: ITERATIONS, cipher: 'AES-GCM-256',
          salt: b64(salt), iv: b64(rec.iv), data: b64(rec.ct)
        });
      });
    },
    readBackup: function (text, backupPass) {
      var obj;
      try { obj = JSON.parse(text); } catch (e) { return Promise.reject(new Error('バックアップファイルの形式が正しくありません')); }
      if (obj.format !== 'sakusei-backup') return Promise.reject(new Error('バックアップファイルの形式が正しくありません'));
      return deriveKey(backupPass, unb64(obj.salt), obj.iterations).then(function (k) {
        return decryptBytes(k, { iv: unb64(obj.iv), ct: unb64(obj.data) });
      }).then(function (pt) { return JSON.parse(dec.decode(pt)); }, function () {
        throw new Error('バックアップのパスワードが違います');
      });
    },
    b64: b64, unb64: unb64
  };

  window.SKS = window.SKS || {};
  window.SKS.Vault = Vault;
})();
