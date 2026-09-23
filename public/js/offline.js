/*
  Mode Offline: transaksi kasir & penyesuaian stok tetap bisa diinput tanpa sinyal internet.
  Data disimpan di IndexedDB perangkat, lalu otomatis disinkron ke server saat koneksi kembali.
*/
const OfflineSync = (() => {
  const DB_NAME = 'umkm_offline_db';
  const STORE = 'pending_sales';
  let dbPromise = null;

  function openDb(){
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)){
          db.createObjectStore(STORE, { keyPath: 'client_uuid' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  function uuid(){
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  async function queueSale(saleData){
    const db = await openDb();
    const record = { ...saleData, client_uuid: saleData.client_uuid || uuid(), queued_at: Date.now() };
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(record);
      tx.oncomplete = () => resolve(record);
      tx.onerror = () => reject(tx.error);
    });
  }

  async function getQueued(){
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async function removeQueued(clientUuid){
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(clientUuid);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function queueCount(){
    const all = await getQueued();
    return all.length;
  }

  // Coba kirim transaksi baru langsung; jika gagal (offline), simpan ke antrian lokal.
  async function submitSale(saleData){
    if (navigator.onLine){
      try {
        return { mode: 'online', result: await API.post('/api/pos/sale', saleData) };
      } catch (e){
        if (!e.network) throw e;
      }
    }
    const queued = await queueSale(saleData);
    return { mode: 'offline', queued };
  }

  async function syncAll(){
    if (!navigator.onLine) return { synced: 0 };
    const queued = await getQueued();
    if (queued.length === 0) return { synced: 0 };
    try {
      const resp = await API.post('/api/pos/sync', { sales: queued });
      for (const r of resp.results){
        if (r.ok) await removeQueued(r.client_uuid);
      }
      const okCount = resp.results.filter(r => r.ok).length;
      if (okCount > 0) toast(`${okCount} transaksi offline berhasil disinkron ke server.`);
      return { synced: okCount };
    } catch (e){
      console.warn('Sinkronisasi gagal, dicoba lagi nanti.', e);
      return { synced: 0, error: true };
    }
  }

  return { queueSale, getQueued, removeQueued, queueCount, submitSale, syncAll };
})();

// Coba sinkron begitu halaman dimuat (siapa tahu ada antrian tersisa)
document.addEventListener('DOMContentLoaded', () => {
  if (navigator.onLine) OfflineSync.syncAll();
});
