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
    const src = images[currentIndex].url;

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
    // Intervallo breve apposta: chi cambia l'ordine, nasconde/mostra o carica
    // una foto dal pannello vuole vederlo riflesso sullo schermo in sede
    // quasi subito. Le due richieste di controllo sono leggere (solo elenco
    // file + un numero), non le foto vere e proprie: un polling frequente
    // costa pochissimo. Un vero push (WebSocket/SSE) richiederebbe una
    // connessione tenuta aperta, che su funzioni serverless si spegne e
    // riconnette di continuo (costa di più e non è più affidabile) senza un
    // reale guadagno percepibile per un carosello di foto.
    refreshTimer = setInterval(refreshData, 3 * 1000);
  }

  // Se lo schermo si riattiva dopo essere rimasto in background (i browser
  // rallentano i timer delle schede non visibili), riallinea subito invece
  // di aspettare il prossimo giro di polling.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refreshData();
  });

  start();
})();
