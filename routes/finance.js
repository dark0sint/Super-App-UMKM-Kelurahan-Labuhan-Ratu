const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/finance/transactions?from=&to=&type=
router.get('/transactions', (req, res) => {
  const { from, to, type } = req.query;
  let sql = 'SELECT * FROM finance_transactions WHERE user_id = ?';
  const params = [req.user.id];
  if (from) { sql += ' AND trans_date >= ?'; params.push(from); }
  if (to) { sql += ' AND trans_date <= ?'; params.push(to); }
  if (type) { sql += ' AND type = ?'; params.push(type); }
  sql += ' ORDER BY trans_date DESC, id DESC LIMIT 500';
  const rows = db.prepare(sql).all(...params);
  res.json({ ok: true, transactions: rows });
});

// POST /api/finance/transactions { type, category, amount, description, trans_date }
router.post('/transactions', (req, res) => {
  const { type, category, amount, description, trans_date } = req.body || {};
  if (!['income', 'expense'].includes(type)) return res.status(400).json({ ok: false, error: 'Jenis transaksi harus "income" (pemasukan) atau "expense" (pengeluaran).' });
  if (!amount || Number(amount) <= 0) return res.status(400).json({ ok: false, error: 'Nominal harus lebih dari 0.' });

  const date = trans_date || new Date().toISOString().slice(0, 10);
  const info = db.prepare(`INSERT INTO finance_transactions (user_id, type, category, amount, description, trans_date, source, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'manual', ?)`).run(req.user.id, type, category || (type === 'income' ? 'Penjualan Lain' : 'Pengeluaran Lain'), Number(amount), description || null, date, Date.now());

  res.json({ ok: true, id: info.lastInsertRowid });
});

router.delete('/transactions/:id', (req, res) => {
  const info = db.prepare('DELETE FROM finance_transactions WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  if (info.changes === 0) return res.status(404).json({ ok: false, error: 'Transaksi tidak ditemukan.' });
  res.json({ ok: true });
});

// GET /api/finance/summary?period=today|week|month|year|custom&from=&to=
// Menghitung untung-rugi otomatis tanpa perlu rumus akuntansi.
router.get('/summary', (req, res) => {
  const { period = 'month', from, to } = req.query;
  const today = new Date();
  let start, end;

  if (period === 'custom' && from && to) {
    start = from; end = to;
  } else if (period === 'today') {
    start = end = today.toISOString().slice(0, 10);
  } else if (period === 'week') {
    const d = new Date(today); d.setDate(d.getDate() - 6);
    start = d.toISOString().slice(0, 10); end = today.toISOString().slice(0, 10);
  } else if (period === 'year') {
    start = `${today.getFullYear()}-01-01`; end = today.toISOString().slice(0, 10);
  } else {
    start = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
    end = today.toISOString().slice(0, 10);
  }

  const income = db.prepare(`SELECT COALESCE(SUM(amount),0) as total FROM finance_transactions WHERE user_id=? AND type='income' AND trans_date BETWEEN ? AND ?`).get(req.user.id, start, end).total;
  const expense = db.prepare(`SELECT COALESCE(SUM(amount),0) as total FROM finance_transactions WHERE user_id=? AND type='expense' AND trans_date BETWEEN ? AND ?`).get(req.user.id, start, end).total;

  const byCategory = db.prepare(`SELECT type, category, SUM(amount) as total FROM finance_transactions
      WHERE user_id=? AND trans_date BETWEEN ? AND ? GROUP BY type, category ORDER BY total DESC`).all(req.user.id, start, end);

  // Grafik harian (untuk periode <= 1 bulan cukup ringan ditampilkan)
  const daily = db.prepare(`SELECT trans_date, type, SUM(amount) as total FROM finance_transactions
      WHERE user_id=? AND trans_date BETWEEN ? AND ? GROUP BY trans_date, type ORDER BY trans_date ASC`).all(req.user.id, start, end);

  const profit = income - expense;
  res.json({
    ok: true,
    period, start, end,
    pemasukan: income,
    pengeluaran: expense,
    untung_rugi: profit,
    status: profit >= 0 ? 'untung' : 'rugi',
    kesimpulan: profit >= 0
      ? `Usaha Anda untung Rp${profit.toLocaleString('id-ID')} pada periode ini.`
      : `Usaha Anda rugi Rp${Math.abs(profit).toLocaleString('id-ID')} pada periode ini. Coba periksa pengeluaran terbesar.`,
    rincian_kategori: byCategory,
    grafik_harian: daily
  });
});

module.exports = router;
