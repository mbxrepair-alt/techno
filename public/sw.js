// ─── MBX Réparations — Service Worker v4 (minimal & sûr) ─────────────────────
// Objectif : permettre l'installation PWA + un fallback hors-ligne, SANS jamais
// mettre en cache le code de l'app (JS/CSS/pages). Les versions précédentes
// servaient du code périmé → écrans bloqués / écran noir. Ici, tout le code
// passe directement par le réseau : on ne peut plus servir une vieille version.
const CACHE_VERSION = "mbx-v4";
const STATIC_CACHE = `${CACHE_VERSION}-static`;

// On ne précache que le strict nécessaire au mode hors-ligne.
const PRECACHE_URLS = [
  "/offline",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      Promise.all(
        PRECACHE_URLS.map((u) =>
          fetch(u, { cache: "no-cache" })
            .then((res) => (res && res.ok ? cache.put(u, res) : null))
            .catch(() => null)
        )
      )
    )
  );
  self.skipWaiting();
});

// Purge TOUS les anciens caches MBX (v2, v3, etc.) au passage en v4.
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("mbx-") && k !== STATIC_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Icônes locales → Cache First (statiques, sans risque de périmer l'app).
  if (url.pathname.startsWith("/icons/")) {
    e.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
    return;
  }

  // Navigation (pages HTML) → réseau uniquement, fallback /offline si hors-ligne.
  // On NE met PAS les pages en cache : le code reste toujours frais.
  if (request.mode === "navigate") {
    e.respondWith(
      fetch(request).catch(() => caches.match("/offline"))
    );
    return;
  }

  // Tout le reste (JS, CSS, API, Supabase…) → passthrough réseau, pas de cache SW.
  // Le cache HTTP du navigateur gère déjà correctement les assets hashés Next.js.
});

// ── Push Notifications ────────────────────────────────────────────────────────
self.addEventListener("push", (e) => {
  if (!e.data) return;
  let data = {};
  try {
    data = e.data.json();
  } catch {
    data = { body: e.data.text() };
  }
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
