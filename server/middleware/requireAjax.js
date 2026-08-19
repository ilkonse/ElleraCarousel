'use strict';

/**
 * Mitigazione CSRF leggera: le richieste che modificano stato (login, upload,
 * delete, salvataggio impostazioni) devono includere questo header custom.
 * Un sito esterno che induce il browser a inviare una richiesta "semplice"
 * (form HTML, <img>, ecc.) non può impostare header custom, quindi la
 * richiesta verrà rifiutata. Va combinato con cookie di sessione SameSite=Lax.
 */
const HEADER_NAME = 'x-ellera-admin';

function requireAjax(req, res, next) {
  if (req.get(HEADER_NAME) === '1') {
    return next();
  }
  return res.status(403).json({ error: 'Richiesta non valida.' });
}

module.exports = { requireAjax, HEADER_NAME };
