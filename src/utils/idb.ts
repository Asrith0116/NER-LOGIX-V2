import type { Incident, Disruption } from '@/types';

const DB_NAME = 'ner-logix-db';
const STORE_NAME = 'incidents';
const STORE_DISRUPTIONS = 'disruptions';
const DB_VERSION = 2;

export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_DISRUPTIONS)) {
        db.createObjectStore(STORE_DISRUPTIONS, { keyPath: 'id' });
      }
    };

    request.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveIncident(incident: Incident): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(incident);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getPendingIncidents(): Promise<Incident[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const all: Incident[] = request.result;
      resolve(all.filter((i) => i.syncStatus === 'local_pending'));
    };
    request.onerror = () => reject(request.error);
  });
}
export async function getAllIncidents(): Promise<Incident[]> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result as Incident[]);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function updateIncidentSyncStatus(id: string, status: Incident['syncStatus']): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const incident = getReq.result as Incident;
      if (incident) {
        incident.syncStatus = status;
        store.put(incident).onsuccess = () => resolve();
      } else {
        resolve();
      }
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

export async function saveDisruption(disruption: Disruption): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DISRUPTIONS, 'readwrite');
    const store = tx.objectStore(STORE_DISRUPTIONS);
    const request = store.put(disruption);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getAllDisruptions(): Promise<Disruption[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DISRUPTIONS, 'readonly');
    const store = tx.objectStore(STORE_DISRUPTIONS);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve((request.result || []) as Disruption[]);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function clearAllStoredData(): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME, STORE_DISRUPTIONS], 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    tx.objectStore(STORE_DISRUPTIONS).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}


