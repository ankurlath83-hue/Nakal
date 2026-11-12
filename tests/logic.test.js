/* TEST 1 and 2: 320 bills + 160 payments checked against a separate calculation,
   then lock, wrong PIN, PIN change, backup, erase and restore.
   Run: node tests/logic.test.js */
const assert = require('assert');
globalThis.NK = {};
/* Memory stand-in for the phone's storage. */
function memdb() { const meta = new Map(), recs = new Map(); return {
  metaGet: k => Promise.resolve(meta.has(k) ? meta.get(k) : null), metaSet: (k, v) => { v == null ? meta.delete(k) : meta.set(k, v); return Promise.resolve(); },
  recAll: () => Promise.resolve([...recs.values()]), recPut: o => { recs.set(o.id, o); return Promise.resolve(); }, clear: () => { meta.clear(); recs.clear(); return Promise.resolve(); }, _recs: recs }; }
NK.db = memdb();
['core', 'i18n', 'calc', 'security', 'store'].forEach(f => require('../js/' + f + '.js'));
const { store: S, sec, calc: C } = NK;
NK.app = { device: 'dev-test' };

/* Repeatable random numbers so the test is the same every run. */
let seed = 20261112; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const pick = a => a[Math.floor(rnd() * a.length)], int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const PARTIES = ['Ramesh Traders', 'Maa Tarini Stores', 'Sahu Cloth House', 'Bargarh Handloom', 'Meher Weavers', 'Jai Jagannath Textiles', 'Agrawal Brothers', 'Patel Dyeing', 'Sri Balaji Fabrics', 'Nayak Saree Centre',
  'Sambalpuri Bastralaya', 'Pradhan Yarn Depot', 'Laxmi Colour House', 'Om Sai Traders', 'Kalinga Handlooms', 'Behera & Sons', 'Mahavir Agencies', 'Padampur Weavers Society', 'Gupta Chemicals', 'Shree Ganesh Dyes',
  'Barpali Ikat House', 'Sonepur Silk Store', 'Rout Enterprises', 'New Bharat Textiles', 'Dash Dye Works'];
const ITEMS = [['Reactive Red M5B', 620, 'kg'], ['Reactive Black B', 410, 'kg'], ['Vat Blue RSN', 2350, 'kg'], ['Vat Green FFB', 1980, 'kg'], ['Caustic Soda Flakes', 62, 'kg'], ['Hydrosulphite', 148, 'kg'], ['Soda Ash', 38.5, 'kg'],
  ['Glauber Salt', 14.75, 'kg'], ['Acetic Acid', 96, 'ltr'], ['Hydrogen Peroxide', 44, 'ltr'], ['Wetting Agent', 135, 'ltr'], ['Fixing Agent', 210, 'ltr'], ['Napthol AS', 890, 'kg'], ['Fast Red B Base', 760, 'kg'],
  ['Direct Yellow 5GL', 540, 'kg'], ['Sulphur Black', 128, 'kg'], ['Turkey Red Oil', 118, 'ltr'], ['Cotton Yarn 2/40', 365, 'kg'], ['Cotton Yarn 2/60', 472.5, 'kg'], ['Softener Flakes', 165, 'kg']];
const day = n => NK.addDays('2025-02-01', n);      // dates run from Feb 2025 to Nov 2026 (three financial years touched)
const TODAY = '2026-11-12';

(async () => {
  await sec.setup('135790');
  S.clearMemory(); S.setSettings({ bizName: 'Sarada Textiles', creditDays: 30 });
  /* ---- make the book through the same store the app uses ---- */
  const truth = { bills: [], pays: [] };             // plain copy kept for the separate calculation
  for (let n = 1; n <= 320; n++) {
    const party = pick(PARTIES), date = day(int(0, 648)), rows = [];
    for (let i = 0, k = int(1, 6); i < k; i++) { const it = pick(ITEMS); rows.push({ item: it[0], rate: rnd() < 0.2 ? Math.round(it[1] * (0.9 + rnd() * 0.2) * 100) / 100 : it[1], qty: rnd() < 0.3 ? int(1, 400) / 4 : int(1, 60), unit: it[2] }); }
    const transport = rnd() < 0.4 ? int(1, 30) * 10 : 0;
    const p = S.ensureParty(party);
    rows.forEach(r => { if (!S.itemByName(r.item)) S.add('i', { name: r.item, rate: r.rate, unit: r.unit }); });
    S.add('b', { no: C.nextBillNo(S.bills()), partyId: p.id, date, rows, transport, at: n, dev: 'dev-test' });
    truth.bills.push({ party, date, rows, transport });
  }
  for (let n = 1; n <= 160; n++) {
    const party = pick(PARTIES), date = day(int(0, 648)), kind = rnd() < 0.85 ? 'paid' : 'bill', amt = rnd() < 0.5 ? int(1, 80) * 500 : int(100, 9999999) / 100;
    S.add('e', { partyId: S.ensureParty(party).id, date, kind, amt, note: pick(['Cash', 'UPI', 'Cheque', 'Bank', '']), at: 1000 + n });
    truth.pays.push({ party, date, kind, amt });
  }
  /* a few edits and deletes, mirrored in the plain copy */
  const b7 = S.bills().find(b => b.d.no === 7); S.update(b7.id, { transport: 999 }); truth.bills[6].transport = 999;
  const b9 = S.bills().find(b => b.d.no === 9); S.del(b9.id); truth.bills[8] = null;
  const undo = S.undoable(() => S.add('e', { partyId: S.parties()[0].id, date: TODAY, kind: 'paid', amt: 123456, note: '', at: 5000 })); undo();
  await S.flush();

  /* ---- separate calculation, done in whole paise with different code ---- */
  const P = x => Math.round(x * 100);
  function expected() {
    const out = {};
    PARTIES.forEach(name => {
      const debits = [], credits = [];
      truth.bills.forEach(b => { if (b && b.party === name) debits.push([b.date, b.rows.reduce((a, r) => a + P(Math.round(r.rate * r.qty * 100) / 100), 0) + P(b.transport)]); });
      truth.pays.forEach(e => { if (e.party === name) (e.kind === 'paid' ? credits : debits).push([e.date, P(e.amt)]); });
      const bill = debits.reduce((a, d) => a + d[1], 0), paid = credits.reduce((a, d) => a + d[1], 0);
      debits.sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
      let left = paid, firstUnpaid = null;
      for (const d of debits) { if (left >= d[1]) left -= d[1]; else { firstUnpaid = d[0]; break; } }
      const overdue = firstUnpaid ? Math.max(0, Math.round((Date.parse(TODAY) - Date.parse(firstUnpaid)) / 864e5) - 30) : 0;
      out[name] = { bill, paid, bal: bill - paid, overdue, lastBill: debits.length ? debits[debits.length - 1][0] : '', lastPaid: credits.map(c => c[0]).sort().pop() || '' };
    });
    return out;
  }
  function expectedItems(from, to) {
    const m = {};
    truth.bills.forEach(b => { if (!b || b.date < from || b.date > to) return; const seen = new Set();
      b.rows.forEach(r => { const o = m[r.item] || (m[r.item] = { qty: 0, amt: 0, bills: 0 }); o.qty += Math.round(r.qty * 100); o.amt += P(Math.round(r.rate * r.qty * 100) / 100); if (!seen.has(r.item)) { seen.add(r.item); o.bills++; } }); });
    return m;
  }
  function check(label) {
    const exp = expected(); let n = 0;
    S.parties().forEach(p => {
      const st = S.partyStats(p, TODAY), e = exp[p.d.name];
      assert.strictEqual(P(st.bill), e.bill, label + ' bill total ' + p.d.name); assert.strictEqual(P(st.paid), e.paid, label + ' paid total ' + p.d.name);
      assert.strictEqual(P(st.balance), e.bal, label + ' balance ' + p.d.name); assert.strictEqual(st.overdue, e.overdue, label + ' overdue ' + p.d.name);
      assert.strictEqual(st.lastBill, e.lastBill, label + ' last bill ' + p.d.name); assert.strictEqual(st.lastPaid, e.lastPaid, label + ' last paid ' + p.d.name); n++;
    });
    assert.strictEqual(n, PARTIES.length);
    const per = NK.periods(TODAY); let items = 0;
    Object.keys(per).forEach(k => {
      const rep = C.itemReport(S.bills(), per[k].from, per[k].to), e = expectedItems(per[k].from, per[k].to);
      assert.strictEqual(rep.length, Object.keys(e).length, label + ' item count ' + k);
      rep.forEach((x, i) => { const y = e[x.name]; assert.strictEqual(Math.round(x.qty * 100), y.qty, label + ' qty ' + x.name + ' ' + k); assert.strictEqual(P(x.amt), y.amt, label + ' amt ' + x.name + ' ' + k); assert.strictEqual(x.bills, y.bills, label + ' bills ' + x.name);
        assert.strictEqual(P(x.avg), P(Math.round(y.amt / y.qty * 100) / 100), label + ' avg ' + x.name); if (i) assert.ok(rep[i - 1].amt >= x.amt, 'biggest first'); items++; });
    });
    return { parties: n, itemLines: items };
  }
  const r1 = check('fresh');
  assert.deepStrictEqual(NK.periods(TODAY).fy, { from: '2026-04-01', to: '2027-03-31' }); assert.strictEqual(NK.fyStart('2026-03-31'), '2025-04-01');
  assert.strictEqual(S.bills().length, 319); assert.strictEqual(S.entries().length, 160);
  console.log('PASS totals: ' + S.bills().length + ' bills, ' + S.entries().length + ' payments/entries, ' + r1.parties + ' party balances and ' + r1.itemLines + ' item lines match the separate calculation');

  /* ---- formats ---- */
  assert.strictEqual(NK.money(100000), '₹1,00,000'); assert.strictEqual(NK.money(12345678.5), '₹1,23,45,678.50'); assert.strictEqual(NK.money(999), '₹999'); assert.strictEqual(NK.money(-1500), '₹-1,500');
  assert.strictEqual(NK.fmtDate('2026-11-12'), '12 Nov 2026');
  console.log('PASS formats: rupee sign, Indian commas, 12 Nov 2026, April-March year');

  /* ---- what is on the "disk" is unreadable ---- */
  const disk = JSON.stringify([...NK.db._recs.values()]);
  assert.ok(!/Ramesh|Reactive|partyId|Sarada/.test(disk), 'stored records must not contain readable text');
  const pinMeta = await NK.db.metaGet('pin'); assert.strictEqual(pinMeta.iter, 600000);
  console.log('PASS storage: ' + NK.db._recs.size + ' stored records contain no readable names or items; PBKDF2 rounds = ' + pinMeta.iter);

  /* ---- lock, wrong PIN (slowed), right PIN ---- */
  sec.lock(); S.clearMemory(); assert.strictEqual(S.bills().length, 0); assert.ok(!sec.unlocked());
  let r = await sec.unlock('000000'); assert.ok(!r.ok && r.left === 2);
  r = await sec.unlock('111111'); assert.ok(!r.ok && r.left === 1);
  r = await sec.unlock('222222'); assert.ok(!r.ok && r.wait === 30000, 'third wrong try starts a 30 second wait');
  r = await sec.unlock('135790'); assert.ok(!r.ok && r.wait > 0, 'even the right PIN must wait');
  await NK.db.metaSet('tries', { n: 3, until: Date.now() - 1 });             // pretend 30 seconds passed
  r = await sec.unlock('333333'); assert.ok(!r.ok && r.wait === 60000, 'wait doubles');
  await NK.db.metaSet('tries', { n: 4, until: Date.now() - 1 });
  r = await sec.unlock('135790'); assert.ok(r.ok); await S.load(); check('after unlock');
  console.log('PASS lock: 3 wrong PINs -> 30s wait, then 60s; right PIN reopens and all totals still match');

  /* ---- PIN change ---- */
  r = await sec.changePin('999999', '246810'); assert.ok(!r.ok);
  await NK.db.metaSet('tries', { n: 0, until: 0 });
  r = await sec.changePin('135790', '246810'); assert.ok(r.ok);
  sec.lock(); S.clearMemory();
  r = await sec.unlock('135790'); assert.ok(!r.ok, 'old PIN no longer works');
  r = await sec.unlock('246810'); assert.ok(r.ok); await S.load(); check('after PIN change');
  console.log('PASS PIN change: old PIN refused, new PIN opens, totals match');

  /* ---- backup, erase, restore ---- */
  const file = await sec.backupMake('bargarh-2026', { made: Date.now(), recs: S.exportAll() });
  assert.ok(!/Ramesh|Reactive|partyId/.test(file), 'backup file must not contain readable text');
  await assert.rejects(sec.backupRead(file, 'wrong-password'), /wrongpass/); await assert.rejects(sec.backupRead('hello', 'x'), /notbackup/);
  await assert.rejects(sec.backupRead(file.replace(/"ct":"(.{40})(.)/, (m, a, c) => '"ct":"' + a + (c === 'A' ? 'B' : 'A')), 'bargarh-2026'), /wrongpass/, 'a tampered file is refused');
  await NK.db.clear(); sec.lock(); S.clearMemory();
  assert.strictEqual(await sec.hasPin(), false); assert.strictEqual(NK.db._recs.size, 0);
  await sec.setup('112233'); S.clearMemory();
  const back = await sec.backupRead(file, 'bargarh-2026'); const n = S.importAll(back.recs); await S.flush();
  check('after restore'); assert.strictEqual(S.settings().bizName, 'Sarada Textiles');
  assert.strictEqual(S.importAll(back.recs), 0, 'restoring the same file twice adds nothing');
  sec.lock(); S.clearMemory(); await sec.unlock('112233'); await S.load(); check('after restore + relock');
  console.log('PASS backup: file unreadable, wrong password and tampered file refused; erase leaves nothing; restore brought back ' + n + ' records and all totals match');

  /* ---- two phones add entries at the same time: both are kept ---- */
  const p0 = S.parties()[0], before = S.entries().length;
  S.add('e', { partyId: p0.id, date: TODAY, kind: 'paid', amt: 100, note: 'phone A', at: 1 });
  S.applyRemote({ id: 'remote-1', t: 'e', d: { partyId: p0.id, date: TODAY, kind: 'paid', amt: 200, note: 'phone B', at: 2 }, u: Date.now(), del: false, by: 'u2' });
  assert.strictEqual(S.entries().length, before + 2);
  const mine = S.add('b', { no: 900, partyId: p0.id, date: TODAY, rows: [{ item: 'X', rate: 1, qty: 1 }], transport: 0, at: 50, dev: 'dev-test' });
  S.applyRemote({ id: 'remote-b', t: 'b', d: { no: 900, partyId: p0.id, date: TODAY, rows: [{ item: 'Y', rate: 1, qty: 1 }], transport: 0, at: 40, dev: 'other' }, u: Date.now(), del: false });
  const ch = C.renumber(S.bills(), 'dev-test'); assert.deepStrictEqual(ch, [{ id: mine.id, no: 901 }]);
  assert.deepStrictEqual(C.renumber(S.bills(), 'other'), [], 'the earlier bill keeps its number');
  console.log('PASS merge: entries from two phones are both kept; a clashing bill number is moved to the next free number');
  console.log('ALL LOGIC TESTS PASSED');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
