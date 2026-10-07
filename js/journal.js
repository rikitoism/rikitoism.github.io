document.addEventListener('DOMContentLoaded', async () => {
  const feed = document.getElementById('journal-feed');
  const supabaseState = window.soulSupabase;
  if (!feed || !supabaseState?.client) {
    showMessage('Journal is not connected to Supabase yet.', true);
    return;
  }

  const { data, error } = await supabaseState.client
    .from('journal_entries')
    .select('slug,title,published_at,created_at')
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
    article.className = 'journal-row';

    const date = document.createElement('span');
    date.className = 'post-date';
    date.textContent = formatDate(entry.published_at || entry.created_at);

    const link = document.createElement('a');
    link.className = 'journal-title-link';
    link.href = `journal-entry?slug=${encodeURIComponent(entry.slug)}`;
    link.textContent = entry.title;

    article.append(date, link);
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
