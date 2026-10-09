document.addEventListener('DOMContentLoaded', async () => {
  await window.rikitoMarkdownReady;
  await window.rikitoMarkdown.ensure().catch(() => {});
  const client = window.soulSupabase?.client; const root = document.getElementById('creation-entry'); const slug = new URLSearchParams(location.search).get('slug');
  if (!client || !slug) return;
  const { data: item, error } = await client.from('creations').select('*').eq('slug', slug).eq('status', 'published').single();
  if (error) { root.textContent = 'This creation could not be found.'; return; }
  root.replaceChildren();
  const back = document.createElement('a'); back.className = 'feed-note'; back.href = 'creations'; back.textContent = '← back to creations';
  const meta = document.createElement('p'); meta.className = 'eyebrow-tag'; meta.textContent = item.category.replace('-', ' & ');
  const title = document.createElement('h1'); title.textContent = item.title; const intro = document.createElement('div'); intro.className = 'lede markdown-copy'; window.rikitoMarkdown.set(intro, item.short_description, true);
  root.append(back, meta, title, intro);
  if (item.cover_image) { const image = document.createElement('img'); image.className = 'creation-cover'; image.src = item.cover_image; image.alt = item.title; root.append(image); }
  const headerMeta = document.createElement('div'); headerMeta.className = 'creation-meta-row';
  const tags = document.createElement('ul'); tags.className = 'tag-list creation-tags'; (item.tags || []).forEach((tag) => { const li = document.createElement('li'); li.textContent = tag; tags.append(li); });
  const links = document.createElement('div'); links.className = 'creation-links';
  if (item.project_url) links.append(link(item.project_url, 'view this project →', 'project-link'));
  if (item.github_url) links.append(link(item.github_url, 'view on GitHub →', 'github-link'));
  headerMeta.append(tags, links); root.append(headerMeta);
  if (item.published_at) { const date = document.createElement('p'); date.className = 'feed-note'; date.textContent = new Date(item.published_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }); root.append(date); }
  const body = document.createElement('article'); body.className = 'creation-body';
  const blocks = Array.isArray(item.body) ? item.body : (Array.isArray(item.body?.blocks) ? item.body.blocks : []);
  blocks.forEach((block) => body.append(renderBlock(block)));
  if (!blocks.length) {
    const empty = document.createElement('p'); empty.className = 'feed-note'; empty.textContent = 'This creation has no project notes yet.'; body.append(empty);
  }
  root.append(body);
  const savedCodeLanguages = blocks.find((block) => block.type === 'document')?.codeLanguages || [];
  renderEquations(body, savedCodeLanguages);
  function link(url, text, className) { const a = document.createElement('a'); a.className = className; a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = text; return a; }
  function renderBlock(block) {
    const type = block.type || 'text';
    if (type === 'document') {
      const article = document.createElement('div'); article.className = 'creation-rich-document';
      article.innerHTML = window.rikitoMarkdown.sanitizeHtml(block.content || ''); return article;
    }
    const element = document.createElement(type === 'heading' ? `h${Math.min(3, Math.max(1, Number(block.level) || 2))}` : type === 'code' ? 'pre' : type === 'image' ? 'img' : 'div');
    element.className = `creation-block creation-block-${type}`;
    if (type === 'image') { element.src = block.url; element.alt = block.alt || ''; }
    else if (type === 'gallery') { const urls = [block.url, ...(block.content || '').split(/\n/)].filter(Boolean); urls.forEach((url) => { const image = document.createElement('img'); image.src = url.trim(); image.alt = ''; image.loading = 'lazy'; element.append(image); }); }
    else if (type === 'code') element.textContent = block.content || '';
    else if (type === 'equation') { element.classList.add('creation-equation'); element.dataset.tex = block.content || ''; element.textContent = block.content || ''; }
    else if (type === 'table') {
      const rows = Array.isArray(block.rows) ? block.rows : [];
      const table = document.createElement('table'); rows.forEach((row, rowIndex) => { const tr = table.insertRow(); row.forEach((value) => { const cell = document.createElement(rowIndex ? 'td' : 'th'); cell.textContent = value; tr.append(cell); }); }); element.append(table);
    }
    else if (type === 'divider') element.innerHTML = '<hr>';
    else if (type === 'table' && Array.isArray(block.rows)) {
      const table = document.createElement('table'); block.rows.forEach((row, rowIndex) => { const tr = table.insertRow(); row.forEach((value) => { const cell = document.createElement(rowIndex ? 'td' : 'th'); cell.textContent = value; tr.append(cell); }); }); element.append(table);
    }
    else if (type === 'embed') { const label = document.createElement('strong'); label.textContent = block.content || 'external resource'; const anchor = document.createElement('a'); anchor.href = block.url || '#'; anchor.target = '_blank'; anchor.rel = 'noopener noreferrer'; anchor.textContent = block.url ? 'open resource →' : 'resource link missing'; element.append(label, anchor); }
    else window.rikitoMarkdown.set(element, block.content || '', type === 'heading');
    return element;
  }

  async function renderEquations(container, savedCodeLanguages = []) {
    const equations = [...container.querySelectorAll('.creation-rich-equation, .creation-equation')];
    container.querySelectorAll('img').forEach((image) => { image.loading = 'lazy'; image.decoding = 'async'; });
    const codeBlocks = [...container.querySelectorAll('.creation-rich-code code')];
    codeBlocks.forEach((code, index) => {
      const pre = code.closest('pre');
      const language = savedCodeLanguages[index] || pre.dataset.language || 'python';
      pre.dataset.language = language;
      const frame = document.createElement('div'); frame.className = 'creation-code-frame';
      const toolbar = document.createElement('div'); toolbar.className = 'creation-code-toolbar';
      const name = document.createElement('span'); name.className = 'creation-code-language'; name.textContent = languageName(language);
      const copy = document.createElement('button'); copy.className = 'creation-code-copy'; copy.type = 'button'; copy.textContent = 'Copy';
      copy.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(code.textContent);
          copy.textContent = 'Copied';
          setTimeout(() => { if (copy.isConnected) copy.textContent = 'Copy'; }, 1400);
        } catch {
          copy.textContent = 'Copy failed';
          setTimeout(() => { if (copy.isConnected) copy.textContent = 'Copy'; }, 1800);
        }
      });
      toolbar.append(name, copy);
      pre.before(frame); frame.append(toolbar, pre);
    });
    if (equations.length) {
      try {
        await ensureMathJax();
        equations.forEach((equation) => {
          const tex = equation.dataset.tex || equation.textContent.trim();
          try { equation.replaceChildren(window.MathJax.tex2svg(tex, { display: true })); }
          catch { equation.textContent = tex; }
        });
      } catch { /* Keep the saved LaTeX visible if the renderer is unavailable. */ }
    }
    if (codeBlocks.length) {
      try {
        await ensureHighlight();
        codeBlocks.forEach((code) => {
          const pre = code.closest('pre'); const language = pre.dataset.language;
          if (window.hljs.getLanguage(language)) code.innerHTML = window.hljs.highlight(code.textContent, { language, ignoreIllegals: true }).value;
        });
      } catch { /* Plain, readable code remains if highlighting is unavailable. */ }
    }
  }

  function languageName(language) {
    return ({ javascript: 'JavaScript', typescript: 'TypeScript', plaintext: 'Plain text', cpp: 'C++' })[language] || language.charAt(0).toUpperCase() + language.slice(1);
  }

  function ensureMathJax() {
    if (window.MathJax?.tex2svg) return Promise.resolve();
    if (window.creationMathJaxLoading) return window.creationMathJaxLoading;
    window.MathJax = { startup: { typeset: false }, svg: { fontCache: 'none' } };
    window.creationMathJaxLoading = new Promise((resolve, reject) => {
      const script = document.createElement('script'); script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/tex-svg.js';
      script.onload = () => Promise.resolve(window.MathJax?.startup?.promise).then(() => {
        if (typeof window.MathJax?.tex2svg !== 'function') throw new Error('MathJax did not initialize.');
        resolve();
      }).catch(reject);
      script.onerror = reject; document.head.append(script);
    });
    return window.creationMathJaxLoading;
  }

  function ensureHighlight() {
    if (window.hljs) return Promise.resolve();
    if (window.creationHighlightLoading) return window.creationHighlightLoading;
    window.creationHighlightLoading = new Promise((resolve, reject) => {
      const script = document.createElement('script'); script.src = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js';
      script.onload = resolve; script.onerror = reject; document.head.append(script);
    });
    return window.creationHighlightLoading;
  }
});
