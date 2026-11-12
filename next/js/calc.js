/* CALC: all the arithmetic, kept apart from the screens so it can be checked by tests.
   Nothing here touches the screen or storage. */
(function (NK) {
  'use strict';
  var C = NK.calc = {};

  /* One bill: amount per row, sub total, grand total. */
  C.rowAmt = function (r) { return NK.r2(NK.num(r.rate) * NK.num(r.qty)); };
  C.subTotal = function (rows) { return NK.r2((rows || []).reduce(function (a, r) { return a + C.rowAmt(r); }, 0)); };
  C.grand = function (bill) { return NK.r2(C.subTotal(bill.rows) + NK.num(bill.transport)); };

  /* A party's ledger: every saved bill is a Bill entry; manual entries are Paid or Bill.
     Returns both sides sorted by date. */
  C.ledger = function (partyId, bills, entries) {
    var paid = [], bill = [];
    bills.forEach(function (b) {
      if (b.d.partyId === partyId) bill.push({ id: b.id, date: b.d.date, amt: C.grand(b.d), note: '#' + b.d.no, billId: b.id, at: b.d.at || 0 });
    });
    entries.forEach(function (e) {
      if (e.d.partyId !== partyId) return;
      (e.d.kind === 'paid' ? paid : bill).push({ id: e.id, date: e.d.date, amt: NK.r2(e.d.amt), note: e.d.note || '', at: e.d.at || 0 });
    });
    function byDate(a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : a.at - b.at; }
    paid.sort(byDate); bill.sort(byDate);
    return { paid: paid, bill: bill };
  };

  /* Totals, balance, last dates and overdue days for one party.
     Payments clear the oldest bills first; a bill is late once its credit days are over. */
  C.partyStats = function (led, today, creditDays) {
    var totPaid = NK.r2(led.paid.reduce(function (a, x) { return a + x.amt; }, 0));
    var totBill = NK.r2(led.bill.reduce(function (a, x) { return a + x.amt; }, 0));
    var left = totPaid, oldestUnpaid = null;
    for (var i = 0; i < led.bill.length; i++) {
      var b = led.bill[i];
      if (left >= b.amt - 0.005) { left = NK.r2(left - b.amt); continue; }
      oldestUnpaid = b.date; break;
    }
    var overdue = 0;
    if (oldestUnpaid) overdue = Math.max(0, NK.daysBetween(NK.addDays(oldestUnpaid, creditDays || 0), today));
    return {
      paid: totPaid, bill: totBill, balance: NK.r2(totBill - totPaid), turnover: totBill,
      lastPaid: led.paid.length ? led.paid[led.paid.length - 1].date : '',
      lastBill: led.bill.length ? led.bill[led.bill.length - 1].date : '',
      overdue: overdue, oldestUnpaid: oldestUnpaid
    };
  };

  /* Item sales between two dates: quantity, amount, number of bills, average rate. Biggest first. */
  C.itemReport = function (bills, from, to) {
    var map = {};
    bills.forEach(function (b) {
      if (b.d.date < from || b.d.date > to) return;
      var seen = {};
      (b.d.rows || []).forEach(function (r) {
        var k = NK.key(r.item); if (!k) return;
        var o = map[k] || (map[k] = { name: String(r.item).trim(), qty: 0, amt: 0, bills: 0 });
        o.qty = NK.r2(o.qty + NK.num(r.qty)); o.amt = NK.r2(o.amt + C.rowAmt(r));
        if (!seen[k]) { seen[k] = 1; o.bills += 1; }
      });
    });
    return Object.keys(map).map(function (k) { var o = map[k]; o.avg = o.qty ? NK.r2(o.amt / o.qty) : 0; return o; })
      .sort(function (a, b) { return b.amt - a.amt || (a.name < b.name ? -1 : 1); });
  };

  /* Next bill number = biggest used number + 1. */
  C.nextBillNo = function (bills) { return bills.reduce(function (m, b) { return Math.max(m, +b.d.no || 0); }, 0) + 1; };

  /* If two devices made bills with the same number while offline, the later one is given a new number.
     Returns the list of {id, no} changes this device should make (only for its own bills). */
  C.renumber = function (bills, myDevice) {
    var byNo = {}, changes = [], max = 0;
    bills.forEach(function (b) { max = Math.max(max, +b.d.no || 0); (byNo[b.d.no] = byNo[b.d.no] || []).push(b); });
    Object.keys(byNo).forEach(function (no) {
      var g = byNo[no]; if (g.length < 2) return;
      g.sort(function (a, b) { return (a.d.at || 0) - (b.d.at || 0) || (a.id < b.id ? -1 : 1); });
      g.slice(1).forEach(function (b) { if (b.d.dev === myDevice) changes.push({ id: b.id, no: ++max }); });
    });
    return changes;
  };

  /* Cash counter. */
  C.NOTES = [500, 200, 100, 50, 20, 10, 5, 2, 1];
  C.cashTotal = function (counts) { return C.NOTES.reduce(function (a, n) { return a + n * (parseInt(counts[n], 10) || 0); }, 0); };
})(globalThis.NK = globalThis.NK || {});
