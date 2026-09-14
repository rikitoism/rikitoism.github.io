document.addEventListener('DOMContentLoaded', async () => {
  const feed = document.getElementById('journal-feed');
  const supabaseState = window.soulSupabase;
  if (!feed || !supabaseState?.client) {
    showMessage('Journal is not connected to Supabase yet.', true);
    return;
  }

  const { data, error } = await supabaseState.client
    .from('journal_entries')
    .select('slug,title,excerpt,cover_image,published_at,created_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) {
    showMessage('The journal could not be loaded right now.', true);
    console.error('Journal query failed:', error);
    return;
  }

  if (!data.length) {
    showMessage('No published thoughts yet. The first one is waiting in the admin panel.');
    return;
  }

  feed.replaceChildren(...data.map(createEntry));

  function createEntry(entry) {
    const article = document.createElement('article');
    article.className = 'post';

    const content = document.createElement('div');
    content.className = 'post-content';

    const date = document.createElement('span');
    date.className = 'post-date';
    date.textContent = formatDate(entry.published_at || entry.created_at);

    const title = document.createElement('h3');
    title.textContent = entry.title;

    const excerpt = document.createElement('p');
    excerpt.textContent = entry.excerpt || 'A thought from the journal.';

    const link = document.createElement('a');
    link.className = 'btn btn-outline';
    link.href = `journal-entry.html?slug=${encodeURIComponent(entry.slug)}`;
    link.textContent = 'read the full thought →';

    if (entry.cover_image) {
      const image = document.createElement('img');
      image.className = 'journal-card-cover';
      image.src = entry.cover_image;
      image.alt = '';
      image.loading = 'lazy';
      image.addEventListener('error', () => image.remove());
      article.appendChild(image);
    }
    content.append(date, title, excerpt, link);
    article.appendChild(content);
    return article;
  }

  function formatDate(value) {
    return value
      ? new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
      : 'recently';
  }

  function showMessage(message, isError) {
    feed.replaceChildren();
    const status = document.createElement('p');
    status.className = isError ? 'feed-error' : 'feed-status';
    status.textContent = message;
    feed.appendChild(status);
  }
});
