// ─── MBX Réparations — Service Worker v3 ─────────────────────────────────────
const CACHE_VERSION = "mbx-v3";
const STATIC_CACHE  = `${CACHE_VERSION}-static`;
const PAGES_CACHE   = `${CACHE_VERSION}-pages`;

// Ressources mises en cache immédiatement à l'installation
// ⚠️ Ne pas précacher les routes protégées (dashboard, repairs, clients)
// — elles nécessitent une auth et renvoient un redirect si non connecté
const PRECACHE_URLS = [
  "/login",
  "/offline",
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
];

// Une réponse est-elle saine à mettre en cache ?
// — ok (200-299) et SURTOUT non redirigée : une réponse redirected servie
//   à une navigation throw dans le navigateur → écran noir.
function isCacheable(res) {
  return res && res.ok && !res.redirected && res.type !== "opaqueredirect";
}

// ── Install : précache des ressources essentielles ────────────────────────────
// Chaque URL est mise en cache individuellement : une URL en échec ne doit pas
// faire échouer toute l'installation du SW (cache.addAll est atomique).
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      Promise.all(
        PRECACHE_URLS.map((u) =>
          fetch(u, { cache: "no-cache" })
            .then((res) => (isCacheable(res) ? cache.put(u, res) : null))
            .catch(() => null)
        )
      )
    )
  );
  self.skipWaiting();
});

// ── Activate : supprime les anciens caches (purge les caches empoisonnés) ──────
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith("mbx-") && k !== STATIC_CACHE && k !== PAGES_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch : stratégies de cache ───────────────────────────────────────────────
self.addEventListener("fetch", (e) => {
  const { request } = e;

  // On ne gère que les GET (cache.put rejette les autres méthodes).
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // 1. Requêtes Supabase / API → Network Only (pas de cache)
  if (
    url.hostname.includes("supabase.co") ||
    url.pathname.startsWith("/api/")
  ) {
    return;
  }

  // 2. Assets statiques (images, fonts, icônes) → Cache First
  if (
    request.destination === "image" ||
    request.destination === "font" ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|ico|woff2?|ttf)$/)
  ) {
    e.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            if (isCacheable(res)) {
              const clone = res.clone();
              caches.open(STATIC_CACHE).then((c) => c.put(request, clone));
            }
            return res;
          })
      )
    );
    return;
  }

  // 3. Navigation (pages HTML) → Network First avec fallback cache puis offline
  if (request.mode === "navigate") {
    e.respondWith(
      fetch(request)
        .then((res) => {
          // Ne JAMAIS cacher une réponse redirigée (auth → /login) :
          // la resservir à une navigation provoque un écran noir.
          if (isCacheable(res)) {
            const clone = res.clone();
            caches.open(PAGES_CACHE).then((c) => c.put(request, clone));
          }
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          // Garde-fou : ignorer un éventuel cache redirigé hérité d'un ancien SW.
          if (cached && !cached.redirected) return cached;
          return caches.match("/offline");
        })
    );
    return;
  }

  // 4. JS/CSS Next.js → Stale While Revalidate
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.match(/\.(js|css)$/)
  ) {
    e.respondWith(
      caches.open(STATIC_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          const fetchPromise = fetch(request)
            .then((res) => {
              if (isCacheable(res)) cache.put(request, res.clone());
              return res;
            })
            .catch(() => cached);
          return cached || fetchPromise;
        })
      )
    );
    return;
  }
});

// ── Push Notifications ────────────────────────────────────────────────────────
self.addEventListener("push", (e) => {
  if (!e.data) return;
  const data = e.data.json();
  e.waitUntil(
    self.registration.showNotification(data.title || "MBX Réparations", {
      body: data.body || "",
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-192x192.png",
      tag: data.tag || "mbx-notif",
      data: { url: data.url || "/dashboard" },
    })
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = e.notification.data?.url || "/dashboard";
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const existing = list.find((c) => c.url.includes(url));
      if (existing) return existing.focus();
      return clients.openWindow(url);
    })
  );
});
