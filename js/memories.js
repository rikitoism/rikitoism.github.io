document.addEventListener('DOMContentLoaded', async () => {
  const memoryList = document.getElementById('memory-list');
  const timeline = document.getElementById('memory-timeline');
  const client = window.soulSupabase?.client;
  if (!client) {
    showStatus(memoryList, 'Memories are not connected to Supabase yet.');
    showStatus(timeline, 'Timeline is not connected to Supabase yet.');
    return;
  }

  const [{ data: memories, error: memoryError }, { data: events, error: eventError }] = await Promise.all([
    client.from('memories').select('id,slug,title,description,cover_image').eq('status', 'published').order('created_at', { ascending: false }),
    client.from('memory_timeline').select('date_label,title,description,more_description').eq('status', 'published').order('sort_order', { ascending: true }).order('created_at', { ascending: true })
  ]);

  if (memoryError) {
    console.error('Memories query failed:', memoryError);
    showStatus(memoryList, 'Memories could not be loaded right now.');
  } else if (!memories.length) {
    showStatus(memoryList, 'No memories published yet. Add the first one from the admin panel.');
  } else {
    memoryList.replaceChildren(...memories.map(createMemoryCard));
  }

  if (eventError) {
    console.error('Memory timeline query failed:', eventError);
    showStatus(timeline, 'The timeline could not be loaded right now.');
  } else if (!events.length) {
    showStatus(timeline, 'No timeline events published yet.');
  } else {
    timeline.replaceChildren(...events.map((event) => {
      const item = document.createElement('li');
      item.innerHTML = `<span class="t-year"></span><span class="t-title"></span><p class="t-body"></p>`;
      item.querySelector('.t-year').textContent = event.date_label;
      item.querySelector('.t-title').textContent = event.title;
      item.querySelector('.t-body').textContent = event.description;
      if (event.more_description) {
        const details = document.createElement('details');
        details.className = 't-expand';
        details.innerHTML = '<summary>read more</summary><p class="t-more"></p>';
        details.querySelector('.t-more').textContent = event.more_description;
        item.appendChild(details);
      }
      return item;
    }));
  }

  function createMemoryCard(memory, index) {
    const link = document.createElement('a');
    link.href = `memory-entry.html?slug=${encodeURIComponent(memory.slug)}`;
    link.style.textDecoration = 'none';
    const figure = document.createElement('figure');
    figure.className = `polaroid r${(index % 3) + 1}`;
    const frame = document.createElement('div');
    frame.className = 'frame';
    if (memory.cover_image) {
      const image = document.createElement('img');
      image.src = memory.cover_image;
      image.alt = memory.title;
      image.loading = 'lazy';
      frame.appendChild(image);
    } else {
      frame.textContent = '♡';
    }
    const caption = document.createElement('figcaption');
    caption.textContent = memory.title;
    figure.append(frame, caption);
    link.appendChild(figure);
    return link;
  }

  function showStatus(element, message) {
    element.replaceChildren();
    const status = document.createElement('p');
    status.className = 'feed-status';
    status.textContent = message;
    element.appendChild(status);
  }
});
