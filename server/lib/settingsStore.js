'use strict';

const {
  SETTINGS_FILE,
  DATA_BACKEND,
  DEFAULT_INTERVAL_SECONDS,
  MIN_INTERVAL_SECONDS,
  MAX_INTERVAL_SECONDS,
} = require('../config');
const localJson = require('./jsonStore');
const { getRedis } = require('./redisClient');

const REDIS_KEY = 'ellera:settings';

async function readRaw() {
  if (DATA_BACKEND === 'redis') {
    const settings = await getRedis().get(REDIS_KEY);
    return settings || { intervalSeconds: DEFAULT_INTERVAL_SECONDS };
  }
  return localJson.readJson(SETTINGS_FILE, { intervalSeconds: DEFAULT_INTERVAL_SECONDS });
}

async function writeRaw(settings) {
  if (DATA_BACKEND === 'redis') {
    await getRedis().set(REDIS_KEY, settings);
    return;
  }
  localJson.writeJson(SETTINGS_FILE, settings);
}

async function getSettings() {
  const settings = await readRaw();
  if (
    typeof settings.intervalSeconds !== 'number' ||
    !Number.isFinite(settings.intervalSeconds) ||
    settings.intervalSeconds < MIN_INTERVAL_SECONDS
  ) {
    settings.intervalSeconds = DEFAULT_INTERVAL_SECONDS;
  }
  return settings;
}

async function setIntervalSeconds(seconds) {
  const value = Number(seconds);
  if (!Number.isFinite(value) || value < MIN_INTERVAL_SECONDS || value > MAX_INTERVAL_SECONDS) {
    throw new Error(
      `L'intervallo deve essere un numero tra ${MIN_INTERVAL_SECONDS} e ${MAX_INTERVAL_SECONDS} secondi.`
    );
  }
  const settings = await getSettings();
  settings.intervalSeconds = value;
  await writeRaw(settings);
  return settings;
}

module.exports = { getSettings, setIntervalSeconds };
