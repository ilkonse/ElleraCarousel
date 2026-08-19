'use strict';

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const session = require('express-session');

const config = require('./config');
const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');

const app = express();

// Se il server gira dietro un reverse proxy TLS (nginx, Render, ecc.) serve
// per far riconoscere a Express che la connessione originale è HTTPS, così
// il cookie "secure" funziona correttamente.
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
        imgSrc: ["'self'", 'data:'],
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

app.use(
  session({
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
  })
);

// API pubbliche (usate dalla pagina carosello) e admin (protette da sessione).
app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);

// Foto caricate dagli admin, servite come file statici in sola lettura.
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

app.listen(config.PORT, () => {
  console.log(`${config.SITE_NAME}: server in ascolto su http://localhost:${config.PORT}`);
});
