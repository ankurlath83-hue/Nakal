/* OFFLINE: keeps a copy of the app's own files so it opens with no internet.
   Only the app's files are cached here; your book is stored separately, encrypted. */
var V = 'nk-2.0.0';
var FILES = ['./', 'index.html', 'config.js', 'manifest.json', 'icon-192.png', 'icon-512.png', 'css/app.css',
  'js/core.js', 'js/i18n.js', 'js/calc.js', 'js/security.js', 'js/store.js', 'js/keypad.js', 'js/ui.js', 'js/sync.js', 'js/share.js',
  'js/bills.js', 'js/ledger.js', 'js/parties.js', 'js/catalogue.js', 'js/reports.js', 'js/more.js', 'js/app.js',
  'vendor/firebase-app-compat.js', 'vendor/firebase-auth-compat.js', 'vendor/firebase-firestore-compat.js'];
self.addEventListener('install', function (e) { e.waitUntil(caches.open(V).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== V; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
/* App files: answer from the saved copy at once, and refresh the copy in the background. */
self.addEventListener('fetch', function (e) {
  var u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(caches.open(V).then(function (c) {
    return c.match(e.request, { ignoreSearch: true }).then(function (hit) {
      var net = fetch(e.request).then(function (r) { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(function () { return hit; });
      return hit || net;
    });
  }));
});
