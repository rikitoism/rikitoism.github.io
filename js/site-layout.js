(function () {
  // Clean URLs: GitHub Pages serves /journal for journal.html, so links carry no extension.
  const pages = [
    ['index', 'home'],
    ['me', 'me'],
    ['journal', 'journal'],
    ['journal-entry', 'journal'],
    ['memories', 'memories'],
    ['memory-entry', 'memories'],
    ['influences', 'influences'],
    ['influence-playlists', 'influences'],
    ['influence-songs', 'influences'],
    ['creations', 'creations'],
    ['creation-entry', 'creations'],
    ['guestbook', 'guestbook'],
    ['archive', 'archive']
  ];
  const { pathname, search, hash } = window.location;
  // If someone lands on /journal.html (old link, bookmark), tidy the address bar to /journal.
  if (/\.html?$/i.test(pathname) && window.history && window.history.replaceState && window.location.protocol !== 'file:') {
    const clean = pathname.replace(/(^|\/)index\.html?$/i, '$1').replace(/\.html?$/i, '');
    window.history.replaceState(null, '', (clean || '/') + search + hash);
  }
  // Works for /journal, /journal/, /journal.html and /index.html alike.
  const current = (pathname.split('/').filter(Boolean).pop() || 'index').replace(/\.html?$/i, '').toLowerCase();
  const active = (pages.find(([file]) => file === current) || ['index', 'home'])[1];
  const links = pages.filter(([file]) => !file.includes('-entry') && !file.startsWith('influence-'));
  const hrefFor = (file) => (file === 'index' ? './' : file);
  const nav = links.map(([file, label]) => `<a href="${hrefFor(file)}"${label === active ? ' class="active"' : ''}>${label}</a>`).join('');
  const header = `<header class="site-header"><a href="./" class="brand"><span class="dot"></span>Rikitoism <small>· story worth telling</small></a><button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav" aria-label="Open navigation"><span></span><span></span><span></span></button><nav class="site-nav" id="site-nav" aria-label="Main">${nav}</nav></header>`;
  const footer = '<footer class="site-footer"><span class="scribble">made with late nights &amp; questionable css</span><span>© <span id="year"></span> · <a href="archive">everything, archived</a> · <a href="admin" class="footer-admin">admin</a></span></footer>';
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
