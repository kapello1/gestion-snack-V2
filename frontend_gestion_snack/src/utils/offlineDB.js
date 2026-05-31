const DB_NAME = 'snack_offline_db';
const DB_VERSION = 1;
const STORE = 'pendingOrders';

let dbPromise = null;

function getDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(STORE, { autoIncrement: true, keyPath: 'tempId' });
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => { dbPromise = null; reject(e.target.error); };
  });
  return dbPromise;
}

export async function addPendingOrder(order) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const { tempId: _ignored, ...data } = order;
    const req = tx.objectStore(STORE).add(data);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getPendingOrders() {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function deletePendingOrder(tempId) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).delete(tempId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
