const apiInput = document.getElementById('api-base');
const apiForm = document.getElementById('api-config');
const thoughtForm = document.getElementById('thought-form');
const thoughtInput = document.getElementById('thought-text');
const formStatus = document.getElementById('form-status');
const lastUpdated = document.getElementById('last-updated');
const refreshBtn = document.getElementById('refresh-btn');
const thoughtsView = document.getElementById('thoughts-view');

const STORAGE_KEY = 'thoughtsConsole.apiBase';
let pollTimer = null;

init();

function init() {
  const urlParam = new URLSearchParams(window.location.search).get('api');
  const stored = window.localStorage.getItem(STORAGE_KEY);
  const globalBase =
    typeof window !== 'undefined'
      ? window.__API_BASE__ || window.API_BASE
      : '';

  apiInput.value = normalizeBase(urlParam || globalBase || stored || '');

  apiForm.addEventListener('submit', (event) => {
    event.preventDefault();
    persistApiBase();
    manualRefresh();
  });

  apiInput.addEventListener('change', () => {
    persistApiBase();
    manualRefresh();
  });

  thoughtForm.addEventListener('submit', handleThoughtSubmit);
  refreshBtn.addEventListener('click', manualRefresh);

  manualRefresh();
}

function persistApiBase() {
  const base = normalizeBase(apiInput.value);
  apiInput.value = base;
  window.localStorage.setItem(STORAGE_KEY, base);
}

function normalizeBase(value) {
  return (value || '').trim().replace(/\/$/, '');
}

function resolve(path) {
  const base = normalizeBase(apiInput.value);
  if (!path.startsWith('/')) {
    throw new Error('Path must start with "/"');
  }
  return base ? `${base}${path}` : path;
}

async function handleThoughtSubmit(event) {
  event.preventDefault();
  const text = thoughtInput.value.trim();
  if (!text) return;

  setFormPending(true, 'Saving…');

  try {
    const res = await fetch(resolve('/api/thoughts'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) {
      const data = await safeJson(res);
      throw new Error(data?.error || `Request failed (${res.status})`);
    }

    thoughtInput.value = '';
    setFormPending(false, 'Saved!');
    manualRefresh();
  } catch (error) {
    console.error(error);
    setFormPending(false, error.message || 'Failed to save thought');
  }
}

function setFormPending(pending, message = '') {
  thoughtInput.disabled = pending;
  refreshBtn.disabled = pending;
  (thoughtForm.querySelector('button[type="submit"]')).disabled = pending;
  formStatus.textContent = message;
  if (!pending && message) {
    setTimeout(() => {
      if (formStatus.textContent === message) {
        formStatus.textContent = '';
      }
    }, 2000);
  }
}

async function manualRefresh() {
  clearInterval(pollTimer);
  await loadThoughts();
  pollTimer = window.setInterval(loadThoughts, 8000);
}

async function loadThoughts() {
  thoughtsView.innerHTML = '<div class="empty-state">Loading…</div>';
  try {
    const res = await fetch(resolve('/api/thoughts/recent'));
    if (!res.ok) {
      const data = await safeJson(res);
      throw new Error(data?.error || `Request failed (${res.status})`);
    }
    const data = await res.json();
    renderThoughts(Array.isArray(data.thoughts) ? data.thoughts : []);
    const now = new Date();
    lastUpdated.textContent = `Updated ${now.toLocaleTimeString()}`;
  } catch (error) {
    console.error(error);
    thoughtsView.innerHTML = `<div class="empty-state">⚠️ ${error.message}</div>`;
    lastUpdated.textContent = '';
  }
}

function renderThoughts(thoughts) {
  if (!thoughts.length) {
    thoughtsView.innerHTML =
      '<div class="empty-state">No thoughts found yet.</div>';
    return;
  }

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  thead.innerHTML = `
    <tr>
      <th>ID</th>
      <th>Text</th>
      <th>Created</th>
      <th>Connections</th>
    </tr>
  `;
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  thoughts.forEach((thought) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${thought.id}</td>
      <td>${escapeHtml(thought.text)}</td>
      <td>${formatDate(thought.createdAt || thought.created_at)}</td>
      <td>${thought.connectionCount ?? '—'}</td>
    `;
    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  thoughtsView.innerHTML = '';
  thoughtsView.appendChild(table);
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function escapeHtml(value) {
  return (value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

