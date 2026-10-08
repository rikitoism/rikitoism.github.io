document.addEventListener('DOMContentLoaded', () => {
  const client = window.soulSupabase?.client;
  const list = document.getElementById('guestbook-pending-list');
  const openButton = document.querySelector('[data-open-editor="guestbook-editor"]');
  const refreshButton = document.getElementById('refresh-guestbook');
  const pendingCount = document.getElementById('guestbook-pending-count');
  const railBadge = document.getElementById('guestbook-rail-badge');
  const notice = document.getElementById('guestbook-admin-notice');
  const viewTabs = [...document.querySelectorAll('[data-guestbook-view]')];
  const searchInput = document.getElementById('guestbook-admin-search');
  const searchToggle = document.getElementById('guestbook-search-toggle');
  const typeFilter = document.getElementById('guestbook-admin-type');
  const typeLabels = {
    opinion: '💭 Opinion',
    appreciation: '🫂 Appreciation',
    confession: '🗣️ Confession',
    criticism: '🔥 Criticism',
    'something-else': '👁️ Something else'
  };
  let entries = [];
  let activeView = 'pending';
  let loadVersion = 0;

  openButton?.addEventListener('click', loadEntries);
  refreshButton?.addEventListener('click', loadEntries);
  window.addEventListener('admin:editor-open', (event) => {
    if (event.detail?.panelId === 'guestbook-editor') {
      list.querySelectorAll('.guestbook-reply-editor[open]').forEach((editor) => { editor.open = false; });
      loadEntries();
    }
  });
  viewTabs.forEach((tab) => tab.addEventListener('click', () => {
    activeView = tab.dataset.guestbookView;
    viewTabs.forEach((item) => item.setAttribute('aria-pressed', String(item === tab)));
    loadEntries();
  }));
  searchToggle?.addEventListener('click', () => {
    const isOpen = !searchInput.hidden;
    searchInput.hidden = isOpen;
    searchToggle.setAttribute('aria-expanded', String(!isOpen));
    searchToggle.setAttribute('aria-label', isOpen ? 'Show note search' : 'Hide note search');
    if (isOpen) {
      searchInput.value = '';
      renderEntries();
    } else searchInput.focus();
  });
  searchInput.addEventListener('input', renderEntries);
  typeFilter.addEventListener('change', renderEntries);
  client?.auth.getSession().then(({ data }) => {
    if (data.session && window.location.hash === '#guestbook') loadEntries();
  });

  async function loadEntries() {
    if (!client) {
      showMessage('Connect Supabase and run the guestbook migration to review notes.');
      return;
    }
    const viewNames = { pending: 'notes waiting for review', approved: 'notes on the wall', hidden: 'hidden notes' };
    const requestVersion = ++loadVersion;
    showMessage(`Loading ${viewNames[activeView]}...`);
    if (refreshButton) refreshButton.disabled = true;
    let result = await client
      .from('guestbook_entries')
      .select('id,name,message,type,feeling,is_anonymous,reply,created_at')
      .eq('status', activeView)
      .order('created_at', { ascending: activeView === 'pending' });
    if (result.error?.code === '42703') {
      result = await client
        .from('guestbook_entries')
        .select('id,name,message,type,is_anonymous,reply,created_at')
        .eq('status', activeView)
        .order('created_at', { ascending: activeView === 'pending' });
    }
    const { data, error } = result;
    if (requestVersion !== loadVersion) return;
    if (refreshButton) refreshButton.disabled = false;
    if (error) {
      console.error('Guestbook moderation query failed:', error);
      showMessage('Notes could not be loaded. Check the migration and admin access.');
      return;
    }
    entries = data || [];
    if (activeView === 'pending') updatePendingCount(entries.length);
    if (pendingCount) pendingCount.textContent = activeView === 'pending' ? `${entries.length} waiting` : activeView === 'approved' ? `${entries.length} on wall` : `${entries.length} hidden`;
    renderEntries();
  }

  function renderEntries() {
    const query = searchInput.value.trim().toLowerCase();
    const selectedType = typeFilter.value;
    const visible = entries.filter((entry) => {
      const matchesType = selectedType === 'all' || entry.type === selectedType;
      const matchesQuery = !query || `${entry.message} ${entry.name || ''} ${entry.type}`.toLowerCase().includes(query);
      return matchesType && matchesQuery;
    });
    if (!visible.length) {
      const message = entries.length
        ? 'No notes match these filters.'
        : activeView === 'pending' ? 'All caught up. Nothing is waiting for review.' : activeView === 'approved' ? 'Nothing has been published to the wall yet.' : 'Nothing is hidden.';
      showMessage(message);
      return;
    }
    list.replaceChildren(...visible.map(createEntryCard));
  }

  function createEntryCard(entry) {
    const card = document.createElement('article');
    card.className = 'guestbook-pending-item';
    card.dataset.kind = entry.type;

    const meta = document.createElement('div');
    meta.className = 'guestbook-pending-meta';
    const identity = document.createElement('strong');
    identity.textContent = entry.is_anonymous ? 'anonymous' : entry.name || 'nickname';
    const kind = document.createElement('span');
    kind.className = 'guestbook-kind-tag';
    kind.textContent = entry.type || 'something else';
    const emoji = entry.is_anonymous
      ? '🌙'
      : entry.feeling || ({ appreciation: '💛', opinion: '✨' }[entry.type] || '');
    const date = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(entry.created_at));
    const timestamp = document.createElement('time');
    timestamp.className = 'guestbook-pending-date';
    timestamp.dateTime = entry.created_at;
    timestamp.textContent = date;
    const state = document.createElement('span');
    state.className = 'guestbook-pending-state';
    state.textContent = activeView === 'pending' ? 'Waiting' : activeView === 'approved' ? 'On the wall' : 'Hidden';
    const identityGroup = document.createElement('div');
    identityGroup.className = 'guestbook-pending-identity';
    identityGroup.append(identity, document.createTextNode(' · '), kind);
    meta.append(emoji ? `${emoji} ` : '', identityGroup, timestamp, state);

    const message = document.createElement('blockquote');
    message.textContent = entry.message;

    const replyEditor = document.createElement('div');
    replyEditor.className = 'guestbook-reply-editor';
    replyEditor.hidden = true;
    const replyInput = document.createElement('textarea');
    replyInput.rows = 3;
    replyInput.maxLength = 1200;
    replyInput.setAttribute('aria-label', 'Optional reply to this note');
    replyInput.placeholder = 'Add a reply to show beneath this note...';
    replyInput.value = entry.reply || '';
    let saveReplyButton = null;
    const replyCount = document.createElement('span');
    replyCount.className = 'guestbook-reply-count';
    replyCount.textContent = '0 / 1,200';
    if (entry.reply) replyCount.textContent = `${entry.reply.length.toLocaleString()} / 1,200`;
    replyInput.addEventListener('input', () => {
      const reply = replyInput.value.trim();
      replyCount.textContent = `${replyInput.value.length.toLocaleString()} / 1,200`;
      if (saveReplyButton && activeView !== 'pending') saveReplyButton.disabled = reply === (entry.reply || '');
    });
    const replyField = document.createElement('label');
    replyField.className = 'guestbook-pending-reply';
    replyField.append(replyInput, replyCount);
    replyEditor.append(replyField);
    if (entry.reply) {
      const publicReply = document.createElement('div');
      publicReply.className = 'guestbook-card-reply';
      window.rikitoMarkdown.set(publicReply, entry.reply);
      card.appendChild(publicReply);
    }

    const actions = document.createElement('div');
    actions.className = 'guestbook-pending-actions';
    if (activeView === 'pending') {
      const approveButton = document.createElement('button');
      approveButton.type = 'button';
      approveButton.className = 'btn guestbook-publish-button';
      approveButton.textContent = 'Publish';
      approveButton.addEventListener('click', () => approveEntry(entry.id, replyInput.value, card, actions));
      actions.appendChild(approveButton);
      addStatusAction(actions, 'Hide', 'hidden', entry, card);
      addReplyAction(actions, replyEditor, replyInput);
      const rejectButton = createDeleteButton(entry, card, actions);
      actions.appendChild(rejectButton);
    } else if (activeView === 'approved') {
      addStatusAction(actions, 'Hide', 'hidden', entry, card);
      addReplyAction(actions, replyEditor, replyInput);
      saveReplyButton = document.createElement('button');
      saveReplyButton.type = 'button';
      saveReplyButton.className = 'btn guestbook-publish-button guestbook-save-reply';
      saveReplyButton.textContent = 'Save reply';
      saveReplyButton.disabled = true;
      replyEditor.appendChild(saveReplyButton);
      saveReplyButton.addEventListener('click', () => updatePublishedReply(entry.id, replyInput.value, card, actions));
      actions.appendChild(createDeleteButton(entry, card, actions));
    } else {
      const publishButton = document.createElement('button');
      publishButton.type = 'button';
      publishButton.className = 'btn guestbook-publish-button';
      publishButton.textContent = 'Publish';
      publishButton.addEventListener('click', () => updateStatus(entry, 'approved', card, actions));
      actions.append(publishButton);
      addReplyAction(actions, replyEditor, replyInput);
      actions.appendChild(createDeleteButton(entry, card, actions));
    }

    card.prepend(meta, message);
    card.append(replyEditor, actions);
    return card;
  }

  function addReplyAction(actions, editor, input) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-outline guestbook-reply-button';
    button.textContent = 'Reply';
    button.setAttribute('aria-expanded', 'false');
    button.addEventListener('click', () => {
      const open = editor.hidden;
      editor.hidden = !open;
      button.setAttribute('aria-expanded', String(open));
      if (open) input.focus();
    });
    actions.appendChild(button);
  }

  function createDeleteButton(entry, card, actions) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-outline guestbook-delete-button';
    button.textContent = 'Delete';
    button.addEventListener('click', () => rejectEntry(entry.id, card, actions));
    return button;
  }

  function addStatusAction(actions, label, status, entry, card) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-outline guestbook-hide-button';
    button.textContent = label;
    button.addEventListener('click', () => updateStatus(entry, status, card, actions));
    actions.appendChild(button);
  }

  async function updateStatus(entry, status, card, actions) {
    setActionsDisabled(actions, true);
    const button = actions.querySelector('.guestbook-hide-button, .guestbook-publish-button');
    const previousText = button.textContent;
    button.textContent = status === 'hidden' ? 'Hiding...' : 'Publishing...';
    const patch = { status };
    if (status === 'approved') patch.approved_at = new Date().toISOString();
    const { error } = await client.from('guestbook_entries').update(patch).eq('id', entry.id);
    if (error) {
      console.error('Guestbook status update failed:', error);
      setActionsDisabled(actions, false);
      button.textContent = previousText;
      showCardError(card, 'Could not change this note status. Run the updated guestbook migration if Hidden is unavailable.');
      return;
    }
    entries = entries.filter((item) => item.id !== entry.id);
    if (pendingCount) pendingCount.textContent = activeView === 'pending' ? `${entries.length} waiting` : `${entries.length} ${activeView === 'approved' ? 'on wall' : 'hidden'}`;
    if (activeView === 'pending') updatePendingCount(entries.length);
    showNotice(status === 'hidden' ? 'Note hidden from the public wall.' : 'Note returned to the public wall.', 'success');
    removeCard(card);
    showEmptyQueueIfNeeded();
  }

  async function approveEntry(id, reply, card, actions) {
    setActionsDisabled(actions, true);
    actions.querySelector('.guestbook-publish-button').textContent = 'Publishing...';
    const { error } = await client
      .from('guestbook_entries')
      .update({ status: 'approved', reply: reply.trim() || null, approved_at: new Date().toISOString() })
      .eq('id', id)
      .eq('status', 'pending');
    if (error) {
      console.error('Guestbook approval failed:', error);
      setActionsDisabled(actions, false);
      actions.querySelector('.guestbook-publish-button').textContent = 'Publish';
      showCardError(card, 'Could not approve this note. Please try again.');
      return;
    }
    showNotice('Published to the wall. Your reply is attached if you added one.', 'success');
    entries = entries.filter((entry) => entry.id !== id);
    updatePendingCount(entries.length);
    removeCard(card);
    if (pendingCount) pendingCount.textContent = `${entries.length} waiting`;
    showEmptyQueueIfNeeded();
  }

  async function updatePublishedReply(id, reply, card, actions) {
    setActionsDisabled(actions, true);
    const saveButton = card.querySelector('.guestbook-save-reply');
    saveButton.textContent = 'Saving...';
    const value = reply.trim() || null;
    const { error } = await client.from('guestbook_entries').update({ reply: value }).eq('id', id).eq('status', activeView);
    if (error) {
      console.error('Guestbook reply update failed:', error);
      setActionsDisabled(actions, false);
      saveButton.textContent = 'Save reply';
      showCardError(card, 'Could not save this reply. Please try again.');
      return;
    }
    const entry = entries.find((item) => item.id === id);
    if (entry) entry.reply = value;
    setActionsDisabled(actions, false);
    saveButton.disabled = true;
    saveButton.textContent = 'Save reply';
    showNotice(value ? 'Reply updated on the wall.' : 'Reply removed from the wall.', 'success');
  }

  async function rejectEntry(id, card, actions) {
    const confirmText = activeView === 'pending' ? 'Reject and permanently delete this guestbook note?' : 'Permanently delete this guestbook note?';
    if (!window.confirm(confirmText)) return;
    setActionsDisabled(actions, true);
    actions.querySelector('.guestbook-delete-button').textContent = 'Deleting...';
    const { error } = await client
      .from('guestbook_entries')
      .delete()
      .eq('id', id);
    if (error) {
      console.error('Guestbook rejection failed:', error);
      setActionsDisabled(actions, false);
      actions.querySelector('.guestbook-delete-button').textContent = 'Delete';
      showCardError(card, 'Could not delete this note. Please try again.');
      return;
    }
    entries = entries.filter((entry) => entry.id !== id);
    if (pendingCount) pendingCount.textContent = activeView === 'pending' ? `${entries.length} waiting` : activeView === 'approved' ? `${entries.length} on wall` : `${entries.length} hidden`;
    if (activeView === 'pending') updatePendingCount(entries.length);
    showNotice(activeView === 'pending' ? 'Note rejected and permanently deleted.' : 'Published note deleted.', 'success');
    removeCard(card);
    showEmptyQueueIfNeeded();
  }

  function removeCard(card) {
    card.classList.add('is-removing');
    window.setTimeout(() => card.remove(), 220);
  }

  function showEmptyQueueIfNeeded() {
    if (!list.querySelector('.guestbook-pending-item')) {
      window.setTimeout(() => {
        if (!list.querySelector('.guestbook-pending-item')) showMessage(activeView === 'pending' ? 'All caught up. Nothing is waiting for review.' : activeView === 'approved' ? 'Nothing has been published to the wall yet.' : 'Nothing is hidden.');
      }, 230);
    }
  }

  function setActionsDisabled(actions, disabled) {
    actions.querySelectorAll('button').forEach((button) => { button.disabled = disabled; });
  }

  function showCardError(card, message) {
    let error = card.querySelector('.guestbook-pending-error');
    if (!error) {
      error = document.createElement('p');
      error.className = 'admin-message guestbook-pending-error';
      card.appendChild(error);
    }
    error.textContent = message;
  }

  function showMessage(message) {
    const note = document.createElement('p');
    note.className = 'guestbook-queue-empty';
    note.textContent = message;
    list.replaceChildren(note);
  }

  function showNotice(message, state) {
    notice.hidden = false;
    notice.dataset.state = state;
    notice.textContent = message;
    window.clearTimeout(showNotice.timeout);
    showNotice.timeout = window.setTimeout(() => { notice.hidden = true; }, 4200);
  }

  function updatePendingCount(count) {
    railBadge.textContent = count;
    railBadge.hidden = count < 1;
  }
});
