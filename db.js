/* db.js — minimal IndexedDB wrapper. No external library so the app
 * keeps working fully offline once cached by the service worker. */
(function (global) {
  const DB_NAME = 'neberet-kefel';
  const DB_VERSION = 1;
  const STORES = ['assets', 'assetCounts', 'income', 'expenses', 'repairs', 'contributions', 'planItems', 'meta'];

  let dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        STORES.forEach((name) => {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name, { keyPath: 'id' });
          }
        });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  function uid() {
    return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
  }

  async function tx(store, mode) {
    const db = await open();
    return db.transaction(store, mode).objectStore(store);
  }

  async function put(store, record) {
    if (!record.id) record.id = uid();
    record.updatedAt = new Date().toISOString();
    const os = await tx(store, 'readwrite');
    return new Promise((resolve, reject) => {
      const req = os.put(record);
      req.onsuccess = () => resolve(record);
      req.onerror = () => reject(req.error);
    });
  }

  async function get(store, id) {
    const os = await tx(store, 'readonly');
    return new Promise((resolve, reject) => {
      const req = os.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async function getAll(store) {
    const os = await tx(store, 'readonly');
    return new Promise((resolve, reject) => {
      const req = os.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async function remove(store, id) {
    const os = await tx(store, 'readwrite');
    return new Promise((resolve, reject) => {
      const req = os.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  async function bulkPut(store, records) {
    const db = await open();
    const os = db.transaction(store, 'readwrite').objectStore(store);
    records.forEach((r) => {
      if (!r.id) r.id = uid();
      r.updatedAt = new Date().toISOString();
      os.put(r);
    });
  }

  async function count(store) {
    const os = await tx(store, 'readonly');
    return new Promise((resolve, reject) => {
      const req = os.count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  global.NKDB = { open, uid, put, get, getAll, remove, bulkPut, count, STORES };
})(window);
