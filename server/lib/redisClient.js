'use strict';

const { REDIS_NATIVE_URL, REDIS_REST_URL, REDIS_REST_TOKEN } = require('../config');

// Normalizza due possibili integrazioni Redis dietro le stesse quattro
// operazioni (getJson, setJson, del, expire), usate da adminsStore,
// settingsStore e kvSessionStore. Va usato solo quando
// config.DATA_BACKEND === 'redis'.
let client = null;
let mode = null; // 'ioredis' | 'upstash'

function init() {
  if (client) return;
  if (REDIS_NATIVE_URL) {
    const Redis = require('ioredis');
    client = new Redis(REDIS_NATIVE_URL);
    mode = 'ioredis';
    return;
  }
  if (REDIS_REST_URL && REDIS_REST_TOKEN) {
    const { Redis } = require('@upstash/redis');
    client = new Redis({ url: REDIS_REST_URL, token: REDIS_REST_TOKEN });
    mode = 'upstash';
    return;
  }
  throw new Error('Nessun backend Redis configurato.');
}

async function getJson(key) {
  init();
  if (mode === 'ioredis') {
    const raw = await client.get(key);
    return raw === null ? null : JSON.parse(raw);
  }
  // @upstash/redis (client REST) deserializza già l'oggetto da solo.
  const val = await client.get(key);
  return val === undefined ? null : val;
}

async function setJson(key, value, { ex } = {}) {
  init();
  if (mode === 'ioredis') {
    const raw = JSON.stringify(value);
    if (ex) await client.set(key, raw, 'EX', ex);
    else await client.set(key, raw);
    return;
  }
  if (ex) await client.set(key, value, { ex });
  else await client.set(key, value);
}

async function del(key) {
  init();
  await client.del(key);
}

async function expire(key, seconds) {
  init();
  await client.expire(key, seconds);
}

module.exports = { getJson, setJson, del, expire };
