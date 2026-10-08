export function initCreationsEditor(ui) {
  const { $, supabase, uploadImage, verifyDelete } = ui;
  const form = $('creation-form');
  const studio = $('creation-studio');
  const listView = $('creation-list-view');
  const list = $('creation-list-admin');
  const doc = $('creation-document');
  const title = $('creation-title');
  const message = $('creation-form-message');
  const search = $('creation-admin-search');
  const category = $('creation-admin-category');
  const sort = $('creation-admin-sort');
  const count = $('creation-admin-count');
  const tabs = [...document.querySelectorAll('[data-creation-view]')];
  const details = $('creation-details');
  const status = $('creation-studio-status');
  const slug = form.elements.slug;
  const filter = { view: 'all', query: '', category: 'all', sort: 'updated' };
  const categoryLabels = {};
  const languages = ['javascript', 'typescript', 'python', 'html', 'css', 'json', 'bash', 'c', 'cpp', 'java', 'rust', 'go', 'sql', 'plaintext'];
  let entries = [];
  let current = null;
  let autoSlug = true;
  let changed = 0;
  let savedChange = 0;
  let saveTimer = 0;
  let saving = false;
  let activeSave = Promise.resolve();
  let selection = null;
  let slashState = null;
  let dialogMode = '';

  // Keep the fixed editor outside the admin shell so its viewport grid cannot
  // inherit a short scroll container or any shell sizing constraints.
  if (studio.parentElement !== document.body) document.body.append(studio);

  [...form.elements.category.options].forEach((option) => {
    categoryLabels[option.value] = option.textContent;
    category.append(new Option(option.textContent, option.value));
  });

  $('new-creation').addEventListener('click', () => { openStudio(null); });
  $('creation-back').addEventListener('click', closeStudio);
  $('creation-save').addEventListener('click', () => saveNow(true));
  $('creation-details-toggle').addEventListener('click', toggleDetails);
  $('creation-details-close').addEventListener('click', closeDetails);
  $('creation-insert-dialog').addEventListener('click', (event) => { if (event.target === $('creation-insert-dialog')) $('creation-insert-dialog').close(); });
  $('creation-dialog-cancel').addEventListener('click', () => $('creation-insert-dialog').close());
  $('creation-insert-form').addEventListener('submit', insertDialogSubmit);
  $('creation-toolbar').addEventListener('mousedown', (event) => { if (event.target.closest('button')) event.preventDefault(); });
  $('creation-toolbar').addEventListener('click', (event) => { const button = event.target.closest('[data-command]'); if (button) runCommand(button.dataset.command); });
  $('creation-json-preview').closest('details').addEventListener('toggle', updateJsonPreview);
  form.addEventListener('input', onDetailsInput);
  form.addEventListener('change', onDetailsInput);
  form.addEventListener('submit', (event) => { event.preventDefault(); saveNow(true); });
  title.addEventListener('input', () => {
    $('creation-studio-name').textContent = title.value.trim() || 'Untitled creation';
    if (autoSlug) slug.value = slugify(title.value);
    touch();
  });
  slug.addEventListener('input', () => { autoSlug = !slug.value || slug.value === slugify(title.value); });
  doc.addEventListener('input', onDocumentInput);
  doc.addEventListener('change', (event) => { if (event.target.closest('.creation-widget')) touch(); });
  doc.addEventListener('click', onDocumentClick);
  doc.addEventListener('keydown', onDocumentKeydown);
  doc.addEventListener('paste', onPaste);
  doc.addEventListener('dragover', (event) => { if (event.dataTransfer?.types.includes('Files')) event.preventDefault(); });
  doc.addEventListener('drop', onDrop);
  document.addEventListener('selectionchange', saveSelection);
  $('creation-slash-menu').addEventListener('mousedown', (event) => event.preventDefault());
  $('creation-slash-menu').addEventListener('click', (event) => { const option = event.target.closest('[data-index]'); if (option) chooseSlash(Number(option.dataset.index)); });

  tabs.forEach((tab) => tab.addEventListener('click', () => {
    filter.view = tab.dataset.creationView;
    tabs.forEach((item) => item.setAttribute('aria-pressed', String(item === tab)));
    render();
  }));
  search?.addEventListener('input', () => { filter.query = search.value.trim().toLowerCase(); render(); });
  category?.addEventListener('change', () => { filter.category = category.value; render(); });
  sort?.addEventListener('change', () => { filter.sort = sort.value; render(); });
  document.addEventListener('keydown', onGlobalKeydown);
  window.addEventListener('beforeunload', (event) => {
    if (studio.hidden || savedChange === changed || !current) return;
    event.preventDefault();
    event.returnValue = '';
  });

  async function loadCreations() {
    const { data, error } = await supabase.client.from('creations').select('*').order('updated_at', { ascending: false });
    if (error) { list.textContent = error.message; return; }
    entries = data || [];
    render();
  }

  function render() {
    const stamp = (entry) => new Date(entry.updated_at || entry.created_at || 0).getTime();
    const visible = entries.filter((entry) => {
      if (filter.view !== 'all' && entry.status !== filter.view) return false;
      if (filter.category !== 'all' && entry.category !== filter.category) return false;
      return !filter.query || `${entry.title} ${entry.short_description || ''} ${entry.status_label || ''} ${(entry.tags || []).join(' ')}`.toLowerCase().includes(filter.query);
    }).sort((a, b) => {
      if (filter.sort === 'title') return String(a.title).localeCompare(String(b.title));
      if (filter.sort === 'oldest') return stamp(a) - stamp(b);
      if (filter.sort === 'featured') return Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || stamp(b) - stamp(a);
      return stamp(b) - stamp(a);
    });
    count.textContent = visible.length === entries.length ? `${entries.length} ${entries.length === 1 ? 'creation' : 'creations'}` : `${visible.length} of ${entries.length}`;
    if (!visible.length) {
      const note = document.createElement('p'); note.className = 'admin-help';
      note.textContent = entries.length ? 'No creations match these filters.' : 'No creations yet. Add the first one with “New creation”.';
      list.replaceChildren(note); return;
    }
    list.replaceChildren(...visible.map((entry) => {
      const row = document.createElement('div'); row.className = 'editor-list-item';
      const open = document.createElement('button'); open.className = 'editor-row-main'; open.type = 'button';
      const name = document.createElement('strong'); name.textContent = entry.title || 'Untitled creation';
      const meta = document.createElement('small'); meta.textContent = `${categoryLabels[entry.category] || entry.category} · ${entry.status}${entry.featured ? ' · featured' : ''}`;
      open.append(name, meta); open.addEventListener('click', () => openStudio(entry));
      const remove = document.createElement('button'); remove.className = 'btn btn-danger'; remove.type = 'button'; remove.textContent = 'delete';
      remove.addEventListener('click', () => deleteCreation(entry));
      const actions = document.createElement('div'); actions.className = 'editor-item-actions'; actions.append(remove);
      row.append(open, actions); return row;
    }));
  }

  async function openStudio(entry) {
    await window.rikitoMarkdownReady?.catch(() => {});
    await window.rikitoMarkdown?.ensure?.().catch(() => {});
    current = entry ? { ...entry, body: normalizeBody(entry.body) } : {
      id: null, title: '', slug: '', category: 'writing', status: 'draft', status_label: 'in progress',
      short_description: '', tags: [], cover_image: '', project_url: '', github_url: '', published_at: null, featured: false, body: []
    };
    form.reset();
    form.elements.id.value = current.id || '';
    title.value = current.title || '';
    $('creation-studio-name').textContent = current.title || 'Untitled creation';
    fillDetails(current);
    doc.replaceChildren();
    hydrateBody(current.body);
    if (!doc.childNodes.length) doc.innerHTML = '<p><br></p>';
    studio.hidden = false; listView.hidden = true;
    document.body.classList.add('creation-studio-open');
    details.hidden = true; $('creation-details-toggle').setAttribute('aria-expanded', 'false');
    $('creation-form-message').textContent = '';
    changed = 0; savedChange = 0; selection = null; setState(entry ? 'saved' : 'new');
    setTimeout(() => (entry ? doc : title).focus(), 50);
  }

  function fillDetails(entry) {
    slug.value = entry.slug || slugify(entry.title || '');
    autoSlug = !entry.slug || entry.slug === slugify(entry.title || '');
    ['category', 'status', 'status_label', 'short_description', 'cover_image', 'project_url', 'github_url']
      .forEach((name) => { form.elements[name].value = entry[name] || ''; });
    form.elements.creation_date.value = entry.published_at ? entry.published_at.slice(0, 10) : '';
    form.elements.tags.value = (entry.tags || []).join(', ');
    form.elements.featured.checked = Boolean(entry.featured);
  }

  function onDetailsInput(event) {
    if (event.target === slug) { autoSlug = !slug.value || slug.value === slugify(title.value); }
    touch();
  }

  function toggleDetails() {
    details.hidden = !details.hidden;
    $('creation-details-toggle').setAttribute('aria-expanded', String(!details.hidden));
    if (!details.hidden) { updateJsonPreview(); slug.focus(); }
  }
  function closeDetails() { details.hidden = true; $('creation-details-toggle').setAttribute('aria-expanded', 'false'); }

  function onDocumentInput(event) {
    const widget = event.target.closest?.('.creation-widget');
    if (widget?.dataset.type === 'code') drawCode(widget);
    if (widget?.dataset.type === 'equation') drawEquation(widget);
    if (!widget && event.inputType === 'insertText' && event.data === ' ') convertMarkdownShortcut();
    if (!widget) checkSlashMenu();
    touch();
  }

  function touch() {
    if (studio.hidden) return;
    changed += 1; setState('unsaved'); clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveNow(false), 1400);
    if (!$('creation-json-preview').closest('details').open) return;
    updateJsonPreview();
  }

  async function saveNow(manual) {
    clearTimeout(saveTimer);
    if (studio.hidden || !current || changed === savedChange) return;
    if (saving) {
      try { await activeSave; } catch { return; }
      if (changed !== savedChange) return saveNow(manual);
      return;
    }
    if (!title.value.trim() && !doc.textContent.trim() && !doc.querySelector('img')) {
      if (manual) setState('new');
      return;
    }
    const revision = changed;
    setState('saving'); message.textContent = '';
    const payload = readPayload();
    if (!payload.slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(payload.slug)) {
      saving = false; message.textContent = 'Add a valid slug in Details before saving.'; setState('unsaved'); return;
    }
    saving = true;
    activeSave = (async () => {
      const query = current.id
        ? supabase.client.from('creations').update(payload).eq('id', current.id).select('*').single()
        : supabase.client.from('creations').insert(payload).select('*').single();
      const { data, error } = await query;
      if (error) throw error;
      current = { ...data, body: normalizeBody(data.body) };
      form.elements.id.value = current.id;
      savedChange = revision;
      const existing = entries.findIndex((item) => item.id === current.id);
      if (existing >= 0) entries[existing] = current; else entries.unshift(current);
      render();
      setState(revision === changed ? (manual ? 'saved' : 'autosaved') : 'unsaved');
      message.textContent = manual ? 'Creation saved.' : 'Changes saved.';
      updateJsonPreview();
    })();
    let saveSucceeded = false;
    try {
      await activeSave;
      saveSucceeded = true;
    } catch (error) {
      message.textContent = error.message || 'Creation could not be saved.';
      setState('unsaved');
    } finally {
      saving = false;
      if (saveSucceeded && changed !== savedChange && !studio.hidden) { clearTimeout(saveTimer); saveTimer = setTimeout(() => saveNow(false), 300); }
      if (manual && savedChange === changed) setState('saved');
    }
  }

  function readPayload() {
    const values = new FormData(form);
    return {
      title: title.value.trim() || 'Untitled creation', slug: String(values.get('slug') || '').trim(), category: values.get('category'),
      status_label: String(values.get('status_label') || 'in progress').trim(), short_description: String(values.get('short_description') || '').trim(),
      tags: String(values.get('tags') || '').split(',').map((tag) => tag.trim()).filter(Boolean),
      cover_image: String(values.get('cover_image') || '').trim() || null,
      project_url: String(values.get('project_url') || '').trim() || null, github_url: String(values.get('github_url') || '').trim() || null,
      published_at: values.get('creation_date') ? `${values.get('creation_date')}T00:00:00Z` : null,
      featured: form.elements.featured.checked, status: values.get('status'), body: serializeBody()
    };
  }

  function serializeBody() {
    const clone = doc.cloneNode(true);
    clone.querySelectorAll('.creation-widget').forEach((widget) => {
      const type = widget.dataset.type;
      if (type === 'code') {
        const pre = document.createElement('pre'); pre.className = 'creation-rich-code'; pre.dataset.language = widget.querySelector('select').value;
        const code = document.createElement('code'); code.textContent = widget.querySelector('textarea').value; pre.append(code); widget.replaceWith(pre);
      } else if (type === 'equation') {
        const equation = document.createElement('div'); equation.className = 'creation-rich-equation'; equation.dataset.tex = widget.querySelector('textarea').value.trim(); equation.textContent = equation.dataset.tex; widget.replaceWith(equation);
      } else if (type === 'image') {
        const imageUrl = widget.querySelector('input[type="url"]').value.trim();
        if (!imageUrl) { widget.remove(); return; }
        const figure = document.createElement('figure'); figure.className = 'creation-rich-figure';
        const img = document.createElement('img'); img.src = imageUrl; img.alt = widget.querySelector('img').alt || '';
        const caption = widget.querySelector('figcaption').textContent.trim(); figure.append(img);
        if (caption) { const figcaption = document.createElement('figcaption'); figcaption.textContent = caption; figure.append(figcaption); }
        widget.replaceWith(figure);
      } else if (type === 'table') {
        const table = widget.querySelector('table').cloneNode(true); table.className = 'creation-rich-table'; widget.replaceWith(table);
      } else if (type === 'divider') {
        widget.replaceWith(document.createElement('hr'));
      }
    });
    clone.querySelectorAll('[contenteditable], [data-editor-only]').forEach((element) => { element.removeAttribute('contenteditable'); element.removeAttribute('data-editor-only'); });
    const sanitized = window.rikitoMarkdown?.sanitizeHtml ? window.rikitoMarkdown.sanitizeHtml(clone.innerHTML) : clone.innerHTML;
    return [{ type: 'document', content: sanitized }];
  }

  function normalizeBody(value) { return Array.isArray(value) ? value : Array.isArray(value?.blocks) ? value.blocks : []; }
  function hydrateBody(body) {
    if (body.length === 1 && body[0]?.type === 'document') {
      doc.innerHTML = window.rikitoMarkdown?.sanitizeHtml ? window.rikitoMarkdown.sanitizeHtml(body[0].content || '') : body[0].content || '';
      doc.querySelectorAll('.creation-rich-code').forEach((pre) => {
        const widget = createWidget('code', { language: pre.dataset.language, content: pre.textContent }); pre.replaceWith(widget);
      });
      doc.querySelectorAll('.creation-rich-equation').forEach((equation) => {
        const widget = createWidget('equation', { content: equation.dataset.tex || equation.textContent }); equation.replaceWith(widget);
      });
      doc.querySelectorAll('.creation-rich-figure').forEach((figure) => {
        const image = figure.querySelector('img'); const widget = createWidget('image', { url: image?.getAttribute('src'), content: figure.querySelector('figcaption')?.textContent || '', alt: image?.alt || '' }); figure.replaceWith(widget);
      });
      doc.querySelectorAll('.creation-rich-table').forEach((table) => {
        const rows = [...table.rows].map((row) => [...row.cells].map((cell) => cell.textContent));
        table.replaceWith(createWidget('table', { rows }));
      });
      return;
    }
    doc.replaceChildren();
    body.forEach((block) => {
      if (['code', 'equation', 'image', 'table'].includes(block.type)) { doc.append(createWidget(block.type, block), document.createElement('p')); return; }
      if (block.type === 'gallery') { [block.url, ...(block.content || '').split('\n')].filter(Boolean).forEach((url) => doc.append(createWidget('image', { url }), document.createElement('p'))); return; }
      if (block.type === 'divider') { doc.append(document.createElement('hr'), document.createElement('p')); return; }
      if (block.type === 'embed') { const p = document.createElement('p'); const a = document.createElement('a'); a.href = block.url || '#'; a.textContent = block.content || block.url || 'link'; p.append(a); doc.append(p); return; }
      const level = Math.min(3, Math.max(1, Number(block.level) || 2));
      const html = block.type === 'heading' ? `<h${level}>${window.rikitoMarkdown?.renderInline(block.content || '') || escapeHtml(block.content || '')}</h${level}>` : (window.rikitoMarkdown?.render(block.content || '') || `<p>${escapeHtml(block.content || '')}</p>`);
      appendSafeMarkup(html);
    });
    if (!doc.childNodes.length) doc.innerHTML = '<p><br></p>';
  }

  function appendSafeMarkup(html) { const wrapper = document.createElement('div'); wrapper.innerHTML = window.rikitoMarkdown?.sanitizeHtml ? window.rikitoMarkdown.sanitizeHtml(html) : html; doc.append(...wrapper.childNodes); }

  function createWidget(type, values = {}) {
    const widget = document.createElement('section'); widget.className = 'creation-widget'; widget.dataset.type = type; widget.contentEditable = 'false';
    const head = document.createElement('div'); head.className = 'creation-widget-head';
    const label = document.createElement('span'); label.textContent = ({ code: 'Code', equation: 'LaTeX equation', image: 'Image', table: 'Table' })[type] || type;
    head.append(label);
    if (type === 'code') {
      const language = document.createElement('select'); language.setAttribute('aria-label', 'Code language');
      languages.forEach((value) => language.add(new Option(value === 'plaintext' ? 'Plain text' : value.toUpperCase(), value)));
      language.value = languages.includes(values.lang || values.language) ? values.lang || values.language : 'javascript'; head.append(language);
    }
    if (type === 'table') {
      head.append(widgetButton('+ Row', 'row'), widgetButton('+ Column', 'column'));
    }
    head.append(widgetButton('×', 'delete', 'Remove block'));
    const content = document.createElement('div'); content.className = 'creation-widget-content';
    if (type === 'code') {
      const editor = document.createElement('div'); editor.className = 'creation-code-edit';
      const pre = document.createElement('pre'); pre.setAttribute('aria-hidden', 'true'); const code = document.createElement('code'); pre.append(code);
      const textarea = document.createElement('textarea'); textarea.spellcheck = false; textarea.setAttribute('aria-label', 'Code block'); textarea.value = values.content || ''; editor.append(pre, textarea); content.append(editor);
    } else if (type === 'equation') {
      const textarea = document.createElement('textarea'); textarea.spellcheck = false; textarea.setAttribute('aria-label', 'LaTeX equation'); textarea.placeholder = 'E = mc^2'; textarea.value = values.content || '';
      const preview = document.createElement('div'); preview.className = 'creation-equation-preview'; preview.textContent = textarea.value || 'Equation preview'; content.append(textarea, preview);
    } else if (type === 'image') {
      const imageUrl = values.url || values.src || '';
      const image = document.createElement('img'); if (imageUrl) image.src = imageUrl; image.alt = values.alt || values.content || ''; image.hidden = !imageUrl;
      const caption = document.createElement('figcaption'); caption.contentEditable = 'true'; caption.dataset.placeholder = 'Add a caption'; caption.textContent = values.content || '';
      caption.addEventListener('input', () => { image.alt = caption.textContent.trim(); });
      const url = document.createElement('input'); url.type = 'url'; url.placeholder = 'Image URL'; url.setAttribute('aria-label', 'Image URL'); url.value = values.url || values.src || '';
      url.addEventListener('input', () => { if (url.value) image.src = url.value; else image.removeAttribute('src'); image.hidden = !url.value; touch(); }); content.append(image, caption, url);
    } else if (type === 'table') {
      const table = document.createElement('table'); const rows = Array.isArray(values.rows) ? values.rows : [['Column 1', 'Column 2'], ['', '']];
      rows.forEach((row, r) => { const tr = table.insertRow(); row.forEach((value) => { const cell = document.createElement(r === 0 ? 'th' : 'td'); cell.contentEditable = 'true'; cell.textContent = value; tr.append(cell); }); }); content.append(table);
    }
    widget.append(head, content);
    if (type === 'code') { widget.querySelector('select').addEventListener('change', touch); drawCode(widget); }
    if (type === 'equation') drawEquation(widget);
    return widget;
  }

  function widgetButton(text, action, label = text) {
    const button = document.createElement('button'); button.type = 'button'; button.dataset.widgetAction = action; button.textContent = text; button.setAttribute('aria-label', label); return button;
  }
  function drawCode(widget) {
    const textarea = widget.querySelector('textarea'); const code = widget.querySelector('pre code'); if (!textarea || !code) return;
    const source = textarea.value; widget.dataset.code = source; code.textContent = source;
    loadHighlight().then(() => {
      if (textarea.value !== source || !window.hljs) return;
      const language = widget.querySelector('select').value;
      try { code.innerHTML = language !== 'plaintext' && window.hljs.getLanguage(language) ? window.hljs.highlight(source, { language, ignoreIllegals: true }).value : escapeHtml(source); }
      catch { code.textContent = source; }
    }).catch(() => {});
    textarea.style.height = 'auto'; textarea.style.height = `${Math.max(120, textarea.scrollHeight)}px`;
  }

  function loadHighlight() {
    if (window.hljs) return Promise.resolve();
    if (window.creationHighlightLoading) return window.creationHighlightLoading;
    window.creationHighlightLoading = new Promise((resolve, reject) => { const script = document.createElement('script'); script.src = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js'; script.onload = resolve; script.onerror = reject; document.head.append(script); });
    return window.creationHighlightLoading;
  }
  function drawEquation(widget) {
    const preview = widget.querySelector('.creation-equation-preview'); const value = widget.querySelector('textarea').value.trim();
    preview.textContent = value || 'Equation preview'; preview.classList.toggle('is-empty', !value);
    if (value) loadMathJax().then(() => { if (!widget.isConnected || widget.querySelector('textarea').value.trim() !== value) return; try { preview.replaceChildren(window.MathJax.tex2svg(value, { display: true })); } catch { preview.textContent = value; } }).catch(() => {});
  }

  function loadMathJax() {
    if (window.MathJax?.tex2svg) return Promise.resolve();
    if (window.creationMathJaxLoading) return window.creationMathJaxLoading;
    window.MathJax = { startup: { typeset: false }, svg: { fontCache: 'none' } };
    window.creationMathJaxLoading = new Promise((resolve, reject) => {
      const script = document.createElement('script'); script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/tex-svg.js';
      script.onload = () => Promise.resolve(window.MathJax?.startup?.promise).then(() => {
        if (typeof window.MathJax?.tex2svg !== 'function') throw new Error('MathJax did not initialize.');
        resolve();
      }).catch(reject);
      script.onerror = reject;
      document.head.append(script);
    });
    return window.creationMathJaxLoading;
  }

  function runCommand(command) {
    restoreSelection();
    if (['bold', 'italic', 'underline', 'undo', 'redo'].includes(command)) document.execCommand(command);
    else if (command === 'mark') toggleMark();
    else if (command === 'p' || /^h[1-3]$/.test(command)) formatBlock(command === 'p' ? 'p' : command);
    else if (command === 'ul') document.execCommand('insertUnorderedList');
    else if (command === 'ol') document.execCommand('insertOrderedList');
    else if (command === 'quote') formatBlock('blockquote');
    else if (command === 'link' || command === 'image') openInsertDialog(command);
    else if (['code', 'equation', 'table', 'divider'].includes(command)) insertWidget(command);
    touch();
  }

  function formatBlock(tag) { const block = currentBlock(); if (block?.tagName.toLowerCase() === tag && tag !== 'p') tag = 'p'; document.execCommand('formatBlock', false, `<${tag}>`); }
  function toggleMark() {
    const selection = window.getSelection(); if (!selection?.rangeCount) return;
    const range = selection.getRangeAt(0); if (range.collapsed) return;
    const mark = document.createElement('mark');
    try { range.surroundContents(mark); } catch { const fragment = range.extractContents(); mark.append(fragment); range.insertNode(mark); }
  }

  function insertWidget(type, values = {}) {
    restoreSelection();
    const widget = createWidget(type, values);
    const sel = window.getSelection();
    if (sel?.rangeCount && doc.contains(sel.anchorNode)) {
      const range = sel.getRangeAt(0); range.deleteContents(); range.insertNode(widget);
      const after = document.createElement('p'); after.innerHTML = '<br>'; widget.after(after); setCaret(after);
    } else { doc.append(widget, Object.assign(document.createElement('p'), { innerHTML: '<br>' })); setCaret(doc.lastElementChild); }
    touch();
  }

  function onDocumentClick(event) {
    const button = event.target.closest('[data-widget-action]'); if (!button) return;
    const widget = button.closest('.creation-widget'); const action = button.dataset.widgetAction;
    if (action === 'delete') { widget.remove(); ensureParagraph(); }
    if (action === 'row') { const table = widget.querySelector('table'); const last = table.rows[table.rows.length - 1]; const row = table.insertRow(); Array.from(last.cells).forEach(() => row.insertCell().contentEditable = 'true'); }
    if (action === 'column') Array.from(widget.querySelectorAll('tr')).forEach((row, index) => { const cell = document.createElement(index ? 'td' : 'th'); cell.contentEditable = 'true'; row.append(cell); });
    touch();
  }

  function onDocumentKeydown(event) {
    const menu = $('creation-slash-menu');
    if (slashState && !menu.hidden) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); slashState.index = (slashState.index + (event.key === 'ArrowDown' ? 1 : -1) + slashState.commands.length) % slashState.commands.length; drawSlashMenu(); return; }
      if (event.key === 'Enter' || event.key === 'Tab') { event.preventDefault(); chooseSlash(slashState.index); return; }
      if (event.key === 'Escape') { closeSlashMenu(); return; }
    }
    if (event.target.tagName === 'TEXTAREA' && event.key === 'Tab') { event.preventDefault(); document.execCommand('insertText', false, '  '); }
    if ((event.target.tagName === 'TD' || event.target.tagName === 'TH') && event.key === 'Tab') {
      event.preventDefault(); const cells = [...event.target.closest('table').querySelectorAll('th,td')]; const next = cells[cells.indexOf(event.target) + (event.shiftKey ? -1 : 1)]; if (next) setCaret(next);
    }
  }

  function convertMarkdownShortcut() {
    const block = currentBlock(); if (!block || block.tagName !== 'P') return;
    const shortcuts = { '# ': 'h1', '## ': 'h2', '### ': 'h3', '- ': 'ul', '* ': 'ul', '1. ': 'ol', '> ': 'quote' };
    const command = shortcuts[block.textContent.replace(/\u00a0/g, ' ')]; if (!command) return;
    const range = document.createRange(); range.selectNodeContents(block); const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range); document.execCommand('delete');
    if (command === 'ul' || command === 'ol') document.execCommand(command === 'ul' ? 'insertUnorderedList' : 'insertOrderedList'); else formatBlock(command);
  }

  const commands = [
    ['Text', 'Paragraph', 'p', 'paragraph normal'], ['Heading 1', 'Large section heading', 'h1', 'heading title'], ['Heading 2', 'Section heading', 'h2', 'heading'], ['Heading 3', 'Small heading', 'h3', 'heading'],
    ['Bulleted list', 'Simple list', 'ul', 'list bullet'], ['Numbered list', 'Ordered list', 'ol', 'list number'], ['Quote', 'Pull quote', 'quote', 'blockquote'],
    ['Image', 'Upload or link an image', 'image', 'photo picture'], ['Code', 'Code block', 'code', 'snippet program'], ['Equation', 'LaTeX equation', 'equation', 'math latex'], ['Table', 'Rows and columns', 'table', 'grid'], ['Divider', 'Visual break', 'divider', 'line'], ['Link', 'Link selected text', 'link', 'url']
  ];
  function checkSlashMenu() {
    const selection = window.getSelection(); if (!selection?.rangeCount || !selection.isCollapsed) return closeSlashMenu();
    const node = selection.anchorNode; if (!node || node.nodeType !== 3 || node.parentElement.closest('.creation-widget')) return closeSlashMenu();
    const match = /(?:^|\s)\/(\w[\w ]{0,16})?$/.exec(node.textContent.slice(0, selection.anchorOffset)); if (!match) return closeSlashMenu();
    const query = (match[1] || '').toLowerCase(); const found = commands.filter((item) => !query || `${item[0]} ${item[3]}`.toLowerCase().includes(query));
    if (!found.length) return closeSlashMenu();
    slashState = { node, end: selection.anchorOffset, query, commands: found, index: 0 }; drawSlashMenu(selection.getRangeAt(0));
  }
  function drawSlashMenu(range) {
    const menu = $('creation-slash-menu');
    menu.replaceChildren(...slashState.commands.map((item, index) => {
      const button = document.createElement('button'); button.type = 'button'; button.setAttribute('role', 'option'); button.dataset.index = index; button.classList.toggle('is-active', index === slashState.index);
      const name = document.createElement('strong'); name.textContent = item[0]; const hint = document.createElement('small'); hint.textContent = item[1]; button.append(name, hint); return button;
    }));
    menu.hidden = false;
    if (range) { const rect = range.getBoundingClientRect(); menu.style.left = `${Math.max(8, Math.min(rect.left, innerWidth - menu.offsetWidth - 8))}px`; menu.style.top = `${Math.min(rect.bottom + 5, innerHeight - menu.offsetHeight - 8)}px`; }
  }
  function chooseSlash(index) {
    const item = slashState?.commands[index]; if (!item) return;
    const { node, end, query } = slashState; const range = document.createRange(); range.setStart(node, Math.max(0, end - query.length - 1)); range.setEnd(node, end);
    const selected = window.getSelection(); selected.removeAllRanges(); selected.addRange(range); document.execCommand('delete');
    const cursor = selected.getRangeAt(0).cloneRange(); closeSlashMenu(); selection = cursor; runCommand(item[2]);
  }
  function closeSlashMenu() { slashState = null; $('creation-slash-menu').hidden = true; }

  function saveSelection() {
    const currentSelection = window.getSelection(); if (currentSelection?.rangeCount && doc.contains(currentSelection.anchorNode)) selection = currentSelection.getRangeAt(0).cloneRange();
  }
  function restoreSelection() {
    const selectionObject = window.getSelection();
    if (selection && doc.contains(selection.startContainer)) { doc.focus(); selectionObject.removeAllRanges(); selectionObject.addRange(selection); }
    else doc.focus();
  }
  function currentBlock() { const selectionObject = window.getSelection(); let node = selectionObject?.anchorNode; if (!node || !doc.contains(node)) return null; while (node && node.parentNode !== doc) node = node.parentNode; return node?.nodeType === 1 ? node : null; }
  function setCaret(element) { if (!element) return; element.focus?.(); const range = document.createRange(); range.selectNodeContents(element); range.collapse(false); const selectionObject = window.getSelection(); selectionObject.removeAllRanges(); selectionObject.addRange(range); }
  function ensureParagraph() { const last = doc.lastElementChild; if (!last || last.classList.contains('creation-widget') || /^(UL|OL|BLOCKQUOTE|TABLE|HR)$/.test(last.tagName)) doc.insertAdjacentHTML('beforeend', '<p><br></p>'); }

  function openInsertDialog(mode) {
    dialogMode = mode; closeSlashMenu();
    $('creation-dialog-title').textContent = mode === 'link' ? 'Add a link' : 'Insert an image';
    $('creation-upload-label').hidden = mode === 'link'; $('creation-alt-label').hidden = mode === 'link';
    $('creation-insert-url').value = ''; $('creation-insert-alt').value = ''; $('creation-insert-file').value = '';
    $('creation-insert-dialog').showModal(); $('creation-insert-url').focus();
  }
  async function insertDialogSubmit(event) {
    event.preventDefault(); const urlInput = $('creation-insert-url'); let url = urlInput.value.trim(); const file = $('creation-insert-file').files[0]; const caption = $('creation-insert-alt').value.trim();
    $('creation-insert-dialog').close(); restoreSelection();
    if (dialogMode === 'image') {
      if (file) { setState('saving'); try { url = await uploadImage(await optimizeImage(file), 'creations'); } catch (error) { message.textContent = error.message; setState('unsaved'); return; } }
      if (url) insertWidget('image', { url, content: caption, alt: caption }); return;
    }
    if (!url) return;
    if (!/^(https?:|mailto:|\/|#)/i.test(url)) url = `https://${url}`;
    const selected = window.getSelection();
    if (!selected?.rangeCount || selected.isCollapsed) { const anchor = document.createElement('a'); anchor.href = url; anchor.textContent = url; insertNode(anchor); }
    else document.execCommand('createLink', false, url);
    touch();
  }
  function insertNode(node) { restoreSelection(); const selected = window.getSelection(); if (selected?.rangeCount && doc.contains(selected.anchorNode)) selected.getRangeAt(0).insertNode(node); else doc.append(node); }
  async function optimizeImage(file) {
    if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') return file;
    try {
      const objectUrl = URL.createObjectURL(file); const image = await new Promise((resolve, reject) => { const item = new Image(); item.onload = () => resolve(item); item.onerror = reject; item.src = objectUrl; });
      const scale = Math.min(1, 1440 / image.naturalWidth, 1440 / image.naturalHeight); const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d'); context.drawImage(image, 0, 0, canvas.width, canvas.height); URL.revokeObjectURL(objectUrl);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', .82));
      if (!blob || blob.size >= file.size) return file;
      return new File([blob], `${file.name.replace(/\.[^.]+$/, '') || 'creation-image'}.webp`, { type: 'image/webp', lastModified: Date.now() });
    } catch { return file; }
  }
  async function onPaste(event) {
    if (event.target.closest('textarea')) return;
    const file = [...(event.clipboardData?.files || [])].find((item) => item.type.startsWith('image/'));
    if (file) { event.preventDefault(); await pasteImage(file); return; }
    if (event.target.closest('.creation-widget')) return;
    event.preventDefault(); document.execCommand('insertText', false, event.clipboardData?.getData('text/plain') || '');
  }
  async function onDrop(event) {
    const file = [...(event.dataTransfer?.files || [])].find((item) => item.type.startsWith('image/')); if (!file) return;
    event.preventDefault(); await pasteImage(file);
  }
  async function pasteImage(file) {
    setState('saving'); message.textContent = 'Optimizing and uploading image…';
    try { const url = await uploadImage(await optimizeImage(file), 'creations'); insertWidget('image', { url, content: file.name }); message.textContent = ''; }
    catch (error) { message.textContent = error.message; setState('unsaved'); }
  }

  function updateJsonPreview() { if ($('creation-json-preview').closest('details').open) $('creation-json-preview').textContent = JSON.stringify(readPayload().body, null, 2); }
  function setState(stateName) {
    const labels = { new: 'New draft', unsaved: 'Unsaved changes', saving: 'Saving…', saved: 'Saved', autosaved: 'Autosaved', error: 'Save failed' };
    status.dataset.state = stateName; status.querySelector('span').textContent = labels[stateName] || 'Saved';
  }

  async function closeStudio() {
    clearTimeout(saveTimer);
    if (changed !== savedChange && current && (title.value.trim() || doc.textContent.trim() || doc.querySelector('img'))) {
      await saveNow(true);
      if (savedChange !== changed) return;
    }
    studio.hidden = true; listView.hidden = false; document.body.classList.remove('creation-studio-open'); closeDetails(); closeSlashMenu(); render();
  }
  async function deleteCreation(entry) {
    if (!await verifyDelete(entry.title, message)) return;
    const { error } = await supabase.client.from('creations').delete().eq('id', entry.id);
    message.textContent = error ? error.message : 'Creation deleted.';
    if (!error) { entries = entries.filter((item) => item.id !== entry.id); render(); }
  }
  function onGlobalKeydown(event) {
    if (studio.hidden) return;
    const modifier = event.metaKey || event.ctrlKey;
    if (modifier && event.key.toLowerCase() === 's') { event.preventDefault(); saveNow(true); }
    else if (modifier && event.key.toLowerCase() === 'k' && doc.contains(document.activeElement)) { event.preventDefault(); runCommand('link'); }
    else if (event.key === 'Escape' && !slashState && !details.hidden) closeDetails();
  }

  return { loaders: { 'creation-editor': loadCreations } };
}

function slugify(value) { return String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
  function escapeHtml(value) { const element = document.createElement('span'); element.textContent = String(value ?? ''); return element.innerHTML; }
function escapeAttr(value) { return escapeHtml(value).replace(/'/g, '&#39;'); }
