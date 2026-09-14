document.addEventListener('DOMContentLoaded', async () => {
  document.body.classList.add('me-page');
  const response = await fetch('data/me.json', { cache: 'no-store' });
  if (!response.ok) throw new Error(`Me data request failed: ${response.status}`);
  const data = await response.json();
  const client = window.soulSupabase?.client;
  if (client) {
    const { data: setting, error } = await client.from('site_settings').select('value').eq('key', 'me_timeline').maybeSingle();
    if (error) console.error('Me timeline query failed:', error);
    data.timeline = { ...data.timeline, ...(setting?.value || {}), events: setting?.value?.events || [] };
  }

  const intro = document.querySelector('[data-me-intro]');
  intro.querySelector('.eyebrow-tag').textContent = data.intro.eyebrow;
  intro.querySelector('h1').textContent = data.intro.title;
  intro.querySelectorAll('.me-intro-paragraph').forEach((paragraph, index) => {
    paragraph.innerHTML = data.intro.paragraphs[index] || '';
  });

  const timeline = document.querySelector('[data-me-timeline]');
  timeline.querySelector('.eyebrow-tag').textContent = data.timeline.eyebrow;
  timeline.querySelector('h2').textContent = data.timeline.title;
  timeline.querySelector('.block-intro').textContent = data.timeline.intro;
  const timelineList = timeline.querySelector('.timeline');
  timelineList.dataset.start = data.timeline.events[0]?.year || '';
  timelineList.dataset.end = data.timeline.events[data.timeline.events.length - 1]?.year || '';
  timelineList.innerHTML = data.timeline.events.map((event, index) => `
    <li style="--timeline-index:${index}">
      <button class="timeline-dot" type="button" aria-label="Show ${event.year}: ${event.title}"></button>
      <div class="timeline-detail">
        <span class="t-year">${event.year}</span>
        <span class="t-title">${event.title}</span>
        <p class="t-body">${event.body}${event.bodyLink ? ` <a href="${event.bodyLink}">open related page →</a>` : ''}</p>
        ${event.more ? `<details class="t-expand"><summary>read more</summary><p class="t-more">${event.more}</p></details>` : ''}
      </div>
    </li>`).join('');
  timelineList.insertAdjacentHTML('afterbegin', `
    <span class="timeline-endpoint timeline-start">${timelineList.dataset.start}</span>
    <span class="timeline-endpoint timeline-end">${timelineList.dataset.end}</span>`);
  const timelineItems = timelineList.querySelectorAll('li');
  if (timelineItems.length) timelineItems[0].classList.add('is-active');
  timelineItems.forEach((item) => {
    const activate = () => {
      timelineItems.forEach((entry) => entry.classList.toggle('is-active', entry === item));
    };
    item.addEventListener('mouseenter', activate);
    item.addEventListener('focusin', () => {
      activate();
    });
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

  const thinking = document.querySelector('[data-me-thinking]');
  thinking.querySelector('.eyebrow-tag').textContent = data.thinking.eyebrow;
  thinking.querySelector('h2').textContent = data.thinking.title;
  thinking.querySelectorAll('.me-thinking-paragraph').forEach((paragraph, index) => {
    paragraph.innerHTML = data.thinking.paragraphs[index] || '';
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
