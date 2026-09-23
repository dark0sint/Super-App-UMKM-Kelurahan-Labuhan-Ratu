const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Publik: dilihat pembeli lewat link yang dibagikan ke WhatsApp/medsos, tidak perlu login
// GET /api/catalog/public/:username
router.get('/public/:username', (req, res) => {
  const seller = db.prepare('SELECT id, name, business_name, username, wa_number FROM users WHERE username = ?').get(req.params.username);
  if (!seller) return res.status(404).json({ ok: false, error: 'Toko tidak ditemukan.' });
  const products = db.prepare('SELECT id, name, category, price, unit, image_url, stock FROM products WHERE user_id = ? AND is_published = 1 ORDER BY name ASC').all(seller.id);
  res.json({ ok: true, seller, products });
});

// Privat: pemilik UMKM mengatur produk mana yang tampil di katalog publik
router.get('/my-link', requireAuth, (req, res) => {
  res.json({ ok: true, username: req.user.username, link: `/toko.html?u=${req.user.username}` });
});

router.put('/publish/:productId', requireAuth, (req, res) => {
  const { is_published } = req.body || {};
  const info = db.prepare('UPDATE products SET is_published = ?, updated_at = ? WHERE id = ? AND user_id = ?')
    .run(is_published ? 1 : 0, Date.now(), req.params.productId, req.user.id);
  if (info.changes === 0) return res.status(404).json({ ok: false, error: 'Produk tidak ditemukan.' });
  res.json({ ok: true });
});

module.exports = router;
