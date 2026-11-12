/* MORE: the rarely used things live here - cash counter, exports, backup, online and staff, settings. */
(function (NK) {
  'use strict';
  var U = NK.ui, S = NK.store, C = NK.calc, Y = NK.sync, t = function (k, v) { return NK.t(k, v); };
  function row(a, label, sub) { return '<button type="button" class="li" data-a="' + a + '"><span><b>' + label + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</span><span class="chev">›</span></button>'; }
  function go(n) { return function () { U.go(n); }; }

  U.screens.more = {
    title: function () { return t('tab_more'); },
    render: function () {
      return row('report', t('item_sales'), t('item_sales_sub')) + row('allbills', t('all_bills'), S.bills().length + ' ' + t('bills_n')) + row('cash', t('cash_counter'), t('cash_sub')) +
        (NK.can.exp() ? row('exports', t('exports'), t('exports_sub')) + row('backup', t('backup'), t('backup_sub')) : '') +
        row('online', t('online'), t('st_' + Y.status())) + row('settings', t('settings'), NK.lang === 'hi' ? 'हिंदी' : 'English') + row('about', t('about'), t('about_sub')) + row('lock', t('lock_now'), '');
    },
    act: { report: go('report'), allbills: go('allbills'), cash: go('cash'), exports: go('exports'), backup: go('backup'), online: go('online'), settings: go('settings'), about: go('about') }
  };

  /* ---------- Cash counter by note ---------- */
  function counts() { return S.local('_cash') || {}; }
  U.screens.cash = {
    tab: 'more', back: 'more', first: 'c:500', title: function () { return t('cash_counter'); },
    render: function () {
      var c = counts();
      return C.NOTES.map(function (n) {
        return '<div class="cashrow"><span class="note">₹' + n + '</span><span class="mut">×</span>' + U.fld('c:' + n, c[n] || '', '0', 'r') + '<span class="r"><b>' + NK.commas(n * (parseInt(c[n], 10) || 0)) + '</b></span></div>';
      }).join('') + '<div class="mt">' + U.btn('clear', t('clear'), 'ghost wide') + '</div>';
    },
    dock: function () { return '<div class="totbar"><div><small>' + t('total_cash') + '</small><b data-n="cash">' + NK.money(C.cashTotal(counts())) + '</b></div></div>'; },
    field: function (k) {
      var n = +k.split(':')[1], i = C.NOTES.indexOf(n); if (i < 0) return null;
      return { kind: 'int', max: 5, get: function () { return counts()[n] || ''; }, set: function (v) { var c = Object.assign({}, counts()); c[n] = v; S.setLocal('_cash', c); },
        next: function () { if (i < C.NOTES.length - 1) NK.kp.focus('c:' + C.NOTES[i + 1]); else NK.kp.blur(); } };
    },
    act: { clear: function () { S.setLocal('_cash', {}); NK.kp.key = null; U.render(); } }
  };

  /* ---------- CSV exports ---------- */
  U.screens.exports = {
    tab: 'more', back: 'more', title: function () { return t('exports'); },
    render: function () { return '<p class="hint">' + t('exports_hint') + '</p><div class="col">' + U.btn('ledger', t('csv_ledger'), 'ghost wide') + U.btn('bills', t('csv_bills'), 'ghost wide') + U.btn('items', t('csv_items'), 'ghost wide') + '</div>'; },
    act: {
      ledger: function () { NK.share.file(new Blob([NK.csv(NK.exportRows.ledger())], { type: 'text/csv' }), 'ledger.csv'); },
      bills: function () { NK.share.file(new Blob([NK.csv(NK.exportRows.bills())], { type: 'text/csv' }), 'bills.csv'); },
      items: function () { NK.share.file(new Blob([NK.csv(NK.exportRows.items('all'))], { type: 'text/csv' }), 'item-sales.csv'); }
    }
  };

  /* ---------- Encrypted backup, restore, erase ---------- */
  function askSecret(title, hint, kind, max, okLabel, cb) {
    var v = '';
    U.sheet({
      first: 'sec',
      render: function () { return '<h3>' + title + '</h3><p class="hint">' + hint + '</p>' + U.fld('sec', v, '', 'big', kind === 'int') + '<div class="row2 mt">' + U.btn('closeSheet', t('cancel'), 'ghost') + U.btn('ok', okLabel, 'pri', v.length >= (kind === 'int' ? 6 : 8) ? '' : 'disabled') + '</div>'; },
      field: function (k) { return k === 'sec' ? { kind: kind, max: max, get: function () { return v; }, set: function (x) { v = x; }, next: function () { NK.kp.blur(); } } : null; },
      act: { ok: function (b) { cb(v, b); } }
    });
  }
  U.screens.backup = {
    tab: 'more', back: 'more', title: function () { return t('backup'); },
    render: function () {
      return '<p class="hint">' + t('backup_hint') + '</p><div class="col">' + U.btn('make', t('backup_make'), 'pri wide') + U.btn('restore', t('backup_restore'), 'ghost wide') + '</div>' +
        '<h3 class="mt2">' + t('erase_title') + '</h3><p class="hint">' + t('erase_hint') + '</p>' + U.btn('erase', t('erase_btn'), 'danger ghost wide');
    },
    act: {
      make: function () {
        askSecret(t('backup_pass'), t('backup_pass_hint'), 'pass', 40, t('backup_make'), function (pw, b) {
          U.busy(b, NK.sec.backupMake(pw, { made: Date.now(), recs: S.exportAll() })).then(function (text) {
            U.closeSheet(); U.toast(t('backup_done'));
            return NK.share.file(new Blob([text], { type: 'application/octet-stream' }), 'Backup-' + NK.fmtDate(NK.today()).replace(/ /g, '-') + '.nkbackup');
          });
        });
      },
      restore: function () {
        var inp = document.getElementById('file'); inp.value = '';
        inp.onchange = function () {
          var f = inp.files[0]; if (!f) return;
          f.text().then(function (text) {
            askSecret(t('restore_pass'), f.name, 'pass', 40, t('backup_restore'), function (pw, b) {
              U.busy(b, NK.sec.backupRead(text, pw)).then(function (p) {
                if (!S.bills().length && !S.entries().length) S.giveWay('settings');   // a fresh phone takes the backup's business name
                var n = S.importAll(p.recs); U.closeSheet(); U.toast(t('restore_done', { n: n }));
              }, function (e) { U.toast(t(e.message === 'notbackup' ? 'restore_notfile' : 'restore_wrong'), { bad: true }); });
            });
          });
        };
        inp.click();
      },
      erase: function () {
        askSecret(t('erase_title'), t('erase_pin'), 'int', 6, t('erase_btn'), function (pin, b) {
          U.busy(b, NK.sec.unlock(pin)).then(function (r) {
            if (!r.ok) return U.toast(t('pin_wrong'), { bad: true });
            return NK.app.erase();
          });
        });
      }
    }
  };

  /* ---------- Settings ---------- */
  U.screens.settings = {
    tab: 'more', back: 'more', title: function () { return t('settings'); },
    render: function () {
      var st = S.settings(), m = NK.app.meta, adm = NK.can.admin();
      function chips(a, cur, list, lab) { return '<div class="chips wrap">' + list.map(function (v) { return '<button type="button" class="chip' + (v === cur ? ' on' : '') + '" data-a="' + a + '" data-v="' + v + '">' + lab(v) + '</button>'; }).join('') + '</div>'; }
      return (adm ? '<label>' + t('biz_name') + '</label>' + U.fld('biz', st.bizName, t('biz_name'), 'big') : '') +
        '<label>' + t('language') + '</label>' + chips('lang', NK.lang, ['en', 'hi'], function (v) { return v === 'hi' ? 'हिंदी' : 'English'; }) +
        '<label>' + t('theme') + '</label>' + chips('theme', m.theme || 'auto', ['auto', 'light', 'dark'], function (v) { return t('theme_' + v); }) +
        (adm ? '<label>' + t('def_credit') + '</label>' + U.fld('cd', String(st.creditDays), '30', 'big w96') : '') +
        '<label>' + t('autolock') + '</label>' + chips('auto', String(m.autolock || 2), ['1', '2', '5', '10'], function (v) { return v + ' ' + t('min'); }) +
        '<div class="col mt2">' + U.btn('pin', t('change_pin'), 'ghost wide') + (NK.app.bioOk ? U.btn('bio', t(NK.app.bioOn ? 'bio_off' : 'bio_on'), 'ghost wide') : '') + '</div>';
    },
    field: function (k) {
      if (k === 'biz') return { kind: 'text', max: 30, get: function () { return S.settings().bizName; }, set: function (v) { S.setSettings({ bizName: v }); NK.app.setMeta('bizName', v); } };
      if (k === 'cd') return { kind: 'int', max: 3, get: function () { return String(S.settings().creditDays || ''); }, set: function (v) { S.setSettings({ creditDays: +v || 0 }); } };
      return null;
    },
    act: {
      lang: function (b) { NK.app.setLang(b.dataset.v); },
      theme: function (b) { NK.app.setTheme(b.dataset.v); U.render(); },
      auto: function (b) { NK.app.setMeta('autolock', +b.dataset.v); U.render(); },
      bio: function (b) {
        var p = NK.app.bioOn ? NK.sec.bioOff() : NK.sec.bioOn(S.settings().bizName || NK.cfg.appName);
        U.busy(b, p).then(function () { NK.app.bioOn = !NK.app.bioOn; U.toast(t(NK.app.bioOn ? 'bio_ok' : 'saved')); U.render(); }, function () { U.toast(t('bio_fail'), { bad: true }); });
      },
      pin: function () {
        var P = { old: '', a: '', b: '' };
        U.sheet({
          first: 'po',
          render: function () {
            return '<h3>' + t('change_pin') + '</h3><label>' + t('pin_old') + '</label>' + U.fld('po', P.old, '', 'big pinf', true) + '<label>' + t('pin_new') + '</label>' + U.fld('pa', P.a, '', 'big pinf', true) +
              '<label>' + t('pin_again') + '</label>' + U.fld('pb', P.b, '', 'big pinf', true) + '<p class="hint">' + t('pin_forget') + '</p>' +
              '<div class="row2 mt">' + U.btn('closeSheet', t('cancel'), 'ghost') + U.btn('ok', t('save'), 'pri', P.old.length === 6 && P.a.length === 6 && P.a === P.b ? '' : 'disabled') + '</div>';
          },
          field: function (k) {
            var f = { po: 'old', pa: 'a', pb: 'b' }[k], nx = { po: 'pa', pa: 'pb' }[k]; if (!f) return null;
            return { kind: 'int', max: 6, get: function () { return P[f]; }, set: function (v) { P[f] = v; }, next: function () { if (nx) NK.kp.focus(nx); else NK.kp.blur(); } };
          },
          act: { ok: function (b) {
            U.busy(b, NK.sec.changePin(P.old, P.a)).then(function (r) {
              if (!r.ok) return U.toast(t(r.wait ? 'pin_wait' : 'pin_wrong', { s: Math.ceil((r.wait || 0) / 1000) }), { bad: true });
              NK.app.bioOn = false; U.closeSheet(); U.toast(t('pin_changed'));
            });
          } }
        });
      }
    }
  };

  /* ---------- About: an honest list of what is protected and what is not ---------- */
  U.screens.about = {
    tab: 'more', back: 'more', title: function () { return t('about'); },
    render: function () {
      function ul(k, n) { var s = '<ul>'; for (var i = 1; i <= n; i++) s += '<li>' + t(k + i) + '</li>'; return s + '</ul>'; }
      return '<h3>' + t('prot_yes') + '</h3>' + ul('py', 5) + '<h3>' + t('prot_no') + '</h3>' + ul('pn', 6) + '<p class="hint">' + NK.esc(NK.cfg.appName) + ' ' + NK.cfg.version + ' · ' + t('no_ads') + '</p>';
    }
  };

  /* ---------- Online: login, staff, approvals ---------- */
  var F = { email: '', pass: '', staff: '', entry: true, code: '', show: false };
  U.screens.online = {
    tab: 'more', back: 'more', title: function () { return t('online'); },
    render: function () {
      if (!Y.available()) return '<p class="empty">' + t('on_unavail') + '</p>';
      var st = Y.state, em = Y.user ? NK.esc(Y.user.email) : '', h = '';
      if (st === 'off' || st === 'paused' || st === 'finding') return '<p class="empty">' + t('checking') + '</p>';
      if (st === 'signedout') return '<p class="hint">' + t('on_intro') + '</p><label>' + t('email') + '</label>' + U.fld('em', F.email, 'name@gmail.com', 'big') +
        '<label>' + t('password') + '</label><div class="brow"><div class="grow">' + U.fld('pw', F.pass, '', 'big', !F.show) + '</div>' + U.btn('show', t(F.show ? 'hide' : 'show'), 'ghost sm') + '</div>' +
        '<div class="col mt">' + U.btn('signin', t('sign_in'), 'pri wide') + U.btn('signup', t('create_acc'), 'ghost wide') + U.btn('forgot', t('forgot_pw'), 'link wide') + '</div>';
      if (st === 'verify') return '<p class="msg">' + t('verify_msg', { email: em }) + '</p><div class="col">' + U.btn('recheck', t('check_again'), 'pri wide') + U.btn('resend', t('send_again'), 'ghost wide') + U.btn('signout', t('sign_out'), 'link wide') + '</div>';
      if (st === 'error') return '<p class="msg">' + t('e_net') + '</p><div class="col">' + U.btn('retry', t('check_again'), 'pri wide') + U.btn('signout', t('sign_out'), 'link wide') + '</div>';
      if (st === 'removed') return '<p class="msg">' + t('removed_msg') + '</p>' + U.btn('signout', t('sign_out'), 'ghost wide');
      if (st === 'nobiz') return '<p class="hint">' + em + '</p><h3>' + t('iam_owner') + '</h3><p class="hint">' + t('owner_hint') + '</p>' + U.btn('create', t('start_sync'), 'pri wide') +
        '<h3 class="mt2">' + t('iam_staff') + '</h3><p class="hint">' + t('staff_hint', { email: em }) + '</p><div class="col">' + U.btn('retry', t('check_again'), 'ghost wide') + U.btn('signout', t('sign_out'), 'link wide') + '</div>';
      if (st === 'needkey') {
        h = '<p class="msg">' + t(Y.role() === 'owner' ? 'key_owner' : 'key_staff') + '</p><p class="code">' + Y.myCode + '</p>';
        if (Y.role() === 'owner') h += '<label>' + t('rec_code') + '</label>' + U.fld('rc', F.code, 'XXXX-XXXX-XXXX-XXXX', 'big') + '<div class="mt">' + U.btn('userec', t('use_code'), 'pri wide', F.code.replace(/[^a-z0-9]/gi, '').length === 16 ? '' : 'disabled') + '</div>';
        return h + '<div class="mt">' + U.btn('signout', t('sign_out'), 'link wide') + '</div>';
      }
      /* Live */
      h = '<div class="sum top"><span>' + em + '</span><b>' + t('role_' + Y.role()) + '</b></div><p class="hint">' + t('st_' + Y.status()) + '</p>';
      if (Y.role() === 'owner') {
        if (Y.requests.length) {
          h += '<h3>' + t('approve_title') + '</h3><p class="hint">' + t('approve_hint') + '</p>';
          Y.requests.forEach(function (r) { h += '<div class="card"><div class="chead"><b>' + NK.esc(r.email) + '</b><span class="code sm">' + r.code + '</span></div><div class="cact">' + U.btn('approve', t('approve'), 'pri sm', 'data-id="' + r.id + '"') + U.btn('reject', t('reject'), 'danger ghost sm', 'data-id="' + r.id + '"') + '</div></div>'; });
        }
        h += '<h3>' + t('staff') + '</h3>';
        if (!Y.members.length) h += '<p class="hint">' + t('no_staff') + '</p>';
        Y.members.forEach(function (m) {
          h += '<div class="card"><div class="chead"><b>' + NK.esc(m.email) + '</b></div><div class="cact">' + U.btn('toggle', (m.entryOnly ? '☑ ' : '☐ ') + t('entry_only'), 'ghost sm', 'data-id="' + NK.esc(m.email) + '"') + U.btn('remove', t('remove'), 'danger ghost sm', 'data-id="' + NK.esc(m.email) + '"') + '</div></div>';
        });
        h += '<label>' + t('add_staff') + '</label>' + U.fld('se', F.staff, 'staff@gmail.com', 'big') + '<div class="row2 mt">' + U.btn('entry', (F.entry ? '☑ ' : '☐ ') + t('entry_only'), 'ghost') + U.btn('addstaff', t('add'), 'pri', /.+@.+\..+/.test(F.staff) ? '' : 'disabled') + '</div><p class="hint">' + t('entry_hint') + '</p>';
        h += '<div class="mt2">' + U.btn('old', t('import_old'), 'ghost wide') + '</div>';
      }
      return h + '<div class="mt2">' + U.btn('signout', t('sign_out'), 'link wide') + '</div>';
    },
    field: function (k) {
      if (k === 'em') return { kind: 'email', max: 60, get: function () { return F.email; }, set: function (v) { F.email = v; }, next: function () { NK.kp.focus('pw'); } };
      if (k === 'pw') return { kind: 'pass', max: 40, get: function () { return F.pass; }, set: function (v) { F.pass = v; }, next: function () { NK.kp.blur(); } };
      if (k === 'se') return { kind: 'email', max: 60, get: function () { return F.staff; }, set: function (v) { F.staff = v; }, next: function () { NK.kp.blur(); } };
      if (k === 'rc') return { kind: 'pass', max: 19, get: function () { return F.code; }, set: function (v) { F.code = v.toUpperCase(); }, next: function () { NK.kp.blur(); } };
      return null;
    },
    act: {
      show: function () { F.show = !F.show; U.render(); },
      signin: function (b) { if (!F.email || !F.pass) return U.toast(t('need_login'), { bad: true }); U.busy(b, Y.signIn(F.email, F.pass)).then(function () { F.pass = ''; }, fail); },
      signup: function (b) { if (!F.email || F.pass.length < 8) return U.toast(t('e_weak'), { bad: true }); U.busy(b, Y.signUp(F.email, F.pass)).then(function () { F.pass = ''; Y.retry(); }, fail); },
      forgot: function (b) { if (!F.email) { NK.kp.focus('em'); return U.toast(t('need_email'), { bad: true }); } U.busy(b, Y.reset(F.email)).then(function () { U.toast(t('reset_sent')); }, fail); },
      recheck: function (b) { U.busy(b, Y.recheck()).then(function () { if (Y.state === 'verify') U.toast(t('not_verified'), { bad: true }); }, fail); },
      resend: function (b) { U.busy(b, Y.resend()).then(function () { U.toast(t('verify_sent')); }, fail); },
      retry: function () { Y.retry(); },
      signout: function () { Y.signOut(); },
      create: function (b) {
        U.busy(b, Y.createBusiness()).then(function (code) {
          U.sheet({ render: function () { return '<h3>' + t('rec_title') + '</h3><p class="code">' + code + '</p><p class="msg">' + t('rec_msg') + '</p>' + U.btn('closeSheet', t('rec_done'), 'pri wide'); }, act: {} });
        }, fail);
      },
      userec: function (b) { U.busy(b, Y.useRecovery(F.code)).then(function () { F.code = ''; U.toast(t('st_synced')); }, function () { U.toast(t('rec_wrong'), { bad: true }); }); },
      entry: function () { F.entry = !F.entry; U.render(); },
      addstaff: function (b) { U.busy(b, Y.addStaff(F.staff, F.entry)).then(function () { F.staff = ''; NK.kp.key = null; U.toast(t('staff_added')); U.render(); }, fail); },
      toggle: function (b) { var m = Y.members.find(function (x) { return x.email === b.dataset.id; }); U.busy(b, Y.setEntryOnly(m.email, !m.entryOnly)).catch(fail); },
      remove: function (b) { var em = b.dataset.id; U.ask(t('ask_remove', { email: em }), t('remove'), true).then(function (y) { if (y) Y.removeStaff(em).then(function () { U.toast(t('staff_removed')); }, fail); }); },
      approve: function (b) { U.busy(b, Y.approve(b.dataset.id)).then(function () { U.toast(t('approved')); }, fail); },
      reject: function (b) { Y.reject(b.dataset.id).catch(fail); },
      old: function (b) { U.busy(b, Y.importOld()).then(function (n) { U.toast(t('import_done', { n: n })); }, fail); }
    }
  };
  function fail(e) { U.toast(Y.msg(e), { bad: true }); }
})(globalThis.NK = globalThis.NK || {});
