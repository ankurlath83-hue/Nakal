/* CATALOGUE: the list of items with rate and unit. It doubles as the rate chart. */
(function (NK) {
  'use strict';
  var U = NK.ui, S = NK.store, t = function (k, v) { return NK.t(k, v); };
  var q = '';

  function sorted() { return S.items().sort(function (a, b) { return NK.key(a.d.name) < NK.key(b.d.name) ? -1 : 1; }); }
  NK.rateList = sorted;

  U.screens.items = {
    title: function () { return t('tab_items'); },
    render: function () {
      var k = NK.key(q), list = sorted().filter(function (i) { return !k || NK.key(i.d.name).indexOf(k) >= 0; });
      var h = '<div class="brow"><div class="grow">' + U.fld('iq', q, t('search_items'), 'big') + '</div>' + U.btn('add', '+', 'pri sq', 'aria-label="' + t('add_item') + '"') + '</div>';
      if (!list.length) h += '<p class="empty">' + t(S.items().length ? 'nothing_found' : 'no_items') + '</p>';
      list.forEach(function (i) {
        h += '<button type="button" class="li" data-a="edit" data-id="' + i.id + '"><span><b>' + NK.esc(i.d.name) + '</b></span><span>' + NK.money(i.d.rate) + (i.d.unit ? ' <small>/ ' + NK.esc(i.d.unit) + '</small>' : '') + '</span></button>';
      });
      if (S.items().length) h += '<div class="row2 mt">' + U.btn('shareWa', t('share_chart'), 'wa') + U.btn('shareImg', t('share_img'), 'ghost') + '</div>';
      return h;
    },
    field: function (k) { return k === 'iq' ? { kind: 'text', max: 30, get: function () { return q; }, set: function (v) { q = v; } } : null; },
    act: {
      add: function () { editItem(null); },
      edit: function (b) { editItem(S.get(b.dataset.id)); },
      shareWa: function () { NK.share.whatsapp(NK.share.rateText()); },
      shareImg: function (b) { U.busy(b, NK.share.rateImage()); }
    }
  };

  function editItem(it) {
    var E = it ? { name: it.d.name, rate: String(it.d.rate || ''), unit: it.d.unit || '' } : { name: q, rate: '', unit: '' };
    var UNITS = ['kg', 'pc', 'mtr', 'ltr', 'box', 'bag'];
    U.sheet({
      first: 'iname',
      render: function () {
        return '<h3>' + t(it ? 'edit_item' : 'add_item') + '</h3><label>' + t('item') + '</label>' + U.fld('iname', E.name, t('item'), 'big') +
          '<label>' + t('rate') + '</label>' + U.fld('irate', E.rate, '0', 'big') +
          '<label>' + t('unit') + '</label>' + U.fld('iunit', E.unit, 'kg', 'big') +
          '<div class="chips">' + UNITS.map(function (u) { return '<button type="button" class="chip' + (E.unit === u ? ' on' : '') + '" data-a="unit" data-u="' + u + '">' + u + '</button>'; }).join('') + '</div>' +
          '<div class="row2 mt">' + (it && NK.can.del() ? U.btn('idel', t('delete'), 'danger ghost') : U.btn('closeSheet', t('cancel'), 'ghost')) + U.btn('isave', t('save'), 'pri', E.name.trim() && (!it || NK.can.edit(it)) ? '' : 'disabled') + '</div>';
      },
      field: function (k) {
        if (k === 'iname') return { kind: 'text', max: 40, get: function () { return E.name; }, set: function (v) { E.name = v; }, next: function () { NK.kp.focus('irate'); } };
        if (k === 'irate') return { kind: 'num', max: 9, get: function () { return E.rate; }, set: function (v) { E.rate = v; }, next: function () { NK.kp.focus('iunit'); } };
        if (k === 'iunit') return { kind: 'lower', max: 8, get: function () { return E.unit; }, set: function (v) { E.unit = v; } };
        return null;
      },
      act: {
        unit: function (b) { E.unit = b.dataset.u; U.render(); },
        isave: function () {
          var other = S.itemByName(E.name);
          if (other && (!it || other.id !== it.id)) return U.toast(t('item_exists'), { bad: true });
          var d = { name: E.name.trim(), rate: NK.num(E.rate), unit: E.unit.trim() };
          var undo = S.undoable(function () { if (it) S.update(it.id, d); else S.add('i', d); });
          U.closeSheet(); U.toast(t('saved'), { undo: undo });
        },
        idel: function () { var undo = S.undoable(function () { S.del(it.id); }); U.closeSheet(); U.toast(t('item_deleted'), { undo: undo }); }
      }
    });
  }
})(globalThis.NK = globalThis.NK || {});
