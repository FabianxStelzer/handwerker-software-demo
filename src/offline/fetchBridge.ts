// Bridge: Original-Fetch für interne API-Wrapper-Aufrufe
// Verhindert Rekursion, wenn globales fetch durch offlineFetch ersetzt wird

let originalFetch: typeof fetch | null = null;

export function setOriginalFetch(f: typeof fetch | null) {
  originalFetch = f;
}

export function getOriginalFetch(): typeof fetch {
  if (typeof window !== "undefined" && originalFetch) {
    return originalFetch;
  }
  return fetch;
}
