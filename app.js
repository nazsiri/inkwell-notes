/* Inkwell — a premium notes workspace. Every Professional feature unlocked.
 * Notebooks & stacks, tags, rich editor, checklists, tables, images, attachments,
 * sketches, audio notes, note links & backlinks, tasks, reminders, calendar,
 * templates, version history, AES-256 note encryption, advanced search,
 * saved searches, presentation mode, focus mode, export/import, offline (PWA).
 * All data stays on this device (IndexedDB).
 */
'use strict';
(() => {

// ============================================================
// Utilities
// ============================================================
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const now = () => Date.now();
const DAY = 864e5;
const pad = n => String(n).padStart(2, '0');
const ymd = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseYmd = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
const MOD = isMac ? '⌘' : 'Ctrl';
const ALT = isMac ? '⌥' : 'Alt';
const isMobile = () => window.matchMedia('(max-width: 860px)').matches;

function rel(ts) {
  const d = now() - ts;
  if (d < 45e3) return 'Just now';
  if (d < 3600e3) return Math.max(1, Math.round(d / 60e3)) + ' min ago';
  const dt = new Date(ts), t = new Date();
  if (ymd(dt) === ymd(t)) return dt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (ymd(dt) === ymd(addDays(t, -1))) return 'Yesterday';
  if (d < 6 * DAY) return dt.toLocaleDateString([], { weekday: 'long' });
  return dt.toLocaleDateString([], { month: 'short', day: 'numeric', year: dt.getFullYear() !== t.getFullYear() ? 'numeric' : undefined });
}
const fullDate = ts => new Date(ts).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
const fmtSize = b => b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(1) + ' MB';
const safeName = s => (s || 'Untitled').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 80).trim() || 'Untitled';
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

function dueLabel(s) {
  if (!s) return '';
  const d = parseYmd(s), t = new Date(); t.setHours(0, 0, 0, 0);
  const diff = Math.round((d - t) / DAY);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff > 1 && diff < 7) return d.toLocaleDateString([], { weekday: 'long' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: d.getFullYear() !== t.getFullYear() ? 'numeric' : undefined });
}
const dueClass = s => !s ? '' : s < ymd() ? 'overdue' : s === ymd() ? 'today' : '';

// ============================================================
// Icons
// ============================================================
const ICONS = {
  logo: '<path d="M12 3c3 4 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 3-7 6-11z"/><path d="M10 15a2 2 0 0 0 2 2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z"/>',
  note: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  task: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  book: '<path d="M5 4a1 1 0 0 1 1-1h13v18H6a1 1 0 0 1-1-1z"/><path d="M9 3v18"/>',
  stack: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
  tag: '<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
  template: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M9 7V4h6v3"/>',
  settings: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  bell: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/>',
  pin: '<path d="M12 17v5M9 3h6l-1 6 4 4v2H6v-2l4-4z"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  unlock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/>',
  more: '<circle cx="5" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="19" cy="12" r="1.3" fill="currentColor"/>',
  bold: '<path d="M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z"/>',
  italic: '<path d="M19 4h-9M14 20H5M15 4 9 20"/>',
  underline: '<path d="M6 4v6a6 6 0 0 0 12 0V4M4 20h16"/>',
  strike: '<path d="M16 6a4 4 0 0 0-4-2c-2.5 0-4 1.5-4 3.5 0 4 8 3 8 7.5 0 2-1.8 3-4 3a5 5 0 0 1-4.5-2.5M4 12h16"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
  olist: '<path d="M10 6h10M10 12h10M10 18h10M4 4h1v4M4 14h2l-2 3h2"/>',
  checklist: '<rect x="3" y="4" width="6" height="6" rx="1.5"/><path d="m4.5 7 1 1 2-2M13 7h8"/><rect x="3" y="14" width="6" height="6" rx="1.5"/><path d="M13 17h8"/>',
  quote: '<path d="M6 17h3l2-4V7H5v6h3M14 17h3l2-4V7h-6v6h3"/>',
  code: '<path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 5l-4 14"/>',
  table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9 4v16M15 4v16"/>',
  hr: '<path d="M4 12h16"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  notelink: '<path d="M7 17 17 7M8 7h9v9"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
  clip: '<path d="m20 11-8.5 8.5a5 5 0 0 1-7-7L13 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L14 7"/>',
  pen: '<path d="M4 20l4-1L19 8a2.1 2.1 0 0 0-3-3L5 16z"/><path d="M14 7l3 3"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  upload: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
  present: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4M10 8.5v5l4-2.5z"/>',
  focus: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  chevL: '<path d="m15 6-6 6 6 6"/>',
  chevR: '<path d="m9 6 6 6-6 6"/>',
  chevD: '<path d="m6 9 6 6 6-6"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>',
  copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
  hilite: '<path d="m9 11-6 6v3h6l3-3M22 6l-4-4-9 9 4 4z"/>',
  color: '<path d="M5 18 12 4l7 14M8 12h8"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.6M8.2 13.2l7.6 4.6"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
  redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/>',
  check: '<path d="M5 12l5 5L20 7"/>',
  move: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M10 13h6M13 10l3 3-3 3"/>',
  keyboard: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
  heading: '<path d="M6 4v16M18 4v16M6 12h12"/>',
  eraser: '<path d="m7 21-4-4 11-11 7 7-8 8zM10 21h11"/>',
  clear: '<path d="M4 7V5h12v2M10 5l-3 14M5 19h5M15 13l6 6M21 13l-6 6"/>',
  indent: '<path d="M3 6h18M11 12h10M3 18h18M3 9l4 3-4 3"/>',
  outdent: '<path d="M3 6h18M11 12h10M3 18h18M7 9l-4 3 4 3"/>',
  bookmark: '<path d="M6 3h12v18l-6-4-6 4z"/>',
  printer: '<path d="M6 9V3h12v6M6 18H4v-7h16v7h-2M8 14h8v7H8z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  rows: '<path d="M4 6h16M4 10h10M4 15h16M4 19h10"/>',
  sort: '<path d="M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4"/>',
  filter: '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
  zap: '<path d="M13 3 4 14h7l-1 7 9-11h-7z"/>',
  crown: '<path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z"/>',
  shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
  wifi: '<path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M2 9a15 15 0 0 1 20 0M12 19.5h.01"/>',
  edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  external: '<path d="M14 4h6v6M20 4 10 14M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>',
  db: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
};
const I = (n, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;

// ============================================================
// Storage (IndexedDB with localStorage fallback)
// ============================================================
const DB = {
  db: null,
  open() {
    return new Promise(res => {
      if (!('indexedDB' in window)) return res(null);
      let r;
      try { r = indexedDB.open('inkwell', 1); } catch { return res(null); }
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => { this.db = r.result; res(this.db); };
      r.onerror = () => res(null);
      r.onblocked = () => res(null);
    });
  },
  get(k) {
    return new Promise(res => {
      if (!this.db) { try { return res(JSON.parse(localStorage.getItem('inkwell:' + k))); } catch { return res(null); } }
      const q = this.db.transaction('kv').objectStore('kv').get(k);
      q.onsuccess = () => res(q.result ?? null);
      q.onerror = () => res(null);
    });
  },
  set(k, v) {
    return new Promise((res, rej) => {
      if (!this.db) { try { localStorage.setItem('inkwell:' + k, JSON.stringify(v)); res(); } catch (e) { rej(e); } return; }
      const tx = this.db.transaction('kv', 'readwrite');
      tx.objectStore('kv').put(v, k);
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
      tx.onabort = () => rej(tx.error);
    });
  }
};

// ============================================================
// State
// ============================================================
const ACCENTS = ['#2f6fed', '#7c4dff', '#e0457b', '#f2711c', '#1f9d55', '#0ea5a4', '#c99400', '#5b6b7f'];
function defaultState() {
  return {
    version: 1, notes: [], notebooks: [], tasks: [], templates: [], savedSearches: [], scratch: '',
    settings: { theme: 'system', accent: ACCENTS[0], font: 'sans', fontSize: 16, defaultNotebook: null, spellcheck: true, listLayout: 'snippet', sort: 'updated', name: '' },
    createdAt: now()
  };
}
let S = defaultState();
const ui = {
  view: 'home', notebookId: null, stack: null, tag: null, query: '', noteId: null, tagFilter: null,
  calMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  expanded: { notebooks: true, tags: false, shortcuts: true, saved: true },
  taskFilter: 'all', showCompleted: false, focus: false, mobileEditor: false,
  unlocked: {}, editorFor: null, baseline: null, range: null, menu: null, modalClose: null, dirty: false,
};
const LIST_VIEWS = ['notes', 'shortcuts', 'notebook', 'stack', 'tag', 'search', 'trash'];

const noteById = id => S.notes.find(n => n.id === id);
const nbById = id => S.notebooks.find(b => b.id === id);
const cur = () => noteById(ui.noteId);
const activeNotes = () => S.notes.filter(n => !n.trashed);
const defaultNotebookId = () => (nbById(S.settings.defaultNotebook) || S.notebooks[0] || ensureNotebook()).id;
function ensureNotebook() { const nb = { id: uid(), name: 'Inbox', stack: '', createdAt: now() }; S.notebooks.push(nb); return nb; }
const allTags = () => { const m = new Map(); activeNotes().forEach(n => n.tags.forEach(t => m.set(t, (m.get(t) || 0) + 1))); return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])); };
const noteHTML = n => n.locked ? (ui.unlocked[n.id]?.html ?? null) : n.html;

function makeNote(o = {}) {
  const t = now();
  return { id: uid(), title: '', html: '', text: '', notebookId: o.notebookId || defaultNotebookId(), tags: [], pinned: false, shortcut: false, trashed: false, trashedAt: null, reminder: null, createdAt: t, updatedAt: t, versions: [], locked: null, ...o };
}

let saveTimer;
function persist() {
  ui.dirty = true;
  setSync('saving');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flushSave, 350);
}
async function flushSave() {
  clearTimeout(saveTimer);
  try { await DB.set('state', S); ui.dirty = false; setSync('saved'); }
  catch (e) { setSync('error'); toast('Could not save: ' + (e?.message || e), 'error'); }
}
function setSync(state) {
  const el = $('#sync'); if (!el) return;
  el.className = 'sync ' + state;
  el.lastElementChild.textContent = state === 'saving' ? 'Saving…' : state === 'error' ? 'Save failed' : 'Saved';
}

// ============================================================
// HTML helpers: text extraction, sanitizing, markdown
// ============================================================
function htmlText(h) {
  if (!h) return '';
  const doc = new DOMParser().parseFromString(h.replace(/<\/(p|div|li|h[1-6]|tr|td|th|pre|blockquote)>|<br\s*\/?>/gi, m => m + ' '), 'text/html');
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
}
const firstImage = h => { const m = /<img[^>]+src="((?:data:image|https?:)[^"]+)"/.exec(h || ''); return m ? m[1] : null; };

const SAFE_ATTR = new Set(['href', 'src', 'alt', 'title', 'colspan', 'rowspan', 'data-checked', 'data-note', 'class', 'style', 'contenteditable', 'download', 'controls', 'width', 'height']);
function sanitize(html, strict = false) {
  const doc = new DOMParser().parseFromString(html || '', 'text/html');
  doc.querySelectorAll('script,style,iframe,frame,object,embed,meta,link,base,form,input,button,textarea,select,noscript,template,svg,math').forEach(n => n.remove());
  doc.querySelectorAll('*').forEach(el => {
    for (const a of [...el.attributes]) {
      const n = a.name.toLowerCase();
      let ok = SAFE_ATTR.has(n);
      if (strict && ['class', 'style', 'contenteditable', 'data-note', 'width', 'height'].includes(n)) ok = false;
      if (ok && (n === 'href' || n === 'src')) {
        const v = a.value.trim().toLowerCase();
        const hasScheme = /^[a-z][a-z0-9+.-]*:/.test(v);
        ok = !hasScheme || /^(https?:|mailto:|tel:)/.test(v) || v.startsWith('data:image/') || (!strict && v.startsWith('data:') && !v.startsWith('data:text/html'));
      }
      if (!ok) el.removeAttribute(a.name);
    }
  });
  return doc.body.innerHTML;
}

function htmlToMd(html) {
  const doc = new DOMParser().parseFromString(html || '', 'text/html');
  const inline = node => [...node.childNodes].map(n => md(n)).join('');
  function md(n) {
    if (n.nodeType === 3) return n.textContent.replace(/\s+/g, ' ');
    if (n.nodeType !== 1) return '';
    const t = n.tagName.toLowerCase(), c = () => inline(n);
    switch (t) {
      case 'h1': return `\n# ${c().trim()}\n\n`;
      case 'h2': return `\n## ${c().trim()}\n\n`;
      case 'h3': case 'h4': return `\n### ${c().trim()}\n\n`;
      case 'p': case 'div': { const s = c().trim(); return s ? s + '\n\n' : '\n'; }
      case 'br': return '  \n';
      case 'strong': case 'b': { const s = c(); return s.trim() ? `**${s.trim()}** ` : s; }
      case 'em': case 'i': { const s = c(); return s.trim() ? `*${s.trim()}* ` : s; }
      case 's': case 'strike': case 'del': { const s = c(); return s.trim() ? `~~${s.trim()}~~` : s; }
      case 'code': return '`' + n.textContent + '`';
      case 'pre': return '\n```\n' + n.textContent.replace(/\n$/, '') + '\n```\n\n';
      case 'blockquote': return c().trim().split('\n').map(l => '> ' + l).join('\n') + '\n\n';
      case 'hr': return '\n---\n\n';
      case 'a': {
        if (n.classList.contains('attachment')) return `[📎 ${n.getAttribute('download') || 'attachment'}]`;
        if (n.classList.contains('note-link')) return `[[${n.textContent}]]`;
        return `[${c()}](${n.getAttribute('href') || ''})`;
      }
      case 'img': return `![${n.getAttribute('alt') || ''}](${n.getAttribute('src')})\n`;
      case 'ul': case 'ol': return list(n, 0) + '\n';
      case 'table': return table(n) + '\n';
      case 'audio': return '[🎙 audio recording]';
      default: return c();
    }
  }
  function list(ul, depth) {
    const ordered = ul.tagName === 'OL', check = ul.classList.contains('checklist');
    let i = 1;
    return [...ul.children].filter(li => li.tagName === 'LI').map(li => {
      const nested = [...li.children].filter(x => /^(UL|OL)$/.test(x.tagName));
      const text = [...li.childNodes].filter(x => !nested.includes(x)).map(md).join('').trim();
      const prefix = check ? `- [${li.dataset.checked === 'true' ? 'x' : ' '}] ` : ordered ? `${i++}. ` : '- ';
      return '  '.repeat(depth) + prefix + text + '\n' + nested.map(x => list(x, depth + 1)).join('');
    }).join('');
  }
  function table(tb) {
    const rows = [...tb.querySelectorAll('tr')].map(tr => [...tr.children].map(td => inline(td).trim().replace(/\|/g, '\\|') || ' '));
    if (!rows.length) return '';
    const w = Math.max(...rows.map(r => r.length));
    rows.forEach(r => { while (r.length < w) r.push(' '); });
    return ['| ' + rows[0].join(' | ') + ' |', '|' + ' --- |'.repeat(w), ...rows.slice(1).map(r => '| ' + r.join(' | ') + ' |')].join('\n') + '\n';
  }
  return inline(doc.body).replace(/[ \t]+\n/g, m => m.endsWith('  \n') ? m : '\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

const EXPORT_CSS = `body{font:16px/1.65 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1d2026;background:#fff;margin:0}article{max-width:760px;margin:40px auto;padding:0 24px}h1{font-size:2em;line-height:1.2;margin:.2em 0}.meta{color:#7a808a;font-size:13px;margin-bottom:2em}img{max-width:100%;border-radius:8px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #d6d6d0;padding:6px 10px}blockquote{border-left:3px solid #2f6fed;margin:1em 0;padding-left:1em;color:#4a5059}pre{background:#f6f6f3;padding:12px;border-radius:8px;white-space:pre-wrap}code{font-family:ui-monospace,Menlo,monospace}ul.checklist{list-style:none;padding-left:.2em}ul.checklist li::before{content:"☐ ";}ul.checklist li[data-checked=true]::before{content:"☑ ";}ul.checklist li[data-checked=true]{color:#7a808a;text-decoration:line-through}a.attachment{display:inline-block;padding:6px 10px;border:1px solid #ddd;border-radius:8px;text-decoration:none}.tags span{display:inline-block;background:#eee;border-radius:99px;padding:1px 8px;margin-right:4px;font-size:12px}@media print{article{margin:0}}`;
function standaloneHTML(n, html) {
  const nb = nbById(n.notebookId);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(n.title || 'Untitled')}</title><style>${EXPORT_CSS}</style></head><body><article><h1>${esc(n.title || 'Untitled')}</h1><div class="meta">${esc(nb?.name || '')} · Updated ${esc(fullDate(n.updatedAt))}${n.tags.length ? ' · <span class="tags">' + n.tags.map(t => `<span>${esc(t)}</span>`).join('') + '</span>' : ''}</div>${html}</article></body></html>`;
}

// ============================================================
// Crypto (AES-GCM 256, PBKDF2-SHA256)
// ============================================================
const TE = new TextEncoder(), TD = new TextDecoder();
function b64(buf) { const bytes = new Uint8Array(buf); let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); }
function unb64(s) { const bin = atob(s); const a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return a; }
async function deriveKey(pw, salt) {
  const base = await crypto.subtle.importKey('raw', TE.encode(pw), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 250000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function encWithKey(str, key, saltB64) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, TE.encode(str));
  return { salt: saltB64, iv: b64(iv), data: b64(ct) };
}
async function decWithPassword(o, pw) {
  const key = await deriveKey(pw, unb64(o.salt));
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(o.iv) }, key, unb64(o.data));
  return { html: TD.decode(pt), key };
}

// ============================================================
// Seed data
// ============================================================
function seed() {
  const nb = (name, stack = '') => { const b = { id: uid(), name, stack, createdAt: now() }; S.notebooks.push(b); return b; };
  const inbox = nb('Inbox'), projects = nb('Projects', 'Work'), meetings = nb('Meetings', 'Work'), personal = nb('Personal', 'Life'), travel = nb('Travel', 'Life');
  S.settings.defaultNotebook = inbox.id;
  const ids = { welcome: uid(), roadmap: uid(), sync: uid(), reading: uid(), trip: uid(), ideas: uid() };
  const t = now();
  const tomorrow9 = addDays(new Date(), 1); tomorrow9.setHours(9, 0, 0, 0);
  const add = (o) => { const n = makeNote(o); n.text = htmlText(n.html); S.notes.push(n); return n; };

  add({ id: ids.welcome, title: 'Welcome to Inkwell ✦', notebookId: inbox.id, tags: ['getting-started'], pinned: true, shortcut: true, createdAt: t - 60e3, updatedAt: t - 60e3, html:
`<p>Inkwell is your workspace for notes, tasks and ideas. <b>Every Professional feature is unlocked</b> — unlimited notebooks, uploads, devices of your own, version history, encryption and more. No limits, no upgrade prompts.</p>
<h2>Get started</h2>
<ul class="checklist"><li data-checked="true">Open this welcome note</li><li data-checked="false">Create a note with <b>${ALT} + N</b> or the <b>New</b> button</li><li data-checked="false">Press <b>${MOD} + K</b> to open the command palette</li><li data-checked="false">Type <code>[[</code> to link to another note, like the <a class="note-link" data-note="${ids.roadmap}" href="#note-${ids.roadmap}">Q4 Product Roadmap</a></li><li data-checked="false">Lock a note with a password using the 🔒 button</li><li data-checked="false">Record audio, draw a sketch or attach files from the toolbar</li></ul>
<h2>Markdown shortcuts</h2>
<table><tbody><tr><td>Type</td><td>To get</td></tr><tr><td><code># </code> <code>## </code> <code>### </code></td><td>Headings</td></tr><tr><td><code>- </code> or <code>1. </code></td><td>Bulleted or numbered list</td></tr><tr><td><code>[] </code></td><td>Checklist</td></tr><tr><td><code>&gt; </code></td><td>Quote</td></tr><tr><td><code>\`\`\` </code></td><td>Code block</td></tr></tbody></table>
<blockquote>Search like a pro: <code>tag:work</code>, <code>notebook:travel</code>, <code>is:todo</code>, <code>has:image</code>, <code>created:week</code>, <code>-tag:archive</code>, <code>"exact phrase"</code>.</blockquote>
<hr>
<h2>Presentation mode</h2>
<p>Horizontal rules split a note into slides. Choose <b>Present</b> from the ••• menu to try it — use the arrow keys to move between slides.</p>
<hr>
<h2>Your data</h2>
<p>Everything is stored privately on this device and works offline. Export a full backup any time from <b>Settings</b>.</p>` });

  add({ id: ids.roadmap, title: 'Q4 Product Roadmap', notebookId: projects.id, tags: ['work', 'planning'], shortcut: true, createdAt: t - 3 * DAY, updatedAt: t - 2 * 3600e3, html:
`<p>Goal: ship the redesigned onboarding and cut time-to-first-note in half.</p>
<h2>Milestones</h2>
<table><tbody><tr><td>Milestone</td><td>Owner</td><td>Target</td><td>Status</td></tr><tr><td>Research &amp; interviews</td><td>Maya</td><td>Oct 4</td><td>✅ Done</td></tr><tr><td>Prototype v2</td><td>Leo</td><td>Oct 25</td><td>🟡 In progress</td></tr><tr><td>Beta rollout</td><td>Sam</td><td>Nov 15</td><td>⚪ Not started</td></tr><tr><td>General availability</td><td>Team</td><td>Dec 6</td><td>⚪ Not started</td></tr></tbody></table>
<h2>Open questions</h2>
<ul class="checklist"><li data-checked="true">Confirm analytics events</li><li data-checked="false">Decide on template defaults</li><li data-checked="false">Accessibility audit for the editor</li></ul>
<h3>Notes</h3>
<p>See the <a class="note-link" data-note="${ids.sync}" href="#note-${ids.sync}">Weekly team sync</a> for decisions.</p>` });

  add({ id: ids.sync, title: 'Weekly team sync', notebookId: meetings.id, tags: ['work', 'meeting'], createdAt: t - 2 * DAY, updatedAt: t - 26 * 3600e3, reminder: { at: tomorrow9.getTime(), done: false, notified: false }, html:
`<p><b>Attendees:</b> Maya, Leo, Sam, Priya</p>
<h2>Agenda</h2>
<ol><li>Roadmap check-in</li><li>Beta feedback</li><li>Hiring update</li></ol>
<h2>Decisions</h2>
<ul><li>Move beta to Nov 15 to include template gallery</li><li>Weekly demo on Fridays</li></ul>
<h2>Action items</h2>
<ul class="checklist"><li data-checked="false">Leo — share prototype link</li><li data-checked="false">Priya — draft release notes</li><li data-checked="true">Sam — book usability sessions</li></ul>` });

  add({ id: ids.reading, title: 'Reading list', notebookId: personal.id, tags: ['books'], createdAt: t - 9 * DAY, updatedAt: t - 5 * DAY, html:
`<ul class="checklist"><li data-checked="true">The Pragmatic Programmer</li><li data-checked="false">Thinking, Fast and Slow</li><li data-checked="false">A Pattern Language</li><li data-checked="false">The Design of Everyday Things</li></ul>
<blockquote>“The palest ink is better than the best memory.”</blockquote>` });

  add({ id: ids.trip, title: 'Trip to Lisbon', notebookId: travel.id, tags: ['travel'], createdAt: t - 6 * DAY, updatedAt: t - 4 * DAY, html:
`<h2>Itinerary</h2>
<ul><li><b>Day 1</b> — Alfama walk, Miradouro de Santa Luzia</li><li><b>Day 2</b> — Belém, LX Factory</li><li><b>Day 3</b> — Day trip to Sintra</li></ul>
<h2>Packing</h2>
<ul class="checklist"><li data-checked="false">Passport</li><li data-checked="false">Walking shoes</li><li data-checked="false">Power adapter</li></ul>` });

  add({ id: ids.ideas, title: 'Side-project ideas', notebookId: inbox.id, tags: ['ideas'], createdAt: t - 12 * DAY, updatedAt: t - 10 * DAY, html:
`<ul><li>Habit tracker that lives in your notes</li><li>Recipe scaler with unit conversion</li><li>Bookmarklet to clip quotes</li></ul>
<pre>// prototype idea
const scale = (qty, factor) =&gt; qty * factor;</pre>` });

  const task = (title, due, priority, noteId, done = false) => S.tasks.push({ id: uid(), title, due: due == null ? null : ymd(addDays(new Date(), due)), priority, noteId: noteId || null, done, createdAt: now(), doneAt: done ? now() : null });
  task('Review roadmap draft', 0, 'high', ids.roadmap);
  task('Send sync agenda', 1, 'med', ids.sync);
  task('Book flights to Lisbon', 3, 'med', ids.trip);
  task('Renew passport', -1, 'high', ids.trip);
  task('Try the command palette', null, null, ids.welcome);
  task('Set up Inkwell', null, 'low', null, true);
  S.scratch = 'Quick thoughts go here — they save automatically.';
}

// ============================================================
// Templates
// ============================================================
const BUILTIN_TEMPLATES = [
  { id: 'b-meeting', name: 'Meeting notes', desc: 'Agenda, decisions and action items', title: 'Meeting — {{date}}', html: '<p><b>Date:</b> {{date}}<br><b>Attendees:</b> </p><h2>Agenda</h2><ol><li><br></li></ol><h2>Notes</h2><p><br></p><h2>Decisions</h2><ul><li><br></li></ul><h2>Action items</h2><ul class="checklist"><li data-checked="false"><br></li></ul>' },
  { id: 'b-project', name: 'Project plan', desc: 'Goals, milestones and risks', title: 'Project plan', html: '<h2>Overview</h2><p>What are we building and why?</p><h2>Goals</h2><ul><li><br></li></ul><h2>Milestones</h2><table><tbody><tr><td>Milestone</td><td>Owner</td><td>Due</td><td>Status</td></tr><tr><td><br></td><td><br></td><td><br></td><td><br></td></tr><tr><td><br></td><td><br></td><td><br></td><td><br></td></tr></tbody></table><h2>Risks</h2><ul><li><br></li></ul><h2>Next steps</h2><ul class="checklist"><li data-checked="false"><br></li></ul>' },
  { id: 'b-journal', name: 'Daily journal', desc: 'Gratitude, focus and reflection', title: 'Journal — {{date}}', html: '<h2>☀️ Morning</h2><p><b>I’m grateful for…</b></p><ul><li><br></li></ul><p><b>Today’s focus</b></p><ul class="checklist"><li data-checked="false"><br></li></ul><h2>🌙 Evening</h2><p><b>What went well?</b></p><p><br></p><p><b>What could be better?</b></p><p><br></p>' },
  { id: 'b-weekly', name: 'Weekly planner', desc: 'Plan your week at a glance', title: 'Week of {{date}}', html: '<h2>Top priorities</h2><ol><li><br></li><li><br></li><li><br></li></ol><table><tbody><tr><td>Day</td><td>Focus</td><td>Notes</td></tr><tr><td>Monday</td><td><br></td><td><br></td></tr><tr><td>Tuesday</td><td><br></td><td><br></td></tr><tr><td>Wednesday</td><td><br></td><td><br></td></tr><tr><td>Thursday</td><td><br></td><td><br></td></tr><tr><td>Friday</td><td><br></td><td><br></td></tr><tr><td>Weekend</td><td><br></td><td><br></td></tr></tbody></table><h2>Habits</h2><ul class="checklist"><li data-checked="false">Exercise</li><li data-checked="false">Read 20 minutes</li><li data-checked="false">Inbox zero</li></ul>' },
  { id: 'b-todo', name: 'To-do list', desc: 'A simple prioritized checklist', title: 'To-do', html: '<h2>🔥 Must do</h2><ul class="checklist"><li data-checked="false"><br></li></ul><h2>Should do</h2><ul class="checklist"><li data-checked="false"><br></li></ul><h2>Could do</h2><ul class="checklist"><li data-checked="false"><br></li></ul>' },
  { id: 'b-lecture', name: 'Study notes', desc: 'Cornell-style lecture notes', title: 'Lecture — ', html: '<p><b>Course:</b> <br><b>Date:</b> {{date}}</p><h2>Key questions</h2><ul><li><br></li></ul><h2>Notes</h2><p><br></p><h2>Summary</h2><blockquote>Summarize the lecture in 2–3 sentences.</blockquote><h2>Review</h2><ul class="checklist"><li data-checked="false">Make flashcards</li><li data-checked="false">Do practice problems</li></ul>' },
  { id: 'b-recipe', name: 'Recipe', desc: 'Ingredients, steps and notes', title: 'Recipe — ', html: '<p><b>Serves:</b> 4 · <b>Prep:</b> 15 min · <b>Cook:</b> 30 min</p><h2>Ingredients</h2><ul class="checklist"><li data-checked="false"><br></li></ul><h2>Steps</h2><ol><li><br></li></ol><h2>Notes</h2><p><br></p>' },
  { id: 'b-brainstorm', name: 'Brainstorm', desc: 'Capture and sort ideas fast', title: 'Brainstorm: ', html: '<p><b>Problem:</b> </p><h2>Wild ideas</h2><ul><li><br></li></ul><h2>Promising</h2><ul><li><br></li></ul><h2>Next experiment</h2><ul class="checklist"><li data-checked="false"><br></li></ul>' },
  { id: 'b-book', name: 'Book notes', desc: 'Highlights and takeaways', title: 'Book: ', html: '<p><b>Author:</b> <br><b>Rating:</b> ★★★★☆</p><h2>Big ideas</h2><ol><li><br></li></ol><h2>Favorite quotes</h2><blockquote><br></blockquote><h2>How I’ll apply it</h2><ul class="checklist"><li data-checked="false"><br></li></ul>' },
];
const allTemplates = () => [...BUILTIN_TEMPLATES, ...S.templates];
const fillTpl = s => s.replace(/\{\{date\}\}/g, new Date().toLocaleDateString([], { dateStyle: 'medium' }));

// ============================================================
// Search
// ============================================================
function parseQuery(q) {
  const f = { words: [], tags: [], notTags: [], notebooks: [], is: [], has: [], created: null, updated: null, intitle: [] };
  const tokens = (q || '').match(/-?\w+:"[^"]*"|-?"[^"]+"|\S+/g) || [];
  for (let tok of tokens) {
    let neg = false;
    if (tok.startsWith('-') && tok.length > 1) { neg = true; tok = tok.slice(1); }
    const m = tok.match(/^(\w+):(.+)$/);
    if (m) {
      const k = m[1].toLowerCase(), v = m[2].replace(/^"|"$/g, '').toLowerCase();
      if (k === 'tag') (neg ? f.notTags : f.tags).push(v.replace(/^#/, ''));
      else if (k === 'notebook') f.notebooks.push(v);
      else if (k === 'is') f.is.push(v);
      else if (k === 'has') f.has.push(v);
      else if (k === 'created') f.created = v;
      else if (k === 'updated') f.updated = v;
      else if (k === 'intitle') f.intitle.push(v);
      else f.words.push({ w: tok.toLowerCase(), neg });
    } else {
      const w = tok.replace(/^"|"$/g, '').toLowerCase();
      if (w) f.words.push({ w, neg });
    }
  }
  return f;
}
function sinceOf(v) {
  if (!v) return null;
  const d = new Date(); d.setHours(0, 0, 0, 0);
  if (v === 'today') return d.getTime();
  if (v === 'yesterday') return addDays(d, -1).getTime();
  if (v === 'week') return addDays(d, -7).getTime();
  if (v === 'month') return addDays(d, -30).getTime();
  if (v === 'year') return addDays(d, -365).getTime();
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return parseYmd(v).getTime();
  return null;
}
function matchNote(n, f) {
  const text = (n.title + ' ' + (n.text || '')).toLowerCase();
  for (const { w, neg } of f.words) if (text.includes(w) === neg) return false;
  for (const w of f.intitle) if (!n.title.toLowerCase().includes(w)) return false;
  const tags = n.tags.map(t => t.toLowerCase());
  for (const t of f.tags) if (!tags.some(x => x === t || (t.endsWith('*') && x.startsWith(t.slice(0, -1))))) return false;
  for (const t of f.notTags) if (tags.includes(t)) return false;
  if (f.notebooks.length) { const nb = (nbById(n.notebookId)?.name || '').toLowerCase(); if (!f.notebooks.some(x => nb.includes(x))) return false; }
  const h = n.html || '';
  for (const v of f.is) {
    if (v === 'pinned' && !n.pinned) return false;
    if ((v === 'shortcut' || v === 'starred') && !n.shortcut) return false;
    if ((v === 'locked' || v === 'encrypted') && !n.locked) return false;
    if (v === 'reminder' && !n.reminder) return false;
    if (v === 'todo' && !/data-checked="false"/.test(h)) return false;
    if (v === 'done' && !(/data-checked="true"/.test(h) && !/data-checked="false"/.test(h))) return false;
  }
  for (const v of f.has) {
    if (v === 'image' && !/<img(?![^>]*class="sketch")/.test(h)) return false;
    if (v === 'sketch' && !/class="sketch"/.test(h)) return false;
    if ((v === 'attachment' || v === 'file') && !/class="attachment"/.test(h)) return false;
    if (v === 'audio' && !/<audio/.test(h)) return false;
    if (v === 'table' && !/<table/.test(h)) return false;
    if (v === 'link' && !/<a [^>]*href="http/.test(h)) return false;
    if (v === 'code' && !/<pre/.test(h)) return false;
    if ((v === 'checklist' || v === 'todo') && !/class="checklist"/.test(h)) return false;
  }
  const c = sinceOf(f.created); if (c && n.createdAt < c) return false;
  const u = sinceOf(f.updated); if (u && n.updatedAt < u) return false;
  return true;
}
function searchNotes(q) {
  const f = parseQuery(q);
  const words = f.words.filter(x => !x.neg).map(x => x.w);
  return activeNotes().filter(n => matchNote(n, f)).map(n => {
    const title = n.title.toLowerCase(), text = (n.text || '').toLowerCase();
    let score = 0;
    for (const w of words) { if (title.includes(w)) score += 10; score += Math.min(5, text.split(w).length - 1); }
    return { n, score };
  }).sort((a, b) => b.score - a.score || b.n.updatedAt - a.n.updatedAt).map(x => x.n);
}
const queryWords = () => ui.view === 'search' ? parseQuery(ui.query).words.filter(x => !x.neg).map(x => x.w) : [];
function snippet(n, words = []) {
  if (n.locked) return '<span class="muted">🔒 Encrypted note</span>';
  const t = n.text || '';
  if (!t) return '<span class="muted">No additional text</span>';
  let start = 0;
  if (words.length) {
    const lt = t.toLowerCase(); let pos = -1;
    for (const w of words) { const p = lt.indexOf(w); if (p >= 0 && (pos < 0 || p < pos)) pos = p; }
    if (pos > 50) start = pos - 40;
  }
  let h = esc((start ? '…' : '') + t.slice(start, start + 220));
  const ws = words.filter(Boolean).map(w => escRe(esc(w)));
  if (ws.length) h = h.replace(new RegExp(ws.join('|'), 'gi'), m => `<mark>${m}</mark>`);
  return h;
}

// ============================================================
// Toasts, menus, modals
// ============================================================
function toast(msg, type = '', action) {
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.innerHTML = `${type === 'error' ? I('info', 'sm') : I('check', 'sm')}<span>${esc(msg)}</span>${action ? `<button>${esc(action.label)}</button>` : ''}`;
  if (action) el.querySelector('button').onclick = () => { action.onClick(); el.remove(); };
  $('#toasts').appendChild(el);
  setTimeout(() => { el.style.transition = 'opacity .25s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 260); }, action ? 6000 : 3200);
}

function closeMenu() { if (ui.menu) { ui.menu.remove(); ui.menu = null; } }
function showMenu(anchor, items, opts = {}) {
  closeMenu();
  const m = document.createElement('div');
  m.className = 'menu';
  m.setAttribute('role', 'menu');
  m.innerHTML = items.filter(Boolean).map((it, i) => it.sep ? '<div class="menu-sep"></div>'
    : it.header ? `<div class="menu-label">${esc(it.header)}</div>`
    : it.html ? `<div data-hi="${i}">${it.html}</div>`
    : `<button class="menu-item ${it.danger ? 'danger' : ''} ${it.checked ? 'checked' : ''}" data-i="${i}" role="menuitem">${it.icon ? I(it.icon, 'sm') : ''}<span class="grow">${esc(it.label)}</span>${it.kbd ? `<kbd>${esc(it.kbd)}</kbd>` : ''}</button>`).join('');
  const list = items.filter(Boolean);
  $('#menu-root').appendChild(m);
  ui.menu = m;
  const px = opts.x ?? innerWidth / 2 - 110, py = opts.y ?? innerHeight / 3;
  const r = anchor && anchor.getBoundingClientRect && anchor.isConnected ? anchor.getBoundingClientRect() : { left: px, right: px + (opts.align === 'right' ? 220 : 0), top: py, bottom: py };
  const mw = m.offsetWidth, mh = m.offsetHeight, vw = innerWidth, vh = innerHeight;
  let left = opts.align === 'right' ? r.right - mw : r.left;
  let top = r.bottom + 4;
  if (top + mh > vh - 8) top = Math.max(8, r.top - mh - 4);
  left = Math.max(8, Math.min(left, vw - mw - 8));
  m.style.left = left + 'px'; m.style.top = top + 'px';
  m.addEventListener('mousedown', e => { if (!e.target.closest('input')) e.preventDefault(); });
  m.addEventListener('click', e => {
    const hi = e.target.closest('[data-hi]');
    if (hi) { const it = list[+hi.dataset.hi]; if (it.onClick && it.onClick(e) !== false) closeMenu(); return; }
    const b = e.target.closest('[data-i]'); if (!b) return;
    const it = list[+b.dataset.i]; closeMenu(); it.onClick && it.onClick();
  });
  return m;
}

function openModal({ title, body, foot, cls = '', onClose }) {
  closeMenu();
  const ov = $('#overlay');
  if (!ov.hidden && ui.modalClose) { const f = ui.modalClose; ui.modalClose = null; f(); }
  ov.hidden = false;
  ov.innerHTML = `<div class="modal ${cls}" role="dialog" aria-modal="true">${title != null ? `<div class="modal-head"><h2>${title}</h2><button class="icon-btn" data-close aria-label="Close">${I('x')}</button></div>` : ''}<div class="modal-body">${body}</div>${foot ? `<div class="modal-foot">${foot}</div>` : ''}</div>`;
  const m = ov.firstElementChild;
  ui.modalClose = onClose || null;
  ov.onmousedown = e => { if (e.target === ov) closeModal(); };
  $$('[data-close]', m).forEach(b => b.addEventListener('click', () => closeModal()));
  return m;
}
function closeModal() {
  const ov = $('#overlay');
  if (ov.hidden) return;
  ov.hidden = true; ov.innerHTML = '';
  const f = ui.modalClose; ui.modalClose = null; f && f();
}
function askText({ title, label = '', value = '', placeholder = '', ok = 'Save', type = 'text', hint = '' }) {
  return new Promise(res => {
    let done = false;
    const m = openModal({
      title: esc(title),
      body: `<form><label class="field"><span>${esc(label)}</span><input class="input" name="v" type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}" autocomplete="off"></label>${hint ? `<p class="muted" style="margin:-6px 0 0;font-size:12.5px">${hint}</p>` : ''}</form>`,
      foot: `<button class="btn" data-close>Cancel</button><button class="btn primary" data-ok>${esc(ok)}</button>`,
      onClose: () => { if (!done) res(null); }
    });
    const inp = $('input', m);
    setTimeout(() => { inp.focus(); if (type === 'text') inp.select(); }, 30);
    const submit = () => { done = true; const v = inp.value; closeModal(); res(v); };
    $('form', m).onsubmit = e => { e.preventDefault(); submit(); };
    $('[data-ok]', m).onclick = submit;
  });
}
function askConfirm({ title, message, ok = 'Confirm', danger = false }) {
  return new Promise(res => {
    let done = false;
    const m = openModal({
      title: esc(title), body: `<p style="margin:0;color:var(--text-2)">${message}</p>`,
      foot: `<button class="btn" data-close>Cancel</button><button class="btn ${danger ? 'danger solid' : 'primary'}" data-ok>${esc(ok)}</button>`,
      onClose: () => { if (!done) res(false); }
    });
    const b = $('[data-ok]', m); setTimeout(() => b.focus(), 30);
    b.onclick = () => { done = true; closeModal(); res(true); };
  });
}
function pickNote({ title = 'Link to note', exclude = null } = {}) {
  return new Promise(res => {
    let done = false;
    const m = openModal({
      title: esc(title), cls: 'palette',
      body: `<div class="p-input" style="margin:-8px -18px 0">${I('search')}<input placeholder="Search notes…" autocomplete="off"></div><div class="p-results" style="margin:0 -12px"></div>`,
      onClose: () => { if (!done) res(null); }
    });
    const inp = $('input', m), out = $('.p-results', m);
    let sel = 0, items = [];
    const draw = () => {
      const q = inp.value.trim().toLowerCase();
      items = activeNotes().filter(n => n.id !== exclude && (!q || n.title.toLowerCase().includes(q) || (n.text || '').toLowerCase().includes(q))).sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 40);
      sel = Math.min(sel, Math.max(0, items.length - 1));
      out.innerHTML = items.length ? items.map((n, i) => `<button class="menu-item ${i === sel ? 'sel' : ''}" data-id="${n.id}">${I(n.locked ? 'lock' : 'note', 'sm')}<span class="grow">${esc(n.title || 'Untitled')}</span><small class="muted">${esc(nbById(n.notebookId)?.name || '')}</small></button>`).join('') : '<div class="empty">No matching notes</div>';
    };
    const choose = id => { done = true; closeModal(); res(id); };
    inp.addEventListener('input', () => { sel = 0; draw(); });
    inp.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { sel = Math.min(items.length - 1, sel + 1); draw(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); draw(); e.preventDefault(); }
      else if (e.key === 'Enter' && items[sel]) { choose(items[sel].id); e.preventDefault(); }
    });
    out.addEventListener('click', e => { const b = e.target.closest('[data-id]'); if (b) choose(b.dataset.id); });
    draw(); setTimeout(() => inp.focus(), 30);
  });
}

// ============================================================
// Download / clipboard helpers
// ============================================================
function download(name, content, type = 'text/plain') {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
async function copyText(text, html) {
  try {
    if (html && window.ClipboardItem) {
      await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([text], { type: 'text/plain' }) })]);
    } else await navigator.clipboard.writeText(text);
    toast('Copied to clipboard');
  } catch { toast('Clipboard access was blocked by the browser', 'error'); }
}
function readFileURL(f) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(f); }); }
function loadImg(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }); }
async function imageURL(f) {
  const url = await readFileURL(f);
  if (/gif|svg/.test(f.type)) return url;
  try {
    const img = await loadImg(url);
    const max = 1800;
    if (img.width <= max && f.size < 900e3) return url;
    const s = Math.min(1, max / img.width);
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL(f.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.88);
  } catch { return url; }
}

// ============================================================
// Theme / settings
// ============================================================
function applySettings() {
  const s = S.settings, root = document.documentElement;
  if (s.theme === 'system') root.removeAttribute('data-theme'); else root.dataset.theme = s.theme;
  root.style.setProperty('--accent', s.accent);
  root.style.setProperty('--editor-size', s.fontSize + 'px');
}
const effectiveDark = () => S.settings.theme === 'dark' || (S.settings.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);

// ============================================================
// Sidebar
// ============================================================
function buildSidebarShell() {
  $('#sidebar').innerHTML = `
    <div class="account" data-act="nav" data-view="settings" title="Account & settings"></div>
    <div class="new-row">
      <button class="btn-new" data-act="new-note">${I('plus')}New note</button>
      <button class="btn-new-more" data-act="new-menu" aria-label="More new options">${I('chevD', 'sm')}</button>
    </div>
    <div class="side-search">${I('search', 'sm')}<input id="side-search" type="search" placeholder="Search notes" autocomplete="off" aria-label="Search notes"><kbd>/</kbd></div>
    <nav class="nav" id="nav"></nav>
    <div class="side-foot">
      <button class="nav-item" data-act="nav" data-view="settings">${I('settings')}<span class="label">Settings</span></button>
      <span class="sync saved" id="sync" title="All changes are saved on this device"><span class="dot"></span><span>Saved</span></span>
      <button class="icon-btn-side" data-act="theme-toggle" id="theme-btn" aria-label="Toggle dark mode"></button>
    </div>`;
  const inp = $('#side-search');
  const run = debounce(() => {
    const q = inp.value.trim();
    if (q) { ui.query = q; ui.view = 'search'; ui.mobileEditor = false; render(); }
    else if (ui.view === 'search') { ui.query = ''; ui.view = 'notes'; render(); }
  }, 180);
  inp.addEventListener('input', run);
  inp.addEventListener('keydown', e => {
    if (e.key === 'Escape') { inp.value = ''; run(); inp.blur(); }
    if (e.key === 'Enter') { e.preventDefault(); const q = inp.value.trim(); if (q) { ui.query = q; ui.view = 'search'; render(); if (isMobile()) closeSidebar(); } }
  });
}
function renderSidebar() {
  const name = S.settings.name || 'You';
  const initials = name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'Y';
  $('.account', $('#sidebar')).innerHTML = `<div class="avatar">${esc(initials)}</div><div class="who"><b>${esc(name)}</b><span class="plan-badge">${I('crown', 'xs')}Professional</span></div>`;
  $('#theme-btn').innerHTML = I(effectiveDark() ? 'sun' : 'moon');
  const act = (v, extra = true) => ui.view === v && extra ? 'active' : '';
  const shortcuts = activeNotes().filter(n => n.shortcut).sort((a, b) => a.title.localeCompare(b.title));
  const nav = (view, icon, label, count) => `<button class="nav-item ${act(view)}" data-act="nav" data-view="${view}">${I(icon)}<span class="label">${label}</span>${count != null ? `<span class="count">${count}</span>` : ''}</button>`;
  const caret = (key) => `<span class="caret ${ui.expanded[key] ? 'open' : ''}" data-act="toggle-expand" data-key="${key}">${I('chevR', 'xs')}</span>`;

  let h = nav('home', 'home', 'Home');
  h += `<button class="nav-item ${act('shortcuts')}" data-act="nav" data-view="shortcuts">${I('star')}<span class="label">Shortcuts</span>${shortcuts.length ? caret('shortcuts') : ''}</button>`;
  if (ui.expanded.shortcuts && shortcuts.length) h += `<div class="nav-sub">${shortcuts.map(n => `<button class="nav-item ${ui.noteId === n.id && LIST_VIEWS.includes(ui.view) ? 'active' : ''}" data-act="open-note" data-id="${n.id}">${I(n.locked ? 'lock' : 'note', 'sm')}<span class="label">${esc(n.title || 'Untitled')}</span></button>`).join('')}</div>`;
  h += nav('notes', 'note', 'Notes', activeNotes().length);
  h += nav('tasks', 'task', 'Tasks', S.tasks.filter(t => !t.done).length || null);
  h += nav('calendar', 'calendar', 'Calendar');
  h += `<button class="nav-item ${act('notebooks')}" data-act="nav" data-view="notebooks">${I('book')}<span class="label">Notebooks</span>${caret('notebooks')}</button>`;
  if (ui.expanded.notebooks) {
    const groups = groupStacks();
    h += '<div class="nav-sub">';
    for (const [stack, nbs] of groups) {
      if (stack) h += `<button class="nav-item ${ui.view === 'stack' && ui.stack === stack ? 'active' : ''}" data-act="open-stack" data-stack="${esc(stack)}">${I('stack', 'sm')}<span class="label">${esc(stack)}</span></button><div class="nav-sub" style="padding-left:14px">`;
      h += nbs.map(b => `<button class="nav-item ${ui.view === 'notebook' && ui.notebookId === b.id ? 'active' : ''}" data-act="open-notebook" data-id="${b.id}">${I('book', 'sm')}<span class="label">${esc(b.name)}</span><span class="count">${activeNotes().filter(n => n.notebookId === b.id).length}</span></button>`).join('');
      if (stack) h += '</div>';
    }
    h += '</div>';
  }
  const tags = allTags();
  h += `<button class="nav-item ${act('tags')}" data-act="nav" data-view="tags">${I('tag')}<span class="label">Tags</span>${tags.length ? caret('tags') : ''}</button>`;
  if (ui.expanded.tags && tags.length) h += `<div class="nav-sub">${tags.map(([t, c]) => `<button class="nav-item ${ui.view === 'tag' && ui.tag === t ? 'active' : ''}" data-act="open-tag" data-tag="${esc(t)}"><span style="width:15px;text-align:center;color:var(--side-muted)">#</span><span class="label">${esc(t)}</span><span class="count">${c}</span></button>`).join('')}</div>`;
  h += nav('templates', 'template', 'Templates');
  if (S.savedSearches.length) {
    h += `<div class="nav-heading">Saved searches</div>`;
    h += S.savedSearches.map(s => `<button class="nav-item ${ui.view === 'search' && ui.query === s.query ? 'active' : ''}" data-act="open-saved" data-id="${s.id}">${I('bookmark', 'sm')}<span class="label">${esc(s.name || s.query)}</span></button>`).join('');
  }
  h += '<div class="nav-sep"></div>';
  h += nav('trash', 'trash', 'Trash', S.notes.filter(n => n.trashed).length || null);
  $('#nav').innerHTML = h;
}
function groupStacks() {
  const map = new Map([['', []]]);
  [...S.notebooks].sort((a, b) => a.name.localeCompare(b.name)).forEach(b => { const k = b.stack || ''; if (!map.has(k)) map.set(k, []); map.get(k).push(b); });
  const none = map.get(''); map.delete('');
  const sorted = [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  return [...sorted, ['', none]].filter(([, v]) => v.length);
}
function openSidebar() { $('#app').classList.add('sidebar-open'); }
function closeSidebar() { $('#app').classList.remove('sidebar-open'); }

// ============================================================
// Main render
// ============================================================
function render(force = false) {
  const app = $('#app');
  const split = LIST_VIEWS.includes(ui.view);
  app.classList.toggle('layout-page', !split);
  app.classList.toggle('focus', ui.focus && split);
  renderSidebar();
  if (split) {
    renderList();
    app.classList.toggle('show-editor', ui.mobileEditor && !!ui.noteId);
    renderEditor(force);
  } else {
    app.classList.remove('show-editor');
    ui.editorFor = null;
    $('#editor').innerHTML = '';
    renderPage();
  }
}

// ============================================================
// Notes list
// ============================================================
function listNotes() {
  let arr;
  switch (ui.view) {
    case 'notes': arr = activeNotes(); break;
    case 'shortcuts': arr = activeNotes().filter(n => n.shortcut); break;
    case 'notebook': arr = activeNotes().filter(n => n.notebookId === ui.notebookId); break;
    case 'stack': { const ids = S.notebooks.filter(b => b.stack === ui.stack).map(b => b.id); arr = activeNotes().filter(n => ids.includes(n.notebookId)); break; }
    case 'tag': arr = activeNotes().filter(n => n.tags.includes(ui.tag)); break;
    case 'search': return applyTagFilter(searchNotes(ui.query));
    case 'trash': return S.notes.filter(n => n.trashed).sort((a, b) => (b.trashedAt || 0) - (a.trashedAt || 0));
    default: arr = [];
  }
  arr = applyTagFilter(arr);
  const s = S.settings.sort;
  const cmp = s === 'title' ? (a, b) => (a.title || 'Untitled').localeCompare(b.title || 'Untitled')
    : s === 'created' ? (a, b) => b.createdAt - a.createdAt
    : s === 'created-asc' ? (a, b) => a.createdAt - b.createdAt
    : (a, b) => b.updatedAt - a.updatedAt;
  return arr.sort((a, b) => (b.pinned - a.pinned) || cmp(a, b));
}
const applyTagFilter = arr => ui.tagFilter ? arr.filter(n => n.tags.includes(ui.tagFilter)) : arr;

function listHeader(count) {
  let icon = 'note', title = 'Notes', actions = '';
  const newBtn = `<button class="icon-btn" data-act="new-note" title="New note (${ALT}+N)">${I('plus')}</button>`;
  switch (ui.view) {
    case 'notes': actions = newBtn; break;
    case 'shortcuts': icon = 'star'; title = 'Shortcuts'; break;
    case 'notebook': { const b = nbById(ui.notebookId); icon = 'book'; title = esc(b?.name || 'Notebook'); actions = newBtn + `<button class="icon-btn" data-act="nb-menu" data-id="${ui.notebookId}" title="Notebook options">${I('more')}</button>`; break; }
    case 'stack': icon = 'stack'; title = esc(ui.stack); actions = `<button class="icon-btn" data-act="stack-menu" title="Stack options">${I('more')}</button>`; break;
    case 'tag': icon = 'tag'; title = '#' + esc(ui.tag); actions = newBtn + `<button class="icon-btn" data-act="tag-menu" data-tag="${esc(ui.tag)}" title="Tag options">${I('more')}</button>`; break;
    case 'search': icon = 'search'; title = 'Search'; actions = `<button class="icon-btn" data-act="save-search" title="Save this search">${I('bookmark')}</button>`; break;
    case 'trash': icon = 'trash'; title = 'Trash'; actions = count ? `<button class="btn sm danger" data-act="empty-trash">Empty</button>` : ''; break;
  }
  const layout = S.settings.listLayout;
  const sortLabel = { updated: 'Last edited', created: 'Newest', 'created-asc': 'Oldest', title: 'Title' }[S.settings.sort];
  return `<div class="list-head">
    <div class="row"><button class="icon-btn mobile-only" data-act="open-sidebar" aria-label="Menu">${I('menu')}</button><h2>${I(icon)}<span>${title}</span></h2>${actions}</div>
    ${ui.view === 'search' ? `<div class="sub">Results for <b>“${esc(ui.query)}”</b></div>` : ''}
    <div class="row sub"><span style="flex:1">${plural(count, 'note')}</span>
      ${ui.view !== 'trash' ? `<button class="icon-btn" data-act="filter-menu" title="Filter by tag" style="width:28px;height:28px">${I('filter', 'sm')}</button>
      ${ui.view !== 'search' ? `<button class="icon-btn" data-act="sort-menu" title="Sort: ${sortLabel}" style="width:28px;height:28px">${I('sort', 'sm')}</button>` : ''}
      <button class="icon-btn" data-act="layout-menu" title="View" style="width:28px;height:28px">${I(layout === 'cards' ? 'grid' : layout === 'compact' ? 'list' : 'rows', 'sm')}</button>` : '<span class="muted">Notes in Trash are kept until you empty it</span>'}
    </div>
    ${ui.tagFilter ? `<div class="sub"><span class="chip accent">#${esc(ui.tagFilter)}<button data-act="clear-filter" aria-label="Clear filter">${I('x', 'xs')}</button></span></div>` : ''}
    ${ui.view === 'search' ? `<div class="search-help">${['tag:', 'notebook:', 'is:todo', 'is:pinned', 'has:image', 'has:attachment', 'created:week', 'intitle:'].map(o => `<button data-act="search-op" data-op="${o}">${o}</button>`).join('')}</div>` : ''}
  </div>`;
}
function renderList(keep = false) {
  const notes = listNotes();
  if (!keep && (!isMobile() || !ui.mobileEditor)) {
    if (!notes.some(n => n.id === ui.noteId)) ui.noteId = notes[0]?.id || null;
  }
  const words = queryWords();
  const el = $('#list');
  el.className = 'list ' + (S.settings.listLayout || 'snippet');
  const items = notes.map(n => {
    const thumb = !n.locked && S.settings.listLayout !== 'compact' ? firstImage(n.html) : null;
    const nb = nbById(n.notebookId);
    const showNb = !['notebook'].includes(ui.view);
    return `<div class="note-item ${n.id === ui.noteId ? 'active' : ''}" data-act="open-note" data-id="${n.id}" tabindex="0">
      <div class="ni-body">
        <div class="ni-title">${n.pinned && ui.view !== 'trash' ? I('pin', 'xs') : ''}${n.locked ? I('lock', 'xs') : ''}<span>${esc(n.title || 'Untitled')}</span></div>
        <div class="ni-snippet">${snippet(n, words)}</div>
        <div class="ni-meta"><span>${rel(ui.view === 'trash' ? (n.trashedAt || n.updatedAt) : S.settings.sort.startsWith('created') ? n.createdAt : n.updatedAt)}</span>${showNb && nb ? `<span>· ${esc(nb.name)}</span>` : ''}${n.reminder && !n.reminder.done ? I('bell', 'xs') : ''}${n.tags.slice(0, 3).map(t => `<span class="chip">${esc(t)}</span>`).join('')}</div>
      </div>
      ${thumb ? `<img class="ni-thumb" src="${esc(thumb)}" alt="">` : ''}
    </div>`;
  }).join('');
  const empty = ui.view === 'trash' ? emptyState('trash', 'Trash is empty', 'Deleted notes appear here.')
    : ui.view === 'search' ? emptyState('search', 'No results', 'Try different words or remove a filter.')
    : ui.view === 'shortcuts' ? emptyState('star', 'No shortcuts yet', 'Star a note to keep it one click away.')
    : emptyState('note', 'No notes here', 'Create a note to get started.', '<button class="btn primary" data-act="new-note">' + I('plus', 'sm') + 'New note</button>');
  el.innerHTML = listHeader(notes.length) + `<div class="list-items">${items || empty}</div>`;
}
const emptyState = (icon, title, text, extra = '') => `<div class="empty"><div class="big">${I(icon)}</div><h3>${title}</h3><div>${text}</div>${extra}</div>`;
const refreshList = debounce(() => { if (LIST_VIEWS.includes(ui.view)) { const sc = $('.list-items')?.scrollTop; renderList(true); const li = $('.list-items'); if (li && sc) li.scrollTop = sc; } }, 300);

// ============================================================
// Editor
// ============================================================
const BLOCK_LABELS = { p: 'Normal text', h1: 'Heading 1', h2: 'Heading 2', h3: 'Heading 3', pre: 'Code block', blockquote: 'Quote', div: 'Normal text' };
function toolbarHTML() {
  const b = (cmd, icon, title) => `<button class="tb" data-cmd="${cmd}" title="${title}" aria-label="${title}">${I(icon)}</button>`;
  return `<div class="toolbar" role="toolbar">
    ${b('undo', 'undo', `Undo (${MOD}+Z)`)}${b('redo', 'redo', `Redo (${MOD}+Shift+Z)`)}<span class="vsep"></span>
    <button class="tb wide" data-cmd="block" title="Text style"><span id="tb-block">Normal text</span>${I('chevD', 'xs')}</button><span class="vsep"></span>
    ${b('bold', 'bold', `Bold (${MOD}+B)`)}${b('italic', 'italic', `Italic (${MOD}+I)`)}${b('underline', 'underline', `Underline (${MOD}+U)`)}${b('strike', 'strike', 'Strikethrough')}
    <button class="tb color" data-cmd="color" title="Text color">${I('color')}<span class="sw" style="background:#e03131"></span></button>
    <button class="tb color" data-cmd="hilite" title="Highlight">${I('hilite')}<span class="sw" style="background:#ffd43b"></span></button>
    ${b('inlinecode', 'code', 'Inline code')}${b('clear', 'clear', 'Clear formatting')}<span class="vsep"></span>
    ${b('ul', 'list', 'Bulleted list')}${b('ol', 'olist', 'Numbered list')}${b('check', 'checklist', `Checklist (${MOD}+Shift+L)`)}${b('outdent', 'outdent', 'Decrease indent')}${b('indent', 'indent', 'Increase indent')}<span class="vsep"></span>
    ${b('quote', 'quote', 'Quote')}${b('codeblock', 'code', 'Code block')}${b('table', 'table', 'Insert table')}${b('hr', 'hr', 'Divider / slide break')}<span class="vsep"></span>
    ${b('link', 'link', `Link (${MOD}+Shift+K)`)}${b('notelink', 'notelink', 'Link to note ([[)')}${b('image', 'image', 'Insert image')}${b('attach', 'clip', 'Attach file')}${b('sketch', 'pen', 'Sketch')}${b('audio', 'mic', 'Record audio')}${b('date', 'clock', 'Insert date & time')}
  </div>`;
}
const body = () => $('#editor .content[contenteditable="true"]');

function renderEditor(force = false) {
  const ed = $('#editor');
  const n = cur();
  if (!n) {
    ui.editorFor = null;
    ed.innerHTML = `<div class="ed-top mobile-only" style="display:flex!important"><button class="icon-btn" data-act="ed-back">${I('chevL')}</button></div>` + emptyState('logo', 'Capture anything', `Select a note, or create a new one with <kbd>${ALT}</kbd> + <kbd>N</kbd>.`, '<button class="btn primary" data-act="new-note">' + I('plus', 'sm') + 'New note</button>').replace('class="empty"', 'class="empty" style="height:100%"');
    return;
  }
  if (!force && ui.editorFor === n.id && $('.ed-scroll', ed)) { refreshEdChrome(); return; }
  ui.editorFor = n.id;
  ui.range = null;
  ui.baseline = { id: n.id, title: n.title, html: n.html, updatedAt: n.updatedAt };
  const closed = n.locked && !ui.unlocked[n.id];
  const ro = n.trashed;
  const fontCls = S.settings.font === 'serif' ? 'serif' : S.settings.font === 'mono' ? 'mono' : '';
  ed.innerHTML = `<div class="ed-top"></div>${!closed && !ro ? toolbarHTML() : ''}
    <div class="ed-scroll"><div class="ed-inner">${closed ? lockPanel(n) : `
      <div class="ed-banners"></div>
      <input class="ed-title" placeholder="Title" aria-label="Note title" ${ro ? 'readonly' : ''}>
      <div class="ed-tags"></div>
      <div class="content ${fontCls}" contenteditable="${!ro}" spellcheck="${S.settings.spellcheck}" data-placeholder="Start writing… Try # for a heading, [] for a checklist, or [[ to link a note." role="textbox" aria-multiline="true" aria-label="Note body"></div>
      <div class="ed-extra"></div>`}
    </div></div>
    <div class="ed-status"></div>`;
  if (!closed) {
    const c = $('.content', ed);
    c.innerHTML = noteHTML(n) || '<p><br></p>';
    markBrokenLinks(c); markEmpty(c);
    $('.ed-title', ed).value = n.title;
    bindEditor(ed, n);
  } else {
    const f = $('#unlock-form', ed);
    f.onsubmit = async e => {
      e.preventDefault();
      const pw = $('input', f).value;
      const btn = $('button', f); btn.disabled = true; btn.textContent = 'Unlocking…';
      try {
        const { html, key } = await decWithPassword(n.locked, pw);
        ui.unlocked[n.id] = { html, key, salt: n.locked.salt };
        renderEditor(true); renderList();
      } catch {
        btn.disabled = false; btn.textContent = 'Unlock';
        $('.lock-err', ed).hidden = false; $('input', f).select();
      }
    };
    setTimeout(() => $('input', f)?.focus(), 30);
  }
  refreshEdChrome();
}
function lockPanel(n) {
  return `<div class="lock-panel"><div class="big">${I('lock')}</div><h2 style="margin:0">${esc(n.title || 'Untitled')}</h2>
    <div class="muted">This note is encrypted with AES-256. Enter its password to view and edit it.</div>
    <form id="unlock-form"><input class="input" type="password" placeholder="Password" autocomplete="current-password" aria-label="Password"><button class="btn primary">Unlock</button></form>
    <div class="lock-err" style="color:var(--danger);font-size:13px" hidden>Incorrect password. Try again.</div>
    ${n.locked.hint ? `<div class="muted" style="font-size:12.5px">Hint: ${esc(n.locked.hint)}</div>` : ''}</div>`;
}
function markEmpty(c) { c.classList.toggle('is-empty', !c.textContent.trim() && !c.querySelector('img,audio,table,hr,a.attachment,ul,ol,pre,blockquote,h1,h2,h3')); }
function markBrokenLinks(c) { $$('a.note-link', c).forEach(a => { const t = noteById(a.dataset.note); a.classList.toggle('broken', !t || t.trashed); }); }

function refreshEdChrome() {
  const ed = $('#editor'), n = cur(); if (!n || !$('.ed-top', ed)) return;
  const nb = nbById(n.notebookId);
  const closed = n.locked && !ui.unlocked[n.id];
  const top = $('.ed-top', ed);
  if (n.trashed) {
    top.innerHTML = `<button class="icon-btn mobile-only" data-act="ed-back">${I('chevL')}</button><span class="nb-pick">${I('trash', 'sm')}<span>In Trash</span></span><span class="spacer"></span><button class="btn sm" data-act="restore-note">${I('undo', 'sm')}Restore</button><button class="btn sm danger" data-act="delete-forever">Delete forever</button>`;
  } else {
    top.innerHTML = `<button class="icon-btn mobile-only" data-act="ed-back" aria-label="Back">${I('chevL')}</button>
      <button class="nb-pick" data-act="ed-nb" title="Move to notebook">${I('book', 'sm')}<span>${esc(nb?.name || 'Notebook')}</span>${I('chevD', 'xs')}</button>
      <span class="spacer"></span>
      <button class="icon-btn ${n.reminder && !n.reminder.done ? 'on' : ''}" data-act="ed-reminder" title="Reminder">${I('bell')}</button>
      <button class="icon-btn ${n.shortcut ? 'on' : ''}" data-act="ed-shortcut" title="${n.shortcut ? 'Remove from shortcuts' : 'Add to shortcuts'}">${I('star')}</button>
      <button class="icon-btn ${n.pinned ? 'on' : ''} desktop-only" data-act="ed-pin" title="${n.pinned ? 'Unpin' : 'Pin to top'}">${I('pin')}</button>
      <button class="icon-btn ${n.locked ? 'on' : ''}" data-act="ed-lock" title="${n.locked ? 'Encrypted' : 'Encrypt note'}">${I(n.locked && !closed ? 'unlock' : 'lock')}</button>
      <span class="vsep desktop-only"></span>
      <button class="icon-btn desktop-only" data-act="ed-focus" title="Focus mode (${MOD}+.)">${I('focus')}</button>
      <button class="btn sm primary desktop-only" data-act="ed-share">${I('share', 'sm')}Share</button>
      <button class="icon-btn" data-act="ed-more" title="More actions">${I('more')}</button>`;
  }
  if (closed) { $('.ed-status', ed).innerHTML = `<span>${I('lock', 'xs')} Encrypted</span>`; return; }
  // banners
  let bn = '';
  if (n.trashed) bn += `<div class="banner danger">${I('trash')}<span class="grow">This note is in Trash and is read-only.</span></div>`;
  if (n.locked) bn += `<div class="banner">${I('shield')}<span class="grow">Encrypted note — unlocked for this session. Only the body is encrypted; the title stays visible.</span><button class="btn sm" data-act="lock-now">${I('lock', 'sm')}Lock now</button></div>`;
  if (n.reminder) {
    const r = n.reminder, due = r.at <= now() && !r.done;
    bn += `<div class="banner ${due ? 'warn' : ''}">${I('bell')}<span class="grow">${r.done ? '<s>' : ''}Reminder ${due ? 'was due' : 'set for'} <b>${esc(fullDate(r.at))}</b>${r.done ? '</s> · Done' : ''}</span>${!n.trashed ? `${!r.done ? `<button class="btn sm" data-act="rem-done">${I('check', 'sm')}Done</button>` : ''}<button class="icon-btn" data-act="rem-clear" title="Remove reminder">${I('x', 'sm')}</button>` : ''}</div>`;
  }
  const banners = $('.ed-banners', ed); if (banners) banners.innerHTML = bn;
  renderTags();
  renderExtra();
  updateStatus();
}
function renderTags() {
  const n = cur(), wrap = $('#editor .ed-tags'); if (!n || !wrap) return;
  wrap.innerHTML = `${I('tag', 'sm tag-ico')}${n.tags.map(t => `<span class="chip">${esc(t)}${!n.trashed ? `<button data-act="remove-tag" data-tag="${esc(t)}" aria-label="Remove tag ${esc(t)}">${I('x', 'xs')}</button>` : ''}</span>`).join('')}${!n.trashed ? '<input placeholder="Add tag…" aria-label="Add tag">' : ''}`;
  const inp = $('input', wrap); if (!inp) return;
  let sel = 0, navd = false;
  const box = () => $('.tag-suggest', wrap);
  const suggest = () => {
    box()?.remove();
    const q = inp.value.trim().toLowerCase().replace(/^#/, '');
    const opts = allTags().map(x => x[0]).filter(t => !n.tags.includes(t) && (!q || t.toLowerCase().includes(q))).slice(0, 8);
    if (!opts.length || document.activeElement !== inp) return;
    sel = Math.min(sel, opts.length - 1);
    const d = document.createElement('div'); d.className = 'tag-suggest';
    d.style.left = inp.offsetLeft + 'px';
    d.innerHTML = opts.map((t, i) => `<button data-t="${esc(t)}" class="${i === sel ? 'sel' : ''}">#${esc(t)}</button>`).join('');
    d.addEventListener('mousedown', e => { e.preventDefault(); const b = e.target.closest('[data-t]'); if (b) { addTag(b.dataset.t); } });
    wrap.appendChild(d);
  };
  const addTag = (raw) => {
    const t = String(raw).trim().replace(/^#+/, '').replace(/,/g, '').slice(0, 40);
    if (!t) return;
    const existing = allTags().map(x => x[0]).find(x => x.toLowerCase() === t.toLowerCase());
    const tag = existing || t;
    if (!n.tags.includes(tag)) { n.tags.push(tag); touch(n, false); }
    renderTags(); renderSidebar();
    $('#editor .ed-tags input')?.focus();
  };
  inp.addEventListener('keydown', e => {
    const sb = box();
    if (e.key === 'ArrowDown' && sb) { sel++; navd = true; suggest(); e.preventDefault(); return; }
    if (e.key === 'ArrowUp' && sb) { sel = Math.max(0, sel - 1); navd = true; suggest(); e.preventDefault(); return; }
    if (e.key === 'Enter' || e.key === ',' || (e.key === 'Tab' && inp.value.trim())) {
      e.preventDefault();
      const pick = sb && $('.sel', sb);
      addTag(pick && e.key !== ',' && (navd || !inp.value.trim()) ? pick.dataset.t : inp.value);
    } else if (e.key === 'Backspace' && !inp.value && n.tags.length) { n.tags.pop(); touch(n, false); renderTags(); renderSidebar(); $('#editor .ed-tags input')?.focus(); }
    else if (e.key === 'Escape') { inp.value = ''; box()?.remove(); }
  });
  inp.addEventListener('input', () => { sel = 0; navd = false; suggest(); });
  inp.addEventListener('focus', suggest);
  inp.addEventListener('blur', () => setTimeout(() => box()?.remove(), 120));
}
function renderExtra() {
  const n = cur(), el = $('#editor .ed-extra'); if (!n || !el) return;
  const tasks = S.tasks.filter(t => t.noteId === n.id).sort(taskSort);
  const backlinks = activeNotes().filter(m => m.id !== n.id && (m.html || '').includes(`data-note="${n.id}"`));
  el.innerHTML = `<div class="panel-box"><h4>${I('task', 'xs')}<span class="grow">Tasks in this note</span><span>${tasks.filter(t => t.done).length}/${tasks.length}</span></h4>
      ${tasks.map(t => taskRow(t, { showNote: false })).join('')}
      ${!n.trashed ? `<form class="task-add" data-form="note-task" style="margin-top:6px">${I('plus', 'sm')}<input type="text" name="title" placeholder="Add a task to this note…" aria-label="New task"><input type="date" name="due" aria-label="Due date"></form>` : ''}
    </div>
    ${backlinks.length ? `<div class="panel-box"><h4>${I('notelink', 'xs')}<span class="grow">Linked from</span><span>${backlinks.length}</span></h4>${backlinks.map(b => `<div class="backlink" data-act="open-note" data-id="${b.id}">${I('note', 'sm')}<span>${esc(b.title || 'Untitled')}</span></div>`).join('')}</div>` : ''}`;
}
function updateStatus() {
  const n = noteById(ui.editorFor), el = $('#editor .ed-status'); if (!n || !el) return;
  const c = $('#editor .content');
  const text = c ? c.innerText : '';
  const words = (text.match(/\S+/g) || []).length;
  el.innerHTML = `<span>${plural(words, 'word')}</span><span>${text.replace(/\s/g, '').length} characters</span><span class="grow"></span><span class="desktop-only">Created ${esc(rel(n.createdAt))}</span><span>Edited ${esc(rel(n.updatedAt))}</span>`;
}

function touch(n, versioned = true) {
  n.updatedAt = now();
  if (versioned) maybeVersion(n);
  persist();
  refreshList();
}
function maybeVersion(n) {
  if (n.locked) return;
  const b = ui.baseline;
  if (!b || b.id !== n.id) return;
  const last = n.versions[0];
  if (last && now() - (last.savedAt || last.at) < 5 * 60e3) return;
  if (b.html === n.html && b.title === n.title) return;
  n.versions.unshift({ at: b.updatedAt, savedAt: now(), title: b.title, html: b.html });
  n.versions = n.versions.slice(0, 50);
  ui.baseline = { id: n.id, title: n.title, html: n.html, updatedAt: n.updatedAt };
}
const encTimers = {};
function scheduleEncrypt(n) {
  clearTimeout(encTimers[n.id]);
  ui.dirty = true; setSync('saving');
  encTimers[n.id] = setTimeout(async () => {
    const u = ui.unlocked[n.id]; if (!u || !n.locked) return;
    const hint = n.locked.hint;
    n.locked = { ...(await encWithKey(u.html, u.key, u.salt)), hint };
    persist();
  }, 300);
}

function onBodyInput() {
  const n = noteById(ui.editorFor), c = body(); if (!n || !c || n.trashed) return;
  $$('ul.checklist > li:not([data-checked])', c).forEach(li => li.dataset.checked = 'false');
  if (!c.firstElementChild && c.textContent === '') c.innerHTML = '<p><br></p>';
  markEmpty(c);
  if (n.locked) {
    const u = ui.unlocked[n.id]; if (!u) return;
    u.html = c.innerHTML; scheduleEncrypt(n);
  } else {
    n.html = c.innerHTML;
    n.text = c.innerText.replace(/\s+/g, ' ').trim();
  }
  touch(n);
  updateStatus();
}

function bindEditor(ed, n) {
  const title = $('.ed-title', ed), c = $('.content', ed);
  title.addEventListener('input', () => { n.title = title.value; touch(n); });
  title.addEventListener('keydown', e => { if (e.key === 'Enter' || (e.key === 'ArrowDown' && title.selectionStart === title.value.length)) { e.preventDefault(); placeCaret(c, true); } });
  if (n.trashed) return;
  c.addEventListener('input', e => {
    if (e.inputType === 'insertText' && e.data === ' ') mdShortcut(c);
    if (e.inputType === 'insertParagraph') {
      const li = closestIn(c, 'ul.checklist > li');
      if (li && li.dataset.checked === 'true' && !li.textContent.trim()) li.dataset.checked = 'false';
      else if (li && !li.textContent.trim()) li.dataset.checked = 'false';
    }
    onBodyInput();
    if (e.inputType === 'insertText' && e.data === '[') checkBrackets(c);
  });
  c.addEventListener('keydown', e => editorKeys(e, c));
  c.addEventListener('click', e => {
    const li = e.target.closest('ul.checklist > li');
    if (li && c.contains(li)) {
      const r = li.getBoundingClientRect();
      if (e.clientX - r.left < 26 && e.clientY - r.top < 28) { li.dataset.checked = li.dataset.checked === 'true' ? 'false' : 'true'; onBodyInput(); e.preventDefault(); return; }
    }
    const a = e.target.closest('a');
    if (a && c.contains(a)) {
      e.preventDefault();
      if (a.classList.contains('note-link')) { const t = noteById(a.dataset.note); if (t && !t.trashed) openNote(t.id); else toast('That note no longer exists', 'error'); return; }
      if (a.classList.contains('attachment')) { const d = document.createElement('a'); d.href = a.href; d.download = a.getAttribute('download') || 'attachment'; document.body.appendChild(d); d.click(); d.remove(); return; }
      if (e.metaKey || e.ctrlKey) { window.open(a.href, '_blank', 'noopener'); return; }
      showMenu(a, [
        { header: a.href.length > 48 ? a.href.slice(0, 48) + '…' : a.href },
        { label: 'Open link', icon: 'external', kbd: `${MOD}+click`, onClick: () => window.open(a.href, '_blank', 'noopener') },
        { label: 'Edit link', icon: 'edit', onClick: async () => { const v = await askText({ title: 'Edit link', label: 'URL', value: a.getAttribute('href') }); if (v) { a.href = normUrl(v); onBodyInput(); } } },
        { label: 'Copy link', icon: 'copy', onClick: () => copyText(a.href) },
        { label: 'Remove link', icon: 'x', danger: true, onClick: () => { a.replaceWith(...a.childNodes); onBodyInput(); } },
      ]);
    }
  });
  c.addEventListener('paste', e => {
    const dt = e.clipboardData; if (!dt) return;
    const files = [...(dt.files || [])];
    if (files.length) { e.preventDefault(); handleFiles(files); return; }
    const html = dt.getData('text/html');
    if (html) { e.preventDefault(); document.execCommand('insertHTML', false, sanitize(html, true)); }
  });
  c.addEventListener('dragover', e => { if ([...(e.dataTransfer?.types || [])].includes('Files')) e.preventDefault(); });
  c.addEventListener('drop', e => {
    const files = [...(e.dataTransfer?.files || [])];
    if (!files.length) return;
    e.preventDefault();
    const r = document.caretRangeFromPoint ? document.caretRangeFromPoint(e.clientX, e.clientY) : null;
    if (r) { const s = getSelection(); s.removeAllRanges(); s.addRange(r); ui.range = r.cloneRange(); }
    handleFiles(files);
  });
  c.addEventListener('contextmenu', e => {
    const td = e.target.closest('td,th');
    if (td && c.contains(td)) { e.preventDefault(); tableMenu(e, td); }
  });
  const tb = $('.toolbar', ed);
  if (tb) {
    tb.addEventListener('mousedown', e => { if (e.target.closest('[data-cmd]')) e.preventDefault(); });
    tb.addEventListener('click', e => { const b = e.target.closest('[data-cmd]'); if (b) runCmd(b.dataset.cmd, b); });
  }
}
function placeCaret(el, atEnd) {
  el.focus();
  let t = el;
  const pick = n => atEnd ? n.lastElementChild : n.firstElementChild;
  while (pick(t) && !/^(BR|IMG|HR|AUDIO|TABLE)$/.test(pick(t).nodeName) && pick(t).isContentEditable !== false) t = pick(t);
  const r = document.createRange(); r.selectNodeContents(t); r.collapse(!atEnd);
  const s = getSelection(); s.removeAllRanges(); s.addRange(r);
}
function closestIn(root, sel) {
  const s = getSelection(); if (!s.rangeCount) return null;
  let node = s.anchorNode; const el = node && (node.nodeType === 1 ? node : node.parentElement);
  const found = el && el.closest(sel);
  return found && root.contains(found) ? found : null;
}
function focusBody() {
  const c = body(); if (!c) return null;
  const s = getSelection();
  const inside = s.rangeCount && c.contains(s.anchorNode);
  if (!inside) {
    c.focus();
    if (ui.range && c.contains(ui.range.startContainer)) { s.removeAllRanges(); s.addRange(ui.range); }
    else placeCaret(c, true);
  }
  return c;
}
const fb = tag => document.execCommand('formatBlock', false, '<' + tag + '>');
function exec(cmd, val = null) { if (!focusBody()) return; if (cmd === 'formatBlock') fb(val); else document.execCommand(cmd, false, val); onBodyInput(); updateToolbarState(); }
function insertHTML(html) { if (!focusBody()) return; document.execCommand('insertHTML', false, html); onBodyInput(); }
const normUrl = v => { v = v.trim(); if (!v) return v; if (/^(https?:|mailto:|tel:|#)/i.test(v)) return v; if (/^[\w.-]+@[\w.-]+\.\w+$/.test(v)) return 'mailto:' + v; if (/^[a-z][a-z0-9+.-]*:/i.test(v)) return 'https://' + v.replace(/^[a-z][a-z0-9+.-]*:\/*/i, ''); return 'https://' + v; };

function currentBlock() { try { return (document.queryCommandValue('formatBlock') || 'p').toLowerCase(); } catch { return 'p'; } }
function updateToolbarState() {
  const c = body(); const tb = $('#editor .toolbar'); if (!c || !tb) return;
  const s = getSelection(); if (!s.rangeCount || !c.contains(s.anchorNode)) return;
  const q = cmd => { try { return document.queryCommandState(cmd); } catch { return false; } };
  const map = { bold: 'bold', italic: 'italic', underline: 'underline', strike: 'strikeThrough', ol: 'insertOrderedList' };
  for (const [k, cmd] of Object.entries(map)) tb.querySelector(`[data-cmd="${k}"]`)?.classList.toggle('on', q(cmd));
  const inCheck = !!closestIn(c, 'ul.checklist');
  tb.querySelector('[data-cmd="ul"]')?.classList.toggle('on', q('insertUnorderedList') && !inCheck);
  tb.querySelector('[data-cmd="check"]')?.classList.toggle('on', inCheck);
  tb.querySelector('[data-cmd="inlinecode"]')?.classList.toggle('on', !!closestIn(c, 'code') && !closestIn(c, 'pre'));
  const blk = currentBlock();
  tb.querySelector('[data-cmd="quote"]')?.classList.toggle('on', !!closestIn(c, 'blockquote'));
  tb.querySelector('[data-cmd="codeblock"]')?.classList.toggle('on', blk === 'pre');
  const lbl = $('#tb-block'); if (lbl) lbl.textContent = BLOCK_LABELS[blk] || 'Normal text';
}
const updateToolbarSoon = debounce(updateToolbarState, 60);
document.addEventListener('selectionchange', () => {
  const c = body(); if (!c) return;
  const s = getSelection();
  if (s.rangeCount && c.contains(s.anchorNode)) { ui.range = s.getRangeAt(0).cloneRange(); updateToolbarSoon(); }
});

function toggleBlock(tag) {
  if (!focusBody()) return;
  const c = body();
  if (tag === 'blockquote') {
    const bq = closestIn(c, 'blockquote');
    if (bq) { const frag = document.createDocumentFragment(); while (bq.firstChild) frag.appendChild(bq.firstChild); bq.replaceWith(frag); onBodyInput(); return; }
  }
  fb(currentBlock() === tag ? 'p' : tag);
  onBodyInput(); updateToolbarState();
}
function blockToList(c, tag, check) {
  const s = getSelection();
  if (!s.rangeCount || closestIn(c, 'li')) return false;
  const r0 = s.getRangeAt(0);
  const blk = closestIn(c, 'p,div,h1,h2,h3');
  if (!blk || blk === c) return false;
  if (!r0.collapsed && !blk.contains(r0.endContainer)) return false;
  const list = document.createElement(tag); if (check) list.className = 'checklist';
  const li = document.createElement('li'); if (check) li.dataset.checked = 'false';
  while (blk.firstChild) li.appendChild(blk.firstChild);
  if (!li.firstChild) li.innerHTML = '<br>';
  list.appendChild(li); blk.replaceWith(list);
  const r = document.createRange(); r.selectNodeContents(li); r.collapse(false);
  s.removeAllRanges(); s.addRange(r);
  return true;
}
function listCmd(tag) {
  const c = focusBody(); if (!c) return;
  const list = closestIn(c, 'ul,ol');
  if (list && list.classList.contains('checklist')) { list.classList.remove('checklist'); [...list.children].forEach(li => li.removeAttribute('data-checked')); if (list.tagName === tag.toUpperCase()) { onBodyInput(); updateToolbarState(); return; } }
  if (list || !blockToList(c, tag, false)) document.execCommand(tag === 'ol' ? 'insertOrderedList' : 'insertUnorderedList');
  onBodyInput(); updateToolbarState();
}
function toggleChecklist() {
  const c = focusBody(); if (!c) return;
  let list = closestIn(c, 'ul,ol');
  if (list && list.tagName === 'UL' && list.classList.contains('checklist')) {
    list.classList.remove('checklist');
    [...list.children].forEach(li => li.removeAttribute('data-checked'));
  } else if (!list && blockToList(c, 'ul', true)) {
    /* converted current block */
  } else {
    if (!list || list.tagName === 'OL') document.execCommand('insertUnorderedList');
    list = closestIn(c, 'ul');
    if (list) list.classList.add('checklist');
  }
  onBodyInput(); updateToolbarState();
}
function inlineCode() {
  const c = focusBody(); if (!c) return;
  const code = closestIn(c, 'code');
  if (code && !code.closest('pre')) { code.replaceWith(document.createTextNode(code.textContent)); onBodyInput(); return; }
  const s = getSelection();
  const text = s.toString();
  insertHTML(`<code>${esc(text || 'code')}</code>&#8203;`);
}
function mdShortcut(c) {
  const s = getSelection(); if (!s.rangeCount) return;
  const r = s.getRangeAt(0); const node = r.startContainer;
  if (node.nodeType !== 3) return;
  const block = node.parentElement.closest('p,div,h1,h2,h3,li,blockquote,pre');
  if (block && (block.tagName === 'LI' || block.tagName === 'PRE')) return;
  const host = block && c.contains(block) && block !== c ? block : c;
  const pre = document.createRange(); pre.setStart(host, 0); pre.setEnd(node, 0);
  if (pre.toString() !== '' && host !== c) return;
  if (host === c) { // text directly in editor root: ensure it's the first text on its line
    const prev = node.previousSibling; if (prev && prev.nodeName !== 'BR') return;
  }
  const before = node.textContent.slice(0, r.startOffset).replace(/ /g, ' ');
  const mkList = (tag, check) => () => {
    if (blockToList(c, tag, check)) return;
    document.execCommand(tag === 'ol' ? 'insertOrderedList' : 'insertUnorderedList');
    if (check) closestIn(c, 'ul')?.classList.add('checklist');
  };
  const rules = {
    '# ': () => fb('h1'),
    '## ': () => fb('h2'),
    '### ': () => fb('h3'),
    '- ': mkList('ul'), '* ': mkList('ul'), '1. ': mkList('ol'),
    '[] ': mkList('ul', true), '[ ] ': mkList('ul', true),
    '> ': () => fb('blockquote'),
    '``` ': () => fb('pre'),
    '--- ': () => document.execCommand('insertHTML', false, '<hr><p><br></p>'),
  };
  const fn = rules[before]; if (!fn) return;
  const del = document.createRange(); del.setStart(node, 0); del.setEnd(node, r.startOffset);
  s.removeAllRanges(); s.addRange(del);
  document.execCommand('delete');
  fn();
}
function checkBrackets(c) {
  const s = getSelection(); if (!s.rangeCount) return;
  const r = s.getRangeAt(0); const node = r.startContainer;
  if (node.nodeType !== 3 || r.startOffset < 2) return;
  if (node.textContent.slice(r.startOffset - 2, r.startOffset) !== '[[') return;
  const del = document.createRange(); del.setStart(node, r.startOffset - 2); del.setEnd(node, r.startOffset);
  ui.range = del;
  insertNoteLink(true);
}
async function insertNoteLink(fromBrackets = false) {
  const n = cur();
  const saved = ui.range ? ui.range.cloneRange() : null;
  const id = await pickNote({ title: 'Link to note', exclude: n?.id });
  const c = body(); if (!c) return;
  c.focus();
  if (saved && c.contains(saved.startContainer)) { const s = getSelection(); s.removeAllRanges(); s.addRange(saved); }
  if (!id) { if (fromBrackets && saved) { const s = getSelection(); const r = saved.cloneRange(); r.collapse(false); s.removeAllRanges(); s.addRange(r); } return; }
  if (fromBrackets) document.execCommand('delete');
  const t = noteById(id);
  insertHTML(`<a class="note-link" data-note="${t.id}" href="#note-${t.id}">${esc(t.title || 'Untitled')}</a>&nbsp;`);
}
function editorKeys(e, c) {
  const mod = e.metaKey || e.ctrlKey;
  if (e.key === 'Tab') {
    if (closestIn(c, 'pre')) { e.preventDefault(); document.execCommand('insertText', false, '  '); return; }
    const td = closestIn(c, 'td,th');
    if (td) {
      e.preventDefault();
      const cells = $$('td,th', td.closest('table')); let i = cells.indexOf(td) + (e.shiftKey ? -1 : 1);
      if (i >= cells.length) { addRow(td.closest('table'), cells[cells.length - 1].parentElement, true); i = cells.length; }
      const next = $$('td,th', td.closest('table'))[Math.max(0, i)];
      if (next) { const r = document.createRange(); r.selectNodeContents(next); r.collapse(false); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
      return;
    }
    if (closestIn(c, 'li')) { e.preventDefault(); document.execCommand(e.shiftKey ? 'outdent' : 'indent'); onBodyInput(); return; }
    if (!e.shiftKey) { e.preventDefault(); document.execCommand('insertText', false, '\u00a0\u00a0\u00a0\u00a0'); return; }
  }
  if (mod && e.shiftKey && (e.key === 'L' || e.key === 'l')) { e.preventDefault(); toggleChecklist(); }
  else if (mod && e.shiftKey && (e.key === 'K' || e.key === 'k')) { e.preventDefault(); insertLink(); }
  else if (mod && e.shiftKey && (e.key === 'X' || e.key === 'x')) { e.preventDefault(); exec('strikeThrough'); }
  else if (mod && e.shiftKey && e.key === '7') { e.preventDefault(); listCmd('ol'); }
  else if (mod && e.shiftKey && e.key === '8') { e.preventDefault(); listCmd('ul'); }
  else if (mod && e.altKey && ['1', '2', '3', '0'].includes(e.key)) { e.preventDefault(); exec('formatBlock', e.key === '0' ? 'p' : 'h' + e.key); }
  else if (mod && (e.key === 'e' || e.key === 'E') && !e.shiftKey) { e.preventDefault(); inlineCode(); }
  else if (e.key === 'Enter' && !e.shiftKey && closestIn(c, 'blockquote') && !closestIn(c, 'li')) {
    const bq = closestIn(c, 'blockquote');
    const inner = closestIn(c, 'p,div');
    const line = inner && bq.contains(inner) ? inner : bq;
    if (!line.textContent.trim()) {
      e.preventDefault();
      const p = document.createElement('p'); p.innerHTML = '<br>';
      if (line === bq) bq.replaceWith(p); else { line.parentNode.removeChild(line); bq.after(p); if (!bq.textContent.trim()) bq.parentNode.removeChild(bq); }
      const r = document.createRange(); r.setStart(p, 0); const s = getSelection(); s.removeAllRanges(); s.addRange(r); onBodyInput(); updateToolbarState();
    }
  }
  else if (e.key === 'Enter' && !e.shiftKey) {
    const pre = closestIn(c, 'pre');
    if (pre && pre.textContent.endsWith('\n\n')) { /* allow exiting code block with double Enter */
      e.preventDefault(); pre.textContent = pre.textContent.replace(/\n+$/, '');
      const p = document.createElement('p'); p.innerHTML = '<br>'; pre.after(p);
      const r = document.createRange(); r.setStart(p, 0); const s = getSelection(); s.removeAllRanges(); s.addRange(r); onBodyInput();
    } else if (pre) { e.preventDefault(); document.execCommand('insertText', false, '\n'); }
  }
}

function runCmd(cmd, btn) {
  const C = {
    undo: () => exec('undo'), redo: () => exec('redo'),
    bold: () => exec('bold'), italic: () => exec('italic'), underline: () => exec('underline'), strike: () => exec('strikeThrough'),
    ul: () => listCmd('ul'), ol: () => listCmd('ol'), check: toggleChecklist,
    indent: () => exec('indent'), outdent: () => exec('outdent'),
    clear: () => { exec('removeFormat'); exec('unlink'); },
    inlinecode: inlineCode,
    quote: () => toggleBlock('blockquote'), codeblock: () => toggleBlock('pre'),
    hr: () => insertHTML('<hr><p><br></p>'),
    link: insertLink, notelink: () => insertNoteLink(false),
    image: () => { $('#file-image').click(); }, attach: () => { $('#file-any').click(); },
    sketch: () => openSketch(), audio: () => openRecorder(),
    date: () => insertHTML(esc(new Date().toLocaleString([], { dateStyle: 'full', timeStyle: 'short' })) + '&nbsp;'),
    block: () => showMenu(btn, [
      ['p', 'Normal text', `${MOD}+${ALT}+0`], ['h1', 'Heading 1', `${MOD}+${ALT}+1`], ['h2', 'Heading 2', `${MOD}+${ALT}+2`], ['h3', 'Heading 3', `${MOD}+${ALT}+3`], ['blockquote', 'Quote', '> '], ['pre', 'Code block', '``` ']
    ].map(([tag, label, kbd]) => ({ label, kbd, checked: currentBlock() === tag, onClick: () => tag === 'blockquote' ? toggleBlock('blockquote') : exec('formatBlock', tag) }))),
    color: () => colorMenu(btn, 'foreColor', ['#1d2026', '#e03131', '#f76707', '#f59f00', '#2f9e44', '#1971c2', '#7048e8', '#c2255c', '#868e96', '#0c8599', '#5c940d', '#ae3ec9']),
    hilite: () => colorMenu(btn, 'hiliteColor', ['transparent', '#fff3bf', '#ffe066', '#d3f9d8', '#c5f6fa', '#d0ebff', '#e5dbff', '#ffdeeb', '#ffe8cc', '#e9ecef', '#b2f2bb', '#ffc9c9']),
    table: () => showMenu(btn, [
      { header: 'Insert table' },
      ...[[2, 2], [3, 3], [4, 3], [4, 5], [3, 6]].map(([cols, rows]) => ({ label: `${cols} columns × ${rows} rows`, icon: 'table', onClick: () => insertTable(cols, rows) })),
      { sep: true }, { header: `Right-click a cell to add or remove rows and columns` }
    ]),
  };
  C[cmd] && C[cmd]();
}
function colorMenu(btn, cmd, colors) {
  showMenu(btn, [{
    html: `<div class="swatches">${colors.map(c => `<button data-color="${c}" title="${c === 'transparent' ? 'None' : c}" style="background:${c === 'transparent' ? 'linear-gradient(135deg,transparent 45%,#e03131 45%,#e03131 55%,transparent 55%)' : c}"></button>`).join('')}</div>`,
    onClick: e => {
      const b = e.target.closest('[data-color]'); if (!b) return false;
      focusBody();
      document.execCommand('styleWithCSS', false, true);
      document.execCommand(cmd, false, b.dataset.color);
      document.execCommand('styleWithCSS', false, false);
      onBodyInput();
    }
  }]);
}
async function insertLink() {
  const c = body(); if (!c) return;
  const saved = ui.range ? ui.range.cloneRange() : null;
  const selText = saved ? saved.toString() : '';
  const existing = closestIn(c, 'a');
  const url = await askText({ title: existing ? 'Edit link' : 'Insert link', label: 'URL', value: existing?.getAttribute('href') || '', placeholder: 'https://example.com', ok: 'Apply' });
  if (!url) return;
  c.focus();
  if (saved) { const s = getSelection(); s.removeAllRanges(); s.addRange(saved); }
  const href = normUrl(url);
  if (existing) { existing.href = href; onBodyInput(); return; }
  if (selText) exec('createLink', href);
  else insertHTML(`<a href="${esc(href)}">${esc(url)}</a>&nbsp;`);
}
function insertTable(cols, rows) {
  const row = i => `<tr>${Array.from({ length: cols }, () => `<td>${i === 0 ? '' : ''}<br></td>`).join('')}</tr>`;
  insertHTML(`<table><tbody>${Array.from({ length: rows }, (_, i) => row(i)).join('')}</tbody></table><p><br></p>`);
  const c = body(); const after = c && closestIn(c, 'p');
  const tbl = after?.previousElementSibling?.tagName === 'TABLE' ? after.previousElementSibling : null;
  const td = tbl && $('td', tbl);
  if (td) { const r = document.createRange(); r.setStart(td, 0); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
}
function addRow(table, tr, below) {
  const nr = document.createElement('tr');
  nr.innerHTML = [...tr.children].map(() => '<td><br></td>').join('');
  below ? tr.after(nr) : tr.before(nr);
  onBodyInput();
}
function tableMenu(e, td) {
  const tr = td.parentElement, table = td.closest('table');
  const idx = [...tr.children].indexOf(td);
  const eachRow = fn => $$('tr', table).forEach(fn);
  showMenu(null, [
    { header: 'Table' },
    { label: 'Insert row above', icon: 'plus', onClick: () => addRow(table, tr, false) },
    { label: 'Insert row below', icon: 'plus', onClick: () => addRow(table, tr, true) },
    { label: 'Insert column left', icon: 'plus', onClick: () => { eachRow(r => { const c = document.createElement('td'); c.innerHTML = '<br>'; r.children[idx]?.before(c); }); onBodyInput(); } },
    { label: 'Insert column right', icon: 'plus', onClick: () => { eachRow(r => { const c = document.createElement('td'); c.innerHTML = '<br>'; r.children[idx] ? r.children[idx].after(c) : r.appendChild(c); }); onBodyInput(); } },
    { sep: true },
    { label: 'Delete row', icon: 'x', onClick: () => { tr.remove(); if (!$('tr', table)) table.remove(); onBodyInput(); } },
    { label: 'Delete column', icon: 'x', onClick: () => { eachRow(r => r.children[idx]?.remove()); if (!$('td,th', table)) table.remove(); onBodyInput(); } },
    { label: 'Delete table', icon: 'trash', danger: true, onClick: () => { table.remove(); onBodyInput(); } },
  ], { x: e.clientX, y: e.clientY });
}

async function handleFiles(files) {
  if (!body()) { toast('Open a note first', 'error'); return; }
  for (const f of files) {
    if (f.size > 50 * 1048576) { toast(`${f.name} is larger than 50 MB`, 'error'); continue; }
    try {
      if (f.type.startsWith('image/')) {
        const url = await imageURL(f);
        insertHTML(`<img src="${url}" alt="${esc(f.name)}"><p><br></p>`);
      } else {
        const url = await readFileURL(f);
        const ext = (f.name.split('.').pop() || '').toUpperCase().slice(0, 5);
        insertHTML(`<a class="attachment" contenteditable="false" href="${url}" download="${esc(f.name)}">📎 <span>${esc(f.name)}</span> <small>${esc(ext)} · ${fmtSize(f.size)}</small></a>&nbsp;`);
      }
    } catch (err) { toast('Could not add ' + f.name, 'error'); }
  }
}

// ---------- Sketch ----------
function openSketch(target) {
  const colors = ['#1d2026', '#e03131', '#f59f00', '#2f9e44', '#1971c2', '#7048e8', '#ffffff'];
  const m = openModal({
    title: 'Sketch', cls: 'wide',
    body: `<div class="sketch-tools">${colors.map((c, i) => `<button class="dotc ${i === 0 ? 'on' : ''}" data-c="${c}" style="background:${c}" aria-label="Color ${c}"></button>`).join('')}
      <span class="vsep"></span><div class="seg" data-sizes>${[2, 4, 8, 16].map((s, i) => `<button class="${i === 1 ? 'on' : ''}" data-s="${s}">${s}px</button>`).join('')}</div>
      <span class="vsep"></span><button class="btn sm" data-eraser>${I('eraser', 'sm')}Eraser</button><button class="btn sm" data-undo>${I('undo', 'sm')}Undo</button><button class="btn sm ghost" data-clear>Clear</button></div>
      <canvas class="sketch-canvas"></canvas>`,
    foot: `<button class="btn" data-close>Cancel</button><button class="btn primary" data-save>${I('check', 'sm')}Insert sketch</button>`
  });
  const cv = $('canvas', m), ctx = cv.getContext('2d');
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const r = cv.getBoundingClientRect();
  cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
  ctx.scale(dpr, dpr); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, r.width, r.height);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  let color = colors[0], size = 4, eraser = false, drawing = false, last = null;
  const undo = [];
  $$('[data-c]', m).forEach(b => b.onclick = () => { color = b.dataset.c; eraser = false; $$('[data-c]', m).forEach(x => x.classList.toggle('on', x === b)); $('[data-eraser]', m).classList.remove('primary'); });
  $$('[data-s]', m).forEach(b => b.onclick = () => { size = +b.dataset.s; $$('[data-s]', m).forEach(x => x.classList.toggle('on', x === b)); });
  $('[data-eraser]', m).onclick = e => { eraser = !eraser; e.currentTarget.classList.toggle('primary', eraser); };
  $('[data-undo]', m).onclick = () => { const d = undo.pop(); if (d) ctx.putImageData(d, 0, 0); };
  $('[data-clear]', m).onclick = () => { undo.push(ctx.getImageData(0, 0, cv.width, cv.height)); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, r.width, r.height); };
  const pos = e => { const b = cv.getBoundingClientRect(); return { x: (e.clientX - b.left) * (r.width / b.width), y: (e.clientY - b.top) * (r.height / b.height), p: e.pressure || .5 }; };
  cv.addEventListener('pointerdown', e => {
    cv.setPointerCapture(e.pointerId); drawing = true; last = pos(e);
    undo.push(ctx.getImageData(0, 0, cv.width, cv.height)); if (undo.length > 40) undo.shift();
    ctx.beginPath(); ctx.fillStyle = eraser ? '#fff' : color; ctx.arc(last.x, last.y, (eraser ? size * 3 : size) / 2, 0, Math.PI * 2); ctx.fill();
  });
  cv.addEventListener('pointermove', e => {
    if (!drawing) return;
    const p = pos(e);
    ctx.strokeStyle = eraser ? '#fff' : color;
    ctx.lineWidth = (eraser ? size * 3 : size) * (e.pointerType === 'pen' ? 0.5 + p.p : 1);
    ctx.beginPath(); ctx.moveTo(last.x, last.y);
    const mx = (last.x + p.x) / 2, my = (last.y + p.y) / 2;
    ctx.quadraticCurveTo(last.x, last.y, mx, my); ctx.lineTo(p.x, p.y); ctx.stroke();
    last = p;
  });
  const end = () => { drawing = false; };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  $('[data-save]', m).onclick = () => {
    const url = cv.toDataURL('image/png');
    closeModal();
    if (target === 'new') { const n = createNote({ title: 'Sketch — ' + new Date().toLocaleDateString(), html: `<img class="sketch" src="${url}" alt="Sketch"><p><br></p>` }); return n; }
    insertHTML(`<img class="sketch" src="${url}" alt="Sketch"><p><br></p>`);
  };
}

// ---------- Audio ----------
async function openRecorder(target) {
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { toast('Audio recording is not supported in this browser', 'error'); return; }
  let rec = null, stream = null, chunks = [], t0 = 0, timer = null, finished = false;
  const cleanup = () => { clearInterval(timer); if (rec && rec.state !== 'inactive') { finished = true; rec.stop(); } stream?.getTracks().forEach(t => t.stop()); };
  const m = openModal({
    title: 'Record audio',
    body: `<div class="rec"><button class="rec-btn" data-rec aria-label="Start recording">${I('mic')}</button><div class="rec-time">0:00</div><div class="muted" data-hint>Tap the button to start recording</div></div>`,
    foot: '<button class="btn" data-close>Cancel</button>',
    onClose: () => { finished = true; cleanup(); }
  });
  const btn = $('[data-rec]', m), time = $('.rec-time', m), hint = $('[data-hint]', m);
  const fmt = ms => `${Math.floor(ms / 60000)}:${pad(Math.floor(ms / 1000) % 60)}`;
  btn.onclick = async () => {
    if (!rec) {
      try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
      catch { toast('Microphone permission was denied', 'error'); return; }
      rec = new MediaRecorder(stream); chunks = [];
      rec.ondataavailable = e => e.data.size && chunks.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (finished) return;
        const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
        const url = await readFileURL(blob);
        const dur = fmt(now() - t0);
        const label = `Recording · ${dur} · ${new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`;
        ui.modalClose = null; closeModal();
        const html = `<div class="audio-block" contenteditable="false"><audio controls src="${url}"></audio><span>${esc(label)}</span></div><p><br></p>`;
        if (target === 'new') createNote({ title: 'Audio note — ' + new Date().toLocaleDateString(), html });
        else insertHTML(html);
      };
      rec.start(); t0 = now();
      btn.classList.add('live'); btn.innerHTML = '<svg class="i" viewBox="0 0 24 24"><rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor"/></svg>';
      hint.textContent = 'Recording… tap to stop and insert';
      timer = setInterval(() => time.textContent = fmt(now() - t0), 250);
    } else { clearInterval(timer); rec.stop(); }
  };
}

// ============================================================
// Note actions
// ============================================================
function createNote(o = {}) {
  let notebookId = o.notebookId;
  const tags = o.tags ? [...o.tags] : [];
  if (!notebookId && ui.view === 'notebook') notebookId = ui.notebookId;
  if (!notebookId && ui.view === 'stack') notebookId = S.notebooks.find(b => b.stack === ui.stack)?.id;
  if (ui.view === 'tag' && !tags.includes(ui.tag)) tags.push(ui.tag);
  const n = makeNote({ ...o, notebookId: notebookId || defaultNotebookId(), tags });
  n.text = htmlText(n.html);
  S.notes.push(n);
  persist();
  if (!['notes', 'notebook', 'tag', 'stack'].includes(ui.view)) ui.view = 'notes';
  ui.tagFilter = null;
  ui.noteId = n.id; ui.mobileEditor = true;
  if (isMobile()) closeSidebar();
  render(true);
  if (n.title && body()) placeCaret(body(), true); else $('#editor .ed-title')?.focus();
  return n;
}
function openNote(id) {
  const n = noteById(id); if (!n) return;
  if (!LIST_VIEWS.includes(ui.view) || (n.trashed && ui.view !== 'trash') || (!n.trashed && ui.view === 'trash') || !listNotes().some(x => x.id === id)) {
    ui.view = n.trashed ? 'trash' : 'notes'; ui.tagFilter = null;
  }
  ui.noteId = id; ui.mobileEditor = true;
  if (isMobile()) closeSidebar();
  render();
  $(`.note-item[data-id="${id}"]`)?.scrollIntoView({ block: 'nearest' });
}
function trashNote(n) {
  n.trashed = true; n.trashedAt = now();
  if (ui.noteId === n.id) { ui.noteId = null; ui.mobileEditor = false; }
  persist(); render(true);
  toast(`Moved “${n.title || 'Untitled'}” to Trash`, '', { label: 'Undo', onClick: () => { n.trashed = false; n.trashedAt = null; ui.noteId = n.id; persist(); render(true); } });
}
function restoreNote(n) {
  n.trashed = false; n.trashedAt = null;
  if (!nbById(n.notebookId)) n.notebookId = defaultNotebookId();
  persist(); toast('Note restored');
  ui.noteId = null; render(true);
}
async function deleteForever(n) {
  if (!await askConfirm({ title: 'Delete permanently?', message: `“${esc(n.title || 'Untitled')}” will be permanently deleted. This can’t be undone.`, ok: 'Delete', danger: true })) return;
  S.notes = S.notes.filter(x => x.id !== n.id);
  S.tasks.forEach(t => { if (t.noteId === n.id) t.noteId = null; });
  delete ui.unlocked[n.id];
  if (ui.noteId === n.id) ui.noteId = null;
  persist(); render(true);
}
function duplicateNote(n) {
  const copy = { ...structuredClone(n), id: uid(), title: (n.title || 'Untitled') + ' (copy)', createdAt: now(), updatedAt: now(), versions: [], pinned: false, shortcut: false, reminder: null };
  S.notes.push(copy);
  if (n.locked && ui.unlocked[n.id]) ui.unlocked[copy.id] = { ...ui.unlocked[n.id] };
  persist(); ui.noteId = copy.id; render(true); toast('Note duplicated');
}
async function moveNote(n, anchor) {
  const items = [{ header: 'Move to notebook' }];
  for (const [stack, nbs] of groupStacks()) {
    if (stack) items.push({ header: stack });
    nbs.forEach(b => items.push({ label: b.name, icon: 'book', checked: b.id === n.notebookId, onClick: () => { n.notebookId = b.id; touch(n, false); render(true); toast(`Moved to ${b.name}`); } }));
  }
  items.push({ sep: true }, { label: 'New notebook…', icon: 'plus', onClick: async () => { const b = await newNotebook(); if (b) { n.notebookId = b.id; touch(n, false); render(true); } } });
  if (anchor) showMenu(anchor, items);
  else showMenu(null, items, { x: innerWidth / 2 - 110, y: innerHeight / 3 });
}
function reminderMenu(n, anchor) {
  const at = (d) => { setReminder(n, d); };
  const later = new Date(); later.setHours(later.getHours() + 3, 0, 0, 0);
  const tom = addDays(new Date(), 1); tom.setHours(9, 0, 0, 0);
  const nextWeek = addDays(new Date(), (8 - new Date().getDay()) % 7 || 7); nextWeek.setHours(9, 0, 0, 0);
  showMenu(anchor, [
    { header: 'Remind me' },
    { label: 'Later today', icon: 'clock', kbd: later.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), onClick: () => at(later) },
    { label: 'Tomorrow', icon: 'clock', kbd: '9:00', onClick: () => at(tom) },
    { label: 'Next week', icon: 'calendar', kbd: nextWeek.toLocaleDateString([], { weekday: 'short' }), onClick: () => at(nextWeek) },
    { label: 'Pick date & time…', icon: 'calendar', onClick: async () => {
      const def = n.reminder ? new Date(n.reminder.at) : tom;
      const local = `${ymd(def)}T${pad(def.getHours())}:${pad(def.getMinutes())}`;
      const v = await askText({ title: 'Set reminder', label: 'Date & time', type: 'datetime-local', value: local, ok: 'Set reminder' });
      if (v) at(new Date(v));
    } },
    ...(n.reminder ? [{ sep: true }, { label: n.reminder.done ? 'Mark as not done' : 'Mark as done', icon: 'check', onClick: () => { n.reminder.done = !n.reminder.done; persist(); refreshEdChrome(); refreshList(); } }, { label: 'Remove reminder', icon: 'x', danger: true, onClick: () => { n.reminder = null; persist(); refreshEdChrome(); refreshList(); } }] : [])
  ], { align: 'right' });
}
function setReminder(n, d) {
  if (isNaN(d)) return;
  n.reminder = { at: d.getTime(), done: false, notified: false };
  persist();
  if (LIST_VIEWS.includes(ui.view)) { refreshEdChrome(); refreshList(); } else renderPage();
  toast('Reminder set for ' + fullDate(d.getTime()));
  if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission().catch(() => {});
}
async function lockFlow(n, anchor) {
  if (!window.crypto?.subtle) { toast('Encryption requires a secure (https) connection', 'error'); return; }
  if (n.locked) {
    if (!ui.unlocked[n.id]) return;
    showMenu(anchor, [
      { label: 'Lock now', icon: 'lock', onClick: () => { flushEncrypt(n).then(() => { delete ui.unlocked[n.id]; renderEditor(true); renderList(); }); } },
      { label: 'Remove encryption', icon: 'unlock', onClick: async () => {
        if (!await askConfirm({ title: 'Remove encryption?', message: 'The note body will be stored unencrypted on this device.', ok: 'Remove encryption' })) return;
        n.html = ui.unlocked[n.id].html; n.text = htmlText(n.html); n.locked = null; delete ui.unlocked[n.id];
        persist(); renderEditor(true); renderList(); toast('Encryption removed');
      } },
    ], { align: 'right' });
    return;
  }
  const m = openModal({
    title: 'Encrypt note',
    body: `<p class="muted" style="margin-top:0">The note body is encrypted with AES-256 using your password. <b>If you forget the password, the note can’t be recovered.</b> Version history for this note will be cleared.</p>
      <form id="enc-form"><label class="field"><span>Password</span><input class="input" type="password" name="p1" autocomplete="new-password" required minlength="4"></label>
      <label class="field"><span>Confirm password</span><input class="input" type="password" name="p2" autocomplete="new-password" required></label>
      <label class="field"><span>Hint (optional)</span><input class="input" name="hint" autocomplete="off"></label>
      <div class="enc-err" style="color:var(--danger);font-size:13px" hidden></div></form>`,
    foot: `<button class="btn" data-close>Cancel</button><button class="btn primary" data-ok>${I('lock', 'sm')}Encrypt</button>`
  });
  const f = $('#enc-form', m); setTimeout(() => f.p1.focus(), 30);
  const go = async () => {
    const err = $('.enc-err', m);
    if (f.p1.value.length < 4) { err.textContent = 'Use at least 4 characters.'; err.hidden = false; return; }
    if (f.p1.value !== f.p2.value) { err.textContent = 'Passwords don’t match.'; err.hidden = false; return; }
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await deriveKey(f.p1.value, salt);
    const html = n.html;
    n.locked = { ...(await encWithKey(html, key, b64(salt))), hint: f.hint.value.trim() };
    ui.unlocked[n.id] = { html, key, salt: b64(salt) };
    n.html = ''; n.text = ''; n.versions = [];
    persist(); closeModal(); renderEditor(true); renderList();
    toast('Note encrypted with AES-256');
  };
  f.onsubmit = e => { e.preventDefault(); go(); };
  $('[data-ok]', m).onclick = go;
}
async function flushEncrypt(n) {
  if (!encTimers[n.id]) return;
  clearTimeout(encTimers[n.id]); delete encTimers[n.id];
  const u = ui.unlocked[n.id]; if (!u || !n.locked) return;
  n.locked = { ...(await encWithKey(u.html, u.key, u.salt)), hint: n.locked.hint };
  persist();
}
function needHTML(n) { const h = noteHTML(n); if (h == null) toast('Unlock this note first', 'error'); return h; }
function exportNote(n, fmt) {
  const html = needHTML(n); if (html == null) return;
  const name = safeName(n.title);
  if (fmt === 'html') download(name + '.html', standaloneHTML(n, html), 'text/html');
  else if (fmt === 'md') download(name + '.md', `# ${n.title || 'Untitled'}\n\n` + (n.tags.length ? n.tags.map(t => '#' + t.replace(/\s+/g, '-')).join(' ') + '\n\n' : '') + htmlToMd(html), 'text/markdown');
  else if (fmt === 'txt') download(name + '.txt', (n.title || 'Untitled') + '\n\n' + htmlText(html), 'text/plain');
  else if (fmt === 'print') printNote(n, html);
}
function printNote(n, html) {
  const f = document.createElement('iframe');
  f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(f);
  const d = f.contentDocument; d.open(); d.write(standaloneHTML(n, html)); d.close();
  setTimeout(() => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch { } setTimeout(() => f.remove(), 1500); }, 300);
}
function shareMenu(n, anchor) {
  const html = noteHTML(n);
  if (html == null) { toast('Unlock this note first', 'error'); return; }
  showMenu(anchor, [
    { header: 'Share & export' },
    { label: 'Copy as rich text', icon: 'copy', onClick: () => copyText(htmlText(html), `<h1>${esc(n.title)}</h1>${html}`) },
    { label: 'Copy as Markdown', icon: 'code', onClick: () => copyText(`# ${n.title || 'Untitled'}\n\n` + htmlToMd(html)) },
    { label: 'Copy as plain text', icon: 'note', onClick: () => copyText((n.title || 'Untitled') + '\n\n' + htmlText(html)) },
    navigator.share ? { label: 'Share via device…', icon: 'share', onClick: () => navigator.share({ title: n.title || 'Untitled', text: htmlToMd(html) }).catch(() => {}) } : null,
    { label: 'Send by email', icon: 'mail', onClick: () => { location.href = `mailto:?subject=${encodeURIComponent(n.title || 'Untitled')}&body=${encodeURIComponent(htmlText(html).slice(0, 1800))}`; } },
    { sep: true },
    { label: 'Download web page (.html)', icon: 'download', onClick: () => exportNote(n, 'html') },
    { label: 'Download Markdown (.md)', icon: 'download', onClick: () => exportNote(n, 'md') },
    { label: 'Download plain text (.txt)', icon: 'download', onClick: () => exportNote(n, 'txt') },
    { label: 'Print or save as PDF', icon: 'printer', kbd: `${MOD}+P`, onClick: () => exportNote(n, 'print') },
  ], { align: 'right' });
}
function noteMenu(n, anchor, point) {
  const items = n.trashed ? [
    { label: 'Restore', icon: 'undo', onClick: () => restoreNote(n) },
    { label: 'Delete permanently', icon: 'trash', danger: true, onClick: () => deleteForever(n) },
  ] : [
    { label: 'Note info', icon: 'info', onClick: () => noteInfo(n) },
    { label: 'Version history', icon: 'clock', onClick: () => openHistory(n) },
    { sep: true },
    { label: n.pinned ? 'Unpin' : 'Pin to top', icon: 'pin', onClick: () => { n.pinned = !n.pinned; persist(); render(); } },
    { label: n.shortcut ? 'Remove from shortcuts' : 'Add to shortcuts', icon: 'star', onClick: () => { n.shortcut = !n.shortcut; persist(); render(); } },
    { label: 'Move to…', icon: 'move', onClick: () => moveNote(n) },
    { label: 'Duplicate', icon: 'copy', onClick: () => duplicateNote(n) },
    { label: 'Copy note link', icon: 'link', onClick: () => copyText(`${location.origin}${location.pathname}#note-${n.id}`) },
    { label: 'Save as template', icon: 'template', onClick: () => saveAsTemplate(n) },
    { sep: true },
    { label: 'Present', icon: 'present', onClick: () => present(n) },
    { label: ui.focus ? 'Exit focus mode' : 'Focus mode', icon: 'focus', kbd: `${MOD}+.`, onClick: () => toggleFocus() },
    { label: 'Export…', icon: 'download', onClick: () => shareMenu(n, anchor || null) },
    { sep: true },
    { label: 'Move to Trash', icon: 'trash', danger: true, onClick: () => trashNote(n) },
  ];
  showMenu(anchor, items, point ? { x: point.x, y: point.y } : { align: 'right' });
}
function noteInfo(n) {
  const html = noteHTML(n) || '';
  const text = n.locked && !ui.unlocked[n.id] ? '' : htmlText(html);
  const words = (text.match(/\S+/g) || []).length;
  const size = new Blob([JSON.stringify(n)]).size;
  const imgs = (html.match(/<img/g) || []).length, files = (html.match(/class="attachment"/g) || []).length;
  const backlinks = activeNotes().filter(m => m.id !== n.id && (m.html || '').includes(`data-note="${n.id}"`)).length;
  const row = (k, v) => `<tr><td class="muted" style="width:40%">${k}</td><td>${v}</td></tr>`;
  openModal({
    title: 'Note info',
    body: `<table class="table"><tbody>
      ${row('Title', esc(n.title || 'Untitled'))}${row('Notebook', esc(nbById(n.notebookId)?.name || '—'))}
      ${row('Created', esc(fullDate(n.createdAt)))}${row('Updated', esc(fullDate(n.updatedAt)))}
      ${row('Words', words)}${row('Characters', text.length)}${row('Images / files', `${imgs} / ${files}`)}
      ${row('Tags', n.tags.map(t => `<span class="chip">${esc(t)}</span>`).join(' ') || '—')}
      ${row('Linked from', plural(backlinks, 'note'))}${row('Versions saved', n.versions.length)}
      ${row('Encryption', n.locked ? 'AES-256-GCM' : 'None')}${row('Size', fmtSize(size))}
    </tbody></table>`
  });
}
function openHistory(n) {
  if (n.locked) { toast('Version history isn’t kept for encrypted notes', 'error'); return; }
  const versions = [{ at: n.updatedAt, title: n.title, html: n.html, current: true }, ...n.versions];
  let sel = 0;
  const m = openModal({
    title: 'Version history', cls: 'xwide',
    body: `<div class="hist"><div class="hist-list"></div><div class="hist-prev"></div></div>`,
    foot: `<span class="muted" style="margin-right:auto;font-size:12.5px">Inkwell saves a version every few minutes while you edit — unlimited history.</span><button class="btn" data-close>Close</button><button class="btn primary" data-restore disabled>${I('undo', 'sm')}Restore this version</button>`
  });
  const draw = () => {
    $('.hist-list', m).innerHTML = versions.map((v, i) => `<button class="hist-item ${i === sel ? 'sel' : ''}" data-i="${i}">${esc(fullDate(v.at))}<small>${v.current ? 'Current version' : esc(v.title || 'Untitled')}</small></button>`).join('');
    const v = versions[sel];
    $('.hist-prev', m).innerHTML = `<h2>${esc(v.title || 'Untitled')}</h2><div class="content">${v.html || '<p class="muted">Empty note</p>'}</div>`;
    $('[data-restore]', m).disabled = !!v.current;
  };
  $('.hist-list', m).addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) { sel = +b.dataset.i; draw(); } });
  $('[data-restore]', m).onclick = () => {
    const v = versions[sel];
    n.versions.unshift({ at: n.updatedAt, savedAt: now(), title: n.title, html: n.html });
    n.title = v.title; n.html = v.html; n.text = htmlText(v.html); n.updatedAt = now();
    persist(); closeModal(); renderEditor(true); renderList(); toast('Version restored');
  };
  draw();
}
async function saveAsTemplate(n) {
  const html = needHTML(n); if (html == null) return;
  const name = await askText({ title: 'Save as template', label: 'Template name', value: n.title || 'My template', ok: 'Save template' });
  if (!name) return;
  S.templates.push({ id: uid(), name, desc: 'Your template', title: n.title, html, user: true, createdAt: now() });
  persist(); toast('Template saved — find it under Templates');
}
function toggleFocus() {
  ui.focus = !ui.focus;
  if (ui.focus && !LIST_VIEWS.includes(ui.view)) ui.focus = false;
  $('#app').classList.toggle('focus', ui.focus);
  if (ui.focus) toast(`Focus mode — press Esc or ${MOD}+. to exit`);
}

// ---------- Presentation ----------
function present(n) {
  const html = needHTML(n); if (html == null) return;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const slides = [[]];
  [...doc.body.childNodes].forEach(node => { if (node.nodeName === 'HR') slides.push([]); else slides[slides.length - 1].push(node.nodeType === 1 ? node.outerHTML : esc(node.textContent)); });
  let list = slides.map(s => s.join('')).filter(s => htmlText(s) || /<img|<audio|<table/.test(s));
  list[0] = `<h1>${esc(n.title || 'Untitled')}</h1>` + (list[0] || '');
  let i = 0;
  const ov = document.createElement('div');
  ov.className = 'present';
  ov.innerHTML = `<div class="progress"><span></span></div><div class="slide"><div class="content"></div></div><div class="p-bar"><span class="grow">${esc(n.title || 'Untitled')}</span><span data-count></span><button data-prev aria-label="Previous">${I('chevL')}</button><button data-next aria-label="Next">${I('chevR')}</button><button data-exit aria-label="Exit">${I('x')}</button></div>`;
  document.body.appendChild(ov);
  const draw = () => {
    $('.content', ov).innerHTML = list[i];
    $('.slide', ov).scrollTop = 0;
    $('[data-count]', ov).textContent = `${i + 1} / ${list.length}`;
    $('.progress span', ov).style.width = ((i + 1) / list.length * 100) + '%';
  };
  const go = d => { i = Math.max(0, Math.min(list.length - 1, i + d)); draw(); };
  const exit = () => { document.removeEventListener('keydown', keys, true); ov.remove(); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); };
  const keys = e => {
    if (['ArrowRight', 'PageDown', ' ', 'ArrowDown'].includes(e.key)) { go(1); e.preventDefault(); e.stopPropagation(); }
    else if (['ArrowLeft', 'PageUp', 'ArrowUp'].includes(e.key)) { go(-1); e.preventDefault(); e.stopPropagation(); }
    else if (e.key === 'Escape') { exit(); e.preventDefault(); e.stopPropagation(); }
  };
  document.addEventListener('keydown', keys, true);
  $('[data-prev]', ov).onclick = () => go(-1); $('[data-next]', ov).onclick = () => go(1); $('[data-exit]', ov).onclick = exit;
  $('.slide', ov).addEventListener('click', e => { if (!e.target.closest('a,audio')) go(1); });
  ov.requestFullscreen?.().catch(() => {});
  draw();
}

// ============================================================
// Notebooks, tags, stacks
// ============================================================
async function newNotebook(stack = '') {
  const name = await askText({ title: 'New notebook', label: 'Notebook name', placeholder: 'e.g. Research', ok: 'Create' });
  if (!name || !name.trim()) return null;
  const b = { id: uid(), name: name.trim(), stack, createdAt: now() };
  S.notebooks.push(b); persist(); renderSidebar();
  if (ui.view === 'notebooks') renderPage();
  toast(`Notebook “${b.name}” created`);
  return b;
}
function notebookMenu(b, anchor) {
  showMenu(anchor, [
    { label: 'New note in notebook', icon: 'plus', onClick: () => createNote({ notebookId: b.id }) },
    { label: 'Rename', icon: 'edit', onClick: async () => { const v = await askText({ title: 'Rename notebook', label: 'Name', value: b.name }); if (v && v.trim()) { b.name = v.trim(); persist(); render(); } } },
    { label: b.stack ? 'Change stack…' : 'Add to stack…', icon: 'stack', onClick: async () => { const v = await askText({ title: 'Stack', label: 'Stack name (leave empty to remove)', value: b.stack, hint: 'Stacks group related notebooks together.' }); if (v != null) { b.stack = v.trim(); persist(); render(); } } },
    { label: S.settings.defaultNotebook === b.id ? 'Default notebook' : 'Set as default', icon: 'check', checked: S.settings.defaultNotebook === b.id, onClick: () => { S.settings.defaultNotebook = b.id; persist(); toast(`${b.name} is now your default notebook`); } },
    { label: 'Export notebook (.md)', icon: 'download', onClick: () => exportNotesMd(activeNotes().filter(n => n.notebookId === b.id), b.name) },
    { sep: true },
    { label: 'Delete notebook', icon: 'trash', danger: true, onClick: () => deleteNotebook(b) },
  ], { align: 'right' });
}
async function deleteNotebook(b) {
  if (S.notebooks.length === 1) { toast('You need at least one notebook', 'error'); return; }
  const notes = activeNotes().filter(n => n.notebookId === b.id);
  if (!await askConfirm({ title: 'Delete notebook?', message: `“${esc(b.name)}” will be deleted${notes.length ? ` and its ${plural(notes.length, 'note')} moved to Trash` : ''}.`, ok: 'Delete notebook', danger: true })) return;
  S.notebooks = S.notebooks.filter(x => x.id !== b.id);
  const fallback = defaultNotebookId();
  S.notes.forEach(n => { if (n.notebookId === b.id) { n.notebookId = fallback; if (!n.trashed) { n.trashed = true; n.trashedAt = now(); } } });
  if (S.settings.defaultNotebook === b.id) S.settings.defaultNotebook = S.notebooks[0].id;
  if (ui.view === 'notebook' && ui.notebookId === b.id) ui.view = 'notebooks';
  persist(); render(true);
}
function tagMenu(tag, anchor) {
  showMenu(anchor, [
    { label: 'Rename tag', icon: 'edit', onClick: () => renameTag(tag) },
    { label: 'Delete tag', icon: 'trash', danger: true, onClick: () => deleteTag(tag) },
  ], { align: 'right' });
}
async function renameTag(tag) {
  const v = await askText({ title: 'Rename tag', label: 'Tag name', value: tag });
  const nt = v && v.trim().replace(/^#+/, '');
  if (!nt || nt === tag) return;
  S.notes.forEach(n => { const i = n.tags.indexOf(tag); if (i >= 0) { n.tags.splice(i, 1); if (!n.tags.includes(nt)) n.tags.splice(i, 0, nt); } });
  if (ui.tag === tag) ui.tag = nt;
  if (ui.tagFilter === tag) ui.tagFilter = nt;
  persist(); render(true);
}
async function deleteTag(tag) {
  if (!await askConfirm({ title: 'Delete tag?', message: `The tag “${esc(tag)}” will be removed from all notes. The notes won’t be deleted.`, ok: 'Delete tag', danger: true })) return;
  S.notes.forEach(n => n.tags = n.tags.filter(t => t !== tag));
  if (ui.view === 'tag' && ui.tag === tag) ui.view = 'tags';
  if (ui.tagFilter === tag) ui.tagFilter = null;
  persist(); render(true);
}
function stackMenu(stack, anchor) {
  showMenu(anchor, [
    { label: 'New notebook in stack', icon: 'plus', onClick: () => newNotebook(stack) },
    { label: 'Rename stack', icon: 'edit', onClick: async () => { const v = await askText({ title: 'Rename stack', label: 'Stack name', value: stack }); if (v && v.trim()) { S.notebooks.forEach(b => { if (b.stack === stack) b.stack = v.trim(); }); if (ui.stack === stack) ui.stack = v.trim(); persist(); render(); } } },
    { label: 'Remove stack', icon: 'x', onClick: () => { S.notebooks.forEach(b => { if (b.stack === stack) b.stack = ''; }); if (ui.view === 'stack') ui.view = 'notebooks'; persist(); render(); toast('Stack removed — notebooks kept'); } },
  ], { align: 'right' });
}
function exportNotesMd(notes, name) {
  const md = notes.map(n => `# ${n.title || 'Untitled'}\n\n_${nbById(n.notebookId)?.name || ''} · ${new Date(n.updatedAt).toLocaleString()}${n.tags.length ? ' · ' + n.tags.map(t => '#' + t).join(' ') : ''}_\n\n` + (n.locked ? '*(encrypted note)*\n' : htmlToMd(n.html))).join('\n\n---\n\n');
  download(safeName(name) + '.md', md, 'text/markdown');
}

// ============================================================
// Tasks
// ============================================================
const PRI = { high: 3, med: 2, low: 1 };
const taskSort = (a, b) => (a.done - b.done) || ((a.due || '9999') < (b.due || '9999') ? -1 : (a.due || '9999') > (b.due || '9999') ? 1 : 0) || ((PRI[b.priority] || 0) - (PRI[a.priority] || 0)) || a.createdAt - b.createdAt;
function taskRow(t, { showNote = true } = {}) {
  const note = t.noteId && noteById(t.noteId);
  const dc = t.done ? '' : dueClass(t.due);
  return `<div class="task-row ${t.done ? 'done' : ''}" data-task="${t.id}">
    <button class="tcheck ${t.done ? 'on' : ''} ${t.priority ? 'p-' + t.priority : ''}" data-act="task-toggle" data-id="${t.id}" aria-label="${t.done ? 'Mark incomplete' : 'Complete task'}">${I('check', 'xs')}</button>
    <div class="grow"><div class="task-title" contenteditable="true" data-task-title="${t.id}" spellcheck="false">${esc(t.title)}</div>
      ${(t.due || t.priority || (showNote && note)) ? `<div class="task-meta">${t.due ? `<span class="chip ${dc}">${I('calendar', 'xs')}${esc(dueLabel(t.due))}</span>` : ''}${t.priority ? `<span class="chip">${I('flag', 'xs flag-' + t.priority)}${{ high: 'High', med: 'Medium', low: 'Low' }[t.priority]}</span>` : ''}${showNote && note ? `<span class="chip accent" data-act="open-note" data-id="${note.id}" style="cursor:pointer">${I('note', 'xs')}${esc(note.title || 'Untitled')}</span>` : ''}</div>` : ''}
    </div>
    <div class="row-actions"><button class="icon-btn" data-act="task-menu" data-id="${t.id}" aria-label="Task options">${I('more', 'sm')}</button></div>
  </div>`;
}
function addTask({ title, due = null, priority = null, noteId = null }) {
  if (!title || !title.trim()) return null;
  const t = { id: uid(), title: title.trim(), due: due || null, priority: priority || null, noteId, done: false, createdAt: now(), doneAt: null };
  S.tasks.push(t); persist(); return t;
}
function refreshTaskViews() {
  renderSidebar();
  if (LIST_VIEWS.includes(ui.view)) renderExtra(); else renderPage();
}
function taskMenu(t, anchor) {
  const setDue = d => { t.due = d; persist(); refreshTaskViews(); };
  const setP = p => { t.priority = p; persist(); refreshTaskViews(); };
  showMenu(anchor, [
    { header: 'Due date' },
    { label: 'Today', icon: 'calendar', onClick: () => setDue(ymd()) },
    { label: 'Tomorrow', icon: 'calendar', onClick: () => setDue(ymd(addDays(new Date(), 1))) },
    { label: 'Next week', icon: 'calendar', onClick: () => setDue(ymd(addDays(new Date(), 7))) },
    { label: 'Pick a date…', icon: 'calendar', onClick: async () => { const v = await askText({ title: 'Due date', label: 'Date', type: 'date', value: t.due || ymd() }); if (v) setDue(v); } },
    t.due ? { label: 'Clear due date', icon: 'x', onClick: () => setDue(null) } : null,
    { header: 'Priority' },
    ...[['high', 'High'], ['med', 'Medium'], ['low', 'Low'], [null, 'None']].map(([p, l]) => ({ label: l, icon: 'flag', checked: t.priority === p, onClick: () => setP(p) })),
    { sep: true },
    { label: t.noteId ? 'Change linked note…' : 'Link to note…', icon: 'notelink', onClick: async () => { const id = await pickNote({ title: 'Link task to note' }); if (id) { t.noteId = id; persist(); refreshTaskViews(); } } },
    t.noteId ? { label: 'Unlink note', icon: 'x', onClick: () => { t.noteId = null; persist(); refreshTaskViews(); } } : null,
    { label: 'Delete task', icon: 'trash', danger: true, onClick: () => { S.tasks = S.tasks.filter(x => x.id !== t.id); persist(); refreshTaskViews(); toast('Task deleted', '', { label: 'Undo', onClick: () => { S.tasks.push(t); persist(); refreshTaskViews(); } }); } },
  ], { align: 'right' });
}

// ============================================================
// Pages
// ============================================================
function pageHead(icon, title, sub = '', actions = '') {
  return `<div class="page-head"><button class="icon-btn mobile-only" data-act="open-sidebar" aria-label="Menu">${I('menu')}</button><div style="flex:1;min-width:200px"><h1>${I(icon)}${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div>${actions}</div>`;
}
function renderPage() {
  const p = $('#page');
  const fn = { home: pageHome, tasks: pageTasks, calendar: pageCalendar, notebooks: pageNotebooks, tags: pageTags, templates: pageTemplates, settings: pageSettings }[ui.view] || pageHome;
  const st = p.scrollTop;
  p.innerHTML = `<div class="page-inner">${fn()}</div>`;
  p.scrollTop = st;
  if (ui.view === 'home') bindHome();
  if (ui.view === 'settings') bindSettings();
}
function pageHome() {
  const h = new Date().getHours();
  const greet = h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  const name = S.settings.name ? ', ' + esc(S.settings.name.split(' ')[0]) : '';
  const recent = activeNotes().sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 7);
  const openTasks = S.tasks.filter(t => !t.done).sort(taskSort).slice(0, 6);
  const pinned = activeNotes().filter(n => n.shortcut || n.pinned).slice(0, 8);
  const rems = activeNotes().filter(n => n.reminder && !n.reminder.done).sort((a, b) => a.reminder.at - b.reminder.at).slice(0, 6);
  const words = activeNotes().reduce((s, n) => s + ((n.text || '').match(/\S+/g) || []).length, 0);
  const doneWeek = S.tasks.filter(t => t.done && t.doneAt && t.doneAt > now() - 7 * DAY).length;
  return `
  <div class="hero">
    <span class="plan-badge">${I('crown', 'xs')}Professional · All features</span>
    <button class="icon-btn mobile-only" data-act="open-sidebar" style="color:#fff;margin:-6px 0 8px -6px">${I('menu')}</button>
    <h1>${greet}${name}</h1>
    <p>${new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
    <div class="hero-actions">
      <button class="btn primary" data-act="new-note">${I('plus', 'sm')}New note</button>
      <button class="btn" data-act="new-from-template">${I('template', 'sm')}From template</button>
      <button class="btn" data-act="go-task">${I('task', 'sm')}New task</button>
      <button class="btn" data-act="new-sketch">${I('pen', 'sm')}Sketch</button>
      <button class="btn" data-act="new-audio">${I('mic', 'sm')}Audio note</button>
      <button class="btn" data-act="palette">${I('zap', 'sm')}Command palette <kbd style="background:transparent;color:#fff;border-color:rgba(255,255,255,.3)">${MOD} K</kbd></button>
    </div>
  </div>
  <div class="widgets">
    <div class="card w-12"><div class="card-head"><h3>${I('note', 'sm')}Recent notes</h3><button class="btn sm ghost" data-act="nav" data-view="notes">View all</button></div>
      <div class="card-body"><div class="recent-strip">
        <div class="mini-note add" data-act="new-note">${I('plus')}<b>Create new note</b></div>
        ${recent.map(n => { const img = !n.locked && firstImage(n.html); return `<div class="mini-note" data-act="open-note" data-id="${n.id}"><b>${n.locked ? '🔒 ' : ''}${esc(n.title || 'Untitled')}</b>${img ? `<img src="${esc(img)}" alt="">` : `<p>${n.locked ? 'Encrypted note' : esc((n.text || '').slice(0, 160)) || '<span class="muted">Empty</span>'}</p>`}<small>${esc(rel(n.updatedAt))}</small></div>`; }).join('')}
      </div></div></div>
    <div class="card w-6"><div class="card-head"><h3>${I('edit', 'sm')}Scratch pad</h3><button class="btn sm ghost" data-act="scratch-save">${I('note', 'sm')}Save as note</button></div>
      <div class="card-body"><textarea class="scratch" id="scratch" placeholder="Jot something down…" aria-label="Scratch pad">${esc(S.scratch)}</textarea></div></div>
    <div class="card w-6"><div class="card-head"><h3>${I('task', 'sm')}My tasks</h3><button class="btn sm ghost" data-act="nav" data-view="tasks">View all</button></div>
      <div class="card-body"><form class="task-add" data-form="quick-task" style="margin-bottom:8px">${I('plus', 'sm')}<input type="text" name="title" placeholder="Add a task and press Enter" aria-label="New task"><input type="date" name="due" aria-label="Due date"></form>
      ${openTasks.length ? openTasks.map(t => taskRow(t)).join('') : '<div class="muted" style="padding:8px">You’re all caught up 🎉</div>'}</div></div>
    <div class="card w-4"><div class="card-head"><h3>${I('star', 'sm')}Pinned & shortcuts</h3></div><div class="card-body">
      ${pinned.length ? pinned.map(n => `<div class="list-line" data-act="open-note" data-id="${n.id}">${I(n.shortcut ? 'star' : 'pin', 'sm')}<span class="grow">${esc(n.title || 'Untitled')}</span><small>${esc(rel(n.updatedAt))}</small></div>`).join('') : '<div class="muted">Star or pin notes to see them here.</div>'}</div></div>
    <div class="card w-4"><div class="card-head"><h3>${I('bell', 'sm')}Upcoming reminders</h3></div><div class="card-body">
      ${rems.length ? rems.map(n => `<div class="list-line" data-act="open-note" data-id="${n.id}">${I('bell', 'sm')}<span class="grow">${esc(n.title || 'Untitled')}</span><small style="${n.reminder.at < now() ? 'color:var(--danger)' : ''}">${esc(new Date(n.reminder.at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }))}</small></div>`).join('') : '<div class="muted">No reminders. Use the 🔔 in any note.</div>'}</div></div>
    <div class="card w-4"><div class="card-head"><h3>${I('sparkle', 'sm')}At a glance</h3></div><div class="card-body"><div class="stat-grid">
      <div class="stat"><b>${activeNotes().length}</b><span>Notes</span></div><div class="stat"><b>${S.notebooks.length}</b><span>Notebooks</span></div>
      <div class="stat"><b>${words.toLocaleString()}</b><span>Words written</span></div><div class="stat"><b>${doneWeek}</b><span>Tasks done this week</span></div>
    </div></div></div>
    <div class="card w-12"><div class="card-head"><h3>${I('tag', 'sm')}Tags</h3><button class="btn sm ghost" data-act="nav" data-view="tags">Manage</button></div><div class="card-body"><div class="tag-cloud">
      ${allTags().map(([t, c]) => `<span class="chip" data-act="open-tag" data-tag="${esc(t)}">#${esc(t)} <span class="muted">${c}</span></span>`).join('') || '<span class="muted">Add tags to notes to organize across notebooks.</span>'}
    </div></div></div>
  </div>`;
}
function bindHome() {
  const s = $('#scratch');
  s?.addEventListener('input', () => { S.scratch = s.value; persist(); });
}
function pageTasks() {
  const today = ymd(), tomorrow = ymd(addDays(new Date(), 1)), week = ymd(addDays(new Date(), 7));
  const f = ui.taskFilter;
  let tasks = [...S.tasks];
  const filters = { all: 'All', today: 'Today', upcoming: 'Upcoming', overdue: 'Overdue', flagged: 'High priority', completed: 'Completed' };
  if (f === 'today') tasks = tasks.filter(t => !t.done && t.due && t.due <= today);
  else if (f === 'upcoming') tasks = tasks.filter(t => !t.done && t.due && t.due > today);
  else if (f === 'overdue') tasks = tasks.filter(t => !t.done && t.due && t.due < today);
  else if (f === 'flagged') tasks = tasks.filter(t => !t.done && t.priority === 'high');
  else if (f === 'completed') tasks = tasks.filter(t => t.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));
  let bodyHtml = '';
  if (f === 'all') {
    const open = tasks.filter(t => !t.done).sort(taskSort);
    const groups = [
      ['Overdue', open.filter(t => t.due && t.due < today)], ['Today', open.filter(t => t.due === today)], ['Tomorrow', open.filter(t => t.due === tomorrow)],
      ['Next 7 days', open.filter(t => t.due > tomorrow && t.due <= week)], ['Later', open.filter(t => t.due > week)], ['No date', open.filter(t => !t.due)]
    ].filter(g => g[1].length);
    bodyHtml = groups.map(([g, ts]) => `<div class="group-title">${g} <span class="muted">${ts.length}</span></div>${ts.map(t => taskRow(t)).join('')}`).join('');
    const done = tasks.filter(t => t.done);
    if (done.length) bodyHtml += `<div class="group-title"><button class="btn sm ghost" data-act="toggle-completed">${I(ui.showCompleted ? 'chevD' : 'chevR', 'xs')}Completed (${done.length})</button></div>${ui.showCompleted ? done.sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0)).map(t => taskRow(t)).join('') : ''}`;
  } else bodyHtml = (f === 'completed' ? tasks : tasks.sort(taskSort)).map(t => taskRow(t)).join('');
  if (!bodyHtml) bodyHtml = emptyState('task', f === 'completed' ? 'Nothing completed yet' : 'No tasks here', 'Add a task above to get started.');
  const open = S.tasks.filter(t => !t.done).length, overdue = S.tasks.filter(t => !t.done && t.due && t.due < today).length;
  return pageHead('task', 'Tasks', `${plural(open, 'open task')}${overdue ? ` · <span style="color:var(--danger)">${overdue} overdue</span>` : ''}`,
    S.tasks.some(t => t.done) ? `<button class="btn sm ghost" data-act="clear-completed">Clear completed</button>` : '') + `
    <div class="card"><div class="card-body" style="padding-top:16px">
      <form class="task-add" data-form="task" style="margin-bottom:14px">${I('plus', 'sm')}<input type="text" name="title" id="task-input" placeholder="Add a task — e.g. “Call the dentist”" aria-label="New task"><input type="date" name="due" aria-label="Due date"><select name="priority" aria-label="Priority"><option value="">Priority</option><option value="high">High</option><option value="med">Medium</option><option value="low">Low</option></select><button class="btn sm primary">Add</button></form>
      <div class="seg" style="flex-wrap:wrap">${Object.entries(filters).map(([k, v]) => `<button class="${f === k ? 'on' : ''}" data-act="task-filter" data-f="${k}">${v}</button>`).join('')}</div>
      <div style="margin-top:6px">${bodyHtml}</div>
    </div></div>`;
}
function pageCalendar() {
  const m = ui.calMonth, y = m.getFullYear(), mo = m.getMonth();
  const start = new Date(y, mo, 1 - new Date(y, mo, 1).getDay());
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const byDay = {};
  const push = (d, item) => (byDay[d] = byDay[d] || []).push(item);
  activeNotes().forEach(n => {
    push(ymd(new Date(n.createdAt)), { kind: 'note', n });
    if (n.reminder) push(ymd(new Date(n.reminder.at)), { kind: 'rem', n });
  });
  S.tasks.forEach(t => t.due && push(t.due, { kind: 'task', t }));
  const today = ymd();
  const cells = days.map(d => {
    const k = ymd(d), items = (byDay[k] || []).sort((a, b) => ({ rem: 0, task: 1, note: 2 }[a.kind] - { rem: 0, task: 1, note: 2 }[b.kind]));
    const shown = items.slice(0, 4);
    return `<div class="day ${d.getMonth() !== mo ? 'other' : ''} ${k === today ? 'today' : ''}"><span class="dnum">${d.getDate()}</span>
      ${shown.map(it => it.kind === 'task'
        ? `<div class="cal-item task ${it.t.done ? 'done' : ''}" data-act="task-toggle" data-id="${it.t.id}" title="Task: ${esc(it.t.title)} (click to toggle)">${I('task')}<span>${esc(it.t.title)}</span></div>`
        : `<div class="cal-item ${it.kind}" data-act="open-note" data-id="${it.n.id}" title="${it.kind === 'rem' ? 'Reminder' : 'Note created'}: ${esc(it.n.title || 'Untitled')}">${I(it.kind === 'rem' ? 'bell' : 'note')}<span>${esc(it.n.title || 'Untitled')}</span></div>`).join('')}
      ${items.length > shown.length ? `<span class="cal-more">+${items.length - shown.length} more</span>` : ''}</div>`;
  }).join('');
  const dows = Array.from({ length: 7 }, (_, i) => addDays(start, i).toLocaleDateString([], { weekday: 'short' }));
  return pageHead('calendar', m.toLocaleDateString([], { month: 'long', year: 'numeric' }), 'Notes, reminders and tasks by date',
    `<div style="display:flex;gap:6px"><button class="icon-btn" data-act="cal-prev" aria-label="Previous month">${I('chevL')}</button><button class="btn sm" data-act="cal-today">Today</button><button class="icon-btn" data-act="cal-next" aria-label="Next month">${I('chevR')}</button></div>`) +
    `<div class="legend" style="margin-bottom:10px"><span>${I('bell', 'xs')} Reminder</span><span>${I('task', 'xs')} Task due</span><span>${I('note', 'xs')} Note created</span></div>
    <div class="cal">${dows.map(d => `<div class="dow">${d}</div>`).join('')}${cells}</div>`;
}
function pageNotebooks() {
  const rows = groupStacks().map(([stack, nbs]) => (stack ? `<tr class="stack click" data-act="open-stack" data-stack="${esc(stack)}"><td colspan="3"><span class="nb-name">${I('stack', 'sm')}${esc(stack)}</span></td><td style="text-align:right"><button class="icon-btn" data-act="stack-menu" data-stack="${esc(stack)}" aria-label="Stack options">${I('more', 'sm')}</button></td></tr>` : '') +
    nbs.map(b => { const ns = activeNotes().filter(n => n.notebookId === b.id); const upd = ns.reduce((m, n) => Math.max(m, n.updatedAt), b.createdAt);
      return `<tr class="click" data-act="open-notebook" data-id="${b.id}"><td><span class="nb-name" style="${stack ? 'padding-left:22px' : ''}">${I('book', 'sm')}${esc(b.name)}${S.settings.defaultNotebook === b.id ? ' <span class="chip">Default</span>' : ''}</span></td><td>${ns.length}</td><td class="muted">${esc(rel(upd))}</td><td style="text-align:right"><button class="icon-btn" data-act="nb-menu" data-id="${b.id}" aria-label="Notebook options">${I('more', 'sm')}</button></td></tr>`; }).join('')).join('');
  return pageHead('book', 'Notebooks', `${plural(S.notebooks.length, 'notebook')} · unlimited on your plan`, `<button class="btn primary" data-act="nb-new">${I('plus', 'sm')}New notebook</button>`) +
    `<div class="card" style="overflow:hidden"><table class="table"><thead><tr><th>Name</th><th>Notes</th><th>Updated</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
function pageTags() {
  const tags = allTags();
  return pageHead('tag', 'Tags', `${plural(tags.length, 'tag')} · tag notes from the editor`) +
    (tags.length ? `<div class="card" style="overflow:hidden"><table class="table"><thead><tr><th>Tag</th><th>Notes</th><th></th><th></th></tr></thead><tbody>${tags.map(([t, c]) => `<tr class="click" data-act="open-tag" data-tag="${esc(t)}"><td><span class="nb-name">${I('tag', 'sm')}${esc(t)}</span></td><td>${c}</td><td></td><td style="text-align:right"><button class="icon-btn" data-act="tag-menu" data-tag="${esc(t)}" aria-label="Tag options">${I('more', 'sm')}</button></td></tr>`).join('')}</tbody></table></div>`
      : `<div class="card">${emptyState('tag', 'No tags yet', 'Open a note and add tags under its title.')}</div>`);
}
function tplCard(t) {
  return `<div class="tpl"><div class="tpl-prev"><div class="content"><h2 style="margin-top:0">${esc(fillTpl(t.title || t.name))}</h2>${t.html}</div></div>
    <div class="tpl-info"><b>${I(t.user ? 'star' : 'template', 'sm')}${esc(t.name)}</b><span>${esc(t.desc || '')}</span></div>
    <div class="tpl-actions"><button class="btn sm primary" data-act="tpl-use" data-id="${t.id}">Use template</button><button class="btn sm" data-act="tpl-preview" data-id="${t.id}">Preview</button>${t.user ? `<button class="icon-btn" data-act="tpl-del" data-id="${t.id}" title="Delete template" style="margin-left:auto">${I('trash', 'sm')}</button>` : ''}</div></div>`;
}
function pageTemplates() {
  return pageHead('template', 'Templates', 'Start faster with ready-made layouts — or save any note as a template') +
    (S.templates.length ? `<div class="group-title" style="margin-left:0">Your templates</div><div class="tpl-grid" style="margin-bottom:24px">${S.templates.map(tplCard).join('')}</div><div class="group-title" style="margin-left:0">Gallery</div>` : '') +
    `<div class="tpl-grid">${BUILTIN_TEMPLATES.map(tplCard).join('')}</div>`;
}
function useTemplate(id) {
  const t = allTemplates().find(x => x.id === id); if (!t) return;
  closeModal();
  createNote({ title: fillTpl(t.title || ''), html: fillTpl(t.html) });
}
function templatePicker() {
  openModal({ title: 'New from template', cls: 'xwide', body: `<div class="tpl-grid">${allTemplates().map(tplCard).join('')}</div>` });
}
function pageSettings() {
  const s = S.settings;
  const size = new Blob([JSON.stringify(S)]).size;
  const features = ['Unlimited notes & notebooks', 'Notebook stacks', 'Unlimited uploads (50 MB per file)', 'Offline access', 'Version history', 'AES-256 note encryption', 'Advanced search operators', 'Saved searches', 'Tasks with due dates & priority', 'Reminders & notifications', 'Calendar view', 'Templates gallery + custom', 'Sketches & audio notes', 'Note links & backlinks', 'Presentation mode', 'Export: HTML, Markdown, PDF', 'Full backup & restore', 'Custom themes & fonts'];
  return pageHead('settings', 'Settings', 'Personalize Inkwell') + `
  <div class="settings-grid">
    <div class="card plan-card" style="grid-column:1/-1"><div class="card-head"><h3>${I('crown', 'sm')}Inkwell Professional</h3><span class="plan-badge">Active</span></div><div class="card-body">
      <p style="margin:0 0 14px;color:rgba(255,255,255,.75)">Every premium feature is unlocked. No limits, no ads, no upgrade prompts.</p>
      <ul class="feature-list">${features.map(f => `<li>${I('check', 'sm')}${f}</li>`).join('')}</ul>
      <div style="margin-top:18px;display:grid;gap:6px"><div style="display:flex;justify-content:space-between;font-size:12.5px;color:rgba(255,255,255,.75)"><span>${I('db', 'xs')} Storage used on this device</span><span>${fmtSize(size)} · Unlimited</span></div><div class="meter"><span style="width:${Math.max(2, Math.min(100, size / 2e8 * 100))}%"></span></div></div>
    </div></div>
    <div class="card"><div class="card-head"><h3>${I('edit', 'sm')}Profile</h3></div><div class="card-body">
      <label class="field"><span>Your name</span><input class="input" data-set="name" value="${esc(s.name)}" placeholder="Shown in greetings and your avatar"></label>
    </div></div>
    <div class="card"><div class="card-head"><h3>${I('sun', 'sm')}Appearance</h3></div><div class="card-body">
      <div class="set-row"><div class="grow"><b>Theme</b></div><div class="seg">${['system', 'light', 'dark'].map(t => `<button class="${s.theme === t ? 'on' : ''}" data-act="set-theme" data-v="${t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</div></div>
      <div class="set-row"><div class="grow"><b>Accent color</b></div><div class="accents">${ACCENTS.map(c => `<button class="${s.accent === c ? 'on' : ''}" data-act="set-accent" data-v="${c}" style="background:${c}" aria-label="Accent ${c}"></button>`).join('')}</div></div>
      <div class="set-row"><div class="grow"><b>Editor font</b></div><div class="seg">${[['sans', 'Sans'], ['serif', 'Serif'], ['mono', 'Mono']].map(([v, l]) => `<button class="${s.font === v ? 'on' : ''}" data-act="set-font" data-v="${v}">${l}</button>`).join('')}</div></div>
      <div class="set-row"><div class="grow"><b>Text size</b><small>${s.fontSize}px</small></div><input type="range" min="13" max="22" value="${s.fontSize}" data-set="fontSize" aria-label="Editor text size"></div>
    </div></div>
    <div class="card"><div class="card-head"><h3>${I('note', 'sm')}Editor</h3></div><div class="card-body">
      <div class="set-row"><div class="grow"><b>Spell check</b><small>Underline misspelled words</small></div><label class="switch"><input type="checkbox" data-set="spellcheck" ${s.spellcheck ? 'checked' : ''}><span></span></label></div>
      <div class="set-row"><div class="grow"><b>Default notebook</b><small>Where new notes go</small></div><select class="select" style="width:auto" data-set="defaultNotebook">${S.notebooks.map(b => `<option value="${b.id}" ${defaultNotebookId() === b.id ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}</select></div>
      <div class="set-row"><div class="grow"><b>Reminder notifications</b><small>${'Notification' in window ? (Notification.permission === 'granted' ? 'Enabled' : Notification.permission === 'denied' ? 'Blocked in browser settings' : 'Get alerts when reminders are due') : 'Not supported in this browser'}</small></div>${'Notification' in window && Notification.permission === 'default' ? `<button class="btn sm" data-act="enable-notif">Enable</button>` : ''}</div>
    </div></div>
    <div class="card"><div class="card-head"><h3>${I('db', 'sm')}Data & backup</h3></div><div class="card-body">
      <div class="set-row"><div class="grow"><b>Export backup</b><small>Everything, as a .json file</small></div><button class="btn sm" data-act="export-backup">${I('download', 'sm')}Export</button></div>
      <div class="set-row"><div class="grow"><b>Import backup</b><small>Restore or merge a backup file</small></div><button class="btn sm" data-act="import-backup">${I('upload', 'sm')}Import</button></div>
      <div class="set-row"><div class="grow"><b>Export all notes</b><small>One Markdown file</small></div><button class="btn sm" data-act="export-md">${I('download', 'sm')}Markdown</button></div>
      <div class="set-row"><div class="grow"><b>Erase all data</b><small>Permanently delete everything on this device</small></div><button class="btn sm danger" data-act="erase-all">Erase</button></div>
    </div></div>
    <div class="card"><div class="card-head"><h3>${I('keyboard', 'sm')}Keyboard shortcuts</h3><button class="btn sm ghost" data-act="shortcuts-help">Show all</button></div><div class="card-body">${shortcutRows().slice(0, 6).map(([k, d]) => `<div class="set-row" style="padding:7px 0"><div class="grow">${d}</div><kbd>${k}</kbd></div>`).join('')}</div></div>
  </div>
  <p class="muted" style="text-align:center;margin-top:28px;font-size:12.5px">${I('logo', 'xs')} Inkwell · Your notes are stored privately in this browser and work offline.</p>`;
}
function bindSettings() {
  $$('[data-set]', $('#page')).forEach(el => {
    const k = el.dataset.set;
    const ev = el.type === 'range' ? 'input' : 'change';
    el.addEventListener(ev, () => {
      S.settings[k] = el.type === 'checkbox' ? el.checked : el.type === 'range' ? +el.value : el.value;
      applySettings(); persist(); renderSidebar();
      if (el.type === 'range') el.closest('.set-row').querySelector('small').textContent = el.value + 'px';
    });
  });
}
function shortcutRows() {
  return [
    [`${MOD} K`, 'Command palette'], [`${ALT} N`, 'New note'], [`${ALT} T`, 'New task'], ['/', 'Search notes'], [`${MOD} S`, 'Save now'], [`${MOD} .`, 'Focus mode'],
    [`${MOD} B / I / U`, 'Bold / italic / underline'], [`${MOD} Shift L`, 'Checklist'], [`${MOD} Shift K`, 'Insert link'], [`${MOD} Shift X`, 'Strikethrough'],
    [`${MOD} Shift 7 / 8`, 'Numbered / bulleted list'], [`${MOD} ${ALT} 1–3`, 'Headings'], [`${MOD} ${ALT} 0`, 'Normal text'], [`${MOD} E`, 'Inline code'],
    ['[[', 'Link to another note'], ['Tab / Shift Tab', 'Indent list · next table cell'], [`${MOD} /`, 'Show shortcuts'], ['Esc', 'Close dialogs · exit focus mode'],
  ];
}
function showShortcuts() {
  openModal({ title: 'Keyboard shortcuts', cls: 'wide', body: `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:0 24px">${shortcutRows().map(([k, d]) => `<div class="set-row" style="padding:8px 0"><div class="grow">${d}</div><kbd>${k}</kbd></div>`).join('')}</div>
    <h3 style="font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin:18px 0 8px">Search operators</h3>
    <div class="search-help">${['tag:work', '-tag:archive', 'notebook:travel', 'is:todo', 'is:done', 'is:pinned', 'is:locked', 'is:reminder', 'has:image', 'has:attachment', 'has:audio', 'has:table', 'has:sketch', 'created:today', 'updated:week', 'created:2026-01-01', 'intitle:plan', '"exact phrase"'].map(o => `<button data-op="${o}">${o}</button>`).join('')}</div>` });
}

// ---------- Backup ----------
function exportBackup() {
  flushSave();
  download(`inkwell-backup-${ymd()}.json`, JSON.stringify({ app: 'inkwell', exportedAt: new Date().toISOString(), ...S }, null, 1), 'application/json');
  toast('Backup exported');
}
async function importBackup(file) {
  let data;
  try { data = JSON.parse(await file.text()); } catch { toast('That file isn’t a valid backup', 'error'); return; }
  if (!data || !Array.isArray(data.notes) || !Array.isArray(data.notebooks)) { toast('That file isn’t an Inkwell backup', 'error'); return; }
  const clean = n => ({ ...makeNote(), ...n, tags: Array.isArray(n.tags) ? n.tags.map(String) : [], versions: Array.isArray(n.versions) ? n.versions : [], html: sanitize(n.html || ''), title: String(n.title || '') });
  const m = openModal({
    title: 'Import backup',
    body: `<p style="margin-top:0">This backup has <b>${plural(data.notes.length, 'note')}</b>, <b>${plural(data.notebooks.length, 'notebook')}</b> and <b>${plural((data.tasks || []).length, 'task')}</b>.</p><p class="muted">Merge adds anything that isn’t already here. Replace erases current data first.</p>`,
    foot: `<button class="btn" data-close>Cancel</button><button class="btn danger" data-replace>Replace all</button><button class="btn primary" data-merge>Merge</button>`
  });
  const finish = (replace) => {
    if (replace) S = { ...defaultState(), settings: { ...defaultState().settings, ...(data.settings || {}) } };
    const has = (arr, id) => arr.some(x => x.id === id);
    data.notebooks.forEach(b => { if (b && b.id && !has(S.notebooks, b.id)) S.notebooks.push({ id: b.id, name: String(b.name || 'Notebook'), stack: String(b.stack || ''), createdAt: b.createdAt || now() }); });
    if (!S.notebooks.length) ensureNotebook();
    data.notes.forEach(n => { if (n && n.id && !has(S.notes, n.id)) { const c = clean(n); if (!nbById(c.notebookId)) c.notebookId = defaultNotebookId(); c.text = c.locked ? '' : htmlText(c.html); S.notes.push(c); } });
    (data.tasks || []).forEach(t => { if (t && t.id && !has(S.tasks, t.id)) S.tasks.push({ ...t, title: String(t.title || '') }); });
    (data.templates || []).forEach(t => { if (t && t.id && !has(S.templates, t.id)) S.templates.push({ ...t, html: sanitize(t.html || ''), user: true }); });
    (data.savedSearches || []).forEach(t => { if (t && t.id && !has(S.savedSearches, t.id)) S.savedSearches.push(t); });
    if (replace && typeof data.scratch === 'string') S.scratch = data.scratch;
    ui.unlocked = {}; ui.noteId = null;
    closeModal(); applySettings(); persist(); render(true);
    toast(replace ? 'Backup restored' : 'Backup merged');
  };
  $('[data-merge]', m).onclick = () => finish(false);
  $('[data-replace]', m).onclick = async () => { closeModal(); if (await askConfirm({ title: 'Replace all data?', message: 'All current notes, notebooks and tasks will be erased and replaced by the backup.', ok: 'Replace', danger: true })) finish(true); };
}

// ============================================================
// Command palette
// ============================================================
function openPalette() {
  const cmds = [
    ['New note', 'plus', () => createNote(), `${ALT} N`], ['New from template…', 'template', templatePicker], ['New task', 'task', goTask, `${ALT} T`], ['New notebook', 'book', () => newNotebook()],
    ['New sketch note', 'pen', () => openSketch('new')], ['New audio note', 'mic', () => openRecorder('new')],
    ['Go to Home', 'home', () => nav('home')], ['Go to Notes', 'note', () => nav('notes')], ['Go to Shortcuts', 'star', () => nav('shortcuts')], ['Go to Tasks', 'task', () => nav('tasks')],
    ['Go to Calendar', 'calendar', () => nav('calendar')], ['Go to Notebooks', 'book', () => nav('notebooks')], ['Go to Tags', 'tag', () => nav('tags')], ['Go to Templates', 'template', () => nav('templates')],
    ['Go to Trash', 'trash', () => nav('trash')], ['Open Settings', 'settings', () => nav('settings')],
    ['Toggle dark mode', 'moon', themeToggle], ['Toggle focus mode', 'focus', () => { if (!LIST_VIEWS.includes(ui.view)) nav('notes'); toggleFocus(); }, `${MOD} .`],
    ['Export backup', 'download', exportBackup], ['Keyboard shortcuts', 'keyboard', showShortcuts, `${MOD} /`],
  ];
  const n = cur();
  if (n && LIST_VIEWS.includes(ui.view) && !n.trashed) cmds.push(['Present current note', 'present', () => present(n)], ['Version history of current note', 'clock', () => openHistory(n)], ['Export current note as PDF', 'printer', () => exportNote(n, 'print')]);
  let sel = 0, items = [];
  const m = openModal({
    title: null, cls: 'palette',
    body: `<div class="p-input" style="margin:-8px -18px 0">${I('zap')}<input placeholder="Search notes, notebooks, tags or type a command…" autocomplete="off" aria-label="Command palette"></div><div class="p-results" style="margin:0 -12px"></div>`,
    foot: `<div class="p-foot" style="margin:-12px -18px;border:0;width:calc(100% + 36px)"><span><kbd>↑</kbd> <kbd>↓</kbd> navigate</span><span><kbd>Enter</kbd> open</span><span><kbd>Esc</kbd> close</span></div>`
  });
  const inp = $('input', m), out = $('.p-results', m);
  const draw = () => {
    const q = inp.value.trim().toLowerCase();
    const sc = (s) => { s = s.toLowerCase(); if (!q) return 1; if (s.startsWith(q)) return 3; if (s.includes(q)) return 2; let i = 0; for (const ch of s) if (ch === q[i]) i++; return i === q.length ? 0.5 : 0; };
    const res = [];
    cmds.forEach(([label, icon, fn, kbd]) => { const s = sc(label); if (s) res.push({ label, icon, fn, kbd, s: s + (q ? 0 : -1), group: 'Commands' }); });
    if (q) {
      activeNotes().forEach(n => { const s = Math.max(sc(n.title || 'Untitled') * 1.2, (n.text || '').toLowerCase().includes(q) ? 1 : 0); if (s) res.push({ label: n.title || 'Untitled', icon: n.locked ? 'lock' : 'note', fn: () => openNote(n.id), s: s + 1, group: 'Notes', sub: nbById(n.notebookId)?.name }); });
      S.notebooks.forEach(b => { const s = sc(b.name); if (s) res.push({ label: b.name, icon: 'book', fn: () => openNotebook(b.id), s, group: 'Notebooks' }); });
      allTags().forEach(([t]) => { const s = sc(t); if (s) res.push({ label: '#' + t, icon: 'tag', fn: () => openTag(t), s, group: 'Tags' }); });
      res.push({ label: `Search all notes for “${inp.value.trim()}”`, icon: 'search', fn: () => { ui.query = inp.value.trim(); $('#side-search').value = ui.query; nav('search'); }, s: 0.1, group: 'Search' });
    } else {
      activeNotes().sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5).forEach(n => res.push({ label: n.title || 'Untitled', icon: n.locked ? 'lock' : 'note', fn: () => openNote(n.id), s: 2, group: 'Recent notes', sub: rel(n.updatedAt) }));
    }
    items = res.sort((a, b) => b.s - a.s).slice(0, 30);
    sel = Math.min(sel, Math.max(0, items.length - 1));
    let lastGroup = '';
    out.innerHTML = items.map((it, i) => { const g = it.group !== lastGroup ? `<div class="menu-label">${esc(it.group)}</div>` : ''; lastGroup = it.group; return g + `<button class="menu-item ${i === sel ? 'sel' : ''}" data-i="${i}">${I(it.icon, 'sm')}<span class="grow">${esc(it.label)}</span>${it.sub ? `<small class="muted">${esc(it.sub)}</small>` : ''}${it.kbd ? `<kbd>${esc(it.kbd)}</kbd>` : ''}</button>`; }).join('') || '<div class="empty">No results</div>';
    out.querySelector('.sel')?.scrollIntoView({ block: 'nearest' });
  };
  const run = i => { const it = items[i]; if (!it) return; closeModal(); it.fn(); };
  inp.addEventListener('input', () => { sel = 0; draw(); });
  inp.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { sel = Math.min(items.length - 1, sel + 1); draw(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); draw(); e.preventDefault(); }
    else if (e.key === 'Enter') { run(sel); e.preventDefault(); }
  });
  out.addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) run(+b.dataset.i); });
  draw(); setTimeout(() => inp.focus(), 20);
}

// ============================================================
// Navigation helpers
// ============================================================
function nav(view) {
  ui.view = view; ui.tagFilter = null; ui.mobileEditor = false;
  if (view !== 'search') { ui.query = ''; const s = $('#side-search'); if (s) s.value = ''; }
  if (!LIST_VIEWS.includes(view)) ui.focus = false;
  if (isMobile()) closeSidebar();
  render();
  $('#page').scrollTop = 0;
}
function openNotebook(id) { ui.notebookId = id; nav('notebook'); }
function openTag(t) { ui.tag = t; nav('tag'); }
function goTask() { nav('tasks'); setTimeout(() => $('#task-input')?.focus(), 30); }
function themeToggle() { S.settings.theme = effectiveDark() ? 'light' : 'dark'; applySettings(); persist(); renderSidebar(); if (ui.view === 'settings') renderPage(); }

// ============================================================
// Global event handling
// ============================================================
const ACTS = {
  'nav': el => nav(el.dataset.view),
  'open-note': el => openNote(el.dataset.id),
  'open-notebook': el => openNotebook(el.dataset.id),
  'open-stack': el => { ui.stack = el.dataset.stack; nav('stack'); },
  'open-tag': el => openTag(el.dataset.tag),
  'open-saved': el => { const s = S.savedSearches.find(x => x.id === el.dataset.id); if (s) { ui.query = s.query; $('#side-search').value = s.query; nav('search'); } },
  'toggle-expand': (el, e) => { e.stopPropagation(); ui.expanded[el.dataset.key] = !ui.expanded[el.dataset.key]; renderSidebar(); },
  'new-note': () => createNote(),
  'new-menu': el => showMenu(el, [
    { label: 'New note', icon: 'note', kbd: `${ALT} N`, onClick: () => createNote() },
    { label: 'From template…', icon: 'template', onClick: templatePicker },
    { label: 'New task', icon: 'task', kbd: `${ALT} T`, onClick: goTask },
    { label: 'New notebook', icon: 'book', onClick: () => newNotebook() },
    { sep: true },
    { label: 'Sketch note', icon: 'pen', onClick: () => openSketch('new') },
    { label: 'Audio note', icon: 'mic', onClick: () => openRecorder('new') },
    { label: 'Note from files…', icon: 'clip', onClick: () => { ui.filesToNew = true; $('#file-any').click(); } },
  ], { align: 'right' }),
  'new-from-template': templatePicker,
  'new-sketch': () => openSketch('new'),
  'new-audio': () => openRecorder('new'),
  'go-task': goTask,
  'palette': openPalette,
  'open-sidebar': openSidebar,
  'close-sidebar': closeSidebar,
  'theme-toggle': themeToggle,
  'sort-menu': el => showMenu(el, [{ header: 'Sort by' }, ...[['updated', 'Last edited'], ['created', 'Date created (newest)'], ['created-asc', 'Date created (oldest)'], ['title', 'Title (A–Z)']].map(([v, l]) => ({ label: l, checked: S.settings.sort === v, onClick: () => { S.settings.sort = v; persist(); renderList(); } }))], { align: 'right' }),
  'layout-menu': el => showMenu(el, [{ header: 'View as' }, ...[['snippet', 'Snippets', 'rows'], ['cards', 'Cards', 'grid'], ['compact', 'Compact list', 'list']].map(([v, l, i]) => ({ label: l, icon: i, checked: S.settings.listLayout === v, onClick: () => { S.settings.listLayout = v; persist(); renderList(); } }))], { align: 'right' }),
  'filter-menu': el => { const tags = allTags(); showMenu(el, [{ header: 'Filter by tag' }, ...(tags.length ? tags.map(([t, c]) => ({ label: `#${t} (${c})`, checked: ui.tagFilter === t, onClick: () => { ui.tagFilter = ui.tagFilter === t ? null : t; renderList(); renderEditor(); } })) : [{ header: 'No tags yet' }]), ...(ui.tagFilter ? [{ sep: true }, { label: 'Clear filter', icon: 'x', onClick: () => { ui.tagFilter = null; renderList(); renderEditor(); } }] : [])], { align: 'right' }); },
  'clear-filter': () => { ui.tagFilter = null; renderList(); renderEditor(); },
  'nb-menu': (el, e) => { e.stopPropagation(); const b = nbById(el.dataset.id); if (b) notebookMenu(b, el); },
  'stack-menu': (el, e) => { e.stopPropagation(); stackMenu(el.dataset.stack || ui.stack, el); },
  'tag-menu': (el, e) => { e.stopPropagation(); tagMenu(el.dataset.tag, el); },
  'nb-new': () => newNotebook(),
  'empty-trash': async () => {
    const tr = S.notes.filter(n => n.trashed);
    if (!await askConfirm({ title: 'Empty Trash?', message: `${plural(tr.length, 'note')} will be permanently deleted.`, ok: 'Empty Trash', danger: true })) return;
    const ids = new Set(tr.map(n => n.id));
    S.notes = S.notes.filter(n => !n.trashed);
    S.tasks.forEach(t => { if (ids.has(t.noteId)) t.noteId = null; });
    ui.noteId = null; persist(); render(true); toast('Trash emptied');
  },
  'save-search': async () => {
    const name = await askText({ title: 'Save search', label: 'Name', value: ui.query, ok: 'Save' });
    if (!name) return;
    S.savedSearches.push({ id: uid(), name, query: ui.query }); persist(); renderSidebar(); toast('Search saved to sidebar');
  },
  'search-op': el => { const s = $('#side-search'); s.value = (s.value.trim() + ' ' + el.dataset.op).trim(); s.focus(); s.dispatchEvent(new Event('input')); },
  // Editor
  'ed-back': () => { ui.mobileEditor = false; render(); },
  'ed-nb': el => moveNote(cur(), el),
  'ed-reminder': el => reminderMenu(cur(), el),
  'ed-shortcut': () => { const n = cur(); n.shortcut = !n.shortcut; persist(); refreshEdChrome(); renderSidebar(); toast(n.shortcut ? 'Added to shortcuts' : 'Removed from shortcuts'); },
  'ed-pin': () => { const n = cur(); n.pinned = !n.pinned; persist(); refreshEdChrome(); renderList(); },
  'ed-lock': el => lockFlow(cur(), el),
  'ed-share': el => shareMenu(cur(), el),
  'ed-more': el => noteMenu(cur(), el),
  'ed-focus': toggleFocus,
  'lock-now': () => { const n = cur(); flushEncrypt(n).then(() => { delete ui.unlocked[n.id]; renderEditor(true); renderList(); }); },
  'remove-tag': el => { const n = cur(); n.tags = n.tags.filter(t => t !== el.dataset.tag); touch(n, false); renderTags(); renderSidebar(); },
  'restore-note': () => restoreNote(cur()),
  'delete-forever': () => deleteForever(cur()),
  'rem-done': () => { const n = cur(); n.reminder.done = true; persist(); refreshEdChrome(); refreshList(); toast('Reminder marked as done'); },
  'rem-clear': () => { const n = cur(); n.reminder = null; persist(); refreshEdChrome(); refreshList(); },
  // Tasks
  'task-toggle': (el, e) => { e.stopPropagation(); const t = S.tasks.find(x => x.id === el.dataset.id); if (!t) return; t.done = !t.done; t.doneAt = t.done ? now() : null; persist(); refreshTaskViews(); },
  'task-menu': (el, e) => { e.stopPropagation(); const t = S.tasks.find(x => x.id === el.dataset.id); if (t) taskMenu(t, el); },
  'task-filter': el => { ui.taskFilter = el.dataset.f; renderPage(); },
  'toggle-completed': () => { ui.showCompleted = !ui.showCompleted; renderPage(); },
  'clear-completed': async () => { const n = S.tasks.filter(t => t.done).length; if (!await askConfirm({ title: 'Clear completed tasks?', message: `${plural(n, 'completed task')} will be deleted.`, ok: 'Clear' })) return; S.tasks = S.tasks.filter(t => !t.done); persist(); refreshTaskViews(); },
  'scratch-save': () => {
    const v = S.scratch.trim(); if (!v) { toast('Scratch pad is empty', 'error'); return; }
    const lines = v.split('\n');
    S.scratch = ''; persist();
    createNote({ title: lines[0].slice(0, 80), html: lines.slice(1).map(l => `<p>${esc(l) || '<br>'}</p>`).join('') || '<p><br></p>' });
  },
  // Calendar
  'cal-prev': () => { ui.calMonth = new Date(ui.calMonth.getFullYear(), ui.calMonth.getMonth() - 1, 1); renderPage(); },
  'cal-next': () => { ui.calMonth = new Date(ui.calMonth.getFullYear(), ui.calMonth.getMonth() + 1, 1); renderPage(); },
  'cal-today': () => { const d = new Date(); ui.calMonth = new Date(d.getFullYear(), d.getMonth(), 1); renderPage(); },
  // Templates
  'tpl-use': el => useTemplate(el.dataset.id),
  'tpl-preview': el => { const t = allTemplates().find(x => x.id === el.dataset.id); if (!t) return; openModal({ title: esc(t.name), cls: 'wide', body: `<div class="content" style="min-height:0"><h1 style="margin-top:0">${esc(fillTpl(t.title || ''))}</h1>${fillTpl(t.html)}</div>`, foot: `<button class="btn" data-close>Close</button><button class="btn primary" data-act="tpl-use" data-id="${t.id}">Use template</button>` }); },
  'tpl-del': async el => { const t = S.templates.find(x => x.id === el.dataset.id); if (!t) return; if (!await askConfirm({ title: 'Delete template?', message: `“${esc(t.name)}” will be deleted.`, ok: 'Delete', danger: true })) return; S.templates = S.templates.filter(x => x.id !== t.id); persist(); renderPage(); },
  // Settings
  'set-theme': el => { S.settings.theme = el.dataset.v; applySettings(); persist(); renderPage(); renderSidebar(); },
  'set-accent': el => { S.settings.accent = el.dataset.v; applySettings(); persist(); renderPage(); },
  'set-font': el => { S.settings.font = el.dataset.v; persist(); renderPage(); },
  'enable-notif': () => Notification.requestPermission().then(() => renderPage()),
  'export-backup': exportBackup,
  'import-backup': () => $('#file-import').click(),
  'export-md': () => exportNotesMd(activeNotes().sort((a, b) => b.updatedAt - a.updatedAt), 'Inkwell notes'),
  'erase-all': async () => {
    if (!await askConfirm({ title: 'Erase all data?', message: 'Every note, notebook, task and setting on this device will be permanently deleted. Consider exporting a backup first.', ok: 'Erase everything', danger: true })) return;
    S = defaultState(); seed(); ui.unlocked = {}; ui.noteId = null; applySettings(); await flushSave(); nav('home'); toast('All data erased');
  },
  'shortcuts-help': showShortcuts,
};

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el || el.closest('.content[contenteditable="true"]')) return;
  const fn = ACTS[el.dataset.act];
  if (fn) { e.preventDefault(); fn(el, e); }
});
document.addEventListener('contextmenu', e => {
  const item = e.target.closest('.note-item');
  if (item) { e.preventDefault(); const n = noteById(item.dataset.id); if (n) noteMenu(n, null, { x: e.clientX, y: e.clientY }); }
});
document.addEventListener('keydown', e => {
  if (e.target.closest?.('.note-item') && e.key === 'Enter') { openNote(e.target.closest('.note-item').dataset.id); }
});
document.addEventListener('submit', e => {
  const f = e.target.closest('[data-form]'); if (!f) return;
  e.preventDefault();
  const kind = f.dataset.form, title = f.title?.value || f.elements.title?.value;
  if (kind === 'note-task') { if (addTask({ title, due: f.elements.due.value, noteId: ui.noteId })) { renderExtra(); renderSidebar(); $('#editor .ed-extra input[name=title]')?.focus(); } }
  if (kind === 'quick-task' || kind === 'task') {
    if (addTask({ title, due: f.elements.due?.value, priority: f.elements.priority?.value })) { renderPage(); renderSidebar(); (kind === 'task' ? $('#task-input') : $('[data-form="quick-task"] input[name=title]'))?.focus(); }
  }
});
document.addEventListener('keydown', e => { const inp = e.target.closest?.('[data-form] input'); if (inp && e.key === 'Enter' && !e.isComposing) { e.preventDefault(); inp.form.requestSubmit(); } });
// Inline task title editing
document.addEventListener('keydown', e => { const t = e.target.closest?.('[data-task-title]'); if (t && e.key === 'Enter') { e.preventDefault(); t.blur(); } if (t && e.key === 'Escape') { const task = S.tasks.find(x => x.id === t.dataset.taskTitle); t.textContent = task?.title || ''; t.blur(); } });
document.addEventListener('focusout', e => {
  const t = e.target.closest?.('[data-task-title]'); if (!t) return;
  const task = S.tasks.find(x => x.id === t.dataset.taskTitle); if (!task) return;
  const v = t.textContent.trim();
  if (!v) { t.textContent = task.title; return; }
  if (v !== task.title) { task.title = v; persist(); }
});
// Close menus
document.addEventListener('mousedown', e => { if (ui.menu && !ui.menu.contains(e.target)) closeMenu(); }, true);
window.addEventListener('resize', () => closeMenu());
document.addEventListener('scroll', e => { if (ui.menu && !ui.menu.contains(e.target)) closeMenu(); }, true);

// Global shortcuts
document.addEventListener('keydown', e => {
  const mod = e.metaKey || e.ctrlKey;
  const typing = e.target.closest?.('input,textarea,select,[contenteditable="true"]');
  if (e.key === 'Escape') {
    if (ui.menu) { closeMenu(); return; }
    if (!$('#overlay').hidden) { closeModal(); return; }
    if (ui.focus) { toggleFocus(); return; }
    if ($('#app').classList.contains('sidebar-open')) { closeSidebar(); return; }
  }
  if (mod && (e.key === 'k' || e.key === 'K') && !e.shiftKey) { e.preventDefault(); if (!$('#overlay').hidden) closeModal(); else openPalette(); return; }
  if (mod && (e.key === 's' || e.key === 'S')) { e.preventDefault(); flushSave().then(() => toast('All changes saved')); return; }
  if (mod && e.key === '.') { e.preventDefault(); if (!LIST_VIEWS.includes(ui.view)) nav('notes'); toggleFocus(); return; }
  if (mod && e.key === '/') { e.preventDefault(); showShortcuts(); return; }
  if (mod && (e.key === 'p' || e.key === 'P') && LIST_VIEWS.includes(ui.view) && cur() && !cur().trashed) { e.preventDefault(); exportNote(cur(), 'print'); return; }
  if (e.altKey && !mod && (e.code === 'KeyN')) { e.preventDefault(); createNote(); return; }
  if (e.altKey && !mod && (e.code === 'KeyT')) { e.preventDefault(); goTask(); return; }
  if (!typing && $('#overlay').hidden && e.key === '/') { e.preventDefault(); if (isMobile()) openSidebar(); $('#side-search').focus(); return; }
  if (!typing && $('#overlay').hidden && LIST_VIEWS.includes(ui.view) && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'j' || e.key === 'k')) {
    const notes = listNotes(); const i = notes.findIndex(n => n.id === ui.noteId);
    const next = notes[Math.max(0, Math.min(notes.length - 1, i + (e.key === 'ArrowDown' || e.key === 'j' ? 1 : -1)))];
    if (next) { e.preventDefault(); ui.noteId = next.id; render(); $(`.note-item[data-id="${next.id}"]`)?.scrollIntoView({ block: 'nearest' }); }
  }
});

// File inputs
$('#file-image').addEventListener('change', e => { const files = [...e.target.files]; e.target.value = ''; focusBody(); handleFiles(files); });
$('#file-any').addEventListener('change', e => {
  const files = [...e.target.files]; e.target.value = '';
  if (ui.filesToNew) { ui.filesToNew = false; if (!files.length) return; createNote({ title: files.length === 1 ? files[0].name : `${files.length} files` }); setTimeout(() => { focusBody(); handleFiles(files); }, 60); return; }
  focusBody(); handleFiles(files);
});
$('#file-import').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; if (f) importBackup(f); });
// Search operators inside the shortcuts dialog
$('#overlay').addEventListener('click', e => { const b = e.target.closest('.search-help [data-op]'); if (b) { closeModal(); const s = $('#side-search'); s.value = b.dataset.op; if (isMobile()) openSidebar(); s.focus(); s.dispatchEvent(new Event('input')); } });

// Persist safety
window.addEventListener('beforeunload', e => { if (ui.dirty) { flushSave(); e.preventDefault(); e.returnValue = ''; } });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && ui.dirty) flushSave(); });
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => renderSidebar());
window.addEventListener('hashchange', () => { const m = location.hash.match(/^#note-(.+)$/); if (m && noteById(m[1])) openNote(m[1]); });

// ============================================================
// Reminders
// ============================================================
function checkReminders() {
  let changed = false;
  for (const n of activeNotes()) {
    const r = n.reminder;
    if (r && !r.done && !r.notified && r.at <= now()) {
      r.notified = true; changed = true;
      toast(`⏰ Reminder: ${n.title || 'Untitled'}`, '', { label: 'Open', onClick: () => openNote(n.id) });
      if ('Notification' in window && Notification.permission === 'granted') {
        try { const no = new Notification('Inkwell reminder', { body: n.title || 'Untitled', icon: 'icon.svg', tag: n.id }); no.onclick = () => { window.focus(); openNote(n.id); }; } catch { }
      }
    }
  }
  if (changed) { persist(); if (LIST_VIEWS.includes(ui.view)) refreshEdChrome(); else if (ui.view === 'home') renderPage(); }
}

// ============================================================
// Boot
// ============================================================
async function boot() {
  try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch { }
  buildSidebarShell();
  await DB.open();
  const saved = await DB.get('state');
  if (saved && Array.isArray(saved.notes)) {
    S = { ...defaultState(), ...saved, settings: { ...defaultState().settings, ...(saved.settings || {}) } };
    if (!S.notebooks.length) ensureNotebook();
  } else { seed(); await flushSave(); }
  applySettings();
  const m = location.hash.match(/^#note-(.+)$/);
  if (m && noteById(m[1])) { ui.view = 'notes'; ui.noteId = m[1]; }
  render();
  setSync('saved');
  checkReminders();
  setInterval(checkReminders, 20000);
  setInterval(() => { if (LIST_VIEWS.includes(ui.view)) updateStatus(); }, 60000);
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}
boot();
})();
