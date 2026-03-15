// API-Wrapper: umhüllt fetch-Aufrufe für Offline-Fähigkeit
//
// GET:  Zuerst aus IndexedDB-Cache laden, dann im Hintergrund vom Server aktualisieren
// POST/PUT/DELETE: Wenn offline → in syncQueue speichern statt Fehler zu werfen

import { getCachedData, setCachedData, addToSyncQueue } from "./db";

type FetchOptions = RequestInit & {
  // Kein Cache für diesen Request (z.B. Auth-Routen)
  skipOfflineCache?: boolean;
};

// Pfade, die niemals offline gecacht werden
const SKIP_CACHE_PATTERNS = [/\/api\/auth/, /\/api\/ki/];

function shouldSkipCache(url: string): boolean {
  return SKIP_CACHE_PATTERNS.some((p) => p.test(url));
}

// Cache-Key: URL ohne Origin, inklusive Query-Parameter
function getCacheKey(url: string): string {
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.pathname + parsed.search;
  } catch {
    return url;
  }
}

/**
 * Offline-fähiger Ersatz für fetch().
 * Drop-in-Replacement: gleiche Signatur wie window.fetch.
 */
export async function offlineFetch(
  input: string | URL | Request,
  init?: FetchOptions
): Promise<Response> {
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  const method = (init?.method ?? "GET").toUpperCase();
  const skipCache = init?.skipOfflineCache || shouldSkipCache(url);

  if (method === "GET") {
    return handleGet(url, init, skipCache);
  }
  return handleMutation(url, method as "POST" | "PUT" | "DELETE", init);
}

// --- GET: Cache-first, dann Server im Hintergrund ---

async function handleGet(
  url: string,
  init: FetchOptions | undefined,
  skipCache: boolean
): Promise<Response> {
  const cacheKey = getCacheKey(url);

  // Online → Server anfragen, Cache aktualisieren
  if (navigator.onLine) {
    try {
      const response = await fetch(url, init);
      if (response.ok && !skipCache) {
        const clone = response.clone();
        clone.json().then((data) => setCachedData(cacheKey, data)).catch(() => {});
      }
      return response;
    } catch {
      // Netzwerkfehler trotz onLine → aus Cache laden
    }
  }

  // Offline oder Netzwerkfehler → aus lokalem Cache
  if (!skipCache) {
    const cached = await getCachedData(cacheKey);
    if (cached !== null) {
      return new Response(JSON.stringify(cached), {
        status: 200,
        headers: { "Content-Type": "application/json", "X-From-Cache": "true" },
      });
    }
  }

  return new Response(JSON.stringify({ error: "Offline – keine gecachten Daten verfügbar" }), {
    status: 503,
    headers: { "Content-Type": "application/json" },
  });
}

// --- POST/PUT/DELETE: Online → normal senden, Offline → in Queue ---

async function handleMutation(
  url: string,
  method: "POST" | "PUT" | "DELETE",
  init: FetchOptions | undefined
): Promise<Response> {
  // Online → ganz normal an den Server senden
  if (navigator.onLine) {
    try {
      return await fetch(url, init);
    } catch {
      // Netzwerkfehler trotz onLine → in Queue
    }
  }

  // Offline → in die Sync-Queue schreiben
  const headers: Record<string, string> = {};
  if (init?.headers) {
    if (init.headers instanceof Headers) {
      init.headers.forEach((v, k) => { headers[k] = v; });
    } else if (Array.isArray(init.headers)) {
      init.headers.forEach(([k, v]) => { headers[k] = v; });
    } else {
      Object.assign(headers, init.headers);
    }
  }

  await addToSyncQueue({
    url: getCacheKey(url),
    method,
    headers,
    body: (init?.body as string) ?? "",
  });

  // Synthetische Erfolgs-Antwort, damit die UI nicht crasht
  return new Response(
    JSON.stringify({ _offline: true, message: "Wird synchronisiert, sobald wieder online" }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "X-Offline-Queued": "true",
      },
    }
  );
}
