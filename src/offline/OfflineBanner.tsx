"use client";

// Statusanzeige für Offline-Modus und Synchronisierung
// Zeigt einen dezenten Banner oben im Fenster:
// - Rot wenn offline
// - Grün wenn Sync erfolgreich

import { useEffect, useState } from "react";
import { initSyncService, onSyncStatusChange, type SyncStatus } from "./syncService";
import { registerServiceWorker } from "./swRegister";

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [pendingCount, setPendingCount] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setIsOnline(navigator.onLine);
      registerServiceWorker().catch(() => {});
      initSyncService();

      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      const unsubscribe = onSyncStatusChange((status, pending) => {
        setSyncStatus(status);
        setPendingCount(pending);
      });

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
        unsubscribe();
      };
    } catch (err) {
      console.warn("OfflineBanner Init:", err);
    }
  }, []);

  // Banner-Sichtbarkeit steuern
  useEffect(() => {
    if (!isOnline || syncStatus === "syncing" || syncStatus === "success") {
      setVisible(true);
    } else {
      // Nach "success" den Banner kurz anzeigen, dann ausblenden
      const timer = setTimeout(() => setVisible(false), 3500);
      return () => clearTimeout(timer);
    }
  }, [isOnline, syncStatus]);

  if (!visible) return null;

  // Offline-Banner (rot)
  if (!isOnline) {
    return (
      <div
        role="alert"
        className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-md transition-all duration-300"
      >
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-white" />
        Offline – Änderungen werden gespeichert und später synchronisiert
        {pendingCount > 0 && (
          <span className="ml-1 rounded-full bg-red-800 px-2 py-0.5 text-xs">
            {pendingCount} ausstehend
          </span>
        )}
      </div>
    );
  }

  // Sync läuft (gelb)
  if (syncStatus === "syncing") {
    return (
      <div
        role="status"
        className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-sm font-medium text-white shadow-md transition-all duration-300"
      >
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Synchronisiere {pendingCount} Änderung{pendingCount !== 1 ? "en" : ""}…
      </div>
    );
  }

  // Sync erfolgreich (grün)
  if (syncStatus === "success") {
    return (
      <div
        role="status"
        className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-md transition-all duration-300"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        Synchronisierung abgeschlossen
      </div>
    );
  }

  return null;
}
