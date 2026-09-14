document.addEventListener('DOMContentLoaded', async () => {
  document.body.classList.add('influences-page');
  const revealSections = document.querySelectorAll('.influence-reveal');
  revealSections.forEach((section, index) => {
    section.style.setProperty('--influence-reveal-delay', `${index * 90}ms`);
  });
  if (!('IntersectionObserver' in window)) {
    revealSections.forEach((section) => section.classList.add('is-revealed'));
  } else {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealSections.forEach((section) => revealObserver.observe(section));
  }
  const client = window.soulSupabase?.client;
  if (!client) return;
  const [{ data: interests }, { data: playlists }, { data: songs }, { data: shaped }] = await Promise.all([
    client.from('core_interests').select('*').order('sort_order'),
    client.from('playlists').select('*').eq('status', 'published').order('sort_order').limit(3),
    client.from('songs').select('*').eq('status', 'published').order('sort_order').limit(4),
    client.from('shaped_items').select('*').eq('status', 'published').order('sort_order').limit(6)
  ]);
  renderInterests(interests || []);
  renderPlaylists(playlists || []);
  renderSongs(songs || []);
  renderShaped(shaped || []);
  function renderInterests(items) {
    document.getElementById('core-interest-list').replaceChildren(...items.map((item) => {
      const card = document.createElement('div'); card.className = 'card';
      card.innerHTML = `<span class="card-meta"></span><h3></h3><p></p><ul class="tag-list"></ul>`;
      card.querySelector('.card-meta').textContent = item.eyebrow; card.querySelector('h3').textContent = item.title; card.querySelector('p').textContent = item.description;
      card.querySelector('.tag-list').replaceChildren(...(item.tags || []).map((tag) => { const li = document.createElement('li'); li.textContent = tag; return li; }));
      return card;
    }));
  }
  function cardImage(item) { const img = document.createElement('img'); img.src = item.image_url; img.alt = item.title; img.loading = 'lazy'; return img; }
  function renderPlaylists(items) {
    document.getElementById('playlist-list').replaceChildren(...items.map((item, i) => {
      const figure = document.createElement('figure'); figure.className = `influence-image-card r${(i % 3) + 1}`; figure.append(cardImage(item));
      const caption = document.createElement('figcaption'); caption.innerHTML = '<span></span><strong></strong><small></small>'; caption.querySelector('span').textContent = item.eyebrow; caption.querySelector('strong').textContent = item.title; caption.querySelector('small').textContent = item.description; figure.appendChild(caption);
      if (item.playlist_url) figure.addEventListener('click', () => window.open(item.playlist_url, '_blank', 'noopener')); return figure;
    }));
  }
  function renderSongs(items) {
    document.getElementById('song-list').replaceChildren(...items.map((item, i) => {
      const note = document.createElement('div'); note.className = `sticky ${i % 2 ? 'denim tilt-r' : 'rose'}`; note.append(cardImage(item));
      const content = document.createElement('span'); content.className = 'song-note-content'; content.innerHTML = '<strong></strong><span></span>'; content.querySelector('strong').textContent = `${item.title} — ${item.artist}`; content.querySelector('span').textContent = item.description; note.appendChild(content);
      if (item.song_url) {
        note.classList.add('is-clickable');
        note.addEventListener('click', () => window.open(item.song_url, '_blank', 'noopener,noreferrer'));
      }
      return note;
    }));
  }
  function renderShaped(items) {
    document.getElementById('shaped-list').replaceChildren(...items.map((item, i) => {
      const figure = document.createElement('figure'); figure.className = `influence-image-card r${(i % 3) + 1}`; figure.append(cardImage(item)); const caption = document.createElement('figcaption'); caption.innerHTML = '<span></span><strong></strong><small></small>'; caption.querySelector('span').textContent = item.medium; caption.querySelector('strong').textContent = item.title; caption.querySelector('small').textContent = item.short_description; figure.appendChild(caption); figure.addEventListener('click', () => openShaped(item)); return figure;
    }));
  }
  function openShaped(item) {
    const dialog = document.getElementById('shaped-dialog'); const content = document.getElementById('shaped-dialog-content'); content.replaceChildren(cardImage(item));
    const title = document.createElement('h2'); title.textContent = item.title; const medium = document.createElement('p'); medium.className = 'eyebrow-tag'; medium.textContent = item.medium; const summary = document.createElement('p'); summary.textContent = item.short_description; const reflection = document.createElement('p'); reflection.textContent = item.reflection; content.append(title, medium, summary, reflection);
    if (item.link_url) {
      const link = document.createElement('a'); link.className = 'influence-more-link'; link.href = item.link_url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = 'open link →'; content.appendChild(link);
    }
    dialog.showModal();
  }
  document.querySelector('.dialog-close').addEventListener('click', () => document.getElementById('shaped-dialog').close());
});
