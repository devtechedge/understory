import { parseSeedPacket } from '../sim/serialization';
import type { World } from '../sim/types';

const DB_NAME = 'understory';
const STORE = 'world';
const KEY = 'latest';
const LS_KEY = 'understory.world.v1';

interface StoredPayload {
  app: 'understory';
  version: 1;
  savedAt: number;
  world: World;
}

export interface LoadedWorld {
  world: World;
  savedAt: number;
}

export type SaveResult = 'ok' | 'unavailable';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB failed'));
    request.onblocked = () => reject(new Error('IndexedDB blocked'));
  });
}

async function idbRead(): Promise<StoredPayload | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const request = tx.objectStore(STORE).get(KEY);
    request.onsuccess = () => {
      resolve((request.result as StoredPayload | undefined) ?? null);
      db.close();
    };
    request.onerror = () => {
      reject(request.error ?? new Error('IndexedDB read failed'));
      db.close();
    };
  });
}

async function idbWrite(payload: StoredPayload): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(payload, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB write failed'));
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB write aborted'));
  });
  db.close();
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('Storage timed out')), ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function readLocal(): StoredPayload | null {
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredPayload;
    return parsed;
  } catch {
    return null;
  }
}

export async function loadSavedWorld(): Promise<LoadedWorld | null> {
  const candidates: { world: World; savedAt: number }[] = [];

  try {
    const stored = await withTimeout(idbRead(), 4000);
    if (stored && typeof stored.savedAt === 'number') {
      const world = parseSeedPacket(JSON.stringify(stored), Date.now());
      candidates.push({ world, savedAt: stored.savedAt });
    }
  } catch {
    /* fall through to localStorage */
  }

  const local = readLocal();
  if (local && typeof local.savedAt === 'number') {
    try {
      const world = parseSeedPacket(JSON.stringify(local), Date.now());
      candidates.push({ world, savedAt: local.savedAt });
    } catch {
      /* ignore a corrupt mirror */
    }
  }

  candidates.sort((a, b) => b.savedAt - a.savedAt);
  return candidates[0] ?? null;
}

export async function saveWorld(world: World): Promise<SaveResult> {
  const payload: StoredPayload = {
    app: 'understory',
    version: 1,
    savedAt: Date.now(),
    world,
  };

  try {
    await withTimeout(idbWrite(payload), 4000);
    return 'ok';
  } catch {
    try {
      window.localStorage.setItem(LS_KEY, JSON.stringify(payload));
      return 'ok';
    } catch {
      return 'unavailable';
    }
  }
}
