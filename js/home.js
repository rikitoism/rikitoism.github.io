document.addEventListener('DOMContentLoaded', async () => {
  document.body.classList.add('home-page');
  const doodleLayer = document.querySelector('.doodle-layer');
  if (doodleLayer) document.body.appendChild(doodleLayer);
  const doodles = [...document.querySelectorAll('.doodle-sticker')];
  const isDesktop = window.matchMedia('(min-width: 721px)').matches;
  if (doodles.length) {
    const desktopLayout = [
      { name: 'doodle-telescope', side: 'left', top: 10, rotation: 4, edge: 8 },
      { name: 'doodle-atom', side: 'right', top: 17, rotation: -5, edge: 6 },
      { name: 'doodle-film', side: 'left', top: 48, rotation: 5, edge: 5 },
      { name: 'doodle-thought', side: 'right', top: 74, rotation: -4, edge: 17 },
      { name: 'doodle-brain', side: 'right', top: 35, rotation: 6, edge: 17 },
      { name: 'doodle-philosophy', side: 'left', top: 60, rotation: -6, edge: 14 },
      { name: 'doodle-sheldon', side: 'right', top: 56, rotation: 4, edge: 4 },
      { name: 'doodle-himym', side: 'left', top: 78, rotation: -5, edge: 2 },
      { name: 'doodle-friends', side: 'right', top: 86, rotation: 6, edge: 6 },
      { name: 'doodle-bigbang', side: 'left', top: 94, rotation: -4, edge: 4 }
    ];
    const mobileLayout = [
      { name: 'doodle-telescope', side: 'left', top: 8, rotation: 4, edge: 3 },
      { name: 'doodle-atom', side: 'right', top: 18, rotation: -5, edge: 5 },
      { name: 'doodle-film', side: 'left', top: 38, rotation: 5, edge: 6 },
      { name: 'doodle-thought', side: 'right', top: 48, rotation: -4, edge: 3 },
      { name: 'doodle-brain', side: 'right', top: 58, rotation: 6, edge: 6 },
      { name: 'doodle-philosophy', side: 'left', top: 68, rotation: -6, edge: 5 },
      { name: 'doodle-sheldon', side: 'right', top: 76, rotation: 4, edge: 4 },
      { name: 'doodle-himym', side: 'left', top: 84, rotation: -5, edge: 3 },
      { name: 'doodle-friends', side: 'right', top: 90, rotation: 6, edge: 6 },
      { name: 'doodle-bigbang', side: 'left', top: 96, rotation: -4, edge: 4 }
    ];
    const layout = isDesktop ? desktopLayout : mobileLayout;
    layout.forEach(({ name, side, top, rotation, edge }) => {
      const doodle = doodles.find((item) => item.classList.contains(name));
      if (!doodle) return;
      doodle.style.top = `${top}%`;
      doodle.style.left = side === 'left' ? `${edge}vw` : 'auto';
      doodle.style.right = side === 'right' ? `${edge}vw` : 'auto';
      doodle.style.transform = `rotate(${rotation}deg)`;
    });
  }
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const intro = document.createElement('div');
  intro.className = 'home-intro';
  intro.setAttribute('role', 'presentation');
  intro.innerHTML = `
    <div class="home-intro-orbit" aria-hidden="true"><span></span><i>✦</i></div>
    <p class="home-intro-kicker">booting a small universe</p>
    <p class="home-intro-title" data-text="SOUL.EXE">SOUL<span>.</span>EXE</p>
    <p class="home-intro-status">curiosity detected · loading ideas</p>
    <button class="home-intro-skip" type="button">skip the theatrics →</button>`;
  document.body.prepend(intro);
  const closeIntro = () => {
    if (intro.classList.contains('is-done')) return;
    intro.classList.add('is-done');
    document.body.classList.add('home-ready');
    window.setTimeout(() => intro.remove(), 650);
  };
  intro.querySelector('.home-intro-skip').addEventListener('click', closeIntro);
  if (prefersReducedMotion) closeIntro();
  else window.setTimeout(closeIntro, 2300);

  const response = await fetch('data/home.json', { cache: 'no-store' });
  if (!response.ok) throw new Error(`Home data request failed: ${response.status}`);
  const data = await response.json();

  const hero = data.hero;
  document.querySelector('.hero-copy .eyebrow-tag').textContent = hero.eyebrow;
  document.querySelector('.hero-title').innerHTML = `${hero.title}<br>`;
  document.querySelector('.hero-subtitle').textContent = hero.subtitle;
  document.querySelector('.hero-sub').textContent = hero.description;
  document.querySelector('.compass').innerHTML = hero.compass
    .map((item) => `<li><span class="compass-icon" aria-hidden="true">${item.icon}</span><span>${item.label}</span></li>`)
    .join('');
  document.querySelector('.hero-copy .btn').textContent = hero.button;

  const tickerHtml = data.ticker.map((item) => `<span>${item}</span><i>✦</i>`).join('');
  document.querySelectorAll('.ticker-sequence').forEach((sequence) => {
    sequence.innerHTML = tickerHtml;
  });

  const tour = data.tour;
  const tourBlock = document.querySelector('[data-home-tour]');
  tourBlock.querySelector('.eyebrow-tag').textContent = tour.eyebrow;
  tourBlock.querySelector('h2').textContent = tour.title;
  tourBlock.querySelector('.grid').innerHTML = tour.cards.map((card) => `
    <a href="${card.href}" style="text-decoration:none;">
      <div class="card">
        <span class="card-meta">${card.meta}</span>
        <h3>${card.title}</h3>
        <p>${card.text}</p>
      </div>
    </a>`).join('');

  const notes = document.querySelectorAll('[data-home-note]');
  notes.forEach((note, index) => { note.textContent = data.notes[index] || ''; });

  const socialLinks = document.querySelector('.soul-bot-links');
  socialLinks.innerHTML = data.socialLinks.map((link) => `
    <a href="${link.href}" target="_blank" rel="noreferrer">
      <span class="social-icon ${link.className}" aria-hidden="true">${link.icon}</span>${link.label}<span>↗</span>
    </a>`).join('');

  document.querySelectorAll('.home-page .hero, .home-page .ticker, .home-page [data-home-tour], .home-page [data-home-tour] + .divider, .home-page [data-home-tour] ~ .block').forEach((section, index) => {
    section.classList.add('home-reveal');
    section.style.setProperty('--reveal-delay', `${Math.min(index * 90, 360)}ms`);
    if (index < 2 || prefersReducedMotion) section.classList.add('is-revealed');
  });
  const revealObserver = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14 })
    : null;
  document.querySelectorAll('.home-reveal').forEach((section) => {
    if (prefersReducedMotion || !revealObserver) section.classList.add('is-revealed');
    else revealObserver.observe(section);
  });
});
