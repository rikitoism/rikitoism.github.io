document.addEventListener('DOMContentLoaded', async () => {
  const client = window.soulSupabase?.client; const root = document.getElementById('creation-entry'); const slug = new URLSearchParams(location.search).get('slug');
  if (!client || !slug) return;
  const { data: item, error } = await client.from('creations').select('*').eq('slug', slug).eq('status', 'published').single();
  if (error) { root.textContent = 'This creation could not be found.'; return; }
  root.replaceChildren();
  const back = document.createElement('a'); back.className = 'feed-note'; back.href = 'creations.html'; back.textContent = '← back to creations';
  const meta = document.createElement('p'); meta.className = 'eyebrow-tag'; meta.textContent = item.category.replace('-', ' & ');
  const title = document.createElement('h1'); title.textContent = item.title; const intro = document.createElement('p'); intro.className = 'lede'; intro.textContent = item.short_description;
  root.append(back, meta, title, intro);
  if (item.cover_image) { const image = document.createElement('img'); image.className = 'creation-cover'; image.src = item.cover_image; image.alt = item.title; root.append(image); }
  const headerMeta = document.createElement('div'); headerMeta.className = 'creation-meta-row';
  const tags = document.createElement('ul'); tags.className = 'tag-list creation-tags'; (item.tags || []).forEach((tag) => { const li = document.createElement('li'); li.textContent = tag; tags.append(li); });
  const links = document.createElement('div'); links.className = 'creation-links';
  if (item.project_url) links.append(link(item.project_url, 'view this project →', 'project-link'));
  if (item.github_url) links.append(link(item.github_url, 'view on GitHub →', 'github-link'));
  headerMeta.append(tags, links); root.append(headerMeta);
  if (item.published_at) { const date = document.createElement('p'); date.className = 'feed-note'; date.textContent = new Date(item.published_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }); root.append(date); }
  const body = document.createElement('article'); body.className = 'creation-body';
  const blocks = Array.isArray(item.body) ? item.body : (Array.isArray(item.body?.blocks) ? item.body.blocks : []);
  blocks.forEach((block) => body.append(renderBlock(block)));
  if (!blocks.length) {
    const empty = document.createElement('p'); empty.className = 'feed-note'; empty.textContent = 'This creation has no project notes yet.'; body.append(empty);
  }
  root.append(body);
  function link(url, text, className) { const a = document.createElement('a'); a.className = className; a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = text; return a; }
  function renderBlock(block) { const type = block.type || 'text'; const element = document.createElement(type === 'heading' ? 'h2' : type === 'code' ? 'pre' : type === 'image' ? 'img' : 'div'); element.className = `creation-block creation-block-${type}`; if (type === 'image') { element.src = block.url; element.alt = block.alt || ''; } else if (type === 'gallery') { const urls = [block.url, ...(block.content || '').split(/\n/)].filter(Boolean); urls.forEach((url) => { const image = document.createElement('img'); image.src = url.trim(); image.alt = ''; element.append(image); }); } else if (type === 'code') element.textContent = block.content || ''; else if (type === 'embed') { const label = document.createElement('strong'); label.textContent = block.content || 'external resource'; const frame = document.createElement('a'); frame.href = block.url || '#'; frame.target = '_blank'; frame.rel = 'noopener noreferrer'; frame.textContent = block.url ? 'open resource →' : 'resource link missing'; element.append(label, frame); } else element.textContent = block.content || ''; return element; }
});
