# TEST 2 and 4 in the real app: lock, wrong PIN, PIN change, backup, erase, restore; laptop keyboard;
# and every screen at 320, 360 and 390 px in English and Hindi (nothing wider than the screen, no missing words, tap targets 44px+).
import asyncio, json, os, time
from drv import *
SCREENS = ['bill', 'ledger', 'parties', 'items', 'more', 'report', 'allbills', 'cash', 'exports', 'backup', 'settings', 'about', 'online']
CHECK = """(() => { const bad=[]; const W=innerWidth;
  document.querySelectorAll('#app *, #lock *, #wheel *').forEach(e=>{ if(!e.offsetParent && getComputedStyle(e).position!=='fixed') return; const r=e.getBoundingClientRect(); if(r.width===0) return;
    if(r.right>W+0.5||r.left<-0.5){ if(!e.closest('.sugg,.chips,.wcol')) bad.push('WIDE '+e.className+' '+Math.round(r.right)); }
    if(e.matches('button,[data-a],[data-f]') && r.height<43.5) bad.push('SHORT '+(e.dataset.a||e.dataset.f||e.className)+' '+Math.round(r.height)); });
  if(document.documentElement.scrollWidth>W) bad.push('PAGE WIDER '+document.documentElement.scrollWidth);
  if(document.body.innerText.includes('\\u26A0')) bad.push('MISSING WORD');
  const sizes=new Set(); document.querySelectorAll('#app *').forEach(e=>{ if(e.offsetParent&&e.childNodes.length&&[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())) sizes.add(getComputedStyle(e).fontSize)});
  return {bad:[...new Set(bad)], sizes:[...sizes].sort()}; })()"""
async def main():
    async with async_playwright() as pw:
        b = await launch(pw); t0 = time.time()
        a = await newapp(b, w=360); print('cold open to first screen: %.2fs' % (time.time() - t0))
        await a.setup(biz='Sarada Textiles', party='Ramesh Traders')
        # tip shows for first bill
        await a.js("NK.ui.go('bill',{fresh:true})"); assert await a.p.locator('.tip').count() == 1
        # catalogue suggestion fills rate and jumps to qty; new row opens after qty
        await a.bill('Ramesh Traders', [('Reactive Red M5B', 620, 2), ('Soda Ash', 38.5, 25)], transport=120)
        await a.js("NK.ui.go('bill',{fresh:true})"); await a.focus('party'); await a.type('Ra'); await a.act('sugg'); await a.type('So'); await a.act('sugg')
        assert await a.js("NK.kp.key") == 'qty:0' and await a.js("document.querySelector('[data-f=\"rate:0\"]').textContent") == '38.5'
        await a.type('10'); await a.nxt(); assert await a.js("NK.kp.key") == 'item:1' and await a.p.locator('.bt').count() == 3
        assert await a.p.locator('.totbar [data-a="save"]').is_visible() and await a.js("document.querySelector('.totbar b').textContent") == '₹385'
        box = await a.p.locator('.totbar').bounding_box(); kb = await a.p.locator('#kp').bounding_box(); assert box['y'] + box['height'] <= kb['y'] + 1, 'total bar must sit above keypad'
        await a.act('save'); txt = await a.js("NK.share.billText(NK.store.bills().find(b=>b.d.no===2))"); assert 'Grand total: ₹385' in txt and '#2' in txt
        url = await a.js("NK.share.waUrl('hi','9876543210')"); assert url.startswith('https://wa.me/919876543210?text=')
        await a.act('closeSheet', 1); await a.act('undo'); assert await a.js("NK.store.bills().length") == 1
        print('PASS bill: tip, suggestions fill rate and jump to qty, new row after qty, total+Save above keypad, bill numbers 1,2, WhatsApp text, Undo')
        # ledger
        await a.entry('Ramesh Traders', 1000, 'paid', 'UPI'); await a.entry('Ramesh Traders', 250.5, 'bill')
        st = json.loads(await a.js("JSON.stringify(NK.store.partyStats(NK.store.parties()[0]))")); assert st['balance'] == 2322.5 - 1000 + 250.5, st
        assert await a.p.locator('.side').count() == 2 and '₹1,573' in await a.js("document.querySelector('.bal b').textContent")
        await a.act('undo'); assert await a.js("NK.store.entries().length") == 1
        await a.js("NK.kp.blur()"); await a.p.locator('.en[data-bill]').click(); assert await a.js("NK.ui.cur") == 'bill' and '#1' in await a.js("document.getElementById('title').textContent")
        # editing the bill updates the ledger; deleting removes it
        await a.focus('transport'); await a.key('bksp'); await a.key('bksp'); await a.key('bksp'); await a.type('200'); await a.act('save'); await a.act('closeSheet', 1)
        assert await a.js("NK.store.partyStats(NK.store.parties()[0]).bill") == 2402.5
        print('PASS ledger: two sides, balance, Paid/Bill keys, quick note, Undo, tap bill entry opens bill, editing a bill updates the ledger')
        # date wheel
        await a.go('ledger'); await a.act('date'); await a.act('wyest'); assert await a.js("document.querySelector('.ebar .datebtn').textContent") == await a.js("NK.fmtDateShort(NK.addDays(NK.today(),-1))")
        await a.act('date'); await a.p.locator('.wi[data-w="d"][data-v="5"]').click(); await a.act('wdone'); assert (await a.js("document.querySelector('.ebar .datebtn').textContent")).startswith('5 ')
        print('PASS date wheel: Yesterday button and picking a day')
        # backup -> erase -> restore, through the screens
        await a.go('backup'); await a.act('make'); await a.type('bargarh2026')
        async with a.p.expect_download() as d: await a.act('ok')
        path = await (await d.value).path(); data = open(path).read(); assert 'Ramesh' not in data and 'nk-backup' in data; open('bk.nkbackup', 'w').write(data)
        # lock + wrong PIN + right PIN
        await a.act('lock'); await a.p.wait_for_selector('body.locked'); assert await a.js("document.getElementById('lname').textContent.replace(/\\u00a0/g,' ')") == 'Sarada Textiles'
        assert await a.js("NK.store.bills().length") == 0 and await a.js("document.getElementById('main').innerHTML") == ''
        for _ in range(3): await a.pin('000000'); await asyncio.sleep(1.2)
        assert 'Wait' in await a.js("document.getElementById('lmsg').textContent"); await a.pin('135790'); await asyncio.sleep(1); assert await a.js("document.body.classList.contains('locked')")
        await a.js("NK.db.metaSet('tries',{n:0,until:0})"); await asyncio.sleep(1.5); await a.unlock('135790'); assert await a.js("NK.store.bills().length") == 1
        # PIN change
        await a.go('settings'); await a.act('pin'); await a.type('135790'); await a.nxt(); await a.type('246810'); await a.nxt(); await a.type('246810'); await a.act('ok'); await a.p.wait_for_selector('#sheets .sheet', state='detached', timeout=20000)
        await a.act('lock'); await a.pin('135790'); await asyncio.sleep(1.2); assert await a.js("document.body.classList.contains('locked')"); await a.unlock('246810')
        # auto-lock when idle
        await a.js("NK.app.meta.autolock=0.02"); await a.p.wait_for_selector('body.locked', timeout=15000); await a.unlock('246810'); await a.js("NK.app.meta.autolock=2")
        # erase
        await a.go('backup'); await a.act('erase'); await a.type('246810'); await a.act('ok'); await a.p.wait_for_selector('[data-f="oname"]', timeout=20000)
        assert await a.js("indexedDB.databases().then(d=>new Promise(r=>{const q=indexedDB.open('nk-book');q.onsuccess=()=>{const t=q.result.transaction('recs').objectStore('recs').count();t.onsuccess=()=>r(t.result)}}))") == 0
        await a.setup(biz='Fresh', pin='112233'); await a.go('backup'); 
        async with a.p.expect_file_chooser() as fc: await a.act('restore')
        await (await fc.value).set_files('bk.nkbackup')
        await a.p.wait_for_selector('#sheets .sheet [data-f="sec"]'); await a.type('wrongpass1'); await a.act('ok'); await asyncio.sleep(1.5); assert await a.p.locator('#sheets .sheet').count() == 1
        for _ in range(10): await a.key('bksp')
        await a.type('bargarh2026'); await a.act('ok'); await a.p.wait_for_selector('#sheets .sheet', state='detached', timeout=20000)
        assert await a.js("NK.store.bills().length") == 1 and await a.js("NK.store.settings().bizName") == 'Sarada Textiles'
        print('PASS security screens: lock clears the screen, 3 wrong PINs force a wait, PIN change, auto-lock when idle, encrypted backup, erase leaves nothing stored, wrong backup password refused, restore brings the book back')
        # more data for the layout check
        for i, (p, it, r, q) in enumerate([('Maa Tarini Stores', 'Vat Blue RSN', 2350, 12), ('Jai Jagannath Textiles and Handloom Emporium', 'Hydrosulphite Concentrated Powder', 148, 250), ('Sahu Cloth House', 'Caustic Soda Flakes', 62, 1000)]):
            await a.bill(p, [(it, r, q), ('Soda Ash', 38.5, 40)], transport=1250)
        await a.entry('Sahu Cloth House', 12345678, 'paid', 'Cheque'); await a.entry('Maa Tarini Stores', 5000, 'paid', 'Cash'); await a.js("NK.kp.blur()")
        await a.js("(()=>{const p=NK.store.partyByName('Maa Tarini Stores');NK.store.update(p.id,{phone:'9876543210'});const b=NK.store.bills().find(b=>b.d.partyId===p.id);NK.store.update(b.id,{date:'2026-08-01'})})()")
        rec = await a.js("JSON.stringify(NK.store.exportAll())"); await b.close()
        # every screen, 3 widths x 2 languages, phone layout with keypad open where the screen has one
        b = await launch(pw); problems = []; n = 0
        for w in (320, 360, 390):
            for lang in ('en', 'hi'):
                a = await newapp(b, w=w, h=640 if w == 320 else 780, name=f'{w}{lang}'); await a.p.screenshot(path=f'shots/ob1-{w}-{lang}.png') if False else None
                if lang == 'hi': await a.act('lang')
                r = await a.js(CHECK); problems += [f'{w} {lang} setup1: {x}' for x in r['bad']]
                await a.focus('oname'); await a.type('Sarada Textiles'); await a.act('n1'); r = await a.js(CHECK); problems += [f'{w} {lang} setup2: {x}' for x in r['bad']]
                await a.type('135790'); await a.type('135790'); await a.act('n2'); await a.p.wait_for_selector('[data-f="oparty"]', timeout=20000)
                r = await a.js(CHECK); problems += [f'{w} {lang} setup3: {x}' for x in r['bad']]; await a.act('skip')
                await a.js(f"NK.store.importAll({rec})"); sizes = set()
                for s in SCREENS:
                    await a.go(s); await asyncio.sleep(0.05); r = await a.js(CHECK); problems += [f'{w} {lang} {s}: {x}' for x in r['bad']]; sizes |= set(r['sizes']); n += 1
                    await a.p.screenshot(path=f'shots/{s}-{w}-{lang}.png')
                    f = await a.js("(()=>{const f=document.querySelector('main [data-f], #dock [data-f]');return f?f.dataset.f:null})()")
                    if f:
                        await a.focus(f); r = await a.js(CHECK); problems += [f'{w} {lang} {s}+keypad: {x}' for x in r['bad']]; n += 1; await a.p.screenshot(path=f'shots/{s}-kp-{w}-{lang}.png'); await a.js("NK.kp.blur()")
                # sheets, date wheel, lock screen
                await a.go('parties'); await a.act('edit'); r = await a.js(CHECK); problems += [f'{w} {lang} party sheet: {x}' for x in r['bad']]; await a.focus('pname'); r = await a.js(CHECK); problems += [f'{w} {lang} party sheet+kp: {x}' for x in r['bad']]; await a.p.screenshot(path=f'shots/partysheet-{w}-{lang}.png'); await a.js("NK.ui.closeSheet()")
                await a.go('items'); await a.act('edit'); r = await a.js(CHECK); problems += [f'{w} {lang} item sheet: {x}' for x in r['bad']]; await a.js("NK.ui.closeSheet()")
                await a.js("NK.billShare(NK.store.bills()[0].id)"); r = await a.js(CHECK); problems += [f'{w} {lang} share sheet: {x}' for x in r['bad']]; await a.p.screenshot(path=f'shots/share-{w}-{lang}.png'); await a.js("NK.ui.closeSheet()")
                await a.go('ledger'); await a.act('date'); r = await a.js(CHECK); problems += [f'{w} {lang} wheel: {x}' for x in r['bad']]; await a.p.screenshot(path=f'shots/wheel-{w}-{lang}.png'); await a.js("NK.ui.closeWheel()")
                await a.act('lock'); await a.p.wait_for_selector('body.locked'); await asyncio.sleep(0.9); r = await a.js(CHECK); problems += [f'{w} {lang} lock: {x}' for x in r['bad']]; await a.p.screenshot(path=f'shots/lock-{w}-{lang}.png'); n += 6
                await a.p.locator('#lforgot').click(); r = await a.js(CHECK); problems += [f'{w} {lang} forgot: {x}' for x in r['bad']]
                miss = await a.js("JSON.stringify(NK.missing||{})"); assert miss == '{}', miss; assert not a.errors, a.errors
                print(f'  {w}px {lang}: text sizes used {sorted(sizes)}')
        # dark mode + tablet
        a = await newapp(b, w=800, h=1000, name='tablet'); await a.setup(); await a.js(f"NK.store.importAll({rec})"); await a.js("NK.app.setTheme('dark')")
        for s in SCREENS: await a.go(s); r = await a.js(CHECK); problems += [f'tablet dark {s}: {x}' for x in r['bad']]
        await a.go('ledger'); await a.p.screenshot(path='shots/ledger-tablet-dark.png')
        print('\n'.join(sorted(set(problems))) or f'PASS layout: {n} screen states at 320/360/390 px in English and Hindi + tablet dark: nothing wider than the screen, no missing words, every button 44px or taller')
        # laptop keyboard
        d = await newapp(b, w=1200, h=800, name='laptop', q='', touch=False); kb = d.p.keyboard
        await kb.type('Sarada Textiles'); await kb.press('Enter'); await kb.type('135790'); await kb.type('135790'); await kb.press('Enter'); await d.p.wait_for_selector('[data-f="oparty"]', timeout=20000); await kb.type('Ramesh Traders'); await kb.press('Enter')
        await d.p.wait_for_selector('[data-f="item:0"].on'); assert await d.p.locator('#kp').is_hidden()
        await kb.type('Red Dye'); await kb.press('Tab'); await kb.type('2'); await kb.press('Enter'); await kb.type('450'); await kb.press('Enter'); assert await d.js("NK.kp.key") == 'item:1'
        await d.act('save'); await kb.press('Escape'); assert await d.p.locator('#sheets .sheet').count() == 0
        await d.go('ledger'); assert await d.js("NK.kp.key") == 'lamt'; await kb.type('500'); await kb.press('p'); await kb.type('75'); await kb.press('Enter'); await kb.type('Freight'); await kb.press('Enter'); await kb.press('b')
        e = json.loads(await d.js("JSON.stringify(NK.store.entries().map(e=>[e.d.kind,e.d.amt,e.d.note]).sort())")); assert e == [['bill', 75, 'Freight'], ['paid', 500, '']], e
        await d.p.locator('[data-a="savePaid"]').hover(); await kb.press('Escape'); assert await d.js("NK.kp.key") is None
        print('PASS laptop: real keyboard types into boxes, Enter/Tab = next box, P = Paid, B = Bill, Esc = close; on-screen keypad hidden'); assert not d.errors, d.errors
        await b.close(); print('UI TESTS DONE')
os.makedirs('shots', exist_ok=True); asyncio.run(main())
