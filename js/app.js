/* APP: start-up, first-time setup, the lock screen and auto-lock. */
(function (NK) {
  'use strict';
  var U = NK.ui, S = NK.store, sec = NK.sec, t = function (k, v) { return NK.t(k, v); };
  var A = NK.app = { meta: {}, device: '', bioOk: false, bioOn: false };
  var $ = function (id) { return document.getElementById(id); };
  var last = Date.now(), pin = '', busy = false, waitTimer = 0;

  A.setMeta = function (k, v) { A.meta[k] = v; return NK.db.metaSet(k, v); };
  A.touch = function () { last = Date.now(); };
  A.setTheme = function (v) { A.setMeta('theme', v); document.documentElement.dataset.theme = v === 'auto' ? '' : v; };
  A.setLang = function (v) { NK.lang = v; A.setMeta('lang', v); document.documentElement.lang = v; if (sec.unlocked() || U.cur === 'ob') U.render(); else drawLock(); };

  /* ---------- Start ---------- */
  A.boot = function () {
    U.init();
    /* Keep the name on the lock screen the same as the business name, also when it changes on another phone. */
    S.on(function () { if (!sec.unlocked()) return; var n = S.settings().bizName; if (n && n !== A.meta.bizName) A.setMeta('bizName', n); });
    Promise.all(['lang', 'theme', 'bizName', 'autolock', 'device'].map(NK.db.metaGet)).then(function (m) {
      A.meta = { lang: m[0] || ((navigator.language || '').indexOf('hi') === 0 ? 'hi' : 'en'), theme: m[1] || 'auto', bizName: m[2] || '', autolock: m[3] || 2 };
      A.device = m[4] || NK.id('d'); if (!m[4]) NK.db.metaSet('device', A.device);
      NK.lang = A.meta.lang; document.documentElement.lang = NK.lang;
      document.documentElement.dataset.theme = A.meta.theme === 'auto' ? '' : A.meta.theme;
      return Promise.all([sec.hasPin(), sec.bioSupported().catch(function () { return false; }), sec.bioEnabled()]);
    }).then(function (r) {
      A.bioOk = !!r[1]; A.bioOn = !!r[2];
      if (r[0]) showLock(); else startSetup();
      document.body.classList.add('ready');
    });
    /* Auto-lock when idle, and when the app comes back after being away. */
    setInterval(checkIdle, 5000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) checkIdle(); });
    ['pointerdown', 'keydown'].forEach(function (e) { document.addEventListener(e, A.touch, true); });
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !(globalThis.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform())) navigator.serviceWorker.register('sw.js').catch(function () {});
  };
  function checkIdle() { if (sec.unlocked() && Date.now() - last > (A.meta.autolock || 2) * 60000) A.lock(); }

  /* ---------- Lock screen ---------- */
  A.lock = function () {
    if (S.pending) return S.flush().then(A.lock);
    NK.sync.stop(); sec.lock(); S.clearMemory();
    NK.kp.key = null; NK.kp.spec = null; U.sheets = []; U.closeWheel();
    ['main', 'dock', 'sheets'].forEach(function (i) { U.html($(i), ''); }); $('kp').hidden = true; document.body.classList.remove('kpopen');
    showLock();
  };
  function showLock() { pin = ''; document.body.classList.add('locked'); $('lock').hidden = false; drawLock(true); U.keyHook = lockKey; tick(); }
  function drawLock(anim) {
    var name = A.meta.bizName || NK.cfg.appName;
    /* Business name rises letter by letter. */
    if (anim) $('lname').innerHTML = Array.from(name).map(function (ch, i) { return '<span style="animation-delay:' + (i * 55) + 'ms">' + (ch === ' ' ? '&nbsp;' : NK.esc(ch)) + '</span>'; }).join('');
    $('ldots').innerHTML = [0, 1, 2, 3, 4, 5].map(function (i) { return '<i class="' + (i < pin.length ? 'on' : '') + '"></i>'; }).join('');
    $('lbio').hidden = !A.bioOn; $('lbio').textContent = t('use_finger');
    $('lforgot').textContent = t('forgot_pin');
    if (!$('lmsg').dataset.keep) $('lmsg').textContent = t('enter_pin');
  }
  function lockMsg(s, keep) { $('lmsg').textContent = s; if (keep) $('lmsg').dataset.keep = '1'; else delete $('lmsg').dataset.keep; }
  /* While wrong tries are being slowed down, show the seconds left. */
  function tick() {
    clearTimeout(waitTimer);
    sec.waitMs().then(function (ms) {
      if (sec.unlocked()) return;
      if (ms > 0) { lockMsg(t('pin_wait', { s: Math.ceil(ms / 1000) }), true); $('lpad').classList.add('off'); waitTimer = setTimeout(tick, 1000); }
      else { $('lpad').classList.remove('off'); if ($('lmsg').dataset.keep) lockMsg(t('enter_pin')); }
    });
  }
  function lockPress(k) {
    if (busy || $('lpad').classList.contains('off')) return;
    if (k === 'b') pin = pin.slice(0, -1); else if (pin.length < 6) pin += k;
    lockMsg(t('enter_pin')); drawLock();
    if (pin.length === 6) tryPin();
  }
  function tryPin() {
    busy = true; $('lock').classList.add('working');
    var p = pin;
    sec.unlock(p).then(function (r) {
      busy = false; $('lock').classList.remove('working'); pin = '';
      if (r.ok) return opened();
      drawLock(); $('ldots').classList.add('shake'); setTimeout(function () { $('ldots').classList.remove('shake'); }, 400);
      if (r.wait) tick(); else lockMsg(t('pin_wrong_left', { n: r.left }), false);
    });
  }
  function opened() {
    U.keyHook = null; document.body.classList.remove('locked'); $('lock').hidden = true; last = Date.now();
    return S.load().then(function () {
      var st = S.settings(); if (st.bizName && st.bizName !== A.meta.bizName) A.setMeta('bizName', st.bizName);
      NK.sync.start(); U.go('bill', { fresh: true });
    });
  }
  function lockKey(e) { if (/^[0-9]$/.test(e.key)) { lockPress(e.key); return true; } if (e.key === 'Backspace') { lockPress('b'); return true; } return false; }

  function initLock() {
    $('lpad').addEventListener('pointerdown', function (e) { var b = e.target.closest('button'); if (!b) return; e.preventDefault(); lockPress(b.dataset.k); });
    $('lbio').addEventListener('click', function () { sec.bioUnlock().then(opened, function () { lockMsg(t('bio_fail')); }); });
    $('lforgot').addEventListener('click', function () { $('lhelp').hidden = false; $('lhelptext').textContent = t('forgot_text'); $('lerase').textContent = t('erase_btn'); $('lclose').textContent = t('cancel'); });
    $('lclose').addEventListener('click', function () { $('lhelp').hidden = true; });
    $('lerase').addEventListener('click', function () { if ($('lerase').dataset.sure) return A.erase(); $('lerase').dataset.sure = '1'; $('lerase').textContent = t('erase_sure'); });
    $('llang').addEventListener('click', function () { A.setLang(NK.lang === 'hi' ? 'en' : 'hi'); });
  }

  /* Erase everything on this device (used by "Forgot PIN" and by More > Backup). */
  A.erase = function () {
    var out = globalThis.firebase && firebase.apps.length ? firebase.auth().signOut().catch(function () {}) : Promise.resolve();
    return out.then(function () { return NK.db.clear(); }).then(function () { location.reload(); });
  };

  /* ---------- First time: three short screens ---------- */
  var O = { step: 1, name: '', p1: '', p2: '', party: '' };
  function startSetup() { document.body.classList.add('ob'); U.cur = 'ob'; U.render(); if (NK.kp.desk()) NK.kp.focus('oname'); }
  U.screens.ob = {
    title: function () { return ''; },
    render: function () {
      var dots = '<div class="steps">' + [1, 2, 3].map(function (i) { return '<i class="' + (i === O.step ? 'on' : '') + '"></i>'; }).join('') + '</div>';
      var lang = '<button type="button" class="langbtn" data-a="lang">' + (NK.lang === 'hi' ? 'English' : 'हिंदी') + '</button>';
      if (O.step === 1) return lang + dots + '<h2>' + t('ob1_title') + '</h2><p class="hint">' + t('ob1_hint') + '</p>' + U.fld('oname', O.name, t('biz_name'), 'big') + '<div class="mt2">' + U.btn('n1', t('next'), 'pri wide', O.name.trim() ? '' : 'disabled') + '</div>';
      if (O.step === 2) return lang + dots + '<h2>' + t('ob2_title') + '</h2><p class="hint">' + t('ob2_hint') + '</p><label>' + t('pin_new') + '</label>' + U.fld('op1', O.p1, '', 'big pinf', true) + '<label>' + t('pin_again') + '</label>' + U.fld('op2', O.p2, '', 'big pinf', true) +
        '<p class="warn">' + t('pin_forget') + '</p><div class="mt">' + U.btn('n2', t('set_pin'), 'pri wide', O.p1.length === 6 && O.p1 === O.p2 ? '' : 'disabled') + '</div>';
      return lang + dots + '<h2>' + t('ob3_title') + '</h2><p class="hint">' + t('ob3_hint') + '</p>' + U.fld('oparty', O.party, t('party_name'), 'big') + '<div class="row2 mt2">' + U.btn('skip', t('skip'), 'ghost') + U.btn('n3', t('start'), 'pri', O.party.trim() ? '' : 'disabled') + '</div>';
    },
    field: function (k) {
      if (k === 'oname') return { kind: 'text', max: 30, get: function () { return O.name; }, set: function (v) { O.name = v; }, next: function () { if (O.name.trim()) U.action('n1'); } };
      if (k === 'op1') return { kind: 'int', max: 6, get: function () { return O.p1; }, set: function (v) { O.p1 = v; if (v.length === 6) NK.kp.focus('op2'); }, next: function () { NK.kp.focus('op2'); } };
      if (k === 'op2') return { kind: 'int', max: 6, get: function () { return O.p2; }, set: function (v) { O.p2 = v; }, next: function () { if (O.p1.length === 6 && O.p1 === O.p2) U.action('n2'); else NK.kp.blur(); } };
      if (k === 'oparty') return { kind: 'text', max: 40, get: function () { return O.party; }, set: function (v) { O.party = v; }, next: function () { if (O.party.trim()) U.action('n3'); } };
      return null;
    },
    act: {
      lang: function () { A.setLang(NK.lang === 'hi' ? 'en' : 'hi'); },
      n1: function () { O.step = 2; NK.kp.focus('op1'); },
      n2: function (b) {
        if (O.p1.length !== 6 || O.p1 !== O.p2) return;
        NK.kp.key = null; NK.kp.spec = null;
        U.busy(b || document.querySelector('[data-a="n2"]'), sec.setup(O.p1)).then(function () {
          S.clearMemory(); S.setSettings({ bizName: O.name.trim() }); A.setMeta('bizName', O.name.trim());
          O.p1 = O.p2 = ''; O.step = 3; NK.kp.focus('oparty');
        });
      },
      skip: function () { finish(); },
      n3: function () { if (O.party.trim()) S.ensureParty(O.party); finish(O.party.trim()); }
    }
  };
  function finish(party) { document.body.classList.remove('ob'); last = Date.now(); NK.sync.start(); U.go('bill', { fresh: true, party: party || '' }); }

  document.addEventListener('DOMContentLoaded', function () { initLock(); A.boot(); });
})(globalThis.NK = globalThis.NK || {});
