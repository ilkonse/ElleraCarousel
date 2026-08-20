'use strict';

const { Redis } = require('@upstash/redis');
const { REDIS_URL, REDIS_TOKEN } = require('../config');

let client = null;

/**
 * Client Redis (Upstash REST) condiviso, creato solo al primo utilizzo e
 * solo quando le variabili d'ambiente sono presenti (backend "redis").
 * Va usato solo quando config.DATA_BACKEND === 'redis'.
 */
function getRedis() {
  if (!client) {
    client = new Redis({ url: REDIS_URL, token: REDIS_TOKEN });
  }
  return client;
}

module.exports = { getRedis };
