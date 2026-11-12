/* SYNC: login, staff, and keeping every device the same.
   - Every record is encrypted on the device with the business key BEFORE upload,
     so the server only ever stores scrambled text.
   - Each record is its own document, so entries made by two people at the same time are both kept.
   - The business key reaches a staff phone only after the owner approves that phone (ECDH key exchange). */
(function (NK) {
  'use strict';
  var S = NK.store, sec = NK.sec, subtle = crypto.subtle;
  var Y = NK.sync = { state: 'off', user: null, members: [], requests: [], myCode: '', biz: null, err: '' };
  var auth = null, db = null, bkey = null, unsub = [], pushing = false, role = 'none', lastTs = 0, tsTimer = 0, renTimer = 0;
  var changed = function () { if (NK.sec.unlocked()) NK.ui.render(); };

  function L() { return S.local('_sync') || {}; }
  function setL(patch) { S.setLocal('_sync', Object.assign({}, L(), patch)); }
  function bizRef() { return db.collection('nk_biz').doc(L().bizId); }
  function email() { return (Y.user && Y.user.email || '').toLowerCase(); }

  Y.uid = function () { return Y.user ? Y.user.uid : null; };
  Y.role = function () { return Y.state === 'on' || L().bizId ? role : 'none'; };
  /* The small status line at the top. */
  Y.status = function () {
    if (Y.state !== 'on') return 'local';
    if (navigator.onLine === false) return 'offline';
    return S.dirty().length ? 'saving' : 'synced';
  };
  Y.available = function () { return !!(globalThis.firebase && NK.cfg.firebase); };

  /* Called once after the PIN opens the book. */
  Y.start = function () {
    if (!Y.available()) return;
    if (!auth) {
      if (!firebase.apps.length) firebase.initializeApp(NK.cfg.firebase);
      auth = firebase.auth(); db = firebase.firestore();
      if (NK.cfg.emulator) { auth.useEmulator('http://' + NK.cfg.emulator + ':9099', { disableWarnings: true }); db.useEmulator(NK.cfg.emulator, 8080); }
      auth.onAuthStateChanged(onUser);
      addEventListener('online', function () { push(); });
      setInterval(push, 15000);
      S.on(function (why) { if (why === 'local') push(); if (why === 'remote') { clearTimeout(renTimer); renTimer = setTimeout(renumber, 800); } });
    } else onUser(auth.currentUser);
  };
  /* Called when the app locks: stop listening and forget the key. */
  Y.stop = function () { unsub.forEach(function (f) { f(); }); unsub = []; bkey = null; if (Y.state === 'on') Y.state = 'paused'; };

  function onUser(u) {
    unsub.forEach(function (f) { f(); }); unsub = []; bkey = null;
    Y.user = u; Y.err = '';
    if (!sec.unlocked()) return;
    if (!u) { Y.state = 'signedout'; return changed(); }
    if (!u.emailVerified) { Y.state = 'verify'; return changed(); }
    Y.state = 'finding'; changed();
    findBusiness().then(function () { changed(); }, function (e) { Y.state = 'error'; Y.err = e && e.code || String(e); changed(); });
  }

  /* Which business does this login belong to? Owner: own record. Staff: an invite under their email. */
  function findBusiness() {
    var l = L();
    var p = l.bizId && l.owner === Y.user.uid ? Promise.resolve(l.bizId) :
      db.collection('nk_users').doc(Y.user.uid).get().then(function (d) {
        if (d.exists) return d.data().bizId;
        return db.collection('nk_invites').doc(email()).get().then(function (i) { return i.exists ? i.data().bizId : null; });
      });
    return p.then(function (bizId) {
      if (!bizId) { Y.state = 'nobiz'; return; }
      if (l.bizId && l.bizId !== bizId) setL({ bizId: bizId, bkey: null, lastTs: 0 });
      else if (!l.bizId) setL({ bizId: bizId });
      return bizRef().get().then(function (b) {
        if (!b.exists) { Y.state = 'nobiz'; return; }
        Y.biz = b.data();
        if (Y.biz.owner === Y.user.uid) { role = 'owner'; setL({ owner: Y.user.uid }); return; }
        return bizRef().collection('members').doc(email()).get().then(function (m) { role = m.exists && m.data().entryOnly ? 'entry' : 'staff'; });
      }).then(function () {
        if (Y.state === 'nobiz') return;
        setL({ role: role });
        return L().bkey ? goLive() : requestKey();
      });
    }).catch(function (e) {
      if (e && e.code === 'permission-denied') { Y.state = L().bkey ? 'removed' : 'nobiz'; role = L().role || 'none'; return; }
      /* No internet: carry on with what this phone already has. */
      if (L().bkey) { role = L().role || 'staff'; return goLive(); }
      throw e;
    });
  }

  /* ---------- Owner: start a business online ---------- */
  var ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  function newCode() { var b = sec.rnd(16), s = ''; for (var i = 0; i < 16; i++) s += ALPHA[b[i] % 32] + (i % 4 === 3 && i < 15 ? '-' : ''); return s; }
  function normCode(c) { return String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
  Y.createBusiness = function () {
    var raw = sec.rnd(32), code = newCode(), salt = sec.rnd(16), bizId = NK.id('z');
    return sec.derive(normCode(code), salt).then(function (k) { return sec.seal(k, raw); }).then(function (box) {
      return db.collection('nk_biz').doc(bizId).set({ owner: Y.user.uid, ownerEmail: email(), created: firebase.firestore.FieldValue.serverTimestamp(),
        rec: { salt: NK.b64(salt), iter: sec.ITER, iv: box.iv, ct: box.ct } });
    }).then(function () { return db.collection('nk_users').doc(Y.user.uid).set({ bizId: bizId }); }).then(function () {
      role = 'owner'; setL({ bizId: bizId, owner: Y.user.uid, role: 'owner', bkey: NK.b64(raw), lastTs: 0 });
      /* Everything already on this phone goes up to the new business. */
      S.everything().forEach(function (r) { if (r.t.charAt(0) !== '_' && !r.sv) S.raw(r.id).dirty = true; });
      return goLive();
    }).then(function () { changed(); return code; });
  };
  /* Owner on a new phone: the recovery code opens the business key. */
  Y.useRecovery = function (code) {
    var rec = Y.biz && Y.biz.rec; if (!rec) return Promise.reject(new Error('norec'));
    return sec.derive(normCode(code), NK.unb64(rec.salt), rec.iter).then(function (k) { return sec.open(k, rec); }).then(function (raw) {
      S.giveWay('settings'); setL({ bkey: NK.b64(raw), lastTs: 0 });
      return bizRef().collection('keys').doc(NK.app.device).delete().catch(function () {});
    }).then(goLive).then(changed);
  };

  /* ---------- A new phone asks for the business key ---------- */
  function requestKey() {
    Y.state = 'needkey';
    var l = L(), ready = l.priv ? Promise.resolve() :
      subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey']).then(function (kp) {
        return Promise.all([subtle.exportKey('jwk', kp.privateKey), subtle.exportKey('jwk', kp.publicKey)]);
      }).then(function (j) { setL({ priv: j[0], pub: JSON.stringify(j[1]) }); });
    return ready.then(function () { return codeOf(L().pub); }).then(function (code) {
      Y.myCode = code;
      var ref = bizRef().collection('keys').doc(NK.app.device);
      return ref.get().then(function (d) {
        if (d.exists && d.data().pub === L().pub) return;
        return ref.set({ uid: Y.user.uid, email: email(), pub: L().pub, wrapped: null, at: firebase.firestore.FieldValue.serverTimestamp() });
      }).then(function () {
        unsub.push(ref.onSnapshot(function (d) {
          var w = d.exists && d.data().wrapped; if (!w || L().bkey) return;
          unwrap(w).then(function (raw) { S.giveWay('settings'); setL({ bkey: NK.b64(raw), lastTs: 0 }); return goLive(); }).then(changed, function () { Y.err = 'key'; changed(); });
        }, function () {}));
      });
    });
  }
  /* Six digits that both phones show, so the owner can check it is the right phone. */
  function codeOf(pub) { return subtle.digest('SHA-256', new TextEncoder().encode(pub)).then(function (h) { var b = new Uint8Array(h); var n = ((b[0] << 16) | (b[1] << 8) | b[2]) % 1000000; var s = ('000000' + n).slice(-6); return s.slice(0, 3) + ' ' + s.slice(3); }); }
  function ecdhKey(privJwk, pubJwk) {
    return Promise.all([subtle.importKey('jwk', privJwk, { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveKey']), subtle.importKey('jwk', pubJwk, { name: 'ECDH', namedCurve: 'P-256' }, false, [])])
      .then(function (k) { return subtle.deriveKey({ name: 'ECDH', public: k[1] }, k[0], { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']); });
  }
  function unwrap(w) { return ecdhKey(L().priv, JSON.parse(w.epk)).then(function (k) { return sec.open(k, w); }); }
  /* Owner approves a phone: the business key is locked so only that phone can open it. */
  Y.approve = function (deviceId) {
    var req = Y.requests.find(function (r) { return r.id === deviceId; }); if (!req) return Promise.resolve();
    return subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey']).then(function (kp) {
      return Promise.all([subtle.exportKey('jwk', kp.privateKey), subtle.exportKey('jwk', kp.publicKey)]);
    }).then(function (j) {
      return ecdhKey(j[0], JSON.parse(req.pub)).then(function (k) { return sec.seal(k, NK.unb64(L().bkey)); })
        .then(function (box) { return bizRef().collection('keys').doc(deviceId).update({ wrapped: { epk: JSON.stringify(j[1]), iv: box.iv, ct: box.ct } }); });
    });
  };
  Y.reject = function (deviceId) { return bizRef().collection('keys').doc(deviceId).delete(); };

  /* ---------- Staff (owner only) ---------- */
  Y.addStaff = function (em, entryOnly) {
    em = String(em).trim().toLowerCase();
    return bizRef().collection('members').doc(em).set({ email: em, entryOnly: !!entryOnly, at: firebase.firestore.FieldValue.serverTimestamp() })
      .then(function () { return db.collection('nk_invites').doc(em).set({ bizId: L().bizId }); });
  };
  Y.setEntryOnly = function (em, v) { return bizRef().collection('members').doc(em).update({ entryOnly: !!v }); };
  Y.removeStaff = function (em) {
    return bizRef().collection('members').doc(em).delete().then(function () { return db.collection('nk_invites').doc(em).delete(); })
      .then(function () { return bizRef().collection('keys').where('email', '==', em).get(); })
      .then(function (q) { return Promise.all(q.docs.map(function (d) { return d.ref.delete(); })); });
  };

  /* ---------- Live sync ---------- */
  function goLive() {
    return sec.aesKey(NK.unb64(L().bkey)).then(function (k) {
      bkey = k; Y.state = 'on'; lastTs = L().lastTs || 0;
      var q = bizRef().collection('recs');
      if (lastTs) q = q.where('u', '>', firebase.firestore.Timestamp.fromMillis(Math.max(0, lastTs - 120000)));
      unsub.push(q.orderBy('u').onSnapshot(function (snap) {
        snap.docChanges().forEach(function (ch) { if (ch.type !== 'removed' && !ch.doc.metadata.hasPendingWrites) takeRemote(ch.doc); });
      }, function (e) { if (e && e.code === 'permission-denied') { Y.state = 'removed'; changed(); } }));
      if (role === 'owner') {
        unsub.push(bizRef().collection('members').onSnapshot(function (s) { Y.members = s.docs.map(function (d) { return d.data(); }); changed(); }, function () {}));
        unsub.push(bizRef().collection('keys').onSnapshot(function (s) {
          var list = s.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }).filter(function (r) { return !r.wrapped; });
          Promise.all(list.map(function (r) { return codeOf(r.pub).then(function (c) { r.code = c; }); })).then(function () { Y.requests = list; changed(); });
        }, function () {}));
      } else {
        /* Staff: notice at once if the owner changes "entry only". */
        unsub.push(bizRef().collection('members').doc(email()).onSnapshot(function (m) {
          if (m.metadata.fromCache) return;
          if (m.exists) { role = m.data().entryOnly ? 'entry' : 'staff'; setL({ role: role }); changed(); }
          else { unsub.forEach(function (f) { f(); }); unsub = []; bkey = null; Y.state = 'removed'; changed(); }   // the owner removed this staff member
        }, function () {}));
      }
      push();
    });
  }
  function takeRemote(doc) {
    var x = doc.data(); if (!x.c || !bkey) return;
    sec.openJson(bkey, { iv: x.iv, ct: x.c }).then(function (p) {
      S.applyRemote({ id: doc.id, t: p.t, d: p.d, u: p.u, del: !!p.del, by: x.by });
      var ms = x.u && x.u.toMillis ? x.u.toMillis() : 0;
      if (ms > lastTs) { lastTs = ms; clearTimeout(tsTimer); tsTimer = setTimeout(function () { if (sec.unlocked()) setL({ lastTs: lastTs }); }, 1500); }
    }, function () { /* written with a different key: ignore */ });
  }

  /* Upload whatever has changed on this phone. Safe to call any time. */
  function push() {
    if (Y.state !== 'on' || pushing || !bkey || navigator.onLine === false) return;
    var list = S.dirty(); if (!list.length) return;
    pushing = true; NK.ui.status();
    var ref = bizRef().collection('recs'), denied = 0;
    var one = function (r) {
      return sec.sealJson(bkey, { t: r.t, d: r.d, u: r.u, del: !!r.del }).then(function (box) {
        return ref.doc(r.id).set({ c: box.ct, iv: box.iv, by: r.sv && r.by ? r.by : Y.user.uid, del: !!r.del, m: r.u, u: firebase.firestore.FieldValue.serverTimestamp() });
      }).then(function () { if (!r.by) { var cur = S.raw(r.id); if (cur) cur.by = Y.user.uid; } S.markClean(r.id, r.u); }, function (e) {
        if (!e || e.code !== 'permission-denied') throw e;
        /* The server said no (entry-only staff): put back the server's copy. */
        denied++; S.dropDirty(r.id);
        return ref.doc(r.id).get().then(function (d) { if (d.exists) takeRemote(d); }).catch(function () {});
      });
    };
    var i = 0;
    (function batch() {
      var part = list.slice(i, i + 20); i += 20;
      if (!part.length) return Promise.resolve();
      return Promise.all(part.map(one)).then(batch);
    })().catch(function () {}).then(function () {
      pushing = false; if (denied) NK.ui.toast(NK.t('not_allowed'), { bad: true });
      NK.ui.status(); if (S.dirty().length && navigator.onLine !== false && !denied) setTimeout(push, 3000);
    });
  }
  Y.push = push;

  /* Two phones made the same bill number while offline: the later bill gets the next free number. */
  function renumber() { if (!sec.unlocked()) return; NK.calc.renumber(S.bills(), NK.app.device).forEach(function (c) { S.update(c.id, { no: c.no }); }); }

  /* ---------- Login ---------- */
  var MSG = { 'auth/invalid-email': 'e_email', 'auth/user-not-found': 'e_login', 'auth/wrong-password': 'e_login', 'auth/invalid-credential': 'e_login', 'auth/invalid-login-credentials': 'e_login',
    'auth/email-already-in-use': 'e_exists', 'auth/weak-password': 'e_weak', 'auth/network-request-failed': 'e_net', 'auth/too-many-requests': 'e_many', 'permission-denied': 'e_denied', 'unavailable': 'e_net' };
  Y.msg = function (e) { return NK.t(MSG[e && e.code] || 'e_other'); };
  Y.signIn = function (em, pw) { return auth.signInWithEmailAndPassword(em.trim(), pw); };
  Y.signUp = function (em, pw) { return auth.createUserWithEmailAndPassword(em.trim(), pw).then(function (c) { return c.user.sendEmailVerification(); }); };
  Y.resend = function () { return Y.user.sendEmailVerification(); };
  Y.reset = function (em) { return auth.sendPasswordResetEmail(em.trim()); };
  Y.recheck = function () { return Y.user.reload().then(function () { return auth.currentUser.getIdToken(true); }).then(function () { onUser(auth.currentUser); }); };
  Y.signOut = function () { return auth.signOut(); };
  Y.retry = function () { onUser(auth.currentUser); };

  /* ---------- One-time move of bills from the old Nakal app ---------- */
  Y.importOld = function () {
    return db.collection('nakal_bills').get().then(function (snap) {
      var docs = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }).filter(function (o) { return !S.raw('old-' + o.id) && o.party; })
        .sort(function (a, b) { return (a.date || '') < (b.date || '') ? -1 : (a.date || '') > (b.date || '') ? 1 : (a.savedAt || 0) - (b.savedAt || 0); });
      docs.forEach(function (o) {
        var p = S.ensureParty(o.party), rows = (o.rows || []).filter(function (r) { return r && r.item; }).map(function (r) { return { item: String(r.item).trim(), rate: NK.num(r.rate), qty: NK.num(r.qty), unit: '' }; });
        rows.forEach(function (r) { if (!S.itemByName(r.item)) S.add('i', { name: r.item, rate: r.rate, unit: '' }); });
        S.add('b', { no: NK.calc.nextBillNo(S.bills()), partyId: p.id, date: o.date || NK.today(), rows: rows, transport: NK.num(o.transport), at: o.savedAt || Date.now(), dev: NK.app.device }, 'old-' + o.id);
      });
      return docs.length;
    });
  };
})(globalThis.NK = globalThis.NK || {});
