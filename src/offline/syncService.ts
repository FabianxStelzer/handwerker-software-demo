// Auto-Sync-Service: Sendet gespeicherte Offline-Änderungen an den Server
// sobald die Internetverbindung wiederhergestellt ist.
// Konflikte werden über updatedAt-Timestamps gelöst (Server gewinnt bei neuerem Timestamp).

import {
  getAllSyncEntries,
  removeSyncEntry,
  getSyncQueueCount,
  type SyncQueueEntry,
} from "./db";

export type SyncStatus = "idle" | "syncing" | "success" | "error";
type SyncListener = (status: SyncStatus, pending: number) => void;

let listeners: SyncListener[] = [];
let currentStatus: SyncStatus = "idle";
let initialized = false;

export function onSyncStatusChange(listener: SyncListener): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function notify(status: SyncStatus, pending: number) {
  currentStatus = status;
  listeners.forEach((l) => l(status, pending));
}

export function getSyncStatus(): SyncStatus {
  return currentStatus;
}

// Einzelnen Queue-Eintrag an den Server senden
async function processEntry(entry: SyncQueueEntry): Promise<boolean> {
  try {
    const response = await fetch(entry.url, {
      method: entry.method,
      headers: entry.headers,
      body: entry.body || undefined,
    });

    if (response.ok) {
      return true;
    }

    // 409 Conflict → Server-Version ist neuer, Eintrag verwerfen
    if (response.status === 409) {
      console.warn(`Sync-Konflikt für ${entry.url} – Server-Version wird beibehalten`);
      return true;
    }

    // 4xx Client-Fehler → Eintrag ist ungültig, trotzdem entfernen
    if (response.status >= 400 && response.status < 500) {
      console.warn(`Sync fehlgeschlagen (${response.status}) für ${entry.url} – Eintrag verworfen`);
      return true;
    }

    // 5xx Server-Fehler → später erneut versuchen
    return false;
  } catch {
    // Netzwerkfehler → später erneut versuchen
    return false;
  }
}

// Alle Einträge der Queue abarbeiten
export async function processSyncQueue(): Promise<void> {
  const entries = await getAllSyncEntries();
  if (entries.length === 0) return;

  notify("syncing", entries.length);

  let failed = 0;

  for (const entry of entries) {
    const success = await processEntry(entry);
    if (success) {
      await removeSyncEntry(entry.id);
    } else {
      failed++;
    }
  }

  const remaining = await getSyncQueueCount();

  if (failed === 0) {
    notify("success", 0);
    // Status nach 3 Sekunden zurücksetzen
    setTimeout(() => notify("idle", 0), 3000);
  } else {
    notify("error", remaining);
  }
}

// Online-Event-Listener starten
export function initSyncService(): void {
  if (typeof window === "undefined" || initialized) return;
  initialized = true;

  // Bei Verbindungsaufbau sofort synchronisieren
  window.addEventListener("online", () => {
    processSyncQueue();
  });

  // Periodischer Sync alle 30 Sekunden (falls online und Queue nicht leer)
  setInterval(async () => {
    if (!navigator.onLine) return;
    const count = await getSyncQueueCount();
    if (count > 0) {
      processSyncQueue();
    }
  }, 30_000);

  // Beim Start prüfen, ob noch Einträge in der Queue sind
  if (navigator.onLine) {
    processSyncQueue();
  }
}
