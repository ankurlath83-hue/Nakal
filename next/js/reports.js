/* REPORTS: item sales (quantity, amount, bills, average rate) and CSV exports. */
(function (NK) {
  'use strict';
  var U = NK.ui, S = NK.store, C = NK.calc, t = function (k, v) { return NK.t(k, v); };
  var period = 'month', PERIODS = ['month', 'last', 'fy', 'all'];

  function data() { var p = NK.periods(NK.today())[period]; return C.itemReport(S.bills(), p.from, p.to); }
  NK.reportData = function (per) { var p = NK.periods(NK.today())[per]; return C.itemReport(S.bills(), p.from, p.to); };

  U.screens.report = {
    tab: 'more', back: 'more',
    title: function () { return t('item_sales'); },
    render: function () {
      var list = data(), tot = list.reduce(function (a, x) { return a + x.amt; }, 0);
      var h = '<div class="chips">' + PERIODS.map(function (p) { return '<button type="button" class="chip' + (p === period ? ' on' : '') + '" data-a="per" data-p="' + p + '">' + t('per_' + p) + '</button>'; }).join('') + '</div>';
      h += '<div class="sum top"><span>' + t('total_sales') + '</span><b data-n="sales">' + NK.money(tot) + '</b></div>';
      if (!list.length) return h + '<p class="empty">' + t('no_sales') + '</p>';
      h += '<div class="rt head"><span>' + t('item') + '</span><span class="r">' + t('qty') + '</span><span class="r">' + t('amount') + '</span></div>';
      list.forEach(function (x) {
        h += '<div class="rt"><span><b>' + NK.esc(x.name) + '</b><small>' + x.bills + ' ' + t('bills_n') + ' · ' + t('avg') + ' ' + NK.money(x.avg) + '</small></span><span class="r">' + NK.commas(x.qty) + '</span><span class="r"><b>' + NK.money(x.amt) + '</b></span></div>';
      });
      return h + '<div class="row2 mt">' + U.btn('wa', t('share_wa'), 'wa') + (NK.can.exp() ? U.btn('csv', 'CSV', 'ghost') : '') + '</div>';
    },
    act: {
      per: function (b) { period = b.dataset.p; U.render(); },
      wa: function () {
        var L = ['*' + t('item_sales') + ' – ' + t('per_' + period) + '*', ''];
        data().forEach(function (x, i) { L.push((i + 1) + '. ' + x.name + ': ' + NK.commas(x.qty) + ' × ' + NK.money(x.avg) + ' = ' + NK.money(x.amt) + ' (' + x.bills + ' ' + t('bills_n') + ')'); });
        NK.share.whatsapp(L.join('\n'));
      },
      csv: function () { NK.share.file(new Blob([NK.csv(itemCsv(period))], { type: 'text/csv' }), 'item-sales-' + period + '.csv'); }
    }
  };

  function itemCsv(per) { return [['Item', 'Quantity', 'Amount', 'Bills', 'Average rate']].concat(NK.reportData(per).map(function (x) { return [x.name, x.qty, x.amt, x.bills, x.avg]; })); }
  NK.exportRows = {
    items: itemCsv,
    /* Every ledger line: bills and hand-made entries. */
    ledger: function () {
      var out = [['Party', 'Date', 'Type', 'Amount', 'Note']];
      S.parties().sort(function (a, b) { return a.d.name < b.d.name ? -1 : 1; }).forEach(function (p) {
        var led = C.ledger(p.id, S.bills(), S.entries());
        led.paid.map(function (e) { return [e, 'Paid']; }).concat(led.bill.map(function (e) { return [e, 'Bill']; }))
          .sort(function (a, b) { return a[0].date < b[0].date ? -1 : a[0].date > b[0].date ? 1 : 0; })
          .forEach(function (x) { out.push([p.d.name, NK.fmtDate(x[0].date), x[1], x[0].amt, x[0].billId ? 'Bill ' + x[0].note : x[0].note]); });
      });
      return out;
    },
    bills: function () {
      var out = [['Bill no', 'Date', 'Party', 'Item', 'Rate', 'Qty', 'Amount', 'Transport', 'Grand total']];
      S.bills().sort(function (a, b) { return a.d.no - b.d.no; }).forEach(function (b) {
        var p = S.get(b.d.partyId), name = p ? p.d.name : '';
        b.d.rows.forEach(function (r, i) { out.push([b.d.no, NK.fmtDate(b.d.date), name, r.item, r.rate, r.qty, C.rowAmt(r), i ? '' : b.d.transport, i ? '' : C.grand(b.d)]); });
      });
      return out;
    }
  };
})(globalThis.NK = globalThis.NK || {});
