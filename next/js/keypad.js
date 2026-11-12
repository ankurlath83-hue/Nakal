/* KEYPAD: the app's own number keypad and alphabet keypad, plus laptop keyboard handling.
   There are no normal text boxes anywhere in the app, so the Android system keyboard never opens.
   A "field" is a plain box on screen; this file decides what typing does to it. */
(function (NK) {
  'use strict';
  var K = NK.kp = { key: null, spec: null, layout: null, shift: false, sym: false };
  var el = null, repeat = null;

  /* Laptop = has a mouse and real keyboard; the on-screen keypad is hidden there. */
  K.desk = function () { return matchMedia('(hover: hover) and (pointer: fine)').matches && !NK.forceTouch; };

  /* ---- Layouts. Each key: text shown, or {k: action, t: label, c: css class, w: width} ---- */
  function numRows(ledger) {
    return ledger ?
      [['1', '2', '3', { k: 'bksp', t: '⌫', c: 'fn' }], ['4', '5', '6', { k: 'next', t: NK.t('next'), c: 'fn' }],
       ['7', '8', '9', { k: 'paid', t: NK.t('paid'), c: 'kpaid' }], ['.', '0', '00', { k: 'bill', t: NK.t('bill'), c: 'kbill' }]] :
      [['1', '2', '3', { k: 'bksp', t: '⌫', c: 'fn' }], ['4', '5', '6', '.'],
       ['7', '8', '9', '00'], [{ k: 'hide', t: '▾', c: 'fn' }, '0', { k: 'next', t: NK.t('next'), c: 'go', w: 2 }]];
  }
  function alphaRows() {
    var L = K.sym ?
      ['1234567890'.split(''), ['@', '#', '₹', '_', '&', '-', '+', '(', ')', '/'], [{ k: 'sym', t: 'ABC', c: 'fn', w: 1.5 }, '*', '"', "'", ':', '!', '?', '%', { k: 'bksp', t: '⌫', c: 'fn', w: 1.5 }]] :
      ['qwertyuiop'.split(''), 'asdfghjkl'.split(''), [{ k: 'shift', t: '⇧', c: 'fn' + (K.shift ? ' lit' : ''), w: 1.5 }].concat('zxcvbnm'.split('')).concat([{ k: 'bksp', t: '⌫', c: 'fn', w: 1.5 }])];
    var email = K.spec && (K.spec.kind === 'email');
    L = L.concat([[{ k: 'sym', t: K.sym ? 'ABC' : '123', c: 'fn', w: 1.5 }, email ? '@' : ',', { k: 'space', t: NK.t('space'), w: email ? 3.5 : 4.5 }, '.', { k: 'next', t: NK.t('next'), c: 'go', w: 2.5 }]]);
    return L;
  }

  function draw() {
    if (!el) el = document.getElementById('kp');
    if (!K.spec || K.desk()) { el.hidden = true; document.body.classList.toggle('kpopen', !!K.spec && !K.desk()); return; }
    var pad = K.spec.pad || (/num|int/.test(K.spec.kind) ? 'num' : 'alpha');
    var rows = pad === 'alpha' ? alphaRows() : numRows(pad === 'ledger');
    var up = pad === 'alpha' && K.shift && !K.sym;
    el.className = 'kp ' + pad;
    NK.ui.html(el, rows.map(function (row) {
      return '<div class="kr">' + row.map(function (k) {
        var o = typeof k === 'string' ? { k: 'ch', t: up ? k.toUpperCase() : k, ch: up ? k.toUpperCase() : k } : k;
        return '<button type="button" class="k ' + (o.c || '') + '" style="flex:' + (o.w || 1) + '" data-k="' + o.k + '"' + (o.ch != null ? ' data-ch="' + NK.esc(o.ch) + '"' : '') + '>' + NK.esc(o.t) + '</button>';
      }).join('') + '</div>';
    }).join(''));
    el.hidden = false; document.body.classList.add('kpopen');
  }
  K.draw = draw;

  /* Names start with a capital letter by themselves. */
  function autoShift() {
    if (!K.spec || K.spec.kind !== 'text') { K.shift = false; return; }
    var v = String(K.spec.get() || ''); K.shift = v === '' || / $/.test(v);
  }

  /* Give the typing focus to a field (by its name on the current screen). */
  K.focus = function (key) {
    var spec = NK.ui.fieldSpec(key);
    if (!spec) return K.blur();
    K.key = key; K.spec = spec; K.sym = false; autoShift();
    NK.ui.render();
    var f = document.querySelector('[data-f="' + key + '"]');
    if (f && f.scrollIntoView) f.scrollIntoView({ block: 'nearest' });
  };
  K.blur = function () { if (!K.key) return; K.key = null; K.spec = null; NK.ui.render(); };

  function allowed(ch, spec, v) {
    if (spec.kind === 'num') return /[0-9]/.test(ch) || (ch === '.' && v.indexOf('.') < 0);
    if (spec.kind === 'int') return /[0-9]/.test(ch);
    if (spec.kind === 'email' || spec.kind === 'lower') return /[^\s]/.test(ch);
    return true;
  }
  /* Type one character (or "00") into the active field. */
  K.type = function (s) {
    var spec = K.spec; if (!spec) return;
    var v = String(spec.get() || '');
    for (var i = 0; i < s.length; i++) {
      var ch = (spec.kind === 'email' || spec.kind === 'lower') ? s[i].toLowerCase() : s[i];
      if (!allowed(ch, spec, v)) continue;
      if (spec.max && v.length >= spec.max) break;
      if (spec.kind === 'num') {
        var dot = v.indexOf('.');
        if (dot >= 0 && v.length - dot > 2) break;      // two decimals at most
        if (v === '0' && ch !== '.') v = '';            // no leading zeros
        if (v === '' && ch === '.') v = '0';
      }
      v += ch;
    }
    spec.set(v); autoShift(); NK.ui.render();
  };
  K.back = function () { var spec = K.spec; if (!spec) return; var v = String(spec.get() || ''); spec.set(v.slice(0, -1)); autoShift(); NK.ui.render(); };
  K.next = function () { var spec = K.spec; if (!spec) return; if (spec.next) spec.next(); else K.blur(); };

  function press(k, ch) {
    if (navigator.vibrate && NK.haptic) { try { navigator.vibrate(8); } catch (e) {} }
    if (k === 'ch') K.type(ch);
    else if (k === 'space') K.type(' ');
    else if (k === 'bksp') K.back();
    else if (k === 'next') K.next();
    else if (k === 'hide') K.blur();
    else if (k === 'shift') { K.shift = !K.shift; draw(); }
    else if (k === 'sym') { K.sym = !K.sym; draw(); }
    else if (k === 'paid' || k === 'bill') NK.ui.action(k === 'paid' ? 'savePaid' : 'saveBillEntry');
  }

  K.init = function () {
    el = document.getElementById('kp');
    /* Keys answer on touch-down so entry feels instant. Holding backspace repeats. */
    el.addEventListener('pointerdown', function (e) {
      var b = e.target.closest('.k'); if (!b) return;
      e.preventDefault(); clearTimeout(repeat);
      var k = b.dataset.k, ch = b.dataset.ch;
      b.classList.add('dn'); setTimeout(function () { b.classList.remove('dn'); }, 120);
      press(k, ch);
      if (k === 'bksp') { repeat = setTimeout(function rep() { K.back(); repeat = setTimeout(rep, 70); }, 400); }
    });
    ['pointerup', 'pointercancel'].forEach(function (ev) { document.addEventListener(ev, function () { clearTimeout(repeat); }); });

    /* Real keyboard (laptop): Enter or Tab = next box, P = Paid, B = Bill, Esc = close. */
    document.addEventListener('keydown', function (e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (NK.ui.keyHook && NK.ui.keyHook(e)) { e.preventDefault(); return; }
      if (e.key === 'Escape') { e.preventDefault(); NK.ui.escape(); return; }
      if (!K.spec) return;
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); K.next(); return; }
      if (e.key === 'Backspace') { e.preventDefault(); K.back(); return; }
      if (e.key.length !== 1) return;
      e.preventDefault();
      if (K.spec.pad === 'ledger' && /^[pP]$/.test(e.key)) return NK.ui.action('savePaid');
      if (K.spec.pad === 'ledger' && /^[bB]$/.test(e.key)) return NK.ui.action('saveBillEntry');
      K.type(e.key);
    });
    document.addEventListener('paste', function (e) {
      if (!K.spec) return; e.preventDefault();
      K.type(((e.clipboardData || {}).getData ? e.clipboardData.getData('text') : '').replace(/[\r\n]+/g, ' '));
    });
  };
})(globalThis.NK = globalThis.NK || {});
