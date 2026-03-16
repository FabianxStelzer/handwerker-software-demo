"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "@/offline";

/**
 * Registriert den Service Worker beim App-Start (läuft auf allen Seiten).
 * Cached statische Assets und API-Antworten für Offline-Nutzung.
 */
export function OfflineInit() {
  useEffect(() => {
    registerServiceWorker().catch(() => {});
  }, []);
  return null;
}
