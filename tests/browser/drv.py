# Test driver: opens the app in headless Chrome and taps the app's own keypad like a person would.
import asyncio, json, sys
from playwright.async_api import async_playwright
BASE = 'http://127.0.0.1:8123/index.html'

class App:
    def __init__(self, page, name='dev'):
        self.p = page; self.name = name; self.errors = []
        page.on('console', lambda m: self.errors.append(m.text) if m.type == 'error' else None)
        page.on('pageerror', lambda e: self.errors.append('PAGEERR ' + str(e)))
    async def open(self, q='?touch=1'):
        await self.p.goto(BASE + q); await self.p.wait_for_selector('body.ready')
    async def key(self, k, ch=None):
        sel = f'#kp .k[data-k="{k}"]' + (f'[data-ch="{ch}"]' if ch is not None else '')
        await self.p.locator(sel).first.dispatch_event('pointerdown')
        if k == 'bksp': await self.p.dispatch_event('body', 'pointerup')
    async def type(self, s):
        for c in s:
            if c == ' ': await self.key('space'); continue
            loc = self.p.locator(f'#kp .k[data-ch="{c}"]')
            if await loc.count() == 0:
                if c.isalpha():
                    alt = c.lower() if c.isupper() else c.upper()
                    if await self.p.locator(f'#kp .k[data-ch="{alt}"]').count(): await self.key('shift')
                    else: await self.key('sym'); 
                else: await self.key('sym')
                loc = self.p.locator(f'#kp .k[data-ch="{c}"]')
                if await loc.count() == 0 and c.isalpha(): await self.key('shift'); loc = self.p.locator(f'#kp .k[data-ch="{c}"]')
            assert await loc.count(), f'no key for {c!r}'
            await loc.first.dispatch_event('pointerdown')
    async def focus(self, f): await self.p.locator(f'[data-f="{f}"]').first.click()
    async def act(self, a, nth=0): await self.p.locator(f'[data-a="{a}"]').nth(nth).click()
    async def nxt(self): await self.key('next')
    async def pin(self, pin):
        for c in pin: await self.p.locator(f'#lpad button[data-k="{c}"]').dispatch_event('pointerdown')
    async def setup(self, biz='Sarada Textiles', pin='135790', party=None):
        await self.focus('oname'); await self.type(biz); await self.act('n1')
        await self.type(pin); await self.type(pin); await self.act('n2')
        await self.p.wait_for_selector('[data-f="oparty"]', timeout=20000)
        if party: await self.type(party); await self.act('n3')
        else: await self.act('skip')
        await self.p.wait_for_selector('[data-f="party"]')
    async def unlock(self, pin='135790'):
        await self.pin(pin); await self.p.wait_for_selector('body:not(.locked) [data-f="party"]', timeout=20000)
    async def bill(self, party, rows, transport=None, pick=False):
        await self.js("NK.ui.go('bill',{fresh:true})"); await self.focus('party'); await self.type(party); await self.nxt()
        for (item, rate, qty) in rows:
            await self.type(item); await self.nxt(); await self.type(str(qty)); await self.nxt(); await self.type(str(rate)); await self.nxt()
        if transport: await self.focus('transport'); await self.type(str(transport))
        await self.act('save'); await self.p.wait_for_selector('#sheets .sheet'); await self.act('closeSheet', 1)
    async def entry(self, party, amt, kind='paid', note=None):
        await self.js("NK.ui.go('ledger')"); await self.focus('lparty')
        cur = await self.js("document.querySelector('[data-f=lparty] .v')?.textContent||''")
        for _ in cur: await self.key('bksp')
        await self.type(party); await self.focus('lamt'); await self.type(str(amt))
        if note: await self.p.locator(f'[data-a="quick"][data-q="{note}"]').click()
        await self.key(kind)
    async def js(self, expr): return await self.p.evaluate(expr)
    async def go(self, name): await self.js(f"NK.ui.go('{name}')")

async def launch(pw): return await pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
async def newapp(browser, w=360, h=740, name='dev', q='?touch=1', touch=True, offline=False):
    ctx = await browser.new_context(viewport={'width': w, 'height': h}, has_touch=touch, service_workers='block')
    page = await ctx.new_page(); a = App(page, name); a.ctx = ctx; await a.open(q); return a
