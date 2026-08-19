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
};
