'use strict';

const { put, list, del, rename } = require('@vercel/blob');
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

async function renameImage(oldFilename, newName) {
  const { blobs } = await list({ prefix: PREFIX });
  const match = blobs.find((b) => filenameFromPathname(b.pathname) === oldFilename);
  if (!match) {
    const err = new Error('File non trovato.');
    err.code = 'ENOENT';
    throw err;
  }
  const base = sanitizeFilename(newName);
  const existing = new Set(
    blobs.map((b) => filenameFromPathname(b.pathname)).filter((f) => f !== oldFilename)
  );
  const filename = nextAvailableName(base, existing);
  const blob = await rename(match.pathname, PREFIX + filename, {
    access: 'public',
    addRandomSuffix: false,
  });
  return { filename, url: blob.url };
}

module.exports = { listImages, saveImage, deleteImage, renameImage };
