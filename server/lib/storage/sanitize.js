'use strict';

const path = require('path');

/**
 * Trasforma un nome file originale (fornito dall'utente in upload) in un nome
 * sicuro da usare come identificativo: niente separatori di percorso, niente
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
 * Dato un nome file "base" e l'insieme dei nomi già esistenti, restituisce
 * il primo nome disponibile (aggiungendo -2, -3, ... in caso di collisione),
 * per non sovrascrivere silenziosamente una foto già caricata.
 */
function nextAvailableName(base, existingNames) {
  const ext = path.extname(base);
  const stem = base.slice(0, base.length - ext.length);
  let candidate = base;
  let n = 2;
  while (existingNames.has(candidate)) {
    candidate = `${stem}-${n}${ext}`;
    n += 1;
  }
  return candidate;
}

module.exports = { sanitizeFilename, nextAvailableName };
