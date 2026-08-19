(() => {
  'use strict';

  const photoA = document.querySelector('.photo-a');
  const photoB = document.querySelector('.photo-b');
  const emptyState = document.querySelector('.empty-state');

  let images = [];
  let intervalSeconds = 8;
  let currentIndex = -1;
  let activeEl = photoB; // il prossimo giro attiverà photoA per primo
  let advanceTimer = null;
  let refreshTimer = null;

  async function fetchJson(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Richiesta a ${url} fallita (${res.status})`);
    return res.json();
  }

  function preload(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => reject(new Error(`Immagine non caricabile: ${src}`));
      img.src = src;
    });
  }

  async function showNext() {
    if (images.length === 0) {
      emptyState.hidden = false;
      photoA.classList.remove('is-active');
      photoB.classList.remove('is-active');
      return;
    }
    emptyState.hidden = true;

    currentIndex = (currentIndex + 1) % images.length;
    const filename = images[currentIndex];
    const src = `/images/${encodeURIComponent(filename)}`;

    try {
      await preload(src);
    } catch (err) {
      // Immagine non valida/rimossa: la salta al prossimo giro invece di
      // bloccare il carosello su un frame vuoto.
      console.warn(err.message);
      scheduleNext(200);
      return;
    }

    const incoming = activeEl === photoA ? photoB : photoA;
    const outgoing = activeEl;

    incoming.src = src;
    incoming.classList.add('is-active');
    if (outgoing) outgoing.classList.remove('is-active');
    activeEl = incoming;

    scheduleNext(intervalSeconds * 1000);
  }

  function scheduleNext(delayMs) {
    if (advanceTimer) clearTimeout(advanceTimer);
    advanceTimer = setTimeout(showNext, delayMs);
  }

  async function refreshData() {
    try {
      const [imagesRes, settingsRes] = await Promise.all([
        fetchJson('/api/images'),
        fetchJson('/api/settings'),
      ]);
      images = imagesRes.images || [];
      const newInterval = Number(settingsRes.intervalSeconds);
      if (Number.isFinite(newInterval) && newInterval > 0) {
        intervalSeconds = newInterval;
      }
      // Se il carosello era fermo per mancanza di foto, e ora ce ne sono,
      // fallo ripartire.
      if (images.length > 0 && !advanceTimer && currentIndex === -1) {
        showNext();
      }
      if (images.length === 0) {
        emptyState.hidden = false;
      }
    } catch (err) {
      console.warn('Aggiornamento dati carosello fallito:', err.message);
    }
  }

  async function start() {
    await refreshData();
    if (images.length > 0) {
      showNext();
    } else {
      emptyState.hidden = false;
    }
    // Riallinea periodicamente elenco foto e intervallo con quanto impostato
    // dall'amministratore, senza bisogno di ricaricare manualmente la pagina.
    refreshTimer = setInterval(refreshData, 45 * 1000);
  }

  start();
})();
