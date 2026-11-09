'use strict';
/* Klassenbuch – läuft komplett lokal. Keine Netzwerkanfragen, keine externen Dienste. */

// Öffentlicher Lizenzschlüssel. Lizenzen können nur mit dem passenden privaten Schlüssel
// (im Ordner "PRIVAT-nicht-hochladen") erzeugt werden.
const PUBLIC_KEY = {
  kty: 'EC', crv: 'P-256',
  x: 'kHkzCWyGjuxGxGf_3AMH2F_MKEWEjH1hfCnBf7K1Imo',
  y: 'Fv556fMFzralLJTUqYxNxI68b9Fd4ctkLzgn07BzKj0'
};
const APP_VERSION = '2.7';

const TYPES = {
  ma: { label: 'Mitarbeit', long: 'Mitarbeit', icon: 'spark', vals: [['+', '+', 'g'], ['~', '~', 'm'], ['-', '−', 'b']] },
  mu: { label: 'Mündlich', long: 'Mündliche Wiederholung', icon: 'speech', vals: grades() },
  sw: { label: 'Schriftlich', long: 'Schriftliche Wiederholung', icon: 'pen', vals: grades() },
  hu: { label: 'Hausübung', long: 'Hausübung', icon: 'book', vals: [['y', '✓', 'g'], ['n', '✗', 'b']] },
  vh: { label: 'Verhalten', long: 'Verhalten', icon: 'smile', multi: true, vals: [['pp', 'sehr gut', 'g'], ['p', 'gut', 'g'], ['n', 'weniger gut', 'm'], ['nn', 'schlecht', 'b']] }
};
// Vier Smiley-Stufen für Verhalten
const VH_LEVELS = ['pp', 'p', 'n', 'nn'];
const VH_NUM = { pp: 1, p: 2, n: 4, nn: 5 };
const FACE = {
  pp: '<path d="M7.6 13.2h8.8a4.4 4.4 0 0 1-8.8 0z" fill="currentColor" stroke-width="1.6"/><path d="M8.3 9.8q1.2-1.6 2.4 0M13.3 9.8q1.2-1.6 2.4 0"/>',
  p: '<path d="M8.4 13.8a4.3 4.3 0 0 0 7.2 0"/><path d="M9.3 9.6h.01M14.7 9.6h.01" stroke-width="2.8"/>',
  n: '<path d="M8.8 15.4h6.4"/><path d="M9.3 9.6h.01M14.7 9.6h.01" stroke-width="2.8"/>',
  nn: '<path d="M8.4 16.4a4.3 4.3 0 0 1 7.2 0"/><path d="M8.2 8.4l2.4 1.2M15.8 8.4l-2.4 1.2"/><path d="M9.4 11.1h.01M14.6 11.1h.01" stroke-width="2.6"/>'
};
const face = (v, size = 24) => `<svg class="sym" viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/>${FACE[v] || FACE.p}</svg>`;
const vhLabel = v => (TYPES.vh.vals.find(x => x[0] === v) || ['', v])[1];
const vhCls = v => (TYPES.vh.vals.find(x => x[0] === v) || ['', '', 'm'])[2];
const vhPol = v => v === 'pp' || v === 'p' ? 'p' : 'n';
function vhCounts(list) {
  const items = VH_LEVELS.filter(v => list[v]).map(v => `<span class="vhc ${vhCls(v)}">${face(v, 15)}${list[v]}</span>`);
  return items.length ? `<span class="vhrow">${items.join('')}</span>` : '';
}
const VH_TAGS = {
  p: ['Hilfsbereit', 'Engagiert', 'Konzentriert', 'Rücksichtsvoll', 'Selbstständig', 'Gute Teamarbeit'],
  n: ['Stört den Unterricht', 'Unaufmerksam', 'Material vergessen', 'Zu spät', 'Handy', 'Respektlos']
};
function grades() { return [['1', '1', 'g'], ['2', '2', 'g'], ['3', '3', 'm'], ['4', '4', 'm'], ['5', '5', 'b']]; }
// Symbole als Vektorgrafik: dadurch sitzen +, ~, −, ✓ und ✗ in jeder Schrift exakt in der Mitte
const SYM = {
  '+': '<path d="M12 5.5v13M5.5 12h13"/>',
  '−': '<path d="M5.5 12h13"/>',
  '~': '<path d="M4.5 13.4c1.7-2.4 3.6-2.9 5.8-1.6l1.4.8c2.2 1.3 4.1.8 5.8-1.6"/>',
  '✓': '<path d="M5.5 12.5l4.2 4.2 8.8-9.2"/>',
  '✗': '<path d="M7 7l10 10M17 7L7 17"/>'
};
const glyph = (l, size = 17) => SYM[l]
  ? `<svg class="sym" viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${SYM[l]}</svg>`
  : `<span class="digit">${l}</span>`;
const valInfo = (t, v) => (SCALABLE.includes(t) ? [...SCALES.grade, ...SCALES.pm] : TYPES[t] ? TYPES[t].vals : []).find(x => x[0] === v) || [v, v, 'm'];

/* ---------- Bewertung: Notenskala & Gewichtung (je Klasse) ---------- */
const SCALES = { grade: grades(), pm: [['+', '+', 'g'], ['~', '~', 'm'], ['-', '−', 'b']] };
const SCALABLE = ['ma', 'mu', 'sw'];
const DEFAULT_CFG = { scale: { ma: 'pm', mu: 'grade', sw: 'grade' }, weight: { ma: 30, mu: 30, sw: 40, hu: 0, vh: 0 } };
const NUM = { '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '+': 1, '~': 3, '-': 5, y: 1, p: 1, n: 5 };
const SHORT = { ma: 'Mitarbeit', mu: 'Mündl.', sw: 'Schriftl.', hu: 'HÜ', vh: 'Verhalten' };
function cfg(c) {
  if (!c.cfg) c.cfg = JSON.parse(JSON.stringify(DEFAULT_CFG));
  c.cfg.scale = Object.assign({}, DEFAULT_CFG.scale, c.cfg.scale);
  c.cfg.weight = Object.assign({}, DEFAULT_CFG.weight, c.cfg.weight);
  return c.cfg;
}
const scaleOf = (c, t) => SCALABLE.includes(t) ? cfg(c).scale[t] : null;
const valsFor = (c, t) => SCALABLE.includes(t) ? SCALES[cfg(c).scale[t]] : TYPES[t].vals;
const toPm = v => ({ '1': '+', '2': '+', '3': '~', '4': '-', '5': '-' }[v] || v);
const fmtW = w => w === 0.5 ? '½' : String(w).replace('.', ',');
function weightSummary(c) {
  const w = cfg(c).weight, sum = Object.values(w).reduce((a, b) => a + b, 0);
  if (!sum) return 'Keine Gewichtung festgelegt';
  return Object.keys(TYPES).filter(k => w[k] > 0).map(k => `${TYPES[k].label} ${Math.round(w[k] / sum * 100)} %`).join(' · ');
}

/* ---------- Hilfsfunktionen ---------- */
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const isoDate = d => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 10); };
const today = () => isoDate(new Date());
const dt = iso => new Date(iso + 'T12:00');
const fmtDay = iso => dt(iso).toLocaleDateString('de-AT', { weekday: 'short', day: 'numeric', month: 'numeric' });
const fmtDayLong = iso => dt(iso).toLocaleDateString('de-AT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const fmtDayHead = iso => dt(iso).toLocaleDateString('de-AT', { weekday: 'long', day: 'numeric', month: 'long' });
const fmtNum = n => n.toFixed(1).replace('.', ',');
const byName = (a, b) => a.name.localeCompare(b.name, 'de', { sensitivity: 'base', numeric: true });
const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } };
const b64uDec = s => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return Uint8Array.from(atob(s), c => c.charCodeAt(0)); };
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
function shiftDay(iso, n) { const d = dt(iso); d.setDate(d.getDate() + n); return isoDate(d); }
function dayWord(iso) {
  const t = today();
  if (iso === t) return 'Heute';
  if (iso === shiftDay(t, -1)) return 'Gestern';
  if (iso === shiftDay(t, 1)) return 'Morgen';
  return dt(iso).toLocaleDateString('de-AT', { weekday: 'long' });
}
function shortDay(iso) { const w = dayWord(iso); return ['Heute', 'Gestern', 'Morgen'].includes(w) ? w : dt(iso).toLocaleDateString('de-AT', { day: 'numeric', month: 'numeric' }); }
function relDay(iso) { const w = dayWord(iso); return ['Heute', 'Gestern', 'Morgen'].includes(w) ? w.toLowerCase() : 'am ' + fmtDay(iso); }
function avc(s) { let h = 0; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return 'c' + (h % 8); }
function initials(name) { const p = String(name).trim().split(/\s+/); return ((p[0] || '')[0] || '').toUpperCase() + ((p[1] || '')[0] || '').toUpperCase(); }
function shortClass(name) { const w = String(name).trim().split(/\s+/)[0] || ''; return w.length <= 4 ? w : w.slice(0, 3); }

const svg = (d, s = 20, w = 2) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const ICON = {
  gear: svg('<circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>', 23, 1.7),
  more: '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="currentColor"><circle cx="5" cy="12" r="1.9"/><circle cx="12" cy="12" r="1.9"/><circle cx="19" cy="12" r="1.9"/></svg>',
  plus: svg('<path d="M12 5v14M5 12h14"/>', 20, 2.2),
  merge: svg('<circle cx="6.5" cy="6" r="2.2"/><circle cx="6.5" cy="18" r="2.2"/><circle cx="17.5" cy="12" r="2.2"/><path d="M6.5 8.2v7.6M8.6 6.6c4 .8 5.6 2.5 6.8 4.2M8.6 17.4c4-.8 5.6-2.5 6.8-4.2"/>', 19, 1.9),
  check: svg('<path d="M6 12.5l4 4 8-8.5"/>', 15, 2.8),
  down: svg('<path d="M6.5 9.5L12 15l5.5-5.5"/>', 18, 2.2),
  left: svg('<path d="M14.5 5.5L8 12l6.5 6.5"/>', 22, 2.2),
  right: svg('<path d="M9.5 5.5L16 12l-6.5 6.5"/>', 22, 2.2),
  chev: '<svg class="chev" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 5.5L16 12l-6.5 6.5"/></svg>',
  spark: svg('<path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9z"/><path d="M18.5 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>', 18, 1.8),
  speech: svg('<path d="M20 12.5a7.5 7.5 0 0 1-11 6.6L4 20l1.1-4.2A7.5 7.5 0 1 1 20 12.5z"/>', 18, 1.8),
  pen: svg('<path d="M4 20h4L19.2 8.8a2.8 2.8 0 0 0-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>', 18, 1.8),
  book: svg('<path d="M4.5 5.5A2.5 2.5 0 0 1 7 3h12.5v15H7a2.5 2.5 0 0 0-2.5 2.5z"/><path d="M4.5 20.5A2.5 2.5 0 0 1 7 18h12.5v3H7"/>', 18, 1.8),
  smile: svg('<circle cx="12" cy="12" r="8.5"/><path d="M8.5 14a4.2 4.2 0 0 0 7 0"/><path d="M9.2 9.6h.01M14.8 9.6h.01" stroke-width="2.6"/>', 18, 1.8),
  upload: svg('<path d="M12 15V4M7.5 8.5L12 4l4.5 4.5"/><path d="M4.5 15v3.5A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5V15"/>', 19, 2),
  download: svg('<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5"/><path d="M4.5 15v3.5A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5V15"/>', 19, 2),
  key: svg('<circle cx="8" cy="15" r="4"/><path d="M11 12l8.5-8.5M16.5 6.5l2.5 2.5M14.5 8.5l2 2"/>', 18, 1.9),
  shield: svg('<path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.2-7.5 9.5-4.3-1.3-7.5-4.9-7.5-9.5V6z"/><path d="M9 12l2 2 4-4"/>', 18, 1.9),
  trash: svg('<path d="M4.5 7h15M10 11v6M14 11v6M6 7l1 12.5A1.5 1.5 0 0 0 8.5 21h7a1.5 1.5 0 0 0 1.5-1.5L18 7M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7"/>', 18, 1.9),
  frown: svg('<circle cx="12" cy="12" r="8.5"/><path d="M8.5 16a4.2 4.2 0 0 1 7 0"/><path d="M9.2 9.6h.01M14.8 9.6h.01" stroke-width="2.6"/>', 18, 1.8),
  tUp: svg('<path d="M5 16.5L10.5 11l3.5 3.5L19.5 9"/><path d="M14.5 9h5v5"/>', 17, 2.2),
  tDown: svg('<path d="M5 7.5l5.5 5.5 3.5-3.5 5.5 5.5"/><path d="M14.5 15h5v-5"/>', 17, 2.2),
  tFlat: svg('<path d="M4.5 12h14"/><path d="M15 8.5l3.5 3.5-3.5 3.5"/>', 17, 2.2),
  sliders: svg('<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>', 19, 2),
  close: svg('<path d="M7 7l10 10M17 7L7 17"/>', 18, 2),
  info: svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01" stroke-width="2.4"/>', 18, 1.9)
};

/* ---------- Speicher (IndexedDB, nur auf diesem Gerät) ---------- */
const DB = {
  db: null,
  open() {
    return new Promise((res, rej) => {
      const r = indexedDB.open('klassenbuch', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => { this.db = r.result; res(); };
      r.onerror = () => rej(r.error);
    });
  },
  get(k) {
    return new Promise((res, rej) => {
      const q = this.db.transaction('kv').objectStore('kv').get(k);
      q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error);
    });
  },
  set(k, v) {
    return new Promise((res, rej) => {
      const tx = this.db.transaction('kv', 'readwrite');
      tx.objectStore('kv').put(v, k);
      tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error);
    });
  }
};

let data = { classes: [], entries: [] };
let license = null;
let lockMsg = '';
const ui = Object.assign({ tab: 'e', type: 'ma', filter: 'all' }, lsGet('kb.ui', {}));
ui.date = today(); // beim Start immer heute
if (!TYPES[ui.type]) ui.type = 'ma';
if (ui.filter !== 'all' && !TYPES[ui.filter]) ui.filter = 'all';

async function save() {
  try { await DB.set('data', data); }
  catch (e) { toast('Speichern fehlgeschlagen: ' + e.message); }
}
const saveUi = () => lsSet('kb.ui', { tab: ui.tab, type: ui.type, filter: ui.filter });

const getClass = id => data.classes.find(c => c.id === id);
const entriesOf = (cid, sid) => data.entries.filter(e => e.c === cid && (!sid || e.s === sid));

/* ---------- Lizenz ---------- */
async function verifyLicense(code) {
  try {
    code = String(code).replace(/\s+/g, '');
    const [pre, p, s] = code.split('.');
    if (pre !== 'KB1' || !p || !s) return { error: 'Das ist kein gültiger Lizenzcode.' };
    if (!crypto.subtle) return { error: 'Dieser Browser unterstützt keine Lizenzprüfung (nur über https möglich).' };
    const key = await crypto.subtle.importKey('jwk', PUBLIC_KEY, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    const ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, b64uDec(s), new TextEncoder().encode(pre + '.' + p));
    if (!ok) return { error: 'Der Lizenzcode ist ungültig.' };
    const info = JSON.parse(new TextDecoder().decode(b64uDec(p)));
    if (info.x && info.x < today()) return { error: 'Diese Lizenz ist am ' + fmtDayLong(info.x) + ' abgelaufen.' };
    return { info, code };
  } catch {
    return { error: 'Der Lizenzcode ist ungültig.' };
  }
}

function viewLock() {
  setHeader({});
  return `
    <div class="lock">
      <img class="lock-logo" src="icon-512.png" alt="">
      <h1>Klassenbuch</h1>
      <p>Gib deinen persönlichen Lizenzcode ein, um die App freizuschalten.</p>
      <textarea id="lic" placeholder="Lizenzcode hier einfügen" autocapitalize="off" autocomplete="off" autocorrect="off" spellcheck="false"></textarea>
      <p class="err">${esc(lockMsg)}</p>
      <button class="btn primary block" data-a="activate">Freischalten</button>
      <p class="fine">Hast du die App auf dem Home-Bildschirm installiert, gib den Code direkt in der installierten App ein.<br>Alle Daten bleiben ausschließlich auf diesem Gerät.</p>
    </div>`;
}

/* ---------- Kopfzeile ---------- */
function setHeader({ title = '', back = null, backLabel = '', act = null } = {}) {
  $('#title').textContent = title;
  const b = $('#back'), a = $('#act');
  b.hidden = !back;
  if (back) { b.href = back; $('#backlabel').textContent = backLabel; }
  a.hidden = !act;
  if (act) { a.innerHTML = ICON[act.icon]; a.dataset.a = act.a; a.setAttribute('aria-label', act.label || ''); }
  document.title = title && title !== 'Klassen' ? title + ' – Klassenbuch' : 'Klassenbuch';
}
const main = $('#main');
const onScroll = () => $('#top').classList.toggle('scrolled', main.scrollTop > 44);
main.addEventListener('scroll', onScroll, { passive: true });

/* ---------- Routing ---------- */
let lastKey = '';
function render() {
  const v = $('#view');
  const [view, a, b] = location.hash.replace(/^#\/?/, '').split('/');
  let key, html;
  if (!license) { key = 'lock'; html = viewLock(); }
  else if (view === 'k' && getClass(a)) { key = 'k' + a; html = viewClass(getClass(a)); }
  else if (view === 's' && getClass(a) && getClass(a).students.find(s => s.id === b)) { key = 's' + b; html = viewStudent(getClass(a), b); }
  else if (view === 'b' && getClass(a)) { key = 'b' + a; html = viewRating(getClass(a)); }
  else if (view === 'neu' && data.classes.length) { key = 'neu' + (a || ''); html = viewCompose(a ? getClass(a) : null); }
  else if (view === 'einstellungen') { key = 'set'; html = viewSettings(); }
  else {
    if (location.hash && location.hash !== '#/') history.replaceState(null, '', '#/');
    key = 'home'; html = viewHome();
  }
  v.innerHTML = html;
  if (key !== lastKey) { v.classList.remove('enter'); void v.offsetWidth; v.classList.add('enter'); lastKey = key; }
  onScroll();
}
window.addEventListener('hashchange', () => { main.scrollTop = 0; render(); });
// Kein Zoomen per Zwei-Finger-Geste (iOS ignoriert user-scalable=no)
['gesturestart', 'gesturechange', 'gestureend'].forEach(t => document.addEventListener(t, e => e.preventDefault(), { passive: false }));

/* ---------- Startseite ---------- */
function viewHome() {
  setHeader({ title: 'Klassen', act: { icon: 'gear', a: 'goSettings', label: 'Einstellungen' } });
  const hero = `<div class="hero"><div class="eyebrow">${esc(fmtDayHead(today()))}</div><h1>Klassen</h1></div>`;
  if (!data.classes.length) {
    return hero + `<div class="card empty">
      <img class="empty-logo" src="icon-192.png" alt="">
      <h2>Willkommen</h2>
      <p>Importiere deine Schülerliste aus WebUntis – die Klassen werden automatisch angelegt.</p>
      <div class="stack">
        <button class="btn primary" data-a="importAny">${ICON.upload} Schülerliste importieren</button>
        <button class="btn ghost" data-a="addClass">Klasse selbst anlegen</button>
      </div></div>`;
  }
  const lastOf = cid => data.entries.reduce((m, e) => e.c === cid && e.d > m ? e.d : m, '');
  const items = [...data.classes].sort(byName).map(c => {
    const last = lastOf(c.id);
    return `<a class="citem" href="#/k/${c.id}">
      <span class="ctile ${avc(c.name)}">${esc(shortClass(c.name))}</span>
      <span class="cbody"><span class="ctitle">${esc(c.name)}</span>
      <span class="csub">${plural(c.students.length, 'Schüler:in', 'Schüler:innen')}${(() => { const n = c.students.filter(s => isRisk(stats(c, s.id))).length; return n ? ` · <span class="b-t">${n} über 4</span>` : ''; })()}</span></span>
      ${last ? `<span class="cwhen">${esc(shortDay(last))}</span>` : ''}${ICON.chev}</a>`;
  }).join('');
  return hero + `<div class="card">${items}</div>
    <div class="pill-row">
      <button class="btn secondary" data-a="addClass">${ICON.plus} Neue Klasse</button>
      <button class="btn secondary" data-a="importAny">${ICON.upload} Importieren</button>
    </div>
    ${data.classes.length > 1 ? `<button class="btn secondary block mt" data-a="goCompose">${ICON.merge} Gruppe aus mehreren Klassen</button>
    <p class="fine center">Für Unterricht mit Kindern aus verschiedenen Klassen, z. B. Religion oder Wahlpflichtfächer.</p>` : ''}`;
}

/* ---------- Klasse ---------- */
function viewClass(c) {
  setHeader({ title: c.name, back: '#/', backLabel: 'Klassen', act: { icon: 'more', a: 'classMenu', label: 'Klassenmenü' } });
  const hero = `<div class="hero"><div class="eyebrow">${c.students.some(s => s.from) ? 'Gruppe' : 'Klasse'}</div><h1>${esc(c.name)}</h1>
    <div class="sub">${plural(c.students.length, 'Schüler:in', 'Schüler:innen')}${(() => { const n = c.students.filter(s => isRisk(stats(c, s.id))).length; return n ? ` · <span class="riskcount">${WARN} ${n} mit Note über 4</span>` : ''; })()}</div></div>`;
  if (!c.students.length) {
    return hero + `<div class="card empty">
      <h2>Noch niemand da</h2>
      <p>Füge Schüler:innen hinzu – per Liste aus WebUntis oder von Hand.</p>
      <div class="stack">
        <button class="btn primary" data-a="importStudents">${ICON.upload} Liste importieren</button>
        <button class="btn ghost" data-a="addStudents">Namen eintippen</button>
      </div></div>`;
  }
  const seg = `<div class="seg">
    <button class="${ui.tab === 'e' ? 'on' : ''}" data-a="tab" data-v="e">Eintragen</button>
    <button class="${ui.tab === 'u' ? 'on' : ''}" data-a="tab" data-v="u">Übersicht</button></div>`;
  return hero + seg + (ui.tab === 'u' ? viewOverview(c) : viewEntry(c));
}

function viewEntry(c) {
  const cats = Object.entries(TYPES).map(([k, t]) =>
    `<button class="cat ${ui.type === k ? 'on' : ''}" data-a="type" data-v="${k}">${ICON[t.icon]}${t.label}</button>`).join('');
  const rows = [...c.students].sort(byName).map(s => rowHTML(c, s)).join('');
  const bulk = ui.type === 'hu' ? `<div class="bulk"><button class="link" data-a="bulkHu">Alle übrigen ✓</button></div>` : '';
  const back = ui.date !== today() ? `<div class="today-link"><button class="link" data-a="toToday">Zurück zu heute</button></div>` : '';
  return `
    <div class="datebar">
      <button class="dbtn" data-a="day" data-v="-1" aria-label="Vorheriger Tag">${ICON.left}</button>
      <div class="datepill">
        <span class="d1">${esc(dayWord(ui.date))}</span>
        <span class="d2">${esc(dt(ui.date).toLocaleDateString('de-AT', { day: 'numeric', month: 'long', year: 'numeric' }))}</span>
        <input type="date" id="date" value="${ui.date}" aria-label="Datum wählen">
      </div>
      <button class="dbtn" data-a="day" data-v="1" aria-label="Nächster Tag">${ICON.right}</button>
    </div>${back}
    <div class="cats">${cats}</div>${bulk}
    <div class="card">${rows}</div>`;
}

function rowHTML(c, s) {
  const t = TYPES[ui.type];
  const todays = data.entries.filter(e => e.c === c.id && e.s === s.id && e.d === ui.date && e.t === ui.type);
  let meta = '', btns;
  if (t.multi) {
    const cnt = {}; todays.forEach(e => { cnt[e.v] = (cnt[e.v] || 0) + 1; });
    meta = vhCounts(cnt);
    btns = t.vals.map(([v, label, cls]) =>
      `<button class="v add face ${cls}" data-a="mark" data-s="${s.id}" data-v="${v}" aria-label="${esc('Verhalten ' + label)}">${face(v, 25)}</button>`).join('');
  } else {
    const cur = todays[0];
    const curV = cur ? (scaleOf(c, ui.type) === 'pm' ? toPm(cur.v) : ({ '+': '1', '~': '3', '-': '5' }[cur.v] || cur.v)) : null;
    btns = valsFor(c, ui.type).map(([v, label, cls]) =>
      `<button class="v ${cls} ${curV === v ? 'on' : ''}" data-a="mark" data-s="${s.id}" data-v="${v}" aria-label="${esc(t.label + ' ' + label)}">${glyph(label)}</button>`).join('');
  }
  return `<div class="srow${t.multi || valsFor(c, ui.type).length > 3 ? ' five' : ''}" data-row="${s.id}">
    <a class="sname-wrap" href="#/s/${c.id}/${s.id}"><span class="sname">${isRisk(stats(c, s.id)) ? WARN : ''}${esc(s.name)}${fromTag(s)}</span>${meta ? `<span class="smeta">${meta}</span>` : ''}</a>
    <div class="vals">${btns}</div></div>`;
}

function stats(c, sid) {
  const st = { n: 0, avg: {}, cnt: {}, list: {}, hu: { y: 0, n: 0 }, vh: { pp: 0, p: 0, n: 0, nn: 0 }, total: null };
  const acc = {};
  for (const k of Object.keys(TYPES)) { acc[k] = { s: 0, w: 0 }; st.cnt[k] = { '+': 0, '~': 0, '-': 0 }; st.list[k] = []; }
  for (const e of entriesOf(c.id, sid)) {
    if (!acc[e.t]) continue;
    st.n++;
    const w = e.w || 1, num = e.t === 'vh' ? VH_NUM[e.v] : NUM[e.v];
    if (num != null) { acc[e.t].s += num * w; acc[e.t].w += w; }
    if (e.t === 'hu' || e.t === 'vh') st[e.t][e.v] = (st[e.t][e.v] || 0) + 1;
    else {
      st.cnt[e.t][toPm(e.v)]++;
      const l = valInfo(e.t, e.v)[1];
      st.list[e.t].push(w === 1 ? l : `${l} (×${fmtW(w)})`);
    }
  }
  const wt = cfg(c).weight;
  let S = 0, W = 0;
  for (const k of Object.keys(TYPES)) {
    st.avg[k] = acc[k].w ? acc[k].s / acc[k].w : null;
    if ((wt[k] || 0) > 0 && st.avg[k] != null) { S += wt[k] * st.avg[k]; W += wt[k]; }
  }
  st.total = W ? S / W : null;
  return st;
}
const gradeCls = g => g == null ? '' : g < 2.5 ? 'g-t' : g < 4.5 ? 'm-t' : 'b-t';

/* ---------- Trend & Warnung ---------- */
const RISK = 4; // Gesamtnote über 4 → Rufzeichen
const isRisk = st => st.total != null && st.total > RISK;
const WARN = '<span class="warn" title="Gesamtnote über 4" aria-label="Achtung: Gesamtnote über 4">!</span>';

// Gesamtnote zu jedem Datum (mit allen Einträgen bis dahin), gleiche Gewichtung wie oben
function seriesOf(c, sid) {
  const wt = cfg(c).weight;
  const es = entriesOf(c.id, sid).filter(e => TYPES[e.t]).sort((a, b) => a.d.localeCompare(b.d));
  const acc = {}; Object.keys(TYPES).forEach(k => { acc[k] = { s: 0, w: 0 }; });
  const out = [];
  es.forEach((e, i) => {
    const num = e.t === 'vh' ? VH_NUM[e.v] : NUM[e.v], w = e.w || 1;
    if (num != null) { acc[e.t].s += num * w; acc[e.t].w += w; }
    if (i === es.length - 1 || es[i + 1].d !== e.d) {
      let S = 0, W = 0;
      for (const k in acc) if ((wt[k] || 0) > 0 && acc[k].w) { S += wt[k] * acc[k].s / acc[k].w; W += wt[k]; }
      if (W) out.push({ d: e.d, v: S / W });
    }
  });
  return out;
}
// Vergleich: heutiger Stand gegenüber dem Stand vor 4 Wochen
function trendOf(c, sid) {
  const ser = seriesOf(c, sid);
  if (ser.length < 2) return { ser, dir: null };
  const now = ser[ser.length - 1], cut = shiftDay(now.d, -28);
  let then = null;
  for (const p of ser) if (p.d <= cut) then = p;
  if (!then) then = ser[0];
  const delta = now.v - then.v;
  return { ser, delta, since: then.d, dir: delta <= -0.15 ? 'up' : delta >= 0.15 ? 'down' : 'flat' };
}
const TREND = {
  up: { icon: 'tUp', cls: 'g-t', word: 'verbessert sich' },
  down: { icon: 'tDown', cls: 'b-t', word: 'verschlechtert sich' },
  flat: { icon: 'tFlat', cls: 'flat-t', word: 'bleibt gleich' }
};
const trendIcon = tr => tr && tr.dir ? `<span class="trend ${TREND[tr.dir].cls}" title="${TREND[tr.dir].word}">${ICON[TREND[tr.dir].icon]}</span>` : '';

// Kleine Verlaufskurve für die Übersicht (1 oben, 5 unten, Bereich über 4 rot hinterlegt)
function sparkHTML(tr) {
  const ser = tr.ser;
  if (ser.length < 2) return '<span class="nospark">noch kein Verlauf</span>';
  const W = 200, H = 42, P = 4;
  const t0 = dt(ser[0].d).getTime(), span = Math.max(1, dt(ser[ser.length - 1].d).getTime() - t0);
  const x = d => +((dt(d).getTime() - t0) / span * W).toFixed(1);
  const y = v => +(P + (Math.min(5, Math.max(1, v)) - 1) / 4 * (H - 2 * P)).toFixed(1);
  const path = ser.map((p, i) => (i ? 'L' : 'M') + x(p.d) + ' ' + y(p.v)).join(' ');
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Verlauf: ${TREND[tr.dir].word}">
    <rect class="sp-risk" x="0" y="${y(4)}" width="${W}" height="${H - y(4)}"/>
    <line class="sp-grid" x1="0" x2="${W}" y1="${y(3)}" y2="${y(3)}" vector-effect="non-scaling-stroke"/>
    <path class="sp-line ${tr.dir}" d="${path}" vector-effect="non-scaling-stroke"/></svg>`;
}

function chartHTML(ser) {
  const W = Math.round(Math.max(260, Math.min(560, (main.clientWidth || 360) - 64))), H = 150;
  const L = 24, R = 30, T = 14, B = 24;
  const t0 = dt(ser[0].d).getTime(), span = Math.max(1, dt(ser[ser.length - 1].d).getTime() - t0);
  const x = d => +(L + (dt(d).getTime() - t0) / span * (W - L - R)).toFixed(1);
  const y = v => +(T + (Math.min(5, Math.max(1, v)) - 1) / 4 * (H - T - B)).toFixed(1);
  const pts = ser.map(p => [x(p.d), y(p.v), `${fmtDay(p.d)} · Ø ${fmtNum(p.v)}`]);
  const grid = [1, 2, 3, 4, 5].map(g => `<line class="ch-grid" x1="${L}" x2="${W - R}" y1="${y(g)}" y2="${y(g)}"/><text class="ch-ax" x="${L - 8}" y="${y(g) + 4}" text-anchor="end">${g}</text>`).join('');
  const last = pts[pts.length - 1];
  const short = d => dt(d).toLocaleDateString('de-AT', { day: 'numeric', month: 'numeric' });
  return `<div class="chart" data-pts="${esc(JSON.stringify(pts))}">
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Verlauf der Gesamtnote von ${fmtNum(ser[0].v)} auf ${fmtNum(ser[ser.length - 1].v)}">
      <rect class="ch-risk" x="${L}" y="${y(4)}" width="${W - L - R}" height="${y(5) - y(4)}"/>
      ${grid}
      <line class="ch-four" x1="${L}" x2="${W - R}" y1="${y(4)}" y2="${y(4)}"/>
      <path class="ch-line" d="${pts.map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join(' ')}"/>
      <circle class="ch-dot" cx="${last[0]}" cy="${last[1]}" r="4.5"/>
      <text class="ch-val" x="${last[0] + 8}" y="${last[1] + 4}">${fmtNum(ser[ser.length - 1].v)}</text>
      <text class="ch-ax" x="${L}" y="${H - 6}">${short(ser[0].d)}</text>
      <text class="ch-ax" x="${W - R}" y="${H - 6}" text-anchor="end">${short(ser[ser.length - 1].d)}</text>
      <line class="ch-hl" x1="0" x2="0" y1="${T}" y2="${H - B}"/>
      <circle class="ch-hd" cx="0" cy="0" r="4.5"/>
    </svg><div class="ch-tip"></div></div>`;
}
// Antippen/Überfahren zeigt den Wert am nächstgelegenen Tag
function chartHover(e) {
  const ch = e.target.closest ? e.target.closest('.chart') : null;
  document.querySelectorAll('.chart.on').forEach(x => { if (x !== ch) x.classList.remove('on'); });
  if (!ch) return;
  const svg = ch.querySelector('svg'), r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal;
  const px = (e.clientX - r.left) * vb.width / r.width;
  const pts = JSON.parse(ch.dataset.pts);
  const p = pts.reduce((a, b) => Math.abs(b[0] - px) < Math.abs(a[0] - px) ? b : a);
  svg.querySelector('.ch-hl').setAttribute('x1', p[0]); svg.querySelector('.ch-hl').setAttribute('x2', p[0]);
  svg.querySelector('.ch-hd').setAttribute('cx', p[0]); svg.querySelector('.ch-hd').setAttribute('cy', p[1]);
  const tip = ch.querySelector('.ch-tip');
  tip.textContent = p[2];
  const left = Math.min(Math.max(p[0] * r.width / vb.width, 60), r.width - 60);
  tip.style.left = left + 'px';
  tip.style.top = (p[1] * r.height / vb.height) + 'px';
  ch.classList.add('on');
}
document.addEventListener('pointermove', chartHover);
document.addEventListener('pointerdown', chartHover);
const dash = '<span class="chev">–</span>';

function metricHTML(c, st, k) {
  if (k === 'hu') { const T = st.hu.y + st.hu.n; return T ? `${st.hu.y}/${T}` : dash; }
  if (k === 'vh') return vhCounts(st.vh) || dash;
  if (scaleOf(c, k) === 'pm') { const x = st.cnt[k]; return `<span class="g-t">+${x['+']}</span><span class="m-t">~${x['~']}</span><span class="b-t">−${x['-']}</span>`; }
  return st.avg[k] == null ? dash : `<span class="${gradeCls(st.avg[k])}">${fmtNum(st.avg[k])}</span>`;
}

function viewOverview(c) {
  const rows = [...c.students].sort(byName).map(s => {
    const st = stats(c, s.id);
    return `<a class="orow" href="#/s/${c.id}/${s.id}">
      <div class="otop"><span class="av ${avc(s.name)}">${esc(initials(s.name))}</span><span class="oname">${esc(s.name)}${fromTag(s)}</span>${isRisk(st) ? WARN : ''}${ICON.chev}</div>
      ${(() => { const tr = trendOf(c, s.id); return `<div class="otrend">
        ${st.total == null ? '<span class="tot">Ø –</span>' : `<span class="tot ${gradeCls(st.total)}">Ø ${fmtNum(st.total)}${trendIcon(tr)}</span>`}
        ${sparkHTML(tr)}</div>`; })()}
      <div class="metrics">${Object.keys(TYPES).map(k => `<span class="met"><span class="ml">${SHORT[k]}</span><span class="mv">${metricHTML(c, st, k)}</span></span>`).join('')}</div></a>`;
  }).join('');
  return `<div class="card">${rows}</div>
    <p class="legend">Ø = gewichtete Gesamtnote (${esc(weightSummary(c))}). HÜ zeigt „gebracht / gesamt“.</p>
    <div class="stack">
      <a class="btn secondary block" href="#/b/${c.id}">${ICON.sliders} Bewertung & Gewichtung</a>
      <button class="btn secondary block" data-a="exportOverview">${ICON.download} Übersicht exportieren</button>
    </div>`;
}

/* ---------- Gruppe aus mehreren Klassen ---------- */
const fromTag = s => s.from ? `<span class="from">${esc(s.from)}</span>` : '';
const cmp = { key: '', name: '', sel: new Set(), open: new Set(), carry: true };
function cmpReset(key) { if (cmp.key !== key) Object.assign(cmp, { key, name: '', sel: new Set(), open: new Set(), carry: true }); }
const cmpKey = (cid, sid) => cid + '|' + sid;

function viewCompose(target) {
  cmpReset(target ? target.id : 'new');
  setHeader({ title: target ? 'Hinzufügen' : 'Neue Gruppe', back: target ? '#/k/' + target.id : '#/', backLabel: target ? target.name : 'Klassen' });
  const sources = [...data.classes].filter(c => c !== target && c.students.length).sort(byName);
  const have = new Set(target ? target.students.map(s => s.name.toLowerCase()) : []);
  const cards = sources.map(c => {
    const studs = [...c.students].sort(byName);
    const n = studs.filter(s => cmp.sel.has(cmpKey(c.id, s.id))).length;
    const state = n === 0 ? '' : n === studs.length ? 'on' : 'some';
    const open = cmp.open.has(c.id);
    const list = open ? studs.map(s => {
      const dup = have.has(s.name.toLowerCase());
      const on = cmp.sel.has(cmpKey(c.id, s.id));
      return `<button class="pick${dup ? ' dup' : ''}" data-a="cmpStudent" data-c="${c.id}" data-s="${s.id}" ${dup ? 'disabled' : ''}>
        <span class="chk ${on ? 'on' : ''}">${on ? ICON.check : ''}</span><span class="grow">${esc(s.name)}</span>${dup ? '<span class="muted">schon in der Gruppe</span>' : ''}</button>`;
    }).join('') : '';
    return `<div class="card cmpcard">
      <div class="cmphead">
        <button class="pick head" data-a="cmpClass" data-c="${c.id}" aria-label="${esc(c.name)} ganz auswählen">
          <span class="chk ${state}">${state === 'on' ? ICON.check : state === 'some' ? '<i></i>' : ''}</span>
          <span class="ctile sm ${avc(c.name)}">${esc(shortClass(c.name))}</span>
          <span class="grow"><span class="ctitle">${esc(c.name)}</span><span class="csub">${n ? `${n} von ${studs.length} ausgewählt` : plural(studs.length, 'Schüler:in', 'Schüler:innen')}</span></span>
        </button>
        <button class="icon-btn exp${open ? ' open' : ''}" data-a="cmpOpen" data-c="${c.id}" aria-label="Einzelne auswählen">${ICON.down}</button>
      </div>${list}</div>`;
  }).join('');
  const total = cmp.sel.size;
  const withEntries = [...cmp.sel].some(k => { const [cid, sid] = k.split('|'); return data.entries.some(e => e.c === cid && e.s === sid); });
  return `<div class="hero"><div class="eyebrow">${target ? esc(target.name) : 'Unterrichtsgruppe'}</div>
      <h1>${target ? 'Schüler:innen hinzufügen' : 'Gruppe zusammenstellen'}</h1>
      <div class="sub">Hake ganze Klassen an oder tippe auf ${ICON.down.replace('width="18" height="18"', 'width="14" height="14"')} und wähle einzelne Kinder.</div></div>
    ${target ? '' : `<div class="section">Name der Gruppe</div>
    <input class="field" id="cmpName" value="${esc(cmp.name)}" placeholder="z. B. Religion 3A/3B" autocomplete="off">`}
    <div class="section">Aus diesen Klassen</div>
    <div class="stack">${cards || '<div class="nothing">Keine weiteren Klassen mit Schüler:innen vorhanden.</div>'}</div>
    ${withEntries ? `<button class="lrow toggle card" data-a="cmpCarry"><span class="chk ${cmp.carry ? 'on' : ''}">${cmp.carry ? ICON.check : ''}</span>
      <span class="grow">Bisherige Einträge mitnehmen<span class="muted block">Noten, Mitarbeit usw. werden in die Gruppe kopiert</span></span></button>` : ''}
    <p class="fine">Die ursprünglichen Klassen bleiben unverändert. In der Gruppe steht neben jedem Namen die Herkunftsklasse.</p>
    <div class="sticky-cta"><button class="btn primary block" data-a="cmpCreate" ${total ? '' : 'disabled'}>
      ${total ? (target ? `${plural(total, 'Person', 'Personen')} hinzufügen` : `Gruppe mit ${plural(total, 'Person', 'Personen')} anlegen`) : 'Schüler:innen auswählen'}</button></div>`;
}

/* ---------- Bewertung (Einstellungen je Klasse) ---------- */
function viewRating(c) {
  setHeader({ title: 'Bewertung', back: '#/k/' + c.id, backLabel: c.name });
  const cf = cfg(c);
  const sum = Object.values(cf.weight).reduce((a, b) => a + b, 0);
  const scaleRows = SCALABLE.map(k => `<div class="lrow static"><span class="licon">${ICON[TYPES[k].icon]}</span><span class="grow">${TYPES[k].label}</span>
      <div class="mini-seg"><button class="${cf.scale[k] === 'grade' ? 'on' : ''}" data-a="setScale" data-t="${k}" data-v="grade">1 – 5</button><button class="${cf.scale[k] === 'pm' ? 'on' : ''}" data-a="setScale" data-t="${k}" data-v="pm" aria-label="Plus, Welle, Minus"><span class="symrow">${glyph('+', 14)}${glyph('~', 14)}${glyph('−', 14)}</span></button></div></div>`).join('');
  const wRows = Object.keys(TYPES).map(k => {
    const w = cf.weight[k];
    return `<div class="lrow static"><span class="licon">${ICON[TYPES[k].icon]}</span><span class="grow">${TYPES[k].label}</span>
      <div class="stepper"><button data-a="wStep" data-t="${k}" data-v="-5" aria-label="${TYPES[k].label} weniger">−</button><span class="num">${w} %</span><button data-a="wStep" data-t="${k}" data-v="5" aria-label="${TYPES[k].label} mehr">+</button></div></div>`;
  }).join('');
  const sumLine = sum === 100 ? '<span class="g-t">Summe: 100 %</span>'
    : sum === 0 ? 'Alle Anteile stehen auf 0 % – es wird keine Gesamtnote berechnet.'
      : `Summe: ${sum} % – die Anteile werden automatisch auf 100 % umgerechnet (${esc(weightSummary(c))}).`;
  return `<div class="hero"><div class="eyebrow">${esc(c.name)}</div><h1>Bewertung</h1></div>
    <div class="section">Notenskala</div>
    <div class="card">${scaleRows}</div>
    <p class="fine">Bewerte mit Noten von 1 bis 5 oder mit + ~ −. Bereits eingetragene Werte bleiben erhalten.</p>
    <div class="section">Anteil an der Gesamtnote</div>
    <div class="card">${wRows}</div>
    <p class="fine">${sumLine}</p>
    <p class="fine">Umrechnung: + = 1, ~ = 3, − = 5 · Hausübung gebracht = 1, nicht gebracht = 5 · Verhalten: sehr gut = 1, gut = 2, weniger gut = 4, schlecht = 5.<br>Einzelne Noten kannst du bei der jeweiligen Schülerin oder dem jeweiligen Schüler stärker oder schwächer zählen lassen: einfach auf die Note tippen.</p>
    ${data.classes.length > 1 ? `<button class="btn secondary block" data-a="cfgAll">Für alle Klassen übernehmen</button>` : ''}`;
}

/* ---------- Schüler:in ---------- */
function viewStudent(c, sid) {
  const s = c.students.find(x => x.id === sid);
  setHeader({ title: s.name, back: '#/k/' + c.id, backLabel: c.name, act: { icon: 'more', a: 'studentMenu', label: 'Menü' } });
  const st = stats(c, sid);
  const lastVh = entriesOf(c.id, sid).filter(e => e.t === 'vh').sort((a, b) => b.d.localeCompare(a.d))[0];
  const tile = k => {
    const sc = scaleOf(c, k), a = st.avg[k];
    let val, sub;
    if (k === 'hu') {
      const T = st.hu.y + st.hu.n;
      val = T ? `${st.hu.y}/${T}` : '–';
      sub = st.hu.n ? `${st.hu.n}× nicht gebracht` : T ? 'immer gebracht' : 'noch keine';
    } else if (k === 'vh') {
      val = vhCounts(st.vh) || '–';
      sub = lastVh ? 'zuletzt ' + relDay(lastVh.d) : 'noch nichts notiert';
    } else if (sc === 'pm') {
      const x = st.cnt[k];
      val = `<span class="g-t">+${x['+']}</span><span class="m-t">~${x['~']}</span><span class="b-t">−${x['-']}</span>`;
      sub = a == null ? 'noch keine' : `entspricht Ø ${fmtNum(a)}`;
    } else {
      val = a == null ? '–' : `<span class="${gradeCls(a)}">${fmtNum(a)}</span>`;
      sub = st.list[k].length ? 'Noten: ' + st.list[k].join(', ') : 'noch keine';
    }
    return `<div class="tile"><div class="k">${TYPES[k].label}${sc === 'grade' ? ' Ø' : ''}</div><div class="val">${val}</div><div class="sub">${esc(sub)}</div></div>`;
  };
  const tiles = `<div class="tiles">
    <a class="tile total" href="#/b/${c.id}"><div class="k">Gesamtnote</div><div class="val">${st.total == null ? '–' : fmtNum(st.total)}</div><div class="sub">${esc(weightSummary(c))}</div></a>
    ${Object.keys(TYPES).map(tile).join('')}
    <div class="tile"><div class="k">Einträge</div><div class="val">${st.n}</div><div class="sub">insgesamt</div></div>
  </div>`;
  const chips = [['all', 'Alle', null], ...Object.entries(TYPES).map(([k, t]) => [k, t.label, t.icon])].map(([k, l, ic]) =>
    `<button class="cat ${ui.filter === k ? 'on' : ''}" data-a="filter" data-v="${k}">${ic ? ICON[ic] : ''}${l}</button>`).join('');
  const es = entriesOf(c.id, sid).filter(e => ui.filter === 'all' || e.t === ui.filter)
    .sort((a, b) => b.d.localeCompare(a.d) || a.t.localeCompare(b.t));
  let list = '';
  if (!es.length) list = `<div class="nothing">Keine Einträge</div>`;
  else {
    const byDay = new Map();
    es.forEach(e => { if (!byDay.has(e.d)) byDay.set(e.d, []); byDay.get(e.d).push(e); });
    for (const [d, items] of byDay) {
      list += `<div class="dayh">${esc(dayWord(d) === 'Heute' ? 'Heute' : fmtDayHead(d))}</div><div class="card">${items.map(e => {
        const [, label, cls] = valInfo(e.t, e.v);
        const t = TYPES[e.t] || { long: e.t, icon: 'info' };
        const title = e.t === 'vh' ? 'Verhalten: ' + vhLabel(e.v) : t.long;
        return `<div class="erow"><span class="eicon ${e.t === 'vh' ? vhCls(e.v) : cls}">${e.t === 'vh' ? face(e.v, 22) : ICON[t.icon]}</span>
          <div class="etext"><div class="etitle">${esc(title)}</div>${e.n ? `<div class="enote">${esc(e.n)}</div>` : ''}</div>
          ${e.t === 'vh' ? '' : `<button class="badge ${cls}" data-a="entryWeight" data-v="${e.id}" aria-label="Gewichtung ändern">${glyph(label)}${e.w && e.w !== 1 ? `<small>×${fmtW(e.w)}</small>` : ''}</button>`}
          <button class="del" data-a="delEntry" data-v="${e.id}" aria-label="Eintrag löschen">${ICON.close}</button></div>`;
      }).join('')}</div>`;
    }
  }
  return `<div class="phero"><span class="av lg ${avc(s.name)}">${esc(initials(s.name))}</span>
      <div><div class="eyebrow">${esc(c.name)}${s.from ? ' · aus ' + esc(s.from) : ''}</div><h1>${esc(s.name)}</h1>
      ${isRisk(st) ? `<div class="riskpill">${WARN} Gesamtnote über 4</div>` : ''}</div></div>
    <button class="btn secondary block" data-a="vhStudent">${ICON.smile} Verhalten notieren</button>
    ${tiles}
    ${trendCard(c, sid)}
    <div class="cats filters">${chips}</div>
    ${es.some(e => e.t !== 'vh') ? '<p class="fine">Tipp: Tippe auf eine Note, um sie halb, doppelt oder dreifach zählen zu lassen.</p>' : ''}
    ${list}`;
}

function trendCard(c, sid) {
  const tr = trendOf(c, sid);
  let head;
  if (!tr.dir) head = `<div class="trendline"><span class="chev">${ICON.tFlat}</span><span>Noch zu wenige Einträge für einen Trend</span></div>`;
  else {
    const t = TREND[tr.dir], weeks = Math.max(1, Math.round((dt(tr.ser[tr.ser.length - 1].d) - dt(tr.since)) / 6048e5));
    const d = tr.delta;
    head = `<div class="trendline"><span class="trend big ${t.cls}">${ICON[t.icon]}</span>
      <span><span class="tw">${t.word[0].toUpperCase() + t.word.slice(1)}</span>
      <span class="ts">${d === 0 ? 'unverändert' : (d < 0 ? 'um ' + fmtNum(-d) + ' besser' : 'um ' + fmtNum(d) + ' schlechter')} als vor ${weeks === 1 ? 'einer Woche' : weeks + ' Wochen'}</span></span></div>`;
  }
  return `<div class="section">Verlauf der Gesamtnote</div>
    <div class="card chartcard">${head}${tr.ser.length >= 2 ? chartHTML(tr.ser) : ''}</div>`;
}

/* ---------- Einstellungen ---------- */
function viewSettings() {
  setHeader({ title: 'Einstellungen', back: '#/', backLabel: 'Klassen' });
  const exp = license.info.x ? 'bis ' + dt(license.info.x).toLocaleDateString('de-AT') : 'unbefristet';
  return `<div class="hero"><h1>Einstellungen</h1></div>
    <div class="section">Datensicherung</div>
    <div class="card">
      <button class="lrow" data-a="exportBackup"><span class="licon">${ICON.download}</span><span class="grow">Sicherung exportieren</span>${ICON.chev}</button>
      <button class="lrow" data-a="importBackup"><span class="licon">${ICON.upload}</span><span class="grow">Sicherung importieren</span>${ICON.chev}</button>
    </div>
    <p class="fine">Alle Daten liegen nur auf diesem Gerät. Exportiere regelmäßig eine Sicherung, z. B. in die Dateien-App oder auf einen USB-Stick.</p>

    <div class="section">Lizenz</div>
    <div class="card"><div class="lrow static"><span class="licon">${ICON.key}</span><span class="grow">${esc(license.info.n)}</span><span class="muted">${esc(exp)}</span></div></div>

    <div class="section">Datenschutz</div>
    <div class="card"><div class="lrow static info"><span class="licon">${ICON.shield}</span><span class="grow">Keine Cloud, kein Konto, keine Analyse. Die App sendet keine Daten ins Internet.</span></div></div>

    <div class="section">Daten</div>
    <div class="card"><button class="lrow danger" data-a="wipe"><span class="licon">${ICON.trash}</span><span class="grow">Alle Daten löschen</span></button></div>
    <p class="fine center">Klassenbuch · Version ${APP_VERSION}</p>`;
}

/* ---------- Sheets ---------- */
function modal(o) {
  return new Promise(res => {
    const d = $('#dlg');
    const field = o.input ? `<input name="v" value="${esc(o.value || '')}" placeholder="${esc(o.placeholder || '')}" autocomplete="off">`
      : o.textarea ? `<textarea name="v" rows="7" placeholder="${esc(o.placeholder || '')}">${esc(o.value || '')}</textarea>` : '';
    const opts = o.options ? `<div class="opts">${o.options.map(([k, l, dan]) => `<button value="${k}" class="opt${dan ? ' danger' : ''}">${esc(l)}</button>`).join('')}</div>` : '';
    d.innerHTML = `<div class="grab"></div><form method="dialog" class="sheet">
      ${o.title ? `<h3>${esc(o.title)}</h3>` : ''}${o.text ? `<p class="stext">${esc(o.text)}</p>` : ''}
      ${o.body || ''}${field}${opts}
      <div class="btns">${o.options ? '' : `<button value="ok" class="btn ${o.danger ? 'danger' : 'primary'} block">${esc(o.ok || 'OK')}</button>`}
      <button value="" class="btn ghost block" formnovalidate>${esc(o.cancel || 'Abbrechen')}</button></div></form>`;
    let done = false;
    const finish = r => {
      if (done) return; done = true;
      const f = d.querySelector('[name=v]');
      res(o.options ? (r || null) : r === 'ok' ? (o.collect ? o.collect(d) : f ? f.value : true) : null);
      if (d.open) d.close();
    };
    d.querySelector('form').addEventListener('submit', e => { e.preventDefault(); finish(e.submitter ? e.submitter.value : 'ok'); });
    d.onclose = () => finish('');
    if (o.mount) o.mount(d);
    d.showModal();
    d.scrollTop = 0;
    const f = d.querySelector('[name=v]');
    if (f) setTimeout(() => f.focus(), 80);
  });
}
$('#dlg').addEventListener('click', e => { if (e.target === e.currentTarget) e.currentTarget.close(); });

function behaviorSheet(name, start) {
  let lvl = VH_LEVELS.includes(start) ? start : 'p';
  const sel = new Set();
  const tagsHTML = () => VH_TAGS[vhPol(lvl)].map(t => `<button type="button" class="tag ${sel.has(t) ? 'on ' + vhCls(lvl) : ''}" data-tag="${esc(t)}">${esc(t)}</button>`).join('');
  return modal({
    title: 'Verhalten', text: name, ok: 'Speichern',
    body: `<div class="faces">${TYPES.vh.vals.map(([v, l, cls]) => `<button type="button" class="facebtn ${cls}" data-lvl="${v}">${face(v, 34)}<span>${l}</span></button>`).join('')}</div>
      <div class="tags"></div>
      <textarea name="note" rows="2" placeholder="Notiz (optional)"></textarea>`,
    mount(d) {
      const paint = () => {
        d.querySelectorAll('[data-lvl]').forEach(b => b.classList.toggle('on', b.dataset.lvl === lvl));
        d.querySelector('.tags').innerHTML = tagsHTML();
      };
      d.querySelector('.faces').addEventListener('click', e => {
        const b = e.target.closest('[data-lvl]'); if (!b || b.dataset.lvl === lvl) return;
        if (vhPol(b.dataset.lvl) !== vhPol(lvl)) sel.clear();
        lvl = b.dataset.lvl; paint();
      });
      d.querySelector('.tags').addEventListener('click', e => { const b = e.target.closest('[data-tag]'); if (!b) return; const t = b.dataset.tag; sel.has(t) ? sel.delete(t) : sel.add(t); paint(); });
      paint();
    },
    collect(d) { return { v: lvl, n: [...sel, d.querySelector('[name=note]').value.trim()].filter(Boolean).join(' · ') }; }
  });
}

let toastTimer;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}
const haptic = () => { try { if (navigator.vibrate) navigator.vibrate(8); } catch { } };

/* ---------- Dateien ---------- */
function pickFile() {
  return new Promise(res => {
    const inp = $('#file'); inp.value = '';
    inp.onchange = () => res(inp.files[0] || null);
    inp.click();
  });
}
const readText = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(r.error); r.readAsText(f); });

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
async function saveFile(name, type, text) {
  const blob = new Blob([text], { type });
  if (isIOS && navigator.canShare) {
    const file = new File([blob], name, { type });
    if (navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file] }); return; }
      catch (e) { if (e.name === 'AbortError') return; }
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  toast('Gespeichert: ' + name);
}
const safeName = s => s.replace(/[^\wäöüÄÖÜß.-]+/g, '_');

function parseCSV(text) {
  text = text.replace(/^﻿/, '');
  const first = text.split(/\r?\n/)[0] || '';
  const delim = [';', '\t', ','].map(d => [d, first.split(d).length]).sort((a, b) => b[1] - a[1])[0][0];
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === delim) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.map(r => r.map(x => x.trim())).filter(r => r.some(Boolean));
}
const csvCell = v => { const s = String(v ?? ''); return /[;"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const toCSV = rows => '﻿' + rows.map(r => r.map(csvCell).join(';')).join('\r\n');

/* ----- Tabellen lesen: CSV/TXT (alle Kodierungen), Excel .xlsx, HTML-Tabelle (.xls aus WebUntis) ----- */
function decodeText(buf) {
  if (buf[0] === 0xFF && buf[1] === 0xFE) return new TextDecoder('utf-16le').decode(buf);
  if (buf[0] === 0xFE && buf[1] === 0xFF) return new TextDecoder('utf-16be').decode(buf);
  try { return new TextDecoder('utf-8', { fatal: true }).decode(buf); }
  catch { return new TextDecoder('windows-1252').decode(buf); }
}

function unzip(buf) {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('Keine gültige Excel-Datei');
  const count = dv.getUint16(eocd + 10, true); let p = dv.getUint32(eocd + 16, true);
  const files = {};
  for (let n = 0; n < count && dv.getUint32(p, true) === 0x02014b50; n++) {
    const nlen = dv.getUint16(p + 28, true), xlen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true);
    files[new TextDecoder().decode(buf.subarray(p + 46, p + 46 + nlen))] =
      { method: dv.getUint16(p + 10, true), size: dv.getUint32(p + 20, true), off: dv.getUint32(p + 42, true) };
    p += 46 + nlen + xlen + clen;
  }
  return {
    names: Object.keys(files),
    async text(name) {
      const f = files[name]; if (!f) return null;
      const start = f.off + 30 + dv.getUint16(f.off + 26, true) + dv.getUint16(f.off + 28, true);
      const raw = buf.subarray(start, start + f.size);
      if (f.method === 0) return new TextDecoder().decode(raw);
      if (typeof DecompressionStream === 'undefined') throw new Error('Excel-Dateien werden auf diesem Gerät nicht unterstützt – bitte als CSV speichern');
      const out = await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer();
      return new TextDecoder().decode(out);
    }
  };
}

async function readXlsx(buf) {
  const z = unzip(buf);
  const xml = s => new DOMParser().parseFromString(s, 'application/xml');
  const tags = (el, n) => [...el.getElementsByTagNameNS('*', n)];
  const ss = await z.text('xl/sharedStrings.xml');
  const shared = ss ? tags(xml(ss), 'si').map(si => tags(si, 't').map(t => t.textContent).join('')) : [];
  const sheet = z.names.includes('xl/worksheets/sheet1.xml') ? 'xl/worksheets/sheet1.xml'
    : z.names.filter(n => /^xl\/worksheets\/[^/]+\.xml$/.test(n)).sort()[0];
  if (!sheet) throw new Error('Keine Tabelle in der Excel-Datei gefunden');
  const colIdx = ref => { const m = /^[A-Z]+/.exec(ref || ''); if (!m) return -1; let n = 0; for (const ch of m[0]) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };
  return tags(xml(await z.text(sheet)), 'row').map(r => {
    const row = [];
    for (const c of tags(r, 'c')) {
      const t = c.getAttribute('t'), v = tags(c, 'v')[0]?.textContent ?? '';
      const val = t === 's' ? shared[+v] ?? '' : t === 'inlineStr' ? tags(c, 't').map(x => x.textContent).join('') : v;
      const i = colIdx(c.getAttribute('r'));
      row[i >= 0 ? i : row.length] = val;
    }
    return Array.from(row, x => String(x ?? '').trim());
  }).filter(r => r.some(Boolean));
}

function readHtmlTable(text) {
  const doc = new DOMParser().parseFromString(text, 'text/html');
  const tables = [...doc.querySelectorAll('table')];
  const t = tables.sort((a, b) => b.rows.length - a.rows.length)[0];
  if (!t) return [];
  return [...t.rows].map(r => [...r.cells].map(c => c.textContent.replace(/\s+/g, ' ').trim())).filter(r => r.some(Boolean));
}

async function readTable(file) {
  const buf = new Uint8Array(await file.arrayBuffer());
  if (buf[0] === 0x50 && buf[1] === 0x4B) return readXlsx(buf);
  if (buf[0] === 0xD0 && buf[1] === 0xCF) throw new Error('Altes Excel-Format (.xls) – bitte in Excel als .xlsx oder CSV speichern');
  const text = decodeText(buf);
  if (/<table[\s>]/i.test(text)) return readHtmlTable(text);
  return parseCSV(text);
}

/* ----- Schülerlisten erkennen (WebUntis, Sokrates, Excel, freie Listen) ----- */
function parseStudents(rows) {
  const norm = s => String(s || '').toLowerCase().replace(/[*:_]/g, '').trim();
  let hi = -1, iN = -1, iV = -1, iName = -1, iK = -1;
  for (let r = 0; r < Math.min(rows.length, 10) && hi < 0; r++) {
    const h = rows[r].map(norm);
    const nN = h.findIndex(x => /^(nachname|familienname|zuname|familien-?name)$/.test(x));
    const nV = h.findIndex(x => /^vorname/.test(x));
    const nName = h.findIndex(x => /^(name|langname|schüler(in|innen)?|schueler(in|innen)?|student|schülername)$/.test(x));
    if (nN >= 0 || nV >= 0 || nName >= 0) {
      hi = r; iN = nN; iV = nV; iName = nName;
      iK = h.findIndex(x => /^(klasse|klassen|klassenname|stammklasse|class|kl\.?)$/.test(x));
      if (iK < 0) iK = h.findIndex(x => /klasse/.test(x) && !/vorstand|lehrer|sprecher|kv/.test(x));
    }
  }
  if (iN < 0 && iV >= 0 && iName >= 0) { iN = iName; iName = -1; } // WebUntis: "Name" + "Vorname"
  const body = hi >= 0 ? rows.slice(hi + 1) : rows;
  const groups = new Map();
  let total = 0;
  for (const r of body) {
    let name;
    if (iN >= 0 || iV >= 0) name = [r[iN] || '', r[iV] || ''].join(' ');
    else if (iName >= 0) name = r[iName] || '';
    else name = r.filter(Boolean).slice(0, 2).join(' ');
    name = name.replace(/\s+/g, ' ').trim();
    if (!name || /^\d+$/.test(name) || /^(anzahl|summe|gesamt)\b/i.test(name)) continue;
    const k = iK >= 0 ? (r[iK] || '').trim() : '';
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(name); total++;
  }
  return { groups, hasClass: iK >= 0, total };
}

function addNames(c, names) {
  const have = new Set(c.students.map(s => s.name.toLowerCase()));
  let n = 0;
  for (const name of names) {
    if (have.has(name.toLowerCase())) continue;
    have.add(name.toLowerCase()); c.students.push({ id: uid(), name }); n++;
  }
  return n;
}

/* ---------- Aktionen ---------- */
const currentClass = () => { const [v, a] = location.hash.replace(/^#\/?/, '').split('/'); return (v === 'k' || v === 's' || v === 'b') ? getClass(a) : null; };
const currentStudentId = () => location.hash.replace(/^#\/?/, '').split('/')[2];
const errMsg = e => e && e.message ? e.message : 'Datei konnte nicht gelesen werden';

const actions = {
  async activate() {
    const res = await verifyLicense($('#lic').value);
    if (res.error) { lockMsg = res.error; return render(); }
    lockMsg = ''; license = res; lsSet('kb.license', res.code); await DB.set('license', res.code);
    await loadData(); render(); toast('Freigeschaltet für ' + res.info.n);
  },
  goSettings() { location.hash = '#/einstellungen'; },

  goCompose() { location.hash = '#/neu'; },
  async addClass() {
    if (data.classes.length > 1) {
      const k = await modal({ title: 'Neue Klasse', options: [['empty', 'Leere Klasse anlegen'], ['mix', 'Gruppe aus mehreren Klassen zusammenstellen']] });
      if (!k) return;
      if (k === 'mix') { location.hash = '#/neu'; return; }
    }
    const name = (await modal({ title: 'Neue Klasse', input: true, placeholder: 'z. B. 3B', ok: 'Anlegen' }) || '').trim();
    if (!name) return;
    const c = { id: uid(), name, students: [] };
    data.classes.push(c); await save(); location.hash = '#/k/' + c.id;
  },
  async classMenu() {
    const c = currentClass(); if (!c) return;
    const k = await modal({
      title: c.name, options: [
        ['cfg', 'Bewertung & Gewichtung'], ['mix', 'Schüler:innen aus anderen Klassen'], ['add', 'Schüler:innen eintippen'], ['imp', 'Liste importieren (WebUntis, Excel, CSV)'],
        ['ov', 'Übersicht exportieren'], ['all', 'Alle Einträge exportieren'],
        ['ren', 'Klasse umbenennen'], ['del', 'Klasse löschen', true]
      ], cancel: 'Schließen'
    });
    if (k === 'cfg') location.hash = '#/b/' + c.id;
    if (k === 'mix') location.hash = '#/neu/' + c.id;
    if (k === 'add') actions.addStudents();
    if (k === 'imp') actions.importStudents();
    if (k === 'ov') actions.exportOverview();
    if (k === 'all') actions.exportEntries();
    if (k === 'ren') {
      const n = (await modal({ title: 'Klasse umbenennen', input: true, value: c.name, ok: 'Speichern' }) || '').trim();
      if (n) { c.name = n; await save(); render(); }
    }
    if (k === 'del') {
      if (!await modal({ title: 'Klasse löschen?', text: `„${c.name}“ und alle Einträge werden gelöscht. Das kann nicht rückgängig gemacht werden.`, ok: 'Klasse löschen', danger: true })) return;
      data.classes = data.classes.filter(x => x !== c);
      data.entries = data.entries.filter(e => e.c !== c.id);
      await save(); location.hash = '#/'; toast('Klasse gelöscht');
    }
  },
  async addStudents() {
    const c = currentClass(); if (!c) return;
    const txt = await modal({ title: 'Schüler:innen eintippen', text: 'Ein Name pro Zeile.', textarea: true, placeholder: 'Huber Anna\nBauer Ben', ok: 'Hinzufügen' });
    if (!txt) return;
    const n = addNames(c, txt.split(/\r?\n/).map(x => x.replace(/[;,\t]+/g, ' ').replace(/\s+/g, ' ').trim()).filter(Boolean));
    await save(); render(); toast(plural(n, 'Person', 'Personen') + ' hinzugefügt');
  },
  async importStudents() {
    const c = currentClass(); if (!c) return;
    const f = await pickFile(); if (!f) return;
    try {
      const p = parseStudents(await readTable(f));
      let names = [...p.groups.values()].flat();
      if (p.hasClass && p.groups.size > 1) {
        const match = [...p.groups.keys()].find(k => k.toLowerCase() === c.name.toLowerCase() || c.name.toLowerCase().startsWith(k.toLowerCase() + ' '));
        if (match) names = p.groups.get(match);
      }
      if (!names.length) return toast('Keine Namen in der Datei gefunden');
      const n = addNames(c, names); await save(); render();
      toast(`${n} importiert${names.length - n ? `, ${names.length - n} schon vorhanden` : ''}`);
    } catch (e) { toast(errMsg(e)); }
  },

  // Startseite: eine Datei für alles – WebUntis/Excel/CSV-Listen oder Datensicherung
  async importAny(arg) {
    const f = arg instanceof File ? arg : await pickFile(); if (!f) return;
    let rows;
    try {
      const head = new Uint8Array(await f.slice(0, 4).arrayBuffer());
      if (head[0] === 0x7B || /\.json$/i.test(f.name)) return actions.importBackup(f);
      rows = await readTable(f);
    } catch (e) { return toast(errMsg(e)); }
    const p = parseStudents(rows);
    if (!p.total) return toast('Keine Namen in der Datei gefunden');

    let groups = [...p.groups.entries()];
    if (!p.hasClass || (groups.length === 1 && !groups[0][0])) {
      const guess = f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ')
        .replace(/\b(schüler(innen)?|schueler(innen)?|liste|export|webuntis|klasse)\b/gi, '').replace(/\s+/g, ' ').trim();
      const name = (await modal({ title: 'Name der Klasse', text: `${p.total} Namen gefunden. Die Datei enthält keine Klassenspalte.`, input: true, value: guess, placeholder: 'z. B. 3B', ok: 'Weiter' }) || '').trim();
      if (!name) return;
      groups = [[name, [...p.groups.values()].flat()]];
    } else {
      groups = groups.map(([k, n]) => [k || 'Ohne Klasse', n]);
    }
    groups.sort((a, b) => a[0].localeCompare(b[0], 'de', { numeric: true }));

    const findClass = k => data.classes.find(c => c.name.toLowerCase() === k.toLowerCase());
    const summary = groups.map(([k, n]) => `${k}: ${plural(n.length, 'Person', 'Personen')} ${findClass(k) ? '(wird ergänzt)' : '(neu)'}`).join('\n');
    if (!await modal({ title: groups.length === 1 ? 'Klasse importieren' : `${groups.length} Klassen importieren`, text: summary, ok: 'Importieren' })) return;

    let added = 0, created = 0, last = null;
    for (const [k, names] of groups) {
      let c = findClass(k);
      if (!c) { c = { id: uid(), name: k, students: [] }; data.classes.push(c); created++; }
      added += addNames(c, names); last = c;
    }
    await save();
    toast(`${created ? plural(created, 'neue Klasse', 'neue Klassen') + ' · ' : ''}${added} importiert`);
    if (groups.length === 1) location.hash = '#/k/' + last.id; else { location.hash = '#/'; render(); }
  },

  tab(d) { ui.tab = d.v; saveUi(); render(); },
  type(d) { ui.type = d.v; saveUi(); render(); },
  filter(d) { ui.filter = d.v; saveUi(); render(); },
  day(d) { ui.date = shiftDay(ui.date, +d.v); render(); },
  toToday() { ui.date = today(); render(); },

  async mark(d) {
    const c = currentClass(); if (!c) return;
    const s = c.students.find(x => x.id === d.s); if (!s) return;
    if (TYPES[ui.type].multi) {
      const r = await behaviorSheet(s.name, d.v); if (!r) return;
      data.entries.push({ id: uid(), c: c.id, s: s.id, d: ui.date, t: ui.type, v: r.v, n: r.n });
      toast('Verhalten notiert: ' + vhLabel(r.v));
    } else {
      const i = data.entries.findIndex(e => e.c === c.id && e.s === d.s && e.d === ui.date && e.t === ui.type);
      if (i >= 0 && data.entries[i].v === d.v) data.entries.splice(i, 1);
      else if (i >= 0) data.entries[i].v = d.v;
      else data.entries.push({ id: uid(), c: c.id, s: d.s, d: ui.date, t: ui.type, v: d.v });
    }
    const row = document.querySelector(`[data-row="${d.s}"]`);
    if (row) row.outerHTML = rowHTML(c, s);
    haptic();
    await save();
  },
  cmpClass(d) {
    const c = getClass(d.c); if (!c) return;
    const target = getClass(location.hash.split('/')[2]);
    const have = new Set(target ? target.students.map(s => s.name.toLowerCase()) : []);
    const keys = c.students.filter(s => !have.has(s.name.toLowerCase())).map(s => cmpKey(c.id, s.id));
    const all = keys.length && keys.every(k => cmp.sel.has(k));
    keys.forEach(k => all ? cmp.sel.delete(k) : cmp.sel.add(k));
    render();
  },
  cmpStudent(d) { const k = cmpKey(d.c, d.s); cmp.sel.has(k) ? cmp.sel.delete(k) : cmp.sel.add(k); render(); },
  cmpOpen(d) { cmp.open.has(d.c) ? cmp.open.delete(d.c) : cmp.open.add(d.c); render(); },
  cmpCarry() { cmp.carry = !cmp.carry; render(); },
  async cmpCreate() {
    if (!cmp.sel.size) return;
    let target = getClass(location.hash.split('/')[2]);
    if (!target) {
      const name = (cmp.name || '').trim() || (await modal({ title: 'Name der Gruppe', input: true, placeholder: 'z. B. Religion 3A/3B', ok: 'Anlegen' }) || '').trim();
      if (!name) return;
      const firstSrc = getClass([...cmp.sel][0].split('|')[0]);
      target = { id: uid(), name, students: [], ...(firstSrc && firstSrc.cfg ? { cfg: JSON.parse(JSON.stringify(firstSrc.cfg)) } : {}) };
      data.classes.push(target);
    }
    const have = new Set(target.students.map(s => s.name.toLowerCase()));
    let added = 0, copied = 0;
    for (const k of cmp.sel) {
      const [cid, sid] = k.split('|');
      const src = getClass(cid), s = src && src.students.find(x => x.id === sid);
      if (!s || have.has(s.name.toLowerCase())) continue;
      const ns = { id: uid(), name: s.name, from: s.from || src.name };
      target.students.push(ns); have.add(s.name.toLowerCase()); added++;
      if (cmp.carry) data.entries.filter(e => e.c === cid && e.s === sid).forEach(e => { data.entries.push({ ...e, id: uid(), c: target.id, s: ns.id }); copied++; });
    }
    cmp.key = '';
    await save();
    location.hash = '#/k/' + target.id;
    toast(`${plural(added, 'Person', 'Personen')} übernommen${copied ? ` · ${copied} Einträge kopiert` : ''}`);
  },
  async setScale(d) {
    const c = currentClass(); if (!c) return;
    cfg(c).scale[d.t] = d.v; await save(); render();
  },
  async wStep(d) {
    const c = currentClass(); if (!c) return;
    const w = cfg(c).weight;
    w[d.t] = Math.max(0, Math.min(100, (w[d.t] || 0) + +d.v)); await save(); render();
  },
  async cfgAll() {
    const c = currentClass(); if (!c) return;
    if (!await modal({ title: 'Für alle Klassen übernehmen?', text: `Notenskala und Gewichtung von „${c.name}“ werden für alle ${data.classes.length} Klassen übernommen.`, ok: 'Übernehmen' })) return;
    data.classes.forEach(x => { if (x !== c) x.cfg = JSON.parse(JSON.stringify(cfg(c))); });
    await save(); toast('Für alle Klassen übernommen');
  },
  async entryWeight(d) {
    const e = data.entries.find(x => x.id === d.v); if (!e) return;
    const cur = String(e.w || 1);
    const opts = [['0.5', 'Halb (×½)'], ['1', 'Normal (×1)'], ['2', 'Doppelt (×2)'], ['3', 'Dreifach (×3)']]
      .map(([v, l]) => [v, (v === cur ? '✓  ' : '') + l]);
    const k = await modal({ title: 'Wie stark soll diese Note zählen?', text: `${TYPES[e.t].long} · ${fmtDayLong(e.d)} · ${valInfo(e.t, e.v)[1]}`, options: opts, cancel: 'Abbrechen' });
    if (!k) return;
    if (k === '1') delete e.w; else e.w = +k;
    await save(); render(); toast(k === '1' ? 'Zählt normal' : `Zählt jetzt ×${fmtW(+k)}`);
  },
  async vhStudent() {
    const c = currentClass(); const s = c && c.students.find(x => x.id === currentStudentId()); if (!s) return;
    const r = await behaviorSheet(s.name, 'p'); if (!r) return;
    data.entries.push({ id: uid(), c: c.id, s: s.id, d: today(), t: 'vh', v: r.v, n: r.n });
    await save(); render(); toast('Verhalten notiert');
  },
  async bulkHu() {
    const c = currentClass(); if (!c) return;
    let n = 0;
    for (const s of c.students) {
      if (!data.entries.some(e => e.c === c.id && e.s === s.id && e.d === ui.date && e.t === 'hu')) {
        data.entries.push({ id: uid(), c: c.id, s: s.id, d: ui.date, t: 'hu', v: 'y' }); n++;
      }
    }
    await save(); render(); toast(n ? `${n}× als gebracht eingetragen` : 'Alle sind schon eingetragen');
  },

  async studentMenu() {
    const c = currentClass(); const s = c && c.students.find(x => x.id === currentStudentId()); if (!s) return;
    const k = await modal({ title: s.name, options: [['ren', 'Umbenennen'], ['del', 'Aus der Klasse entfernen', true]], cancel: 'Schließen' });
    if (k === 'ren') {
      const n = (await modal({ title: 'Umbenennen', input: true, value: s.name, ok: 'Speichern' }) || '').trim();
      if (n) { s.name = n; await save(); render(); }
    }
    if (k === 'del') {
      if (!await modal({ title: 'Entfernen?', text: `${s.name} und alle Einträge werden gelöscht.`, ok: 'Entfernen', danger: true })) return;
      c.students = c.students.filter(x => x !== s);
      data.entries = data.entries.filter(e => !(e.c === c.id && e.s === s.id));
      await save(); location.hash = '#/k/' + c.id;
    }
  },
  async delEntry(d) {
    const e = data.entries.find(x => x.id === d.v); if (!e) return;
    const what = e.t === 'vh' ? 'Verhalten: ' + vhLabel(e.v) + (e.n ? ' – ' + e.n : '')
      : `${TYPES[e.t].long}: ${valInfo(e.t, e.v)[1]}`;
    if (!await modal({ title: 'Eintrag löschen?', text: `${fmtDayLong(e.d)}\n${what}`, ok: 'Löschen', danger: true })) return;
    data.entries = data.entries.filter(x => x !== e); await save(); render();
  },

  exportOverview() {
    const c = currentClass(); if (!c) return;
    const head = ['Name'];
    for (const k of SCALABLE) head.push(`${TYPES[k].label} Ø`, `${TYPES[k].label} Einträge`);
    head.push('HÜ gebracht', 'HÜ nicht gebracht', 'Verhalten sehr gut', 'Verhalten gut', 'Verhalten weniger gut', 'Verhalten schlecht', 'Gesamtnote');
    const rows = [head];
    for (const s of [...c.students].sort(byName)) {
      const st = stats(c, s.id);
      const r = [s.name];
      for (const k of SCALABLE) r.push(st.avg[k] == null ? '' : fmtNum(st.avg[k]), st.list[k].join(' '));
      r.push(st.hu.y, st.hu.n, st.vh.pp, st.vh.p, st.vh.n, st.vh.nn, st.total == null ? '' : fmtNum(st.total));
      rows.push(r);
    }
    rows.push([], [`Gewichtung: ${weightSummary(c)}`]);
    saveFile(`Übersicht_${safeName(c.name)}_${today()}.csv`, 'text/csv', toCSV(rows));
  },
  exportEntries() {
    const c = currentClass(); if (!c) return;
    const names = Object.fromEntries(c.students.map(s => [s.id, s.name]));
    const rows = [['Datum', 'Name', 'Kategorie', 'Wert', 'Gewicht', 'Notiz']];
    entriesOf(c.id).filter(e => names[e.s]).sort((a, b) => a.d.localeCompare(b.d) || names[a.s].localeCompare(names[b.s], 'de'))
      .forEach(e => rows.push([e.d.split('-').reverse().join('.'), names[e.s], (TYPES[e.t] || { long: e.t }).long,
        e.t === 'hu' ? (e.v === 'y' ? 'gebracht' : 'nicht gebracht') : e.t === 'vh' ? vhLabel(e.v) : valInfo(e.t, e.v)[1],
        e.w ? fmtW(e.w) : '1', e.n || '']));
    saveFile(`Einträge_${safeName(c.name)}_${today()}.csv`, 'text/csv', toCSV(rows));
  },
  exportBackup() {
    const out = { app: 'klassenbuch', format: 1, exportiert: new Date().toISOString(), data };
    saveFile(`Klassenbuch-Sicherung_${today()}.json`, 'application/json', JSON.stringify(out));
  },
  async importBackup(arg) {
    const f = arg instanceof File ? arg : await pickFile(); if (!f) return;
    // Keine Sicherung, sondern z. B. eine Schülerliste? Dann als Liste importieren.
    const head = new Uint8Array(await f.slice(0, 4).arrayBuffer());
    if (head[0] !== 0x7B && !/\.json$/i.test(f.name)) return actions.importAny(f);
    let inc;
    try {
      const j = JSON.parse(await readText(f));
      inc = j && j.app === 'klassenbuch' ? j.data : null;
      if (!inc || !Array.isArray(inc.classes) || !Array.isArray(inc.entries)) throw 0;
    } catch { return toast('Das ist keine gültige Klassenbuch-Sicherung'); }
    const k = await modal({
      title: 'Sicherung importieren', text: `${plural(inc.classes.length, 'Klasse', 'Klassen')}, ${plural(inc.entries.length, 'Eintrag', 'Einträge')}`,
      options: [['merge', 'Ergänzen (vorhandene Daten behalten)'], ['replace', 'Alles ersetzen', true]]
    });
    if (!k) return;
    if (k === 'replace') {
      if (data.classes.length && !await modal({ title: 'Alles ersetzen?', text: 'Alle aktuellen Daten auf diesem Gerät werden überschrieben.', ok: 'Ersetzen', danger: true })) return;
      data = { classes: inc.classes, entries: inc.entries };
    } else {
      const ids = new Set(data.entries.map(e => e.id));
      for (const c of inc.classes) {
        const ex = getClass(c.id);
        if (!ex) data.classes.push(c);
        else { const sids = new Set(ex.students.map(s => s.id)); c.students.forEach(s => { if (!sids.has(s.id)) ex.students.push(s); }); }
      }
      inc.entries.forEach(e => { if (!ids.has(e.id)) data.entries.push(e); });
    }
    await save(); location.hash = '#/'; render(); toast('Sicherung importiert');
  },
  async wipe() {
    if (!await modal({ title: 'Alle Daten löschen?', text: 'Alle Klassen, Schüler:innen und Einträge auf diesem Gerät werden gelöscht. Exportiere vorher eine Sicherung!', ok: 'Alles löschen', danger: true })) return;
    data = { classes: [], entries: [] }; await save(); location.hash = '#/'; render(); toast('Alle Daten gelöscht');
  }
};

document.addEventListener('click', e => {
  if (e.target.closest('dialog')) return; // Sheets verwalten ihre Klicks selbst
  const el = e.target.closest('[data-a]');
  if (!el || !actions[el.dataset.a]) return;
  e.preventDefault();
  actions[el.dataset.a](el.dataset, el);
});
document.addEventListener('click', e => {
  if (e.target.id === 'date' && e.target.showPicker) { try { e.target.showPicker(); } catch { } }
});
document.addEventListener('change', e => {
  if (e.target.id === 'date' && e.target.value) { ui.date = e.target.value; render(); }
});
document.addEventListener('input', e => { if (e.target.id === 'cmpName') cmp.name = e.target.value; });

/* ---------- Start ---------- */
async function loadData() {
  const d = await DB.get('data');
  if (d && Array.isArray(d.classes)) data = d;
}

async function start() {
  try { await DB.open(); } catch { $('#view').innerHTML = '<div class="nothing">Speicher nicht verfügbar. Bitte den privaten Modus deaktivieren.</div>'; return; }
  const code = (await DB.get('license').catch(() => null)) || lsGet('kb.license', null);
  if (code) {
    const res = await verifyLicense(code);
    if (!res.error) { license = res; await loadData(); }
    else lockMsg = res.error;
  }
  render();
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => { });
}

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => { });
}
start();
