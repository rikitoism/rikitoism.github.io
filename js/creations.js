document.addEventListener('DOMContentLoaded', async () => {
  await (window.rikitoMarkdownReady || Promise.resolve());
  await window.rikitoMarkdown?.ensure?.().catch(() => {});
  const client = window.soulSupabase?.client;
  if (!client) return;
  const panels = [...document.querySelectorAll('.tab-panel')];
  if (!panels.length) return;

  const { data, error } = await client
    .from('creations')
    .select('*')
    .eq('status', 'published')
    .order('featured', { ascending: false })
    .order('updated_at', { ascending: false });

  if (error) {
    panels.forEach((panel) => panel.replaceChildren(statusMessage(error.message)));
    return;
  }

  panels.forEach((panel) => {
    const items = (data || []).filter((item) => item.category === panel.dataset.category);
    panel.replaceChildren(...items.map(makeCard));
    if (!items.length) panel.replaceChildren(statusMessage('nothing here yet.'));
  });

  function statusMessage(message) {
    const status = document.createElement('p');
    status.className = 'feed-status';
    status.textContent = message;
    return status;
  }

  function makeCard(item) {
    const card = document.createElement('a');
    card.className = 'card creation-card';
    card.href = `creation-entry?slug=${encodeURIComponent(item.slug)}`;

    const chip = document.createElement('span');
    const label = item.status_label || 'active';
    const chipClass = label === 'RIP' ? 'rip' : label === 'experiment' ? 'experiment' : 'active';
    chip.className = `status-chip ${chipClass}`;
    chip.textContent = label;

    const title = document.createElement('h3');
    title.textContent = item.title || 'Untitled creation';

    const description = document.createElement('div');
    description.className = 'markdown-copy';
    if (window.rikitoMarkdown?.set) window.rikitoMarkdown.set(description, item.short_description || '', true);
    else description.textContent = item.short_description || '';

    const tags = document.createElement('ul');
    tags.className = 'tag-list';
    (Array.isArray(item.tags) ? item.tags : []).forEach((tag) => {
      const listItem = document.createElement('li');
      listItem.textContent = tag;
      tags.append(listItem);
    });

    card.append(chip, title, description, tags);
    return card;
  }
});
