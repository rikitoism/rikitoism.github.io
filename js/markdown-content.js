(function () {
  let librariesPromise;

  function loadScript(source) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = source;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Could not load ${source}`));
      document.head.appendChild(script);
    });
  }

  function ensure() {
    if (!librariesPromise) {
      librariesPromise = (async () => {
        if (!window.marked?.parse) await loadScript('https://cdn.jsdelivr.net/npm/marked@15.0.7/lib/marked.umd.js');
        if (!window.DOMPurify?.sanitize) await loadScript('https://cdn.jsdelivr.net/npm/dompurify@3.2.6/dist/purify.min.js');
      })();
    }
    return librariesPromise;
  }

  function escapeHtml(value) {
    const element = document.createElement('span');
    element.textContent = String(value ?? '');
    return element.innerHTML;
  }

  function render(source) {
    const value = String(source ?? '');
    if (!value.trim()) return '';
    const fallback = `<p>${escapeHtml(value).replace(/\n/g, '<br>')}</p>`;
    if (!window.marked?.parse || !window.DOMPurify?.sanitize) return fallback;
    return window.DOMPurify.sanitize(window.marked.parse(value));
  }

  function renderInline(source) {
    const value = String(source ?? '');
    if (!value.trim()) return '';
    if (!window.marked?.parseInline || !window.DOMPurify?.sanitize) return escapeHtml(value);
    return window.DOMPurify.sanitize(window.marked.parseInline(value));
  }

  function sanitizeHtml(source) {
    const value = String(source ?? '');
    if (!window.DOMPurify?.sanitize) return escapeHtml(value);
    return window.DOMPurify.sanitize(value, { USE_PROFILES: { html: true }, ADD_ATTR: ['class', 'data-language', 'data-tex'] });
  }

  function set(target, source, inline = false) {
    if (!target) return;
    target.innerHTML = inline ? renderInline(source) : render(source);
  }

  window.rikitoMarkdown = { ensure, render, renderInline, sanitizeHtml, set };
})();
