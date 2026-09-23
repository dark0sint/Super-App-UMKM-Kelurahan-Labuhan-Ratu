const express = require('express');
const crypto = require('crypto');
const QRCode = require('qrcode');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

/**
 * CATATAN INTEGRASI PRODUKSI:
 * Endpoint ini disiapkan sebagai mock QRIS agar aplikasi bisa langsung dijalankan tanpa akun payment gateway.
 * Untuk transaksi nontunai NYATA yang masuk ke rekening bank/e-wallet pelaku UMKM, ganti isi generateQrString()
 * dan endpoint /webhook dengan integrasi resmi salah satu PJSP QRIS (mis. Nobu/Bank Lampung/Midtrans/Xendit),
 * lalu daftarkan setiap UMKM sebagai sub-merchant agar dana QRIS langsung diteruskan ke rekening/e-wallet masing-masing.
 */

function generateQrString(merchantId, amount, ref) {
  // Placeholder payload EMV-like agar tetap bisa di-scan aplikasi QR generik saat demo.
  return `00020101021126590014ID.CO.QRIS.WWW0215${merchantId}0303UMI520454995303360540${amount}5802ID5910${ref}6304ABCD`;
}

router.post('/generate', async (req, res) => {
  const { amount, sale_id } = req.body || {};
  if (!amount || Number(amount) <= 0) return res.status(400).json({ ok: false, error: 'Nominal QRIS harus lebih dari 0.' });

  const ref = crypto.randomBytes(6).toString('hex').toUpperCase();
  const qrString = generateQrString(process.env.QRIS_MERCHANT_ID || 'DEMO-MERCHANT', Math.round(Number(amount)), ref);
  const qrImage = await QRCode.toDataURL(qrString, { margin: 1, width: 300 });

  const info = db.prepare(`INSERT INTO qris_transactions (user_id, sale_id, amount, qr_string, qr_image, status, created_at)
    VALUES (?, ?, ?, ?, ?, 'pending', ?)`).run(req.user.id, sale_id || null, Number(amount), qrString, qrImage, Date.now());

  res.json({ ok: true, id: info.lastInsertRowid, qr_image: qrImage, amount: Number(amount), status: 'pending' });
});

router.get('/status/:id', (req, res) => {
  const trx = db.prepare('SELECT * FROM qris_transactions WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!trx) return res.status(404).json({ ok: false, error: 'Transaksi QRIS tidak ditemukan.' });
  res.json({ ok: true, transaction: trx });
});

// Simulasi konfirmasi pembayaran masuk (di produksi, ini dipanggil oleh webhook resmi dari PJSP QRIS)
router.post('/simulate-paid/:id', (req, res) => {
  const trx = db.prepare('SELECT * FROM qris_transactions WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!trx) return res.status(404).json({ ok: false, error: 'Transaksi QRIS tidak ditemukan.' });
  if (trx.status === 'paid') return res.json({ ok: true, message: 'Sudah lunas sebelumnya.' });

  db.prepare(`UPDATE qris_transactions SET status='paid', paid_at=? WHERE id=?`).run(Date.now(), trx.id);
  db.prepare(`INSERT INTO finance_transactions (user_id, type, category, amount, description, trans_date, source, ref_id, created_at)
    VALUES (?, 'income', 'Pembayaran QRIS', ?, ?, ?, 'qris', ?, ?)`)
    .run(req.user.id, trx.amount, `Pembayaran QRIS diterima`, new Date().toISOString().slice(0, 10), trx.id, Date.now());

  res.json({ ok: true, message: 'Pembayaran QRIS diterima dan otomatis tercatat di pembukuan.' });
});

module.exports = router;
