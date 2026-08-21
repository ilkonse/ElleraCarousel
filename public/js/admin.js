(() => {
  'use strict';

  const AJAX_HEADER = { 'X-Ellera-Admin': '1' };
  const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

  // --- Elementi ---
  const loginView = document.getElementById('login-view');
  const dashboardView = document.getElementById('dashboard-view');
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');
  const sessionEmail = document.getElementById('session-email');
  const logoutBtn = document.getElementById('logout-btn');
  const openPublicBtn = document.getElementById('open-public-btn');

  const navFoto = document.getElementById('nav-foto');
  const navCarosello = document.getElementById('nav-carosello');
  const navFotoCount = document.getElementById('nav-foto-count');
  const navCaroselloCount = document.getElementById('nav-carosello-count');
  const sectionFoto = document.getElementById('section-foto');
  const sectionCarosello = document.getElementById('section-carosello');

  const onAirContent = document.getElementById('onair-content');

  const settingsForm = document.getElementById('settings-form');
  const intervalInput = document.getElementById('interval-input');
  const intervalDec = document.getElementById('interval-dec');
  const intervalInc = document.getElementById('interval-inc');
  const settingsStatus = document.getElementById('settings-status');
  const statVisible = document.getElementById('stat-visible');
  const statHidden = document.getElementById('stat-hidden');
  const statCycle = document.getElementById('stat-cycle');

  const fileInput = document.getElementById('file-input');
  const uploadBtn = document.getElementById('upload-btn');
  const uploadStatus = document.getElementById('upload-status');
  const gallery = document.getElementById('gallery');
  const galleryEmpty = document.getElementById('gallery-empty');

  const selectionBar = document.getElementById('selection-bar');
  const selectionLabel = document.getElementById('selection-label');
  const bulkHideBtn = document.getElementById('bulk-hide');
  const bulkShowBtn = document.getElementById('bulk-show');
  const bulkDeleteBtn = document.getElementById('bulk-delete');
  const clearSelectionBtn = document.getElementById('clear-selection');

  // --- Stato lato client ---
  const state = {
    section: 'foto',
    images: [], // [{ filename, url, hidden }], nell'ordine del manifesto
    selected: new Set(),
    renamingFilename: null,
    confirmingFilename: null,
    intervalSeconds: 8,
  };

  let dragFilename = null;
  let onAirIndex = -1;
  let onAirTimer = null;

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  // Deriva un'etichetta più leggibile dal nome file (es. "1_pre-film.jpg" -> "Pre film"),
  // solo per la mini-anteprima "In onda": il nome file vero resta quello mostrato in galleria.
  // Se il file ha un nome tutto numerico (tipico di export da telefono/social,
  // es. "756779734_...731_n.jpg") non resta quasi nulla dopo aver tolto le
  // cifre iniziali: in quel caso mostra il nome file originale invece di
  // un'etichetta di 1-2 lettere poco utile.
  function label(filename) {
    const base = String(filename).replace(/\.[^.]+$/, '').replace(/^[\d\W_]+/, '');
    const words = base.replace(/[-_]+/g, ' ').trim();
    return words.length >= 3 ? words.charAt(0).toUpperCase() + words.slice(1) : filename;
  }

  function showStatus(el, message, isError) {
    el.textContent = message;
    el.classList.toggle('ok', !isError && !!message);
    el.classList.toggle('err', !!isError);
  }

  async function api(url, options = {}) {
    const res = await fetch(url, {
      ...options,
      credentials: 'same-origin',
      headers: { ...(options.headers || {}), ...AJAX_HEADER },
    });
    let data = null;
    try {
      data = await res.json();
    } catch (_) {
      // risposta senza corpo JSON (es. errori generici del server)
    }
    if (!res.ok) {
      const message = (data && data.error) || `Errore (${res.status})`;
      throw new Error(message);
    }
    return data;
  }

  // --- Login / logout ---
  function showLogin() {
    loginView.hidden = false;
    dashboardView.hidden = true;
    stopOnAir();
  }

  function showDashboard(email) {
    loginView.hidden = true;
    dashboardView.hidden = false;
    sessionEmail.textContent = email;
    loadDashboard();
  }

  async function checkSession() {
    try {
      const me = await api('/api/admin/me');
      showDashboard(me.email);
    } catch (_) {
      showLogin();
    }
  }

  loginForm.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    showStatus(loginError, '', false);
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    try {
      const result = await api('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      loginForm.reset();
      showDashboard(result.email);
    } catch (err) {
      showStatus(loginError, err.message, true);
    } finally {
      submitBtn.disabled = false;
    }
  });

  logoutBtn.addEventListener('click', async () => {
    try {
      await api('/api/admin/logout', { method: 'POST' });
    } catch (_) {
      // anche in caso di errore, mostriamo comunque la schermata di login
    }
    showLogin();
  });

  openPublicBtn.addEventListener('click', () => window.open('/', '_blank'));

  // --- Navigazione sezioni ---
  function setSection(section) {
    state.section = section;
    sectionFoto.hidden = section !== 'foto';
    sectionCarosello.hidden = section !== 'carosello';
    navFoto.classList.toggle('is-active', section === 'foto');
    navCarosello.classList.toggle('is-active', section === 'carosello');
  }
  navFoto.addEventListener('click', () => setSection('foto'));
  navCarosello.addEventListener('click', () => setSection('carosello'));

  // --- Caricamento dati iniziale ---
  async function loadDashboard() {
    try {
      const data = await api('/api/admin/images');
      state.images = data.images || [];
      state.intervalSeconds = data.settings.intervalSeconds;
      intervalInput.value = state.intervalSeconds;
      setSection('foto');
      renderAll();
      resyncOnAir();
    } catch (err) {
      showStatus(uploadStatus, err.message, true);
    }
  }

  function visibleImages() {
    return state.images.filter((im) => !im.hidden);
  }

  function renderAll() {
    renderNavCounts();
    renderGallery();
    renderSelectionBar();
    renderStats();
  }

  function renderNavCounts() {
    navFotoCount.textContent = String(state.images.length);
    navCaroselloCount.textContent = `${state.intervalSeconds}s`;
  }

  function renderStats() {
    const vis = visibleImages();
    statVisible.textContent = pad(vis.length);
    statHidden.textContent = pad(state.images.length - vis.length);
    statCycle.textContent = `${vis.length * state.intervalSeconds}s`;
  }

  // --- Riquadro "In onda": mini-ciclo indipendente, stesso principio del
  // carosello pubblico (ogni cliente calcola il proprio stato, non serve
  // sincronizzarli byte per byte). ---
  function renderOnAir() {
    const vis = visibleImages();
    if (vis.length === 0) {
      onAirContent.innerHTML = '<div class="onair-empty">Nessuna foto visibile.</div>';
      return;
    }
    const idx = onAirIndex < 0 ? 0 : onAirIndex % vis.length;
    const img = vis[idx];
    onAirContent.innerHTML = '';
    const thumb = document.createElement('img');
    thumb.className = 'onair-thumb';
    thumb.src = img.url;
    thumb.alt = '';
    const name = document.createElement('div');
    name.className = 'onair-name';
    name.textContent = label(img.filename);
    const counter = document.createElement('div');
    counter.className = 'onair-counter';
    counter.textContent = `${pad(idx + 1)} di ${pad(vis.length)}`;
    onAirContent.appendChild(thumb);
    onAirContent.appendChild(name);
    onAirContent.appendChild(counter);
  }

  function scheduleOnAir() {
    if (onAirTimer) clearTimeout(onAirTimer);
    onAirTimer = setTimeout(showOnAirNext, Math.max(state.intervalSeconds, 2) * 1000);
  }

  function showOnAirNext() {
    const vis = visibleImages();
    if (vis.length === 0) {
      onAirIndex = -1;
      renderOnAir();
      return;
    }
    onAirIndex = (onAirIndex + 1) % vis.length;
    renderOnAir();
    scheduleOnAir();
  }

  function resyncOnAir() {
    onAirIndex = -1;
    showOnAirNext();
  }

  function stopOnAir() {
    if (onAirTimer) clearTimeout(onAirTimer);
    onAirTimer = null;
  }

  // --- Impostazioni carosello ---
  function clampInterval(v) {
    return Math.min(3600, Math.max(2, v));
  }
  intervalDec.addEventListener('click', () => {
    intervalInput.value = clampInterval(Number(intervalInput.value || 0) - 1);
    showStatus(settingsStatus, '', false);
  });
  intervalInc.addEventListener('click', () => {
    intervalInput.value = clampInterval(Number(intervalInput.value || 0) + 1);
    showStatus(settingsStatus, '', false);
  });
  settingsForm.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    showStatus(settingsStatus, '', false);
    const value = Number(intervalInput.value);
    try {
      const settings = await api('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intervalSeconds: value }),
      });
      state.intervalSeconds = settings.intervalSeconds;
      showStatus(settingsStatus, 'Salvato.', false);
      renderNavCounts();
      renderStats();
      resyncOnAir();
    } catch (err) {
      showStatus(settingsStatus, err.message, true);
    }
  });

  // --- Upload ---
  async function uploadFiles(fileList) {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    const formData = new FormData();
    files.forEach((f) => formData.append('photos', f));

    showStatus(uploadStatus, `Caricamento di ${files.length} file…`, false);
    try {
      const result = await api('/api/admin/images', { method: 'POST', body: formData });
      state.images = result.images;
      showStatus(uploadStatus, `Caricate ${result.uploaded.length} foto in fondo alla sequenza.`, false);
      renderAll();
      resyncOnAir();
    } catch (err) {
      showStatus(uploadStatus, err.message, true);
    } finally {
      fileInput.value = '';
    }
  }
  fileInput.addEventListener('change', () => uploadFiles(fileInput.files));

  // Trascinare file dal sistema operativo sul pulsante "+" (o sul riquadro
  // "nessuna foto") li carica; è distinto dal drag interno delle card, che
  // serve invece a riordinare le foto già caricate.
  [uploadBtn, galleryEmpty].forEach((dropTarget) => {
    ['dragenter', 'dragover'].forEach((evtName) => {
      dropTarget.addEventListener(evtName, (ev) => {
        ev.preventDefault();
        dropTarget.classList.add('is-dragover');
      });
    });
    ['dragleave', 'drop'].forEach((evtName) => {
      dropTarget.addEventListener(evtName, (ev) => {
        ev.preventDefault();
        dropTarget.classList.remove('is-dragover');
      });
    });
    dropTarget.addEventListener('drop', (ev) => {
      const dt = ev.dataTransfer;
      if (dt && dt.files && dt.files.length > 0) uploadFiles(dt.files);
    });
  });

  // --- Selezione multipla + azioni di massa ---
  function toggleSelect(filename) {
    if (state.selected.has(filename)) state.selected.delete(filename);
    else state.selected.add(filename);
    renderGallery();
    renderSelectionBar();
  }

  function clearSelection() {
    state.selected.clear();
    renderGallery();
    renderSelectionBar();
  }
  clearSelectionBtn.addEventListener('click', clearSelection);

  async function bulkAction(action) {
    const filenames = [...state.selected];
    if (filenames.length === 0) return;
    try {
      const result = await api('/api/admin/images/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filenames, action }),
      });
      state.images = result.images;
      state.selected.clear();
      const messages = {
        hide: `${filenames.length} foto nascoste.`,
        show: `${filenames.length} foto rimesse in rotazione.`,
        delete: `${filenames.length} foto eliminate.`,
      };
      showStatus(uploadStatus, messages[action] || 'Fatto.', false);
      renderAll();
      resyncOnAir();
    } catch (err) {
      showStatus(uploadStatus, err.message, true);
    }
  }
  bulkHideBtn.addEventListener('click', () => bulkAction('hide'));
  bulkShowBtn.addEventListener('click', () => bulkAction('show'));
  bulkDeleteBtn.addEventListener('click', () => bulkAction('delete'));

  function renderSelectionBar() {
    const count = state.selected.size;
    selectionBar.classList.toggle('is-visible', count > 0);
    selectionLabel.textContent = count === 1 ? '1 foto selezionata' : `${count} foto selezionate`;
    bulkDeleteBtn.textContent = count === 1 ? 'Elimina 1' : `Elimina ${count}`;
  }

  // --- Rinomina ---
  function startRename(filename) {
    state.renamingFilename = filename;
    state.confirmingFilename = null;
    renderGallery();
  }
  function cancelRename() {
    state.renamingFilename = null;
    renderGallery();
  }
  async function saveRename(oldFilename, rawValue) {
    let clean = rawValue.trim().replace(/[\\/:*?"<>|]+/g, '-');
    if (!clean) {
      state.renamingFilename = null;
      renderGallery();
      return;
    }
    // Se il nuovo nome perde l'estensione immagine, la ripristiniamo da
    // quella originale: senza estensione il file non verrebbe più
    // riconosciuto come immagine dal browser.
    const hasKnownExt = IMAGE_EXTENSIONS.some((ext) => clean.toLowerCase().endsWith(ext));
    if (!hasKnownExt) {
      const oldExtMatch = oldFilename.match(/\.[^.]+$/);
      if (oldExtMatch) clean += oldExtMatch[0];
    }
    try {
      const result = await api(`/api/admin/images/${encodeURIComponent(oldFilename)}/rename`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: clean }),
      });
      state.images = result.images;
      state.renamingFilename = null;
      showStatus(uploadStatus, 'Nome aggiornato.', false);
      renderAll();
      resyncOnAir();
    } catch (err) {
      showStatus(uploadStatus, err.message, true);
      state.renamingFilename = null;
      renderGallery();
    }
  }

  // --- Nascondi / mostra singola foto (riusa la rotta bulk con 1 elemento) ---
  async function toggleHidden(image) {
    try {
      const result = await api('/api/admin/images/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filenames: [image.filename], action: image.hidden ? 'show' : 'hide' }),
      });
      state.images = result.images;
      renderAll();
      resyncOnAir();
    } catch (err) {
      showStatus(uploadStatus, err.message, true);
    }
  }

  // --- Eliminazione singola (conferma inline, niente confirm() nativo) ---
  function askDelete(filename) {
    state.confirmingFilename = filename;
    state.renamingFilename = null;
    renderGallery();
  }
  function cancelDelete() {
    state.confirmingFilename = null;
    renderGallery();
  }
  async function confirmDelete(filename) {
    try {
      const result = await api(`/api/admin/images/${encodeURIComponent(filename)}`, { method: 'DELETE' });
      state.images = result.images;
      state.selected.delete(filename);
      state.confirmingFilename = null;
      showStatus(uploadStatus, 'Foto eliminata.', false);
      renderAll();
      resyncOnAir();
    } catch (err) {
      showStatus(uploadStatus, err.message, true);
      state.confirmingFilename = null;
      renderGallery();
    }
  }

  // --- Riordino manuale via drag & drop ---
  function moveTo(filename, targetIndex) {
    const from = state.images.findIndex((im) => im.filename === filename);
    if (from < 0 || from === targetIndex) return;
    const next = state.images.slice();
    const [item] = next.splice(from, 1);
    next.splice(targetIndex, 0, item);
    state.images = next;
    renderGallery();
  }

  async function persistOrder() {
    try {
      const result = await api('/api/admin/images/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: state.images.map((im) => im.filename) }),
      });
      state.images = result.images;
      renderGallery();
    } catch (err) {
      showStatus(uploadStatus, err.message, true);
      await loadDashboard();
    }
  }

  // --- Galleria ---
  function renderGallery() {
    gallery.innerHTML = '';
    galleryEmpty.hidden = state.images.length > 0;
    gallery.hidden = state.images.length === 0;
    if (state.images.length === 0) return;
    state.images.forEach((image, i) => {
      gallery.appendChild(buildPhotoCard(image, i));
    });
  }

  function buildPhotoCard(image, index) {
    const { filename, url, hidden } = image;
    const isSelected = state.selected.has(filename);
    const isRenaming = state.renamingFilename === filename;
    const isConfirming = state.confirmingFilename === filename;

    const card = document.createElement('div');
    card.className = 'photo-card';
    if (isSelected) card.classList.add('is-selected');
    if (state.draggingFilename === filename) card.classList.add('is-dragging');
    card.draggable = !isRenaming;

    card.addEventListener('dragstart', (ev) => {
      dragFilename = filename;
      if (ev.dataTransfer) {
        ev.dataTransfer.effectAllowed = 'move';
        ev.dataTransfer.setData('text/plain', filename);
      }
      card.classList.add('is-dragging');
    });
    card.addEventListener('dragenter', (ev) => {
      ev.preventDefault();
      if (dragFilename && dragFilename !== filename) moveTo(dragFilename, index);
    });
    card.addEventListener('dragover', (ev) => ev.preventDefault());
    card.addEventListener('dragend', () => {
      dragFilename = null;
      card.classList.remove('is-dragging');
      persistOrder();
    });

    const thumbWrap = document.createElement('div');
    thumbWrap.className = 'thumb-wrap';

    const img = document.createElement('img');
    img.className = 'thumb';
    img.src = url;
    img.alt = filename;
    img.loading = 'lazy';
    if (hidden) img.classList.add('is-hidden-photo');

    const selectBtn = document.createElement('button');
    selectBtn.type = 'button';
    selectBtn.className = 'select-btn';
    if (isSelected) selectBtn.classList.add('is-checked');
    selectBtn.title = 'Seleziona';
    selectBtn.textContent = isSelected ? '✓' : '';
    selectBtn.addEventListener('click', () => toggleSelect(filename));

    const posBadge = document.createElement('span');
    posBadge.className = 'position-badge';
    posBadge.textContent = pad(index + 1);

    const dragHandle = document.createElement('span');
    dragHandle.className = 'drag-handle';
    dragHandle.textContent = '⠿';

    // Alternativa al trascinamento per il tocco: le API HTML5 drag&drop non
    // rispondono sui browser mobile, quindi su schermi piccoli (vedi CSS)
    // questi pulsanti prendono il posto della maniglia di trascinamento.
    const moveControls = document.createElement('div');
    moveControls.className = 'move-controls';

    const moveUpBtn = document.createElement('button');
    moveUpBtn.type = 'button';
    moveUpBtn.className = 'move-btn';
    moveUpBtn.title = 'Sposta prima';
    moveUpBtn.textContent = '▲';
    moveUpBtn.disabled = index === 0;
    moveUpBtn.addEventListener('click', () => {
      if (index === 0) return;
      moveTo(filename, index - 1);
      persistOrder();
    });

    const moveDownBtn = document.createElement('button');
    moveDownBtn.type = 'button';
    moveDownBtn.className = 'move-btn';
    moveDownBtn.title = 'Sposta dopo';
    moveDownBtn.textContent = '▼';
    moveDownBtn.disabled = index === state.images.length - 1;
    moveDownBtn.addEventListener('click', () => {
      if (index === state.images.length - 1) return;
      moveTo(filename, index + 1);
      persistOrder();
    });

    moveControls.appendChild(moveUpBtn);
    moveControls.appendChild(moveDownBtn);

    thumbWrap.appendChild(img);
    thumbWrap.appendChild(selectBtn);
    thumbWrap.appendChild(posBadge);
    thumbWrap.appendChild(dragHandle);
    thumbWrap.appendChild(moveControls);

    if (hidden) {
      const hiddenBadge = document.createElement('span');
      hiddenBadge.className = 'hidden-badge';
      hiddenBadge.textContent = 'Nascosta';
      thumbWrap.appendChild(hiddenBadge);
    }

    const body = document.createElement('div');
    body.className = 'card-body';

    if (isRenaming) {
      const form = document.createElement('form');
      form.className = 'rename-form';
      const input = document.createElement('input');
      input.type = 'text';
      input.value = filename;
      input.className = 'rename-input';
      const okBtn = document.createElement('button');
      okBtn.type = 'submit';
      okBtn.className = 'btn-ok';
      okBtn.textContent = 'OK';
      form.addEventListener('submit', (ev) => {
        ev.preventDefault();
        saveRename(filename, input.value);
      });
      form.appendChild(input);
      form.appendChild(okBtn);
      body.appendChild(form);
      requestAnimationFrame(() => {
        input.focus();
        input.select();
      });
    } else {
      const nameEl = document.createElement('div');
      nameEl.className = 'filename';
      nameEl.textContent = filename;
      body.appendChild(nameEl);
    }

    if (isConfirming) {
      const confirmRow = document.createElement('div');
      confirmRow.className = 'confirm-row';
      const confirmText = document.createElement('span');
      confirmText.textContent = 'Eliminare?';
      const confirmYes = document.createElement('button');
      confirmYes.type = 'button';
      confirmYes.className = 'btn-danger-fill';
      confirmYes.textContent = 'Sì';
      confirmYes.addEventListener('click', () => confirmDelete(filename));
      const confirmNo = document.createElement('button');
      confirmNo.type = 'button';
      confirmNo.className = 'btn-cancel';
      confirmNo.textContent = 'Annulla';
      confirmNo.addEventListener('click', cancelDelete);
      confirmRow.appendChild(confirmText);
      confirmRow.appendChild(confirmYes);
      confirmRow.appendChild(confirmNo);
      body.appendChild(confirmRow);
    } else if (!isRenaming) {
      const actionsRow = document.createElement('div');
      actionsRow.className = 'actions-row';

      const split = document.createElement('div');
      split.className = 'actions-split';

      const renameBtn = document.createElement('button');
      renameBtn.type = 'button';
      renameBtn.className = 'action-half';
      renameBtn.textContent = 'Rinomina';
      renameBtn.addEventListener('click', () => startRename(filename));

      const divider = document.createElement('span');
      divider.className = 'action-divider';

      const hideBtn = document.createElement('button');
      hideBtn.type = 'button';
      hideBtn.className = 'action-half';
      const hideDot = document.createElement('span');
      hideDot.className = 'hide-dot';
      if (!hidden) hideDot.classList.add('is-on');
      hideBtn.appendChild(hideDot);
      hideBtn.appendChild(document.createTextNode(hidden ? 'Mostra' : 'Nascondi'));
      hideBtn.addEventListener('click', () => toggleHidden(image));

      split.appendChild(renameBtn);
      split.appendChild(divider);
      split.appendChild(hideBtn);

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'delete-btn';
      deleteBtn.title = 'Elimina';
      deleteBtn.textContent = '✕';
      deleteBtn.addEventListener('click', () => askDelete(filename));

      actionsRow.appendChild(split);
      actionsRow.appendChild(deleteBtn);
      body.appendChild(actionsRow);
    }

    card.appendChild(thumbWrap);
    card.appendChild(body);
    return card;
  }

  checkSession();
})();
