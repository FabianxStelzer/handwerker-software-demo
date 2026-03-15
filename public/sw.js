// Service Worker für Handwerker-Software
// Cacht statische Assets und API-Responses für Offline-Nutzung

const CACHE_VERSION = "v1";
const STATIC_CACHE = `handwerker-static-${CACHE_VERSION}`;
const API_CACHE = `handwerker-api-${CACHE_VERSION}`;

const STATIC_ASSETS = ["/", "/login", "/manifest.json"];

// API-Pfade, die gecacht werden sollen
const CACHEABLE_API_PATTERNS = [
  /^\/api\/dashboard/,
  /^\/api\/kunden/,
  /^\/api\/projekte/,
  /^\/api\/auftraege/,
  /^\/api\/rechnungen/,
  /^\/api\/katalog/,
  /^\/api\/mitarbeiter/,
  /^\/api\/zeiterfassung/,
  /^\/api\/notifications/,
];

// Auth-Routen niemals cachen
const NEVER_CACHE = [/^\/api\/auth/, /^\/api\/ki/];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== API_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (event.request.method !== "GET") return;
  if (NEVER_CACHE.some((p) => p.test(url.pathname))) return;

  const isApiRequest = url.pathname.startsWith("/api/");

  if (isApiRequest && CACHEABLE_API_PATTERNS.some((p) => p.test(url.pathname))) {
    // Network-first für API: Server versuchen, bei Fehler aus Cache
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(API_CACHE).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first für statische Assets (HTML, JS, CSS, Bilder)
  if (
    !isApiRequest &&
    (event.request.destination === "document" ||
      event.request.destination === "script" ||
      event.request.destination === "style" ||
      event.request.destination === "image" ||
      event.request.destination === "font")
  ) {
    event.respondWith(
      caches.match(event.request).then(
        (cached) =>
          cached ||
          fetch(event.request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, clone));
            }
            return response;
          })
      )
    );
  }
});

// Nachricht vom Client: Cache leeren
self.addEventListener("message", (event) => {
  if (event.data === "CLEAR_CACHE") {
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
  }
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
