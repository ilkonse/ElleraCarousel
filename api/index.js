'use strict';

// Vercel invoca questo modulo come funzione serverless per ogni richiesta
// (vedi le "rewrites" in vercel.json, che instradano qui tutto il traffico).
// L'app Express è già di per sé una funzione (req, res) => {...}, quindi può
// essere esportata direttamente senza wrapper aggiuntivi.
module.exports = require('../server/app');
