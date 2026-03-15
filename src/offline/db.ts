// Lokale IndexedDB für Offline-Daten und Sync-Queue
// Nutzt die `idb` Library für typsichere IndexedDB-Zugriffe

import { openDB, type DBSchema, type IDBPDatabase } from "idb";

// Eintrag in der Sync-Queue (wird bei POST/PUT offline gespeichert)
export interface SyncQueueEntry {
  id: string;
  url: string;
  method: "POST" | "PUT" | "DELETE";
  headers: Record<string, string>;
  body: string;
  createdAt: number;
}

// Gecachter API-Response
export interface CachedDataEntry {
  url: string;
  data: unknown;
  updatedAt: number;
}

interface OfflineDB extends DBSchema {
  cachedData: {
    key: string;
    value: CachedDataEntry;
    indexes: { "by-updatedAt": number };
  };
  syncQueue: {
    key: string;
    value: SyncQueueEntry;
    indexes: { "by-createdAt": number };
  };
}

const DB_NAME = "handwerker-offline";
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<OfflineDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<OfflineDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<OfflineDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("cachedData")) {
        const cachedStore = db.createObjectStore("cachedData", {
          keyPath: "url",
        });
        cachedStore.createIndex("by-updatedAt", "updatedAt");
      }

      if (!db.objectStoreNames.contains("syncQueue")) {
        const syncStore = db.createObjectStore("syncQueue", {
          keyPath: "id",
        });
        syncStore.createIndex("by-createdAt", "createdAt");
      }
    },
  });

  return dbInstance;
}

// --- cachedData Operationen ---

export async function getCachedData(url: string): Promise<unknown | null> {
  const db = await getDB();
  const entry = await db.get("cachedData", url);
  return entry?.data ?? null;
}

export async function setCachedData(url: string, data: unknown): Promise<void> {
  const db = await getDB();
  await db.put("cachedData", { url, data, updatedAt: Date.now() });
}

export async function clearCachedData(): Promise<void> {
  const db = await getDB();
  await db.clear("cachedData");
}

// --- syncQueue Operationen ---

export async function addToSyncQueue(
  entry: Omit<SyncQueueEntry, "id" | "createdAt">
): Promise<void> {
  const db = await getDB();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  await db.put("syncQueue", { ...entry, id, createdAt: Date.now() });
}

export async function getAllSyncEntries(): Promise<SyncQueueEntry[]> {
  const db = await getDB();
  return db.getAllFromIndex("syncQueue", "by-createdAt");
}

export async function removeSyncEntry(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("syncQueue", id);
}

export async function clearSyncQueue(): Promise<void> {
  const db = await getDB();
  await db.clear("syncQueue");
}

export async function getSyncQueueCount(): Promise<number> {
  const db = await getDB();
  return db.count("syncQueue");
}
