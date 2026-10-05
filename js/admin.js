document.addEventListener('DOMContentLoaded', () => {
  const status = document.getElementById('connection-message');
  const loginPanel = document.getElementById('login-panel');
  const loginForm = document.getElementById('login-form');
  const loginMessage = document.getElementById('login-message');
  const dashboard = document.getElementById('dashboard');
  const adminHome = document.getElementById('admin-home');
  const logoutButton = document.getElementById('logout-button');
  const journalEditor = document.getElementById('journal-editor');
  const journalForm = document.getElementById('journal-form');
  const journalList = document.getElementById('journal-entry-list');
  const journalMessage = document.getElementById('journal-form-message');
  const newJournalEntry = document.getElementById('new-journal-entry');
  const journalBodyInput = journalForm.elements.body;
  const journalBodyPreview = document.getElementById('journal-body-preview');
  const memoryEditor = document.getElementById('memory-editor');
  const memoryForm = document.getElementById('memory-form');
  const memoryListAdmin = document.getElementById('memory-list-admin');
  const memoryPhotoFields = document.getElementById('memory-photo-fields');
  const memoryMessage = document.getElementById('memory-form-message');
  const timelineForm = document.getElementById('timeline-form');
  const timelineListAdmin = document.getElementById('timeline-list-admin');
  const timelineMessage = document.getElementById('timeline-form-message');
  const meTimelineEditor = document.getElementById('me-timeline-editor');
  const meTimelineForm = document.getElementById('me-timeline-form');
  const meTimelineList = document.getElementById('me-timeline-list-admin');
  const meTimelineMessage = document.getElementById('me-timeline-message');
  const timelineToolbar = document.getElementById('new-timeline-event').closest('.admin-toolbar');
  const timelineListWrap = timelineListAdmin.closest('.editor-list-wrap');
  const timelinePanel = document.createElement('section');
  timelinePanel.id = 'timeline-editor';
  timelinePanel.className = 'admin-card editor-panel';
  timelinePanel.hidden = true;
  timelineToolbar.querySelector('.eyebrow-tag').textContent = 'memory timeline';
  timelineToolbar.querySelector('h2').textContent = 'Timeline events';
  timelinePanel.append(timelineToolbar, timelineForm, timelineListWrap);
  memoryEditor.querySelector('.divider')?.remove();
  document.querySelector('.admin-content').insertBefore(timelinePanel, document.getElementById('guestbook-editor'));
  const supabaseState = window.soulSupabase;
  let workspaceOpen = false;   // true once the signed-in workspace is on screen
  let activeUserId = null;     // who the workspace was opened for
  const editorPanels = [...document.querySelectorAll('.editor-panel')];
  const editorFormLists = new Map();
  const routeToPanel = {
    overview: 'admin-home',
    guestbook: 'guestbook-editor',
    journal: 'journal-editor',
    memories: 'memory-editor',
    timeline: 'timeline-editor',
    influences: 'influence-editor',
    creations: 'creation-editor',
    'me-timeline': 'me-timeline-editor'
  };
  const panelToRoute = Object.fromEntries(Object.entries(routeToPanel).map(([route, panel]) => [panel, route]));

  function configureEditorForm(form, list) {
    if (!form || !list) return;
    editorFormLists.set(form, list);
    form.hidden = true;
    list.hidden = false;
    form.addEventListener('reset', () => window.setTimeout(() => refreshMarkdownPreviews(form), 0));
    if (!form.querySelector('[data-cancel-form]')) {
      const cancel = document.createElement('button');
      cancel.className = 'btn btn-outline';
      cancel.type = 'button';
      cancel.dataset.cancelForm = form.getAttribute('id');
      cancel.textContent = 'back to list';
      const actions = form.querySelector('.editor-actions');
      if (actions) actions.appendChild(cancel);
      else form.appendChild(cancel);
    }
  }

  function attachMarkdownPreview(textarea) {
    if (textarea.dataset.markdownPreview) return;
    textarea.dataset.markdownPreview = 'true';
    const preview = document.createElement('div');
    preview.className = 'markdown-live-preview';
    preview.setAttribute('aria-label', 'Formatted Markdown preview');
    textarea.insertAdjacentElement('afterend', preview);
    const update = () => window.rikitoMarkdown.set(preview, textarea.value);
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

  document.querySelectorAll('textarea[data-markdown]').forEach(attachMarkdownPreview);

  function showEditorForm(form) {
    const list = editorFormLists.get(form);
    if (list) list.hidden = true;
    form.hidden = false;
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    saveDraft(form);
  }

  function showEditorList(form) {
    form.hidden = true;
    clearDraft(form);
    const list = editorFormLists.get(form);
    if (list) list.hidden = false;
  }

  function openEditorPanel(activeId, updateHash = true) {
    const editor = document.getElementById(activeId);
    if (!editor) return;
    closeOtherEditors(activeId);
    editorFormLists.forEach((list, form) => {
      if (!editor.contains(form)) return;
      form.hidden = true;
      list.hidden = false;
    });
    editor.hidden = false;
    if (supabaseState?.client) restoreDrafts(editor);
    document.querySelectorAll('.admin-module[data-open-editor]').forEach((button) => {
      if (button.dataset.openEditor === activeId) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    if (updateHash && panelToRoute[activeId]) history.replaceState(null, '', `#${panelToRoute[activeId]}`);
    window.dispatchEvent(new CustomEvent('admin:editor-open', { detail: { panelId: activeId } }));
    if (supabaseState?.client) {
      if (editor === journalEditor) loadJournalEntries();
      if (editor === memoryEditor) loadMemories();
      if (editor === timelinePanel) loadTimelineEvents();
      if (editor.id === 'creation-editor') loadCreations();
      if (editor === meTimelineEditor) loadMeTimeline();
      if (editor.id === 'influence-editor') loadInfluenceLists();
    }
  }

  function openRouteFromHash() {
    const hash = window.location.hash.slice(1);
    const lastPanel = !hash && supabaseState?.client ? readDrafts().last?.panelId : null;
    const activeId = routeToPanel[hash] || lastPanel || 'admin-home';
    openEditorPanel(activeId, false);
  }

  [
    [journalForm, journalList.closest('.editor-list-wrap')],
    [memoryForm, memoryListAdmin.closest('.editor-list-wrap')],
    [timelineForm, timelineListAdmin.closest('.editor-list-wrap')],
    [meTimelineForm, meTimelineList.closest('.editor-list-wrap')]
  ].forEach(([form, list]) => configureEditorForm(form, list));

  document.addEventListener('click', (event) => {
    const cancel = event.target.closest('[data-cancel-form]');
    if (!cancel) return;
    const form = document.getElementById(cancel.dataset.cancelForm);
    if (form) showEditorList(form);
  });

  const showLogin = () => {
    document.body.classList.remove('admin-authenticated');
    workspaceOpen = false;
    loginPanel.hidden = false;
    dashboard.hidden = true;
    adminHome.hidden = true;
    editorPanels.forEach((panel) => { panel.hidden = true; });
  };

  if (!supabaseState || !supabaseState.configured || !supabaseState.client) {
    status.textContent = 'Supabase is not configured yet. Add js/supabase-config.js after creating your project.';
    status.className = 'admin-message';
    dashboard.hidden = false;
    adminHome.hidden = false;
    document.querySelectorAll('[data-open-editor]').forEach((button) => {
      button.addEventListener('click', () => {
        openEditorPanel(button.dataset.openEditor);
        const editor = document.getElementById(button.dataset.openEditor);
        const message = editor.querySelector('.admin-message');
        if (message) message.textContent = 'Preview only: connect Supabase before saving entries.';
      });
    });
    window.addEventListener('hashchange', openRouteFromHash);
    if (window.location.hash) openRouteFromHash();
    return;
  }

  status.textContent = 'Supabase is connected. Sign in with an authenticated admin account.';
  showLogin();

  supabaseState.client.auth.onAuthStateChange((_event, session) => {
    if (!session) {
      activeUserId = null;
      showLogin();
      return;
    }
    // Supabase fires SIGNED_IN / TOKEN_REFRESHED again whenever the tab regains focus, and the
    // delete-password check signs in a second time. Re-opening the workspace on those events is
    // what threw you back to the overview and closed the form you were editing.
    if (workspaceOpen && activeUserId === session.user.id) return;
    activeUserId = session.user.id;
    showWorkspace();
  });

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    loginMessage.textContent = 'signing in...';
    const formData = new FormData(loginForm);
    const { error } = await supabaseState.client.auth.signInWithPassword({
      email: formData.get('email'),
      password: formData.get('password')
    });
    loginMessage.textContent = error ? error.message : '';
  });

  logoutButton.addEventListener('click', async () => {
    clearAllDrafts();
    const { error } = await supabaseState.client.auth.signOut();
    if (error) loginMessage.textContent = error.message;
    showLogin();
  });

  document.querySelectorAll('[data-open-editor]').forEach((button) => {
    button.addEventListener('click', () => {
      openEditorPanel(button.dataset.openEditor);
    });
  });
  window.addEventListener('hashchange', openRouteFromHash);
  function closeOtherEditors(activeId) {
    editorPanels.forEach((panel) => {
      if (panel.id !== activeId) panel.hidden = true;
    });
    adminHome.hidden = activeId !== 'admin-home';
    document.querySelectorAll('.admin-module[data-open-editor]').forEach((button) => {
      if (button.dataset.openEditor === activeId) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
  }

  function showWorkspace() {
    if (workspaceOpen) return;
    workspaceOpen = true;
    document.body.classList.add('admin-authenticated');
    loginPanel.hidden = true;
    dashboard.hidden = false;
    openRouteFromHash();
  }

  if (meTimelineForm) {
    document.getElementById('new-me-timeline-event').addEventListener('click', () => {
      meTimelineForm.reset();
      meTimelineForm.elements.id.value = '';
      meTimelineMessage.textContent = '';
      showEditorForm(meTimelineForm);
    });
    meTimelineForm.addEventListener('submit', saveMeTimelineEvent);
  }
  async function loadMeTimeline() {
    if (!meTimelineList) return;
    const { data, error } = await supabaseState.client.from('site_settings').select('value').eq('key', 'me_timeline').maybeSingle();
    if (error) { meTimelineList.textContent = error.message; return; }
    meTimelineList.replaceChildren();
    const events = data?.value?.events || [];
    if (!events.length) { meTimelineList.textContent = 'No saved events yet. The starter data is still active.'; return; }
    events.forEach((event, index) => {
      const row = document.createElement('div'); row.className = 'editor-list-item';
      const details = document.createElement('button'); details.className = 'editor-row-main'; details.type = 'button';
      const title = document.createElement('strong'); title.textContent = event.title;
      const year = document.createElement('small'); year.textContent = event.year || '';
      details.append(title, year); details.addEventListener('click', () => fillMeTimelineEvent(event, index));
      const actions = document.createElement('div'); actions.className = 'editor-item-actions';
      const remove = document.createElement('button'); remove.className = 'btn btn-danger'; remove.type = 'button'; remove.textContent = 'delete'; remove.onclick = () => deleteMeTimelineEvent(index, event.title);
      actions.append(remove); row.append(details, actions); meTimelineList.appendChild(row);
    });
  }
  async function saveMeTimelineEvent(event) {
    event.preventDefault();
    meTimelineMessage.textContent = 'saving...';
    const { data: current, error: readError } = await supabaseState.client.from('site_settings').select('value').eq('key', 'me_timeline').maybeSingle();
    if (readError) { meTimelineMessage.textContent = readError.message; return; }
    const events = current?.value?.events ? [...current.value.events] : [];
    const formData = new FormData(meTimelineForm);
    const entry = {
      year: String(formData.get('year') || '').trim(),
      title: String(formData.get('title') || '').trim(),
      body: String(formData.get('body') || '').trim(),
      more: String(formData.get('more') || '').trim(),
      bodyLink: String(formData.get('bodyLink') || '').trim(),
      sort_order: Number(formData.get('sort_order') || 0)
    };
    const id = meTimelineForm.elements.id.value;
    if (id === '') events.push(entry); else events[Number(id)] = entry;
    events.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    const { error } = await supabaseState.client.from('site_settings').upsert({ key: 'me_timeline', value: { events } });
    meTimelineMessage.textContent = error ? error.message : 'Me timeline saved.';
    if (!error) { meTimelineForm.reset(); meTimelineForm.elements.id.value = ''; showEditorList(meTimelineForm); loadMeTimeline(); }
  }
  function fillMeTimelineEvent(entry, index) {
    meTimelineForm.elements.id.value = index;
    ['year', 'title', 'body', 'more', 'bodyLink', 'sort_order'].forEach((field) => { meTimelineForm.elements[field].value = entry[field] ?? ''; });
    refreshMarkdownPreviews(meTimelineForm);
    meTimelineMessage.textContent = `editing ${entry.title}`;
    showEditorForm(meTimelineForm);
  }
  async function deleteMeTimelineEvent(index, title) {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    if (!await verifyDelete(title, meTimelineMessage)) return;
    const { data: current, error: readError } = await supabaseState.client.from('site_settings').select('value').eq('key', 'me_timeline').maybeSingle();
    if (readError) { meTimelineMessage.textContent = readError.message; return; }
    const events = (current?.value?.events || []).filter((_entry, eventIndex) => eventIndex !== index);
    const { error } = await supabaseState.client.from('site_settings').upsert({ key: 'me_timeline', value: { events } });
    meTimelineMessage.textContent = error ? error.message : 'event deleted.';
    if (!error) loadMeTimeline();
  }

  document.getElementById('new-memory').addEventListener('click', () => {
    memoryForm.reset();
    memoryForm.elements.id.value = '';
    memoryPhotoFields.replaceChildren();
    addMemoryPhotoField();
    memoryMessage.textContent = '';
    showEditorForm(memoryForm);
  });

  document.getElementById('add-memory-photo').addEventListener('click', addMemoryPhotoField);

  function addMemoryPhotoField(photo = {}) {
    const field = document.createElement('div');
    field.className = 'memory-photo-field';
    field.innerHTML = `
      <label>Photo URL<input type="url" name="photo_url" value="${escapeHtml(photo.image_url || '')}" placeholder="https://..."></label>
      <label>Or upload photo<input type="file" name="photo_file" accept="image/*"></label>
      <button class="btn btn-danger remove-photo" type="button">remove photo</button>`;
    field.querySelector('.remove-photo').addEventListener('click', () => field.remove());
    memoryPhotoFields.appendChild(field);
  }

  memoryForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    memoryMessage.textContent = 'saving...';
    const formData = new FormData(memoryForm);
    const description = String(formData.get('description') || '').trim();
    if (wordCount(description) > 100) {
      memoryMessage.textContent = 'Memory description must be 100 words or fewer.';
      return;
    }
    const coverFile = memoryForm.elements.cover_file.files[0];
    let coverImage = formData.get('cover_image') || null;
    try {
      if (coverFile) coverImage = await uploadMemoryImage(coverFile, 'covers');
    } catch (error) {
      memoryMessage.textContent = error.message;
      return;
    }
    const payload = {
      title: formData.get('title'),
      slug: formData.get('slug'),
      description,
      cover_image: coverImage,
      status: formData.get('status')
    };
    const id = formData.get('id');
    const query = id
      ? supabaseState.client.from('memories').update(payload).eq('id', id).select('id').single()
      : supabaseState.client.from('memories').insert(payload).select('id').single();
    const { data, error } = await query;
    if (error) {
      memoryMessage.textContent = error.message;
      return;
    }
    const memoryId = data.id;
    const { error: removeError } = await supabaseState.client.from('memory_photos').delete().eq('memory_id', memoryId);
    if (removeError) {
      memoryMessage.textContent = removeError.message;
      return;
    }
    const photos = [];
    for (const [index, field] of [...memoryPhotoFields.querySelectorAll('.memory-photo-field')].entries()) {
      const file = field.querySelector('[name="photo_file"]').files[0];
      let imageUrl = field.querySelector('[name="photo_url"]').value.trim();
      try {
        if (file) imageUrl = await uploadMemoryImage(file, 'photos');
      } catch (error) {
        memoryMessage.textContent = error.message;
        return;
      }
      if (!imageUrl) {
        memoryMessage.textContent = 'Each memory photo needs a URL or local image file.';
        return;
      }
      photos.push({
        memory_id: memoryId,
        image_url: imageUrl,
        sort_order: index
      });
    }
    if (photos.length) {
      const { error: photoError } = await supabaseState.client.from('memory_photos').insert(photos);
      if (photoError) {
        memoryMessage.textContent = photoError.message;
        return;
      }
    }
    memoryForm.elements.id.value = memoryId;
    memoryMessage.textContent = 'memory saved.';
    showEditorList(memoryForm);
    loadMemories();
  });

  document.getElementById('new-timeline-event').addEventListener('click', () => {
    timelineForm.reset();
    timelineForm.elements.id.value = '';
    timelineMessage.textContent = '';
    showEditorForm(timelineForm);
  });

  timelineForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    timelineMessage.textContent = 'saving...';
    const formData = new FormData(timelineForm);
    const description = String(formData.get('description') || '').trim();
    if (wordCount(description) > 40) {
      timelineMessage.textContent = 'Initial timeline description must be 40 words or fewer.';
      return;
    }
    const payload = {
      date_label: formData.get('date_label'),
      title: formData.get('title'),
      description,
      more_description: formData.get('more_description') || '',
      status: formData.get('status')
    };
    const id = formData.get('id');
    const query = id
      ? supabaseState.client.from('memory_timeline').update(payload).eq('id', id)
      : supabaseState.client.from('memory_timeline').insert(payload);
    const { error } = await query;
    timelineMessage.textContent = error ? error.message : 'event saved.';
    if (!error) { showEditorList(timelineForm); loadTimelineEvents(); }
  });

  async function loadMemories() {
    const { data, error } = await supabaseState.client.from('memories').select('id,title,slug,status,updated_at').order('updated_at', { ascending: false });
    renderAdminList(memoryListAdmin, data, error, 'No memories yet.', fillMemoryForm, deleteMemory);
  }

  async function loadTimelineEvents() {
    const { data, error } = await supabaseState.client.from('memory_timeline').select('id,date_label,title,status,updated_at').order('sort_order', { ascending: true }).order('updated_at', { ascending: false });
    renderAdminList(timelineListAdmin, data, error, 'No timeline events yet.', fillTimelineForm, deleteTimelineEvent);
  }

  function renderAdminList(container, data, error, emptyMessage, editHandler, deleteHandler) {
    container.replaceChildren();
    if (error) {
      container.textContent = error.message;
      return;
    }
    if (!data.length) {
      container.textContent = emptyMessage;
      return;
    }
    data.forEach((entry) => {
      const item = document.createElement('div');
      item.className = 'editor-list-item';
      const details = document.createElement('button');
      details.className = 'editor-row-main';
      details.type = 'button';
      const title = document.createElement('strong');
      title.textContent = entry.title;
      const meta = document.createElement('small');
      meta.textContent = `${entry.status} · ${entry.slug || entry.date_label}`;
      details.append(title, meta);
      details.addEventListener('click', () => editHandler(entry.id));
      const actions = document.createElement('div');
      actions.className = 'editor-item-actions';
      const remove = document.createElement('button');
      remove.className = 'btn btn-danger';
      remove.type = 'button';
      remove.textContent = 'delete';
      remove.addEventListener('click', () => deleteHandler(entry.id, entry.title));
      actions.append(remove);
      item.append(details, actions);
      container.appendChild(item);
    });
  }

  async function fillMemoryForm(id) {
    const { data, error } = await supabaseState.client.from('memories').select('*,memory_photos(*)').eq('id', id).single();
    if (error) { memoryMessage.textContent = error.message; return; }
    memoryForm.elements.id.value = data.id;
    memoryForm.elements.title.value = data.title;
    memoryForm.elements.slug.value = data.slug;
    memoryForm.elements.description.value = data.description;
    memoryForm.elements.cover_image.value = data.cover_image || '';
    memoryForm.elements.status.value = data.status;
    refreshMarkdownPreviews(memoryForm);
    memoryPhotoFields.replaceChildren();
    (data.memory_photos || []).sort((a, b) => a.sort_order - b.sort_order).forEach(addMemoryPhotoField);
    if (!data.memory_photos?.length) addMemoryPhotoField();
    memoryMessage.textContent = 'editing ' + data.title;
    showEditorForm(memoryForm);
  }

  async function fillTimelineForm(id) {
    const { data, error } = await supabaseState.client.from('memory_timeline').select('*').eq('id', id).single();
    if (error) { timelineMessage.textContent = error.message; return; }
    timelineForm.elements.id.value = data.id;
    timelineForm.elements.date_label.value = data.date_label;
    timelineForm.elements.title.value = data.title;
    timelineForm.elements.description.value = data.description;
    timelineForm.elements.more_description.value = data.more_description || '';
    timelineForm.elements.status.value = data.status;
    refreshMarkdownPreviews(timelineForm);
    timelineMessage.textContent = 'editing ' + data.title;
    showEditorForm(timelineForm);
  }

  async function deleteMemory(id, title) {
    if (!await verifyDelete(title, memoryMessage)) return;
    const { error } = await supabaseState.client.from('memories').delete().eq('id', id);
    memoryMessage.textContent = error ? error.message : 'memory deleted.';
    if (!error) loadMemories();
  }

  async function deleteTimelineEvent(id, title) {
    if (!await verifyDelete(title, timelineMessage)) return;
    const { error } = await supabaseState.client.from('memory_timeline').delete().eq('id', id);
    timelineMessage.textContent = error ? error.message : 'event deleted.';
    if (!error) loadTimelineEvents();
  }

  async function verifyDelete(title, messageElement) {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return false;
    const password = window.prompt('Enter your admin password to confirm deletion:');
    if (!password) { messageElement.textContent = 'Deletion cancelled.'; return false; }
    const { data: userData, error: userError } = await supabaseState.client.auth.getUser();
    if (userError || !userData.user?.email) { messageElement.textContent = 'Your session could not be verified.'; return false; }
    const { error } = await supabaseState.client.auth.signInWithPassword({ email: userData.user.email, password });
    if (error) { messageElement.textContent = 'Password verification failed. Nothing was deleted.'; return false; }
    return true;
  }

  function wordCount(value) {
    return value ? value.split(/\s+/).filter(Boolean).length : 0;
  }

  async function uploadMemoryImage(file, folder) {
    const extension = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : 'jpg';
    const path = `${folder}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabaseState.client.storage
      .from('memory-media')
      .upload(path, file, { cacheControl: '3600', upsert: false });
    if (error) throw new Error(`Image upload failed: ${error.message}`);
    const { data } = supabaseState.client.storage.from('memory-media').getPublicUrl(path);
    return data.publicUrl;
  }

  newJournalEntry.addEventListener('click', () => {
    journalForm.reset();
    journalForm.elements.id.value = '';
    journalMessage.textContent = '';
    renderJournalPreview();
    showEditorForm(journalForm);
  });

  journalBodyInput.addEventListener('input', renderJournalPreview);
  renderJournalPreview();

  function renderJournalPreview() {
    const source = journalBodyInput.value;
    if (!source.trim()) {
      journalBodyPreview.innerHTML = '<p class="admin-help">Your formatted entry appears here.</p>';
      return;
    }
    const escaped = escapeHtml(source).replace(/\n/g, '<br>');
    const rendered = window.marked?.parse ? window.marked.parse(source) : `<p>${escaped}</p>`;
    journalBodyPreview.innerHTML = window.DOMPurify?.sanitize
      ? window.DOMPurify.sanitize(rendered)
      : `<p>${escaped}</p>`;
  }

  journalForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    journalMessage.textContent = 'saving...';
    const formData = new FormData(journalForm);
    const payload = {
      title: formData.get('title'),
      slug: formData.get('slug'),
      excerpt: formData.get('excerpt') || '',
      body: { markdown: formData.get('body') || '' },
      cover_image: formData.get('cover_image') || null,
      status: formData.get('status'),
      published_at: formData.get('status') === 'published' ? new Date().toISOString() : null
    };
    const id = formData.get('id');
    const query = id
      ? supabaseState.client.from('journal_entries').update(payload).eq('id', id)
      : supabaseState.client.from('journal_entries').insert(payload);
    const { error } = await query;
    journalMessage.textContent = error ? error.message : 'saved.';
    if (!error) {
      journalForm.reset();
      journalForm.elements.id.value = '';
      renderJournalPreview();
      showEditorList(journalForm);
      loadJournalEntries();
    }
  });

  let journalLoadVersion = 0;
  async function loadJournalEntries() {
    const version = ++journalLoadVersion;
    const { data, error } = await supabaseState.client
      .from('journal_entries')
      .select('id,title,slug,status,updated_at')
      .order('updated_at', { ascending: false });
    if (version !== journalLoadVersion) return;   // a newer load is already on its way
    if (error) {
      journalList.textContent = error.message;
      return;
    }
    if (!data.length) {
      journalList.textContent = 'No entries yet. Start with the form above.';
      return;
    }
    journalList.replaceChildren(...data.map((entry) => {
      const item = document.createElement('div');
      item.className = 'editor-list-item';
      const details = document.createElement('button');
      details.className = 'editor-row-main';
      details.type = 'button';
      const title = document.createElement('strong');
      title.textContent = entry.title;
      const meta = document.createElement('small');
      meta.textContent = `${entry.status} · ${entry.slug}`;
      details.append(title, meta);
      details.addEventListener('click', () => fillJournalForm(entry.id));
      const remove = document.createElement('button');
      remove.className = 'btn btn-danger';
      remove.type = 'button';
      remove.textContent = 'delete';
      remove.addEventListener('click', () => deleteJournalEntry(entry.id, entry.title));
      const actions = document.createElement('div');
      actions.className = 'editor-item-actions';
      actions.append(remove);
      item.append(details, actions);
      return item;
    }));
  }

  async function deleteJournalEntry(id, title) {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    const password = window.prompt('Enter your admin password to confirm deletion:');
    if (!password) {
      journalMessage.textContent = 'Deletion cancelled.';
      return;
    }

    journalMessage.textContent = 'verifying password...';
    const { data: userData, error: userError } = await supabaseState.client.auth.getUser();
    if (userError || !userData.user?.email) {
      journalMessage.textContent = 'Your session could not be verified. Please sign in again.';
      return;
    }

    const { error: authError } = await supabaseState.client.auth.signInWithPassword({
      email: userData.user.email,
      password
    });
    if (authError) {
      journalMessage.textContent = 'Password verification failed. The entry was not deleted.';
      return;
    }

    const { error } = await supabaseState.client
      .from('journal_entries')
      .delete()
      .eq('id', id);
    journalMessage.textContent = error ? error.message : 'Entry deleted.';
    if (!error) {
      journalForm.reset();
      journalForm.elements.id.value = '';
      showEditorList(journalForm);
      loadJournalEntries();
    }
  }

  async function fillJournalForm(id) {
    const { data, error } = await supabaseState.client
      .from('journal_entries')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      journalMessage.textContent = error.message;
      return;
    }
    journalForm.elements.id.value = data.id;
    journalForm.elements.title.value = data.title;
    journalForm.elements.slug.value = data.slug;
    journalForm.elements.excerpt.value = data.excerpt;
    journalForm.elements.body.value = data.body?.markdown ?? data.body?.html ?? '';
    renderJournalPreview();
    journalForm.elements.cover_image.value = data.cover_image || '';
    journalForm.elements.status.value = data.status;
    journalMessage.textContent = 'editing ' + data.title;
    showEditorForm(journalForm);
  }

  function escapeHtml(value) {
    const element = document.createElement('span');
    element.textContent = value;
    return element.innerHTML;
  }

  const creationForm = document.getElementById('creation-form');
  const creationBlocks = document.getElementById('creation-blocks');
  const creationList = document.getElementById('creation-list-admin');
  const creationMessage = document.getElementById('creation-form-message');
  if (creationForm) {
    configureEditorForm(creationForm, creationList.closest('.editor-list-wrap'));
    document.getElementById('new-creation').addEventListener('click', () => {
      creationForm.reset();
      creationForm.elements.id.value = '';
      creationBlocks.replaceChildren();
      addCreationBlock();
      creationMessage.textContent = '';
      showEditorForm(creationForm);
    });
    document.getElementById('add-creation-block').addEventListener('click', () => addCreationBlock());
    creationForm.addEventListener('submit', saveCreation);
  }
  function addCreationBlock(block = { type: 'text', content: '' }) {
    const field = document.createElement('div');
    field.className = 'creation-block-field';
    field.innerHTML = '<div class="creation-block-toolbar"><select name="block_type"><option value="text">Text</option><option value="heading">Heading</option><option value="image">Image</option><option value="gallery">Gallery</option><option value="code">Code / equation</option><option value="embed">Link / embed</option></select><button class="btn btn-danger remove-block" type="button">remove</button></div><input name="block_url" type="url" placeholder="Image or external URL"><textarea name="block_content" data-markdown rows="4" placeholder="Write this block in Markdown..."></textarea>';
    field.querySelector('[name="block_type"]').value = block.type || 'text';
    field.querySelector('[name="block_url"]').value = block.url || '';
    field.querySelector('[name="block_content"]').value = block.content || '';
    field.querySelector('.remove-block').addEventListener('click', () => field.remove());
    creationBlocks.appendChild(field);
    attachMarkdownPreview(field.querySelector('[name="block_content"]'));
  }
  function readCreationBlocks() {
    return [...creationBlocks.querySelectorAll('.creation-block-field')].map((field) => {
      const type = field.querySelector('[name="block_type"]').value;
      const url = field.querySelector('[name="block_url"]').value.trim();
      const content = field.querySelector('[name="block_content"]').value.trim();
      return { type, url, content };
    }).filter((block) => block.content || block.url);
  }
  async function saveCreation(event) {
    event.preventDefault();
    creationMessage.textContent = 'saving...';
    const formData = new FormData(creationForm);
    let coverImage = formData.get('cover_image') || null;
    const coverFile = creationForm.elements.cover_file.files[0];
    try {
      if (coverFile) coverImage = await uploadMemoryImage(coverFile, 'influences');
    } catch (error) { creationMessage.textContent = error.message; return; }
    const payload = {
      title: formData.get('title'), slug: formData.get('slug'), category: formData.get('category'),
      status_label: formData.get('status_label') || 'in progress', short_description: formData.get('short_description') || '',
      tags: String(formData.get('tags') || '').split(',').map((tag) => tag.trim()).filter(Boolean),
      cover_image: coverImage, project_url: formData.get('project_url') || null, github_url: formData.get('github_url') || null,
      published_at: formData.get('creation_date') ? `${formData.get('creation_date')}T00:00:00Z` : null,
      featured: formData.get('featured') === 'on', status: formData.get('status'), body: readCreationBlocks()
    };
    const id = formData.get('id');
    const query = id ? supabaseState.client.from('creations').update(payload).eq('id', id) : supabaseState.client.from('creations').insert(payload);
    const { error } = await query;
    creationMessage.textContent = error ? error.message : 'creation saved.';
    if (!error) { creationForm.reset(); creationForm.elements.id.value = ''; creationBlocks.replaceChildren(); addCreationBlock(); showEditorList(creationForm); loadCreations(); }
  }
  // ---- creations: status tabs, search, category and sort (same idea as the guestbook) ----
  let creationEntries = [];
  let creationLoadVersion = 0;
  const creationFilter = { view: 'all', query: '', category: 'all', sort: 'updated' };
  const creationViewTabs = [...document.querySelectorAll('[data-creation-view]')];
  const creationSearch = document.getElementById('creation-admin-search');
  const creationCategory = document.getElementById('creation-admin-category');
  const creationSort = document.getElementById('creation-admin-sort');
  const creationCount = document.getElementById('creation-admin-count');
  const creationCategoryLabels = {};
  if (creationForm) {
    [...creationForm.elements.category.options].forEach((option) => {
      creationCategoryLabels[option.value] = option.textContent;
      if (creationCategory) creationCategory.append(new Option(option.textContent, option.value));
    });
  }
  creationViewTabs.forEach((tab) => tab.addEventListener('click', () => {
    creationFilter.view = tab.dataset.creationView;
    creationViewTabs.forEach((item) => item.setAttribute('aria-pressed', String(item === tab)));
    renderCreations();
  }));
  creationSearch?.addEventListener('input', () => { creationFilter.query = creationSearch.value.trim().toLowerCase(); renderCreations(); });
  creationCategory?.addEventListener('change', () => { creationFilter.category = creationCategory.value; renderCreations(); });
  creationSort?.addEventListener('change', () => { creationFilter.sort = creationSort.value; renderCreations(); });

  async function loadCreations() {
    if (!creationList) return;
    const version = ++creationLoadVersion;
    const { data, error } = await supabaseState.client.from('creations').select('*').order('updated_at', { ascending: false });
    if (version !== creationLoadVersion) return;   // a newer load is already on its way
    if (error) { creationList.textContent = error.message; return; }
    creationEntries = data || [];
    renderCreations();
  }
  function renderCreations() {
    if (!creationList) return;
    const { view, query, category, sort } = creationFilter;
    const stamp = (entry) => new Date(entry.updated_at || entry.created_at || 0).getTime();
    const visible = creationEntries.filter((entry) => {
      if (view !== 'all' && entry.status !== view) return false;
      if (category !== 'all' && entry.category !== category) return false;
      if (!query) return true;
      return `${entry.title} ${entry.short_description || ''} ${entry.status_label || ''} ${(entry.tags || []).join(' ')}`.toLowerCase().includes(query);
    }).sort((a, b) => {
      if (sort === 'title') return String(a.title).localeCompare(String(b.title));
      if (sort === 'oldest') return stamp(a) - stamp(b);
      if (sort === 'featured') return (Number(Boolean(b.featured)) - Number(Boolean(a.featured))) || (stamp(b) - stamp(a));
      return stamp(b) - stamp(a);
    });
    if (creationCount) creationCount.textContent = visible.length === creationEntries.length ? `${creationEntries.length} ${creationEntries.length === 1 ? 'creation' : 'creations'}` : `${visible.length} of ${creationEntries.length}`;
    if (!visible.length) {
      const note = document.createElement('p');
      note.className = 'admin-help';
      note.textContent = creationEntries.length ? 'No creations match these filters.' : 'No creations yet. Add the first one with “New creation”.';
      creationList.replaceChildren(note);
      return;
    }
    creationList.replaceChildren(...visible.map((entry) => {
      const row = document.createElement('div'); row.className = 'editor-list-item';
      const details = document.createElement('button'); details.className = 'editor-row-main'; details.type = 'button';
      const title = document.createElement('strong'); title.textContent = entry.title;
      const meta = document.createElement('small'); meta.textContent = `${creationCategoryLabels[entry.category] || entry.category} · ${entry.status}${entry.featured ? ' · featured' : ''}`;
      details.append(title, meta); details.addEventListener('click', () => fillCreation(entry));
      const actions = document.createElement('div'); actions.className = 'editor-item-actions';
      const remove = document.createElement('button'); remove.className = 'btn btn-danger'; remove.type = 'button'; remove.textContent = 'delete'; remove.onclick = () => deleteCreation(entry);
      actions.append(remove); row.append(details, actions);
      return row;
    }));
  }
  function fillCreation(entry) {
    creationForm.elements.id.value = entry.id; ['title', 'slug', 'category', 'status_label', 'short_description', 'cover_image', 'project_url', 'github_url', 'status'].forEach((name) => { creationForm.elements[name].value = entry[name] || ''; });
    creationForm.elements.creation_date.value = entry.published_at ? entry.published_at.slice(0, 10) : '';
    creationForm.elements.tags.value = (entry.tags || []).join(', ');
    creationForm.elements.featured.checked = Boolean(entry.featured);
    creationBlocks.replaceChildren(); (Array.isArray(entry.body) ? entry.body : []).forEach(addCreationBlock); if (!creationBlocks.children.length) addCreationBlock();
    creationMessage.textContent = `editing ${entry.title}`; showEditorForm(creationForm);
  }
  async function deleteCreation(entry) {
    if (!window.confirm(`Delete "${entry.title}"? This cannot be undone.`)) return;
    const password = window.prompt('Enter your admin password to confirm deletion:'); if (!password) return;
    const { data: user } = await supabaseState.client.auth.getUser();
    const auth = await supabaseState.client.auth.signInWithPassword({ email: user.user.email, password });
    if (auth.error) { creationMessage.textContent = 'Password verification failed.'; return; }
    const { error } = await supabaseState.client.from('creations').delete().eq('id', entry.id);
    creationMessage.textContent = error ? error.message : 'Creation deleted.'; if (!error) loadCreations();
  }

  // ---- influences: one nav item, four sections (interests, playlists, songs, shaped) ----
  const influenceTables = {
    interest: { table: 'core_interests', form: document.getElementById('interest-form'), list: document.getElementById('interest-list-admin'), fields: ['eyebrow', 'title', 'description', 'tags'], meta: (entry) => (entry.tags || []).join(', ') || entry.eyebrow || '', newLabel: 'New interest' },
    playlist: { table: 'playlists', form: document.getElementById('playlist-form'), list: document.getElementById('playlist-list-admin'), fields: ['eyebrow', 'title', 'description', 'image_url', 'playlist_url'], meta: (entry) => entry.eyebrow || '', newLabel: 'New playlist' },
    song: { table: 'songs', form: document.getElementById('song-form'), list: document.getElementById('song-list-admin'), fields: ['title', 'artist', 'description', 'image_url', 'song_url'], meta: (entry) => entry.artist || '', newLabel: 'New song' },
    shaped: { table: 'shaped_items', form: document.getElementById('shaped-form'), list: document.getElementById('shaped-list-admin'), fields: ['medium', 'title', 'short_description', 'reflection', 'image_url', 'link_url'], meta: (entry) => entry.medium || '', newLabel: 'New item' }
  };
  const influenceTabs = [...document.querySelectorAll('[data-influence-tab]')];
  const influenceSections = [...document.querySelectorAll('[data-influence-section]')];
  function showInfluenceSection(kind) {
    const active = influenceTables[kind] ? kind : 'interest';
    influenceTabs.forEach((tab) => tab.setAttribute('aria-pressed', String(tab.dataset.influenceTab === active)));
    influenceSections.forEach((section) => { section.hidden = section.dataset.influenceSection !== active; });
    rememberUi('influenceSection', active);
  }
  influenceTabs.forEach((tab) => tab.addEventListener('click', () => showInfluenceSection(tab.dataset.influenceTab)));
  Object.values(influenceTables).forEach((config) => configureEditorForm(config.form, config.list.closest('.editor-list-wrap')));
  document.querySelectorAll('[data-new-influence]').forEach((button) => button.addEventListener('click', () => {
    const form = influenceTables[button.dataset.newInfluence]?.form;
    if (!form) return;
    form.reset();
    form.elements.id.value = '';
    const message = form.querySelector('.admin-message');
    if (message) message.textContent = '';
    showEditorForm(form);
  }));
  Object.entries(influenceTables).forEach(([kind, config]) => {
    if (!config.form) return;
    config.form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const values = Object.fromEntries(config.fields.map((field) => [field, config.form.elements[field].value.trim()]));
      if (kind === 'interest') values.tags = values.tags ? values.tags.split(',').map((tag) => tag.trim()).filter(Boolean) : [];
      if (kind !== 'interest') values.status = 'published';
      const imageFile = config.form.elements.image_file?.files?.[0];
      if (imageFile) {
        const path = `influences/${crypto.randomUUID()}-${imageFile.name.replace(/[^a-z0-9._-]/gi, '-')}`;
        const upload = await supabaseState.client.storage.from('memory-media').upload(path, imageFile, { upsert: false });
        if (upload.error) { config.form.querySelector('.admin-message').textContent = upload.error.message; return; }
        values.image_url = supabaseState.client.storage.from('memory-media').getPublicUrl(path).data.publicUrl;
      }
      const id = config.form.elements.id.value;
      const query = id ? supabaseState.client.from(config.table).update(values).eq('id', id) : supabaseState.client.from(config.table).insert(values);
      const { error } = await query;
      config.form.querySelector('.admin-message').textContent = error ? error.message : 'saved.';
      if (!error) { config.form.reset(); config.form.elements.id.value = ''; showEditorList(config.form); loadInfluenceKind(kind); }
    });
  });
  const influenceLoadVersions = {};
  async function loadInfluenceKind(kind) {
    const config = influenceTables[kind];
    if (!config?.list) return;
    const version = (influenceLoadVersions[kind] || 0) + 1;
    influenceLoadVersions[kind] = version;
    const { data, error } = await supabaseState.client.from(config.table).select('*').order('sort_order');
    if (version !== influenceLoadVersions[kind]) return;   // a newer load is already on its way
    const count = document.querySelector(`[data-influence-count="${kind}"]`);
    if (error) { config.list.textContent = error.message; return; }
    const entries = data || [];
    if (count) count.textContent = entries.length;
    if (!entries.length) { config.list.textContent = `Nothing here yet. Use “${config.newLabel}” to add one.`; return; }
    config.list.replaceChildren(...entries.map((entry) => {
      const row = document.createElement('div'); row.className = 'editor-list-item';
      const text = document.createElement('button'); text.className = 'editor-row-main'; text.type = 'button';
      const title = document.createElement('strong'); title.textContent = entry.title;
      const meta = document.createElement('small'); meta.textContent = config.meta(entry);
      text.append(title, meta);
      text.onclick = () => {
        config.form.elements.id.value = entry.id;
        config.fields.forEach((field) => { config.form.elements[field].value = Array.isArray(entry[field]) ? entry[field].join(', ') : (entry[field] || ''); });
        refreshMarkdownPreviews(config.form);
        showEditorForm(config.form);
      };
      const actions = document.createElement('div'); actions.className = 'editor-item-actions';
      const remove = document.createElement('button'); remove.className = 'btn btn-danger'; remove.type = 'button'; remove.textContent = 'delete';
      remove.onclick = async () => {
        const password = window.prompt('Enter your admin password to confirm deletion:'); if (!password) return;
        const { data: user } = await supabaseState.client.auth.getUser();
        const auth = await supabaseState.client.auth.signInWithPassword({ email: user.user.email, password });
        if (auth.error) return window.alert('Password verification failed.');
        const result = await supabaseState.client.from(config.table).delete().eq('id', entry.id);
        if (result.error) window.alert(result.error.message); else loadInfluenceKind(kind);
      };
      actions.append(remove); row.append(text, actions);
      return row;
    }));
  }
  function loadInfluenceLists() { return Promise.all(Object.keys(influenceTables).map(loadInfluenceKind)); }

  // ---- unsaved work: keep an open editor alive across tab / app switches and reloads ----
  // Phones often discard a background tab, so the page reloads when you come back. Everything typed
  // into an open form is copied to localStorage as you type and put back when its panel opens.
  const DRAFT_KEY = 'rikitoism-admin-drafts-v1';
  const DRAFT_MAX_AGE = 14 * 24 * 60 * 60 * 1000;
  const draftForms = [journalForm, memoryForm, timelineForm, meTimelineForm, creationForm, ...Object.values(influenceTables).map((config) => config.form)].filter(Boolean);
  let draftsRestoring = false;
  let draftTimer = null;
  const dirtyForms = new Set();

  // The form's own id attribute: form.id would return the <input name="id"> inside each form.
  const formKey = (form) => form.getAttribute('id');

  function readDrafts() {
    try {
      const stored = JSON.parse(window.localStorage.getItem(DRAFT_KEY)) || {};
      const forms = stored.forms || {};
      Object.keys(forms).forEach((id) => { if (Date.now() - (forms[id].savedAt || 0) > DRAFT_MAX_AGE) delete forms[id]; });
      return { forms, last: stored.last || null, ui: stored.ui || {} };
    } catch (error) { return { forms: {}, last: null, ui: {} }; }
  }
  function writeDrafts(drafts) {
    try { window.localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts)); } catch (error) { /* storage full or blocked: editing still works */ }
  }
  function clearAllDrafts() {
    try { window.localStorage.removeItem(DRAFT_KEY); } catch (error) { /* ignore */ }
  }
  function rememberUi(key, value) {
    if (!supabaseState?.client) return;
    const drafts = readDrafts();
    drafts.ui[key] = value;
    writeDrafts(drafts);
  }
  function captureForm(form) {
    const values = {};
    [...form.elements].forEach((element) => {
      if (!element.name || ['file', 'password', 'submit', 'button'].includes(element.type)) return;
      if (element.closest('#memory-photo-fields, #creation-blocks')) return;   // dynamic rows are saved separately
      if (element.type === 'checkbox') values[element.name] = element.checked;
      else if (element.type !== 'radio' || element.checked) values[element.name] = element.value;
    });
    const draft = { values, panelId: form.closest('.editor-panel')?.id || null, savedAt: Date.now() };
    if (form === memoryForm) draft.photos = [...memoryPhotoFields.querySelectorAll('.memory-photo-field')].map((field) => ({ image_url: field.querySelector('[name="photo_url"]').value }));
    if (form === creationForm) draft.blocks = [...creationBlocks.querySelectorAll('.creation-block-field')].map((field) => ({ type: field.querySelector('[name="block_type"]').value, url: field.querySelector('[name="block_url"]').value, content: field.querySelector('[name="block_content"]').value }));
    return draft;
  }
  function saveDraft(form) {
    if (!supabaseState?.client || draftsRestoring || !form || form.hidden) return;
    const drafts = readDrafts();
    const draft = captureForm(form);
    drafts.forms[formKey(form)] = draft;
    drafts.last = { panelId: draft.panelId, formId: formKey(form) };
    writeDrafts(drafts);
  }
  function clearDraft(form) {
    if (!supabaseState?.client || !form || !formKey(form)) return;
    dirtyForms.delete(form);
    const drafts = readDrafts();
    delete drafts.forms[formKey(form)];
    if (drafts.last?.formId === formKey(form)) drafts.last = null;
    writeDrafts(drafts);
  }
  function saveDraftSoon(form) {
    dirtyForms.add(form);
    window.clearTimeout(draftTimer);
    draftTimer = window.setTimeout(flushDrafts, 350);
  }
  function flushDrafts() {
    window.clearTimeout(draftTimer);
    dirtyForms.forEach((form) => saveDraft(form));
    dirtyForms.clear();
  }
  function applyDraft(form, draft) {
    draftsRestoring = true;
    try {
      form.reset();
      Object.entries(draft.values || {}).forEach(([name, value]) => {
        const field = form.elements[name];
        if (!field || typeof field.length === 'number' && field.tagName !== 'SELECT') return;
        if (field.type === 'checkbox') field.checked = Boolean(value); else field.value = value;
      });
      if (form === memoryForm) {
        memoryPhotoFields.replaceChildren();
        (draft.photos?.length ? draft.photos : [{}]).forEach((photo) => addMemoryPhotoField(photo));
      }
      if (form === creationForm) {
        creationBlocks.replaceChildren();
        (draft.blocks?.length ? draft.blocks : [{ type: 'text', content: '' }]).forEach((block) => addCreationBlock(block));
      }
      refreshMarkdownPreviews(form);
      if (form === journalForm) renderJournalPreview();
      const kind = Object.keys(influenceTables).find((key) => influenceTables[key].form === form);
      if (kind) showInfluenceSection(kind);
      const list = editorFormLists.get(form);
      if (list) list.hidden = true;
      form.hidden = false;
      const message = form.querySelector('.admin-message');
      if (message) message.textContent = 'Restored your unsaved draft.';
    } finally {
      draftsRestoring = false;
    }
  }
  function restoreDrafts(editor) {
    const drafts = readDrafts();
    if (editor.id === 'influence-editor') showInfluenceSection(drafts.ui.influenceSection || 'interest');
    draftForms.forEach((form) => {
      const draft = drafts.forms[formKey(form)];
      if (draft && editor.contains(form)) applyDraft(form, draft);
    });
  }
  draftForms.forEach((form) => {
    form.addEventListener('input', () => saveDraftSoon(form));
    form.addEventListener('change', () => saveDraftSoon(form));
    form.addEventListener('click', () => window.setTimeout(() => { if (!form.hidden) saveDraftSoon(form); }, 0));   // add / remove photo or block rows
  });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushDrafts(); });
  window.addEventListener('pagehide', flushDrafts);

  supabaseState.client.auth.getSession().then(({ data, error }) => {
    if (error) {
      loginMessage.textContent = error.message;
      return;
    }
    loginPanel.hidden = Boolean(data.session);
    if (data.session) {
      activeUserId = data.session.user.id;
      showWorkspace();   // opening a panel loads its own list; no extra loads here (they overlapped and doubled rows)
    }
  });
});