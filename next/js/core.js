/* CORE: small helpers used by every part of the app.
   Money in Indian style, dates as "12 Nov 2026", financial year April to March, ids. */
(function (NK) {
  'use strict';

  /* Round to paise so totals never drift. */
  NK.r2 = function (n) { return Math.round((Number(n) || 0) * 100) / 100; };

  /* Read a typed number safely ("" -> 0). */
  NK.num = function (v) { var n = parseFloat(String(v == null ? '' : v).replace(/,/g, '')); return isFinite(n) ? n : 0; };

  /* 100000 -> "1,00,000" (Indian commas). Paise are shown only when present. */
  NK.commas = function (n) {
    n = NK.r2(n);
    var neg = n < 0; n = Math.abs(n);
    var whole = Math.floor(n), paise = Math.round((n - whole) * 100);
    if (paise === 100) { whole += 1; paise = 0; }
    var s = String(whole), last3 = s.slice(-3), rest = s.slice(0, -3);
    if (rest) last3 = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3;
    return (neg ? '-' : '') + last3 + (paise ? '.' + (paise < 10 ? '0' : '') + paise : '');
  };
  NK.money = function (n) { return '₹' + NK.commas(n); };

  /* Dates are kept as "2026-11-12" so they sort correctly. */
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  NK.MON = MON;
  function p2(n) { return (n < 10 ? '0' : '') + n; }
  NK.iso = function (d) { return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); };
  NK.today = function () { return NK.iso(new Date()); };
  NK.parse = function (iso) { var a = String(iso).split('-'); return new Date(+a[0], +a[1] - 1, +a[2]); };
  NK.addDays = function (iso, n) { var d = NK.parse(iso); d.setDate(d.getDate() + n); return NK.iso(d); };
  NK.daysBetween = function (a, b) { return Math.round((NK.parse(b) - NK.parse(a)) / 86400000); };
  /* "2026-11-12" -> "12 Nov 2026" */
  NK.fmtDate = function (iso) { if (!iso) return ''; var a = String(iso).split('-'); return (+a[2]) + ' ' + MON[+a[1] - 1] + ' ' + a[0]; };
  NK.fmtDateShort = function (iso) { if (!iso) return ''; var a = String(iso).split('-'); return (+a[2]) + ' ' + MON[+a[1] - 1]; };
  NK.daysInMonth = function (y, m) { return new Date(y, m, 0).getDate(); };

  /* Financial year runs 1 April to 31 March. */
  NK.fyStart = function (iso) { var a = String(iso).split('-'), y = +a[0]; if (+a[1] < 4) y -= 1; return y + '-04-01'; };
  NK.periods = function (today) {
    var a = today.split('-'), y = +a[0], m = +a[1];
    var ly = m === 1 ? y - 1 : y, lm = m === 1 ? 12 : m - 1;
    return {
      month: { from: y + '-' + p2(m) + '-01', to: y + '-' + p2(m) + '-' + p2(NK.daysInMonth(y, m)) },
      last: { from: ly + '-' + p2(lm) + '-01', to: ly + '-' + p2(lm) + '-' + p2(NK.daysInMonth(ly, lm)) },
      fy: { from: NK.fyStart(today), to: (+NK.fyStart(today).slice(0, 4) + 1) + '-03-31' },
      all: { from: '0000-01-01', to: '9999-12-31' }
    };
  };

  /* Random id for every record, so two devices never clash. */
  NK.id = function (prefix) {
    var b = new Uint8Array(9); crypto.getRandomValues(b);
    var s = ''; for (var i = 0; i < b.length; i++) s += (b[i] % 36).toString(36);
    return (prefix || '') + Date.now().toString(36) + s;
  };

  /* Text helpers. */
  NK.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  NK.key = function (s) { return String(s || '').trim().toLowerCase().replace(/\s+/g, ' '); };
  NK.csv = function (rows) {
    return '﻿' + rows.map(function (r) {
      return r.map(function (c) { c = String(c == null ? '' : c); return /[",\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(',');
    }).join('\r\n');
  };

  /* Bytes <-> base64, used by encryption and backup. */
  NK.b64 = function (buf) { var b = new Uint8Array(buf), s = ''; for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s); };
  NK.unb64 = function (s) { var bin = atob(s), b = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i); return b; };
})(globalThis.NK = globalThis.NK || {});
