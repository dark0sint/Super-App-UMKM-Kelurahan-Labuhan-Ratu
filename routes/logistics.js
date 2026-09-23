const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// Estimasi ongkir kolektif sederhana (flat/berjenjang, jauh lebih murah krn digabung antar UMKM se-kelurahan)
function estimateOngkir(courierType) {
  return courierType === 'kurir_lokal' ? 8000 : 5000; // ojek desa lebih murah karena rute dalam kelurahan
}

router.post('/request', (req, res) => {
  const { sale_id, pickup_address, dropoff_address, recipient_name, recipient_phone, courier_type, notes } = req.body || {};
  if (!pickup_address || !dropoff_address) return res.status(400).json({ ok: false, error: 'Alamat jemput dan alamat tujuan wajib diisi.' });

  const ongkir = estimateOngkir(courier_type);
  const info = db.prepare(`INSERT INTO logistics_requests (user_id, sale_id, pickup_address, dropoff_address, recipient_name, recipient_phone, courier_type, status, ongkir, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'menunggu', ?, ?, ?)`)
    .run(req.user.id, sale_id || null, pickup_address, dropoff_address, recipient_name || null, recipient_phone || null, courier_type || 'ojek_desa', ongkir, notes || null, Date.now());

  res.json({ ok: true, id: info.lastInsertRowid, ongkir, message: 'Permintaan pengiriman terkirim ke pool ojek desa/kurir lokal Labuhan Ratu.' });
});

router.get('/my-requests', (req, res) => {
  const rows = db.prepare('SELECT * FROM logistics_requests WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  res.json({ ok: true, requests: rows });
});

router.put('/:id/status', (req, res) => {
  const { status } = req.body || {};
  const valid = ['menunggu', 'diambil', 'diantar', 'selesai', 'batal'];
  if (!valid.includes(status)) return res.status(400).json({ ok: false, error: 'Status tidak valid.' });
  const info = db.prepare('UPDATE logistics_requests SET status = ? WHERE id = ? AND user_id = ?').run(status, req.params.id, req.user.id);
  if (info.changes === 0) return res.status(404).json({ ok: false, error: 'Permintaan tidak ditemukan.' });
  res.json({ ok: true });
});

module.exports = router;
