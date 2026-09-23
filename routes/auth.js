const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const TOKEN_TTL_MS = (Number(process.env.TOKEN_TTL_HOURS) || 720) * 60 * 60 * 1000;

function normalizeWa(number) {
  let n = String(number || '').replace(/[^0-9]/g, '');
  if (n.startsWith('0')) n = '62' + n.slice(1);
  if (!n.startsWith('62')) n = '62' + n;
  return n;
}

function slugUsername(name, id) {
  const base = String(name || 'umkm').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return `${base || 'umkm'}-${id}`;
}

async function sendWaOtp(waNumber, otp) {
  if (!process.env.WA_GATEWAY_URL) {
    // Mode demo: tidak ada gateway WA terpasang, OTP dikirim balik di response (lihat routes) agar tetap bisa dites.
    console.log(`[DEMO OTP] Kirim OTP ${otp} ke WhatsApp ${waNumber}`);
    return { sent: false, demo: true };
  }
  try {
    await fetch(process.env.WA_GATEWAY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: process.env.WA_GATEWAY_TOKEN || '' },
      body: JSON.stringify({ target: waNumber, message: `Kode OTP Super App UMKM Labuhan Ratu Anda: ${otp}. Jangan bagikan kode ini ke siapa pun.` })
    });
    return { sent: true, demo: false };
  } catch (e) {
    console.error('Gagal kirim WA OTP:', e.message);
    return { sent: false, demo: true };
  }
}

// POST /api/auth/request-otp { wa_number, name?, business_name? }
router.post('/request-otp', async (req, res) => {
  const { wa_number, name, business_name } = req.body || {};
  if (!wa_number) return res.status(400).json({ ok: false, error: 'Nomor WhatsApp wajib diisi.' });

  const wa = normalizeWa(wa_number);
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const otpExpires = Date.now() + 5 * 60 * 1000;

  let user = db.prepare('SELECT * FROM users WHERE wa_number = ?').get(wa);
  if (!user) {
    const info = db.prepare(`INSERT INTO users (wa_number, name, business_name, role, otp, otp_expires, created_at)
      VALUES (?, ?, ?, 'umkm', ?, ?, ?)`).run(wa, name || 'Pelaku UMKM', business_name || null, otp, otpExpires, Date.now());
    const username = slugUsername(business_name || name, info.lastInsertRowid);
    db.prepare('UPDATE users SET username = ? WHERE id = ?').run(username, info.lastInsertRowid);
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  } else {
    db.prepare('UPDATE users SET otp = ?, otp_expires = ? WHERE id = ?').run(otp, otpExpires, user.id);
  }

  const result = await sendWaOtp(wa, otp);
  res.json({
    ok: true,
    message: result.demo
      ? 'Mode demo aktif: gateway WhatsApp belum terpasang, OTP ditampilkan langsung di response ini.'
      : 'Kode OTP telah dikirim ke WhatsApp Anda.',
    wa_number: wa,
    demo_otp: result.demo ? otp : undefined
  });
});

// POST /api/auth/verify-otp { wa_number, otp }
router.post('/verify-otp', (req, res) => {
  const { wa_number, otp } = req.body || {};
  if (!wa_number || !otp) return res.status(400).json({ ok: false, error: 'Nomor WhatsApp dan kode OTP wajib diisi.' });

  const wa = normalizeWa(wa_number);
  const user = db.prepare('SELECT * FROM users WHERE wa_number = ?').get(wa);
  if (!user || !user.otp) return res.status(400).json({ ok: false, error: 'Nomor belum meminta OTP.' });
  if (user.otp_expires < Date.now()) return res.status(400).json({ ok: false, error: 'Kode OTP sudah kedaluwarsa, minta kode baru.' });
  if (user.otp !== String(otp)) return res.status(400).json({ ok: false, error: 'Kode OTP salah.' });

  const token = crypto.randomBytes(24).toString('hex');
  const tokenExpires = Date.now() + TOKEN_TTL_MS;
  db.prepare('UPDATE users SET otp = NULL, otp_expires = NULL, token = ?, token_expires = ? WHERE id = ?')
    .run(token, tokenExpires, user.id);

  res.json({
    ok: true,
    token,
    user: { id: user.id, name: user.name, business_name: user.business_name, username: user.username, role: user.role }
  });
});

// Placeholder to record that this device registered a biometric unlock (actual WebAuthn ceremony runs client-side per device)
router.post('/register-biometric', requireAuth, (req, res) => {
  db.prepare('UPDATE users SET webauthn_registered = 1 WHERE id = ?').run(req.user.id);
  res.json({ ok: true, message: 'Login sidik jari/PIN perangkat diaktifkan untuk akun ini di perangkat ini.' });
});

router.get('/me', requireAuth, (req, res) => {
  const u = req.user;
  res.json({ ok: true, user: { id: u.id, name: u.name, business_name: u.business_name, username: u.username, role: u.role, wa_number: u.wa_number, webauthn_registered: !!u.webauthn_registered } });
});

router.put('/me', requireAuth, (req, res) => {
  const { name, business_name, username } = req.body || {};
  if (username) {
    const clash = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, req.user.id);
    if (clash) return res.status(400).json({ ok: false, error: 'Nama tautan toko sudah dipakai UMKM lain, coba nama lain.' });
  }
  db.prepare('UPDATE users SET name = COALESCE(?, name), business_name = COALESCE(?, business_name), username = COALESCE(?, username) WHERE id = ?')
    .run(name || null, business_name || null, username || null, req.user.id);
  res.json({ ok: true });
});

router.post('/logout', requireAuth, (req, res) => {
  db.prepare('UPDATE users SET token = NULL, token_expires = NULL WHERE id = ?').run(req.user.id);
  res.json({ ok: true });
});

module.exports = router;
