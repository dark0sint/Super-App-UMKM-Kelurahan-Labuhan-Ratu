require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/finance', require('./routes/finance'));
app.use('/api/products', require('./routes/products'));
app.use('/api/pos', require('./routes/pos'));
app.use('/api/qris', require('./routes/qris'));
app.use('/api/financing', require('./routes/financing'));
app.use('/api/catalog', require('./routes/catalog'));
app.use('/api/marketplace', require('./routes/marketplace'));
app.use('/api/logistics', require('./routes/logistics'));
app.use('/api/learning', require('./routes/learning'));
app.use('/api/licensing', require('./routes/licensing'));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, app: process.env.APP_NAME || 'Super App UMKM Kelurahan Labuhan Ratu', time: new Date().toISOString() });
});

// Frontend statis (PWA)
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ ok: false, error: 'Terjadi kesalahan pada server.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ ${process.env.APP_NAME || 'Super App UMKM Kelurahan Labuhan Ratu'} berjalan di http://localhost:${PORT}`);
});
