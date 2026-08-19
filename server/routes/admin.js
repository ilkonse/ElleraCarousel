'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const rateLimit = require('express-rate-limit');

const {
  IMAGES_DIR,
  IMAGE_MIME_TYPES,
  IMAGE_EXTENSIONS,
  MAX_UPLOAD_BYTES,
} = require('../config');
const { findByEmail } = require('../lib/adminsStore');
const { listImages, sanitizeFilename, resolveImagePath } = require('../lib/images');
const { getSettings, setIntervalSeconds } = require('../lib/settingsStore');
const { requireAuth } = require('../middleware/requireAuth');
const { requireAjax } = require('../middleware/requireAjax');

const router = express.Router();

// Hash bcrypt "fittizio" valido, usato solo per far eseguire un confronto
// bcrypt a vuoto quando l'email non esiste: senza questo, il login su
// un'email inesistente risponderebbe più in fretta di uno su un'email
// esistente ma con password sbagliata, rivelando quali email sono admin.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('dummy-password-for-constant-time-compare', 10);

// --- Login: pochi tentativi per IP, per rendere impraticabile il brute force. ---
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Troppi tentativi di accesso. Riprova tra qualche minuto.' },
});

router.post('/login', loginLimiter, requireAjax, async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email e password sono obbligatorie.' });
  }

  const admin = findByEmail(email);
  // Messaggio identico sia se l'email non esiste sia se la password è errata,
  // per non rivelare quali email sono registrate come admin.
  const genericError = { error: 'Credenziali non valide.' };
  if (!admin) {
    // Esegue comunque un confronto bcrypt "a vuoto" per non far trapelare
    // tramite il tempo di risposta quali email esistono.
    await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
    return res.status(401).json(genericError);
  }

  const ok = await bcrypt.compare(password, admin.passwordHash);
  if (!ok) {
    return res.status(401).json(genericError);
  }

  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ error: 'Errore interno, riprova.' });
    req.session.adminId = admin.id;
    req.session.email = admin.email;
    res.json({ ok: true, email: admin.email });
  });
});

router.post('/logout', requireAjax, (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('ellera.sid');
    res.json({ ok: true });
  });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ email: req.session.email });
});

// --- Impostazioni carosello ---
router.post('/settings', requireAuth, requireAjax, (req, res) => {
  try {
    const settings = setIntervalSeconds(req.body && req.body.intervalSeconds);
    res.json(settings);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- Upload immagini ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
    cb(null, IMAGES_DIR);
  },
  filename: (req, file, cb) => {
    const base = sanitizeFilename(file.originalname);
    const ext = path.extname(base);
    const stem = base.slice(0, base.length - ext.length);
    let candidate = base;
    let n = 2;
    // Evita di sovrascrivere silenziosamente una foto esistente con lo stesso nome.
    while (fs.existsSync(path.join(IMAGES_DIR, candidate))) {
      candidate = `${stem}-${n}${ext}`;
      n += 1;
    }
    cb(null, candidate);
  },
});

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!IMAGE_MIME_TYPES.has(file.mimetype) || !IMAGE_EXTENSIONS.has(ext)) {
    return cb(new Error('Formato non supportato. Usa JPG, PNG, WEBP o GIF.'));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 30 },
});

const MULTER_ERROR_MESSAGES = {
  LIMIT_FILE_SIZE: `Ogni file può essere al massimo ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB.`,
  LIMIT_FILE_COUNT: 'Puoi caricare al massimo 30 file per volta.',
  LIMIT_UNEXPECTED_FILE: 'Campo di upload inatteso.',
};

router.post('/images', requireAuth, requireAjax, (req, res) => {
  upload.array('photos', 30)(req, res, (err) => {
    if (err) {
      const message = MULTER_ERROR_MESSAGES[err.code] || err.message || 'Upload fallito.';
      return res.status(400).json({ error: message });
    }
    const files = (req.files || []).map((f) => f.filename);
    res.json({ ok: true, uploaded: files, images: listImages() });
  });
});

// --- Eliminazione immagine ---
router.delete('/images/:filename', requireAuth, requireAjax, (req, res) => {
  let fullPath;
  try {
    fullPath = resolveImagePath(req.params.filename);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
  fs.unlink(fullPath, (err) => {
    if (err) {
      if (err.code === 'ENOENT') return res.status(404).json({ error: 'File non trovato.' });
      return res.status(500).json({ error: 'Impossibile eliminare il file.' });
    }
    res.json({ ok: true, images: listImages() });
  });
});

// --- Lista immagini (vista admin, identica a quella pubblica ma dietro login) ---
router.get('/images', requireAuth, (req, res) => {
  res.json({ images: listImages(), settings: getSettings() });
});

module.exports = router;
