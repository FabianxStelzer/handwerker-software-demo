"use client";

import { useEffect } from "react";
import { offlineFetch } from "@/offline";
import { setOriginalFetch } from "@/offline/fetchBridge";

/**
 * Ersetzt globales fetch durch offlineFetch für /api/* Routen (außer auth, ki).
 * Ermöglicht Offline-Speicherung und Sync bei Wiederverbindung.
 */
export function OfflineFetchProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const originalFetch = window.fetch;
    setOriginalFetch(originalFetch);
    window.fetch = function (
      input: RequestInfo | URL,
      init?: RequestInit
    ): Promise<Response> {
      const url = typeof input === "string"
        ? input
        : input instanceof Request
          ? input.url
          : input.toString();

      // Nur same-origin API-Routen durch offlineFetch leiten
      const isSameOrigin = url.startsWith("/") || url.startsWith(window.location.origin);
      const isApi = url.includes("/api/");
      const skipOffline = url.includes("/api/auth/") || url.includes("/api/ki/");

      if (isSameOrigin && isApi && !skipOffline) {
        const fullUrl = url.startsWith("/") ? window.location.origin + url : url;
        return offlineFetch(fullUrl, { ...init, skipOfflineCache: skipOffline });
      }

      return originalFetch.call(window, input, init);
    };

    return () => {
      setOriginalFetch(null);
      window.fetch = originalFetch;
    };
  }, []);

  return <>{children}</>;
}
