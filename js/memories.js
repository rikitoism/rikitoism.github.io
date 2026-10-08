document.addEventListener('DOMContentLoaded', async () => {
  await window.rikitoMarkdownReady;
  await window.rikitoMarkdown.ensure().catch(() => {});
  const memoryList = document.getElementById('memory-list');
  const timeline = document.getElementById('memory-timeline');
  const client = window.soulSupabase?.client;
  if (!client) {
    showStatus(memoryList, 'Memories are not connected to Supabase yet.');
    showStatus(timeline, 'Timeline is not connected to Supabase yet.');
    return;
  }

  const [{ data: memories, error: memoryError }, { data: timelineEvents, error: eventError }] = await Promise.all([
    client.from('memories').select('id,slug,title,description,cover_image').eq('status', 'published').order('created_at', { ascending: false }),
    client.from('memory_timeline').select('date_label,title,description,more_description').eq('status', 'published')
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
  } else if (!timelineEvents.length) {
    showStatus(timeline, 'No timeline events published yet.');
  } else {
    timelineEvents.sort((a, b) => timelineDateValue(a.date_label) - timelineDateValue(b.date_label));
    timeline.replaceChildren(...timelineEvents.map((event) => {
      const item = document.createElement('li');
      item.innerHTML = `<span class="t-year"></span><span class="t-title"></span><div class="t-body"></div>`;
      item.querySelector('.t-year').textContent = event.date_label;
      item.querySelector('.t-title').textContent = event.title;
      window.rikitoMarkdown.set(item.querySelector('.t-body'), event.description);
      if (event.more_description) {
        const details = document.createElement('details');
        details.className = 't-expand';
        details.innerHTML = '<summary>read more</summary><div class="t-more"></div>';
        window.rikitoMarkdown.set(details.querySelector('.t-more'), event.more_description);
        item.appendChild(details);
      }
      return item;
    }));
  }

  function createMemoryCard(memory, index) {
    const link = document.createElement('a');
    link.href = `memory-entry?slug=${encodeURIComponent(memory.slug)}`;
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
      image.decoding = 'async';
      image.fetchPriority = 'low';
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

  function timelineDateValue(value) {
    const match = /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})$/i.exec(String(value || '').trim());
    if (!match) return Number.POSITIVE_INFINITY;
    const month = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'].indexOf(match[1].toLowerCase()) + 1;
    return Number(match[2]) * 12 + month;
  }
});
