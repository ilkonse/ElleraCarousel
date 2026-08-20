'use strict';

// Punto d'ingresso per l'esecuzione "tradizionale" (locale, VPS, container):
// avvia il server e resta in ascolto. Su Vercel non viene usato: lì l'app
// Express (server/app.js) viene esportata e invocata come funzione
// serverless da api/index.js, senza mai chiamare listen().
const app = require('./app');
const config = require('./config');

app.listen(config.PORT, () => {
  console.log(`${config.SITE_NAME}: server in ascolto su http://localhost:${config.PORT}`);
});
