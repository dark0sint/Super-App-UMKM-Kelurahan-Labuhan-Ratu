const express = require('express');
const router = express.Router();

const GUIDES = {
  nib: {
    title: 'NIB (Nomor Induk Berusaha)',
    ringkasan: 'Identitas resmi pelaku usaha yang terbit lewat sistem OSS (Online Single Submission), gratis dan bisa diurus sendiri dari HP.',
    estimasi_waktu: '± 30-60 menit (jika dokumen lengkap)',
    biaya: 'Gratis',
    langkah: [
      { judul: 'Siapkan dokumen', detail: 'Siapkan KTP, NPWP (jika ada), dan nomor HP aktif yang terhubung email.' },
      { judul: 'Buka OSS', detail: 'Akses situs resmi OSS Kementerian Investasi/BKPM (oss.go.id) lalu buat akun baru sebagai "Perseorangan".' },
      { judul: 'Isi data usaha', detail: 'Masukkan nama usaha, bidang usaha (KBLI), lokasi usaha (Kelurahan Labuhan Ratu), dan modal usaha.' },
      { judul: 'Lengkapi kualifikasi risiko', detail: 'Sistem akan menampilkan tingkat risiko usaha (rendah/menengah/tinggi) dan dokumen tambahan yang diperlukan.' },
      { judul: 'Unduh NIB', detail: 'Setelah data terverifikasi otomatis, NIB terbit dan bisa langsung diunduh sebagai bukti legalitas usaha.' }
    ]
  },
  halal: {
    title: 'Sertifikasi Halal',
    ringkasan: 'Wajib bertahap untuk produk makanan/minuman UMKM, bisa lewat jalur self-declare gratis untuk usaha mikro berisiko rendah.',
    estimasi_waktu: '± 3-7 hari kerja (jalur self-declare)',
    biaya: 'Gratis (program SEHATI/self-declare untuk UMK)',
    langkah: [
      { judul: 'Pastikan punya NIB', detail: 'Sertifikasi halal mensyaratkan NIB aktif, urus NIB terlebih dahulu jika belum ada.' },
      { judul: 'Daftar akun SIHALAL', detail: 'Buat akun di ptsp.halal.go.id, pilih jenis pengajuan "Pernyataan Pelaku Usaha (Self-Declare)" untuk usaha mikro.' },
      { judul: 'Isi data produk & bahan', detail: 'Cantumkan daftar bahan baku dan proses produksi, pastikan semua bahan bersertifikat halal atau tidak kritis.' },
      { judul: 'Pendampingan Proses Produk Halal (PPH)', detail: 'Ajukan pendampingan lewat pendamping PPH yang biasanya difasilitasi Kemenag/BUMDes setempat, gratis.' },
      { judul: 'Terbit sertifikat', detail: 'Setelah verifikasi oleh Komite Fatwa selesai, sertifikat halal terbit dan bisa dicetak sebagai label kemasan.' }
    ]
  },
  pirt: {
    title: 'P-IRT (Izin Produksi Pangan Industri Rumah Tangga)',
    ringkasan: 'Izin edar untuk produk pangan olahan rumahan (bukan produk berisiko tinggi seperti daging/susu segar), diterbitkan Dinas Kesehatan/DPMPTSP.',
    estimasi_waktu: '± 7-14 hari kerja',
    biaya: 'Gratis - biaya administrasi kecil tergantung kebijakan daerah',
    langkah: [
      { judul: 'Siapkan NIB & KTP', detail: 'Sama seperti izin lain, NIB dan KTP pemilik usaha jadi syarat dasar.' },
      { judul: 'Ikuti penyuluhan keamanan pangan', detail: 'Wajib mengikuti Penyuluhan Keamanan Pangan (PKP) yang biasa diadakan Dinas Kesehatan Kota Bandar Lampung, sertifikat PKP jadi syarat.' },
      { judul: 'Pemeriksaan sarana produksi', detail: 'Petugas akan memeriksa dapur/tempat produksi untuk memastikan kebersihan dan tata letak sesuai standar.' },
      { judul: 'Ajukan lewat OSS/DPMPTSP', detail: 'Lengkapi pengajuan izin edar P-IRT melalui OSS atau loket DPMPTSP Kota Bandar Lampung.' },
      { judul: 'Terbit nomor P-IRT', detail: 'Nomor P-IRT terbit dan wajib dicantumkan pada label kemasan produk.' }
    ]
  }
};

router.get('/', (req, res) => {
  res.json({ ok: true, guides: Object.entries(GUIDES).map(([slug, g]) => ({ slug, ...g })) });
});

router.get('/:slug', (req, res) => {
  const g = GUIDES[req.params.slug];
  if (!g) return res.status(404).json({ ok: false, error: 'Panduan tidak ditemukan.' });
  res.json({ ok: true, slug: req.params.slug, ...g });
});

module.exports = router;
