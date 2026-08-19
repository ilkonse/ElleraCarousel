'use strict';

const fs = require('fs');
const path = require('path');
const { IMAGES_DIR, IMAGE_EXTENSIONS } = require('../config');

/**
 * Elenca le immagini presenti nella cartella dati, ordinate in ordine
 * lessicografico (Array.prototype.sort di default) sul nome file.
 * Ignora file nascosti e qualunque cosa non abbia un'estensione immagine nota.
 */
function listImages() {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
  const entries = fs.readdirSync(IMAGES_DIR, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .filter((name) => !name.startsWith('.'))
    .filter((name) => IMAGE_EXTENSIONS.has(path.extname(name).toLowerCase()))
    .sort();
}

/**
 * Trasforma un nome file originale (fornito dall'utente in upload) in un nome
 * sicuro da usare sul filesystem: niente separatori di percorso, niente
 * caratteri di risalita ("..") e solo un set ristretto di caratteri.
 * Mantiene il nome scelto dall'admin (senza timestamp) perché è quello che
 * determina l'ordine di visualizzazione nel carosello.
 */
function sanitizeFilename(originalName) {
  const ext = path.extname(originalName).toLowerCase();
  const base = path.basename(originalName, path.extname(originalName));
  const safeBase = base
    .normalize('NFKD')
    .replace(/[^\w.\- ]+/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 150);
  const finalBase = safeBase.length > 0 ? safeBase : `foto-${Date.now()}`;
  return `${finalBase}${ext}`;
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

module.exports = { listImages, sanitizeFilename, resolveImagePath };
