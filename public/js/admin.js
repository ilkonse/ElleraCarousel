(() => {
  'use strict';

  const AJAX_HEADER = { 'X-Ellera-Admin': '1' };

  const loginView = document.getElementById('login-view');
  const dashboardView = document.getElementById('dashboard-view');
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');
  const sessionEmail = document.getElementById('session-email');
  const logoutBtn = document.getElementById('logout-btn');

  const settingsForm = document.getElementById('settings-form');
  const intervalInput = document.getElementById('interval-input');
  const settingsStatus = document.getElementById('settings-status');

  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');
  const dropzoneLabel = document.getElementById('dropzone-label');
  const uploadStatus = document.getElementById('upload-status');

  const gallery = document.getElementById('gallery');

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

  function showLogin() {
    loginView.hidden = false;
    dashboardView.hidden = true;
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

  // --- Impostazioni ---
  settingsForm.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    showStatus(settingsStatus, '', false);
    const value = Number(intervalInput.value);
    try {
      await api('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intervalSeconds: value }),
      });
      showStatus(settingsStatus, 'Salvato.', false);
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
      showStatus(uploadStatus, `Caricate ${result.uploaded.length} foto.`, false);
      renderGallery(result.images);
    } catch (err) {
      showStatus(uploadStatus, err.message, true);
    } finally {
      fileInput.value = '';
    }
  }

  fileInput.addEventListener('change', () => uploadFiles(fileInput.files));

  ['dragenter', 'dragover'].forEach((evtName) => {
    dropzone.addEventListener(evtName, (ev) => {
      ev.preventDefault();
      dropzone.classList.add('is-dragover');
    });
  });
  ['dragleave', 'drop'].forEach((evtName) => {
    dropzone.addEventListener(evtName, (ev) => {
      ev.preventDefault();
      dropzone.classList.remove('is-dragover');
    });
  });
  dropzone.addEventListener('drop', (ev) => {
    const dt = ev.dataTransfer;
    if (dt && dt.files && dt.files.length > 0) {
      uploadFiles(dt.files);
    }
  });

  // --- Galleria + eliminazione (conferma inline, niente confirm() nativo) ---
  function renderGallery(images) {
    gallery.innerHTML = '';
    if (!images || images.length === 0) {
      gallery.innerHTML = '<p class="empty-gallery">Nessuna foto caricata.</p>';
      return;
    }
    images.forEach((image) => {
      gallery.appendChild(buildPhotoCard(image));
    });
  }

  function buildPhotoCard({ filename, url }) {
    const card = document.createElement('div');
    card.className = 'photo-card';

    const img = document.createElement('img');
    img.className = 'thumb';
    img.src = url;
    img.alt = filename;
    img.loading = 'lazy';

    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = filename;

    const actions = document.createElement('div');
    actions.className = 'actions';

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn-danger';
    deleteBtn.textContent = 'Elimina';

    const confirmRow = document.createElement('div');
    confirmRow.className = 'confirm-row';
    confirmRow.hidden = true;

    const confirmText = document.createElement('span');
    confirmText.textContent = 'Eliminare?';

    const confirmYes = document.createElement('button');
    confirmYes.type = 'button';
    confirmYes.className = 'btn-danger';
    confirmYes.textContent = 'Sì';

    const confirmNo = document.createElement('button');
    confirmNo.type = 'button';
    confirmNo.className = 'btn-secondary btn-cancel';
    confirmNo.textContent = 'Annulla';

    deleteBtn.addEventListener('click', () => {
      actions.hidden = true;
      confirmRow.hidden = false;
    });
    confirmNo.addEventListener('click', () => {
      confirmRow.hidden = true;
      actions.hidden = false;
    });
    confirmYes.addEventListener('click', async () => {
      confirmYes.disabled = true;
      confirmNo.disabled = true;
      try {
        const result = await api(`/api/admin/images/${encodeURIComponent(filename)}`, {
          method: 'DELETE',
        });
        renderGallery(result.images);
      } catch (err) {
        showStatus(uploadStatus, err.message, true);
        confirmRow.hidden = true;
        actions.hidden = false;
        confirmYes.disabled = false;
        confirmNo.disabled = false;
      }
    });

    actions.appendChild(deleteBtn);
    confirmRow.appendChild(confirmText);
    confirmRow.appendChild(confirmYes);
    confirmRow.appendChild(confirmNo);

    card.appendChild(img);
    card.appendChild(meta);
    card.appendChild(actions);
    card.appendChild(confirmRow);
    return card;
  }

  async function loadDashboard() {
    try {
      const data = await api('/api/admin/images');
      intervalInput.value = data.settings.intervalSeconds;
      renderGallery(data.images);
    } catch (err) {
      showStatus(uploadStatus, err.message, true);
    }
  }

  checkSession();
})();
