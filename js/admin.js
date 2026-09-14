document.addEventListener('DOMContentLoaded', () => {
  const status = document.getElementById('connection-message');
  const loginPanel = document.getElementById('login-panel');
  const loginForm = document.getElementById('login-form');
  const loginMessage = document.getElementById('login-message');
  const dashboard = document.getElementById('dashboard');
  const logoutButton = document.getElementById('logout-button');
  const journalEditor = document.getElementById('journal-editor');
  const journalForm = document.getElementById('journal-form');
  const journalList = document.getElementById('journal-entry-list');
  const journalMessage = document.getElementById('journal-form-message');
  const newJournalEntry = document.getElementById('new-journal-entry');
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
  const supabaseState = window.soulSupabase;
  const editorPanels = [...document.querySelectorAll('.editor-panel')];

  const showLogin = () => {
    loginPanel.hidden = false;
    dashboard.hidden = true;
  };

  if (!supabaseState || !supabaseState.configured || !supabaseState.client) {
    status.textContent = 'Supabase is not configured yet. Add js/supabase-config.js after creating your project.';
    status.className = 'admin-message';
    dashboard.hidden = false;
    document.querySelectorAll('[data-open-editor]').forEach((button) => {
      button.addEventListener('click', () => {
        closeOtherEditors(button.dataset.openEditor);
        const editor = document.getElementById(button.dataset.openEditor);
        editor.hidden = false;
        const message = editor.querySelector('.admin-message');
        if (message) message.textContent = 'Preview only: connect Supabase before saving entries.';
      });
    });
    return;
  }

  status.textContent = 'Supabase is connected. Sign in with an authenticated admin account.';
  showLogin();

  supabaseState.client.auth.onAuthStateChange((_event, session) => {
    loginPanel.hidden = Boolean(session);
    dashboard.hidden = !session;
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
    const { error } = await supabaseState.client.auth.signOut();
    if (error) loginMessage.textContent = error.message;
    showLogin();
  });

  document.querySelectorAll('[data-open-editor]').forEach((button) => {
    button.addEventListener('click', () => {
      closeOtherEditors(button.dataset.openEditor);
      const editor = document.getElementById(button.dataset.openEditor);
      editor.hidden = false;
      if (editor === journalEditor) loadJournalEntries();
      if (editor === memoryEditor) {
        loadMemories();
        loadTimelineEvents();
      }
      if (editor.id === 'creation-editor') loadCreations();
      if (editor === meTimelineEditor) loadMeTimeline();
    });

  });
  function closeOtherEditors(activeId) {
    editorPanels.forEach((panel) => {
      if (panel.id !== activeId) panel.hidden = true;
    });
  }

  if (meTimelineForm) {
    document.getElementById('new-me-timeline-event').addEventListener('click', () => {
      meTimelineForm.reset();
      meTimelineForm.elements.id.value = '';
      meTimelineMessage.textContent = '';
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
      const details = document.createElement('p'); details.innerHTML = `<strong>${escapeHtml(event.title)}</strong><br><small>${escapeHtml(event.year || '')}</small>`;
      const actions = document.createElement('div'); actions.className = 'editor-item-actions';
      const edit = document.createElement('button'); edit.className = 'btn btn-outline'; edit.type = 'button'; edit.textContent = 'edit'; edit.onclick = () => fillMeTimelineEvent(event, index);
      const remove = document.createElement('button'); remove.className = 'btn btn-danger'; remove.type = 'button'; remove.textContent = 'delete'; remove.onclick = () => deleteMeTimelineEvent(index, event.title);
      actions.append(edit, remove); row.append(details, actions); meTimelineList.appendChild(row);
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
    if (!error) { meTimelineForm.reset(); meTimelineForm.elements.id.value = ''; loadMeTimeline(); }
  }
  function fillMeTimelineEvent(entry, index) {
    meTimelineForm.elements.id.value = index;
    ['year', 'title', 'body', 'more', 'bodyLink', 'sort_order'].forEach((field) => { meTimelineForm.elements[field].value = entry[field] ?? ''; });
    meTimelineMessage.textContent = `editing ${entry.title}`;
    meTimelineForm.scrollIntoView({ behavior: 'smooth' });
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
    loadMemories();
  });

  document.getElementById('new-timeline-event').addEventListener('click', () => {
    timelineForm.reset();
    timelineForm.elements.id.value = '';
    timelineMessage.textContent = '';
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
    if (!error) loadTimelineEvents();
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
      const details = document.createElement('p');
      details.innerHTML = `<strong>${escapeHtml(entry.title)}</strong><br><small>${escapeHtml(entry.status)} · ${escapeHtml(entry.slug || entry.date_label)}</small>`;
      const actions = document.createElement('div');
      actions.className = 'editor-item-actions';
      const edit = document.createElement('button');
      edit.className = 'btn btn-outline';
      edit.type = 'button';
      edit.textContent = 'edit';
      edit.addEventListener('click', () => editHandler(entry.id));
      const remove = document.createElement('button');
      remove.className = 'btn btn-danger';
      remove.type = 'button';
      remove.textContent = 'delete';
      remove.addEventListener('click', () => deleteHandler(entry.id, entry.title));
      actions.append(edit, remove);
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
    memoryPhotoFields.replaceChildren();
    (data.memory_photos || []).sort((a, b) => a.sort_order - b.sort_order).forEach(addMemoryPhotoField);
    if (!data.memory_photos?.length) addMemoryPhotoField();
    memoryMessage.textContent = 'editing ' + data.title;
    memoryEditor.scrollIntoView({ behavior: 'smooth' });
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
    timelineMessage.textContent = 'editing ' + data.title;
    timelineForm.scrollIntoView({ behavior: 'smooth' });
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
  });

  journalForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    journalMessage.textContent = 'saving...';
    const formData = new FormData(journalForm);
    const payload = {
      title: formData.get('title'),
      slug: formData.get('slug'),
      excerpt: formData.get('excerpt') || '',
      body: { html: formData.get('body') || '' },
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
    if (!error) loadJournalEntries();
  });

  async function loadJournalEntries() {
    journalList.replaceChildren();
    const { data, error } = await supabaseState.client
      .from('journal_entries')
      .select('id,title,slug,status,updated_at')
      .order('updated_at', { ascending: false });
    if (error) {
      journalList.textContent = error.message;
      return;
    }
    if (!data.length) {
      journalList.textContent = 'No entries yet. Start with the form above.';
      return;
    }
    data.forEach((entry) => {
      const item = document.createElement('div');
      item.className = 'editor-list-item';
      const details = document.createElement('p');
      details.innerHTML = `<strong>${escapeHtml(entry.title)}</strong><br><small>${escapeHtml(entry.status)} · ${escapeHtml(entry.slug)}</small>`;
      const edit = document.createElement('button');
      edit.className = 'btn btn-outline';
      edit.type = 'button';
      edit.textContent = 'edit';
      edit.addEventListener('click', () => fillJournalForm(entry.id));
      const remove = document.createElement('button');
      remove.className = 'btn btn-danger';
      remove.type = 'button';
      remove.textContent = 'delete';
      remove.addEventListener('click', () => deleteJournalEntry(entry.id, entry.title));
      const actions = document.createElement('div');
      actions.className = 'editor-item-actions';
      actions.append(edit, remove);
      item.append(details, actions);
      journalList.appendChild(item);
    });
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
    journalForm.elements.body.value = data.body?.html || '';
    journalForm.elements.cover_image.value = data.cover_image || '';
    journalForm.elements.status.value = data.status;
    journalMessage.textContent = 'editing ' + data.title;
    journalEditor.scrollIntoView({ behavior: 'smooth' });
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
    document.getElementById('new-creation').addEventListener('click', () => {
      creationForm.reset();
      creationForm.elements.id.value = '';
      creationBlocks.replaceChildren();
      addCreationBlock();
      creationMessage.textContent = '';
    });
    document.getElementById('add-creation-block').addEventListener('click', () => addCreationBlock());
    creationForm.addEventListener('submit', saveCreation);
  }
  function addCreationBlock(block = { type: 'text', content: '' }) {
    const field = document.createElement('div');
    field.className = 'creation-block-field';
    field.innerHTML = '<div class="creation-block-toolbar"><select name="block_type"><option value="text">Text</option><option value="heading">Heading</option><option value="image">Image</option><option value="gallery">Gallery</option><option value="code">Code / equation</option><option value="embed">Link / embed</option></select><button class="btn btn-danger remove-block" type="button">remove</button></div><input name="block_url" type="url" placeholder="Image or external URL"><textarea name="block_content" rows="4" placeholder="Write this block..."></textarea>';
    field.querySelector('[name="block_type"]').value = block.type || 'text';
    field.querySelector('[name="block_url"]').value = block.url || '';
    field.querySelector('[name="block_content"]').value = block.content || '';
    field.querySelector('.remove-block').addEventListener('click', () => field.remove());
    creationBlocks.appendChild(field);
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
    if (!error) { creationForm.reset(); creationForm.elements.id.value = ''; creationBlocks.replaceChildren(); addCreationBlock(); loadCreations(); }
  }
  async function loadCreations() {
    if (!creationList) return;
    creationList.replaceChildren();
    const { data, error } = await supabaseState.client.from('creations').select('*').order('updated_at', { ascending: false });
    if (error) { creationList.textContent = error.message; return; }
    (data || []).forEach((entry) => {
      const row = document.createElement('div'); row.className = 'editor-list-item';
      const details = document.createElement('p'); details.innerHTML = `<strong>${escapeHtml(entry.title)}</strong><br><small>${escapeHtml(entry.category)} · ${escapeHtml(entry.status)}</small>`;
      const actions = document.createElement('div'); actions.className = 'editor-item-actions';
      const edit = document.createElement('button'); edit.className = 'btn btn-outline'; edit.type = 'button'; edit.textContent = 'edit'; edit.onclick = () => fillCreation(entry);
      const remove = document.createElement('button'); remove.className = 'btn btn-danger'; remove.type = 'button'; remove.textContent = 'delete'; remove.onclick = () => deleteCreation(entry);
      actions.append(edit, remove); row.append(details, actions); creationList.appendChild(row);
    });
  }
  function fillCreation(entry) {
    creationForm.elements.id.value = entry.id; ['title', 'slug', 'category', 'status_label', 'short_description', 'cover_image', 'project_url', 'github_url', 'status'].forEach((name) => { creationForm.elements[name].value = entry[name] || ''; });
    creationForm.elements.creation_date.value = entry.published_at ? entry.published_at.slice(0, 10) : '';
    creationForm.elements.tags.value = (entry.tags || []).join(', ');
    creationForm.elements.featured.checked = Boolean(entry.featured);
    creationBlocks.replaceChildren(); (Array.isArray(entry.body) ? entry.body : []).forEach(addCreationBlock); if (!creationBlocks.children.length) addCreationBlock();
    creationForm.scrollIntoView({ behavior: 'smooth' }); creationMessage.textContent = `editing ${entry.title}`;
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

  const influenceTables = {
    interest: { table: 'core_interests', form: document.getElementById('interest-form'), fields: ['eyebrow', 'title', 'description', 'tags'] },
    playlist: { table: 'playlists', form: document.getElementById('playlist-form'), fields: ['eyebrow', 'title', 'description', 'image_url', 'playlist_url'] },
    song: { table: 'songs', form: document.getElementById('song-form'), fields: ['title', 'artist', 'description', 'image_url', 'song_url'] },
    shaped: { table: 'shaped_items', form: document.getElementById('shaped-form'), fields: ['medium', 'title', 'short_description', 'reflection', 'image_url', 'link_url'] }
  };
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
      if (!error) { config.form.reset(); config.form.elements.id.value = ''; loadInfluenceLists(); }
    });
  });
  async function loadInfluenceLists() {
    const list = document.getElementById('influence-admin-lists');
    if (!list) return;
    list.replaceChildren();
    for (const [kind, config] of Object.entries(influenceTables)) {
      const { data } = await supabaseState.client.from(config.table).select('*').order('sort_order');
      const heading = document.createElement('h3'); heading.textContent = kind; list.appendChild(heading);
      (data || []).forEach((entry) => {
        const row = document.createElement('div'); row.className = 'editor-list-item';
        const text = document.createElement('p'); text.textContent = entry.title; const actions = document.createElement('div'); actions.className = 'editor-item-actions';
        const edit = document.createElement('button'); edit.className = 'btn btn-outline'; edit.type = 'button'; edit.textContent = 'edit'; edit.onclick = () => { config.form.elements.id.value = entry.id; config.fields.forEach((field) => { config.form.elements[field].value = Array.isArray(entry[field]) ? entry[field].join(', ') : (entry[field] || ''); }); };
        const remove = document.createElement('button'); remove.className = 'btn btn-danger'; remove.type = 'button'; remove.textContent = 'delete'; remove.onclick = async () => { const password = window.prompt('Enter your admin password to confirm deletion:'); if (!password) return; const { data: user } = await supabaseState.client.auth.getUser(); const auth = await supabaseState.client.auth.signInWithPassword({ email: user.user.email, password }); if (auth.error) return window.alert('Password verification failed.'); const result = await supabaseState.client.from(config.table).delete().eq('id', entry.id); if (result.error) window.alert(result.error.message); else loadInfluenceLists(); };
        actions.append(edit, remove); row.append(text, actions); list.appendChild(row);
      });
    }
  }

  supabaseState.client.auth.getSession().then(({ data, error }) => {
    if (error) {
      loginMessage.textContent = error.message;
      return;
    }
    loginPanel.hidden = Boolean(data.session);
    dashboard.hidden = !data.session;
    if (data.session) { loadJournalEntries(); loadInfluenceLists(); loadCreations(); }
  });
});
