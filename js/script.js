// ============================================================
// SOUL'S LITTLE CORNER OF THE INTERNET — tiny bits of interaction
// Kept deliberately small and dependency-free.
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- hidden easter-egg messages ---------- */
  const eggMessages = [
    "you found a secret. there are 3 more hiding on this site.",
    "psst. nothing here. go back to what you were doing.",
    "fun fact: this message serves no purpose.",
    "you have now clicked something you were not supposed to click.",
    "loading deep thoughts... 12% ... 13% ... nope, gave up.",
    "this is where the goblins live. hi, goblins.",
  ];

  let eggBox = document.getElementById('egg-msg');
  if (!eggBox) {
    eggBox = document.createElement('div');
    eggBox.id = 'egg-msg';
    eggBox.setAttribute('role', 'status');
    document.body.appendChild(eggBox);
  }

  let eggTimer;
  function showEgg(text) {
    eggBox.textContent = text;
    eggBox.classList.add('show');
    clearTimeout(eggTimer);
    eggTimer = setTimeout(() => eggBox.classList.remove('show'), 2600);
  }

  document.querySelectorAll('.egg-trigger').forEach((el, i) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const custom = el.getAttribute('data-egg');
      showEgg(custom || eggMessages[i % eggMessages.length]);
    });
  });

  // logo easter egg: click the little dot in the brand 5 times
  const dot = document.querySelector('.brand .dot');
  if (dot) {
    let clicks = 0;
    dot.style.cursor = 'pointer';
    dot.addEventListener('click', (e) => {
      e.preventDefault();
      clicks++;
      if (clicks === 5) {
        showEgg("okay okay you win. here is a fact: octopuses have three hearts.");
        clicks = 0;
      }
    });
  }

  /* ---------- creation tabs (creations.html) ---------- */
  const tabButtons = document.querySelectorAll('.tab-btn');
  if (tabButtons.length) {
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-tab');
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('is-active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('is-active'));
        btn.classList.add('is-active');
        document.getElementById(target).classList.add('is-active');
      });
    });
  }

  /* ---------- live filter for archive.html ---------- */
  const searchBox = document.getElementById('archive-search');
  const archiveItems = document.querySelectorAll('.archive-list li');
  if (searchBox && archiveItems.length) {
    searchBox.addEventListener('input', () => {
      const q = searchBox.value.trim().toLowerCase();
      archiveItems.forEach(li => {
        const text = li.textContent.toLowerCase();
        li.style.display = text.includes(q) ? '' : 'none';
      });
    });
  }

  /* ---------- footer year ---------- */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- tiny social bot ---------- */
  const botToggle = document.querySelector('.soul-bot-toggle');
  const botPanel = document.getElementById('soul-bot-panel');
  const botMessage = document.getElementById('soul-bot-message');
  if (botToggle && botPanel && botMessage) {
    const botMessages = [
      'wanna share some gossips?',
      'i know a shortcut to the good stuff.',
      'this button contains absolutely no secrets. probably.',
      'go on. click a link. make it interesting.',
      'SOUL.EXE recommends a tiny internet adventure.'
    ];
    let messageIndex = 0;
    botToggle.addEventListener('click', () => {
      const isOpen = botToggle.getAttribute('aria-expanded') === 'true';
      botToggle.setAttribute('aria-expanded', String(!isOpen));
      botPanel.hidden = isOpen;
      if (!isOpen) {
        botMessage.textContent = botMessages[messageIndex];
        messageIndex = (messageIndex + 1) % botMessages.length;
      }
    });
  }

});
