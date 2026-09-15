import type { Incident, Disruption } from '@/types';

const DB_NAME = 'ner-logix-db';
const STORE_NAME = 'incidents';
const STORE_DISRUPTIONS = 'disruptions';
const STORE_TRIP_MANIFESTS = 'trip_manifests';
const DB_VERSION = 3;

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
      if (!db.objectStoreNames.contains(STORE_TRIP_MANIFESTS)) {
        db.createObjectStore(STORE_TRIP_MANIFESTS, { keyPath: 'vehicleId' });
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
    const tx = db.transaction([STORE_NAME, STORE_DISRUPTIONS, STORE_TRIP_MANIFESTS], 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    tx.objectStore(STORE_DISRUPTIONS).clear();
    tx.objectStore(STORE_TRIP_MANIFESTS).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function saveTripManifest(manifest: { vehicleId: string; [key: string]: any }): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TRIP_MANIFESTS, 'readwrite');
    const store = tx.objectStore(STORE_TRIP_MANIFESTS);
    const request = store.put(manifest);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getTripManifest(vehicleId: string): Promise<any | null> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TRIP_MANIFESTS, 'readonly');
    const store = tx.objectStore(STORE_TRIP_MANIFESTS);
    const request = store.get(vehicleId);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}


