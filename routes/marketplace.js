const express = require('express');
const db = require('../db');

const router = express.Router();

// Publik, tidak perlu login: menampilkan seluruh produk unggulan UMKM se-Kelurahan Labuhan Ratu
router.get('/products', (req, res) => {
  const { q, category } = req.query;
  let sql = `SELECT p.id, p.name, p.category, p.price, p.unit, p.image_url, p.stock,
                    u.name as seller_name, u.business_name, u.username
             FROM products p JOIN users u ON u.id = p.user_id
             WHERE p.is_published = 1`;
  const params = [];
  if (q) { sql += ' AND p.name LIKE ?'; params.push(`%${q}%`); }
  if (category) { sql += ' AND p.category = ?'; params.push(category); }
  sql += ' ORDER BY p.updated_at DESC LIMIT 200';
  const rows = db.prepare(sql).all(...params);
  res.json({ ok: true, products: rows });
});

router.get('/categories', (req, res) => {
  const rows = db.prepare(`SELECT DISTINCT category FROM products WHERE is_published = 1 AND category IS NOT NULL AND category != ''`).all();
  res.json({ ok: true, categories: rows.map(r => r.category) });
});

router.get('/sellers', (req, res) => {
  const rows = db.prepare(`SELECT u.username, u.name, u.business_name, COUNT(p.id) as jumlah_produk
    FROM users u JOIN products p ON p.user_id = u.id AND p.is_published = 1
    GROUP BY u.id HAVING jumlah_produk > 0 ORDER BY u.business_name ASC`).all();
  res.json({ ok: true, sellers: rows });
});

module.exports = router;
