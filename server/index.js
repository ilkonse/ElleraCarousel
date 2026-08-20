'use strict';

// Punto d'ingresso per l'esecuzione "tradizionale" (locale, VPS, container):
// avvia il server e resta in ascolto. Su Vercel non viene usato: lì l'app
// Express (server/app.js) viene esportata e invocata come funzione
// serverless da api/index.js, senza mai chiamare listen().
const app = require('./app');
const config = require('./config');

// Si mette in ascolto solo se il file viene eseguito direttamente (node
// server/index.js), non quando viene richiesto come modulo da qualcos'altro
// (per esempio da un eventuale rilevamento automatico dell'entry point da
// parte di una piattaforma di hosting zero-config, che altrimenti finirebbe
// per chiamare .listen() su un modulo non pensato per farlo).
if (require.main === module) {
  app.listen(config.PORT, () => {
    console.log(`${config.SITE_NAME}: server in ascolto su http://localhost:${config.PORT}`);
  });
}
