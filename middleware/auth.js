const db = require('../db');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : (req.query.token || null);

  if (!token) {
    return res.status(401).json({ ok: false, error: 'Silakan login terlebih dahulu.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE token = ?').get(token);
  if (!user) {
    return res.status(401).json({ ok: false, error: 'Sesi tidak valid, silakan login ulang.' });
  }
  if (user.token_expires && user.token_expires < Date.now()) {
    return res.status(401).json({ ok: false, error: 'Sesi sudah berakhir, silakan login ulang.' });
  }

  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ ok: false, error: 'Khusus untuk admin BUMDes/Kelurahan.' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
