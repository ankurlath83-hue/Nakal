/* PARTIES: everyone you deal with, biggest turnover first, with balance,
   last paid date, last bill date and how many days late they are. */
(function (NK) {
  'use strict';
  var U = NK.ui, S = NK.store, C = NK.calc, t = function (k, v) { return NK.t(k, v); };

  function rows() {
    var today = NK.today(), bills = S.bills(), entries = S.entries();
    return S.parties().map(function (p) {
      return { p: p, st: C.partyStats(C.ledger(p.id, bills, entries), today, S.creditDays(p)) };
    }).sort(function (a, b) { return b.st.turnover - a.st.turnover || (a.p.d.name < b.p.d.name ? -1 : 1); });
  }

  U.screens.parties = {
    title: function () { return t('tab_parties'); },
    render: function () {
      var list = rows(), tot = list.reduce(function (a, x) { return a + Math.max(0, x.st.balance); }, 0);
      var h = '<div class="sum top"><span>' + t('total_to_receive') + '</span><b class="red" data-n="recv">' + NK.money(tot) + '</b></div>';
      if (!list.length) h += '<p class="empty">' + t('no_parties') + '</p>';
      list.forEach(function (x) {
        var st = x.st, p = x.p;
        h += '<div class="card" data-id="' + p.id + '"><button type="button" class="chead" data-a="open" data-id="' + p.id + '"><b>' + NK.esc(p.d.name) + '</b>' +
          '<span class="' + (st.balance > 0.004 ? 'red' : st.balance < -0.004 ? 'green' : 'mut') + '"><small>' + NK.balWord(st.balance) + '</small> ' + NK.money(Math.abs(st.balance)) + '</span></button>' +
          '<div class="cmeta"><span>' + t('last_paid') + ': ' + (st.lastPaid ? NK.fmtDateShort(st.lastPaid) : '—') + '</span><span>' + t('last_bill') + ': ' + (st.lastBill ? NK.fmtDateShort(st.lastBill) : '—') + '</span>' +
          (st.overdue > 0 ? '<span class="late">' + t('days_late', { n: st.overdue }) + '</span>' : '') + '</div>' +
          '<div class="cact">' + U.btn('remind', t('remind'), 'wa sm', 'data-id="' + p.id + '"') + U.btn('stmt', t('statement'), 'ghost sm', 'data-id="' + p.id + '"') + U.btn('edit', t('edit'), 'ghost sm', 'data-id="' + p.id + '"') + '</div></div>';
      });
      return h + '<div class="mt">' + U.btn('add', '+ ' + t('add_party'), 'ghost wide') + '</div>';
    },
    act: {
      open: function (b) { U.go('ledger', { partyId: b.dataset.id }); },
      /* One-tap WhatsApp payment reminder. */
      remind: function (b) {
        var p = S.get(b.dataset.id), st = S.partyStats(p);
        if (!(st.balance > 0.004)) return U.toast(t('nothing_due'));
        NK.share.whatsapp(NK.share.reminderText(p, st), p.d.phone);
      },
      stmt: function (b) {
        var p = S.get(b.dataset.id);
        U.sheet({
          render: function () { return '<h3>' + t('statement') + ' · ' + NK.esc(p.d.name) + '</h3><div class="col">' + U.btn('wa', t('share_wa'), 'wa wide') + '<div class="row2">' + U.btn('img', t('share_img'), 'ghost') + U.btn('pdf', t('share_pdf'), 'ghost') + '</div></div>'; },
          act: {
            wa: function () { NK.share.whatsapp(NK.share.statementText(p), p.d.phone); },
            img: function (x) { U.busy(x, NK.share.statementImage(p)); },
            pdf: function (x) { U.busy(x, NK.share.statementPdf(p)); }
          }
        });
      },
      edit: function (b) { editParty(S.get(b.dataset.id)); },
      add: function () { editParty(null); }
    }
  };

  function editParty(p) {
    var E = p ? { name: p.d.name, phone: p.d.phone || '', cd: p.d.creditDays == null ? '' : String(p.d.creditDays) } : { name: '', phone: '', cd: '' };
    U.sheet({
      first: 'pname',
      render: function () {
        var used = p && (S.bills().some(function (b) { return b.d.partyId === p.id; }) || S.entries().some(function (e) { return e.d.partyId === p.id; }));
        return '<h3>' + t(p ? 'edit_party' : 'add_party') + '</h3><label>' + t('party_name') + '</label>' + U.fld('pname', E.name, t('party_name'), 'big') +
          '<label>' + t('phone10') + '</label>' + U.fld('pphone', E.phone, '9876543210', 'big') +
          '<label>' + t('credit_days') + ' <small>(' + t('default_is', { n: S.settings().creditDays }) + ')</small></label>' + U.fld('pcd', E.cd, String(S.settings().creditDays), 'big') +
          '<div class="row2 mt">' + (p && !used && NK.can.del() ? U.btn('pdel', t('delete'), 'danger ghost') : U.btn('closeSheet', t('cancel'), 'ghost')) + U.btn('psave', t('save'), 'pri', E.name.trim() && (!p || NK.can.edit(p)) ? '' : 'disabled') + '</div>';
      },
      field: function (k) {
        if (k === 'pname') return { kind: 'text', max: 40, get: function () { return E.name; }, set: function (v) { E.name = v; }, next: function () { NK.kp.focus('pphone'); } };
        if (k === 'pphone') return { kind: 'int', max: 10, get: function () { return E.phone; }, set: function (v) { E.phone = v; }, next: function () { NK.kp.focus('pcd'); } };
        if (k === 'pcd') return { kind: 'int', max: 3, get: function () { return E.cd; }, set: function (v) { E.cd = v; } };
        return null;
      },
      act: {
        psave: function () {
          if (E.phone && E.phone.length !== 10) { NK.kp.focus('pphone'); return U.toast(t('phone_bad'), { bad: true }); }
          var other = S.partyByName(E.name);
          if (other && (!p || other.id !== p.id)) return U.toast(t('party_exists'), { bad: true });
          var d = { name: E.name.trim(), phone: E.phone, creditDays: E.cd === '' ? null : +E.cd };
          var undo = S.undoable(function () { if (p) S.update(p.id, d); else S.add('p', Object.assign(d, { at: Date.now() })); });
          U.closeSheet(); U.toast(t('saved'), { undo: undo });
        },
        pdel: function () { var undo = S.undoable(function () { S.del(p.id); }); U.closeSheet(); U.toast(t('party_deleted'), { undo: undo }); }
      }
    });
  }
  NK.editParty = editParty;
})(globalThis.NK = globalThis.NK || {});
