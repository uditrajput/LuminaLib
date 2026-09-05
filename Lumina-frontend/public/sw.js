// Minimal PWA SW — caches static assets + pdf files, offline fallback
const CACHE = "luminalib-v4";
const ASSETS = ["/", "/dashboard", "/books", "/quizzes", "/manifest.json"];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  // cache-first for pdfs and api GET
  if (e.request.method === "GET" && (url.pathname.includes("/covers") || url.pathname.includes("/avatars") || url.pathname.includes("/books/") && url.pathname.includes("/file"))) {
    e.respondWith(caches.open(CACHE).then(async cache => {
      const cached = await cache.match(e.request);
      if (cached) return cached;
      const res = await fetch(e.request);
      if (res.ok) cache.put(e.request, res.clone());
      return res;
    }).catch(() => caches.match(e.request)));
    return;
  }
  // network-first for api/json
  if (url.pathname.startsWith("/api/")) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }
});
