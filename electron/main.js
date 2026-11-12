/* WINDOWS APP: a small window that runs the same app files that the website uses.
   The files are served from inside the app (app://nakal/), so it works with no internet. */
const { app, BrowserWindow, protocol, net, shell } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);
const ROOT = path.join(__dirname, 'www');

function createWindow() {
  const win = new BrowserWindow({
    width: 480, height: 860, minWidth: 340, minHeight: 560, autoHideMenuBar: true, backgroundColor: '#fbf6e6', title: 'Nakal',
    icon: path.join(ROOT, 'icon-512.png'),
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  /* WhatsApp and other outside links open in the normal browser, never inside the app. */
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https:\/\//.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('app://nakal/')) e.preventDefault(); });
  win.loadURL('app://nakal/index.html');
}

app.whenReady().then(() => {
  protocol.handle('app', (req) => {
    const u = new URL(req.url);
    const file = path.normalize(path.join(ROOT, decodeURIComponent(u.pathname)));
    if (!file.startsWith(ROOT)) return new Response('no', { status: 403 });   // never serve files outside the app
    return net.fetch(pathToFileURL(file).toString());
  });
  createWindow();
});
app.on('window-all-closed', () => app.quit());
