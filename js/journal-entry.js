document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('journal-entry');
  const slug = new URLSearchParams(window.location.search).get('slug');
  const supabaseState = window.soulSupabase;

  if (!slug || !supabaseState?.client) {
    showError('This journal entry is not available.');
    return;
  }

  const { data, error } = await supabaseState.client
    .from('journal_entries')
    .select('title,excerpt,body,cover_image,published_at,created_at')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (error || !data) {
    showError('This journal entry could not be found.');
    return;
  }

  document.title = `Rikitoism — ${data.title}`;
  container.replaceChildren();

  const date = document.createElement('span');
  date.className = 'post-date';
  date.textContent = new Date(data.published_at || data.created_at).toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  const title = document.createElement('h1');
  title.textContent = data.title;

  const excerpt = document.createElement('p');
  excerpt.className = 'lede';
  excerpt.textContent = data.excerpt;

  container.append(date, title);
  if (data.cover_image) {
    const image = document.createElement('img');
    image.src = data.cover_image;
    image.alt = '';
    image.className = 'journal-entry-cover';
    image.loading = 'eager';
    image.addEventListener('error', () => {
      image.replaceWith(Object.assign(document.createElement('p'), {
        className: 'feed-error',
        textContent: 'The cover image could not be loaded. Check that its URL is public and complete.'
      }));
    });
    container.appendChild(image);
  }
  container.appendChild(excerpt);

  const body = document.createElement('div');
  body.className = 'journal-entry-body';
  if (typeof data.body?.markdown === 'string') {
    const rendered = window.marked?.parse ? window.marked.parse(data.body.markdown) : null;
    body.innerHTML = rendered && window.DOMPurify?.sanitize
      ? window.DOMPurify.sanitize(rendered)
      : escapeHtml(data.body.markdown).replace(/\n/g, '<br>');
  } else if (typeof data.body?.html === 'string' && window.DOMPurify?.sanitize) {
    body.innerHTML = window.DOMPurify.sanitize(data.body.html);
  } else if (typeof data.body?.html === 'string') {
    body.textContent = data.body.html;
  } else {
    body.innerHTML = '<p>This entry has no body yet.</p>';
  }
  container.appendChild(body);

  function escapeHtml(value) {
    const element = document.createElement('span');
    element.textContent = value;
    return element.innerHTML;
  }

  function showError(message) {
    container.replaceChildren();
    const errorMessage = document.createElement('p');
    errorMessage.className = 'feed-error';
    errorMessage.textContent = message;
    container.appendChild(errorMessage);
  }
});
