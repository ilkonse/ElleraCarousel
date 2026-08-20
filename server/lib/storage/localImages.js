'use strict';

const fs = require('fs');
const path = require('path');
const { IMAGES_DIR, IMAGE_EXTENSIONS } = require('../../config');
const { sanitizeFilename, nextAvailableName } = require('./sanitize');

function toUrl(filename) {
  return `/images/${encodeURIComponent(filename)}`;
}

/**
 * Elenca le immagini presenti nella cartella dati, ordinate in ordine
 * lessicografico (Array.prototype.sort di default) sul nome file.
 * Ignora file nascosti e qualunque cosa non abbia un'estensione immagine nota.
 */
async function listImages() {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
  const entries = fs.readdirSync(IMAGES_DIR, { withFileTypes: true });
  const names = entries
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .filter((name) => !name.startsWith('.'))
    .filter((name) => IMAGE_EXTENSIONS.has(path.extname(name).toLowerCase()))
    .sort();
  return names.map((filename) => ({ filename, url: toUrl(filename) }));
}

async function saveImage(buffer, originalName) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
  const base = sanitizeFilename(originalName);
  const existing = new Set(fs.readdirSync(IMAGES_DIR));
  const filename = nextAvailableName(base, existing);
  fs.writeFileSync(path.join(IMAGES_DIR, filename), buffer);
  return { filename, url: toUrl(filename) };
}

/**
 * Risolve un nome file "safe" nel suo percorso assoluto dentro IMAGES_DIR,
 * rifiutando qualunque tentativo di uscire dalla cartella (path traversal).
 */
function resolveImagePath(filename) {
  const safeName = path.basename(filename); // rimuove ogni componente di percorso
  const fullPath = path.join(IMAGES_DIR, safeName);
  const resolved = path.resolve(fullPath);
  if (!resolved.startsWith(path.resolve(IMAGES_DIR) + path.sep)) {
    throw new Error('Nome file non valido.');
  }
  return resolved;
}

async function deleteImage(filename) {
  const fullPath = resolveImagePath(filename);
  fs.unlinkSync(fullPath); // lancia ENOENT se il file non esiste
}

module.exports = { listImages, saveImage, deleteImage };
