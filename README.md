# 🏘️ Super App UMKM Kelurahan Labuhan Ratu

Aplikasi web terpadu (backend API + frontend PWA offline-ready) untuk pelaku UMKM di
**Kelurahan Labuhan Ratu, Kecamatan Labuhan Ratu, Kota Bandar Lampung**.

Dibangun sebagai satu aplikasi Node.js siap jalan di server (VPS/Cloud/on-premise kelurahan),
tanpa perlu database server terpisah (memakai SQLite berkas lokal).

---

## 🧩 Daftar Fitur

| Kelompok | Fitur | Lokasi |
|---|---|---|
| 📦 Pengelolaan Usaha | Keuangan otomatis (untung/rugi tanpa rumus akuntansi) | `keuangan.html` + `routes/finance.js` |
| | Manajemen stok + notifikasi stok menipis | `stok.html` + `routes/products.js` |
| | Kasir digital (POS) + struk fisik (Bluetooth print via browser) & struk digital | `kasir.html`, `struk.html` + `routes/pos.js` |
| 💰 Pembayaran & Permodalan | QRIS Desa (mock gateway, siap disambung ke PJSP asli) | `routes/qris.js` |
| | Kemitraan BUMDes/LPD (pengajuan modal usaha) | `permodalan.html` + `routes/financing.js` |
| 🚚 Pemasaran & Logistik | Katalog produk digital (link toko mini, share ke WhatsApp) | `katalog.html`, `toko.html` + `routes/catalog.js` |
| | Logistik kolektif desa (ojek desa / kurir lokal) | `logistik.html` + `routes/logistics.js` |
| | Pasar Bersama (marketplace seluruh UMKM kelurahan) | `marketplace.html` + `routes/marketplace.js` |
| 💡 Pendampingan & Edukasi | Panduan NIB, Sertifikasi Halal, P-IRT | `perizinan.html` + `routes/licensing.js` |
| | Pojok Belajar UMKM (video singkat, hemat kuota) | `belajar.html` + `routes/learning.js` |
| 🛠️ Teknis | Mode offline (PWA + IndexedDB queue + auto-sync) | `service-worker.js`, `js/offline.js` |
| | Login tanpa password (nomor WhatsApp + OTP) | `login.html` + `routes/auth.js` |

---

## 📁 Struktur Proyek

```
umkm-app/
├── server.js              # entry point Express
├── db.js                  # koneksi & skema SQLite
├── seed.js                # data awal (akun admin, konten belajar)
├── middleware/auth.js      # verifikasi token login
├── routes/                 # seluruh REST API
├── public/                  # frontend PWA (HTML/CSS/JS, tanpa build step)
│   ├── *.html
│   ├── css/style.css
│   ├── js/{api,offline,auth-guard}.js
│   ├── service-worker.js
│   └── manifest.json
├── data/umkm.db            # file database (dibuat otomatis saat pertama jalan)
├── package.json
└── .env.example
```

---

## 🚀 Cara Menjalankan di Server

Prasyarat: **Node.js versi 18 ke atas** ([nodejs.org](https://nodejs.org)) dan akses internet
saat instalasi paket (`npm install`).

```bash
# 1. Salin/unggah folder umkm-app ke server
cd umkm-app

# 2. Install dependensi
npm install

# 3. Salin file environment
cp .env.example .env
# lalu sunting .env sesuai kebutuhan (lihat bagian "Konfigurasi .env" di bawah)

# 4. Isi data awal (akun admin BUMDes + konten Pojok Belajar contoh)
npm run seed

# 5. Jalankan server
npm start
```

Aplikasi akan berjalan di `http://ALAMAT-SERVER:3000` (port bisa diubah lewat `.env`).

### Menjalankan permanen (disarankan untuk server produksi)

Gunakan [PM2](https://pm2.keymetrics.io/) agar aplikasi otomatis restart jika server reboot:

```bash
npm install -g pm2
pm2 start server.js --name umkm-labuhan-ratu
pm2 save
pm2 startup
```

### Mengakses lewat domain (opsional, disarankan)

Pasang Nginx sebagai reverse proxy agar bisa memakai domain + HTTPS (wajib untuk PWA/offline mode
dan Bluetooth printing agar berjalan optimal di HP):

```nginx
server {
    listen 80;
    server_name umkm.labuhanratu.example.id;
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Lalu aktifkan HTTPS gratis dengan Certbot: `sudo certbot --nginx -d umkm.labuhanratu.example.id`.

---

## ⚙️ Konfigurasi `.env`

| Variabel | Keterangan |
|---|---|
| `PORT` | Port server (default 3000) |
| `APP_NAME` | Nama aplikasi yang tampil di log server |
| `QRIS_MERCHANT_ID`, `QRIS_MERCHANT_NAME` | Identitas merchant QRIS. **Ganti dengan kredensial resmi dari PJSP QRIS** (mis. Bank Lampung, Nobu, Midtrans, Xendit) agar dana benar-benar masuk ke rekening/e-wallet pelaku UMKM. Selama belum diisi kredensial asli, fitur ini berjalan dalam **mode demo/mock**. |
| `WA_GATEWAY_URL`, `WA_GATEWAY_TOKEN` | URL & token gateway pengirim WhatsApp (mis. Fonnte/Wablas) untuk mengirim kode OTP asli. Jika dikosongkan, aplikasi berjalan **mode demo**: kode OTP ditampilkan langsung di layar saat login (agar tetap bisa dites tanpa gateway). |
| `TOKEN_TTL_HOURS` | Lama sesi login sebelum harus login ulang (default 720 jam / 30 hari) |

### Menyambungkan QRIS ke rekening/e-wallet asli

1. Daftarkan BUMDes/Kelurahan sebagai merchant QRIS ke bank/PJSP pilihan (banyak yang gratis untuk UMKM/lembaga desa).
2. Untuk skenario **setiap UMKM punya rekening sendiri**, daftarkan tiap pelaku usaha sebagai sub-merchant lewat API PJSP tersebut.
3. Ganti isi fungsi `generateQrString()` dan endpoint webhook konfirmasi di `routes/qris.js` dengan pemanggilan API resmi PJSP tersebut (dokumentasi API biasanya disediakan saat pendaftaran merchant).

### Menyambungkan OTP WhatsApp asli

Daftar ke salah satu penyedia gateway WhatsApp (Fonnte/Wablas/Whacenter, dll.), lalu isi `WA_GATEWAY_URL`
dan `WA_GATEWAY_TOKEN` di `.env`. Format pengiriman pesan sudah disiapkan di `routes/auth.js` fungsi `sendWaOtp()`,
sesuaikan `body` request dengan format API gateway yang dipilih.

---

## 👤 Login Awal

Setelah `npm run seed`, tersedia akun **admin BUMDes** untuk meninjau pengajuan modal usaha:
- Nomor WhatsApp: `628990000001`
- Login lewat `login.html`, lalu masukkan kode OTP yang tampil di layar (mode demo).

Pelaku UMKM baru cukup membuka aplikasi dan login dengan nomor WhatsApp masing-masing —
akun otomatis terbuat saat pertama kali login.

> 🔐 **Login tanpa password**: aplikasi memakai OTP via WhatsApp sebagai pengganti kata sandi.
> Untuk **sidik jari/PIN perangkat**, aplikasi memakai kemampuan bawaan HP (Face ID/sidik jari/PIN layar kunci)
> lewat WebAuthn — setelah OTP pertama berhasil, browser modern akan menawarkan opsi "simpan info login"
> yang berikutnya bisa dibuka cukup dengan sidik jari/PIN tanpa mengetik OTP ulang.

---

## 📶 Mode Offline

- Saat sinyal hilang, transaksi kasir tetap bisa diinput — data disimpan sementara di **IndexedDB** perangkat (`js/offline.js`).
- Begitu koneksi kembali, aplikasi otomatis mengirim antrean transaksi ke server lewat `POST /api/pos/sync`.
- Halaman-halaman utama (app shell) di-cache oleh **Service Worker** (`service-worker.js`) sehingga aplikasi tetap bisa dibuka meski offline.
- Struk digital tetap bisa dibagikan meski offline (disalin sebagai teks ke WhatsApp).

---

## 🗄️ Backup Data

Seluruh data tersimpan di satu file: `data/umkm.db` (SQLite). Cukup salin (backup) file ini secara berkala:

```bash
cp data/umkm.db backup/umkm-$(date +%Y%m%d).db
```

---

## 🔒 Catatan Keamanan Sebelum Produksi

1. Aktifkan HTTPS (lihat contoh Nginx + Certbot di atas) — wajib untuk PWA, lokasi, dan keamanan token.
2. Ganti gateway OTP WhatsApp dan QRIS dari mode demo ke kredensial resmi (lihat bagian Konfigurasi).
3. Jadwalkan backup rutin `data/umkm.db`.
4. Batasi akses folder `data/` hanya untuk proses aplikasi (jangan diekspos lewat web server statis).
