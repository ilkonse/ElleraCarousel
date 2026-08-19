'use strict';

const {
  SETTINGS_FILE,
  DEFAULT_INTERVAL_SECONDS,
  MIN_INTERVAL_SECONDS,
  MAX_INTERVAL_SECONDS,
} = require('../config');
const { readJson, writeJson } = require('./jsonStore');

function getSettings() {
  const settings = readJson(SETTINGS_FILE, { intervalSeconds: DEFAULT_INTERVAL_SECONDS });
  if (
    typeof settings.intervalSeconds !== 'number' ||
    !Number.isFinite(settings.intervalSeconds) ||
    settings.intervalSeconds < MIN_INTERVAL_SECONDS
  ) {
    settings.intervalSeconds = DEFAULT_INTERVAL_SECONDS;
  }
  return settings;
}

function setIntervalSeconds(seconds) {
  const value = Number(seconds);
  if (!Number.isFinite(value) || value < MIN_INTERVAL_SECONDS || value > MAX_INTERVAL_SECONDS) {
    throw new Error(
      `L'intervallo deve essere un numero tra ${MIN_INTERVAL_SECONDS} e ${MAX_INTERVAL_SECONDS} secondi.`
    );
  }
  const settings = getSettings();
  settings.intervalSeconds = value;
  writeJson(SETTINGS_FILE, settings);
  return settings;
}

module.exports = { getSettings, setIntervalSeconds };
