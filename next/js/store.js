/* STORE: the book itself. Every bill, payment, party and item is one small record.
   Records live in memory while the app is open and are saved encrypted on the device.
   Each record carries its own time stamp, so two people can add entries at the same
   time and both are kept; only the very same record edited twice uses the newer copy. */
(function (NK) {
  'use strict';

  /* ---- Device storage (IndexedDB). Tests replace NK.db with a memory version. ---- */
  if (!NK.db && globalThis.indexedDB) {
    var dbp = null;
    var open = function () {
      return dbp || (dbp = new Promise(function (res, rej) {
        var q = indexedDB.open('nk-book', 1);
        q.onupgradeneeded = function () { q.result.createObjectStore('meta'); q.result.createObjectStore('recs'); };
        q.onsuccess = function () { res(q.result); }; q.onerror = function () { rej(q.error); };
      }));
    };
    var run = function (store, mode, fn) {
      return open().then(function (db) {
        return new Promise(function (res, rej) {
          var tx = db.transaction(store, mode), out = fn(tx.objectStore(store));
          tx.oncomplete = function () { res(out && out.result !== undefined ? out.result : undefined); };
          tx.onerror = tx.onabort = function () { rej(tx.error); };
        });
      });
    };
    NK.db = {
      metaGet: function (k) { return run('meta', 'readonly', function (s) { return s.get(k); }).then(function (v) { return v == null ? null : v; }); },
      metaSet: function (k, v) { return run('meta', 'readwrite', function (s) { if (v == null) s.delete(k); else s.put(v, k); }); },
      recAll: function () { return run('recs', 'readonly', function (s) { return s.getAll(); }); },
      recPut: function (o) { return run('recs', 'readwrite', function (s) { s.put(o, o.id); }); },
      clear: function () { return run('recs', 'readwrite', function (s) { s.clear(); }).then(function () { return run('meta', 'readwrite', function (s) { s.clear(); }); }); }
    };
  }

  var S = NK.store = {}, recs = new Map(), subs = [], track = null, saving = Promise.resolve();
  S.pending = 0; // writes to the device still in progress

  /* Read everything from the device after the PIN opens the lock. */
  S.load = function () {
    recs = new Map();
    return NK.db.recAll().then(function (rows) {
      return Promise.all(rows.map(function (row) {
        return NK.sec.dec(row).then(function (r) { recs.set(r.id, r); }, function () { /* unreadable row is skipped */ });
      }));
    });
  };
  S.clearMemory = function () { recs = new Map(); };

  function persist(r) {
    S.pending++;
    saving = saving.then(function () { return NK.sec.enc(r); }).then(function (box) { box.id = r.id; return NK.db.recPut(box); })
      .catch(function (e) { S.lastError = e; }).then(function () { S.pending--; });
    return saving;
  }
  S.flush = function () { return saving; };
  function fire(why) { subs.forEach(function (f) { try { f(why); } catch (e) { console.error(e); } }); }
  S.on = function (f) { subs.push(f); };

  function write(r, why) {
    if (track && !track.has(r.id)) track.set(r.id, recs.has(r.id) ? JSON.parse(JSON.stringify(recs.get(r.id))) : null);
    recs.set(r.id, r); persist(r); fire(why || 'local');
    return r;
  }

  /* Types beginning with "_" stay on this device only (keys, cash counter). */
  function syncable(t) { return t.charAt(0) !== '_'; }

  S.get = function (id) { var r = recs.get(id); return r && !r.del ? r : null; };
  S.raw = function (id) { return recs.get(id) || null; };
  S.list = function (t) { var out = []; recs.forEach(function (r) { if (r.t === t && !r.del) out.push(r); }); return out; };
  S.everything = function () { return Array.from(recs.values()); };

  S.add = function (t, d, id) { return write({ id: id || NK.id(t), t: t, d: d, u: Date.now(), del: false, dirty: syncable(t) }); };
  S.update = function (id, patch) {
    var o = recs.get(id); if (!o) return null;
    var d = Object.assign({}, o.d, patch);
    return write(Object.assign({}, o, { d: d, u: Date.now(), del: false, dirty: syncable(o.t) }));
  };
  S.del = function (id) {
    var o = recs.get(id); if (!o) return null;
    return write(Object.assign({}, o, { u: Date.now(), del: true, dirty: syncable(o.t) }));
  };
  /* Device-only settings and keys. */
  S.local = function (id) { var r = recs.get(id); return r && !r.del ? r.d : null; };
  S.setLocal = function (id, d) { return write({ id: id, t: '_', d: d, u: Date.now(), del: false, dirty: false }, 'quiet'); };

  /* Run a change and get back a function that undoes it. */
  S.undoable = function (fn) {
    var t = track = new Map();
    try { fn(); } finally { track = null; }
    return function undo() {
      t.forEach(function (old, id) {
        var cur = recs.get(id);
        if (old) write(Object.assign({}, old, { u: Date.now(), dirty: syncable(old.t), sv: cur.sv }));
        else write(Object.assign({}, cur, { u: Date.now(), del: true, dirty: syncable(cur.t) }));
      });
    };
  };

  /* ---- Used by sync ---- */
  S.dirty = function () { var out = []; recs.forEach(function (r) { if (r.dirty) out.push(r); }); return out; };
  S.markClean = function (id, u) {
    var r = recs.get(id);
    if (r && r.u === u) write(Object.assign({}, r, { dirty: false, sv: true }), 'quiet');
    else if (r) write(Object.assign({}, r, { sv: true }), 'quiet');
  };
  /* A record arrived from another device. Keep whichever copy of that record is newer. */
  S.applyRemote = function (r) {
    var mine = recs.get(r.id);
    if (mine && mine.dirty && mine.u >= r.u) { if (!mine.sv) write(Object.assign({}, mine, { sv: true, by: r.by }), 'quiet'); return false; }
    if (mine && !mine.dirty && mine.u === r.u && mine.del === r.del) return false;
    write({ id: r.id, t: r.t, d: r.d, u: r.u, del: !!r.del, dirty: false, sv: true, by: r.by }, 'remote');
    return true;
  };
  /* The server refused a change (for example entry-only staff editing someone else's bill). */
  S.dropDirty = function (id) { var r = recs.get(id); if (r) write(Object.assign({}, r, { dirty: false }), 'quiet'); };

  /* Joining an existing business: this phone's own copy of a record gives way to the business's copy. */
  S.giveWay = function (id) { var r = recs.get(id); if (r) write(Object.assign({}, r, { u: 0, dirty: false }), 'quiet'); };

  /* Backup: everything that is part of the book (not device keys). */
  S.exportAll = function () { return S.everything().filter(function (r) { return syncable(r.t); }).map(function (r) { return { id: r.id, t: r.t, d: r.d, u: r.u, del: r.del }; }); };
  /* Restore: add what is missing, and take the newer copy of anything on both sides. */
  S.importAll = function (list) {
    var n = 0;
    (list || []).forEach(function (r) {
      if (!r || !r.id || !r.t || !syncable(r.t)) return;
      var mine = recs.get(r.id);
      if (mine && mine.u >= r.u) return;
      write({ id: r.id, t: r.t, d: r.d, u: r.u, del: !!r.del, dirty: true, sv: mine ? mine.sv : false, by: mine ? mine.by : undefined }, 'quiet'); n++;
    });
    fire('local'); return n;
  };

  /* ---- Handy readers used by the screens ---- */
  S.bills = function () { return S.list('b'); };
  S.entries = function () { return S.list('e'); };
  S.parties = function () { return S.list('p'); };
  S.items = function () { return S.list('i'); };
  S.settings = function () { var r = S.get('settings'); return Object.assign({ bizName: '', creditDays: 30 }, r ? r.d : {}); };
  S.setSettings = function (patch) { return S.get('settings') ? S.update('settings', patch) : S.add('s', Object.assign({ bizName: '', creditDays: 30 }, patch), 'settings'); };
  S.partyByName = function (name) { var k = NK.key(name); return S.parties().find(function (p) { return NK.key(p.d.name) === k; }) || null; };
  S.itemByName = function (name) { var k = NK.key(name); return S.items().find(function (i) { return NK.key(i.d.name) === k; }) || null; };
  S.ensureParty = function (name) { return S.partyByName(name) || S.add('p', { name: String(name).trim(), phone: '', at: Date.now() }); };
  S.creditDays = function (p) { var c = p && p.d.creditDays; return c === '' || c == null ? S.settings().creditDays : +c; };
  S.partyStats = function (p, today) {
    return NK.calc.partyStats(NK.calc.ledger(p.id, S.bills(), S.entries()), today || NK.today(), S.creditDays(p));
  };
})(globalThis.NK = globalThis.NK || {});
