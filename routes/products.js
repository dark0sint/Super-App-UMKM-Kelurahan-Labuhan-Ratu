const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM products WHERE user_id = ? ORDER BY name ASC').all(req.user.id);
  res.json({ ok: true, products: rows });
});

router.get('/low-stock', (req, res) => {
  const rows = db.prepare('SELECT * FROM products WHERE user_id = ? AND stock <= min_stock ORDER BY stock ASC').all(req.user.id);
  res.json({
    ok: true,
    count: rows.length,
    products: rows,
    notifikasi: rows.map(p => `Stok "${p.name}" tersisa ${p.stock} ${p.unit}, sudah di bawah batas minimum (${p.min_stock} ${p.unit}). Segera restok.`)
  });
});

router.post('/', (req, res) => {
  const { name, category, price, cost, stock, min_stock, unit, image_url, is_published } = req.body || {};
  if (!name) return res.status(400).json({ ok: false, error: 'Nama produk wajib diisi.' });
  const now = Date.now();
  const info = db.prepare(`INSERT INTO products (user_id, name, category, price, cost, stock, min_stock, unit, image_url, is_published, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    req.user.id, name, category || null, Number(price) || 0, Number(cost) || 0, Number(stock) || 0, Number(min_stock) || 0, unit || 'pcs', image_url || null, is_published ? 1 : 0, now, now
  );
  res.json({ ok: true, id: info.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM products WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!existing) return res.status(404).json({ ok: false, error: 'Produk tidak ditemukan.' });
  const { name, category, price, cost, stock, min_stock, unit, image_url, is_published } = req.body || {};
  db.prepare(`UPDATE products SET name=?, category=?, price=?, cost=?, stock=?, min_stock=?, unit=?, image_url=?, is_published=?, updated_at=? WHERE id = ?`)
    .run(
      name ?? existing.name, category ?? existing.category, price ?? existing.price, cost ?? existing.cost,
      stock ?? existing.stock, min_stock ?? existing.min_stock, unit ?? existing.unit, image_url ?? existing.image_url,
      is_published === undefined ? existing.is_published : (is_published ? 1 : 0), Date.now(), req.params.id
    );
  res.json({ ok: true });
});

// Penyesuaian stok cepat (mis. barang masuk / rusak / opname)
router.post('/:id/adjust-stock', (req, res) => {
  const existing = db.prepare('SELECT * FROM products WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!existing) return res.status(404).json({ ok: false, error: 'Produk tidak ditemukan.' });
  const { delta, reason } = req.body || {};
  const newStock = Math.max(0, existing.stock + Number(delta || 0));
  db.prepare('UPDATE products SET stock = ?, updated_at = ? WHERE id = ?').run(newStock, Date.now(), req.params.id);
  res.json({ ok: true, stock: newStock, catatan: reason || null, peringatan: newStock <= existing.min_stock ? `Stok "${existing.name}" sudah mencapai batas minimum.` : null });
});

router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM products WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  if (info.changes === 0) return res.status(404).json({ ok: false, error: 'Produk tidak ditemukan.' });
  res.json({ ok: true });
});

module.exports = router;
