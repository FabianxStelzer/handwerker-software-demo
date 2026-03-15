// Zentrale Exports für das Offline-Modul

export { getDB, getCachedData, setCachedData, clearCachedData } from "./db";
export { addToSyncQueue, getAllSyncEntries, removeSyncEntry, clearSyncQueue, getSyncQueueCount } from "./db";
export type { SyncQueueEntry, CachedDataEntry } from "./db";

export { offlineFetch } from "./apiWrapper";

export { initSyncService, processSyncQueue, onSyncStatusChange, getSyncStatus } from "./syncService";
export type { SyncStatus } from "./syncService";

export { registerServiceWorker } from "./swRegister";

export { OfflineBanner } from "./OfflineBanner";
