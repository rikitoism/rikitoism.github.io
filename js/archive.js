document.addEventListener('DOMContentLoaded', async () => {
  const list = document.getElementById('archive-list');
  const search = document.getElementById('archive-search');
  const client = window.soulSupabase?.client;
  if (!list || !client) {
    showStatus('Archive is not connected to Supabase yet.');
    return;
  }

  const queries = await Promise.all([
    client.from('journal_entries').select('title,slug,published_at,created_at').eq('status', 'published'),
    client.from('memories').select('title,slug,created_at').eq('status', 'published'),
    client.from('shaped_items').select('title,medium,short_description,reflection,image_url,link_url,sort_order').eq('status', 'published'),
    client.from('creations').select('title,slug,category,published_at,created_at').eq('status', 'published')
  ]);
  queries.forEach((result, index) => {
    if (result.error) console.error(`Archive query ${index + 1} failed:`, result.error);
  });
  const [journals, memories, shapedItems, creations] = queries.map((result) => result.data || []);
  const entries = [
    ...journals.map((item) => archiveEntry(item.title, 'journal', `journal-entry.html?slug=${encodeURIComponent(item.slug)}`, item.published_at || item.created_at)),
    ...memories.map((item) => archiveEntry(item.title, 'memory', `memory-entry.html?slug=${encodeURIComponent(item.slug)}`, item.created_at)),
    ...shapedItems.map((item) => archiveEntry(item.title, item.medium || 'influence', '#', null, item)),
    ...creations.map((item) => archiveEntry(item.title, item.category.replace('-', ' · '), `creation-entry.html?slug=${encodeURIComponent(item.slug)}`, item.published_at || item.created_at))
  ].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  if (!entries.length) {
    showStatus('Nothing has been published yet. The archive is waiting.');
    return;
  }
  render(entries);
  search?.addEventListener('input', () => render(entries));

  function render(items) {
    const query = (search?.value || '').trim().toLowerCase();
    const visible = items.filter((item) => `${item.title} ${item.meta}`.toLowerCase().includes(query));
    list.replaceChildren(...(visible.length ? visible.map(createRow) : [statusRow('No archive entries match that search.')]));
  }
  function createRow(item) {
    const row = document.createElement('li');
    const link = document.createElement('a'); link.href = item.href; link.textContent = item.title;
    if (item.shaped) {
      link.href = '#archive-shaped-dialog';
      link.addEventListener('click', (event) => { event.preventDefault(); openShaped(item.shaped); });
    }
    const meta = document.createElement('span'); meta.className = 'a-tag'; meta.textContent = item.meta;
    row.append(link, meta); return row;
  }
  function archiveEntry(title, meta, href, date, shaped) { return { title, meta, href, date: date || '', shaped }; }
  function statusRow(message) { const row = document.createElement('li'); const text = document.createElement('span'); text.className = 'feed-status'; text.textContent = message; row.append(text); return row; }
  function showStatus(message) { list.replaceChildren(statusRow(message)); }
  function openShaped(item) {
    const dialog = document.getElementById('archive-shaped-dialog');
    const content = document.getElementById('archive-shaped-content');
    content.replaceChildren();
    if (item.image_url) {
      const image = document.createElement('img'); image.src = item.image_url; image.alt = item.title; content.appendChild(image);
    }
    const title = document.createElement('h2'); title.textContent = item.title;
    const medium = document.createElement('p'); medium.className = 'eyebrow-tag'; medium.textContent = item.medium;
    const summary = document.createElement('p'); summary.textContent = item.short_description;
    const reflection = document.createElement('p'); reflection.textContent = item.reflection;
    content.append(title, medium, summary, reflection);
    if (item.link_url) {
      const link = document.createElement('a'); link.className = 'influence-more-link'; link.href = item.link_url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = 'open link →'; content.appendChild(link);
    }
    dialog.showModal();
  }
  document.querySelector('#archive-shaped-dialog .dialog-close')?.addEventListener('click', () => document.getElementById('archive-shaped-dialog').close());
});
