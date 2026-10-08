export function initMeTimelineEditor(ui) {
  const { $, supabase, registerForm, showEditorForm, showEditorList, refreshMarkdownPreviews, verifyDelete } = ui;
  const form = $('me-timeline-form');
  const list = $('me-timeline-list-admin');
  const message = $('me-timeline-message');
  const yearSelect = form.elements.calendar_year;
  populateYearOptions(yearSelect);

  registerForm(form, list.closest('.editor-list-wrap'));
  $('new-me-timeline-event').addEventListener('click', () => {
    form.reset();
    form.elements.id.value = '';
    message.textContent = '';
    showEditorForm(form);
  });
  form.addEventListener('submit', saveEvent);

  async function loadEvents() {
    const { data, error } = await supabase.client.from('site_settings').select('value').eq('key', 'me_timeline').maybeSingle();
    if (error) { list.textContent = error.message; return; }
    list.replaceChildren();
    const events = sortChronologically(data?.value?.events || []);
    const count = document.querySelector('[data-timeline-count="life"]');
    if (count) count.textContent = events.length;
    if (!events.length) { list.textContent = 'No saved events yet. The starter data is still active.'; return; }
    events.forEach((entry, index) => {
      const row = document.createElement('div'); row.className = 'editor-list-item';
      const details = document.createElement('button'); details.className = 'editor-row-main'; details.type = 'button';
      const title = document.createElement('strong'); title.textContent = entry.title;
      const date = document.createElement('small'); date.textContent = entry.year || '';
      details.append(title, date); details.addEventListener('click', () => fillEvent(entry, index));
      const remove = document.createElement('button'); remove.className = 'btn btn-danger'; remove.type = 'button'; remove.textContent = 'delete';
      remove.addEventListener('click', () => deleteEvent(index, entry.title));
      const actions = document.createElement('div'); actions.className = 'editor-item-actions'; actions.append(remove);
      row.append(details, actions); list.append(row);
    });
  }

  async function saveEvent(event) {
    event.preventDefault();
    message.textContent = 'saving...';
    const { data: current, error: readError } = await supabase.client.from('site_settings').select('value').eq('key', 'me_timeline').maybeSingle();
    if (readError) { message.textContent = readError.message; return; }
    const events = sortChronologically(current?.value?.events || []);
    const values = new FormData(form);
    const monthYear = formatMonthYear(values.get('month'), values.get('calendar_year'));
    if (!monthYear) { message.textContent = 'Choose a valid month and year.'; return; }
    const entry = {
      year: monthYear,
      title: String(values.get('title') || '').trim(),
      body: String(values.get('body') || '').trim(),
      bodyLink: String(values.get('bodyLink') || '').trim()
    };
    const id = form.elements.id.value;
    if (id === '') events.push(entry);
    else events[Number(id)] = entry;
    events.splice(0, events.length, ...sortChronologically(events));
    const { error } = await supabase.client.from('site_settings').upsert({ key: 'me_timeline', value: { events } });
    message.textContent = error ? error.message : 'Me timeline saved.';
    if (!error) { form.reset(); form.elements.id.value = ''; showEditorList(form); loadEvents(); }
  }

  function fillEvent(entry, index) {
    form.elements.id.value = index;
    const date = parseMonthYear(entry.year);
    form.elements.month.value = date.month;
    selectYear(yearSelect, date.year);
    ['title', 'body', 'bodyLink'].forEach((field) => { form.elements[field].value = entry[field] ?? ''; });
    refreshMarkdownPreviews(form);
    message.textContent = `editing ${entry.title}`;
    showEditorForm(form);
  }

  async function deleteEvent(index, title) {
    if (!await verifyDelete(title, message)) return;
    const { data: current, error: readError } = await supabase.client.from('site_settings').select('value').eq('key', 'me_timeline').maybeSingle();
    if (readError) { message.textContent = readError.message; return; }
    const events = sortChronologically(current?.value?.events || []).filter((_entry, eventIndex) => eventIndex !== index);
    const { error } = await supabase.client.from('site_settings').upsert({ key: 'me_timeline', value: { events } });
    message.textContent = error ? error.message : 'event deleted.';
    if (!error) loadEvents();
  }

  return { loaders: { 'timeline-editor': loadEvents } };
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function populateYearOptions(select) {
  const currentYear = new Date().getFullYear();
  select.replaceChildren(new Option('Choose year', ''));
  for (let year = currentYear + 5; year >= 1900; year -= 1) {
    select.add(new Option(String(year), String(year)));
  }
}

function selectYear(select, year) {
  if (year && !Array.from(select.options).some((option) => option.value === year)) {
    select.add(new Option(year, year));
  }
  select.value = year;
}

function formatMonthYear(monthValue, yearValue) {
  const month = Number(monthValue);
  const year = String(yearValue || '');
  return Number.isInteger(month) && month >= 1 && month <= 12 && /^\d{4}$/.test(year)
    ? `${MONTH_NAMES[month - 1]} ${year}`
    : '';
}

function parseMonthYear(value) {
  const formatted = /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})$/i.exec(String(value || '').trim());
  if (formatted) {
    const month = MONTH_NAMES.findIndex((name) => name.toLowerCase() === formatted[1].toLowerCase()) + 1;
    return { month: String(month), year: formatted[2] };
  }
  const legacyYear = /^(\d{4}|\d{3}x)$/i.exec(String(value || '').trim());
  if (!legacyYear) return { month: '', year: '' };
  const year = legacyYear[1].toLowerCase().endsWith('x') ? `${legacyYear[1].slice(0, 3)}0` : legacyYear[1];
  return { month: '1', year };
}

function chronologicalValue(value) {
  const { month, year } = parseMonthYear(value);
  if (month && year) return Number(year) * 12 + Number(month);
  return Number.POSITIVE_INFINITY;
}

function sortChronologically(events) {
  return [...events].sort((a, b) => chronologicalValue(a.year) - chronologicalValue(b.year));
}
