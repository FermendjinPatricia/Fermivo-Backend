const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

router.get('/predictii', (req, res) => {
  const filePath = path.join(__dirname, '../data/brm_predictii_saptamana_viitoare.csv');

  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('❌ Eroare la citire CSV:', err);
      return res.status(500).json({ success: false, message: 'Eroare server' });
    }

    const rows = data.trim().split('\n');
    const headers = rows.shift().split(',');

    const predictii = rows.map(row => {
      const values = row.split(',');
      const obj = {};
      headers.forEach((h, i) => obj[h.trim()] = values[i].trim());
      return obj;
    });

    res.json({ success: true, predictii });
  });
});

module.exports = router;
