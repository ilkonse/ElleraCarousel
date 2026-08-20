'use strict';

const { put, list, del } = require('@vercel/blob');
const { sanitizeFilename, nextAvailableName } = require('./sanitize');

const PREFIX = 'images/';

function filenameFromPathname(pathname) {
  return pathname.startsWith(PREFIX) ? pathname.slice(PREFIX.length) : pathname;
}

/**
 * Elenca le immagini caricate su Vercel Blob, ordinate in ordine
 * lessicografico (stesso Array.prototype.sort di default usato dal backend
 * locale) sul nome file, non sull'URL del blob.
 */
async function listImages() {
  const { blobs } = await list({ prefix: PREFIX });
  const urlByFilename = new Map(blobs.map((b) => [filenameFromPathname(b.pathname), b.url]));
  const filenames = [...urlByFilename.keys()].sort();
  return filenames.map((filename) => ({ filename, url: urlByFilename.get(filename) }));
}

async function saveImage(buffer, originalName, mimetype) {
  const base = sanitizeFilename(originalName);
  const { blobs } = await list({ prefix: PREFIX });
  const existing = new Set(blobs.map((b) => filenameFromPathname(b.pathname)));
  const filename = nextAvailableName(base, existing);
  const blob = await put(PREFIX + filename, buffer, {
    access: 'public',
    contentType: mimetype,
    addRandomSuffix: false,
  });
  return { filename, url: blob.url };
}

async function deleteImage(filename) {
  const { blobs } = await list({ prefix: PREFIX });
  const match = blobs.find((b) => filenameFromPathname(b.pathname) === filename);
  if (!match) {
    const err = new Error('File non trovato.');
    err.code = 'ENOENT';
    throw err;
  }
  await del(match.url);
}

module.exports = { listImages, saveImage, deleteImage };
