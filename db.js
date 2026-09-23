const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, 'data', 'umkm.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ---------- SCHEMA ----------
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wa_number TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  business_name TEXT,
  username TEXT UNIQUE,
  role TEXT NOT NULL DEFAULT 'umkm', -- 'umkm' | 'admin'
  otp TEXT,
  otp_expires INTEGER,
  token TEXT,
  token_expires INTEGER,
  webauthn_registered INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  price REAL NOT NULL DEFAULT 0,
  cost REAL NOT NULL DEFAULT 0,
  stock REAL NOT NULL DEFAULT 0,
  min_stock REAL NOT NULL DEFAULT 0,
  unit TEXT DEFAULT 'pcs',
  image_url TEXT,
  is_published INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS finance_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK(type IN ('income','expense')),
  category TEXT,
  amount REAL NOT NULL,
  description TEXT,
  trans_date TEXT NOT NULL, -- YYYY-MM-DD
  source TEXT DEFAULT 'manual', -- 'manual' | 'pos' | 'qris'
  ref_id INTEGER,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS pos_sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receipt_no TEXT UNIQUE NOT NULL,
  client_uuid TEXT UNIQUE,
  total REAL NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'tunai', -- 'tunai' | 'qris'
  customer_name TEXT,
  status TEXT NOT NULL DEFAULT 'lunas', -- 'lunas' | 'menunggu_pembayaran'
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS pos_sale_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id INTEGER NOT NULL REFERENCES pos_sales(id) ON DELETE CASCADE,
  product_id INTEGER,
  product_name TEXT NOT NULL,
  qty REAL NOT NULL,
  price REAL NOT NULL,
  subtotal REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS qris_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sale_id INTEGER,
  amount REAL NOT NULL,
  qr_string TEXT NOT NULL,
  qr_image TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'paid' | 'expired'
  created_at INTEGER NOT NULL,
  paid_at INTEGER
);

CREATE TABLE IF NOT EXISTS financing_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount REAL NOT NULL,
  tenor_bulan INTEGER NOT NULL DEFAULT 6,
  purpose TEXT,
  status TEXT NOT NULL DEFAULT 'diajukan', -- diajukan | ditinjau | disetujui | ditolak | cair
  admin_note TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS logistics_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sale_id INTEGER,
  pickup_address TEXT NOT NULL,
  dropoff_address TEXT NOT NULL,
  recipient_name TEXT,
  recipient_phone TEXT,
  courier_type TEXT DEFAULT 'ojek_desa', -- ojek_desa | kurir_lokal
  status TEXT NOT NULL DEFAULT 'menunggu', -- menunggu | diambil | diantar | selesai | batal
  ongkir REAL DEFAULT 0,
  notes TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS learning_content (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  category TEXT,
  duration_text TEXT,
  data_size_hint TEXT,
  created_at INTEGER NOT NULL
);
`);

module.exports = db;
