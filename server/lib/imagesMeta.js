'use strict';

// Le foto vere e proprie (bytes) vivono in lib/images.js (disco locale o
// Vercel Blob). Questo modulo tiene invece un piccolo "manifesto" separato
// con l'unica cosa che lo storage dei file non può rappresentare da solo:
// l'ordine scelto dall'admin (drag&drop) e quali foto sono nascoste dal
// carosello pubblico pur restando caricate.
const { IMAGES_META_FILE, DATA_BACKEND } = require('../config');
const localJson = require('./jsonStore');
const redis = require('./redisClient');

const REDIS_KEY = 'ellera:images-meta';
const EMPTY_MANIFEST = { order: [], hidden: [] };

async function readRaw() {
  if (DATA_BACKEND === 'redis') {
    const manifest = await redis.getJson(REDIS_KEY);
    return manifest || { ...EMPTY_MANIFEST };
  }
  return localJson.readJson(IMAGES_META_FILE, { ...EMPTY_MANIFEST });
}

async function writeRaw(manifest) {
  if (DATA_BACKEND === 'redis') {
    await redis.setJson(REDIS_KEY, manifest);
    return;
  }
  localJson.writeJson(IMAGES_META_FILE, manifest);
}

function normalize(manifest) {
  const order = Array.isArray(manifest.order) ? manifest.order : [];
  const hidden = Array.isArray(manifest.hidden) ? manifest.hidden : [];
  return { order, hidden: new Set(hidden) };
}

/**
 * Riconcilia il manifesto salvato con l'elenco reale dei file presenti nello
 * storage (passato da chi chiama, tipicamente da images.listImages()):
 * toglie le voci di file non più esistenti, aggiunge in fondo (ordine
 * alfabetico) i file presenti ma non ancora nel manifesto. Salva solo se è
 * cambiato qualcosa. Ritorna { filename, url, hidden } nell'ordine giusto.
 */
async function getManifest(rawImages) {
  const raw = await readRaw();
  const { order, hidden } = normalize(raw);
  const byFilename = new Map(rawImages.map((img) => [img.filename, img]));
  const known = new Set(order);

  const nextOrder = order.filter((filename) => byFilename.has(filename));
  const missing = rawImages
    .map((img) => img.filename)
    .filter((filename) => !known.has(filename))
    .sort();
  nextOrder.push(...missing);

  const nextHidden = [...hidden].filter((filename) => byFilename.has(filename));

  const changed =
    nextOrder.length !== order.length ||
    nextOrder.some((f, i) => f !== order[i]) ||
    nextHidden.length !== hidden.size;
  if (changed) {
    await writeRaw({ order: nextOrder, hidden: nextHidden });
  }

  const hiddenSet = new Set(nextHidden);
  return nextOrder.map((filename) => ({
    ...byFilename.get(filename),
    hidden: hiddenSet.has(filename),
  }));
}

async function setOrder(order) {
  const raw = await readRaw();
  const { hidden } = normalize(raw);
  await writeRaw({ order, hidden: [...hidden] });
}

async function setHidden(filenames, isHidden) {
  const raw = await readRaw();
  const { order, hidden } = normalize(raw);
  const targets = new Set(filenames);
  if (isHidden) {
    targets.forEach((f) => hidden.add(f));
  } else {
    targets.forEach((f) => hidden.delete(f));
  }
  await writeRaw({ order, hidden: [...hidden] });
}

async function renameEntry(oldName, newName) {
  const raw = await readRaw();
  const { order, hidden } = normalize(raw);
  const nextOrder = order.map((f) => (f === oldName ? newName : f));
  const nextHidden = [...hidden].map((f) => (f === oldName ? newName : f));
  await writeRaw({ order: nextOrder, hidden: nextHidden });
}

async function removeEntry(filename) {
  const raw = await readRaw();
  const { order, hidden } = normalize(raw);
  hidden.delete(filename);
  await writeRaw({ order: order.filter((f) => f !== filename), hidden: [...hidden] });
}

async function appendEntry(filename) {
  const raw = await readRaw();
  const { order, hidden } = normalize(raw);
  if (!order.includes(filename)) order.push(filename);
  await writeRaw({ order, hidden: [...hidden] });
}

module.exports = {
  getManifest,
  setOrder,
  setHidden,
  renameEntry,
  removeEntry,
  appendEntry,
};
