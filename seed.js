const db = require('./db');

const now = Date.now();

// Akun admin BUMDes/Kelurahan (login pakai nomor WA ini, lalu minta OTP demo)
const adminWa = '628990000001';
const existingAdmin = db.prepare('SELECT * FROM users WHERE wa_number = ?').get(adminWa);
if (!existingAdmin) {
  db.prepare(`INSERT INTO users (wa_number, name, business_name, username, role, created_at) VALUES (?, ?, ?, ?, 'admin', ?)`)
    .run(adminWa, 'Admin BUMDes', 'BUMDes Labuhan Ratu Sejahtera', 'admin-bumdes', now);
  console.log('Akun admin dibuat: WA', adminWa);
} else {
  console.log('Akun admin sudah ada.');
}

const contentCount = db.prepare('SELECT COUNT(*) as c FROM learning_content').get().c;
if (contentCount === 0) {
  const items = [
    ['Cara Hitung Untung-Rugi Tanpa Rumus Rumit', 'Video 3 menit cara membaca ringkasan untung-rugi otomatis di aplikasi.', 'https://example.com/video/untung-rugi', 'Keuangan', '3 menit', 'Hemat kuota (SD)'],
    ['Bikin Foto Produk Menarik Pakai HP', 'Tips pencahayaan sederhana agar foto produk di katalog digital lebih menjual.', 'https://example.com/video/foto-produk', 'Pemasaran', '4 menit', 'Hemat kuota (SD)'],
    ['Kenalan dengan QRIS untuk Pemula', 'Panduan singkat menerima pembayaran nontunai lewat QRIS di warung/toko.', 'https://example.com/video/qris-pemula', 'Pembayaran', '5 menit', 'Hemat kuota (SD)'],
    ['Tips Hitung Stok Biar Gak Kehabisan Bahan Baku', 'Cara sederhana menentukan stok minimum agar dapat notifikasi tepat waktu.', 'https://example.com/video/stok-aman', 'Operasional', '3 menit', 'Hemat kuota (SD)'],
    ['Langkah Awal Urus NIB Sendiri dari HP', 'Ringkasan alur pengurusan NIB lewat OSS tanpa perlu ke kantor.', 'https://example.com/video/nib-hp', 'Perizinan', '6 menit', 'Hemat kuota (SD)']
  ];
  const insert = db.prepare(`INSERT INTO learning_content (title, description, video_url, category, duration_text, data_size_hint, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`);
  for (const it of items) insert.run(...it, now);
  console.log(`Seeded ${items.length} konten Pojok Belajar UMKM.`);
} else {
  console.log('Konten Pojok Belajar sudah ada, dilewati.');
}

console.log('Selesai seeding.');
