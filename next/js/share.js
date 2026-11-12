/* SHARING: WhatsApp text, picture and PDF of a bill, party statement, payment reminder, rate chart.
   Pictures are drawn in the notebook style. The PDF is made here in the app; nothing is sent to any server. */
(function (NK) {
  'use strict';
  var S = NK.store, C = NK.calc, t = function (k, v) { return NK.t(k, v); };
  var H = NK.share = {};
  function biz() { return S.settings().bizName || NK.cfg.appName; }

  /* WhatsApp is the main way to share. Phone numbers are 10 digits; 91 is added for India. */
  H.waUrl = function (text, phone) { return 'https://wa.me/' + (/^\d{10}$/.test(phone || '') ? '91' + phone : '') + '?text=' + encodeURIComponent(text); };
  H.whatsapp = function (text, phone) { window.open(H.waUrl(text, phone), '_blank'); };

  /* Hand a file (picture, PDF, CSV, backup) to the phone's share sheet, or download it on a laptop. */
  H.file = function (blob, name) {
    var cap = globalThis.Capacitor, P = cap && cap.isNativePlatform && cap.isNativePlatform() ? cap.Plugins : null;
    if (P && P.Filesystem && P.Share) {
      return blob.arrayBuffer().then(function (b) { return P.Filesystem.writeFile({ path: name, data: NK.b64(b), directory: 'CACHE' }); })
        .then(function (r) { return P.Share.share({ title: name, url: r.uri }); }).catch(function () {});
    }
    var f = null; try { f = new File([blob], name, { type: blob.type }); } catch (e) {}
    if (!NK.kp.desk() && f && navigator.canShare && navigator.canShare({ files: [f] })) return navigator.share({ files: [f], title: name }).catch(function () {});
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
    return Promise.resolve();
  };

  /* ---------- Words ---------- */
  H.billText = function (b) {
    var p = S.get(b.d.partyId), L = ['*' + biz() + '*', t('bill') + ' #' + b.d.no + ' · ' + NK.fmtDate(b.d.date), (p ? p.d.name : ''), ''];
    b.d.rows.forEach(function (r, i) { L.push((i + 1) + '. ' + r.item + ' – ' + NK.commas(r.qty) + (r.unit ? ' ' + r.unit : '') + ' × ' + NK.commas(r.rate) + ' = ' + NK.money(C.rowAmt(r))); });
    L.push('', t('sub_total') + ': ' + NK.money(C.subTotal(b.d.rows)));
    if (b.d.transport) L.push(t('transport') + ': ' + NK.money(b.d.transport));
    L.push('*' + t('grand_total') + ': ' + NK.money(C.grand(b.d)) + '*');
    return L.join('\n');
  };
  H.reminderText = function (p, st) {
    return t('remind_text', { name: p.d.name, biz: biz(), amt: NK.money(st.balance), date: NK.fmtDate(NK.today()) }) + (st.overdue > 0 ? ' ' + t('remind_late', { n: st.overdue }) : '') + ' ' + t('remind_end');
  };
  function stmtLines(p) {
    var led = C.ledger(p.id, S.bills(), S.entries());
    var all = led.paid.map(function (e) { return { e: e, k: 'paid' }; }).concat(led.bill.map(function (e) { return { e: e, k: 'bill' }; }))
      .sort(function (a, b) { return a.e.date < b.e.date ? -1 : a.e.date > b.e.date ? 1 : a.e.at - b.e.at; });
    return { led: led, all: all, st: C.partyStats(led, NK.today(), S.creditDays(p)) };
  }
  H.statementText = function (p) {
    var x = stmtLines(p), L = ['*' + biz() + '*', t('statement') + ' · ' + p.d.name, NK.fmtDate(NK.today()), ''];
    var show = x.all.slice(-40);
    if (x.all.length > show.length) L.push('… ' + t('older_n', { n: x.all.length - show.length }));
    show.forEach(function (y) { L.push(NK.fmtDateShort(y.e.date) + '  ' + t(y.k) + (y.e.note ? ' ' + y.e.note : '') + '  ' + NK.money(y.e.amt)); });
    L.push('', t('total_bill') + ': ' + NK.money(x.st.bill), t('total_paid') + ': ' + NK.money(x.st.paid), '*' + NK.balWord(x.st.balance) + ': ' + NK.money(Math.abs(x.st.balance)) + '*');
    return L.join('\n');
  };
  H.rateText = function () {
    var L = ['*' + biz() + ' – ' + t('rate_chart') + '*', NK.fmtDate(NK.today()), ''];
    NK.rateList().forEach(function (i) { L.push(i.d.name + ': ' + NK.money(i.d.rate) + (i.d.unit ? ' / ' + i.d.unit : '')); });
    return L.join('\n');
  };

  /* ---------- Pictures (drawn on a canvas in the notebook look) ---------- */
  function paper(doc) {
    var W = 900, pad = 48, rowH = 46, y = 0;
    var h = 150 + doc.sub.length * 34 + 60 + doc.rows.length * rowH + doc.totals.length * 50 + 80;
    var cv = document.createElement('canvas'); cv.width = W; cv.height = h;
    var g = cv.getContext('2d'), font = 'system-ui, "Noto Sans Devanagari", "Nirmala UI", sans-serif';
    g.fillStyle = '#fbf6e6'; g.fillRect(0, 0, W, h);
    g.fillStyle = '#1f3a8a'; g.textBaseline = 'middle';
    g.font = '700 40px ' + font; g.fillText(clip(g, doc.title, W - pad * 2), pad, y = 62);
    g.font = '400 26px ' + font; y += 26;
    doc.sub.forEach(function (s) { y += 34; g.fillText(clip(g, s, W - pad * 2), pad, y); });
    y += 44;
    var xs = [], x = pad; doc.cols.forEach(function (c) { xs.push(x); x += c.w * (W - pad * 2); });
    function cell(txt, i, bold) {
      var c = doc.cols[i], w = c.w * (W - pad * 2) - 12; g.font = (bold ? '700' : '400') + ' 26px ' + font;
      txt = clip(g, String(txt), w); g.textAlign = c.r ? 'right' : 'left'; g.fillText(txt, c.r ? xs[i] + w + 6 : xs[i], y);
    }
    function rule(col) { g.strokeStyle = col || '#b9c6e4'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(pad, y + rowH / 2); g.lineTo(W - pad, y + rowH / 2); g.stroke(); }
    doc.cols.forEach(function (c, i) { cell(c.label, i, true); }); rule('#1f3a8a');
    doc.rows.forEach(function (r) { y += rowH; r.forEach(function (v, i) { g.fillStyle = r.color || '#1f3a8a'; cell(v, i); }); rule(); });
    g.textAlign = 'left'; y += 20;
    doc.totals.forEach(function (tt) {
      y += 50; g.fillStyle = tt[2] || '#1f3a8a'; g.font = (tt[3] ? '700 32px ' : '400 28px ') + font;
      g.textAlign = 'left'; g.fillText(tt[0], pad, y); g.textAlign = 'right'; g.fillText(tt[1], W - pad, y);
    });
    g.textAlign = 'left';
    return cv;
  }
  function clip(g, s, w) { if (g.measureText(s).width <= w) return s; while (s.length > 1 && g.measureText(s + '…').width > w) s = s.slice(0, -1); return s + '…'; }

  function billDoc(b) {
    var p = S.get(b.d.partyId);
    return { title: biz(), sub: [t('bill') + ' #' + b.d.no + '   ' + NK.fmtDate(b.d.date), p ? p.d.name : ''],
      cols: [{ label: t('item'), w: 0.44 }, { label: t('qty'), w: 0.17, r: 1 }, { label: t('rate'), w: 0.17, r: 1 }, { label: t('amount'), w: 0.22, r: 1 }],
      rows: b.d.rows.map(function (r) { return [r.item, NK.commas(r.qty) + (r.unit ? ' ' + r.unit : ''), NK.commas(r.rate), NK.commas(C.rowAmt(r))]; }),
      totals: [[t('sub_total'), NK.money(C.subTotal(b.d.rows))], [t('transport'), NK.money(b.d.transport || 0)], [t('grand_total'), NK.money(C.grand(b.d)), '#b3261e', 1]] };
  }
  function stmtDoc(p) {
    var x = stmtLines(p);
    return { title: biz(), sub: [t('statement') + ' · ' + p.d.name, NK.fmtDate(NK.today())],
      cols: [{ label: t('date'), w: 0.2 }, { label: t('note'), w: 0.3 }, { label: t('paid'), w: 0.25, r: 1 }, { label: t('bill'), w: 0.25, r: 1 }],
      rows: x.all.map(function (y) { var r = [NK.fmtDateShort(y.e.date), y.e.note, y.k === 'paid' ? NK.commas(y.e.amt) : '', y.k === 'bill' ? NK.commas(y.e.amt) : '']; r.color = y.k === 'paid' ? '#1b7a3d' : '#b3261e'; return r; }),
      totals: [[t('total_paid'), NK.money(x.st.paid), '#1b7a3d'], [t('total_bill'), NK.money(x.st.bill), '#b3261e'], [NK.balWord(x.st.balance), NK.money(Math.abs(x.st.balance)), '#1f3a8a', 1]] };
  }
  function rateDoc() {
    return { title: biz(), sub: [t('rate_chart'), NK.fmtDate(NK.today())], cols: [{ label: t('item'), w: 0.6 }, { label: t('rate'), w: 0.4, r: 1 }],
      rows: NK.rateList().map(function (i) { return [i.d.name, NK.money(i.d.rate) + (i.d.unit ? ' / ' + i.d.unit : '')]; }), totals: [] };
  }
  function blobOf(cv, type, q) { return new Promise(function (res) { cv.toBlob(res, type, q); }); }
  function image(doc, name) { return blobOf(paper(doc), 'image/png').then(function (b) { return H.file(b, name + '.png'); }); }
  function pdf(doc, name) { var cv = paper(doc); return blobOf(cv, 'image/jpeg', 0.9).then(function (b) { return b.arrayBuffer(); }).then(function (jpg) { return H.file(H.pdfFromJpeg(new Uint8Array(jpg), cv.width, cv.height), name + '.pdf'); }); }
  H.billImage = function (b) { return image(billDoc(b), 'Bill-' + b.d.no); };
  H.billPdf = function (b) { return pdf(billDoc(b), 'Bill-' + b.d.no); };
  H.statementImage = function (p) { return image(stmtDoc(p), 'Statement-' + p.d.name.replace(/\W+/g, '-')); };
  H.statementPdf = function (p) { return pdf(stmtDoc(p), 'Statement-' + p.d.name.replace(/\W+/g, '-')); };
  H.rateImage = function () { return image(rateDoc(), 'Rate-chart'); };
  H._docs = { bill: billDoc, stmt: stmtDoc, rate: rateDoc, paper: paper };

  /* A one-page PDF that holds the picture. Page width is A4; height follows the picture. */
  H.pdfFromJpeg = function (jpg, w, h) {
    var pw = 595, ph = Math.round(595 * h / w), enc = new TextEncoder(), parts = [], offs = [], len = 0;
    function put(x) { var b = typeof x === 'string' ? enc.encode(x) : x; parts.push(b); len += b.length; }
    function obj(n, body) { offs[n] = len; put(n + ' 0 obj\n' + body + '\nendobj\n'); }
    put('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
    obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    obj(3, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + pw + ' ' + ph + '] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>');
    var c = 'q ' + pw + ' 0 0 ' + ph + ' 0 0 cm /Im0 Do Q';
    obj(4, '<< /Length ' + c.length + ' >>\nstream\n' + c + '\nendstream');
    offs[5] = len; put('5 0 obj\n<< /Type /XObject /Subtype /Image /Width ' + w + ' /Height ' + h + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + jpg.length + ' >>\nstream\n'); put(jpg); put('\nendstream\nendobj\n');
    var xref = len, s = 'xref\n0 6\n0000000000 65535 f \n';
    for (var i = 1; i <= 5; i++) s += ('0000000000' + offs[i]).slice(-10) + ' 00000 n \n';
    put(s + 'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n');
    return new Blob(parts, { type: 'application/pdf' });
  };
})(globalThis.NK = globalThis.NK || {});
