'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Legge un file JSON in modo sincrono, restituendo un valore di default
 * se il file non esiste o è corrotto/vuoto.
 */
function readJson(filePath, defaultValue) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return defaultValue;
    // File corrotto: non sovrascriverlo automaticamente, meglio far fallire
    // rumorosamente così l'amministratore se ne accorge.
    throw new Error(`Impossibile leggere ${filePath}: ${err.message}`);
  }
}

/**
 * Scrive un file JSON in modo atomico (scrive su file temporaneo poi rinomina),
 * per evitare file corrotti in caso di scritture concorrenti o crash a metà scrittura.
 */
function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(value, null, 2), 'utf8');
  fs.renameSync(tmpPath, filePath);
}

module.exports = { readJson, writeJson };
