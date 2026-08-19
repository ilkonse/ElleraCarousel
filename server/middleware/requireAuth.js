'use strict';

/**
 * Blocca l'accesso alle rotte admin se non c'è una sessione autenticata valida.
 */
function requireAuth(req, res, next) {
  if (req.session && req.session.adminId) {
    return next();
  }
  return res.status(401).json({ error: 'Devi effettuare l\'accesso.' });
}

module.exports = { requireAuth };
