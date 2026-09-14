document.addEventListener('DOMContentLoaded', async () => {
  const client = window.soulSupabase?.client;
  if (!client) return;
  const { data, error } = await client.from('creations').select('*').eq('status', 'published').order('featured', { ascending: false }).order('updated_at', { ascending: false });
  if (error) { document.querySelectorAll('.tab-panel').forEach((panel) => { panel.replaceChildren(Object.assign(document.createElement('p'), { textContent: error.message, className: 'feed-status' })); }); return; }
  document.querySelectorAll('.tab-panel').forEach((panel) => {
    const items = (data || []).filter((item) => item.category === panel.dataset.category);
    panel.replaceChildren(...items.map(makeCard));
    if (!items.length) panel.innerHTML = '<p class="feed-status">nothing here yet.</p>';
  });
  function makeCard(item) {
    const card = document.createElement('a'); card.className = 'card creation-card'; card.href = `creation-entry.html?slug=${encodeURIComponent(item.slug)}`;
    const status = document.createElement('span'); status.className = `status-chip ${item.status_label === 'RIP' ? 'rip' : item.status_label === 'experiment' ? 'experiment' : 'active'}`; status.textContent = item.status_label;
    const title = document.createElement('h3'); title.textContent = item.title; const description = document.createElement('p'); description.textContent = item.short_description;
    const tags = document.createElement('ul'); tags.className = 'tag-list'; (item.tags || []).forEach((tag) => { const li = document.createElement('li'); li.textContent = tag; tags.append(li); });
    card.append(status, title, description, tags); return card;
  }
});
