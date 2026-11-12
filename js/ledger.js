/* LEDGER: one page per party, like a khata notebook.
   Paid (jama) on the left in green, Bill on the right in red, balance at the top right. */
(function (NK) {
  'use strict';
  var U = NK.ui, S = NK.store, C = NK.calc, t = function (k, v) { return NK.t(k, v); };
  var L = { partyId: null, name: '', date: NK.today(), amt: '', note: '' };
  var QUICK = ['Cash', 'UPI', 'Cheque', 'Bank'];

  /* Parties used most recently come first in the one-tap chips. */
  function recent() {
    var last = {};
    S.bills().forEach(function (b) { last[b.d.partyId] = Math.max(last[b.d.partyId] || 0, b.u); });
    S.entries().forEach(function (e) { last[e.d.partyId] = Math.max(last[e.d.partyId] || 0, e.u); });
    return S.parties().sort(function (a, b) { return (last[b.id] || b.u) - (last[a.id] || a.u); }).slice(0, 8);
  }
  function setParty(p) { L.partyId = p ? p.id : null; L.name = p ? p.d.name : ''; }
  NK.balWord = function (bal) { return bal > 0.004 ? t('to_receive') : bal < -0.004 ? t('advance') : t('settled'); };

  U.screens.ledger = {
    first: function () { return L.partyId ? 'lamt' : 'lparty'; },
    title: function () { return t('tab_ledger'); },
    open: function (arg) {
      if (arg && arg.partyId) setParty(S.get(arg.partyId));
      else if (L.partyId && !S.get(L.partyId)) setParty(null);
      if (!L.partyId && !L.name) { var r = recent()[0]; if (r) setParty(r); }
    },
    render: function () {
      var p = L.partyId ? S.get(L.partyId) : null;
      var h = '<div class="chips">' + recent().map(function (x) { return '<button type="button" class="chip' + (x.id === L.partyId ? ' on' : '') + '" data-a="pick" data-id="' + x.id + '">' + NK.esc(x.d.name) + '</button>'; }).join('') + '</div>';
      h += '<div class="brow"><div class="grow">' + U.fld('lparty', L.name, t('party_name'), 'big') + '</div></div>';
      if (!p) return h + '<p class="empty">' + t(L.name.trim() ? 'new_party_hint' : 'pick_party') + '</p>';
      var led = C.ledger(p.id, S.bills(), S.entries()), st = C.partyStats(led, NK.today(), S.creditDays(p));
      h += '<div class="bal ' + (st.balance > 0.004 ? 'due' : st.balance < -0.004 ? 'adv' : '') + '"><small>' + NK.balWord(st.balance) + '</small><b data-n="bal">' + NK.money(Math.abs(st.balance)) + '</b></div>';
      function side(list, cls) {
        return list.map(function (e) {
          return '<button type="button" class="en ' + cls + '" data-a="entry" data-id="' + e.id + '"' + (e.billId ? ' data-bill="1"' : '') + '><small>' + NK.fmtDateShort(e.date) + (e.note ? ' · ' + NK.esc(e.note) : '') + '</small><b>' + NK.commas(e.amt) + '</b></button>';
        }).join('') || '<p class="none">—</p>';
      }
      h += '<div class="khata"><div class="side"><div class="shead green"><span>' + t('paid') + '</span><b data-n="tp">' + NK.money(st.paid) + '</b></div>' + side(led.paid, 'green') + '</div>' +
        '<div class="side"><div class="shead red"><span>' + t('bill') + '</span><b data-n="tb">' + NK.money(st.bill) + '</b></div>' + side(led.bill, 'red') + '</div></div>';
      return h;
    },
    /* Entry bar: date, amount, note, and quick notes. */
    dock: function () {
      if (!L.partyId && !L.name.trim()) return '';
      return '<div class="chips quick">' + QUICK.map(function (qn) { return '<button type="button" class="chip' + (L.note === qn ? ' on' : '') + '" data-a="quick" data-q="' + qn + '">' + t('q_' + qn.toLowerCase()) + '</button>'; }).join('') + '</div>' +
        '<div class="ebar"><button type="button" class="datebtn" data-a="date">' + NK.fmtDateShort(L.date) + '</button>' + U.fld('lamt', L.amt, t('amount'), 'r big') + U.fld('lnote', L.note, t('note')) + '</div>' +
        '<div class="row2 pb' + (NK.kp.desk() ? '' : ' touch-hide') + '">' + U.btn('savePaid', t('paid') + ' (P)', 'kpaid') + U.btn('saveBillEntry', t('bill') + ' (B)', 'kbill') + '</div>';
    },
    field: function (k) {
      if (k === 'lparty') return { kind: 'text', max: 40, get: function () { return L.name; }, set: function (v) { L.name = v; var p = S.partyByName(v); L.partyId = p ? p.id : null; },
        next: function () { NK.kp.focus('lamt'); },
        sugg: function () { var q = NK.key(L.name); return S.parties().filter(function (p) { return !q || NK.key(p.d.name).indexOf(q) >= 0; }).slice(0, 12).map(function (p) { return { label: p.d.name, pick: function () { setParty(p); NK.kp.focus('lamt'); } }; }); } };
      if (k === 'lamt') return { kind: 'num', pad: 'ledger', max: 10, get: function () { return L.amt; }, set: function (v) { L.amt = v; }, next: function () { NK.kp.focus('lnote'); } };
      if (k === 'lnote') return { kind: 'text', max: 40, get: function () { return L.note; }, set: function (v) { L.note = v; }, next: function () { NK.kp.focus('lamt'); } };
      return null;
    },
    act: {
      pick: function (b) { setParty(S.get(b.dataset.id)); NK.kp.key = null; NK.kp.spec = null; U.render(); if (NK.kp.desk()) NK.kp.focus('lamt'); },
      date: function () { U.pickDate(L.date, function (d) { L.date = d; U.render(); }); },
      quick: function (b) { L.note = L.note === b.dataset.q ? '' : b.dataset.q; U.render(); },
      savePaid: function () { save('paid'); },
      saveBillEntry: function () { save('bill'); },
      entry: function (b) {
        if (b.dataset.bill) return U.go('bill', { id: b.dataset.id });
        editEntry(b.dataset.id);
      }
    }
  };

  function save(kind) {
    var amt = NK.r2(NK.num(L.amt));
    if (!L.name.trim()) { NK.kp.focus('lparty'); return U.toast(t('need_party'), { bad: true }); }
    if (!(amt > 0)) { NK.kp.focus('lamt'); return U.toast(t('need_amount'), { bad: true }); }
    var id, undo = S.undoable(function () {
      var p = L.partyId ? S.get(L.partyId) : S.ensureParty(L.name);
      setParty(p);
      id = S.add('e', { partyId: p.id, date: L.date, kind: kind, amt: amt, note: L.note.trim(), at: Date.now() }).id;
    });
    L.amt = ''; L.note = ''; U.flash = id;
    U.toast(t(kind === 'paid' ? 'paid_saved' : 'billentry_saved', { amt: NK.money(amt) }) + (navigator.onLine === false ? ' ' + t('on_phone') : ''), { undo: undo });
    NK.kp.focus('lamt');
  }

  /* Change or delete a hand-made entry. */
  function editEntry(id) {
    var r = S.get(id); if (!r) return;
    var E = { date: r.d.date, amt: String(r.d.amt), note: r.d.note || '', kind: r.d.kind };
    var canEdit = NK.can.edit(r);
    U.sheet({
      first: 'eamt',
      render: function () {
        return '<h3>' + t(E.kind === 'paid' ? 'paid' : 'bill') + ' · ' + NK.esc(L.name) + '</h3>' +
          '<div class="ebar"><button type="button" class="datebtn" data-a="edate">' + NK.fmtDateShort(E.date) + '</button>' + U.fld('eamt', E.amt, t('amount'), 'r big') + U.fld('enote', E.note, t('note')) + '</div>' +
          '<div class="row2 mt">' + (NK.can.del() ? U.btn('edel', t('delete'), 'danger ghost') : '') + U.btn('esave', t('save'), 'pri', canEdit ? '' : 'disabled') + '</div>';
      },
      field: function (k) {
        if (k === 'eamt') return { kind: 'num', max: 10, get: function () { return E.amt; }, set: function (v) { E.amt = v; }, next: function () { NK.kp.focus('enote'); } };
        if (k === 'enote') return { kind: 'text', max: 40, get: function () { return E.note; }, set: function (v) { E.note = v; } };
        return null;
      },
      act: {
        edate: function () { U.pickDate(E.date, function (d) { E.date = d; U.render(); }); },
        esave: function () {
          var amt = NK.r2(NK.num(E.amt)); if (!(amt > 0)) return U.toast(t('need_amount'), { bad: true });
          var undo = S.undoable(function () { S.update(id, { date: E.date, amt: amt, note: E.note.trim() }); });
          U.closeSheet(); U.toast(t('saved'), { undo: undo });
        },
        edel: function () { var undo = S.undoable(function () { S.del(id); }); U.closeSheet(); U.toast(t('entry_deleted'), { undo: undo }); }
      }
    });
  }
})(globalThis.NK = globalThis.NK || {});
