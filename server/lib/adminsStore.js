'use strict';

const { ADMINS_FILE } = require('../config');
const { readJson, writeJson } = require('./jsonStore');

function loadAdmins() {
  return readJson(ADMINS_FILE, []);
}

function saveAdmins(admins) {
  writeJson(ADMINS_FILE, admins);
}

function findByEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();
  return loadAdmins().find((a) => a.email.toLowerCase() === normalized) || null;
}

function addAdmin({ email, passwordHash }) {
  const admins = loadAdmins();
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
  saveAdmins(admins);
  return admin;
}

module.exports = { loadAdmins, saveAdmins, findByEmail, addAdmin };
