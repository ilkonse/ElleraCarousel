'use strict';

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const session = require('express-session');

const config = require('./config');
const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');

const app = express();

// Se il server gira dietro un reverse proxy TLS (nginx, Vercel, Render, ecc.)
// serve per far riconoscere a Express che la connessione originale è HTTPS,
// così il cookie "secure" funziona correttamente.
if (config.COOKIE_SECURE) {
  app.set('trust proxy', 1);
}

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        // 'data:' per le miniature inline; il dominio Vercel Blob quando le
        // foto sono servite da lì invece che dal nostro /images locale.
        imgSrc: ["'self'", 'data:', 'https://*.public.blob.vercel-storage.com'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

const sessionOptions = {
  name: 'ellera.sid',
  secret: config.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.COOKIE_SECURE,
    maxAge: 12 * 60 * 60 * 1000, // 12 ore
  },
};

// Su ambienti serverless (Vercel) la memoria di processo non è condivisa tra
// invocazioni: serve uno store di sessione persistente (Redis) quando è
// configurato, altrimenti si ricade sul MemoryStore di default di
// express-session (va benissimo per l'uso in locale / su un singolo processo).
if (config.DATA_BACKEND === 'redis') {
  const { KvSessionStore } = require('./lib/kvSessionStore');
  sessionOptions.store = new KvSessionStore();
}

app.use(session(sessionOptions));

// API pubbliche (usate dalla pagina carosello) e admin (protette da sessione).
app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);

// Foto caricate dagli admin, servite come file statici in sola lettura.
// Usato solo dal backend immagini "locale": quando le foto sono su Vercel
// Blob vengono servite direttamente dal loro URL pubblico, questa rotta
// resta semplicemente inutilizzata.
app.use(
  '/images',
  express.static(config.IMAGES_DIR, {
    index: false,
    dotfiles: 'deny',
    maxAge: '1h',
  })
);

// Pagina admin: non collegata dalla navigazione pubblica, ma protetta comunque
// lato API da autenticazione — l'URL "nascosto" non è l'unica difesa.
app.get('/admin', (req, res) => {
  res.sendFile(path.join(config.PUBLIC_DIR, 'admin', 'index.html'));
});

// Tutto il resto (carosello, css, js) come sito statico.
app.use(
  express.static(config.PUBLIC_DIR, {
    index: 'index.html',
    dotfiles: 'deny',
  })
);

app.use((req, res) => {
  res.status(404).type('text').send('Non trovato.');
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Errore interno del server.' });
});

module.exports = app;
