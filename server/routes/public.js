'use strict';

const express = require('express');
const { listImages } = require('../lib/images');
const { getSettings } = require('../lib/settingsStore');

const router = express.Router();

// Elenco immagini per il carosello, in ordine lessicografico sul nome file.
// Ogni elemento è { filename, url }: l'url punta al file locale servito da
// Express oppure direttamente al blob su Vercel Blob, a seconda del backend.
router.get('/images', async (req, res, next) => {
  try {
    res.json({ images: await listImages() });
  } catch (err) {
    next(err);
  }
});

// Impostazioni pubbliche del carosello (solo l'intervallo, per ora).
router.get('/settings', async (req, res, next) => {
  try {
    const { intervalSeconds } = await getSettings();
    res.json({ intervalSeconds });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
