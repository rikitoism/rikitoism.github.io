import { initJournalEditor } from './journal.js';
import { initMemoriesEditor } from './memories.js';
import { initMeTimelineEditor } from './me-timeline.js';
import { initCreationsEditor } from './creations.js';
import { initInfluencesEditor } from './influences.js';

const ROUTES = {
  overview: 'admin-home',
  guestbook: 'guestbook-editor',
  journal: 'journal-editor',
  memories: 'memory-editor',
  timeline: 'timeline-editor',
  influences: 'influence-editor',
  creations: 'creation-editor'
};

export function bootAdmin() {
  const start = () => initializeAdmin();
  if (document.readyState === 'complete') start();
  else document.addEventListener('DOMContentLoaded', start, { once: true });
}

function initializeAdmin() {
  const requiredIds = [
    'connection-message', 'login-panel', 'login-form', 'login-message', 'dashboard', 'admin-home',
    'logout-button', 'journal-form', 'journal-entry-list', 'memory-form', 'memory-list-admin',
    'memory-photo-fields', 'timeline-form', 'timeline-list-admin', 'me-timeline-form',
    'me-timeline-list-admin', 'new-timeline-event', 'guestbook-editor'
  ];
  const missing = requiredIds.filter((id) => !document.getElementById(id));
  if (missing.length) {
    console.error(`Admin could not initialize. Missing elements: ${missing.join(', ')}`);
    return;
  }

  const $ = (id) => document.getElementById(id);
  const supabase = window.soulSupabase;
  const formRecords = [];
  const formLists = new Map();
  const loaders = new Map();
  let draftManager = null;
  let workspaceOpen = false;
  let activeUserId = null;

  function attachMarkdownPreview(textarea) {
    if (!textarea || textarea.dataset.markdownPreview) return;
    textarea.dataset.markdownPreview = 'true';
    const preview = document.createElement('div');
    preview.className = 'markdown-live-preview';
    preview.setAttribute('aria-label', 'Formatted Markdown preview');
    textarea.insertAdjacentElement('afterend', preview);
    const update = () => window.rikitoMarkdown?.set(preview, textarea.value);
    textarea._markdownPreviewUpdate = update;
    textarea.addEventListener('input', update);
    update();
  }

  function refreshMarkdownPreviews(container) {
    container.querySelectorAll('textarea[data-markdown]').forEach((textarea) => {
      attachMarkdownPreview(textarea);
      textarea._markdownPreviewUpdate?.();
    });
  }

  function configureEditorForm(form, list, options = {}) {
    if (!form || !list) return;
    const record = { form, list, ...options };
    formRecords.push(record);
    formLists.set(form, list);
    form.hidden = true;
    list.hidden = false;
    form.addEventListener('reset', () => window.setTimeout(() => refreshMarkdownPreviews(form), 0));
    if (!form.querySelector('[data-cancel-form]')) {
      const cancel = document.createElement('button');
      cancel.className = 'btn btn-outline';
      cancel.type = 'button';
      cancel.dataset.cancelForm = form.getAttribute('id');
      cancel.textContent = 'back to list';
      (form.querySelector('.editor-actions') || form).appendChild(cancel);
    }
  }

  function showEditorForm(form) {
    const list = formLists.get(form);
    if (list) list.hidden = true;
    form.hidden = false;
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function showEditorList(form) {
    form.hidden = true;
    draftManager?.clear(form);
    const list = formLists.get(form);
    if (list) list.hidden = false;
  }

  function verifyEditorDelete(title, messageElement) {
    return verifyDelete(title, messageElement, supabase?.client);
  }

  const ui = {
    $,
    supabase,
    formRecords,
    registerForm: configureEditorForm,
    setLoader: (panelId, loader) => loaders.set(panelId, loader),
    showEditorForm,
    showEditorList,
    refreshMarkdownPreviews,
    attachMarkdownPreview,
    verifyDelete: verifyEditorDelete,
    wordCount,
    uploadImage: (file, folder) => uploadImage(file, folder, supabase?.client),
    escapeHtml,
    rememberUi: (key, value) => draftManager?.rememberUi(key, value),
    readUi: (key, fallback) => draftManager?.readUi(key, fallback),
    onDraftRestore: (callback) => { ui.draftRestoreCallbacks.push(callback); },
    draftRestoreCallbacks: []
  };

  const modules = [
    initJournalEditor(ui),
    initMemoriesEditor(ui),
    initMeTimelineEditor(ui),
    initCreationsEditor(ui),
    initInfluencesEditor(ui)
  ];
  modules.forEach((module) => Object.entries(module?.loaders || {}).forEach(([id, loader]) => {
    const existingLoader = loaders.get(id);
    loaders.set(id, existingLoader
      ? (...args) => Promise.all([existingLoader(...args), loader(...args)])
      : loader);
  }));
  draftManager = createDraftManager(ui);
  setupTimelineSections(ui);
  document.querySelectorAll('textarea[data-markdown]').forEach(attachMarkdownPreview);

  const editorPanels = [...document.querySelectorAll('.editor-panel')];
  const panelToRoute = Object.fromEntries(Object.entries(ROUTES).map(([route, panel]) => [panel, route]));
  const loginPanel = $('login-panel');
  const loginForm = $('login-form');
  const loginMessage = $('login-message');
  const dashboard = $('dashboard');
  const adminHome = $('admin-home');
  const status = $('connection-message');

  function closeOtherEditors(activeId) {
    editorPanels.forEach((panel) => { panel.hidden = panel.id !== activeId; });
    adminHome.hidden = activeId !== 'admin-home';
    document.querySelectorAll('.admin-module[data-open-editor]').forEach((button) => {
      if (button.dataset.openEditor === activeId) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
  }

  function openEditorPanel(activeId, updateHash = true, restoreDraft = false) {
    const editor = $(activeId);
    if (!editor) return;
    closeOtherEditors(activeId);
    formRecords.forEach(({ form, list }) => {
      form.hidden = true;
      list.hidden = false;
      if (!restoreDraft) draftManager?.clear(form);
    });
    editor.hidden = false;
    if (restoreDraft && supabase?.client) draftManager.restore(editor);
    if (updateHash && panelToRoute[activeId]) history.replaceState(null, '', `#${panelToRoute[activeId]}`);
    window.dispatchEvent(new CustomEvent('admin:editor-open', { detail: { panelId: activeId } }));
    if (supabase?.client) loaders.get(activeId)?.();
  }

  function openRouteFromHash(restoreDraft = false) {
    const hash = window.location.hash.slice(1);
    const rememberedPanel = !hash && supabase?.client ? draftManager.read().last?.panelId : null;
    const normalizedRememberedPanel = rememberedPanel === 'me-timeline-editor' ? 'timeline-editor' : rememberedPanel;
    const routePanel = ROUTES[hash] || (hash === 'me-timeline' ? 'timeline-editor' : null);
    openEditorPanel(routePanel || normalizedRememberedPanel || 'admin-home', false, restoreDraft);
  }

  function showLogin() {
    document.body.classList.remove('admin-authenticated');
    workspaceOpen = false;
    loginPanel.hidden = false;
    dashboard.hidden = true;
    adminHome.hidden = true;
    editorPanels.forEach((panel) => { panel.hidden = true; });
  }

  function showWorkspace() {
    if (workspaceOpen) return;
    workspaceOpen = true;
    document.body.classList.add('admin-authenticated');
    loginPanel.hidden = true;
    dashboard.hidden = false;
    openRouteFromHash(true);
  }

  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    const cancel = event.target.closest('[data-cancel-form]');
    if (!cancel) return;
    const form = $(cancel.dataset.cancelForm);
    if (form) showEditorList(form);
  });
  document.querySelectorAll('[data-open-editor]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.openEditor;
      openEditorPanel(id);
      if (!supabase?.client) {
        const message = $(id)?.querySelector('.admin-message');
        if (message) message.textContent = 'Preview only: connect Supabase before saving entries.';
      }
    });
  });
  new MutationObserver((records) => {
    const active = records.map((record) => record.target).find((element) => element.getAttribute('aria-current') === 'page');
    if (active && window.matchMedia('(max-width: 820px)').matches) {
      active.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    }
  }).observe(dashboard, { attributes: true, attributeFilter: ['aria-current'], subtree: true });
  window.addEventListener('hashchange', () => openRouteFromHash(false));
  initializeTheme();

  if (!supabase?.configured || !supabase.client) {
    status.textContent = 'Supabase is not configured yet. Add js/supabase-config.js after creating your project.';
    dashboard.hidden = false;
    adminHome.hidden = false;
    return;
  }

  status.textContent = 'Supabase is connected. Sign in with an authenticated admin account.';
  showLogin();
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    loginMessage.textContent = 'signing in...';
    const formData = new FormData(loginForm);
    const { error } = await supabase.client.auth.signInWithPassword({ email: formData.get('email'), password: formData.get('password') });
    loginMessage.textContent = error ? error.message : '';
  });
  $('logout-button').addEventListener('click', async () => {
    draftManager.clearAll();
    const { error } = await supabase.client.auth.signOut();
    if (error) loginMessage.textContent = error.message;
    showLogin();
  });
  supabase.client.auth.onAuthStateChange((_event, session) => {
    if (!session) { activeUserId = null; showLogin(); return; }
    if (workspaceOpen && activeUserId === session.user.id) return;
    activeUserId = session.user.id;
    showWorkspace();
  });
  supabase.client.auth.getSession().then(({ data, error }) => {
    if (error) { loginMessage.textContent = error.message; return; }
    if (data.session) {
      activeUserId = data.session.user.id;
      showWorkspace();
    }
  });
}

function initializeTheme() {
  const root = document.documentElement;
  const toggle = document.getElementById('admin-theme-toggle');
  if (!toggle) return;
  let savedTheme = null;
  try { savedTheme = localStorage.getItem('rikitoism-admin-theme'); } catch (error) { /* optional preference */ }
  const systemTheme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  const setTheme = (theme, persist = false) => {
    root.dataset.adminTheme = theme;
    toggle.setAttribute('aria-pressed', String(theme === 'dark'));
    toggle.textContent = theme === 'dark' ? 'Use light theme' : 'Use dark theme';
    if (persist) {
      try { localStorage.setItem('rikitoism-admin-theme', theme); } catch (error) { /* page preference still applies */ }
    }
  };
  setTheme(savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : systemTheme);
  toggle.addEventListener('click', () => setTheme(root.dataset.adminTheme === 'dark' ? 'light' : 'dark', true));
}

function setupTimelineSections(ui) {
  const tabs = [...document.querySelectorAll('[data-timeline-tab]')];
  const sections = [...document.querySelectorAll('[data-timeline-section]')];
  if (!tabs.length || !sections.length) return;
  const showSection = (section, persist = false) => {
    const active = sections.some((item) => item.dataset.timelineSection === section) ? section : 'life';
    tabs.forEach((tab) => tab.setAttribute('aria-pressed', String(tab.dataset.timelineTab === active)));
    sections.forEach((item) => { item.hidden = item.dataset.timelineSection !== active; });
    if (persist) ui.rememberUi('timelineSection', active);
  };
  tabs.forEach((tab) => tab.addEventListener('click', () => showSection(tab.dataset.timelineTab, true)));
  showSection(ui.readUi('timelineSection', 'life'));
}

async function verifyDelete(title, messageElement, client) {
  if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return false;
  const password = window.prompt('Enter your admin password to confirm deletion:');
  if (!password) { messageElement.textContent = 'Deletion cancelled.'; return false; }
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user?.email) { messageElement.textContent = 'Your session could not be verified.'; return false; }
  const { error } = await client.auth.signInWithPassword({ email: userData.user.email, password });
  if (error) { messageElement.textContent = 'Password verification failed. Nothing was deleted.'; return false; }
  return true;
}

function wordCount(value) {
  return value ? value.split(/\s+/).filter(Boolean).length : 0;
}

async function uploadImage(file, folder, client) {
  const extension = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : 'jpg';
  const path = `${folder}/${crypto.randomUUID()}.${extension}`;
  const { error } = await client.storage.from('memory-media').upload(path, file, { cacheControl: '3600', upsert: false });
  if (error) throw new Error(`Image upload failed: ${error.message}`);
  return client.storage.from('memory-media').getPublicUrl(path).data.publicUrl;
}

function escapeHtml(value) {
  const element = document.createElement('span');
  element.textContent = String(value ?? '');
  return element.innerHTML;
}

function createDraftManager(ui) {
  const key = 'rikitoism-admin-drafts-v1';
  const maxAge = 14 * 24 * 60 * 60 * 1000;
  const dirtyForms = new Set();
  let restoring = false;
  let timer = null;

  function read() {
    try {
      const stored = JSON.parse(localStorage.getItem(key)) || {};
      const forms = stored.forms || {};
      Object.keys(forms).forEach((id) => { if (Date.now() - (forms[id].savedAt || 0) > maxAge) delete forms[id]; });
      return { forms, last: stored.last || null, ui: stored.ui || {} };
    } catch (error) { return { forms: {}, last: null, ui: {} }; }
  }
  function write(value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (error) { /* editing continues without draft storage */ } }
  function clearAll() { try { localStorage.removeItem(key); } catch (error) { /* optional storage */ } }
  function capture(record) {
    const { form } = record;
    const values = {};
    [...form.elements].forEach((element) => {
      if (!element.name || ['file', 'password', 'submit', 'button'].includes(element.type)) return;
      if (element.closest('#memory-photo-fields, #creation-blocks')) return;
      if (element.type === 'checkbox') values[element.name] = element.checked;
      else if (element.type !== 'radio' || element.checked) values[element.name] = element.value;
    });
    return { values, panelId: form.closest('.editor-panel')?.id || null, savedAt: Date.now(), extra: record.captureExtra?.() };
  }
  function save(form) {
    if (restoring || !form || form.hidden || !ui.supabase?.client) return;
    const drafts = read();
    const record = ui.formRecords.find((item) => item.form === form);
    if (!record) return;
    const draft = capture(record);
      const formId = form.getAttribute('id');
      drafts.forms[formId] = draft;
      drafts.last = { panelId: draft.panelId, formId };
    write(drafts);
  }
  function clear(form) {
    const formId = form?.getAttribute('id');
    if (!ui.supabase?.client || !formId) return;
    dirtyForms.delete(form);
    const drafts = read();
    delete drafts.forms[formId];
    if (drafts.last?.formId === formId) drafts.last = null;
    write(drafts);
  }
  function flush() {
    clearTimeout(timer);
    dirtyForms.forEach(save);
    dirtyForms.clear();
  }
  function restoreForm(record, draft) {
    restoring = true;
    try {
      const { form } = record;
      form.reset();
      Object.entries(draft.values || {}).forEach(([name, value]) => {
        const field = form.elements[name];
        if (!field || (typeof field.length === 'number' && field.tagName !== 'SELECT')) return;
        if (field.type === 'checkbox') field.checked = Boolean(value);
        else field.value = value;
      });
      record.restoreExtra?.(draft.extra);
      ui.refreshMarkdownPreviews(form);
      record.afterRestore?.();
      ui.draftRestoreCallbacks.forEach((callback) => callback(form, draft));
      record.list.hidden = true;
      form.hidden = false;
      const message = form.querySelector('.admin-message');
      if (message) message.textContent = 'Restored your unsaved draft.';
    } finally { restoring = false; }
  }

  ui.formRecords.forEach((record) => {
    const { form } = record;
    form.addEventListener('input', () => schedule(form));
    form.addEventListener('change', () => schedule(form));
    form.addEventListener('click', () => window.setTimeout(() => { if (!form.hidden) schedule(form); }, 0));
  });
  function schedule(form) {
    dirtyForms.add(form);
    clearTimeout(timer);
    timer = setTimeout(flush, 350);
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
  window.addEventListener('pagehide', flush);

  return {
    read,
    save,
    clear,
    clearAll,
    rememberUi(name, value) { const drafts = read(); drafts.ui[name] = value; write(drafts); },
    readUi(name, fallback) { return read().ui[name] ?? fallback; },
    restore(editor) {
      const drafts = read();
      ui.formRecords.forEach((record) => {
        const draft = drafts.forms[record.form.getAttribute('id')];
        if (draft && editor.contains(record.form)) restoreForm(record, draft);
      });
    }
  };
}
