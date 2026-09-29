document.addEventListener('DOMContentLoaded', async () => {
  await window.rikitoMarkdownReady?.catch(() => {});
  await window.rikitoMarkdown?.ensure().catch(() => {});
  const client = window.soulSupabase?.client;
  const form = document.getElementById('guestbook-form');
  const wall = document.getElementById('guestbook-wall');
  const status = document.getElementById('guestbook-form-status');
  const nameInput = document.getElementById('guestbook-name');
  const messageInput = document.getElementById('guestbook-message');
  const characterCount = document.getElementById('guestbook-count');
  const feelingsFieldset = document.querySelector('.guestbook-feelings');
  const total = document.getElementById('guestbook-total');
  const filters = [...document.querySelectorAll('.guestbook-filter')];
  const labels = {
    opinion: '💭 Opinion',
    appreciation: '🫂 Appreciation',
    confession: '🗣️ Confession',
    criticism: '🔥 Criticism',
    'something-else': '👁️ Something else'
  };
  const feelings = ['😢', '😕', '😐', '🙂', '🥰'];
  let entries = [];
  let activeFilter = 'all';

  document.getElementById('year').textContent = new Date().getFullYear();
  feelingsFieldset.hidden = form.querySelector('input[name="type"]:checked').value !== 'opinion';
  messageInput.addEventListener('input', () => {
    characterCount.textContent = `${messageInput.value.length.toLocaleString()} / 600`;
  });
  form.querySelectorAll('input[name="type"]').forEach((input) => input.addEventListener('change', () => {
    form.dataset.kind = input.value;
    feelingsFieldset.hidden = input.value !== 'opinion';
    if (input.value !== 'opinion') {
      const selectedFeeling = form.querySelector('input[name="feeling"]:checked');
      if (selectedFeeling) selectedFeeling.checked = false;
    }
  }));

  filters.forEach((button) => button.addEventListener('click', () => {
    activeFilter = button.dataset.filter;
    filters.forEach((filter) => {
      const selected = filter === button;
      filter.classList.toggle('is-active', selected);
      filter.setAttribute('aria-pressed', String(selected));
    });
    renderWall();
  }));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!client) {
      status.textContent = 'The guestbook is not connected yet. Please try again later.';
      status.dataset.state = 'error';
      return;
    }

    const message = messageInput.value.trim();
    const nickname = nameInput.value.trim() || null;
    if (form.elements.website.value) {
      form.reset();
      form.dataset.kind = 'opinion';
      feelingsFieldset.hidden = false;
      characterCount.textContent = '0 / 600';
      status.textContent = 'Dropped in. It will show after review.';
      status.dataset.state = 'success';
      return;
    }
    if (!message) {
      status.textContent = 'Write a message before sending it.';
      status.dataset.state = 'error';
      messageInput.focus();
      return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    status.textContent = 'Sending your note for review...';
    status.dataset.state = '';
    const type = form.querySelector('input[name="type"]:checked').value;
    const feeling = type === 'opinion' ? form.querySelector('input[name="feeling"]:checked')?.value || null : null;
    const submission = {
      p_name: nickname,
      p_message: message,
      p_type: type,
      p_feeling: feeling,
      p_anonymous: !nickname,
      p_rate_key: getRateKey()
    };
    let result = await client.rpc('submit_guestbook_entry', submission);
    if (result.error?.code === 'PGRST202' && !feeling) {
      const { p_feeling, ...legacySubmission } = submission;
      result = await client.rpc('submit_guestbook_entry', legacySubmission);
    }
    const { error } = result;
    submitButton.disabled = false;

    if (error) {
      console.error('Guestbook submission failed:', error);
      status.textContent = error.message.includes('rate limit')
        ? 'One note per browser every 30 minutes, please. Your message was not sent.'
        : error.code === 'PGRST202' && feeling
          ? 'Emoji feelings are not enabled yet. Run the updated guestbook migration, or send without a feeling.'
          : 'Your note could not be sent right now. Please try again later.';
      status.dataset.state = 'error';
      return;
    }

    form.reset();
    form.dataset.kind = 'opinion';
    feelingsFieldset.hidden = false;
    characterCount.textContent = '0 / 600';
    status.textContent = 'Your note is in the review queue. Thank you for leaving it here.';
    status.dataset.state = 'success';
  });

  if (!client) {
    showWallStatus('The guestbook is not connected yet.');
    return;
  }

  loadEntries();

  async function loadEntries() {
    let result = await client
      .from('guestbook_entries')
      .select('id,name,message,type,feeling,is_anonymous,reply,approved_at')
      .eq('status', 'approved')
      .order('approved_at', { ascending: false });
    if (result.error?.code === '42703') {
      result = await client
        .from('guestbook_entries')
        .select('id,name,message,type,is_anonymous,reply,approved_at')
        .eq('status', 'approved')
        .order('approved_at', { ascending: false });
    }
    const { data, error } = result;

    if (error) {
      console.error('Guestbook wall query failed:', error);
      showWallStatus('The wall could not be loaded right now.');
      return;
    }
    entries = (data || []).map((entry) => ({ ...entry, feeling: entry.feeling || null }));
    total.textContent = `${entries.length} ${entries.length === 1 ? 'note' : 'notes'}`;
    renderWall();
  }

  function renderWall() {
    const visibleEntries = activeFilter === 'all'
      ? entries
      : entries.filter((entry) => entry.type === activeFilter);
    if (!visibleEntries.length) {
      showWallStatus(entries.length ? 'No notes in this category yet.' : 'The wall is quiet for now. Leave the first note above.');
      return;
    }
    wall.replaceChildren(...visibleEntries.map(createCard));
  }

  function createCard(entry) {
    const card = document.createElement('article');
    card.className = `guestbook-card guestbook-card-${entry.type}`;
    const category = document.createElement('p');
    category.className = 'guestbook-card-type';
    category.textContent = labels[entry.type] || labels['something-else'];
    if (entry.type === 'opinion' && feelings.includes(entry.feeling)) {
      const feeling = document.createElement('span');
      feeling.className = 'guestbook-card-feeling';
      feeling.textContent = entry.feeling;
      feeling.setAttribute('aria-label', 'Visitor feeling');
      category.append(' ', feeling);
    }
    const message = document.createElement('blockquote');
    message.textContent = entry.message;
    const attribution = document.createElement('p');
    attribution.className = 'guestbook-attribution';
    attribution.textContent = `— ${entry.is_anonymous ? 'anonymous' : entry.name || 'a visitor'}`;
    const date = document.createElement('time');
    date.className = 'guestbook-date';
    date.dateTime = entry.approved_at;
    date.textContent = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(entry.approved_at));
    card.append(category, message, attribution, date);
    if (entry.reply) {
      const reply = document.createElement('div');
      reply.className = 'guestbook-reply';
      const replyLabel = document.createElement('p');
      replyLabel.className = 'guestbook-reply-label';
      replyLabel.textContent = 'a reply from me';
      const replyText = document.createElement('p');
      replyText.className = 'guestbook-reply-text markdown-copy';
      window.rikitoMarkdown?.set(replyText, entry.reply);
      reply.append(replyLabel, replyText);
      card.appendChild(reply);
    }
    return card;
  }

  function showWallStatus(message) {
    const note = document.createElement('p');
    note.className = 'feed-status guestbook-empty';
    note.textContent = message;
    wall.replaceChildren(note);
  }

  function getRateKey() {
    const storageKey = 'rikitoism-guestbook-rate-key';
    let rateKey = localStorage.getItem(storageKey);
    if (!rateKey) {
      rateKey = crypto.randomUUID();
      localStorage.setItem(storageKey, rateKey);
    }
    return rateKey;
  }
});
