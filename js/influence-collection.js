document.addEventListener('DOMContentLoaded', async () => {
  const client = window.soulSupabase?.client; const collection = document.getElementById('collection'); const songs = location.pathname.includes('songs');
  if (!client) return;
  const { data, error } = await client.from(songs ? 'songs' : 'playlists').select('*').eq('status', 'published').order('sort_order');
  if (error) { collection.textContent = error.message; return; }
  collection.replaceChildren(...(data || []).map((item, i) => songs ? makeSong(item, i) : makePlaylist(item, i)));
  function image(item) { const img = document.createElement('img'); img.src = item.image_url || ''; img.alt = item.title; return img; }
  function makePlaylist(item, i) { const figure = document.createElement('figure'); figure.className = `influence-image-card r${(i % 3) + 1}`; figure.append(image(item)); const caption = document.createElement('figcaption'); caption.innerHTML = '<span></span><strong></strong><small></small>'; caption.querySelector('span').textContent = item.eyebrow; caption.querySelector('strong').textContent = item.title; caption.querySelector('small').textContent = item.description; figure.append(caption); if (item.playlist_url) figure.onclick = () => window.open(item.playlist_url, '_blank', 'noopener'); return figure; }
  function makeSong(item, i) { const note = document.createElement('div'); note.className = `sticky ${i % 2 ? 'denim tilt-r' : 'rose'}`; note.append(image(item)); const content = document.createElement('span'); content.className = 'song-note-content'; content.innerHTML = '<strong></strong><span></span>'; content.querySelector('strong').textContent = `${item.title} — ${item.artist}`; content.querySelector('span').textContent = item.description; note.append(content); if (item.song_url) { note.classList.add('is-clickable'); note.onclick = () => window.open(item.song_url, '_blank', 'noopener,noreferrer'); } return note; }
});
