document.addEventListener('DOMContentLoaded', async () => {
  await window.rikitoMarkdownReady;
  await window.rikitoMarkdown.ensure().catch(() => {});
  document.body.classList.add('me-page');
  const response = await fetch('data/me.json', { cache: 'no-store' });
  if (!response.ok) throw new Error(`Me data request failed: ${response.status}`);
  const data = await response.json();
  const client = window.soulSupabase?.client;
  const timelineSetting = client
    ? client.from('site_settings').select('value').eq('key', 'me_timeline').maybeSingle()
    : Promise.resolve({ data: null, error: null });

  const intro = document.querySelector('[data-me-intro]');
  intro.querySelector('.eyebrow-tag').textContent = data.intro.eyebrow;
  intro.querySelector('h1').textContent = data.intro.title;
  intro.querySelectorAll('.me-intro-paragraph').forEach((paragraph, index) => {
    window.rikitoMarkdown.set(paragraph, data.intro.paragraphs[index] || '', true);
  });
  const portraitSlot = intro.querySelector('[data-me-portrait]');
  if (data.intro.portrait?.src) {
    const figure = document.createElement('figure');
    figure.className = 'me-portrait';
    figure.id = 'me-portrait';
    const tape = document.createElement('span');
    tape.className = 'me-portrait-tape';
    tape.setAttribute('aria-hidden', 'true');
    const frame = document.createElement('div');
    frame.className = 'me-portrait-frame';
    const image = document.createElement('img');
    image.src = data.intro.portrait.src;
    image.alt = data.intro.portrait.alt || 'Portrait';
    image.loading = 'lazy';
    image.decoding = 'async';
    image.width = 800;
    image.height = 1000;
    frame.append(image);
    figure.append(tape, frame);
    if (data.intro.portrait.caption) {
      const caption = document.createElement('figcaption');
      caption.textContent = data.intro.portrait.caption;
      figure.append(caption);
    }
    portraitSlot.append(figure);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      figure.classList.add('in');
    } else {
      const portraitObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            portraitObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.25 });
      portraitObserver.observe(figure);
    }
  }

  const timeline = document.querySelector('[data-me-timeline]');
  const renderTimeline = (timelineData) => {
    const events = sortTimelineChronologically(timelineData.events || []);
    timeline.querySelector('.eyebrow-tag').textContent = timelineData.eyebrow;
    timeline.querySelector('h2').textContent = timelineData.title;
    window.rikitoMarkdown.set(timeline.querySelector('.block-intro'), timelineData.intro, true);
    const timelineList = timeline.querySelector('.timeline');
    timelineList.dataset.start = events[0]?.year || '';
    timelineList.dataset.end = events[events.length - 1]?.year || '';
    timelineList.replaceChildren(...events.map((event, index) => {
      const item = document.createElement('li');
      item.style.setProperty('--timeline-index', index);
      const dot = document.createElement('button');
      dot.className = 'timeline-dot';
      dot.type = 'button';
      dot.setAttribute('aria-label', `Show ${event.year}: ${event.title}`);
      const detail = document.createElement('div');
      detail.className = 'timeline-detail';
      const year = document.createElement('span');
      year.className = 't-year';
      year.textContent = event.year;
      const title = document.createElement('span');
      title.className = 't-title';
      title.textContent = event.title;
      const body = document.createElement('div');
      body.className = 't-body';
      window.rikitoMarkdown.set(body, event.body);
      if (event.bodyLink) {
        const link = document.createElement('a');
        link.href = event.bodyLink;
        link.textContent = 'open related page →';
        body.append(' ', link);
      }
      detail.append(year, title, body);
      item.append(dot, detail);
      return item;
    }));
    timelineList.insertAdjacentHTML('afterbegin', `
      <span class="timeline-endpoint timeline-start">${timelineList.dataset.start}</span>
      <span class="timeline-endpoint timeline-end">${timelineList.dataset.end}</span>`);
    const timelineItems = timelineList.querySelectorAll('li');
    timelineItems.forEach((item) => {
      const activate = () => {
        timelineItems.forEach((entry) => entry.classList.toggle('is-active', entry === item));
      };
      item.querySelector('.timeline-dot').addEventListener('focusin', activate);
      item.querySelector('.timeline-dot').addEventListener('click', activate);
    });
    if ('IntersectionObserver' in window) {
      const timelineObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => entry.target.classList.toggle('is-visible', entry.isIntersecting));
      }, { threshold: 0.35 });
      timelineItems.forEach((item) => timelineObserver.observe(item));
    } else {
      timelineItems.forEach((item) => item.classList.add('is-visible'));
    }
  };
  renderTimeline(data.timeline);
  timelineSetting.then(({ data: setting, error }) => {
    if (error) {
      console.error('Me timeline query failed:', error);
      return;
    }
    if (setting?.value) {
      data.timeline = { ...data.timeline, ...setting.value, events: setting.value.events || [] };
      renderTimeline(data.timeline);
    }
  }).catch((error) => console.error('Me timeline request failed:', error));

  const thinking = document.querySelector('[data-me-thinking]');
  thinking.querySelector('.eyebrow-tag').textContent = data.thinking.eyebrow;
  thinking.querySelector('h2').textContent = data.thinking.title;
  thinking.querySelectorAll('.me-thinking-paragraph').forEach((paragraph, index) => {
    window.rikitoMarkdown.set(paragraph, data.thinking.paragraphs[index] || '', true);
  });
  thinking.querySelector('.sticky').textContent = data.thinking.note;

  const stats = document.querySelector('[data-me-stats]');
  stats.querySelector('.eyebrow-tag').textContent = data.stats.eyebrow;
  stats.querySelector('h2').textContent = data.stats.title;
  stats.querySelector('.me-stat-list').innerHTML = data.stats.items.map(([label, value, width, color], index) => `
    <div class="stat-row" style="--stat-index:${index}">
      <div class="stat-label"><span>${label}</span><span>${value}</span></div>
      <div class="stat-track"><div class="stat-fill ${color}" style="width:${width}%;"></div></div>
    </div>`).join('');

  const facts = document.querySelector('[data-me-facts]');
  facts.querySelector('.eyebrow-tag').textContent = data.facts.eyebrow;
  facts.querySelector('h2').textContent = data.facts.title;
  const factDisplay = facts.querySelector('#fact-display');
  const shuffleButton = facts.querySelector('#shuffle-fact');
  factDisplay.dataset.facts = JSON.stringify(data.facts.items);
  let lastFactIndex = -1;
  shuffleButton.addEventListener('click', () => {
    if (!data.facts.items.length) return;
    let nextFactIndex = Math.floor(Math.random() * data.facts.items.length);
    if (data.facts.items.length > 1) {
      while (nextFactIndex === lastFactIndex) {
        nextFactIndex = Math.floor(Math.random() * data.facts.items.length);
      }
    }
    lastFactIndex = nextFactIndex;
    factDisplay.classList.remove('fact-arriving');
    factDisplay.textContent = data.facts.items[nextFactIndex];
    requestAnimationFrame(() => factDisplay.classList.add('fact-arriving'));
  });

  const likes = document.querySelector('[data-me-likes]');
  likes.querySelector('.eyebrow-tag').textContent = data.likes.eyebrow;
  likes.querySelector('h2').textContent = data.likes.title;
  likes.querySelector('.me-liked-list').innerHTML = data.likes.liked.map((item) => `<li>✦ ${item}</li>`).join('');
  likes.querySelector('.me-confused-list').innerHTML = data.likes.confused.map((item) => `<li>• ${item}</li>`).join('');

  const revealTargets = document.querySelectorAll(
    '.me-page main > .block, .me-page main > .divider, .me-page .site-footer'
  );
  revealTargets.forEach((target, index) => {
    target.classList.add('me-reveal');
    target.style.setProperty('--me-reveal-delay', `${Math.min(index * 70, 350)}ms`);
  });
  document.body.classList.add('me-ready');

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
    revealTargets.forEach((target) => target.classList.add('is-revealed'));
    return;
  }

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  revealTargets.forEach((target) => revealObserver.observe(target));
});

const TIMELINE_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function timelineMonthValue(value) {
  const formatted = /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})$/i.exec(String(value || '').trim());
  if (formatted) {
    const month = TIMELINE_MONTHS.findIndex((name) => name.toLowerCase() === formatted[1].toLowerCase()) + 1;
    return Number(formatted[2]) * 12 + month;
  }
  const legacyYear = /^(\d{4}|\d{3}x)$/i.exec(String(value || '').trim());
  if (legacyYear) {
    const year = legacyYear[1].toLowerCase().endsWith('x') ? Number(`${legacyYear[1].slice(0, 3)}0`) : Number(legacyYear[1]);
    return year * 12 + 1;
  }
  return Number.POSITIVE_INFINITY;
}

function sortTimelineChronologically(events) {
  return [...events].sort((a, b) => timelineMonthValue(a.year) - timelineMonthValue(b.year));
}
