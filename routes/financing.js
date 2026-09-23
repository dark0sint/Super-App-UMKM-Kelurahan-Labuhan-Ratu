const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.post('/', (req, res) => {
  const { amount, tenor_bulan, purpose } = req.body || {};
  if (!amount || Number(amount) <= 0) return res.status(400).json({ ok: false, error: 'Nominal pengajuan harus lebih dari 0.' });
  const now = Date.now();
  const info = db.prepare(`INSERT INTO financing_requests (user_id, amount, tenor_bulan, purpose, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'diajukan', ?, ?)`).run(req.user.id, Number(amount), Number(tenor_bulan) || 6, purpose || null, now, now);
  res.json({ ok: true, id: info.lastInsertRowid, message: 'Pengajuan modal usaha terkirim ke BUMDes/LPD Labuhan Ratu, tunggu proses peninjauan.' });
});

router.get('/my-requests', (req, res) => {
  const rows = db.prepare('SELECT * FROM financing_requests WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  res.json({ ok: true, requests: rows });
});

// Panel admin BUMDes/Kelurahan untuk meninjau seluruh pengajuan
router.get('/admin/all', requireAdmin, (req, res) => {
  const rows = db.prepare(`SELECT f.*, u.name, u.business_name, u.wa_number FROM financing_requests f
    JOIN users u ON u.id = f.user_id ORDER BY f.created_at DESC`).all();
  res.json({ ok: true, requests: rows });
});

router.put('/admin/:id/status', requireAdmin, (req, res) => {
  const { status, admin_note } = req.body || {};
  const valid = ['diajukan', 'ditinjau', 'disetujui', 'ditolak', 'cair'];
  if (!valid.includes(status)) return res.status(400).json({ ok: false, error: 'Status tidak valid.' });
  db.prepare('UPDATE financing_requests SET status=?, admin_note=?, updated_at=? WHERE id=?').run(status, admin_note || null, Date.now(), req.params.id);
  res.json({ ok: true });
});

module.exports = router;
