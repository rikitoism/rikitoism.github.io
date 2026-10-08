export function initInfluencesEditor(ui) {
  const { $, supabase, registerForm, showEditorForm, showEditorList, refreshMarkdownPreviews } = ui;
  const collections = {
    interest: { table: 'core_interests', form: $('interest-form'), list: $('interest-list-admin'), fields: ['eyebrow', 'title', 'description', 'tags'], meta: (entry) => (entry.tags || []).join(', ') || entry.eyebrow || '', newLabel: 'New interest' },
    playlist: { table: 'playlists', form: $('playlist-form'), list: $('playlist-list-admin'), fields: ['eyebrow', 'title', 'description', 'image_url', 'playlist_url'], meta: (entry) => entry.eyebrow || '', newLabel: 'New playlist' },
    song: { table: 'songs', form: $('song-form'), list: $('song-list-admin'), fields: ['title', 'artist', 'description', 'image_url', 'song_url'], meta: (entry) => entry.artist || '', newLabel: 'New song' },
    shaped: { table: 'shaped_items', form: $('shaped-form'), list: $('shaped-list-admin'), fields: ['medium', 'title', 'short_description', 'reflection', 'image_url', 'link_url'], meta: (entry) => entry.medium || '', newLabel: 'New item' }
  };
  const tabs = [...document.querySelectorAll('[data-influence-tab]')];
  const sections = [...document.querySelectorAll('[data-influence-section]')];
  const loadVersions = {};

  function showSection(kind) {
    const active = collections[kind] ? kind : 'interest';
    tabs.forEach((tab) => tab.setAttribute('aria-pressed', String(tab.dataset.influenceTab === active)));
    sections.forEach((section) => { section.hidden = section.dataset.influenceSection !== active; });
    ui.rememberUi('influenceSection', active);
  }

  tabs.forEach((tab) => tab.addEventListener('click', () => showSection(tab.dataset.influenceTab)));
  Object.values(collections).forEach(({ form, list }) => registerForm(form, list.closest('.editor-list-wrap')));
  document.querySelectorAll('[data-new-influence]').forEach((button) => button.addEventListener('click', () => {
    const form = collections[button.dataset.newInfluence]?.form;
    if (!form) return;
    form.reset();
    form.elements.id.value = '';
    const message = form.querySelector('.admin-message');
    if (message) message.textContent = '';
    showEditorForm(form);
  }));

  Object.entries(collections).forEach(([kind, config]) => {
    config.form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const values = Object.fromEntries(config.fields.map((field) => [field, config.form.elements[field].value.trim()]));
      if (kind === 'interest') values.tags = values.tags ? values.tags.split(',').map((tag) => tag.trim()).filter(Boolean) : [];
      if (kind !== 'interest') values.status = 'published';
      const message = config.form.querySelector('.admin-message');
      const imageFile = config.form.elements.image_file?.files?.[0];
      if (imageFile) {
        const path = `influences/${crypto.randomUUID()}-${imageFile.name.replace(/[^a-z0-9._-]/gi, '-')}`;
        const result = await supabase.client.storage.from('memory-media').upload(path, imageFile, { upsert: false });
        if (result.error) { message.textContent = result.error.message; return; }
        values.image_url = supabase.client.storage.from('memory-media').getPublicUrl(path).data.publicUrl;
      }
      const id = config.form.elements.id.value;
      const query = id
        ? supabase.client.from(config.table).update(values).eq('id', id)
        : supabase.client.from(config.table).insert(values);
      const { error } = await query;
      message.textContent = error ? error.message : 'saved.';
      if (error) return;
      config.form.reset();
      config.form.elements.id.value = '';
      showEditorList(config.form);
      loadKind(kind);
    });
  });

  async function loadKind(kind) {
    const config = collections[kind];
    const version = (loadVersions[kind] || 0) + 1;
    loadVersions[kind] = version;
    const { data, error } = await supabase.client.from(config.table).select('*').order('sort_order');
    if (version !== loadVersions[kind]) return;
    const count = document.querySelector(`[data-influence-count="${kind}"]`);
    if (error) { config.list.textContent = error.message; return; }
    const entries = data || [];
    if (count) count.textContent = entries.length;
    if (!entries.length) { config.list.textContent = `Nothing here yet. Use “${config.newLabel}” to add one.`; return; }
    config.list.replaceChildren(...entries.map((entry) => {
      const row = document.createElement('div'); row.className = 'editor-list-item';
      const details = document.createElement('button'); details.className = 'editor-row-main'; details.type = 'button';
      const title = document.createElement('strong'); title.textContent = entry.title;
      const meta = document.createElement('small'); meta.textContent = config.meta(entry);
      details.append(title, meta);
      details.addEventListener('click', () => {
        config.form.elements.id.value = entry.id;
        config.fields.forEach((field) => {
          config.form.elements[field].value = Array.isArray(entry[field]) ? entry[field].join(', ') : (entry[field] || '');
        });
        refreshMarkdownPreviews(config.form);
        showEditorForm(config.form);
      });
      const remove = document.createElement('button'); remove.className = 'btn btn-danger'; remove.type = 'button'; remove.textContent = 'delete';
      remove.addEventListener('click', async () => {
        const message = config.form.querySelector('.admin-message');
        if (!await ui.verifyDelete(entry.title, message)) return;
        const result = await supabase.client.from(config.table).delete().eq('id', entry.id);
        if (result.error) message.textContent = result.error.message;
        else loadKind(kind);
      });
      const actions = document.createElement('div'); actions.className = 'editor-item-actions'; actions.append(remove);
      row.append(details, actions);
      return row;
    }));
  }

  async function loadLists() {
    showSection(ui.readUi('influenceSection', 'interest'));
    return Promise.all(Object.keys(collections).map(loadKind));
  }

  ui.onDraftRestore((form) => {
    const kind = Object.keys(collections).find((name) => collections[name].form === form);
    if (kind) showSection(kind);
  });

  return { loaders: { 'influence-editor': loadLists } };
}
