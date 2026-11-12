/* UI SHELL: moving between screens, drawing them, pop-up sheets, messages, date wheel.
   Each screen is a small object: render() gives the page, dock() gives the bar above the
   keypad, field(name) describes a typing box, act holds what the buttons do. */
(function (NK) {
  'use strict';
  var U = NK.ui = { screens: {}, cur: 'bill', sheets: [], flash: null, keyHook: null };
  var $ = function (id) { return document.getElementById(id); };
  var TABS = ['bill', 'ledger', 'parties', 'items', 'more'];
  var prevNums = {}, toastTimer = null, raf = 0;

  /* Only touch the page when something really changed, so a tap in progress is never lost. */
  U.html = function (el, h) { if (el._h !== h) { el._h = h; el.innerHTML = h; } };

  /* A typing box. The value is plain text inside a div, so no system keyboard appears. */
  U.fld = function (key, value, ph, cls, mask) {
    var on = NK.kp.key === key, v = String(value == null ? '' : value);
    if (mask) v = v.replace(/./g, '•');
    return '<div class="fld ' + (cls || '') + (on ? ' on' : '') + '" data-f="' + key + '" role="textbox" tabindex="0" aria-label="' + NK.esc(ph || key) + '">' +
      (v ? '<span class="v">' + NK.esc(v) + '</span>' : '<span class="ph">' + NK.esc(ph || '') + '</span>') + '</div>';
  };
  U.btn = function (act, label, cls, attrs) { return '<button type="button" class="btn ' + (cls || '') + '" data-a="' + act + '" ' + (attrs || '') + '>' + label + '</button>'; };

  function ctx() { return U.sheets.length ? U.sheets[U.sheets.length - 1] : U.screens[U.cur]; }
  U.fieldSpec = function (key) { var c = ctx(); return c && c.field ? c.field(key) : null; };

  /* Open a screen. */
  U.go = function (name, arg) {
    NK.kp.key = null; NK.kp.spec = null; U.sheets = [];
    U.cur = name;
    var s = U.screens[name]; if (s.open) s.open(arg);
    U.render();
    $('main').scrollTop = 0;
    if (NK.kp.desk() && s.first) NK.kp.focus(typeof s.first === 'function' ? s.first() : s.first);
  };

  /* Draw the current screen. Called after every key press; it is cheap. */
  U.render = function () {
    if (!NK.sec.unlocked() && U.cur !== 'ob') return;
    var s = U.screens[U.cur], kp = NK.kp;
    if (kp.key) { kp.spec = U.fieldSpec(kp.key); if (!kp.spec) kp.key = null; }
    $('title').textContent = s.title ? s.title() : '';
    $('back').hidden = !s.back;
    U.html($('main'), s.render());
    U.html($('dock'), (kp.spec && kp.spec.sugg ? sugg(kp.spec.sugg()) : '') + (s.dock ? s.dock() : ''));
    var sh = $('sheets');
    U.html(sh, U.sheets.map(function (x, i) { return '<div class="scrim" data-a="closeSheet"></div><div class="sheet" data-sheet="' + i + '">' + x.render() + '</div>'; }).join(''));
    sh.hidden = !U.sheets.length;
    TABS.forEach(function (t) { var b = $('tab-' + t); b.classList.toggle('on', (s.tab || U.cur) === t); b.querySelector('span').textContent = NK.t('tab_' + t); });
    kp.draw();
    status();
    animate();
    if (s.after) s.after();
  };

  function sugg(list) {
    if (!list || !list.length) return '';
    U._sugg = list;
    return '<div class="sugg">' + list.slice(0, 12).map(function (x, i) {
      return '<button type="button" class="chip" data-a="sugg" data-i="' + i + '">' + NK.esc(x.label) + (x.sub ? ' <b>' + NK.esc(x.sub) + '</b>' : '') + '</button>';
    }).join('') + '</div>';
  }

  /* Small animations: numbers that changed give a little bump; a new entry slides in. */
  function animate() {
    document.querySelectorAll('[data-n]').forEach(function (e) {
      var k = e.dataset.n, v = e.textContent;
      if (prevNums[k] != null && prevNums[k] !== v) { e.classList.remove('bump'); void e.offsetWidth; e.classList.add('bump'); }
      prevNums[k] = v;
    });
    if (U.flash) {
      var e = document.querySelector('[data-id="' + U.flash + '"]');
      if (e) { e.classList.add('new'); if (e.scrollIntoView) e.scrollIntoView({ block: 'nearest' }); }
      U.flash = null;
    }
  }

  /* Status line: Saved on this phone / Synced / No internet. */
  function status() {
    var st = NK.sync ? NK.sync.status() : 'local', e = $('status');
    e.className = 'status ' + st;
    e.textContent = NK.t('st_' + st);
  }
  U.status = status;

  /* Run a button's action: the open sheet first, then the screen, then shared actions. */
  U.action = function (name, elx, ev) {
    var c = ctx(), fn = (c.act && c.act[name]) || (U.screens[U.cur].act && !U.sheets.length && U.screens[U.cur].act[name]) || shared[name];
    if (fn) fn(elx, ev);
  };
  var shared = {
    closeSheet: function () { U.closeSheet(); },
    sugg: function (b) { var x = U._sugg[+b.dataset.i]; if (x) x.pick(); },
    undo: function () { if (U._undo) { var f = U._undo; U._undo = null; hideToast(); f(); U.toast(NK.t('undone')); U.render(); } },
    tab: function (b) { U.go(b.dataset.tab); },
    back: function () { var s = U.screens[U.cur]; U.go(s.back || 'more'); },
    lock: function () { NK.app.lock(); }
  };
  U.escape = function () {
    if ($('wheel') && !$('wheel').hidden) return U.closeWheel();
    if (NK.kp.key) return NK.kp.blur();
    if (U.sheets.length) return U.closeSheet();
    if (U.screens[U.cur].back) U.go(U.screens[U.cur].back);
  };

  /* Pop-up sheet from the bottom. */
  U.sheet = function (def) { NK.kp.key = null; NK.kp.spec = null; U.sheets.push(def); U.render(); if (def.first) NK.kp.focus(def.first); return def; };
  U.closeSheet = function () { var s = U.sheets.pop(); NK.kp.key = null; NK.kp.spec = null; U.render(); if (s && s.onClose) s.onClose(); };

  /* Yes / No question in plain words. */
  U.ask = function (msg, yes, danger) {
    return new Promise(function (res) {
      U.sheet({
        render: function () { return '<p class="msg">' + NK.esc(msg) + '</p><div class="row2">' + U.btn('no', NK.t('cancel'), 'ghost') + U.btn('yes', NK.esc(yes), danger ? 'danger' : 'pri') + '</div>'; },
        act: { yes: function () { U.sheets.pop(); U.render(); res(true); }, no: function () { U.sheets.pop(); U.render(); res(false); }, closeSheet: function () { U.sheets.pop(); U.render(); res(false); } }
      });
    });
  };

  /* Message at the bottom, with Undo when a save can be taken back. */
  U.toast = function (msg, opt) {
    opt = opt || {};
    var t = $('toast');
    U._undo = opt.undo || null;
    t.innerHTML = '<div class="tin"><span>' + NK.esc(msg) + '</span>' + (opt.undo ? '<button type="button" class="tbtn" data-a="undo">' + NK.t('undo') + '</button>' : '') + '</div>';
    t.className = 'toast show' + (opt.bad ? ' bad' : '');
    clearTimeout(toastTimer); toastTimer = setTimeout(hideToast, opt.undo ? 7000 : 3500);
  };
  function hideToast() { $('toast').className = 'toast'; }

  /* Button loading state while something slow runs. */
  U.busy = function (b, p) {
    if (b) { b.classList.add('loading'); b.disabled = true; }
    return Promise.resolve(p).then(function (v) { if (b) { b.classList.remove('loading'); b.disabled = false; } return v; },
      function (e) { if (b) { b.classList.remove('loading'); b.disabled = false; } throw e; });
  };

  /* ---------- Scrolling date wheel with Today and Yesterday ---------- */
  var wheel = { cb: null, d: 1, m: 1, y: 2026 };
  U.pickDate = function (iso, cb) {
    var a = (iso || NK.today()).split('-'); wheel.y = +a[0]; wheel.m = +a[1]; wheel.d = +a[2]; wheel.cb = cb;
    NK.kp.key = null; NK.kp.spec = null; U.render();
    drawWheel(); $('wheel').hidden = false; setTimeout(scrollWheel, 0);
  };
  function col(name, vals, sel, lab) {
    return '<div class="wcol" data-w="' + name + '"><div class="wpad"></div>' + vals.map(function (v) {
      return '<button type="button" class="wi' + (v === sel ? ' sel' : '') + '" data-a="wpick" data-w="' + name + '" data-v="' + v + '">' + (lab ? lab(v) : v) + '</button>';
    }).join('') + '<div class="wpad"></div></div>';
  }
  function drawWheel() {
    var days = [], months = [], years = [], n = NK.daysInMonth(wheel.y, wheel.m), ty = new Date().getFullYear();
    if (wheel.d > n) wheel.d = n;
    for (var i = 1; i <= n; i++) days.push(i);
    for (i = 1; i <= 12; i++) months.push(i);
    for (i = ty - 5; i <= ty + 1; i++) years.push(i);
    if (years.indexOf(wheel.y) < 0) years.push(wheel.y), years.sort();
    $('wheel').innerHTML = '<div class="scrim" data-a="wclose"></div><div class="sheet wsheet">' +
      '<div class="wtop"><b>' + NK.fmtDate(wheel.y + '-' + wheel.m + '-' + wheel.d) + '</b></div>' +
      '<div class="row2">' + U.btn('wtoday', NK.t('today'), 'ghost') + U.btn('wyest', NK.t('yesterday'), 'ghost') + '</div>' +
      '<div class="wcols"><div class="wband"></div>' + col('d', days, wheel.d) + col('m', months, wheel.m, function (v) { return NK.MON[v - 1]; }) + col('y', years, wheel.y) + '</div>' +
      U.btn('wdone', NK.t('done'), 'pri wide') + '</div>';
    $('wheel').querySelectorAll('.wcol').forEach(function (c) {
      var t; c.addEventListener('scroll', function () {
        clearTimeout(t); t = setTimeout(function () {
          if (!c.isConnected) return;
          var idx = Math.round(c.scrollTop / 44), items = c.querySelectorAll('.wi');
          var b = items[Math.max(0, Math.min(items.length - 1, idx))]; if (!b) return;
          var v = +b.dataset.v, w = c.dataset.w; if (wheel[w] === v) return;
          var before = NK.daysInMonth(wheel.y, wheel.m);
          wheel[w] = v;
          /* Only the day column is rebuilt, and only when the month length changes. */
          if (NK.daysInMonth(wheel.y, wheel.m) !== before) { drawWheel(); scrollWheel(); return; }
          items.forEach(function (x) { x.classList.toggle('sel', x === b); });
          $('wheel').querySelector('.wtop b').textContent = NK.fmtDate(wheel.y + '-' + wheel.m + '-' + wheel.d);
        }, 90);
      });
    });
  }
  function scrollWheel() {
    $('wheel').querySelectorAll('.wcol').forEach(function (c) { var s = c.querySelector('.sel'); if (s) c.scrollTop = s.offsetTop - c.querySelector('.wpad').offsetHeight; });
  }
  U.closeWheel = function () { $('wheel').hidden = true; };
  function wheelDone(iso) { var cb = wheel.cb; U.closeWheel(); if (cb) cb(iso); }
  function p2(n) { return (n < 10 ? '0' : '') + n; }
  shared.wpick = function (b) { wheel[b.dataset.w] = +b.dataset.v; drawWheel(); scrollWheel(); };
  shared.wclose = function () { U.closeWheel(); };
  shared.wtoday = function () { wheelDone(NK.today()); };
  shared.wyest = function () { wheelDone(NK.addDays(NK.today(), -1)); };
  shared.wdone = function () { wheelDone(wheel.y + '-' + p2(wheel.m) + '-' + p2(wheel.d)); };

  /* One listener for every tap in the app. */
  U.init = function () {
    document.addEventListener('click', function (e) {
      NK.app.touch();
      var a = e.target.closest('[data-a]');
      if (a) { if (a.disabled) return; e.preventDefault(); return U.action(a.dataset.a, a, e); }
      var f = e.target.closest('[data-f]');
      if (f) return NK.kp.focus(f.dataset.f);
      /* Tapping an empty part of the page closes the keypad. */
      if (NK.kp.key && e.target.closest('main, header') && !e.target.closest('.sheet')) NK.kp.blur();
    });
    NK.kp.init();
    NK.store.on(function (why) { if (why === 'quiet') return; cancelAnimationFrame(raf); raf = requestAnimationFrame(function () { if (why === 'remote' && U.screens[U.cur].remote) U.screens[U.cur].remote(); U.render(); }); });
    addEventListener('online', status); addEventListener('offline', status);
  };
})(globalThis.NK = globalThis.NK || {});
