'use strict';

require('dotenv').config();
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const IMAGES_DIR = path.join(DATA_DIR, 'images');
const ADMINS_FILE = path.join(DATA_DIR, 'admins.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20 MB per file
const MIN_INTERVAL_SECONDS = 2;
const MAX_INTERVAL_SECONDS = 3600;
const DEFAULT_INTERVAL_SECONDS = 8;

if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.includes('cambia-questo-valore')) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'SESSION_SECRET non impostato (o lasciato al valore di default) in produzione. ' +
      'Imposta una stringa casuale lunga nella variabile d\'ambiente SESSION_SECRET.'
    );
  }
}

// Backend di storage per foto/dati: rilevati automaticamente dalla presenza
// delle variabili d'ambiente che Vercel inietta quando si collega un Blob
// store e un database Redis (KV) al progetto. In locale, senza queste
// variabili, si usa disco locale + file JSON (comportamento invariato).
// Supporta sia i nomi storici di Vercel KV sia quelli dell'integrazione
// Redis del Vercel Marketplace (Upstash), che possono variare leggermente.
const REDIS_URL =
  process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const REDIS_TOKEN =
  process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';

const DATA_BACKEND = REDIS_URL && REDIS_TOKEN ? 'redis' : 'local';
const IMAGE_BACKEND = process.env.BLOB_READ_WRITE_TOKEN ? 'blob' : 'local';

if (process.env.NODE_ENV === 'production' && process.env.VERCEL) {
  if (DATA_BACKEND === 'local') {
    console.warn(
      'Attenzione: nessun database Redis/KV collegato su Vercel — admin e ' +
      'impostazioni verranno scritti su un filesystem effimero e andranno persi.'
    );
  }
  if (IMAGE_BACKEND === 'local') {
    console.warn(
      'Attenzione: nessun Vercel Blob store collegato — le foto caricate ' +
      'andranno perse ad ogni nuovo deploy o riavvio a freddo.'
    );
  }
}

module.exports = {
  ROOT_DIR,
  DATA_DIR,
  IMAGES_DIR,
  ADMINS_FILE,
  SETTINGS_FILE,
  PUBLIC_DIR,
  IMAGE_EXTENSIONS,
  IMAGE_MIME_TYPES,
  MAX_UPLOAD_BYTES,
  MIN_INTERVAL_SECONDS,
  MAX_INTERVAL_SECONDS,
  DEFAULT_INTERVAL_SECONDS,
  PORT: parseInt(process.env.PORT, 10) || 3000,
  SESSION_SECRET: process.env.SESSION_SECRET || 'dev-only-insecure-secret',
  COOKIE_SECURE: process.env.COOKIE_SECURE === 'true',
  SITE_NAME: process.env.SITE_NAME || 'Ellera Polcanto',
  DATA_BACKEND,
  IMAGE_BACKEND,
  REDIS_URL,
  REDIS_TOKEN,
};
