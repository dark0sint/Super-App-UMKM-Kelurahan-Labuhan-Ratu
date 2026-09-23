const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const { category } = req.query;
  let sql = 'SELECT * FROM learning_content';
  const params = [];
  if (category) { sql += ' WHERE category = ?'; params.push(category); }
  sql += ' ORDER BY id ASC';
  const rows = db.prepare(sql).all(...params);
  res.json({ ok: true, content: rows });
});

module.exports = router;
