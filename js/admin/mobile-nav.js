(() => {
  const nav = document.querySelector('.admin-mobile-nav');
  const island = document.querySelector('.admin-mobile-island');
  const toggle = document.querySelector('.admin-mobile-current');
  const scrim = document.querySelector('.admin-mobile-scrim');
  const panel = document.querySelector('#admin-mobile-panel');
  const tileNav = document.querySelector('.admin-mobile-grid');
  const indicator = document.querySelector('.admin-mobile-indicator');
  const label = document.querySelector('.admin-mobile-current-name');
  const glyph = document.querySelector('.admin-mobile-current-glyph');
  const themeIcon = document.querySelector('.admin-mobile-theme-icon');
  const dashboard = document.querySelector('#dashboard');
  if (!nav || !island || !toggle || !scrim || !panel || !tileNav || !dashboard) return;

  const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  let pendingLabel = null;
  let labelTransition = Promise.resolve();
  const moduleName = (button) => [...button.childNodes]
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent)
    .join(' ')
    .trim();
  const setOpen = (isOpen) => {
    nav.classList.toggle('is-open', isOpen);
    scrim.classList.toggle('is-visible', isOpen);
    toggle.setAttribute('aria-expanded', String(isOpen));
    if (isOpen) panel.removeAttribute('inert');
    else panel.setAttribute('inert', '');
  };
  const updateCurrent = (name, symbol, animate = true) => {
    if (glyph && glyph.textContent !== symbol) {
      if (animate && !reducedMotion()) glyph.animate([{ transform: 'scale(.55) rotate(-55deg)' }, { transform: 'none' }], { duration: 520, easing: 'cubic-bezier(.34,1.56,.64,1)' });
      glyph.textContent = symbol;
    }
    if (pendingLabel === name) return labelTransition;
    const previous = label.querySelector('.admin-mobile-label-text');
    if (!previous || previous.textContent === name || !animate || reducedMotion()) {
      if (previous) previous.textContent = name;
      return Promise.resolve();
    }
    const incoming = document.createElement('span');
    incoming.className = 'admin-mobile-label-text';
    incoming.textContent = name;
    label.append(incoming);
    pendingLabel = name;
    const outgoing = previous.animate(
      [{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(-115%)', opacity: 0 }],
      { duration: 260, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' },
    );
    const arriving = incoming.animate(
      [{ transform: 'translateY(115%)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }],
      { duration: 420, easing: 'cubic-bezier(.2,.75,.25,1)', fill: 'forwards' },
    );
    labelTransition = Promise.allSettled([outgoing.finished, arriving.finished])
      .then(() => {
        label.replaceChildren(incoming);
        pendingLabel = null;
      });
    return labelTransition;
  };
  const placeIndicator = () => {
    const active = tileNav.querySelector('[aria-current="page"]');
    if (!active || !indicator) return;
    indicator.style.width = `${active.offsetWidth}px`;
    indicator.style.height = `${active.offsetHeight}px`;
    indicator.style.transform = `translate(${active.offsetLeft}px,${active.offsetTop}px)`;
  };
  const syncActive = () => {
    const active = document.querySelector('.admin-module[aria-current="page"]');
    if (!active) return;
    let selected;
    document.querySelectorAll('[data-mobile-editor]').forEach((button) => {
      const isSelected = button.dataset.mobileEditor === active.dataset.openEditor;
      if (isSelected) {
        button.setAttribute('aria-current', 'page');
        selected = button;
      } else button.removeAttribute('aria-current');
    });
    if (selected) {
      updateCurrent(moduleName(selected), selected.querySelector('[aria-hidden="true"]')?.textContent || '⌂');
      requestAnimationFrame(placeIndicator);
    }
  };
  const syncDashboard = () => {
    nav.hidden = dashboard.hidden;
    if (dashboard.hidden) setOpen(false);
    syncActive();
  };

  toggle.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));
  scrim.addEventListener('click', () => setOpen(false));
  scrim.hidden = false;
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') setOpen(false); });
  document.querySelectorAll('[data-mobile-editor]').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelector(`.admin-module[data-open-editor="${button.dataset.mobileEditor}"]`)?.click();
      const titleTransition = updateCurrent(moduleName(button), button.querySelector('[aria-hidden="true"]')?.textContent || '⌂');
      titleTransition.finally(() => setOpen(false));
    });
  });
  document.querySelector('.admin-mobile-theme')?.addEventListener('click', () => {
    const desktopTheme = document.querySelector('#admin-theme-toggle');
    if (!desktopTheme) return;
    const applyTheme = () => desktopTheme.click();
    if (document.startViewTransition && !reducedMotion()) {
      const bounds = document.querySelector('.admin-mobile-theme').getBoundingClientRect();
      const transition = document.startViewTransition(applyTheme);
      transition.ready.then(() => document.documentElement.animate(
        { clipPath: [`circle(0px at ${bounds.left + bounds.width / 2}px ${bounds.top + bounds.height / 2}px)`, `circle(${Math.hypot(innerWidth, innerHeight)}px at ${bounds.left + bounds.width / 2}px ${bounds.top + bounds.height / 2}px)`] },
        { duration: 650, easing: 'ease-in-out', pseudoElement: '::view-transition-new(root)' },
      ));
    } else applyTheme();
  });
  document.querySelector('.admin-mobile-signout')?.addEventListener('click', () => {
    document.querySelector('#logout-button')?.click();
    setOpen(false);
  });

  new MutationObserver(syncDashboard).observe(dashboard, { attributes: true, attributeFilter: ['hidden', 'aria-current'], subtree: true });
  const desktopTheme = document.querySelector('#admin-theme-toggle');
  const syncTheme = () => {
    if (!desktopTheme || !themeIcon) return;
    const isDark = desktopTheme.getAttribute('aria-pressed') === 'true';
    themeIcon.textContent = isDark ? '☼' : '☾';
    themeIcon.setAttribute('aria-label', isDark ? 'Light theme active' : 'Dark theme active');
  };
  if (desktopTheme) {
    new MutationObserver(syncTheme).observe(desktopTheme, { attributes: true, attributeFilter: ['aria-pressed'] });
    syncTheme();
  }

  let previousY = window.scrollY;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (!nav.classList.contains('is-open')) {
      if (y > previousY + 6 && y > 90) nav.classList.add('is-hidden');
      else if (y < previousY - 6) nav.classList.remove('is-hidden');
    }
    previousY = y;
  }, { passive: true });
  window.addEventListener('resize', placeIndicator);
  if ('ResizeObserver' in window) new ResizeObserver(placeIndicator).observe(tileNav);
  if (document.fonts?.ready) document.fonts.ready.then(placeIndicator);
  syncDashboard();
})();
