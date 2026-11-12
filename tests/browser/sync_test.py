# TEST 3: sync with two phones (owner + staff), a third phone for the owner, and entries made offline on both.
# Uses the real app in headless Chrome against the local Firebase emulators.
import asyncio, json, urllib.request, re
from drv import *
Q = '?touch=1&emu=1'
def http(url, method='GET', headers=None):
    return urllib.request.urlopen(urllib.request.Request(url, method=method, headers=headers or {}), timeout=10).read().decode()
def verify(email):
    codes = json.loads(http('http://127.0.0.1:9099/emulator/v1/projects/nakal-cdb66/oobCodes'))['oobCodes']
    link = [c for c in codes if c['email'] == email and c['requestType'] == 'VERIFY_EMAIL'][-1]['oobLink']; http(link)
async def wait(a, expr, what, t=40):
    for _ in range(t * 4):
        if await a.js(expr): return
        await asyncio.sleep(0.25)
    raise AssertionError(f'{a.name}: timed out waiting for {what}; state=' + str(await a.js("NK.sync.state+' '+NK.sync.err+' dirty='+NK.store.dirty().length")))
async def signup(a, email, pw='shop1234'):
    await a.go('online'); await wait(a, "NK.sync.state==='signedout'", 'sign-in form')
    await a.focus('em'); await a.type(email); await a.focus('pw'); await a.type(pw); await a.nxt(); await a.act('signup')
    await wait(a, "NK.sync.state==='verify'", 'verify screen'); verify(email); await a.act('recheck')
async def signin(a, email, pw='shop1234'):
    await a.go('online'); await wait(a, "NK.sync.state==='signedout'", 'sign-in form')
    await a.focus('em'); await a.type(email); await a.focus('pw'); await a.type(pw); await a.nxt(); await a.act('signin')
SNAP = "JSON.stringify({bills:NK.store.bills().map(b=>[b.d.no,NK.calc.grand(b.d)]).sort((x,y)=>x[0]-y[0]), ent:NK.store.entries().map(e=>[e.d.kind,e.d.amt,e.d.note]).sort(), bal:NK.store.parties().map(p=>[p.d.name,NK.store.partyStats(p).balance]).sort(), items:NK.store.items().length})"
async def same(devs, what, t=40):
    for _ in range(t * 4):
        snaps = [await d.js(SNAP) for d in devs]; dirty = [await d.js("NK.store.dirty().length") for d in devs]
        if len(set(snaps)) == 1 and not any(dirty): print('PASS', what); return json.loads(snaps[0])
        await asyncio.sleep(0.25)
    for d, s in zip(devs, snaps): print(d.name, s[:600])
    raise AssertionError('devices differ: ' + what)

async def main():
    http('http://127.0.0.1:9099/emulator/v1/projects/nakal-cdb66/accounts', 'DELETE')
    http('http://127.0.0.1:8080/emulator/v1/projects/nakal-cdb66/databases/(default)/documents', 'DELETE')
    async with async_playwright() as pw:
        b = await launch(pw)
        A = await newapp(b, name='owner-phone', q=Q); B = await newapp(b, name='staff-phone', q=Q)
        await A.setup(biz='Sarada Textiles'); await B.setup(biz='Staff copy', pin='246810')
        # owner already has work on the phone before going online
        await A.bill('Ramesh Traders', [('Red Dye', 450, 2), ('Soda Ash', 38.5, 25)], transport=120)
        await A.bill('Meher Weavers', [('Vat Blue', 2350, 1.5)])
        await signup(A, 'owner@shop.in'); await wait(A, "NK.sync.state==='nobiz'", 'owner ready to start')
        await A.act('create'); await A.p.wait_for_selector('#sheets .sheet .code'); code = await A.js("document.querySelector('.sheet .code').textContent")
        assert re.match(r'^[A-Z2-9]{4}(-[A-Z2-9]{4}){3}$', code), code; await A.act('closeSheet', 1)
        await wait(A, "NK.sync.status()==='synced'", 'owner synced'); print('PASS owner started online sync; recovery code shown; status = Synced')
        # staff joins
        await signup(B, 'staff@shop.in'); await wait(B, "NK.sync.state==='nobiz'", 'staff sees not-added message')
        await A.focus('se'); await A.type('staff@shop.in'); await A.nxt(); await A.act('entry'); await A.act('addstaff')
        await wait(A, "NK.sync.members.length===1 && NK.sync.members[0].entryOnly===false", 'staff listed')
        await B.act('retry'); await wait(B, "NK.sync.state==='needkey' && NK.sync.myCode", 'staff waiting for approval')
        await wait(A, "NK.sync.requests.length===1", 'owner sees request')
        ca, cb = await A.js("NK.sync.requests[0].code"), await B.js("NK.sync.myCode"); assert ca == cb, (ca, cb)
        assert await B.js("NK.store.bills().length") == 0, 'staff must not have data before approval'
        await A.act('approve'); await wait(B, "NK.sync.state==='on'", 'staff live')
        s = await same([A, B], f'staff phone approved (code {ca} matched on both) and received the owner\'s 2 bills')
        assert len(s['bills']) == 2
        # live both ways
        await A.entry('Ramesh Traders', 1000, 'paid', 'UPI'); await same([A, B], 'payment typed on owner phone showed on staff phone', 10)
        await B.bill('Sahu Cloth House', [('Caustic Soda', 62, 50)], transport=80); await same([A, B], 'bill typed on staff phone showed on owner phone', 10)
        assert await A.js("NK.sync.status()") == 'synced'
        # both offline, both make entries, including bills that will clash on number
        await A.ctx.set_offline(True); await B.ctx.set_offline(True); await asyncio.sleep(0.5)
        assert await A.js("NK.sync.status()") == 'offline'
        await A.bill('Meher Weavers', [('Vat Green', 1980, 2)]); await A.entry('Meher Weavers', 2500, 'paid', 'Cash')
        await B.bill('Ramesh Traders', [('Soda Ash', 38.5, 100), ('Red Dye', 450, 1)]); await B.entry('Sahu Cloth House', 3180, 'paid', 'Bank'); await B.entry('Ramesh Traders', 500, 'bill')
        na, nb = await A.js("NK.store.bills().length"), await B.js("NK.store.bills().length"); assert na == 4 and nb == 4
        assert await A.js("NK.store.dirty().length") > 0 and await B.js("NK.store.dirty().length") > 0
        await A.ctx.set_offline(False); await B.ctx.set_offline(False)
        s = await same([A, B], 'entries made offline on both phones all arrived on both after internet came back', 60)
        nos = [x[0] for x in s['bills']]; assert len(s['bills']) == 5 and sorted(nos) == [1, 2, 3, 4, 5], nos
        assert len(s['ent']) == 4; print('PASS both offline bills kept (5 bills, numbers 1-5, no clash), 4 ledger entries, balances equal:', s['bal'])
        # the server holds only scrambled text
        biz = await A.js("NK.store.local('_sync').bizId")
        raw = http(f'http://127.0.0.1:8080/v1/projects/nakal-cdb66/databases/(default)/documents/nk_biz/{biz}/recs?pageSize=300', headers={'Authorization': 'Bearer owner'})
        docs = json.loads(raw)['documents']; assert len(docs) >= 15
        for w in ['Ramesh', 'Meher', 'Sahu', 'Dye', 'Soda', 'Sarada', 'partyId', 'rows', 'Cash']: assert w not in raw, w
        assert set(docs[0]['fields'].keys()) == {'c', 'iv', 'by', 'del', 'm', 'u'}
        print(f'PASS server copy: {len(docs)} documents, none contains a party name, item name or amount field (only c, iv, by, del, m, u)')
        # owner's new phone with the recovery code
        C = await newapp(b, name='owner-phone-2', q=Q); await C.setup(biz='New phone', pin='112233')
        await signin(C, 'owner@shop.in'); await wait(C, "NK.sync.state==='needkey'", 'new phone asks for key')
        await C.focus('rc'); await C.type('AAAA-BBBB-CCCC-DDDD'); await C.nxt(); await C.act('userec'); await asyncio.sleep(2); assert await C.js("NK.sync.state") == 'needkey'
        await C.js("NK.ui.screens.online.field('rc').set('')"); await C.focus('rc'); await C.type(code); await C.nxt(); await C.act('userec')
        await wait(C, "NK.sync.state==='on'", 'new phone live'); await same([A, B, C], 'owner\'s new phone: wrong recovery code refused, right code brought the whole book')
        assert await C.js("NK.store.settings().bizName") == 'Sarada Textiles'
        # entry-only
        await A.go('online'); await A.act('toggle'); await wait(B, "NK.sync.role()==='entry'", 'staff became entry only')
        print('can', await B.js("[NK.can.del(), NK.can.exp(), NK.sync.role(), NK.sync.state]"))
        await B.go('more'); assert await B.p.locator('[data-a="backup"]').count() == 0 and await B.p.locator('[data-a="exports"]').count() == 0
        ob = await B.js("NK.store.bills().find(b=>b.d.no===1).id"); await B.js(f"NK.store.del('{ob}')")   # bypass the app and try anyway
        await wait(B, f"!!NK.store.get('{ob}') && NK.store.dirty().length===0", 'server refused and bill came back'); await same([A, B, C], 'entry-only staff: export and delete hidden; a forced delete of the owner\'s bill was refused by the server and undone')
        await B.entry('Sahu Cloth House', 700, 'paid', 'Cash'); await same([A, B, C], 'entry-only staff can still add entries', 15)
        await B.act('undo'); s2 = await same([A, B, C], 'entry-only staff can Undo own fresh entry', 15); assert len(s2['ent']) == 4
        # remove staff
        await A.act('remove'); await A.act('yes'); await wait(B, "NK.sync.state==='removed'", 'staff sees removed')
        await A.entry('Ramesh Traders', 111, 'paid'); await same([A, C], 'owner phones still sync', 15); await asyncio.sleep(2)
        assert await B.js("NK.store.entries().some(e=>e.d.amt===111)") is False; print('PASS removed staff: phone shows "access removed" and gets no new entries')
        # lock and reopen keeps syncing
        await A.act('lock'); await A.p.wait_for_selector('body.locked'); assert await A.js("NK.store.bills().length") == 0
        await C.entry('Meher Weavers', 222, 'paid'); await A.unlock(); await wait(A, "NK.sync.state==='on'", 'A live again'); await same([A, C], 'after lock and unlock the phone caught up with entries made meanwhile', 20)
        errs = [e for d in (A, B, C) for e in d.errors if 'permission' not in e.lower() and 'ERR_INTERNET_DISCONNECTED' not in e and '400' not in e and 'Failed to load resource' not in e]
        print('console errors:', errs[:5]); await b.close(); print('ALL SYNC TESTS PASSED')
asyncio.run(main())
