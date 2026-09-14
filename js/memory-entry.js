document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('memory-entry');
  const slug = new URLSearchParams(window.location.search).get('slug');
  const client = window.soulSupabase?.client;
  if (!slug || !client) {
    showError('This memory is not available.');
    return;
  }

  const { data: memory, error: memoryError } = await client
    .from('memories')
    .select('id,title,description,cover_image')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();
  if (memoryError || !memory) {
    showError('This memory could not be found.');
    return;
  }

  const { data: photos, error: photoError } = await client
    .from('memory_photos')
    .select('image_url,subtitle,description')
    .eq('memory_id', memory.id)
    .order('sort_order', { ascending: true });
  if (photoError) {
    showError('The photos for this memory could not be loaded.');
    return;
  }

  document.title = `Rikitoism — ${memory.title}`;
  container.replaceChildren();
  const description = document.createElement('p');
  description.className = 'lede';
  description.textContent = memory.description;
  if (memory.cover_image) {
    const cover = document.createElement('img');
    cover.className = 'memory-entry-cover';
    cover.src = memory.cover_image;
    cover.alt = memory.title;
    container.appendChild(cover);
  }
  const title = document.createElement('h1');
  title.textContent = memory.title;
  container.append(title, description);

  const gallery = document.createElement('div');
  gallery.className = 'memory-gallery';
  const columns = Array.from({ length: 4 }, () => document.createElement('div'));
  columns.forEach((column) => {
    column.className = 'memory-gallery-column';
    gallery.appendChild(column);
  });
  photos.forEach((photo, index) => {
    const figure = document.createElement('figure');
    figure.className = 'polaroid memory-photo-card';
    const image = document.createElement('img');
    image.src = photo.image_url;
    image.alt = memory.title;
    figure.appendChild(image);
    columns[index % columns.length].appendChild(figure);
  });
  container.appendChild(gallery);

  function showError(message) {
    container.replaceChildren();
    const error = document.createElement('p');
    error.className = 'feed-error';
    error.textContent = message;
    container.appendChild(error);
  }
});
