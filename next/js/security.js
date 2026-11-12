/* SECURITY: PIN lock, encryption of everything kept on the device, encrypted backup file.
   - A random data key encrypts every record with AES-256-GCM.
   - The data key itself is locked with a key made from the PIN (PBKDF2-SHA256, 600,000 rounds).
   - Wrong PIN tries are slowed down. The PIN is never stored anywhere. */
(function (NK) {
  'use strict';
  var S = NK.sec = {}, subtle = crypto.subtle, enc = new TextEncoder(), dec = new TextDecoder();
  S.ITER = 600000;
  var dataKey = null;      // CryptoKey, only in memory while unlocked
  var rawKey = null;       // raw bytes of the data key, needed to re-lock it on PIN change / fingerprint

  function rnd(n) { var b = new Uint8Array(n); crypto.getRandomValues(b); return b; }
  S.rnd = rnd;

  /* Make an AES key from a PIN or password. */
  S.derive = function (secret, salt, iter) {
    return subtle.importKey('raw', enc.encode(secret), 'PBKDF2', false, ['deriveKey']).then(function (k) {
      return subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: salt, iterations: iter || S.ITER }, k, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    });
  };
  S.aesKey = function (raw) { return subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']); };

  /* Encrypt / decrypt bytes with a given key. Output is small base64 text {iv, ct}. */
  S.seal = function (key, bytes) {
    var iv = rnd(12);
    return subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, bytes).then(function (ct) { return { iv: NK.b64(iv), ct: NK.b64(ct) }; });
  };
  S.open = function (key, box) {
    return subtle.decrypt({ name: 'AES-GCM', iv: NK.unb64(box.iv) }, key, NK.unb64(box.ct)).then(function (b) { return new Uint8Array(b); });
  };
  S.sealJson = function (key, obj) { return S.seal(key, enc.encode(JSON.stringify(obj))); };
  S.openJson = function (key, box) { return S.open(key, box).then(function (b) { return JSON.parse(dec.decode(b)); }); };

  /* Records on the device use the data key. */
  S.enc = function (obj) { return S.sealJson(dataKey, obj); };
  S.dec = function (box) { return S.openJson(dataKey, box); };
  S.unlocked = function () { return !!dataKey; };

  S.validPin = function (p) { return /^\d{6}$/.test(String(p)); };

  /* First time: choose a PIN. Makes the data key and locks it with the PIN. */
  S.setup = function (pin) {
    if (!S.validPin(pin)) return Promise.reject(new Error('pin'));
    rawKey = rnd(32);
    return lockDataKey(pin).then(function () { return S.aesKey(rawKey); }).then(function (k) { dataKey = k; });
  };
  function lockDataKey(pin) {
    var salt = rnd(16);
    return S.derive(pin, salt).then(function (kek) { return S.seal(kek, rawKey); }).then(function (box) {
      return NK.db.metaSet('pin', { salt: NK.b64(salt), iter: S.ITER, iv: box.iv, ct: box.ct });
    });
  }
  S.hasPin = function () { return NK.db.metaGet('pin').then(function (p) { return !!p; }); };

  /* How long the user must wait after wrong tries (0 = can try now). */
  S.waitMs = function () {
    return NK.db.metaGet('tries').then(function (t) { return t && t.until > Date.now() ? t.until - Date.now() : 0; });
  };

  /* Open with the PIN. Returns {ok:true} or {ok:false, wait:ms, left:n}. */
  S.unlock = function (pin) {
    return Promise.all([NK.db.metaGet('pin'), NK.db.metaGet('tries')]).then(function (r) {
      var p = r[0], t = r[1] || { n: 0, until: 0 };
      if (!p) throw new Error('nopin');
      if (t.until > Date.now()) return { ok: false, wait: t.until - Date.now() };
      return S.derive(pin, NK.unb64(p.salt), p.iter).then(function (kek) { return S.open(kek, p); }).then(function (raw) {
        rawKey = raw;
        return S.aesKey(raw).then(function (k) { dataKey = k; return NK.db.metaSet('tries', { n: 0, until: 0 }); }).then(function () { return { ok: true }; });
      }, function () {
        /* Wrong PIN: 3 free tries, then 30 seconds, doubling each time up to 1 hour. */
        t.n += 1;
        var wait = t.n >= 3 ? Math.min(3600000, 30000 * Math.pow(2, t.n - 3)) : 0;
        t.until = wait ? Date.now() + wait : 0;
        return NK.db.metaSet('tries', t).then(function () { return { ok: false, wait: wait, left: Math.max(0, 3 - t.n) }; });
      });
    });
  };

  /* Lock: forget the keys held in memory. */
  S.lock = function () { dataKey = null; if (rawKey) rawKey.fill(0); rawKey = null; };

  /* Change PIN: the old PIN must open the lock first; data is not re-written. */
  S.changePin = function (oldPin, newPin) {
    if (!S.validPin(newPin)) return Promise.resolve({ ok: false });
    return S.unlock(oldPin).then(function (r) {
      if (!r.ok) return r;
      return lockDataKey(newPin).then(function () { return S.bioOff(); }).then(function () { return { ok: true }; });
    });
  };

  /* ---------- Fingerprint / face (only where the browser supports passkeys with PRF) ---------- */
  S.bioSupported = function () {
    try {
      if (!globalThis.PublicKeyCredential || !navigator.credentials) return Promise.resolve(false);
      return PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch (e) { return Promise.resolve(false); }
  };
  S.bioOn = function (label) {
    var salt = rnd(32);
    return navigator.credentials.create({ publicKey: {
      challenge: rnd(32), rp: { name: label || 'Khata' }, user: { id: rnd(16), name: label || 'owner', displayName: label || 'owner' },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' },
      extensions: { prf: {} }, timeout: 60000
    } }).then(function (cred) {
      var ext = cred.getClientExtensionResults();
      if (!ext.prf || !ext.prf.enabled) throw new Error('noprf');
      return bioKey(cred.rawId, salt).then(function (k) { return S.seal(k, rawKey); }).then(function (box) {
        return NK.db.metaSet('bio', { id: NK.b64(cred.rawId), salt: NK.b64(salt), iv: box.iv, ct: box.ct });
      });
    });
  };
  function bioKey(rawId, salt) {
    return navigator.credentials.get({ publicKey: {
      challenge: rnd(32), allowCredentials: [{ type: 'public-key', id: rawId }], userVerification: 'required',
      extensions: { prf: { eval: { first: salt } } }, timeout: 60000
    } }).then(function (a) {
      var r = a.getClientExtensionResults().prf;
      if (!r || !r.results || !r.results.first) throw new Error('noprf');
      return S.aesKey(new Uint8Array(r.results.first));
    });
  }
  S.bioUnlock = function () {
    return NK.db.metaGet('bio').then(function (b) {
      if (!b) throw new Error('nobio');
      return bioKey(NK.unb64(b.id), NK.unb64(b.salt)).then(function (k) { return S.open(k, b); }).then(function (raw) {
        rawKey = raw; return S.aesKey(raw);
      }).then(function (k) { dataKey = k; return NK.db.metaSet('tries', { n: 0, until: 0 }); });
    });
  };
  S.bioOff = function () { return NK.db.metaSet('bio', null); };
  S.bioEnabled = function () { return NK.db.metaGet('bio').then(function (b) { return !!b; }); };

  /* ---------- Encrypted backup file ----------
     The file is locked with a backup password chosen by the user (at least 8 characters),
     again with PBKDF2 600,000 rounds + AES-256-GCM. Without the password it cannot be read. */
  S.backupMake = function (password, payload) {
    var salt = rnd(16);
    return S.derive(password, salt).then(function (k) { return S.sealJson(k, payload); }).then(function (box) {
      return JSON.stringify({ app: 'nk-backup', v: 1, kdf: 'PBKDF2-SHA256', iter: S.ITER, cipher: 'AES-256-GCM', salt: NK.b64(salt), iv: box.iv, ct: box.ct });
    });
  };
  S.backupRead = function (text, password) {
    var f;
    try { f = JSON.parse(text); } catch (e) { return Promise.reject(new Error('notbackup')); }
    if (!f || f.app !== 'nk-backup' || !f.salt) return Promise.reject(new Error('notbackup'));
    return S.derive(password, NK.unb64(f.salt), f.iter).then(function (k) { return S.openJson(k, f); })
      .catch(function (e) { throw new Error(e && e.message === 'notbackup' ? 'notbackup' : 'wrongpass'); });
  };
})(globalThis.NK = globalThis.NK || {});
