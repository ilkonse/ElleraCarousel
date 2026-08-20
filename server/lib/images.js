'use strict';

// Seleziona il backend di storage per le foto in base alla configurazione:
// "blob" (Vercel Blob) quando è collegato su Vercel, "local" (disco) altrimenti.
// Entrambi espongono la stessa interfaccia async: listImages, saveImage, deleteImage.
const { IMAGE_BACKEND } = require('../config');
const { sanitizeFilename } = require('./storage/sanitize');

const impl =
  IMAGE_BACKEND === 'blob' ? require('./storage/blobImages') : require('./storage/localImages');

module.exports = {
  listImages: impl.listImages,
  saveImage: impl.saveImage,
  deleteImage: impl.deleteImage,
  sanitizeFilename,
};
