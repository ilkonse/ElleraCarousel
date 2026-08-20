'use strict';

const express = require('express');
const { listImages } = require('../lib/images');
const imagesMeta = require('../lib/imagesMeta');
const { getSettings } = require('../lib/settingsStore');

const router = express.Router();

// Elenco immagini per il carosello: solo quelle non nascoste, nell'ordine
// scelto dall'admin (manifesto in lib/imagesMeta.js, non più solo
// alfabetico). Ogni elemento è { filename, url }: l'url punta al file
// locale servito da Express oppure direttamente al blob su Vercel Blob,
// a seconda del backend.
router.get('/images', async (req, res, next) => {
  try {
    const manifest = await imagesMeta.getManifest(await listImages());
    const visible = manifest.filter((img) => !img.hidden).map(({ filename, url }) => ({ filename, url }));
    res.json({ images: visible });
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
