// Service Worker Way Home — shell precache leve + fallback offline.
// Estratégias:
//  - navegação (HTML): network-first, cai para /offline.html
//  - assets versionados (/_build/, /assets/): cache-first (immutable)
//  - fontes/imagens estáticas: stale-while-revalidate
//  - tudo o resto (APIs, _serverFn, supabase): passthrough (sem cache)

const VERSION = "wh-v1";
const SHELL_CACHE = `${VERSION}-shell`;
const ASSET_CACHE = `${VERSION}-assets`;
const RUNTIME_CACHE = `${VERSION}-runtime`;
const OFFLINE_URL = "/offline.html";

const PRECACHE_URLS = [
  OFFLINE_URL,
  "/favicon.png",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((c) => c.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

function isApiRequest(url) {
  return (
    url.pathname.startsWith("/_serverFn") ||
    url.pathname.startsWith("/api/") ||
    url.hostname.includes("supabase.co")
  );
}

function isVersionedAsset(url) {
  return (
    url.pathname.startsWith("/_build/") ||
    url.pathname.startsWith("/assets/") ||
    /\.(?:js|css|woff2?|ttf|otf)$/i.test(url.pathname)
  );
}

function isStaticImage(url) {
  return /\.(?:png|jpg|jpeg|webp|avif|svg|gif|ico)$/i.test(url.pathname);
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin && !isStaticImage(url)) return;
  if (isApiRequest(url)) return;

  // Navegação HTML: network-first + fallback offline
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        return fresh;
      } catch {
        const cache = await caches.open(SHELL_CACHE);
        const offline = await cache.match(OFFLINE_URL);
        return offline ?? new Response("Offline", { status: 503 });
      }
    })());
    return;
  }

  // Assets versionados: cache-first
  if (isVersionedAsset(url)) {
    event.respondWith((async () => {
      const cache = await caches.open(ASSET_CACHE);
      const hit = await cache.match(req);
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      } catch {
        return hit ?? Response.error();
      }
    })());
    return;
  }

  // Imagens estáticas: stale-while-revalidate
  if (isStaticImage(url)) {
    event.respondWith((async () => {
      const cache = await caches.open(RUNTIME_CACHE);
      const hit = await cache.match(req);
      const fetchPromise = fetch(req).then((res) => {
        if (res.ok) cache.put(req, res.clone());
        return res;
      }).catch(() => hit);
      return hit ?? fetchPromise;
    })());
  }
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
