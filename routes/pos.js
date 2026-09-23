const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function nextReceiptNo(userId) {
  const today = new Date();
  const ymd = today.toISOString().slice(0, 10).replace(/-/g, '');
  const countToday = db.prepare(`SELECT COUNT(*) as c FROM pos_sales WHERE user_id = ? AND date(created_at/1000, 'unixepoch') = date('now')`).get(userId).c;
  return `LR${ymd}-${userId}-${String(countToday + 1).padStart(4, '0')}`;
}

// Membuat satu transaksi penjualan (dipakai baik online maupun saat sinkronisasi offline)
function createSale(userId, payload) {
  const { items, payment_method, customer_name, client_uuid, status, trans_date } = payload;
  if (!Array.isArray(items) || items.length === 0) throw { code: 400, msg: 'Item transaksi tidak boleh kosong.' };

  if (client_uuid) {
    const dup = db.prepare('SELECT * FROM pos_sales WHERE client_uuid = ?').get(client_uuid);
    if (dup) return { sale: dup, duplicate: true };
  }

  let total = 0;
  const resolvedItems = items.map(it => {
    let name = it.product_name, price = Number(it.price) || 0, productId = it.product_id || null;
    if (productId) {
      const p = db.prepare('SELECT * FROM products WHERE id = ? AND user_id = ?').get(productId, userId);
      if (p) { name = p.name; price = it.price != null ? Number(it.price) : p.price; }
    }
    const subtotal = price * Number(it.qty);
    total += subtotal;
    return { product_id: productId, product_name: name || 'Produk', qty: Number(it.qty), price, subtotal };
  });

  const receiptNo = nextReceiptNo(userId);
  const createdAt = trans_date ? new Date(trans_date).getTime() : Date.now();

  const insertSale = db.prepare(`INSERT INTO pos_sales (user_id, receipt_no, client_uuid, total, payment_method, customer_name, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  const info = insertSale.run(userId, receiptNo, client_uuid || null, total, payment_method || 'tunai', customer_name || null, status || 'lunas', createdAt);
  const saleId = info.lastInsertRowid;

  const insertItem = db.prepare(`INSERT INTO pos_sale_items (sale_id, product_id, product_name, qty, price, subtotal) VALUES (?, ?, ?, ?, ?, ?)`);
  const adjustStock = db.prepare('UPDATE products SET stock = MAX(0, stock - ?), updated_at = ? WHERE id = ? AND user_id = ?');

  for (const it of resolvedItems) {
    insertItem.run(saleId, it.product_id, it.product_name, it.qty, it.price, it.subtotal);
    if (it.product_id) adjustStock.run(it.qty, Date.now(), it.product_id, userId);
  }

  // Catat otomatis ke pembukuan keuangan (Pencatatan Keuangan Otomatis)
  db.prepare(`INSERT INTO finance_transactions (user_id, type, category, amount, description, trans_date, source, ref_id, created_at)
    VALUES (?, 'income', 'Penjualan Kasir', ?, ?, ?, 'pos', ?, ?)`)
    .run(userId, total, `Penjualan struk ${receiptNo}`, new Date(createdAt).toISOString().slice(0, 10), saleId, Date.now());

  const lowStock = db.prepare('SELECT name, stock, min_stock, unit FROM products WHERE user_id = ? AND stock <= min_stock').all(userId);

  const sale = db.prepare('SELECT * FROM pos_sales WHERE id = ?').get(saleId);
  const savedItems = db.prepare('SELECT * FROM pos_sale_items WHERE sale_id = ?').all(saleId);
  return { sale: { ...sale, items: savedItems }, duplicate: false, lowStockWarning: lowStock };
}

// POST /api/pos/sale
router.post('/sale', (req, res) => {
  try {
    const result = createSale(req.user.id, req.body || {});
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(e.code || 500).json({ ok: false, error: e.msg || 'Gagal memproses transaksi.' });
  }
});

// POST /api/pos/sync  { sales: [ {items, payment_method, client_uuid, trans_date, ...}, ... ] }
// Dipakai ketika koneksi kembali online setelah mode offline, mengirim antrian transaksi sekaligus.
router.post('/sync', (req, res) => {
  const { sales } = req.body || {};
  if (!Array.isArray(sales)) return res.status(400).json({ ok: false, error: 'Format sinkronisasi tidak valid.' });
  const results = [];
  for (const s of sales) {
    try {
      const r = createSale(req.user.id, s);
      results.push({ client_uuid: s.client_uuid, ok: true, receipt_no: r.sale.receipt_no, duplicate: r.duplicate });
    } catch (e) {
      results.push({ client_uuid: s.client_uuid, ok: false, error: e.msg || 'Gagal sinkron' });
    }
  }
  res.json({ ok: true, results });
});

router.get('/sales', (req, res) => {
  const rows = db.prepare('SELECT * FROM pos_sales WHERE user_id = ? ORDER BY created_at DESC LIMIT 200').all(req.user.id);
  res.json({ ok: true, sales: rows });
});

// Data struk untuk dicetak (fisik via bluetooth print dari browser, atau ditampilkan/dibagikan sebagai struk digital)
router.get('/receipt/:id', (req, res) => {
  const sale = db.prepare('SELECT * FROM pos_sales WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!sale) return res.status(404).json({ ok: false, error: 'Struk tidak ditemukan.' });
  const items = db.prepare('SELECT * FROM pos_sale_items WHERE sale_id = ?').all(sale.id);
  const seller = db.prepare('SELECT name, business_name, wa_number FROM users WHERE id = ?').get(req.user.id);
  res.json({ ok: true, sale, items, seller });
});

module.exports = router;
