'use strict';

const { ADMINS_FILE, DATA_BACKEND } = require('../config');
const localJson = require('./jsonStore');
const { getRedis } = require('./redisClient');

const REDIS_KEY = 'ellera:admins';

async function loadAdmins() {
  if (DATA_BACKEND === 'redis') {
    const admins = await getRedis().get(REDIS_KEY);
    return admins || [];
  }
  return localJson.readJson(ADMINS_FILE, []);
}

async function saveAdmins(admins) {
  if (DATA_BACKEND === 'redis') {
    await getRedis().set(REDIS_KEY, admins);
    return;
  }
  localJson.writeJson(ADMINS_FILE, admins);
}

async function findByEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();
  const admins = await loadAdmins();
  return admins.find((a) => a.email.toLowerCase() === normalized) || null;
}

async function addAdmin({ email, passwordHash }) {
  const admins = await loadAdmins();
  const normalized = String(email).trim().toLowerCase();
  if (admins.some((a) => a.email.toLowerCase() === normalized)) {
    throw new Error(`Esiste già un admin con l'email ${email}`);
  }
  const admin = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    email: String(email).trim(),
    passwordHash,
    createdAt: new Date().toISOString(),
  };
  admins.push(admin);
  await saveAdmins(admins);
  return admin;
}

module.exports = { loadAdmins, saveAdmins, findByEmail, addAdmin };
