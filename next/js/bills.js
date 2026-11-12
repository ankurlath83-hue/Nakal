/* BILLS: the new-bill screen, the list of all bills, and what happens after saving.
   A saved bill shows up in the party's ledger by itself, because the ledger reads bills directly. */
(function (NK) {
  'use strict';
  var U = NK.ui, S = NK.store, C = NK.calc, t = function (k, v) { return NK.t(k, v); };
  var B; // the bill being typed

  function blank() { return { id: null, no: null, party: '', date: NK.today(), rows: [{ item: '', rate: '', qty: '', unit: '' }], transport: '' }; }
  B = blank();
  function filled() { return B.rows.filter(function (r) { return String(r.item).trim() && C.rowAmt(r) > 0; }); }
  function billNo() { return B.no || C.nextBillNo(S.bills()); }

  /* Who may change what (entry-only staff cannot delete, and can edit only their own entries). */
  NK.can = {
    del: function () { return !NK.sync || NK.sync.role() !== 'entry'; },
    edit: function (rec) { return !NK.sync || NK.sync.role() !== 'entry' || !rec || !rec.sv || rec.by === NK.sync.uid(); },
    exp: function () { return !NK.sync || NK.sync.role() !== 'entry'; },
    admin: function () { return !NK.sync || NK.sync.role() === 'owner' || NK.sync.role() === 'none'; }
  };

  U.screens.bill = {
    first: function () { return B.party ? 'item:' + (B.rows.length - 1) : 'party'; },
    title: function () { return (B.id ? t('edit_bill') : t('new_bill')) + ' #' + billNo(); },
    open: function (arg) {
      if (arg && arg.id) {
        var r = S.get(arg.id); if (!r) return;
        var p = S.get(r.d.partyId);
        B = { id: r.id, no: r.d.no, party: p ? p.d.name : '', date: r.d.date, transport: r.d.transport ? String(r.d.transport) : '',
          rows: r.d.rows.map(function (x) { return { item: x.item, rate: String(x.rate), qty: String(x.qty), unit: x.unit || '' }; }) };
      } else if (arg && arg.fresh) B = blank();
      if (arg && arg.party) B.party = arg.party;
    },
    render: function () {
      var h = '';
      if (!S.bills().length && !B.party && !NK.kp.key) h += '<div class="tip">' + t('tip1') + '<br>' + t('tip2') + '<br>' + t('tip3') + '</div>';
      h += '<div class="brow"><div class="grow">' + U.fld('party', B.party, t('party_name'), 'big') + '</div>' +
        '<button type="button" class="datebtn" data-a="date">' + NK.fmtDate(B.date) + '</button></div>';
      h += '<div class="bt head"><span>' + t('item') + '</span><span class="r">' + t('qty') + '</span><span class="r">' + t('rate') + '</span><span class="r">' + t('amount') + '</span><span></span></div>';
      B.rows.forEach(function (r, i) {
        var amt = C.rowAmt(r);
        h += '<div class="bt">' + U.fld('item:' + i, r.item, t('item') + ' ' + (i + 1)) + U.fld('qty:' + i, r.qty, '0', 'r') +
          U.fld('rate:' + i, r.rate, '0', 'r') + '<span class="amt r">' + (amt ? NK.commas(amt) : '') + '</span>' +
          '<button type="button" class="x" data-a="delRow" data-i="' + i + '" aria-label="' + t('remove') + '">×</button></div>';
      });
      h += '<button type="button" class="addrow" data-a="addRow">+ ' + t('add_item') + '</button>';
      h += '<div class="sum"><span>' + t('sub_total') + '</span><b>' + NK.money(C.subTotal(B.rows)) + '</b></div>';
      h += '<div class="sum"><span>' + t('transport') + '</span>' + U.fld('transport', B.transport, '0', 'r w96') + '</div>';
      if (B.id) h += '<div class="row2 mt">' + U.btn('shareSaved', t('share'), 'ghost') + (NK.can.del() ? U.btn('delBill', t('delete_bill'), 'danger ghost') : '') + '</div>' +
        '<div class="mt">' + U.btn('newBill', t('new_bill'), 'ghost wide') + '</div>';
      return h;
    },
    /* Grand total and Save always sit just above the keypad. */
    dock: function () {
      var ok = B.party.trim() && filled().length;
      return '<div class="totbar"><div><small>' + t('grand_total') + '</small><b data-n="grand">' + NK.money(C.grand(B)) + '</b></div>' +
        U.btn('save', t('save'), 'pri', ok ? '' : 'disabled') + '</div>';
    },
    field: function (key) {
      var a = key.split(':'), k = a[0], i = +a[1], r = B.rows[i];
      if (k === 'party') return { kind: 'text', max: 40, get: function () { return B.party; }, set: function (v) { B.party = v; },
        next: function () { NK.kp.focus('item:0'); },
        sugg: function () { var q = NK.key(B.party); return S.parties().filter(function (p) { return !q || NK.key(p.d.name).indexOf(q) >= 0; }).slice(0, 12)
          .map(function (p) { return { label: p.d.name, pick: function () { B.party = p.d.name; NK.kp.focus('item:0'); } }; }); } };
      if (k === 'transport') return { kind: 'num', max: 9, get: function () { return B.transport; }, set: function (v) { B.transport = v; } };
      if (!r) return null;
      if (k === 'item') return { kind: 'text', max: 40, get: function () { return r.item; }, set: function (v) { r.item = v; },
        next: function () { if (!r.item.trim() && i === B.rows.length - 1 && i > 0) NK.kp.focus('transport'); else NK.kp.focus('qty:' + i); },
        /* Catalogue suggestions: tapping one fills the rate and jumps to quantity. */
        sugg: function () { var q = NK.key(r.item); return S.items().filter(function (it) { return !q || NK.key(it.d.name).indexOf(q) >= 0; })
          .sort(function (x, y) { return NK.key(x.d.name).indexOf(q) - NK.key(y.d.name).indexOf(q) || (x.d.name < y.d.name ? -1 : 1); }).slice(0, 12)
          .map(function (it) { return { label: it.d.name, sub: it.d.rate ? NK.money(it.d.rate) : '', pick: function () { r.item = it.d.name; r.unit = it.d.unit || ''; if (it.d.rate) r.rate = String(it.d.rate); r.fromList = !!it.d.rate; NK.kp.focus('qty:' + i); } }; }); } };
      /* Order is item, quantity, rate. After the last box of a row a new row opens. */
      function nextRow() { if (i === B.rows.length - 1) B.rows.push({ item: '', rate: '', qty: '', unit: '' }); NK.kp.focus('item:' + (i + 1)); }
      if (k === 'qty') return { kind: 'num', max: 8, get: function () { return r.qty; }, set: function (v) { r.qty = v; },
        /* If the rate already came from the catalogue, skip it and go straight to the next row. */
        next: function () { if (r.fromList && NK.num(r.rate) > 0) nextRow(); else NK.kp.focus('rate:' + i); } };
      if (k === 'rate') return { kind: 'num', max: 9, get: function () { return r.rate; }, set: function (v) { r.rate = v; r.fromList = false; }, next: nextRow };
      return null;
    },
    act: {
      date: function () { U.pickDate(B.date, function (d) { B.date = d; U.render(); }); },
      addRow: function () { B.rows.push({ item: '', rate: '', qty: '', unit: '' }); NK.kp.focus('item:' + (B.rows.length - 1)); },
      delRow: function (b) { var i = +b.dataset.i; if (B.rows.length > 1) B.rows.splice(i, 1); else B.rows[0] = { item: '', rate: '', qty: '', unit: '' }; NK.kp.key = null; NK.kp.spec = null; U.render(); },
      newBill: function () { U.go('bill', { fresh: true }); },
      save: function () {
        var rows = filled();
        if (!B.party.trim()) { NK.kp.focus('party'); return U.toast(t('need_party'), { bad: true }); }
        if (!rows.length) return U.toast(t('need_item'), { bad: true });
        var old = B.id ? S.get(B.id) : null;
        if (old && !NK.can.edit(old)) return U.toast(t('not_allowed'), { bad: true });
        var id = B.id, no = billNo();
        var undo = S.undoable(function () {
          var p = S.ensureParty(B.party);
          /* New items typed in a bill join the catalogue by themselves. */
          rows.forEach(function (r) { if (!S.itemByName(r.item)) S.add('i', { name: String(r.item).trim(), rate: NK.num(r.rate), unit: r.unit || '' }); });
          var d = { no: no, partyId: p.id, date: B.date, transport: NK.num(B.transport),
            rows: rows.map(function (r) { return { item: String(r.item).trim(), rate: NK.num(r.rate), qty: NK.num(r.qty), unit: r.unit || '' }; }),
            at: old ? old.d.at : Date.now(), dev: old ? old.d.dev : NK.app.device };
          id = old ? S.update(id, d).id : S.add('b', d).id;
        });
        B = blank(); NK.kp.key = null; NK.kp.spec = null;
        U.toast(t(navigator.onLine === false ? 'saved_offline' : 'bill_saved', { no: no }), { undo: undo });
        U.render(); afterSave(id);
      },
      delBill: function () {
        var r = S.get(B.id); if (!r) return;
        U.ask(t('ask_del_bill', { no: r.d.no }), t('delete'), true).then(function (yes) {
          if (!yes) return;
          var undo = S.undoable(function () { S.del(r.id); });
          B = blank(); U.go('allbills'); U.toast(t('bill_deleted'), { undo: undo });
        });
      },
      shareSaved: function () { afterSave(B.id); }
    }
  };

  /* After saving: share as WhatsApp text, image or PDF. */
  function afterSave(id) {
    U.sheet({
      render: function () {
        var r = S.get(id); if (!r) return '<p class="msg">' + t('bill_deleted') + '</p>';
        var p = S.get(r.d.partyId);
        return '<h3>' + t('bill') + ' #' + r.d.no + ' · ' + NK.esc(p ? p.d.name : '') + '</h3><p class="big-amt">' + NK.money(C.grand(r.d)) + '</p>' +
          '<div class="col">' + U.btn('wa', t('share_wa'), 'wa wide') + '<div class="row2">' + U.btn('img', t('share_img'), 'ghost') + U.btn('pdf', t('share_pdf'), 'ghost') + '</div>' +
          U.btn('closeSheet', t('new_bill'), 'pri wide') + '</div>';
      },
      act: {
        wa: function () { NK.share.whatsapp(NK.share.billText(S.get(id)), (S.get(S.get(id).d.partyId) || { d: {} }).d.phone); },
        img: function (b) { U.busy(b, NK.share.billImage(S.get(id))); },
        pdf: function (b) { U.busy(b, NK.share.billPdf(S.get(id))); }
      }
    });
  }
  NK.billShare = afterSave;

  /* ---------- All bills, with search ---------- */
  var q = '';
  U.screens.allbills = {
    tab: 'more', back: 'more', first: 'q',
    title: function () { return t('all_bills'); },
    render: function () {
      var k = NK.key(q), list = S.bills().map(function (b) { var p = S.get(b.d.partyId); return { b: b, name: p ? p.d.name : '' }; })
        .filter(function (x) { return !k || NK.key(x.name).indexOf(k) >= 0 || String(x.b.d.no) === k || x.b.d.rows.some(function (r) { return NK.key(r.item).indexOf(k) >= 0; }); })
        .sort(function (x, y) { return y.b.d.date < x.b.d.date ? -1 : y.b.d.date > x.b.d.date ? 1 : y.b.d.no - x.b.d.no; });
      var h = U.fld('q', q, t('search_bills'), 'big');
      if (!list.length) h += '<p class="empty">' + t(S.bills().length ? 'nothing_found' : 'no_bills') + '</p>';
      list.slice(0, 300).forEach(function (x) {
        h += '<button type="button" class="li" data-a="openBill" data-id="' + x.b.id + '"><span><b>#' + x.b.d.no + ' ' + NK.esc(x.name) + '</b><small>' + NK.fmtDate(x.b.d.date) + ' · ' + x.b.d.rows.length + ' ' + t('items_n') + '</small></span><span class="red">' + NK.money(C.grand(x.b.d)) + '</span></button>';
      });
      return h;
    },
    field: function (k) { return k === 'q' ? { kind: 'text', max: 30, get: function () { return q; }, set: function (v) { q = v; } } : null; },
    act: { openBill: function (b) { U.go('bill', { id: b.dataset.id }); } }
  };
})(globalThis.NK = globalThis.NK || {});
