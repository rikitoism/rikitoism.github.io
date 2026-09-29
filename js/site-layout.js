(function () {
  const pages = [
    ['index.html', 'home'],
    ['me.html', 'me'],
    ['journal.html', 'journal'],
    ['journal-entry.html', 'journal'],
    ['memories.html', 'memories'],
    ['memory-entry.html', 'memories'],
    ['influences.html', 'influences'],
    ['influence-playlists.html', 'influences'],
    ['influence-songs.html', 'influences'],
    ['creations.html', 'creations'],
    ['creation-entry.html', 'creations'],
    ['guestbook.html', 'guestbook'],
    ['archive.html', 'archive']
  ];
  const current = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const active = (pages.find(([file]) => file === current) || ['index.html', 'home'])[1];
  const links = pages.filter(([file]) => !file.includes('-entry') && !file.startsWith('influence-'));
  const nav = links.map(([file, label]) => `<a href="${file}"${label === active ? ' class="active"' : ''}>${label}</a>`).join('');
  const header = `<header class="site-header"><a href="index.html" class="brand"><span class="dot"></span>Rikitoism <small>· story worth telling</small></a><button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav" aria-label="Open navigation"><span></span><span></span><span></span></button><nav class="site-nav" id="site-nav" aria-label="Main">${nav}</nav></header>`;
  const footer = '<footer class="site-footer"><span class="scribble">made with late nights &amp; questionable css</span><span>© <span id="year"></span> · <a href="archive.html">everything, archived</a></span></footer>';
  const existingHeader = document.querySelector('header.site-header');
  const existingFooter = document.querySelector('footer.site-footer');
  if (existingHeader) existingHeader.outerHTML = header;
  else document.body.insertAdjacentHTML('afterbegin', header);
  if (existingFooter) existingFooter.outerHTML = footer;
  else document.body.insertAdjacentHTML('beforeend', footer);
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  window.rikitoMarkdownReady = new Promise((resolve, reject) => {
    const renderer = document.createElement('script');
    renderer.src = 'js/markdown-content.js';
    renderer.onload = resolve;
    renderer.onerror = () => reject(new Error('Could not load the Markdown renderer.'));
    document.head.appendChild(renderer);
  });

  const toggle = document.querySelector('.nav-toggle');
  const navigation = document.querySelector('.site-nav');
  if (!toggle || !navigation) return;
  const closeNavigation = () => {
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open navigation');
    navigation.classList.remove('is-open');
  };
  toggle.addEventListener('click', () => {
    const isOpen = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!isOpen));
    toggle.setAttribute('aria-label', isOpen ? 'Open navigation' : 'Close navigation');
    navigation.classList.toggle('is-open', !isOpen);
  });
  navigation.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeNavigation));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeNavigation();
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 720) closeNavigation();
  }, { passive: true });
})();
