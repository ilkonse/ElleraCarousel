'use strict';

const session = require('express-session');
const redis = require('./redisClient');

const PREFIX = 'ellera:sess:';
const DEFAULT_TTL_SECONDS = 12 * 60 * 60; // deve combaciare col maxAge del cookie

function ttlSecondsFor(sessionData) {
  const maxAgeMs = sessionData && sessionData.cookie && sessionData.cookie.maxAge;
  if (Number.isFinite(maxAgeMs) && maxAgeMs > 0) {
    return Math.max(60, Math.ceil(maxAgeMs / 1000));
  }
  return DEFAULT_TTL_SECONDS;
}

/**
 * Store di sessione per express-session basato su Redis, necessario su
 * Vercel: le funzioni serverless non condividono memoria tra invocazioni,
 * quindi il MemoryStore di default perderebbe le sessioni ad ogni richiesta
 * gestita da un'istanza diversa.
 */
class KvSessionStore extends session.Store {
  async get(sid, cb) {
    try {
      const data = await redis.getJson(PREFIX + sid);
      cb(null, data || null);
    } catch (err) {
      cb(err);
    }
  }

  async set(sid, sessionData, cb) {
    try {
      await redis.setJson(PREFIX + sid, sessionData, { ex: ttlSecondsFor(sessionData) });
      cb(null);
    } catch (err) {
      cb(err);
    }
  }

  async destroy(sid, cb) {
    try {
      await redis.del(PREFIX + sid);
      cb(null);
    } catch (err) {
      cb(err);
    }
  }

  async touch(sid, sessionData, cb) {
    try {
      await redis.expire(PREFIX + sid, ttlSecondsFor(sessionData));
      cb(null);
    } catch (err) {
      cb(err);
    }
  }
}

module.exports = { KvSessionStore };
