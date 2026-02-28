// Purpose: Tiny IndexedDB wrapper for NoteDoc records.
// Contract: Each method returns a Promise and never mutates caller-owned objects.
// Verify: Add and retrieve a document via saveDoc() and listRecentDocs().

const DB_NAME = "fp_notes_showcase_db";
const DB_VERSION = 1;
const STORE_NAME = "docs";

let dbPromise;

function getDb() {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt");
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

async function withStore(mode, operation) {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const result = operation(store);

    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function saveDoc(doc) {
  await withStore("readwrite", (store) => {
    store.put(doc);
  });
}

export async function deleteDoc(id) {
  await withStore("readwrite", (store) => {
    store.delete(id);
  });
}

export async function getDoc(id) {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function listAllDocs() {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function listRecentDocs(limit = 10) {
  const all = await listAllDocs();
  return all.sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
}
