'use strict';

const express = require('express');
const { listImages } = require('../lib/images');
const { getSettings } = require('../lib/settingsStore');

const router = express.Router();

// Elenco immagini per il carosello, in ordine lessicografico sul nome file.
router.get('/images', (req, res) => {
  res.json({ images: listImages() });
});

// Impostazioni pubbliche del carosello (solo l'intervallo, per ora).
router.get('/settings', (req, res) => {
  const { intervalSeconds } = getSettings();
  res.json({ intervalSeconds });
});

module.exports = router;
