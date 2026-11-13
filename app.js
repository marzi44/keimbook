'use strict';
/* KeimBook – läuft komplett lokal. Keine Netzwerkanfragen, keine externen Dienste. */

// Öffentlicher Lizenzschlüssel. Lizenzen können nur mit dem passenden privaten Schlüssel
// (im Ordner "PRIVAT-nicht-hochladen") erzeugt werden.
const PUBLIC_KEY = {
  kty: 'EC', crv: 'P-256',
  x: 'kHkzCWyGjuxGxGf_3AMH2F_MKEWEjH1hfCnBf7K1Imo',
  y: 'Fv556fMFzralLJTUqYxNxI68b9Fd4ctkLzgn07BzKj0'
};
const APP_VERSION = '4.8';

const TYPES = {
  ma: { label: 'Mitarbeit', long: 'Mitarbeit', icon: 'spark', vals: [['+', '+', 'g'], ['~', '~', 'm'], ['-', '−', 'b']] },
  mu: { label: 'Mündlich', long: 'Mündliche Wiederholung', icon: 'speech', vals: grades() },
  sw: { label: 'Schriftlich', long: 'Schriftliche Wiederholung', icon: 'pen', vals: grades() },
  hu: { label: 'Hausübung', long: 'Hausübung', icon: 'book', vals: [['y', '✓', 'g'], ['n', '✗', 'b']] },
  an: { label: 'Anwesenheit', long: 'Anwesenheit', icon: 'pres', vals: [['AN', '✓', 'g'], ['A', '✗', 'b']] },
  vh: { label: 'Verhalten', long: 'Verhalten', icon: 'frown', vals: [['x', 'Vermerk', 'b']] }
};
// Verhalten: nur Vermerke bei schlechtem Verhalten, jeweils mit Anmerkung – zählt nicht zur Note
const VH_TAGS = ['Stört den Unterricht', 'Unaufmerksam', 'Material vergessen', 'Zu spät', 'Handy', 'Respektlos'];
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
// Wert → [Wert, Anzeige, Farbklasse]. Kennt Note 1–5, + ~ −, Prozent (%73) und eigene Stufen (o:id).
// „passiv“: anwesend, aber keine Leistung – wird vermerkt, zählt nicht zur Note
const PAS = 'PA';
const gcls = g => g == null ? 'm' : g < 2.5 ? 'g' : g <= 4 ? 'm' : 'b';
function valInfo(c, t, v) {
  v = String(v);
  if (v === PAS) return [PAS, 'passiv', 'm'];
  if (v[0] === '%') { const p = parseFloat(v.slice(1)); return [v, fmtVal(p) + ' %', gcls(pctGrade(c, t, p))]; }
  if (v.startsWith('o:')) { const l = ownLevels(c, t).find(x => 'o:' + x.id === v); return l ? [v, l.l, gcls(l.g)] : [v, '?', 'm']; }
  return ((SCALABLE.includes(t) || !TYPES[t]) ? [...SCALES.grade, ...SCALES.pm] : TYPES[t].vals).find(x => x[0] === v) || [v, v, 'm'];
}

/* ---------- Bewertung: Notenskala & Gewichtung (je Klasse) ---------- */
const SCALES = { grade: grades(), pm: [['+', '+', 'g'], ['~', '~', 'm'], ['-', '−', 'b']] };
const SCALE_NAMES = { grade: 'Note 1 – 5', pm: '+ ~ −', pct: 'Prozent', own: 'Eigene' };
const PCT_DEFAULT = [88, 75, 63, 50]; // ab … % = Note 1, 2, 3, 4 – darunter 5
const OWN_DEFAULT = [['++', 1], ['+', 2], ['o', 3], ['−', 4], ['−−', 5]];
const pctLimits = (c, k) => (cfg(c).pct[k] || PCT_DEFAULT);
function pctGrade(c, k, p) { if (p == null || isNaN(p)) return null; const L = pctLimits(c, k); for (let i = 0; i < 4; i++) if (p >= L[i]) return i + 1; return 5; }
const ownLevels = (c, k) => cfg(c).own[k] || OWN_DEFAULT.map(([l, g], i) => ({ id: 'd' + i, l, g }));
// Notenwert (1–5) eines Eintrags – egal mit welcher Skala er eingetragen wurde
function gradeVal(c, e) {
  const v = String(e.v);
  if (v[0] === '%') return pctGrade(c, e.t, parseFloat(v.slice(1)));
  if (v.startsWith('o:')) { const l = ownLevels(c, e.t).find(x => 'o:' + x.id === v); return l ? l.g : null; }
  return NUM[v] ?? null;
}
const scaleShort = (c, k) => { const sc = scaleOf(c, k); return sc === 'pm' ? '+ ~ −' : sc === 'pct' ? `Prozent · 1 ab ${pctLimits(c, k)[0]} %` : sc === 'own' ? 'Eigene: ' + ownLevels(c, k).map(x => x.l).join(' ') : 'Note 1–5'; };
function scaleDesc(c, k) {
  const sc = scaleOf(c, k);
  if (sc === 'pm') return '+ ~ −';
  if (sc === 'pct') { const L = pctLimits(c, k); return `Prozent 0–100 · Note 1 ab ${L[0]} %, 2 ab ${L[1]} %, 3 ab ${L[2]} %, 4 ab ${L[3]} %`; }
  if (sc === 'own') return 'Eigene Skala: ' + ownLevels(c, k).map(x => `${x.l} = ${fmtVal(x.g)}`).join(', ');
  return 'Note 1–5';
}
const SCALABLE = ['ma', 'mu', 'sw'];
const BUILTIN = ['an', 'ma', 'mu', 'sw', 'hu', 'vh'];
const DEFAULT_CFG = { scale: { ma: 'pm', mu: 'grade', sw: 'grade' }, weight: { ma: 30, mu: 30, sw: 40, hu: 0 }, cats: { hidden: [], custom: [] } };
const NUM = { '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '+': 1, '~': 3, '-': 5, y: 1, p: 1, n: 5 };
const SHORT = { an: 'Anwesenheit', ma: 'Mitarbeit', mu: 'Mündl.', sw: 'Schriftl.', hu: 'HÜ', vh: 'Verhalten' };
// Eigene Kategorien: Note (1–5 bzw. + ~ −), Messwert (Zahl mit Einheit) oder Notiz (freier Text)
const KINDS = {
  note: { icon: 'star', label: 'Note', desc: 'Note 1–5 oder + ~ −' },
  num: { icon: 'ruler', label: 'Messwert', desc: 'Zahl mit Einheit, z. B. Weite oder Zeit' },
  text: { icon: 'doc', label: 'Notiz', desc: 'Freier Text je Schüler:in' }
};
function cfg(c) {
  if (!c.cfg) c.cfg = JSON.parse(JSON.stringify(DEFAULT_CFG));
  c.cfg.scale = Object.assign({}, DEFAULT_CFG.scale, c.cfg.scale);
  c.cfg.weight = Object.assign({}, DEFAULT_CFG.weight, c.cfg.weight);
  c.cfg.cats = Object.assign({ hidden: [], custom: [], labels: {} }, c.cfg.cats);
  c.cfg.pct = c.cfg.pct || {};
  c.cfg.own = c.cfg.own || {};
  return c.cfg;
}
const customOf = (c, k) => cfg(c).cats.custom.find(x => x.id === k);
function typeOf(c, k) {
  if (TYPES[k]) {
    const l = c && cfg(c).cats.labels[k];
    return l ? { ...TYPES[k], label: l, long: l, renamed: true } : TYPES[k];
  }
  const x = c && customOf(c, k);
  return x ? { label: x.label, long: x.label, icon: KINDS[x.kind].icon, custom: true, kind: x.kind, unit: x.unit || '', high: x.high !== false } : null;
}
function kindOf(c, k) {
  if (SCALABLE.includes(k)) return 'note';
  if (k === 'hu' || k === 'vh' || k === 'an') return k;
  const x = c && customOf(c, k); return x ? x.kind : null;
}
const catKeys = c => [...BUILTIN, ...cfg(c).cats.custom.map(x => x.id)];
const visKeys = c => catKeys(c).filter(k => !cfg(c).cats.hidden.includes(k));
const weighable = (c, k) => ['note', 'hu'].includes(kindOf(c, k));
const shortOf = (c, k) => (c && cfg(c).cats.labels[k]) || SHORT[k] || (typeOf(c, k) || { label: k }).label;
const scaleOf = (c, t) => kindOf(c, t) === 'note' ? (cfg(c).scale[t] || 'grade') : null;
const valsFor = (c, t) => kindOf(c, t) !== 'note' ? TYPES[t].vals : scaleOf(c, t) === 'own' ? ownLevels(c, t).map(x => ['o:' + x.id, x.l, gcls(x.g)]) : SCALES[scaleOf(c, t)] || SCALES.grade;
const toPm = v => ({ '1': '+', '2': '+', '3': '~', '4': '-', '5': '-' }[v] || v);
const fmtW = w => w === 0.5 ? '½' : String(w).replace('.', ',');
const round3 = n => Math.round(n * 1000) / 1000;
const fmtVal = v => { const n = Number(v); return String(String(v).trim() !== '' && isFinite(n) ? round3(n) : v).replace('.', ','); };
// Abwesenheit: wird eingetragen, zählt aber nicht zur Note
const ABS = { A: 'abwesend', AN: 'anwesend (ohne Note)', AE: 'abwesend' };
const isAbs = v => v === 'A' || v === 'AN' || v === 'AE';
const withUnit = (v, u) => fmtVal(v) + (u ? ' ' + u : '');
function weightSummary(c) {
  const w = cfg(c).weight, keys = visKeys(c).filter(k => weighable(c, k) && (w[k] || 0) > 0);
  const sum = keys.reduce((a, k) => a + w[k], 0);
  if (!sum) return 'Keine Gewichtung festgelegt';
  return keys.map(k => `${typeOf(c, k).label} ${Math.round(w[k] / sum * 100)} %`).join(' · ');
}
const curType = c => { const v = visKeys(c); return v.includes(ui.type) ? ui.type : v[0]; };

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
  eye: svg('<path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>', 19, 1.9),
  eyeOff: svg('<path d="M4 4l16 16"/><path d="M9.9 5.8A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-3 3.7M6.4 7.4A16 16 0 0 0 2.5 12s3.5 6.5 9.5 6.5a9 9 0 0 0 4.3-1.1"/><path d="M10 10a2.8 2.8 0 0 0 4 4"/>', 19, 1.9),
  list: svg('<path d="M9 6.5h11M9 12h11M9 17.5h11"/><path d="M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01" stroke-width="2.8"/>', 19, 1.9),
  star: svg('<path d="M12 3.8l2.5 5.2 5.7.7-4.2 3.9 1.1 5.6L12 16.4l-5.1 2.8 1.1-5.6-4.2-3.9 5.7-.7z"/>', 18, 1.8),
  ruler: svg('<path d="M3.5 15.5l12-12 5 5-12 12z"/><path d="M7.5 11.5l2 2M10.5 8.5l2 2M13.5 5.5l2 2"/>', 18, 1.8),
  doc: svg('<path d="M6.5 3.5h7l4 4v13h-11z"/><path d="M13.5 3.5v4h4M9 12h6M9 15.5h6"/>', 18, 1.8),
  pres: svg('<circle cx="9.5" cy="7.5" r="3.5"/><path d="M3.5 20a6 6 0 0 1 12 0"/><path d="M15.5 12.5l2 2 4-4.5"/>', 18, 1.8),
  check: svg('<path d="M6 12.5l4 4 8-8.5"/>', 15, 2.8),
  down: svg('<path d="M6.5 9.5L12 15l5.5-5.5"/>', 18, 2.2),
  left: svg('<path d="M14.5 5.5L8 12l6.5 6.5"/>', 22, 2.2),
  right: svg('<path d="M9.5 5.5L16 12l-6.5 6.5"/>', 22, 2.2),
  chev: '<svg class="chev" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 5.5L16 12l-6.5 6.5"/></svg>',
  spark: svg('<path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9z"/><path d="M18.5 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>', 18, 1.8),
  speech: svg('<path d="M20 12.5a7.5 7.5 0 0 1-11 6.6L4 20l1.1-4.2A7.5 7.5 0 1 1 20 12.5z"/>', 18, 1.8),
  pen: svg('<path d="M4 20h4L19.2 8.8a2.8 2.8 0 0 0-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>', 18, 1.8),
  book: svg('<path d="M4.5 5.5A2.5 2.5 0 0 1 7 3h12.5v15H7a2.5 2.5 0 0 0-2.5 2.5z"/><path d="M4.5 20.5A2.5 2.5 0 0 1 7 18h12.5v3H7"/>', 18, 1.8),
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
  lock: svg('<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3"/>', 18, 1.9),
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
  },
  del(k) {
    return new Promise((res, rej) => {
      const tx = this.db.transaction('kv', 'readwrite');
      tx.objectStore('kv').delete(k);
      tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error);
    });
  }
};

/* ---------- Verschlüsselung: AES-256-GCM, Schlüssel aus PIN bzw. Passwort (PBKDF2-SHA-256) ---------- */
const TE = new TextEncoder(), TD = new TextDecoder();
const toB64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
const fromB64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const Crypt = {
  ITER: 600000,
  rnd: n => crypto.getRandomValues(new Uint8Array(n)),
  async base(secret) { return crypto.subtle.importKey('raw', TE.encode(secret), 'PBKDF2', false, ['deriveKey', 'deriveBits']); },
  async kek(secret, salt, iter) {
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' }, await this.base(secret), { name: 'AES-GCM', length: 256 }, false, ['wrapKey', 'unwrapKey']);
  },
  async rawKey(secret, salt, iter) { return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' }, await this.base(secret), 256)); },
  async seal(key, bytes) { const iv = this.rnd(12); return { iv, ct: new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes)) }; },
  async open(key, box) { return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: box.iv }, key, box.ct)); }
};

/* ---------- App-Sperre mit PIN: Daten liegen verschlüsselt im Speicher, der Schlüssel nur entsperrt im Arbeitsspeicher ---------- */
let lockCfg = null;     // { salt, iter, iv, wrapped, after }
let dek = null;         // Datenschlüssel (nur im entsperrten Zustand)
let locked = false;
let hiddenAt = 0;
const PIN_LEN = 6;
const pinTries = () => lsGet('kb.pinTries', { n: 0, until: 0 });
async function setPin(pin) {
  if (!dek) dek = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  const salt = Crypt.rnd(16), iv = Crypt.rnd(12), iter = Crypt.ITER;
  const wrapped = new Uint8Array(await crypto.subtle.wrapKey('raw', dek, await Crypt.kek(pin, salt, iter), { name: 'AES-GCM', iv }));
  lockCfg = { salt, iter, iv, wrapped, after: lockCfg ? lockCfg.after : 1 };
  await DB.set('lock', lockCfg);
  await reStoreBackupKey();
  await save();
}
async function tryUnlock(pin) {
  let key;
  try {
    key = await crypto.subtle.unwrapKey('raw', lockCfg.wrapped, await Crypt.kek(pin, lockCfg.salt, lockCfg.iter), { name: 'AES-GCM', iv: lockCfg.iv }, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
  } catch { return false; }
  const d = await DB.get('data');
  data = d && d.enc ? JSON.parse(TD.decode(await Crypt.open(key, d))) : (d && Array.isArray(d.classes) ? d : { classes: [], entries: [] });
  dek = key; locked = false;
  if (migrate(data)) await save();
  return true;
}
async function removePin() {
  const k = await loadBackupKey().catch(() => null);
  lockCfg = null; dek = null;
  await DB.del('lock'); await save();
  if (k) await storeBackupKey(k);
}
function lockNow() {
  if (!lockCfg || locked) return;
  locked = true; dek = null; data = { classes: [], entries: [] };
  const d = $('#dlg'); if (d.open) d.close();
  render();
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') { hiddenAt = Date.now(); return; }
  if (lockCfg && !locked && hiddenAt && Date.now() - hiddenAt >= (lockCfg.after ?? 1) * 60000) lockNow();
});

/* ---------- Sicherungspasswort: gespeichert wird nur der daraus abgeleitete Schlüssel (bei PIN-Sperre verschlüsselt) ---------- */
let hasBkPw = false;
async function setBackupPassword(pw) {
  const salt = Crypt.rnd(16), iter = Crypt.ITER;
  await storeBackupKey({ salt, iter, raw: await Crypt.rawKey(pw, salt, iter) });
  hasBkPw = true;
}
async function storeBackupKey(k) {
  await DB.set('bkkey', dek ? { salt: k.salt, iter: k.iter, box: await Crypt.seal(dek, k.raw) } : k);
}
async function loadBackupKey() {
  const s = await DB.get('bkkey'); if (!s) return null;
  const raw = s.box ? (dek ? await Crypt.open(dek, s.box) : null) : s.raw;
  return raw ? { salt: s.salt, iter: s.iter, raw } : null;
}
async function reStoreBackupKey() { const k = await loadBackupKey().catch(() => null); if (k) await storeBackupKey(k); }

// Eingabe von PIN oder Passwort (zweimal beim Festlegen)
function secretSheet({ title, text, pin = false, twice = false, ok = 'Weiter' }) {
  const field = (n, ph) => `<input name="${n}" type="password" ${pin ? `inputmode="numeric" maxlength="${PIN_LEN}" pattern="[0-9]*"` : ''} autocomplete="new-password" placeholder="${ph}">`;
  return modal({
    title, text, ok,
    body: field('p1', pin ? `${PIN_LEN}-stelliger PIN` : 'Passwort (mind. 8 Zeichen)') + (twice ? field('p2', 'Noch einmal') : '') + '<p class="serr" hidden></p>',
    mount(d) {
      const btn = d.querySelector('.btns .primary'), err = d.querySelector('.serr'), [a, b] = [d.querySelector('[name=p1]'), d.querySelector('[name=p2]')];
      const check = () => {
        const v = a.value, bad = pin ? !new RegExp(`^\\d{${PIN_LEN}}$`).test(v) : v.length < 8;
        const msg = !v ? '' : bad ? (pin ? `Bitte genau ${PIN_LEN} Ziffern.` : 'Mindestens 8 Zeichen.') : twice && b.value && b.value !== v ? 'Die Eingaben stimmen nicht überein.' : '';
        err.hidden = !msg; err.textContent = msg; btn.disabled = bad || (twice && b.value !== v);
      };
      d.addEventListener('input', check); check();
      setTimeout(() => a.focus(), 80);
    },
    collect: d => d.querySelector('[name=p1]').value
  });
}

let data = { classes: [], entries: [] };
// Ab 3.9: Verhalten = nur noch Vermerke. Alte Smiley-Einträge werden einmalig entfernt, Verhalten zählt nicht mehr zur Note.
function migrate(d) {
  let changed = false;
  const n = d.entries.length;
  d.entries = d.entries.filter(e => e.t !== 'vh' || e.v === 'x');
  if (d.entries.length !== n) changed = true;
  d.classes.forEach(c => { if (c.cfg && c.cfg.weight && 'vh' in c.cfg.weight) { delete c.cfg.weight.vh; changed = true; } });
  return changed;
}
let license = null;
let lockMsg = '';
const ui = Object.assign({ tab: 'e', type: 'ma', filter: 'all' }, lsGet('kb.ui', {}));
ui.date = today(); // beim Start immer heute
if (!ui.type) ui.type = 'ma';
if (!ui.filter) ui.filter = 'all';

async function save() {
  if (locked) return; // gesperrt: nichts überschreiben
  try { await DB.set('data', dek ? { enc: 1, ...(await Crypt.seal(dek, TE.encode(JSON.stringify(data)))) } : data); }
  catch (e) { toast('Speichern fehlgeschlagen: ' + e.message); }
}
const saveUi = () => lsSet('kb.ui', { tab: ui.tab, type: ui.type, filter: ui.filter, period: ui.period });
if (!['s1', 's2', 'y', 'all'].includes(ui.period)) ui.period = 'y';

/* ---------- Zeitraum: 1. Semester, 2. Semester, Schuljahr (Sept. bis Aug.) ---------- */
const PERIODS = { s1: '1. Semester', s2: '2. Semester', y: 'Schuljahr', all: 'Alles' };
const sem2Start = () => (data.prefs && data.prefs.sem2) || '02-01';     // MM-TT, Beginn 2. Semester
const schoolYear = (iso = today()) => { const [y, m] = iso.split('-').map(Number); return m >= 9 ? y : y - 1; };
function periodRange(p = ui.period) {
  const y = schoolYear(), from = `${y}-09-01`, mid = `${y + 1}-${sem2Start()}`, to = `${y + 1}-09-01`;
  return p === 's1' ? [from, mid] : p === 's2' ? [mid, to] : p === 'y' ? [from, to] : ['0000-00-00', '9999-12-31'];
}
const inPeriod = d => { const [a, b] = periodRange(); return d >= a && d < b; };
const yearLabel = () => { const y = schoolYear(); return `${y}/${String(y + 1).slice(2)}`; };
const periodText = () => ui.period === 'all' ? 'alle Einträge' : `${PERIODS[ui.period]} ${yearLabel()}`;
const periodFile = () => ({ s1: '1-Semester', s2: '2-Semester', y: 'Schuljahr', all: 'Gesamt' })[ui.period] + '_' + yearLabel().replace('/', '-');
const hasOld = c => { const [a] = periodRange('y'); return data.entries.some(e => e.c === c.id && e.d < a); };
function periodSeg(c) {
  const keys = ['s1', 's2', 'y', ...(ui.period === 'all' || hasOld(c) ? ['all'] : [])];
  return `<div class="seg period">${keys.map(k => `<button class="${ui.period === k ? 'on' : ''}" data-a="setPeriod" data-v="${k}">${k === 'y' ? 'Jahr' : k === 's1' ? '1. Sem.' : k === 's2' ? '2. Sem.' : 'Alles'}</button>`).join('')}</div>`;
}

const getClass = id => data.classes.find(c => c.id === id);
// Auswertungen sehen nur den gewählten Zeitraum (Eintragen selbst ist davon unabhängig)
const entriesOf = (cid, sid) => data.entries.filter(e => e.c === cid && (!sid || e.s === sid) && inPeriod(e.d));

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

let pinBuf = '', pinMsg = '';
function viewPin() {
  setHeader({});
  const t = pinTries(), wait = Math.ceil((t.until - Date.now()) / 1000);
  if (wait > 0) setTimeout(() => { if (locked && !$('#dlg').open) render(); }, 1000); // Countdown
  return `<div class="lock pinlock">
      <img class="lock-logo" src="icon-512.png" alt="">
      <h1>Gesperrt</h1>
      <p>PIN eingeben, um KeimBook zu öffnen.</p>
      <div class="pindots${pinMsg ? ' bad' : ''}" aria-label="${pinBuf.length} von ${PIN_LEN} Ziffern">${Array.from({ length: PIN_LEN }, (_, i) => `<i class="${i < pinBuf.length ? 'on' : ''}"></i>`).join('')}</div>
      <p class="err">${esc(wait > 0 ? `Zu viele Versuche – bitte ${wait} s warten.` : pinMsg)}</p>
      <div class="keypad">${['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map(k => k ? `<button class="key${k === '⌫' ? ' del' : ''}" data-a="pinKey" data-v="${k}" aria-label="${k === '⌫' ? 'Löschen' : k}">${k === '⌫' ? ICON.left : k}</button>` : '<span></span>').join('')}</div>
      <button class="link" data-a="pinForgot">PIN vergessen?</button>
    </div>`;
}
document.addEventListener('keydown', e => {
  if (!locked || $('#dlg').open) return;
  if (/^[0-9]$/.test(e.key)) actions.pinKey({ v: e.key });
  else if (e.key === 'Backspace') actions.pinKey({ v: '⌫' });
});

function viewLock() {
  setHeader({});
  return `
    <div class="lock">
      <img class="lock-logo" src="icon-512.png" alt="">
      <h1>KeimBook</h1>
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
  document.title = title && title !== 'Klassen' ? title + ' – KeimBook' : 'KeimBook';
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
  else if (locked) { key = 'pin'; html = viewPin(); }
  else if (view === 'k' && getClass(a)) { key = 'k' + a; html = viewClass(getClass(a)); }
  else if (view === 's' && getClass(a) && getClass(a).students.find(s => s.id === b)) { key = 's' + b; html = viewStudent(getClass(a), b); }
  else if (view === 'b' && getClass(a)) { key = 'b' + a; html = viewRating(getClass(a)); }
  else if (view === 'kat' && getClass(a)) { key = 'kat' + a; html = viewCats(getClass(a)); }
  else if (view === 'neu' && data.classes.length) { key = 'neu' + (a || ''); html = viewCompose(a ? getClass(a) : null); }
  else if (view === 'verwalten') { key = 'man'; html = viewManage(); }
  else if (view === 'einstellungen') { key = 'set'; html = viewSettings(); }
  else {
    if (location.hash && location.hash !== '#/') history.replaceState(null, '', '#/');
    key = 'home'; html = viewHome();
  }
  v.dataset.v = key === 'home' || key === 'lock' ? key : view; // Seitentyp – auf dem Tablet bekommen Klasse und Schüler:in mehr Platz
  v.innerHTML = html;
  if (key !== lastKey) { v.classList.remove('enter'); void v.offsetWidth; v.classList.add('enter'); lastKey = key; }
  // Aktive Kategorie in der Leiste sichtbar halten
  v.querySelectorAll('.cats').forEach(bar => {
    const on = bar.querySelector('.cat.on'); if (!on) return;
    if (on.offsetLeft + on.offsetWidth > bar.scrollLeft + bar.clientWidth || on.offsetLeft < bar.scrollLeft) bar.scrollLeft = on.offsetLeft - 16;
  });
  onScroll();
}
window.addEventListener('hashchange', () => { main.scrollTop = 0; $('#toast').classList.remove('show'); render(); });
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
  const visible = [...data.classes].filter(c => !c.hidden).sort(byName);
  const hidden = [...data.classes].filter(c => c.hidden).sort(byName);
  const list = visible.length ? `<div class="card">${visible.map(c => classItem(c)).join('')}</div>`
    : `<div class="card empty"><h2>Alle Klassen ausgeblendet</h2><p>Tippe unten auf „ausgeblendet“, um sie wieder einzublenden.</p></div>`;
  return hero + list + `
    <button class="btn secondary block mt" data-a="addClass">${ICON.plus} Neue Klasse</button>
    ${hidden.length ? `<div class="hidrow"><button class="link" data-a="goManage">${ICON.eyeOff} ${plural(hidden.length, 'Klasse', 'Klassen')} ausgeblendet</button></div>` : ''}`;
}

function classItem(c, isHidden = false) {
  const last = data.entries.reduce((m, e) => e.c === c.id && e.d > m ? e.d : m, '');
  const risk = c.students.filter(s => isRisk(stats(c, s.id))).length;
  const body = `<a class="citem" href="#/k/${c.id}">
      <span class="ctile ${avc(c.name)}">${esc(shortClass(c.name))}</span>
      <span class="cbody"><span class="ctitle">${esc(c.name)}</span>
      <span class="csub">${plural(c.students.length, 'Schüler:in', 'Schüler:innen')}${risk ? ` · <span class="b-t">${risk} über 4</span>` : ''}</span></span>
      ${!isHidden && last ? `<span class="cwhen">${esc(shortDay(last))}</span>` : ''}${isHidden ? '' : ICON.chev}</a>`;
  return isHidden ? `<div class="hitem">${body}<button class="link small" data-a="unhide" data-c="${c.id}">Einblenden</button></div>` : body;
}

/* ---------- Klassen verwalten ---------- */
function viewManage() {
  setHeader({ title: 'Klassen verwalten', back: '#/', backLabel: 'Klassen' });
  const rows = [...data.classes].sort(byName).map(c => `
    <div class="mrow${c.hidden ? ' off' : ''}">
      <span class="ctile sm ${avc(c.name)}">${esc(shortClass(c.name))}</span>
      <span class="grow"><span class="ctitle">${esc(c.name)}</span>
        <span class="csub">${plural(c.students.length, 'Schüler:in', 'Schüler:innen')}${c.hidden ? ' · ausgeblendet' : ''}</span></span>
      <button class="mbtn${c.hidden ? '' : ' on'}" data-a="toggleClassHidden" data-c="${c.id}" aria-label="${c.hidden ? 'Einblenden' : 'Ausblenden'}">${c.hidden ? ICON.eyeOff : ICON.eye}</button>
      <button class="mbtn del" data-a="deleteClass" data-c="${c.id}" aria-label="Löschen">${ICON.trash}</button>
    </div>`).join('');
  return `<div class="hero"><h1>Klassen verwalten</h1>
      <div class="sub">${ICON.eye.replace('width="19" height="19"', 'width="15" height="15"')} sichtbar &nbsp;·&nbsp; ${ICON.eyeOff.replace('width="19" height="19"', 'width="15" height="15"')} ausgeblendet</div></div>
    ${rows ? `<div class="card">${rows}</div>` : '<div class="nothing">Noch keine Klassen.</div>'}
    <p class="fine">Ausgeblendete Klassen erscheinen nicht mehr auf der Startseite. Alle Schüler:innen und Einträge bleiben erhalten, und du kannst sie jederzeit wieder einblenden. Für Gruppen aus mehreren Klassen stehen sie weiterhin zur Auswahl.</p>
    <p class="fine">Löschen entfernt die Klasse mit allen Einträgen endgültig.</p>`;
}

/* ---------- Klasse ---------- */
function viewClass(c) {
  setHeader({ title: c.name, back: '#/', backLabel: 'Klassen', act: { icon: 'more', a: 'classMenu', label: 'Klassenmenü' } });
  const hero = `<div class="hero"><div class="eyebrow">${c.students.some(s => s.from) ? 'Gruppe' : 'Klasse'}</div><h1>${esc(c.name)}</h1>
    <div class="sub">${plural(c.students.length, 'Schüler:in', 'Schüler:innen')}${(() => { const n = c.students.filter(s => isRisk(stats(c, s.id))).length; return n ? ` · <span class="riskcount">${WARN} ${n} mit Note über 4</span>` : ''; })()}</div></div>
    ${c.hidden ? `<div class="hidbanner">${ICON.eyeOff}<span class="grow">Diese Klasse ist ausgeblendet</span><button class="link small" data-a="unhide" data-c="${c.id}">Einblenden</button></div>` : ''}`;
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
  const type = curType(c);
  const cats = visKeys(c).map(k => { const t = typeOf(c, k);
    return `<button class="cat ${type === k ? 'on' : ''}" data-a="type" data-v="${k}">${ICON[t.icon]}${esc(t.label)}</button>`; }).join('')
    + `<button class="cat edit" data-a="goCats" aria-label="Kategorien bearbeiten">${ICON.pen}Bearbeiten</button>`;
  const back = ui.date !== today() ? `<div class="today-link"><button class="link" data-a="toToday">Zurück zu heute</button></div>` : '';
  const datebar = `
    <div class="datebar">
      <button class="dbtn" data-a="day" data-v="-1" aria-label="Vorheriger Tag">${ICON.left}</button>
      <div class="datepill">
        <span class="d1">${esc(dayWord(ui.date))}</span>
        <span class="d2">${esc(dt(ui.date).toLocaleDateString('de-AT', { day: 'numeric', month: 'long', year: 'numeric' }))}</span>
        <input type="date" id="date" value="${ui.date}" aria-label="Datum wählen">
      </div>
      <button class="dbtn" data-a="day" data-v="1" aria-label="Nächster Tag">${ICON.right}</button>
    </div>${back}`;
  if (!type) return datebar + `<div class="cats">${cats}</div><div class="card empty"><h2>Keine Kategorie sichtbar</h2><p>Blende über „Bearbeiten“ eine Kategorie ein oder lege eine eigene an.</p></div>`;
  const kind = kindOf(c, type), t = typeOf(c, type);
  const bulk = type === 'hu' ? `<div class="bulk"><button class="link" data-a="bulkFill" data-v="y">Alle übrigen ✓</button></div>`
    : type === 'an' ? `<div class="bulk"><button class="link" data-a="bulkFill" data-v="AN">Alle übrigen anwesend</button></div>`
    : kind === 'num' ? `<p class="fine">${esc(t.label)}${t.unit ? ' in ' + esc(t.unit) : ''} · Wert eintippen, mit „Weiter“ zur nächsten Person. Leeres Feld löscht den Eintrag.</p>`
      : kind === 'text' ? `<p class="fine">Notiz eintippen, mit „Weiter“ zur nächsten Person.</p>`
      : kind === 'vh' ? `<p class="fine">Nur bei schlechtem Verhalten: „Vermerk“ antippen und kurz notieren, was vorgefallen ist. Zählt nicht zur Note.</p>` : '';
  const rows = [...c.students].sort(byName).map(s => rowHTML(c, s)).join('');
  return datebar + `<div class="cats">${cats}</div>${bulk}<div class="card">${rows}</div>`;
}

// Abwesend an diesem Tag? Dann gibt es dort nichts zu benoten.
const isAbsentOn = (c, sid, d) => data.entries.some(e => e.c === c.id && e.s === sid && e.d === d && e.t === 'an' && e.v === 'A');

const pasBtn = (s, cur) => `<button class="v pas${cur && cur.v === PAS ? ' on' : ''}" data-a="mark" data-s="${s.id}" data-v="${PAS}" aria-label="passiv – anwesend, aber keine Leistung" title="passiv">P</button>`;
function rowHTML(c, s) {
  const type = curType(c), t = typeOf(c, type), kind = kindOf(c, type);
  if (type !== 'an' && isAbsentOn(c, s.id, ui.date)) {
    return `<div class="srow absent" data-row="${s.id}">
      <a class="sname-wrap" href="#/s/${c.id}/${s.id}"><span class="sname">${esc(s.name)}${fromTag(s)}</span></a>
      <span class="abstag">abwesend</span></div>`;
  }
  const todays = data.entries.filter(e => e.c === c.id && e.s === s.id && e.d === ui.date && e.t === type);
  let meta = '', btns, cls = '';
  if (kind === 'vh') {
    if (todays.length) meta = `<span class="snote vmnote">${ICON.frown.replace('width="18" height="18"', 'width="12" height="12"')}${esc(todays.map(e => e.n).join(' · '))}</span>`;
    btns = `<button class="vmbtn${todays.length ? ' has' : ''}" data-a="mark" data-s="${s.id}" data-v="x" aria-label="${esc('Vermerk für ' + s.name)}">${ICON.plus}Vermerk${todays.length > 1 ? ` <b>${todays.length}</b>` : ''}</button>`;
  } else if (scaleOf(c, type) === 'pct') {
    const cur = todays[0], isP = cur && String(cur.v)[0] === '%';
    if (cur && cur.n) meta = `<span class="snote">${ICON.speech.replace('width="18" height="18"', 'width="12" height="12"')}${esc(cur.n)}</span>`;
    btns = `<label class="valbox num pct"><input class="valin" data-s="${s.id}" inputmode="decimal" enterkeyhint="next" autocomplete="off"
      value="${isP ? esc(fmtVal(cur.v.slice(1))) : ''}" placeholder="–" aria-label="${esc(t.label + ' ' + s.name + ' in Prozent')}"><span class="unit">%</span></label>` + pasBtn(s, cur);
  } else if (kind === 'num' || kind === 'text') {
    const cur = todays[0];
    btns = `<label class="valbox ${kind}"><input class="valin" data-s="${s.id}" ${kind === 'num' ? 'inputmode="decimal"' : 'autocapitalize="sentences"'} enterkeyhint="next" autocomplete="off"
      value="${cur ? esc(kind === 'num' ? fmtVal(cur.v) : cur.v) : ''}" placeholder="${kind === 'num' ? '–' : 'Notiz …'}" aria-label="${esc(t.label + ' ' + s.name)}">${kind === 'num' && t.unit ? `<span class="unit">${esc(t.unit)}</span>` : ''}</label>`;
    cls = kind === 'text' ? ' textrow' : '';
  } else {
    const cur = todays[0];
    if (cur && cur.n) meta = `<span class="snote">${ICON.speech.replace('width="18" height="18"', 'width="12" height="12"')}${esc(cur.n)}</span>`;
    const sc = scaleOf(c, type), curV = cur ? (sc === 'pm' ? toPm(cur.v) : sc === 'grade' ? ({ '+': '1', '~': '3', '-': '5' }[cur.v] || cur.v) : cur.v) : null;
    const vals = valsFor(c, type);
    btns = vals.map(([v, label, vc]) =>
      `<button class="v ${vc} ${curV === v ? 'on' : ''}${label.length > 1 && !SYM[label] ? ' wide' : ''}" data-a="mark" data-s="${s.id}" data-v="${v}" aria-label="${esc(t.label + ' ' + label)}">${glyph(label)}</button>`).join('') + pasBtn(s, cur);
    cls = vals.length > 3 ? ' five' : '';
  }
  return `<div class="srow${cls}" data-row="${s.id}">
    <a class="sname-wrap" href="#/s/${c.id}/${s.id}"><span class="sname">${isRisk(stats(c, s.id)) ? WARN : ''}${esc(s.name)}${fromTag(s)}</span>${meta ? `<span class="smeta">${meta}</span>` : ''}</a>
    <div class="vals">${btns}</div></div>`;
}

function stats(c, sid) {
  const st = { n: 0, avg: {}, pct: {}, pas: {}, cnt: {}, list: {}, nums: {}, texts: {}, hu: { y: 0, n: 0 }, vh: { n: 0, last: '', lastD: '' }, abs: { A: 0, AN: 0 }, absDays: {}, total: null };
  const acc = {}, vis = visKeys(c);
  for (const k of catKeys(c)) { acc[k] = { s: 0, w: 0 }; st.cnt[k] = { '+': 0, '~': 0, '-': 0 }; st.list[k] = []; st.nums[k] = { n: 0, best: null, last: null, lastD: '' }; st.texts[k] = { n: 0, last: '', lastD: '' }; }
  const es = entriesOf(c.id, sid).sort((a, b) => a.d.localeCompare(b.d));
  for (const e of es) {
    if (!acc[e.t]) continue;
    st.n++;
    const kind = kindOf(c, e.t);
    if (kind === 'num') {
      const x = st.nums[e.t], v = parseFloat(e.v), hi = typeOf(c, e.t).high;
      if (isNaN(v)) continue;
      x.n++; x.last = v; x.lastD = e.d;
      if (x.best == null || (hi ? v > x.best : v < x.best)) x.best = v;
      continue;
    }
    if (kind === 'text') { const x = st.texts[e.t]; x.n++; x.last = e.v; x.lastD = e.d; continue; }
    if (e.t === 'vh') { st.vh.n++; st.vh.last = e.n || ''; st.vh.lastD = e.d; continue; }
    const w = e.w || 1, num = gradeVal(c, e);
    if (num != null) { acc[e.t].s += num * w; acc[e.t].w += w; }
    if (String(e.v)[0] === '%') { const p = st.pct[e.t] || (st.pct[e.t] = { s: 0, w: 0 }); p.s += parseFloat(e.v.slice(1)) * w; p.w += w; }
    if (isAbs(e.v)) { if (st.absDays[e.d] !== 'A') st.absDays[e.d] = e.v === 'AN' ? 'AN' : 'A'; continue; }
    if (e.v === PAS) { st.pas[e.t] = (st.pas[e.t] || 0) + 1; continue; }
    if (e.t === 'hu') st.hu[e.v] = (st.hu[e.v] || 0) + 1;
    else {
      const pm = toPm(e.v); if (pm in st.cnt[e.t]) st.cnt[e.t][pm]++;
      const l = valInfo(c, e.t, e.v)[1];
      st.list[e.t].push(w === 1 ? l : `${l} (×${fmtW(w)})`);
    }
  }
  const wt = cfg(c).weight;
  let S = 0, W = 0;
  for (const k of catKeys(c)) {
    st.avg[k] = acc[k].w ? acc[k].s / acc[k].w : null;
    if (vis.includes(k) && weighable(c, k) && (wt[k] || 0) > 0 && st.avg[k] != null) { S += wt[k] * st.avg[k]; W += wt[k]; }
  }
  st.total = W ? S / W : null;
  for (const k in st.pct) st.pct[k] = st.pct[k].w ? st.pct[k].s / st.pct[k].w : null;
  Object.values(st.absDays).forEach(v => st.abs[v]++);
  return st;
}
// Notenvorschlag fürs Zeugnis: aus dem angezeigten Schnitt (eine Kommastelle) gerundet.
// Steht dort genau x,5, ist es knapp: „x–y“ – die Lehrkraft entscheidet.
function proposal(t) {
  if (t == null) return null;
  const r = Math.round(t * 10) / 10, lo = Math.floor(r);
  if (lo >= 1 && lo < 5 && Math.round((r - lo) * 10) === 5) return { text: `${lo}–${lo + 1}`, close: true, n: null };
  const n = Math.min(5, Math.max(1, Math.round(r)));
  return { text: String(n), close: false, n };
}
const gradeCls = g => g == null ? '' : g < 2.5 ? 'g-t' : g <= 4 ? 'm-t' : 'b-t';

/* ---------- Trend & Warnung ---------- */
const RISK = 4; // Gesamtnote über 4 → Rufzeichen
const isRisk = st => st.total != null && st.total > RISK;
const WARN = '<span class="warn" title="Gesamtnote über 4" aria-label="Achtung: Gesamtnote über 4">!</span>';

// Gesamtnote zu jedem Datum (mit allen Einträgen bis dahin), gleiche Gewichtung wie oben
function seriesOf(c, sid) {
  const wt = cfg(c).weight, keys = visKeys(c).filter(k => weighable(c, k) && (wt[k] || 0) > 0);
  const es = entriesOf(c.id, sid).filter(e => keys.includes(e.t)).sort((a, b) => a.d.localeCompare(b.d));
  const acc = {}; keys.forEach(k => { acc[k] = { s: 0, w: 0 }; });
  const out = [];
  es.forEach((e, i) => {
    const num = gradeVal(c, e), w = e.w || 1;
    if (num != null) { acc[e.t].s += num * w; acc[e.t].w += w; }
    if (i === es.length - 1 || es[i + 1].d !== e.d) {
      let S = 0, W = 0;
      for (const k in acc) if (acc[k].w) { S += wt[k] * acc[k].s / acc[k].w; W += wt[k]; }
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

// + ~ − als Zähler – nur, was vorkommt
const pmCounts = x => [['+', 'g-t', '+'], ['~', 'm-t', '~'], ['-', 'b-t', '−']].filter(([k]) => x[k]).map(([k, c, l]) => `<span class="${c}">${l}${x[k]}</span>`).join('') || dash;
function metricHTML(c, st, k) {
  const m = metricBase(c, st, k), n = st.pas[k];
  return !n ? m : (m === dash ? '' : m) + `<span class="pasn">${n}× passiv</span>`;
}
function metricBase(c, st, k) {
  if (k === 'hu') { const T = st.hu.y + st.hu.n; return T ? `${st.hu.y}/${T}` : dash; }
  if (k === 'an') return st.abs.A ? `<span class="b-t">${st.abs.A}× abw.</span>` : dash;
  if (k === 'vh') return st.vh.n ? `<span class="b-t">${st.vh.n}×</span>` : dash;
  const kind = kindOf(c, k);
  if (kind === 'num') { const x = st.nums[k]; return x.best == null ? dash : esc(withUnit(x.best, typeOf(c, k).unit)); }
  if (kind === 'text') { const x = st.texts[k]; return x.n ? x.n + '×' : dash; }
  if (scaleOf(c, k) === 'pct' && st.pct[k] != null) return `<span class="${gradeCls(st.avg[k])}">${Math.round(st.pct[k])} %</span>`;
  if (st.avg[k] == null) return dash;
  if (scaleOf(c, k) === 'pm') return pmCounts(st.cnt[k]);
  return st.avg[k] == null ? dash : `<span class="${gradeCls(st.avg[k])}">${fmtNum(st.avg[k])}</span>`;
}

function viewOverview(c) {
  const rows = [...c.students].sort(byName).map(s => {
    const st = stats(c, s.id);
    return `<a class="orow" href="#/s/${c.id}/${s.id}">
      <div class="otop"><span class="av ${avc(s.name)}">${esc(initials(s.name))}</span><span class="oname">${esc(s.name)}${fromTag(s)}</span>${isRisk(st) ? WARN : ''}${ICON.chev}</div>
      ${(() => { const tr = trendOf(c, s.id); return `<div class="otrend">
        ${st.total == null ? '<span class="tot">Ø –</span>' : `<span class="tot ${gradeCls(st.total)}">Ø ${fmtNum(st.total)}${trendIcon(tr)}</span>${(p => `<span class="prop ${p.close ? 'close' : gradeCls(p.n)}" title="Notenvorschlag">${p.text}</span>`)(proposal(st.total))}`}
        ${sparkHTML(tr)}</div>`; })()}
      ${(() => { const m = visKeys(c).map(k => [k, metricHTML(c, st, k)]).filter(([, v]) => v !== dash);
        return m.length ? `<div class="metrics">${m.map(([k, v]) => `<span class="met"><span class="ml">${esc(shortOf(c, k))}</span><span class="mv">${v}</span></span>`).join('')}</div>` : ''; })()}</a>`;
  }).join('');
  return `${periodSeg(c)}<div class="card">${rows}</div>
    <p class="legend">Ø = Gesamtnote ${esc(periodText())} · ${esc(weightSummary(c))} · Kästchen = Notenvorschlag (gerundet; bei x,5 knapp – du entscheidest)</p>
    <button class="btn secondary block" data-a="exportMenu">${ICON.download} Exportieren</button>`;
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
  const noteKeys = visKeys(c).filter(k => kindOf(c, k) === 'note');
  const wKeys = visKeys(c).filter(k => weighable(c, k));
  const sum = wKeys.reduce((a, k) => a + (cf.weight[k] || 0), 0);
  const rows = wKeys.map(k => {
    const t = typeOf(c, k), w = cf.weight[k] || 0, isNote = noteKeys.includes(k);
    const name = `${esc(t.label)}<span class="muted block">${isNote ? esc(scaleShort(c, k)) + ' ›' : 'gebracht = 1 · nicht = 5'}</span>`;
    return `<div class="lrow static wrow"><span class="licon">${ICON[t.icon]}</span>
      ${isNote ? `<button class="grow wname" data-a="scaleEdit" data-t="${k}" aria-label="${esc(t.label)}: Notenskala ändern">${name}</button>` : `<span class="grow">${name}</span>`}
      <div class="stepper"><button data-a="wStep" data-t="${k}" data-v="-5" aria-label="${esc(t.label)} weniger">−</button><span class="num">${w} %</span><button data-a="wStep" data-t="${k}" data-v="5" aria-label="${esc(t.label)} mehr">+</button></div></div>`;
  }).join('');
  const sumLine = sum === 100 ? '<span class="g-t">Summe 100 %</span>'
    : sum === 0 ? 'Alle Anteile stehen auf 0 % – es wird keine Gesamtnote berechnet.'
      : `Summe: ${sum} % – wird automatisch auf 100 % umgerechnet.`;
  return `<div class="hero"><div class="eyebrow">${esc(c.name)}</div><h1>Bewertung</h1>
      <div class="sub">Notenskala und Anteil an der Gesamtnote je Kategorie.</div></div>
    <div class="card">${rows || '<div class="nothing">Keine benotbare Kategorie sichtbar</div>'}</div>
    <p class="fine">${sumLine} · Kategorie antippen ändert die Notenskala (1–5, + ~ −, Prozent oder eigene). Je Kategorie wird ein Schnitt gebildet und mit ihrem Anteil gewichtet – 0 % zählt nicht.</p>
    ${data.classes.length > 1 ? `<button class="btn secondary block mt" data-a="cfgAll">Für alle Klassen übernehmen</button>` : ''}`;
}

/* ---------- Kategorien je Klasse ---------- */
function viewCats(c) {
  setHeader({ title: 'Kategorien', back: '#/k/' + c.id, backLabel: c.name });
  const hidden = cfg(c).cats.hidden;
  const desc = k => {
    const kind = kindOf(c, k), t = typeOf(c, k);
    if (k === 'hu') return 'gebracht / nicht gebracht';
    if (k === 'vh') return 'Vermerk mit Anmerkung · zählt nicht zur Note';
    if (k === 'an') return 'anwesend / abwesend · zählt nicht zur Note';
    if (kind === 'note') return scaleShort(c, k);
    if (kind === 'num') return 'Messwert' + (t.unit ? ' in ' + t.unit : '') + (t.high ? ' · höher ist besser' : ' · niedriger ist besser');
    return 'Notiz';
  };
  const row = k => {
    const t = typeOf(c, k), off = hidden.includes(k), n = t.custom ? data.entries.filter(e => e.c === c.id && e.t === k).length : 0;
    return `<div class="mrow${off ? ' off' : ''}">
      <span class="licon">${ICON[t.icon]}</span>
      <button class="grow catname" data-a="catEdit" data-t="${k}" aria-label="${esc(t.label)} bearbeiten"><span class="ctitle">${esc(t.label)} <span class="pen">${ICON.pen}</span></span><span class="csub">${esc(desc(k))}${t.renamed ? ' · Standard: ' + esc(TYPES[k].label) : ''}${t.custom && n ? ` · ${plural(n, 'Eintrag', 'Einträge')}` : ''}</span></button>
      <button class="mbtn${off ? '' : ' on'}" data-a="catToggle" data-t="${k}" aria-label="${off ? 'Einblenden' : 'Ausblenden'}">${off ? ICON.eyeOff : ICON.eye}</button>
      ${t.custom ? `<button class="mbtn del" data-a="catDelete" data-t="${k}" aria-label="Löschen">${ICON.trash}</button>` : '<span class="mbtn ghost"></span>'}
    </div>`;
  };
  const custom = cfg(c).cats.custom.map(x => x.id);
  return `<div class="hero"><div class="eyebrow">${esc(c.name)}</div><h1>Kategorien</h1>
      <div class="sub">Lege fest, was du in dieser Klasse einträgst.</div></div>
    <div class="section">Standard</div>
    <div class="card">${BUILTIN.map(row).join('')}</div>
    <div class="section">Eigene Kategorien</div>
    ${custom.length ? `<div class="card">${custom.map(row).join('')}</div>` : ''}
    <button class="btn primary block${custom.length ? ' mt' : ''}" data-a="catAdd">${ICON.plus} Eigene Kategorie</button>
    <p class="fine">Namen antippen zum Umbenennen, Auge zum Ausblenden (Einträge bleiben erhalten). Die Notenskala stellst du unter „Bewertung“ ein.</p>`;
}

/* ---------- Notenskala-Editor (Prozent-Grenzen, eigene Stufen) ---------- */
const scaleState = (c, k) => ({ scale: (c && k && scaleOf(c, k)) || 'grade', pct: [...(c && k ? pctLimits(c, k) : PCT_DEFAULT)],
  own: (c && k ? ownLevels(c, k) : OWN_DEFAULT.map(([l, g], i) => ({ id: 'd' + i, l, g }))).map(x => ({ ...x })) });
function scaleCheck(st) {
  if (st.scale === 'pct') {
    const L = st.pct;
    if (L.some(x => isNaN(x) || x < 0 || x > 100)) return 'Grenzen bitte zwischen 0 und 100 %.';
    for (let i = 1; i < 4; i++) if (!(L[i] < L[i - 1])) return `Note ${i + 1} muss eine niedrigere Grenze haben als Note ${i}.`;
  }
  if (st.scale === 'own') {
    if (st.own.length < 2) return 'Mindestens zwei Stufen.';
    if (st.own.some(x => !x.l)) return 'Jede Stufe braucht ein Zeichen.';
    if (new Set(st.own.map(x => x.l)).size !== st.own.length) return 'Jedes Zeichen darf nur einmal vorkommen.';
  }
  return null;
}
function scaleHTML(st) {
  const seg = `<div class="seg kindseg four">${Object.entries(SCALE_NAMES).map(([k, l]) =>
    `<button type="button" data-scale="${k}" class="${st.scale === k ? 'on' : ''}"${k === 'pm' ? ' aria-label="Plus, Welle, Minus"' : ''}>${k === 'pm' ? `<span class="symrow">${glyph('+', 13)}${glyph('~', 13)}${glyph('−', 13)}</span>` : k === 'grade' ? '1 – 5' : l}</button>`).join('')}</div>`;
  let extra = '';
  if (st.scale === 'pct') extra = `<p class="stext">Du trägst 0 bis 100 % ein. Ab wie viel Prozent gibt es welche Note?</p>
    <div class="limits">${[0, 1, 2, 3].map(i => `<label class="lim"><span class="ln">Note ${i + 1}</span><span class="la">ab</span><input data-lim="${i}" inputmode="decimal" value="${isNaN(st.pct[i]) ? '' : fmtVal(st.pct[i])}" autocomplete="off" aria-label="Note ${i + 1} ab Prozent"><span class="la">%</span></label>`).join('')}
      <div class="lim"><span class="ln">Note 5</span><span class="la">darunter</span></div></div>`;
  if (st.scale === 'own') extra = `<p class="stext">Bis zu 5 Stufen: ein kurzes Zeichen (z. B. ++, A, ★) und welche Note es in der Gesamtnote bedeutet.</p>
    <div class="levels">${st.own.map((x, i) => `<div class="lvl"><input data-ol="${i}" value="${esc(x.l)}" maxlength="3" autocomplete="off" aria-label="Zeichen für Stufe ${i + 1}">
      <span class="la">=</span><select data-og="${i}" aria-label="Notenwert für Stufe ${i + 1}">${[1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map(g => `<option value="${g}"${g === x.g ? ' selected' : ''}>Note ${fmtVal(g)}</option>`).join('')}</select>
      ${st.own.length > 2 ? `<button type="button" class="lvl-rm" data-orm="${i}" aria-label="Stufe ${i + 1} entfernen">${ICON.close}</button>` : '<span class="lvl-rm"></span>'}</div>`).join('')}</div>
    ${st.own.length < 5 ? `<button type="button" class="link small left" data-oadd="1">${ICON.plus} Stufe hinzufügen</button>` : ''}`;
  return seg + extra + '<p class="serr" hidden></p>';
}
function bindScale(box, st, active = () => true) {
  const ok = box.closest('form').querySelector('.btns .primary');
  const check = () => {
    const err = active() ? scaleCheck(st) : null, el = box.querySelector('.serr');
    if (el) { el.hidden = !err; el.textContent = err || ''; }
    if (ok) ok.disabled = !!err;
  };
  const paint = () => { box.innerHTML = scaleHTML(st); check(); };
  box.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.scale) st.scale = b.dataset.scale;
    else if (b.dataset.orm) st.own.splice(+b.dataset.orm, 1);
    else if (b.dataset.oadd) st.own.push({ id: uid(), l: '', g: 3 });
    else return;
    paint();
    if (b.dataset.oadd) box.querySelector(`[data-ol="${st.own.length - 1}"]`).focus();
  });
  const onInput = e => {
    const t = e.target;
    if (t.dataset.lim != null) st.pct[+t.dataset.lim] = t.value.trim() === '' ? NaN : parseFloat(t.value.replace(',', '.'));
    else if (t.dataset.ol != null) st.own[+t.dataset.ol].l = t.value.trim();
    else if (t.dataset.og != null) st.own[+t.dataset.og].g = +t.value;
    check();
  };
  box.addEventListener('input', onInput); box.addEventListener('change', onInput);
  paint();
  return check;
}
function applyScale(c, k, st) {
  const cf = cfg(c);
  cf.scale[k] = st.scale;
  if (st.scale === 'pct') cf.pct[k] = st.pct.map(Number);
  if (st.scale === 'own') cf.own[k] = st.own.map(x => ({ id: x.id, l: x.l, g: x.g }));
}

function catEditSheet(c, k) {
  const t = typeOf(c, k), kind = kindOf(c, k), x = customOf(c, k);
  let high = t.high !== false;
  const opts = () => `
    ${kind === 'num' ? `<div class="seg kindseg"><button type="button" data-high="1" class="${high ? 'on' : ''}">Höher ist besser</button><button type="button" data-high="0" class="${high ? '' : 'on'}">Niedriger ist besser</button></div>` : ''}`;
  return modal({
    title: 'Kategorie bearbeiten', ok: 'Speichern',
    text: t.custom ? KINDS[kind].label : `Standardkategorie „${TYPES[k].label}“`,
    body: `<input name="label" value="${esc(t.label)}" placeholder="${esc(t.custom ? 'Name' : TYPES[k].label)}" autocomplete="off" autocapitalize="sentences">
      ${kind === 'num' ? `<input name="unit" value="${esc(t.unit || '')}" placeholder="Einheit, z. B. m, s, cm, Punkte" autocomplete="off">` : ''}
      ${kind === 'num' ? `<div class="kindbox">${opts()}</div>` : ''}
      ${!t.custom && t.renamed ? `<button type="button" class="link small left" data-reset="1">Ursprünglichen Namen „${esc(TYPES[k].label)}“ wiederherstellen</button>` : ''}`,
    mount(d) {
      const box = d.querySelector('.kindbox');
      if (box) box.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b) return;
        if (b.dataset.high) high = b.dataset.high === '1';
        box.innerHTML = opts();
      });
      const r = d.querySelector('[data-reset]');
      if (r) r.addEventListener('click', () => { d.querySelector('[name=label]').value = TYPES[k].label; r.remove(); });
    },
    collect(d) {
      const u = d.querySelector('[name=unit]');
      return { label: d.querySelector('[name=label]').value.trim(), high, unit: u ? u.value.trim() : undefined };
    }
  });
}

function catSheet() {
  let kind = 'num', high = true;
  const sst = scaleState();
  const segs = () => `
    <div class="seg kindseg">${Object.entries(KINDS).map(([k, x]) => `<button type="button" data-kind="${k}" class="${kind === k ? 'on' : ''}">${x.label}</button>`).join('')}</div>
    <p class="stext">${KINDS[kind].desc}</p>
    ${kind === 'num' ? `<input name="unit" placeholder="Einheit, z. B. m, s, cm, Punkte" autocomplete="off">
      <div class="seg kindseg"><button type="button" data-high="1" class="${high ? 'on' : ''}">Höher ist besser</button><button type="button" data-high="0" class="${high ? '' : 'on'}">Niedriger ist besser</button></div>` : ''}`;
  return modal({
    title: 'Eigene Kategorie', ok: 'Anlegen',
    body: `<input name="label" placeholder="Name, z. B. Weitsprung" autocomplete="off" autocapitalize="sentences"><div class="kindbox"></div><div class="scalebox"></div>`,
    mount(d) {
      const box = d.querySelector('.kindbox'), sb = d.querySelector('.scalebox');
      const check = bindScale(sb, sst, () => kind === 'note');
      const paint = () => { const u = box.querySelector('[name=unit]'); const uv = u ? u.value : ''; box.innerHTML = segs(); const nu = box.querySelector('[name=unit]'); if (nu) nu.value = uv; sb.hidden = kind !== 'note'; check(); };
      box.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b) return;
        if (b.dataset.kind) kind = b.dataset.kind;
        if (b.dataset.high) high = b.dataset.high === '1';
        paint();
      });
      paint();
      setTimeout(() => d.querySelector('[name=label]').focus(), 80);
    },
    collect(d) {
      const u = d.querySelector('[name=unit]');
      return { label: d.querySelector('[name=label]').value.trim(), kind, sc: sst, high, unit: u ? u.value.trim() : '' };
    }
  });
}

/* ---------- Schüler:in ---------- */
function viewStudent(c, sid) {
  const s = c.students.find(x => x.id === sid);
  setHeader({ title: s.name, back: '#/k/' + c.id, backLabel: c.name, act: { icon: 'more', a: 'studentMenu', label: 'Menü' } });
  const st = stats(c, sid);
  const tile = k => {
    const sc = scaleOf(c, k), a = st.avg[k], t = typeOf(c, k), kind = kindOf(c, k);
    let val, sub;
    if (kind === 'num') {
      const x = st.nums[k];
      val = x.best == null ? '–' : esc(withUnit(x.best, t.unit));
      sub = x.n ? `${t.high ? 'Bestwert' : 'Bestzeit'} · zuletzt ${withUnit(x.last, t.unit)} · ${plural(x.n, 'Messung', 'Messungen')}` : 'noch keine';
    } else if (kind === 'text') {
      const x = st.texts[k];
      val = x.n ? x.n + '×' : '–';
      sub = x.n ? `zuletzt: ${x.last}` : 'noch keine';
    } else if (k === 'an') {
      val = st.abs.A ? `<span class="b-t">${st.abs.A}</span>` : st.abs.AN ? '0' : '–';
      sub = st.abs.A + st.abs.AN ? (st.abs.A ? 'Tage abwesend' : 'nie abwesend') : 'noch nichts eingetragen';
    } else if (k === 'hu') {
      const T = st.hu.y + st.hu.n;
      val = T ? `${st.hu.y}/${T}` : '–';
      sub = st.hu.n ? `${st.hu.n}× nicht gebracht` : T ? 'immer gebracht' : 'noch keine';
    } else if (k === 'vh') {
      val = st.vh.n ? `<span class="b-t">${st.vh.n}</span>` : '0';
      sub = st.vh.n ? `${st.vh.n === 1 ? 'Vermerk' : 'Vermerke'} · zuletzt ${relDay(st.vh.lastD)}` : 'keine Vermerke';
    } else if (sc === 'pct' && st.pct[k] != null) {
      val = `<span class="${gradeCls(a)}">${Math.round(st.pct[k])} %</span>`;
      sub = `entspricht Ø ${fmtNum(a)} · ${plural(st.list[k].length, 'Eintrag', 'Einträge')}`;
    } else if (sc === 'pm') {
      const x = st.cnt[k];
      val = pmCounts(x);
      sub = a == null ? 'noch keine' : `entspricht Ø ${fmtNum(a)}`;
    } else {
      val = a == null ? '–' : `<span class="${gradeCls(a)}">${fmtNum(a)}</span>`;
      sub = st.list[k].length ? 'Noten: ' + st.list[k].join(', ') : 'noch keine';
    }
    if (st.pas[k]) sub = val === '–' || sub === 'noch keine' ? `${st.pas[k]}× passiv` : `${sub} · ${st.pas[k]}× passiv`;
    return `<div class="tile"><div class="k">${esc(t.label)}${sc && sc !== 'pm' ? ' Ø' : ''}</div><div class="val">${val}</div><div class="sub">${esc(sub)}</div></div>`;
  };
  const pr = proposal(st.total);
  const tiles = `${periodSeg(c)}<div class="tiles">
    <a class="tile total" href="#/b/${c.id}"><div class="k">Gesamtnote · ${esc(PERIODS[ui.period])}</div>
      <div class="val">${st.total == null ? '–' : fmtNum(st.total)}${pr ? `<span class="propbig${pr.close ? ' close' : ''}">${pr.text}</span>` : ''}</div>
      <div class="sub">${pr ? (pr.close ? `Knapp zwischen ${pr.text.replace('–', ' und ')} – du entscheidest · ` : `Vorschlag fürs Zeugnis: ${pr.text} · `) : ''}${esc(weightSummary(c))}</div></a>
    ${visKeys(c).map(tile).join('')}
  </div>`;
  const filt = ui.filter === 'all' || visKeys(c).includes(ui.filter) ? ui.filter : 'all';
  const chips = [['all', 'Alle', null], ...visKeys(c).map(k => [k, typeOf(c, k).label, typeOf(c, k).icon])].map(([k, l, ic]) =>
    `<button class="cat ${filt === k ? 'on' : ''}" data-a="filter" data-v="${k}">${ic ? ICON[ic] : ''}${esc(l)}</button>`).join('');
  const es = entriesOf(c.id, sid).filter(e => typeOf(c, e.t) && (filt === 'all' ? e.v !== 'AN' : e.t === filt))
    .sort((a, b) => b.d.localeCompare(a.d) || a.t.localeCompare(b.t));
  let list = '';
  if (!es.length) list = `<div class="nothing">Keine Einträge</div>`;
  else {
    const byDay = new Map();
    es.forEach(e => { if (!byDay.has(e.d)) byDay.set(e.d, []); byDay.get(e.d).push(e); });
    for (const [d, items] of byDay) {
      list += `<div class="dayh">${esc(dayWord(d) === 'Heute' ? 'Heute' : fmtDayHead(d))}</div><div class="card">${items.map(e => {
        const [, label, cls0] = valInfo(c, e.t, e.v);
        const t = typeOf(c, e.t), kind = kindOf(c, e.t);
        const cls = kind === 'num' || kind === 'text' ? 'n' : cls0;
        const title = e.t === 'vh' ? t.label + ': Vermerk' : t.long;
        const note = kind === 'text' ? e.v : e.n;
        const badge = e.t === 'an' ? `<span class="badge ${e.v === 'AN' ? 'g' : 'b'}">${e.v === 'AN' ? 'anwesend' : 'abwesend'}</span>`
          : isAbs(e.v) ? `<span class="badge abs" title="${ABS[e.v]}">${e.v}</span>`
          : e.t === 'vh' || kind === 'text' ? ''
          : kind === 'num' ? `<span class="badge n">${esc(withUnit(e.v, t.unit))}</span>`
          : e.v === PAS ? `<span class="badge pas">passiv</span>`
            : `<button class="badge ${cls}" data-a="entryWeight" data-v="${e.id}" aria-label="Gewichtung ändern">${glyph(label)}${e.w && e.w !== 1 ? `<small>×${fmtW(e.w)}</small>` : ''}</button>`;
        return `<div class="erow"><span class="eicon ${e.t === 'vh' ? 'b' : cls}">${ICON[t.icon]}</span>
          ${kind === 'text' ? `<div class="etext"><div class="etitle">${esc(title)}</div><div class="enote">${esc(note)}</div></div>`
            : `<button class="etext ebtn" data-a="entryNote" data-v="${e.id}" aria-label="Anmerkung bearbeiten"><div class="etitle">${esc(title)}</div>${note ? `<div class="enote">${esc(note)}</div>` : ''}</button>`}
          ${badge}
          <button class="del" data-a="delEntry" data-v="${e.id}" aria-label="Eintrag löschen">${ICON.close}</button></div>`;
      }).join('')}</div>`;
    }
  }
  return `<div class="phero"><span class="av lg ${avc(s.name)}">${esc(initials(s.name))}</span>
      <div><div class="eyebrow">${esc(c.name)}${s.from ? ' · aus ' + esc(s.from) : ''}</div><h1>${esc(s.name)}</h1>
      ${isRisk(st) ? `<div class="riskpill">${WARN} Gesamtnote über 4</div>` : ''}</div></div>
    ${tiles}
    ${trendCard(c, sid)}
    <div class="cats filters">${chips}</div>
    ${es.some(e => weighable(c, e.t) && e.t !== 'vh') ? '<p class="fine">Eintrag antippen: Anmerkung · Note antippen: Gewichtung</p>' : ''}
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
  return `<div class="sechead"><div class="section">Verlauf der Gesamtnote</div><button class="link small" data-a="studentExport">${ICON.download} Exportieren</button></div>
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
    <p class="fine">Letzte Sicherung: <b>${esc(backupWhen())}</b> · Erinnerung zweimal pro Woche<br>Sicherungen sind mit deinem Sicherungspasswort verschlüsselt.${hasBkPw ? ' <button class="link inl" data-a="backupPw">Passwort ändern</button>' : ''}</p>

    <div class="section">App-Sperre</div>
    ${lockCfg ? `<div class="card">
      <div class="lrow static"><span class="licon">${ICON.lock}</span><span class="grow nowrap">Auto-Sperre</span>
        <div class="mini-seg compact">${[1, 5, 15].map(m => `<button class="${(lockCfg.after ?? 1) === m ? 'on' : ''}" data-a="pinAfter" data-v="${m}">${m} min</button>`).join('')}</div></div>
      <button class="lrow" data-a="lockNow"><span class="licon">${ICON.lock}</span><span class="grow">Jetzt sperren</span>${ICON.chev}</button>
      <button class="lrow" data-a="pinChange"><span class="licon">${ICON.key}</span><span class="grow">PIN ändern</span>${ICON.chev}</button>
      <button class="lrow danger" data-a="pinOff"><span class="licon">${ICON.lock}</span><span class="grow">PIN-Sperre ausschalten</span></button>
    </div>
    <p class="fine">Die Daten sind auf diesem Gerät verschlüsselt. Nach dem Öffnen und wenn die App länger im Hintergrund war, fragt sie nach dem PIN.</p>`
    : `<div class="card"><button class="lrow" data-a="pinOn"><span class="licon">${ICON.lock}</span><span class="grow">PIN-Sperre einschalten</span>${ICON.chev}</button></div>
    <p class="fine">Empfohlen: Mit PIN werden alle Daten auf diesem Gerät verschlüsselt und nur nach Eingabe des PINs angezeigt.</p>`}

    <div class="section">Schuljahr ${esc(yearLabel())}</div>
    <div class="card"><label class="lrow static"><span class="licon">${ICON.list}</span><span class="grow">2. Semester beginnt am</span>
      <input class="dateinp" type="date" data-ch="setSem2" value="${schoolYear() + 1}-${sem2Start()}"></label></div>
    <p class="fine">Das Schuljahr läuft von 1. September bis 31. August. Trag hier den ersten Schultag nach den Semesterferien ein – danach richten sich Übersicht, Noten und Exporte für „1. Sem.“ und „2. Sem.“.</p>

    <div class="section">Lizenz</div>
    <div class="card"><div class="lrow static"><span class="licon">${ICON.key}</span><span class="grow">${esc(license.info.n)}</span><span class="muted">${esc(exp)}</span></div></div>

    <div class="section">Datenschutz</div>
    <div class="card"><div class="lrow static info"><span class="licon">${ICON.shield}</span><span class="grow">Keine Cloud, kein Konto, keine Analyse. Die App sendet keine Daten ins Internet.</span></div></div>

    <div class="section">Daten</div>
    <div class="card"><button class="lrow danger" data-a="wipe"><span class="licon">${ICON.trash}</span><span class="grow">Alle Daten löschen</span></button></div>
    <p class="fine center">KeimBook · Version ${APP_VERSION}</p>`;
}

/* ---------- Erinnerung an die Datensicherung (zweimal pro Woche) ---------- */
const BACKUP_EVERY = 3.5 * 864e5, BACKUP_SNOOZE = 864e5;
let backup = { last: 0, snooze: 0 }, backupAsking = false;
const isoOf = ms => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const backupWhen = () => backup.last ? relDay(isoOf(backup.last)) : 'noch nie';
async function backupCheck() {
  if (!license || locked || backupAsking || $('#dlg').open || !data.entries.length) return;
  const now = Date.now();
  if (backup.last && now - backup.last < BACKUP_EVERY) return;
  if (backup.snooze && now < backup.snooze) return;
  backupAsking = true;
  const ok = await modal({
    title: 'Zeit für eine Sicherung',
    text: `Letzte Sicherung: ${backupWhen()}\nAlle Einträge liegen nur auf diesem Gerät. Mit einer Sicherung geht nichts verloren – auch wenn das Handy kaputtgeht.`,
    ok: 'Jetzt sichern', cancel: 'Später'
  });
  backupAsking = false;
  if (ok) return actions.exportBackup();
  backup.snooze = now + BACKUP_SNOOZE;
  await DB.set('backup', backup).catch(() => { });
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') setTimeout(backupCheck, 800); });

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
    // ein verspätetes close-Ereignis des vorigen Dialogs darf diesen nicht schließen
    d.onclose = () => { if (!d.open) finish(''); };
    if (o.mount) o.mount(d);
    d.showModal();
    d.scrollTop = 0;
    const f = d.querySelector('[name=v]');
    if (f) setTimeout(() => f.focus(), 80);
  });
}
$('#dlg').addEventListener('click', e => { if (e.target === e.currentTarget) e.currentTarget.close(); });

// Mehrfachauswahl der Kategorien für den Export
function pickCats(c) {
  const keys = visKeys(c), sel = new Set();
  const row = (k, l) => `<button type="button" class="opt ck${k === '*' ? ' all' : ''}" data-k="${k}"><span class="chk"></span><span class="grow">${esc(l)}</span></button>`;
  return modal({
    title: 'Welche Kategorien?', text: `${c.name} · eine oder mehrere antippen`, ok: 'Weiter',
    body: `<div class="opts catpick">${row('*', 'Alle auswählen')}${keys.map(k => row(k, typeOf(c, k).label)).join('')}</div>`,
    mount(d) {
      const ok = d.querySelector('.btns .primary');
      const paint = () => {
        const all = sel.size === keys.length;
        d.querySelectorAll('[data-k]').forEach(b => {
          const isAll = b.dataset.k === '*', on = isAll ? all : sel.has(b.dataset.k), some = isAll && !all && sel.size > 0;
          const ch = b.querySelector('.chk');
          ch.className = 'chk' + (on ? ' on' : some ? ' some' : '');
          ch.innerHTML = on ? ICON.check : some ? '<i></i>' : '';
          if (isAll) b.querySelector('.grow').textContent = all ? 'Alle abwählen' : 'Alle auswählen';
        });
        ok.disabled = !sel.size;
        ok.textContent = sel.size ? `Weiter mit ${plural(sel.size, 'Kategorie', 'Kategorien')}` : 'Kategorien antippen';
      };
      d.querySelector('.catpick').addEventListener('click', e => {
        const b = e.target.closest('[data-k]'); if (!b) return;
        const k = b.dataset.k;
        if (k === '*') { if (sel.size === keys.length) sel.clear(); else keys.forEach(x => sel.add(x)); }
        else if (sel.has(k)) sel.delete(k); else sel.add(k);
        paint();
      });
      paint();
    },
    collect() { return keys.filter(k => sel.has(k)); }
  });
}

// Vermerk bei schlechtem Verhalten: Schnellauswahl + Anmerkung (Pflicht)
function vermerkSheet(name, d, title = 'Verhalten') {
  const sel = new Set();
  return modal({
    title: title + ': Vermerk', text: `${name} · ${dayWord(d) === 'Heute' ? 'heute' : fmtDay(d)}`, ok: 'Vermerk speichern',
    body: `<div class="tags">${VH_TAGS.map(t => `<button type="button" class="tag" data-tag="${esc(t)}">${esc(t)}</button>`).join('')}</div>
      <textarea name="note" rows="3" placeholder="Was ist vorgefallen?"></textarea>`,
    mount(dl) {
      const ok = dl.querySelector('.btns .primary'), ta = dl.querySelector('[name=note]');
      const paint = () => {
        dl.querySelectorAll('[data-tag]').forEach(b => { const on = sel.has(b.dataset.tag); b.classList.toggle('on', on); b.classList.toggle('b', on); });
        ok.disabled = !sel.size && !ta.value.trim();
      };
      dl.querySelector('.tags').addEventListener('click', e => { const b = e.target.closest('[data-tag]'); if (!b) return; const t = b.dataset.tag; sel.has(t) ? sel.delete(t) : sel.add(t); paint(); });
      ta.addEventListener('input', paint);
      paint();
    },
    collect(dl) { return [...sel, dl.querySelector('[name=note]').value.trim()].filter(Boolean).join(' · ') || null; }
  });
}

let toastTimer;
function toast(msg, act) {
  const t = $('#toast'), acts = !act ? [] : Array.isArray(act) ? act.filter(Boolean) : [act];
  t.textContent = '';
  const m = document.createElement('span'); m.className = 'tmsg'; m.textContent = msg; t.appendChild(m);
  t.classList.toggle('act', acts.length > 0);
  acts.forEach((a, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'tact' + (i ? ' alt' : ''); b.textContent = a.label;
    b.onclick = () => { t.classList.remove('show'); a.fn(); };
    t.appendChild(b);
  });
  t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), acts.length ? 5000 : 2600);
}
// „Rückgängig“: merkt sich den Stand der Einträge vor einer Änderung
function undoable() {
  const snap = JSON.stringify(data.entries);
  return { label: 'Rückgängig', fn: async () => { data.entries = JSON.parse(snap); await save(); render(); haptic(); toast('Rückgängig gemacht'); } };
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
      try { await navigator.share({ files: [file] }); return true; }
      catch (e) { if (e.name === 'AbortError') return false; }
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  toast('Gespeichert: ' + name);
  return true;
}
const safeName = s => s.replace(/[^\wäöüÄÖÜß.-]+/g, '_');

/* ---------- Trends: Daten für PDF und Excel ---------- */
function trendRow(c, s) {
  const st = stats(c, s.id), tr = trendOf(c, s.id);
  const then = tr.dir ? tr.ser.reduce((a, p) => p.d === tr.since ? p.v : a, null) : null;
  return { s, st, tr, then, word: tr.dir ? TREND[tr.dir].word : 'zu wenige Einträge' };
}
const trendRows = c => [...c.students].sort(byName).map(s => trendRow(c, s));
function entryValue(c, e) {
  const t = typeOf(c, e.t) || { label: e.t }, kind = kindOf(c, e.t);
  if (isAbs(e.v)) return e.v === 'AN' ? 'AN – anwesend' : 'A – abwesend';
  if (e.t === 'hu') return e.v === 'y' ? 'gebracht' : 'nicht gebracht';
  if (e.t === 'vh') return 'Vermerk';
  if (kind === 'num') return withUnit(e.v, t.unit);
  if (kind === 'text') return e.v;
  return valInfo(c, e.t, e.v)[1].replace('−', '-');
}

/* ---------- Excel (.xlsx) – selbst erzeugt, ohne Bibliothek ---------- */
const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(b) { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC_T[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function zipStore(files) {
  const enc = new TextEncoder(), parts = [], cd = [];
  let off = 0;
  const u16 = n => [n & 255, (n >>> 8) & 255], u32 = n => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];
  for (const [name, text] of files) {
    const nb = enc.encode(name), db = enc.encode(text), crc = crc32(db);
    const head = [0x50, 0x4B, 3, 4, ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(db.length), ...u32(db.length), ...u16(nb.length), ...u16(0)];
    parts.push(new Uint8Array(head), nb, db);
    cd.push(new Uint8Array([0x50, 0x4B, 1, 2, ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(db.length), ...u32(db.length), ...u16(nb.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(off)]), nb);
    off += head.length + nb.length + db.length;
  }
  const cdLen = cd.reduce((a, b) => a + b.length, 0);
  const end = new Uint8Array([0x50, 0x4B, 5, 6, ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(cdLen), ...u32(off), ...u16(0)]);
  const all = [...parts, ...cd, end], out = new Uint8Array(all.reduce((a, b) => a + b.length, 0));
  let p = 0; all.forEach(a => { out.set(a, p); p += a.length; });
  return out;
}
// sheets: [{ name, head, rows, widths, num: [Spalten mit Zahlformat 0,0] }]
function xlsxBook(sheets) {
  const x = v => String(v ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch])).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  const col = i => { let s = ''; i++; while (i) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
  const cell = (v, r, i, st) => {
    if (v === null || v === undefined || v === '') return '';
    const ref = col(i) + r;
    if (typeof v === 'number' && isFinite(v)) return `<c r="${ref}"${st ? ` s="${st}"` : ''}><v>${Math.round(v * 1000) / 1000}</v></c>`;
    return `<c r="${ref}" t="inlineStr"${st ? ` s="${st}"` : ''}><is><t xml:space="preserve">${x(v)}</t></is></c>`;
  };
  const sheetXml = sh => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${sh.widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols><sheetData><row r="1">${sh.head.map((h, i) => cell(h, 1, i, 1)).join('')}</row>${sh.rows.map((row, ri) => `<row r="${ri + 2}">${row.map((v, i) => cell(v, ri + 2, i, (sh.num || []).includes(i) && typeof v === 'number' ? 2 : 0)).join('')}</row>`).join('')}</sheetData></worksheet>`;
  const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="0.0"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE3EEEA"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  return zipStore([
    ['[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`],
    ['_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${R}/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ['xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${R}"><sheets>${sheets.map((sh, i) => `<sheet name="${x(sh.name.slice(0, 31))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`],
    ['xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${R}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="${R}/styles" Target="styles.xml"/></Relationships>`],
    ...sheets.map((sh, i) => [`xl/worksheets/sheet${i + 1}.xml`, sheetXml(sh)]),
    ['xl/styles.xml', styles]
  ]);
}
const ddmmyyyy = iso => iso.split('-').reverse().join('.');
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
function classTrendsXLSX(c, rows) {
  const noteKeys = visKeys(c).filter(k => kindOf(c, k) === 'note');
  const ser = [];
  rows.forEach(r => r.tr.ser.forEach(p => ser.push([r.s.name, ddmmyyyy(p.d), p.v])));
  return xlsxBook([
    { name: 'Trends', head: ['Name', 'Herkunft', 'Gesamtnote', 'Notenvorschlag', 'vor 4 Wochen', 'Veränderung (+ = besser)', 'Trend', 'Note über 4', 'Abwesend', 'Anwesend', ...noteKeys.map(k => typeOf(c, k).label + ' Ø')],
      rows: rows.map(r => [r.s.name, r.s.from || '', r.st.total, (proposal(r.st.total) || { text: '' }).text, r.then, r.tr.dir ? -r.tr.delta : null, r.word, isRisk(r.st) ? 'ja' : 'nein', r.st.abs.A, r.st.abs.AN, ...noteKeys.map(k => r.st.avg[k])]),
      widths: [28, 12, 12, 15, 13, 22, 20, 12, 13, 22, ...noteKeys.map(() => 14)], num: [2, 4, 5, ...noteKeys.map((_, i) => 10 + i)] },
    { name: 'Verlauf', head: ['Name', 'Datum', 'Gesamtnote'], rows: ser, widths: [28, 12, 12], num: [2] }
  ]);
}
function studentTrendXLSX(c, s) {
  const r = trendRow(c, s);
  const es = entriesOf(c.id, s.id).filter(e => typeOf(c, e.t)).sort((a, b) => a.d.localeCompare(b.d));
  const kv = [['Klasse', c.name + (s.from ? ` (aus ${s.from})` : '')], ['Gesamtnote', r.st.total], ['vor 4 Wochen', r.then], ['Veränderung (+ = besser)', r.tr.dir ? -r.tr.delta : null], ['Trend', r.word], ['Note über 4', isRisk(r.st) ? 'ja' : 'nein'], ['Abwesend', r.st.abs.A], ['Anwesend', r.st.abs.AN],
    ...visKeys(c).map(k => {
      const t = typeOf(c, k), kind = kindOf(c, k), st = r.st;
      if (k === 'an') return null;
      if (k === 'hu') { const T = st.hu.y + st.hu.n; return [t.label, T ? `${st.hu.y} von ${T} gebracht` : '']; }
      if (k === 'vh') return [t.label, plural(st.vh.n, 'Vermerk', 'Vermerke')];
      if (kind === 'num') { const x = st.nums[k]; return [t.label + ' Bestwert', x.best == null ? '' : withUnit(x.best, t.unit)]; }
      if (kind === 'text') return [t.label, plural(st.texts[k].n, 'Notiz', 'Notizen')];
      return [t.label + ' Ø', st.avg[k]];
    }).filter(Boolean), ['Gewichtung', weightSummary(c)]];
  return xlsxBook([
    { name: 'Übersicht', head: ['Kennzahl', 'Wert'], rows: kv, widths: [26, 40], num: [1] },
    { name: 'Verlauf', head: ['Datum', 'Gesamtnote'], rows: r.tr.ser.map(p => [ddmmyyyy(p.d), p.v]), widths: [12, 12], num: [1] },
    { name: 'Einträge', head: ['Datum', 'Kategorie', 'Wert', 'Gewicht', 'Anmerkung'], rows: es.map(e => [ddmmyyyy(e.d), typeOf(c, e.t).label, /^[1-5]$/.test(e.v) ? +e.v : e.t === 'vh' ? 'Vermerk' : entryValue(c, e), e.w || 1, kindOf(c, e.t) === 'text' ? '' : e.n || '']), widths: [12, 22, 18, 9, 50], num: [] }
  ]);
}

/* ---------- PDF – selbst erzeugt, ohne Bibliothek (Standardschrift Helvetica) ---------- */
function pdfKit() {
  const W = 595.28, H = 841.89, M = 40;
  const CP = { 0x20AC: 0x80, 0x201A: 0x82, 0x201E: 0x84, 0x2026: 0x85, 0x2018: 0x91, 0x2019: 0x92, 0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x2212: 0x2D, 0x00D7: 0xD7 };
  const win = str => [...String(str)].map(ch => { const u = ch.codePointAt(0); return u < 256 ? ch : CP[u] ? String.fromCharCode(CP[u]) : '?'; }).join('');
  const pdfStr = str => '(' + win(str).replace(/[\\()]/g, m => '\\' + m) + ')';
  const wid = (str, size, bold) => [...String(str)].reduce((a, ch) => a + (/[il.,:;'|!\s]/.test(ch) ? .28 : /[mwMW]/.test(ch) ? .83 : /[A-ZÄÖÜ]/.test(ch) ? .67 : /[0-9]/.test(ch) ? .556 : .52), 0) * size * (bold ? 1.05 : 1);
  const fit = (str, max, size, bold) => { str = String(str); if (wid(str, size, bold) <= max) return str; while (str.length > 1 && wid(str + '…', size, bold) > max) str = str.slice(0, -1); return str + '…'; };
  const rgb = h => [1, 3, 5].map(i => (parseInt(h.slice(i, i + 2), 16) / 255).toFixed(3)).join(' ');
  const COL = { ink: '#16181A', ink2: '#5E6369', ink3: '#9AA0A6', line: '#E4E2DC', acc: '#1F5C50', accS: '#E3EEEA', pos: '#2E7A4E', mid: '#9A6B12', neg: '#B0402C', negS: '#F6E2DD', zebra: '#F7F6F3', card: '#F4F3EF' };
  const pages = []; let ops = [];
  const k = {
    W, H, M, COL, wid, fit,
    gc: g => g == null ? COL.ink3 : g < 2.5 ? COL.pos : g <= 4 ? COL.mid : COL.neg,
    tc: dir => dir === 'up' ? COL.pos : dir === 'down' ? COL.neg : COL.acc,
    text(x, y, str, { size = 9.5, bold = false, color = COL.ink, align = 'left' } = {}) {
      const w = wid(str, size, bold), xx = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
      ops.push(`BT ${rgb(color)} rg /${bold ? 'F2' : 'F1'} ${size} Tf ${xx.toFixed(2)} ${(H - y).toFixed(2)} Td ${pdfStr(str)} Tj ET`);
    },
    rect(x, y, w, h, color) { ops.push(`${rgb(color)} rg ${x.toFixed(2)} ${(H - y - h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`); },
    line(pts, color, width = 1, dash) { ops.push(`${rgb(color)} RG ${width} w 1 J 1 j ${dash ? `[${dash}] 0 d ` : ''}${pts.map((p, i) => `${p[0].toFixed(2)} ${(H - p[1]).toFixed(2)} ${i ? 'l' : 'm'}`).join(' ')} S${dash ? ' [] 0 d' : ''}`); },
    circle(x, y, r, color) { const q = .5523 * r, yy = H - y, f = n => n.toFixed(2); ops.push(`${rgb(color)} rg ${f(x + r)} ${f(yy)} m ${f(x + r)} ${f(yy + q)} ${f(x + q)} ${f(yy + r)} ${f(x)} ${f(yy + r)} c ${f(x - q)} ${f(yy + r)} ${f(x - r)} ${f(yy + q)} ${f(x - r)} ${f(yy)} c ${f(x - r)} ${f(yy - q)} ${f(x - q)} ${f(yy - r)} ${f(x)} ${f(yy - r)} c ${f(x + q)} ${f(yy - r)} ${f(x + r)} ${f(yy - q)} ${f(x + r)} ${f(yy)} c f`); },
    arrow(x, y, dir, s = 1) {
      const col = dir === 'up' ? COL.pos : dir === 'down' ? COL.neg : COL.ink3, L = (a, b) => k.line(a.map(p => [x + p[0] * s, y + p[1] * s]), col, 1.6 * s);
      if (dir === 'up') { L([[0, 4], [9, -4]]); L([[4, -4], [9, -4], [9, 1]]); }
      else if (dir === 'down') { L([[0, -4], [9, 4]]); L([[4, 4], [9, 4], [9, -1]]); }
      else { L([[0, 0], [10, 0]]); L([[6, -3.5], [10, 0], [6, 3.5]]); }
    },
    warn(x, y) { k.circle(x + 5, y - 3.2, 5, COL.neg); k.text(x + 5, y - 0.2, '!', { size: 7.5, bold: true, color: '#FFFFFF', align: 'center' }); },
    spark(x, y, w, h, ser, dir) {
      k.rect(x, y, w, h, '#FBFAF8');
      const yv = v => y + (Math.min(5, Math.max(1, v)) - 1) / 4 * h;
      k.rect(x, yv(4), w, y + h - yv(4), COL.negS);
      if (ser.length < 2) return false;
      const t0 = dt(ser[0].d).getTime(), span = Math.max(1, dt(ser[ser.length - 1].d).getTime() - t0);
      const pts = ser.map(p => [x + (dt(p.d).getTime() - t0) / span * w, yv(p.v)]);
      k.line(pts, k.tc(dir), 1.4); k.circle(pts[pts.length - 1][0], pts[pts.length - 1][1], 1.8, k.tc(dir));
      return true;
    },
    wrap(str, max, size, bold) {
      const words = String(str).split(/\s+/), lines = []; let cur = '';
      for (const w of words) { const t = cur ? cur + ' ' + w : w; if (wid(t, size, bold) > max && cur) { lines.push(cur); cur = w; } else cur = t; }
      if (cur) lines.push(cur);
      return lines;
    },
    page() { pages.push(ops.join('\n')); ops = []; },
    build(title, footerLeft) {
      if (ops.length) k.page();
      pages.forEach((pg, i) => { ops = []; k.text(M, H - 22, footerLeft, { size: 7.5, color: COL.ink3 }); k.text(W - M, H - 22, `Seite ${i + 1} von ${pages.length}`, { size: 7.5, color: COL.ink3, align: 'right' }); pages[i] = pg + '\n' + ops.join('\n'); });
      const objs = [], add = s2 => { objs.push(s2); return objs.length; };
      const catalog = add(''), pagesId = add('');
      const f1 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
      const f2 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
      const kids = pages.map(content => {
        const cs = add(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
        return add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> /Contents ${cs} 0 R >>`);
      });
      objs[catalog - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
      objs[pagesId - 1] = `<< /Type /Pages /Kids [${kids.map(id => id + ' 0 R').join(' ')}] /Count ${kids.length} >>`;
      const info = add(`<< /Title ${pdfStr(title)} /Producer (KeimBook) >>`);
      let out = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
      const offs = [];
      objs.forEach((o, i) => { offs.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
      const xref = out.length;
      out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offs.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('');
      out += `trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF`;
      const bytes = new Uint8Array(out.length);
      for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 255;
      return bytes;
    }
  };
  return k;
}
function pdfHead(k, eyebrow, title, lines) {
  const { M, COL } = k;
  let y = M;
  k.text(M, y + 8, eyebrow, { size: 8, bold: true, color: COL.acc }); y += 34;
  k.text(M, y, title, { size: 22, bold: true }); y += 18;
  [...lines, `Zeitraum: ${periodText()}`].forEach((l, i) => { k.text(M, y, l, { size: i ? 7.5 : 9, color: i ? COL.ink3 : COL.ink2 }); y += i ? 11 : 14; });
  return y + 10;
}

function classTrendsPDF(c, rows) {
  const k = pdfKit(), { W, H, M, COL } = k;
  const X = { name: M, tot: 194, prop: 224, then: 280, chg: 318, trend: 332, spark: 440, abs: W - M }, SPW = 68, RH = 26;
  const header = first => {
    let y = first ? pdfHead(k, 'TRENDS', c.name, [`Stand ${fmtDayLong(today())} · Gesamtnote gewichtet: ${weightSummary(c)}`,
      'Note = Vorschlag fürs Zeugnis (gerundet; bei x,5 knapp, z. B. „2–3“ – Entscheidung der Lehrkraft). Trend = heute im Vergleich zu vor 4 Wochen (+ = besser).',
      'Abw. / Anw. = Tage abwesend / anwesend (zählt nicht zur Note).']) : M + 6;
    k.rect(M, y, W - 2 * M, 22, COL.accS);
    const hy = y + 14.5, o = { size: 8, bold: true, color: COL.acc };
    k.text(X.name + 8, hy, 'NAME', o); k.text(X.tot, hy, 'GESAMT', { ...o, align: 'right' }); k.text(X.prop, hy, 'NOTE', { ...o, align: 'right' }); k.text(X.then, hy, 'VOR 4 WO.', { ...o, align: 'right' });
    k.text(X.chg, hy, '+/–', { ...o, align: 'right' }); k.text(X.trend, hy, 'TREND', o); k.text(X.spark, hy, 'VERLAUF', o); k.text(X.abs - 8, hy, 'ABW. / ANW.', { ...o, align: 'right' });
    return y + 22;
  };
  let y = header(true), idx = 0;
  for (const r of rows) {
    if (y + RH > H - M - 20) { k.page(); y = header(false); }
    if (idx++ % 2) k.rect(M, y, W - 2 * M, RH, COL.zebra);
    const cy = y + RH / 2 + 3.2;
    let nx = X.name + 8;
    if (isRisk(r.st)) { k.warn(nx, cy); nx += 14; }
    k.text(nx, cy, k.fit(r.s.name + (r.s.from ? ` (${r.s.from})` : ''), X.tot - 42 - nx, 9.5), { size: 9.5 });
    const pr = proposal(r.st.total); if (pr) k.text(X.prop, cy, pr.text, { size: 10, bold: true, color: pr.close ? COL.mid : k.gc(pr.n), align: 'right' });
    k.text(X.tot, cy, r.st.total == null ? '–' : fmtNum(r.st.total), { size: 10, bold: true, color: k.gc(r.st.total), align: 'right' });
    k.text(X.then, cy, r.then == null ? '–' : fmtNum(r.then), { size: 9.5, color: COL.ink2, align: 'right' });
    if (r.tr.dir) {
      const d = -r.tr.delta;
      k.text(X.chg, cy, (d > 0.04 ? '+' : d < -0.04 ? '–' : '±') + fmtNum(Math.abs(d)), { size: 9.5, color: r.tr.dir === 'up' ? COL.pos : r.tr.dir === 'down' ? COL.neg : COL.ink2, align: 'right' });
      k.arrow(X.trend, cy - 3.2, r.tr.dir);
      k.text(X.trend + 16, cy, r.word, { size: 8.5, color: COL.ink2 });
    } else { k.text(X.chg, cy, '–', { color: COL.ink3, align: 'right' }); k.text(X.trend, cy, 'zu wenige Einträge', { size: 8, color: COL.ink3 }); }
    if (!k.spark(X.spark, y + 5, SPW, RH - 10, r.tr.ser, r.tr.dir)) k.text(X.spark + SPW / 2, cy, 'noch kein Verlauf', { size: 7.5, color: COL.ink3, align: 'center' });
    k.text(X.abs - 8, cy, `${r.st.abs.A} / ${r.st.abs.AN}`, { size: 9.5, color: r.st.abs.A ? COL.neg : COL.ink2, align: 'right' });
    k.line([[M, y + RH], [W - M, y + RH]], COL.line, .5);
    y += RH;
  }
  const n = rows.length, up = rows.filter(r => r.tr.dir === 'up').length, down = rows.filter(r => r.tr.dir === 'down').length, risk = rows.filter(r => isRisk(r.st)).length;
  k.text(M, Math.min(y + 24, H - M - 30), `${n} Schüler:innen · ${up} verbessern sich · ${down} verschlechtern sich · ${risk} mit Gesamtnote über 4`, { size: 9, color: COL.ink2 });
  return k.build('Trends ' + c.name, `KeimBook · ${c.name}`);
}

/* ---------- Export einer einzelnen Kategorie ---------- */
function catSummary(c, k, es) {
  const kind = kindOf(c, k), t = typeOf(c, k);
  const cnt = v => es.filter(e => e.v === v).length;
  if (k === 'an') return [['anwesend', cnt('AN')], ['abwesend', cnt('A') + cnt('AE')]];
  if (k === 'hu') { const y = cnt('y'), n = cnt('n'); return [['gebracht', y], ['nicht gebracht', n], ['Quote', y + n ? Math.round(y / (y + n) * 100) + ' %' : '']]; }
  if (k === 'vh') return [['Vermerke', es.length], ['zuletzt', es.length ? es[es.length - 1].n || '' : '']];
  if (kind === 'num') {
    const v = es.map(e => parseFloat(e.v)).filter(x => !isNaN(x));
    const best = v.length ? (t.high ? Math.max(...v) : Math.min(...v)) : null;
    return [['Bestwert' + (t.unit ? ` (${t.unit})` : ''), best == null ? null : round3(best)], ['zuletzt', v.length ? round3(v[v.length - 1]) : null], ['Messungen', v.length]];
  }
  if (kind === 'text') return [['Notizen', es.length], ['zuletzt', es.length ? es[es.length - 1].v : '']];
  const g = es.filter(e => !isAbs(e.v) && gradeVal(c, e) != null);
  let S = 0, W = 0; g.forEach(e => { const w = e.w || 1; S += gradeVal(c, e) * w; W += w; });
  if (scaleOf(c, k) === 'pct') {
    const pe = g.filter(e => String(e.v)[0] === '%'); let P = 0, PW = 0; pe.forEach(e => { const w = e.w || 1; P += parseFloat(e.v.slice(1)) * w; PW += w; });
    return [['Ø %', PW ? Math.round(P / PW * 10) / 10 : null], ['Ø', W ? S / W : null], ['Einträge', g.length], ['passiv', es.filter(e => e.v === PAS).length]];
  }
  return [['Ø', W ? S / W : null], ['Einträge', g.length], ['passiv', es.filter(e => e.v === PAS).length]];
}
function catData(c, k) {
  const rows = [...c.students].sort(byName).map(s => {
    const es = entriesOf(c.id, s.id).filter(e => e.t === k).sort((a, b) => a.d.localeCompare(b.d));
    return { s, es, sum: catSummary(c, k, es) };
  });
  const dates = [...new Set(rows.flatMap(r => r.es.map(e => e.d)))].sort();
  return { t: typeOf(c, k), kind: kindOf(c, k), rows, dates };
}
const catVal = (c, e) => e.t === 'vh' ? e.n || 'Vermerk' : e.t === 'an' ? (e.v === 'AN' ? 'anwesend' : 'abwesend') : entryValue(c, e);
const dayCell = (c, es, d) => { const l = es.filter(x => x.d === d); return !l.length ? '' : l[0].t === 'vh' ? l.map(x => x.n || 'Vermerk').join(' · ') : cellVal(c, l[0]); };
const cellVal = (c, e) => /^[1-5]$/.test(e.v) ? +e.v : String(e.v)[0] === '%' ? parseFloat(e.v.slice(1)) : kindOf(c, e.t) === 'num' && !isNaN(parseFloat(e.v)) ? round3(parseFloat(e.v)) : catVal(c, e);
function catXLSX(c, keys) {
  keys = [].concat(keys);
  if (keys.length === 1) return catXLSX1(c, keys[0]);
  const all = keys.map(k => ({ k, ...catData(c, k) }));
  const studs = [...c.students].sort(byName);
  const head = ['Name', 'Herkunft'], num = [];
  all.forEach(a => catSummary(c, a.k, []).forEach(([l]) => { if (l === 'Ø') num.push(head.length); head.push(`${a.t.label} ${l}`); }));
  const used = new Set(['Übersicht', 'Einträge']);
  const sheetName = l => { let b = String(l).replace(/[\[\]:*?\/\\]/g, '').slice(0, 28) || 'Kategorie', n = b, i = 2; while (used.has(n)) n = `${b} ${i++}`; used.add(n); return n; };
  const val = v => typeof v === 'number' ? v : v ?? '';
  return xlsxBook([
    { name: 'Übersicht', head, num, widths: [28, 12, ...head.slice(2).map(h => Math.min(26, Math.max(12, h.length + 2)))],
      rows: studs.map(s => [s.name, s.from || '', ...all.flatMap(a => a.rows.find(r => r.s.id === s.id).sum.map(x => val(x[1])))]) },
    ...all.map(a => ({ name: sheetName(a.t.label), head: ['Name', ...a.dates.map(ddmmyyyy)], widths: [28, ...a.dates.map(() => 11)], num: [],
      rows: a.rows.map(r => [r.s.name, ...a.dates.map(d => dayCell(c, r.es, d))]) })),
    { name: 'Einträge', head: ['Datum', 'Name', 'Kategorie', 'Wert', 'Gewicht', 'Anmerkung'], widths: [12, 28, 18, 18, 9, 50], num: [],
      rows: all.flatMap((a, ai) => a.rows.flatMap(r => r.es.map(e => ({ d: e.d, ai, row: [ddmmyyyy(e.d), r.s.name, a.t.label, cellVal(c, e), e.w || 1, a.kind === 'text' || a.k === 'vh' ? '' : e.n || ''] }))))
        .sort((x, y) => x.d.localeCompare(y.d) || x.ai - y.ai).map(x => x.row) }
  ]);
}
function catXLSX1(c, k) {
  const { t, rows, dates } = catData(c, k);
  const sumHead = rows.length ? rows[0].sum.map(x => x[0]) : [];
  const fmtCell = v => typeof v === 'number' ? v : v ?? '';
  return xlsxBook([
    { name: 'Übersicht', head: ['Name', 'Herkunft', ...sumHead], rows: rows.map(r => [r.s.name, r.s.from || '', ...r.sum.map(x => fmtCell(x[1]))]), widths: [28, 12, ...sumHead.map(() => 16)], num: sumHead.map((h, i) => h === 'Ø' ? 2 + i : -1) },
    { name: 'Tabelle', head: ['Name', ...dates.map(ddmmyyyy)], rows: rows.map(r => [r.s.name, ...dates.map(d => dayCell(c, r.es, d))]), widths: [28, ...dates.map(() => 11)], num: [] },
    { name: 'Einträge', head: ['Datum', 'Name', 'Wert', 'Gewicht', 'Anmerkung'], rows: rows.flatMap(r => r.es.map(e => [ddmmyyyy(e.d), r.s.name, cellVal(c, e), e.w || 1, kindOf(c, k) === 'text' || k === 'vh' ? '' : e.n || ''])).sort((a, b) => a[0].split('.').reverse().join().localeCompare(b[0].split('.').reverse().join())), widths: [12, 28, 18, 9, 50], num: [] }
  ]);
}
function catSection(kit, c, k, eyebrow) {
  const { W, H, M, COL } = kit, { t, kind, rows, dates } = catData(c, k);
  const n = rows.reduce((a, r) => a + r.es.length, 0);
  const span = dates.length ? `${fmtDay(dates[0])} bis ${fmtDay(dates[dates.length - 1])}` : 'noch keine Einträge';
  const desc = k === 'an' ? 'anwesend / abwesend' : k === 'hu' ? 'gebracht / nicht gebracht' : k === 'vh' ? 'Vermerke bei schlechtem Verhalten'
    : kind === 'num' ? `Messwert${t.unit ? ' in ' + t.unit : ''}, ${t.high ? 'höher' : 'niedriger'} ist besser` : kind === 'text' ? 'Notizen' : scaleDesc(c, k);
  const X = { name: M, sum: M + 150, list: M + 262 }, LW = W - M - X.list - 8, FS = 8.5, LH = 11;
  const head = first => {
    let y = first ? pdfHead(kit, eyebrow, t.label, [`${c.name} · ${desc}`, `${plural(n, 'Eintrag', 'Einträge')} · ${span} · Stand ${fmtDayLong(today())}`]) : M + 6;
    kit.rect(M, y, W - 2 * M, 22, COL.accS);
    const o = { size: 8, bold: true, color: COL.acc };
    kit.text(X.name + 8, y + 14.5, 'NAME', o); kit.text(X.sum, y + 14.5, 'ZUSAMMENFASSUNG', o); kit.text(X.list, y + 14.5, 'EINTRÄGE (DATUM WERT)', o);
    return y + 22;
  };
  const sumText = sum => {
    const l = sum.filter(x => x[1] !== null && x[1] !== '' && !(x[0] === 'zuletzt' && (kind === 'text' || k === 'vh')) && !(k === 'vh' && x[1] === 0) && !(x[0] === 'passiv' && !x[1]))
      .map(([l, v]) => l === 'Ø' ? `Ø ${fmtNum(v)}` : l === 'Ø %' ? `Ø ${fmtVal(v)} %` : l.startsWith('Bestwert') ? `Bestwert ${withUnit(v, t.unit)}` : l === 'zuletzt' ? `zuletzt ${withUnit(v, t.unit)}` : l === 'Vermerke' ? plural(v, 'Vermerk', 'Vermerke') : `${v} ${l}`);
    return l.length ? l : ['–'];
  };
  let y = head(true), idx = 0;
  for (const r of rows) {
    const day = e => dt(e.d).toLocaleDateString('de-AT', { day: 'numeric', month: 'numeric' });
    const tokens = r.es.map(e => kind === 'text' || k === 'vh' ? `${day(e)}: ${kit.fit((kind === 'text' ? e.v : e.n) || 'Vermerk', 220, FS)}`
      : `${day(e)} ${catVal(c, e).replace(' – ', ' ')}${e.w && e.w !== 1 ? ` ×${fmtW(e.w)}` : ''}${e.n ? ` (${kit.fit(e.n, 150, FS)})` : ''}`.replace(/\s+/g, ' ').trim());
    const lines = tokens.length ? kit.wrap(tokens.join('  ·  '), LW, FS) : ['–'];
    const sl = sumText(r.sum);
    const RH = Math.max(24, Math.max(lines.length, sl.length) * LH + 12);
    if (y + RH > H - M - 20) { kit.page(); y = head(false); }
    if (idx++ % 2) kit.rect(M, y, W - 2 * M, RH, COL.zebra);
    kit.text(X.name + 8, y + 15, kit.fit(r.s.name + (r.s.from ? ` (${r.s.from})` : ''), X.sum - X.name - 16, 9.5), { size: 9.5 });
    sl.forEach((l, i) => { const hi = i === 0 && l !== '–'; kit.text(X.sum, y + 15 + i * LH, kit.fit(l, X.list - X.sum - 8, 8.8, hi), { size: 8.8, bold: hi, color: hi ? COL.ink : l === '–' ? COL.ink3 : COL.ink2 }); });
    lines.forEach((l, i) => kit.text(X.list, y + 15 + i * LH, l, { size: FS, color: tokens.length ? COL.ink2 : COL.ink3 }));
    kit.line([[M, y + RH], [W - M, y + RH]], COL.line, .5);
    y += RH;
  }
}
// Kurzwert je Kategorie für die Übersichtsseite
function catShort(c, k, es) {
  if (!es.length) return ['–', null];
  const sum = catSummary(c, k, es), kind = kindOf(c, k), t = typeOf(c, k);
  if (k === 'an') return [String(sum[1][1]), null, sum[1][1] ? 'neg' : null];
  if (k === 'hu') return [`${sum[0][1]} / ${sum[0][1] + sum[1][1]}`, null];
  if (k === 'vh') return [plural(es.length, 'Vermerk', 'Vermerke'), null, 'neg'];
  if (kind === 'num') return [sum[0][1] == null ? '–' : withUnit(sum[0][1], t.unit), null];
  if (kind === 'text') return [plural(es.length, 'Notiz', 'Notizen'), null];
  if (sum[0][0] === 'Ø %') return sum[1][1] == null ? ['–', null] : sum[0][1] == null ? ['Ø ' + fmtNum(sum[1][1]), sum[1][1]] : [`${Math.round(sum[0][1])} %`, sum[1][1]];
  return sum[0][1] == null ? ['–', null] : ['Ø ' + fmtNum(sum[0][1]), sum[0][1]];
}
function catOverview(kit, c, keys) {
  const { W, H, M, COL } = kit;
  const labels = keys.map(k => typeOf(c, k).label);
  const legend = [keys.some(k => kindOf(c, k) === 'note') && 'Ø = gewichteter Schnitt', keys.includes('an') && 'Anwesenheit = Tage abwesend',
    keys.includes('hu') && 'Hausübung = gebracht / gesamt', keys.includes('vh') && 'Verhalten = Vermerke', keys.some(k => kindOf(c, k) === 'num') && 'Messwerte = Bestwert'].filter(Boolean).join(' · ');
  const NW = keys.length > 4 ? 120 : 150, CW = (W - 2 * M - NW) / keys.length, FS = CW > 80 ? 9.5 : 8.8, RH = 24;
  const hs = l => { let z = 8; while (z > 6 && kit.wid(l, z, true) > CW - 6) z -= .25; return z; };
  const by = Object.fromEntries(keys.map(k => [k, catData(c, k)]));
  const head = first => {
    const y = first ? pdfHead(kit, 'KATEGORIEN', c.name, [labels.join(' · '), `${legend ? legend + ' · ' : ''}Stand ${fmtDayLong(today())}`]) : M + 6;
    kit.rect(M, y, W - 2 * M, 22, COL.accS);
    const o = { size: 8, bold: true, color: COL.acc };
    kit.text(M + 8, y + 14.5, 'NAME', o);
    labels.forEach((l, i) => { const u = l.toUpperCase(), z = hs(u); kit.text(M + NW + i * CW, y + 14.5, kit.fit(u, CW - 6, z, true), { ...o, size: z }); });
    return y + 22;
  };
  let y = head(true);
  [...c.students].sort(byName).forEach((s, idx) => {
    if (y + RH > H - M - 20) { kit.page(); y = head(false); }
    if (idx % 2) kit.rect(M, y, W - 2 * M, RH, COL.zebra);
    kit.text(M + 8, y + 15.5, kit.fit(s.name + (s.from ? ` (${s.from})` : ''), NW - 16, 9.5), { size: 9.5 });
    keys.forEach((k, i) => {
      const r = by[k].rows.find(x => x.s.id === s.id), [txt, g, tone] = catShort(c, k, r ? r.es : []);
      kit.text(M + NW + i * CW, y + 15.5, kit.fit(txt, CW - 8, FS, g != null), { size: FS, bold: g != null || !!tone, color: txt === '–' ? COL.ink3 : g != null ? kit.gc(g) : tone ? COL[tone] : COL.ink });
    });
    kit.line([[M, y + RH], [W - M, y + RH]], COL.line, .5);
    y += RH;
  });
}
function catPDF(c, keys) {
  keys = [].concat(keys);
  const kit = pdfKit(), multi = keys.length > 1;
  if (multi) catOverview(kit, c, keys);
  keys.forEach((k, i) => { if (multi) kit.page(); catSection(kit, c, k, multi ? `KATEGORIE ${i + 1} VON ${keys.length}` : 'KATEGORIE'); });
  const name = multi ? 'Kategorien' : typeOf(c, keys[0]).label;
  return kit.build(`${name} ${c.name}`, `KeimBook · ${c.name} · ${name}`);
}

function studentTrendPDF(c, s) {
  const k = pdfKit(), { W, H, M, COL } = k, r = trendRow(c, s), st = r.st;
  let y = pdfHead(k, 'TREND', s.name, [`${c.name}${s.from ? ` · aus ${s.from}` : ''} · Stand ${fmtDayLong(today())}`, `Gesamtnote gewichtet: ${weightSummary(c)}`]);
  // Kennzahlen
  const cards = [
    ['GESAMTNOTE', st.total == null ? '–' : fmtNum(st.total), k.gc(st.total)],
    ['VOR 4 WOCHEN', r.then == null ? '–' : fmtNum(r.then), COL.ink],
    ['TREND', r.tr.dir ? (-r.tr.delta > 0.04 ? '+' : -r.tr.delta < -0.04 ? '–' : '±') + fmtNum(Math.abs(r.tr.delta)) : '–', r.tr.dir === 'up' ? COL.pos : r.tr.dir === 'down' ? COL.neg : COL.ink],
    ['ABWESEND', String(st.abs.A), st.abs.A ? COL.neg : COL.ink]
  ];
  const cw = (W - 2 * M - 3 * 10) / 4;
  cards.forEach(([l, v, col], i) => {
    const x = M + i * (cw + 10);
    k.rect(x, y, cw, 58, COL.card);
    k.text(x + 12, y + 17, l, { size: 7.5, bold: true, color: COL.ink3 });
    k.text(x + 12, y + 44, v, { size: 22, bold: true, color: col });
  });
  if (r.tr.dir) k.arrow(M + 2 * (cw + 10) + cw - 26, y + 37, r.tr.dir, 1.3);
  y += 58 + 12;
  const note = [r.tr.dir ? `${r.word[0].toUpperCase() + r.word.slice(1)} gegenüber vor 4 Wochen.` : 'Noch zu wenige Einträge für einen Trend.',
    isRisk(st) ? 'Achtung: Gesamtnote über 4.' : '', st.abs.AN ? `${st.abs.AN}× anwesend ohne Note.` : ''].filter(Boolean).join(' ');
  if (isRisk(st)) k.warn(M, y + 6);
  k.text(M + (isRisk(st) ? 15 : 0), y + 9, note, { size: 9.5, color: isRisk(st) ? COL.neg : COL.ink2 });
  y += 30;
  // Diagramm
  k.text(M, y, 'VERLAUF DER GESAMTNOTE', { size: 8, bold: true, color: COL.acc }); y += 12;
  const cx = M + 22, cwid = W - 2 * M - 52, ch = 170, cy0 = y + 6;
  const yv = v => cy0 + (Math.min(5, Math.max(1, v)) - 1) / 4 * ch;
  k.rect(cx, yv(4), cwid, yv(5) - yv(4), COL.negS);
  [1, 2, 3, 4, 5].forEach(g => { k.line([[cx, yv(g)], [cx + cwid, yv(g)]], COL.line, .6); k.text(cx - 8, yv(g) + 3, String(g), { size: 8, color: COL.ink3, align: 'right' }); });
  k.line([[cx, yv(4)], [cx + cwid, yv(4)]], COL.neg, .7, '3 3');
  const ser = r.tr.ser;
  if (ser.length >= 2) {
    const t0 = dt(ser[0].d).getTime(), span = Math.max(1, dt(ser[ser.length - 1].d).getTime() - t0);
    const pts = ser.map(p => [cx + (dt(p.d).getTime() - t0) / span * cwid, yv(p.v)]);
    k.line(pts, k.tc(r.tr.dir), 2);
    pts.forEach((p, i) => k.circle(p[0], p[1], i === pts.length - 1 ? 3.6 : 2, k.tc(r.tr.dir)));
    const last = pts[pts.length - 1];
    k.text(last[0] + 7, last[1] + 3.5, fmtNum(ser[ser.length - 1].v), { size: 9, bold: true });
    const sh = d => dt(d).toLocaleDateString('de-AT', { day: 'numeric', month: 'numeric' });
    k.text(cx, cy0 + ch + 14, sh(ser[0].d), { size: 8, color: COL.ink3 });
    if (ser.length > 2) k.text(cx + cwid / 2, cy0 + ch + 14, sh(ser[Math.floor(ser.length / 2)].d), { size: 8, color: COL.ink3, align: 'center' });
    k.text(cx + cwid, cy0 + ch + 14, sh(ser[ser.length - 1].d), { size: 8, color: COL.ink3, align: 'right' });
  } else k.text(cx + cwid / 2, cy0 + ch / 2, 'Noch kein Verlauf vorhanden', { size: 9, color: COL.ink3, align: 'center' });
  y = cy0 + ch + 34;
  // Kategorien
  const rowsK = visKeys(c).map(key => [typeOf(c, key).label, (() => {
    const kind = kindOf(c, key);
    if (key === 'an') return st.abs.A + st.abs.AN ? `${st.abs.AN}× anwesend · ${st.abs.A}× abwesend` : '–';
    if (key === 'hu') { const T = st.hu.y + st.hu.n; return T ? `${st.hu.y} von ${T} gebracht` : '–'; }
    if (key === 'vh') return st.vh.n ? plural(st.vh.n, 'Vermerk', 'Vermerke') : 'keine Vermerke';
    if (kind === 'num') { const x = st.nums[key]; return x.best == null ? '–' : `Bestwert ${withUnit(x.best, typeOf(c, key).unit)} · ${plural(x.n, 'Messung', 'Messungen')}`; }
    if (kind === 'text') return st.texts[key].n ? plural(st.texts[key].n, 'Notiz', 'Notizen') : '–';
    const pas = st.pas[key] ? `${st.avg[key] == null ? '' : ' · '}${st.pas[key]}× passiv` : '';
    return st.avg[key] == null ? (pas || '–') : `Ø ${fmtNum(st.avg[key])}  (${st.list[key].join(', ')})${pas}`;
  })()]);
  k.text(M, y, 'KATEGORIEN', { size: 8, bold: true, color: COL.acc }); y += 8;
  rowsK.forEach(([l, v], i) => {
    if (i % 2) k.rect(M, y, W - 2 * M, 20, COL.zebra);
    k.text(M + 8, y + 13.5, l, { size: 9.5, bold: true });
    k.text(M + 150, y + 13.5, k.fit(v, W - 2 * M - 160, 9.5), { size: 9.5, color: COL.ink2 });
    y += 20;
  });
  y += 20;
  // Einträge
  const es = entriesOf(c.id, s.id).filter(e => typeOf(c, e.t)).sort((a, b) => b.d.localeCompare(a.d));
  const eHead = () => {
    k.text(M, y, 'EINTRÄGE', { size: 8, bold: true, color: COL.acc }); y += 8;
    k.rect(M, y, W - 2 * M, 18, COL.accS);
    const o = { size: 7.5, bold: true, color: COL.acc };
    k.text(M + 8, y + 12, 'DATUM', o); k.text(M + 80, y + 12, 'KATEGORIE', o); k.text(M + 210, y + 12, 'WERT', o); k.text(M + 300, y + 12, 'ANMERKUNG', o);
    y += 18;
  };
  if (es.length) {
    if (y + 60 > H - M - 20) { k.page(); y = M; }
    eHead();
    es.forEach((e, i) => {
      if (y + 18 > H - M - 20) { k.page(); y = M; eHead(); }
      if (i % 2) k.rect(M, y, W - 2 * M, 18, COL.zebra);
      const t = typeOf(c, e.t), kind = kindOf(c, e.t);
      const noteTxt = kind === 'text' ? '' : e.n || '';
      k.text(M + 8, y + 12.5, fmtDay(e.d), { size: 8.5, color: COL.ink2 });
      k.text(M + 80, y + 12.5, k.fit(t.label, 125, 8.5), { size: 8.5 });
      k.text(M + 210, y + 12.5, k.fit(entryValue(c, e) + (e.w && e.w !== 1 ? ` (×${fmtW(e.w)})` : ''), 85, 8.5, true), { size: 8.5, bold: true, color: isAbs(e.v) ? COL.ink3 : COL.ink });
      k.text(M + 300, y + 12.5, k.fit(kind === 'text' ? e.v : noteTxt, W - 2 * M - 308, 8.5), { size: 8.5, color: COL.ink2 });
      y += 18;
    });
  }
  return k.build(`Trend ${s.name}`, `KeimBook · ${c.name} · ${s.name}`);
}

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
const currentClass = () => { const [v, a] = location.hash.replace(/^#\/?/, '').split('/'); return (v === 'k' || v === 's' || v === 'b' || v === 'kat') ? getClass(a) : null; };
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
  setPeriod(d) { ui.period = d.v; saveUi(); render(); },
  async setSem2(inp) {
    const v = inp.value; if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return;
    data.prefs = Object.assign({}, data.prefs, { sem2: v.slice(5) }); await save(); toast('2. Semester beginnt am ' + fmtDayLong(v));
  },
  async pinKey(d) {
    if (!locked) return;
    const t = pinTries(); if (t.until > Date.now()) return render();
    if (d.v === '⌫') pinBuf = pinBuf.slice(0, -1);
    else if (pinBuf.length < PIN_LEN) pinBuf += d.v;
    pinMsg = ''; render();
    if (pinBuf.length < PIN_LEN) return;
    const pin = pinBuf;
    if (await tryUnlock(pin)) {
      pinBuf = ''; lsSet('kb.pinTries', { n: 0, until: 0 });
      render(); setTimeout(backupCheck, 800);
    } else {
      const n = t.n + 1;
      lsSet('kb.pinTries', { n, until: n >= 5 ? Date.now() + 30000 * 2 ** (n - 5) : 0 });
      pinBuf = ''; pinMsg = 'Falscher PIN'; render(); haptic();
    }
  },
  async pinForgot() {
    if (!await modal({ title: 'PIN vergessen?', text: 'Ohne PIN lassen sich die verschlüsselten Daten nicht mehr öffnen – auch nicht von mir als Entwickler.\n\nDu kannst alles löschen, neu beginnen und danach deine letzte Sicherung importieren.', ok: 'Alles löschen und neu beginnen', danger: true })) return;
    if (!await modal({ title: 'Wirklich alles löschen?', text: 'Alle Klassen und Einträge auf diesem Gerät werden endgültig gelöscht.', ok: 'Endgültig löschen', danger: true })) return;
    await DB.del('data'); await DB.del('lock'); await DB.del('bkkey');
    lockCfg = null; dek = null; locked = false; hasBkPw = false; data = { classes: [], entries: [] }; pinBuf = ''; lsSet('kb.pinTries', { n: 0, until: 0 });
    location.hash = '#/'; render(); toast('Gelöscht – importiere jetzt deine Sicherung');
  },
  async pinOn() {
    const pin = await secretSheet({ title: 'PIN festlegen', text: 'Mit PIN werden alle Daten auf diesem Gerät verschlüsselt. Merke dir den PIN gut – ohne ihn kommst du nicht mehr an die Daten.', pin: true, twice: true, ok: 'PIN-Sperre einschalten' });
    if (!pin) return;
    await setPin(pin); render(); toast('PIN-Sperre ist eingeschaltet');
  },
  async pinChange() {
    const pin = await secretSheet({ title: 'Neuer PIN', pin: true, twice: true, ok: 'PIN ändern' });
    if (!pin) return;
    await setPin(pin); toast('PIN geändert');
  },
  async pinOff() {
    const pin = await secretSheet({ title: 'PIN-Sperre ausschalten', text: 'Gib zur Bestätigung deinen PIN ein. Danach werden die Daten unverschlüsselt gespeichert.', pin: true, ok: 'Ausschalten' });
    if (!pin) return;
    const keep = data;
    if (!await tryUnlock(pin)) { data = keep; return toast('Falscher PIN'); }
    await removePin(); render(); toast('PIN-Sperre ausgeschaltet');
  },
  async pinAfter(d) { if (!lockCfg) return; lockCfg.after = +d.v; await DB.set('lock', lockCfg); render(); },
  lockNow() { lockNow(); },
  async backupPw() {
    const pw = await secretSheet({ title: 'Neues Sicherungspasswort', text: 'Gilt für alle künftigen Sicherungen. Ältere Sicherungen öffnest du weiter mit dem damaligen Passwort.', twice: true, ok: 'Speichern' });
    if (!pw) return;
    await setBackupPassword(pw); render(); toast('Sicherungspasswort geändert');
  },

  goCompose() { location.hash = '#/neu'; },
  goManage() { location.hash = '#/verwalten'; },
  async unhide(d) { const c = getClass(d.c); if (!c) return; delete c.hidden; await save(); render(); toast(`„${c.name}“ wieder eingeblendet`); },
  async toggleClassHidden(d) {
    const c = getClass(d.c); if (!c) return;
    if (c.hidden) delete c.hidden; else c.hidden = true;
    await save(); render(); toast(c.hidden ? `„${c.name}“ ausgeblendet` : `„${c.name}“ eingeblendet`);
  },
  async deleteClass(d) {
    const c = getClass(d.c); if (!c) return;
    const n = data.entries.filter(e => e.c === c.id).length;
    if (!await modal({ title: 'Klasse löschen?', text: `„${c.name}“ mit ${plural(c.students.length, 'Schüler:in', 'Schüler:innen')}${n ? ` und ${plural(n, 'Eintrag', 'Einträgen')}` : ''} wird endgültig gelöscht.\nTipp: Mit dem Auge kannst du die Klasse stattdessen nur ausblenden.`, ok: 'Endgültig löschen', danger: true })) return;
    data.classes = data.classes.filter(x => x !== c);
    data.entries = data.entries.filter(e => e.c !== c.id);
    await save(); render(); toast('Klasse gelöscht');
  },
  async addClass() {
    if (data.classes.length) {
      const opts = [['imp', 'Schülerliste importieren (WebUntis, Excel, CSV)'], ...(data.classes.length > 1 ? [['mix', 'Gruppe aus mehreren Klassen']] : []), ['empty', 'Leere Klasse anlegen']];
      const k = await modal({ title: 'Neue Klasse', options: opts });
      if (!k) return;
      if (k === 'imp') return actions.importAny();
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
        ['cfg', 'Bewertung & Gewichtung'], ['stud', 'Schüler:innen hinzufügen'],
        ['ren', 'Umbenennen'], ['hide', c.hidden ? 'Wieder einblenden' : 'Ausblenden'], ['del', 'Klasse löschen', true]
      ], cancel: 'Schließen'
    });
    if (k === 'cfg') location.hash = '#/b/' + c.id;
    if (k === 'stud') {
      const o = await modal({ title: 'Schüler:innen hinzufügen', text: c.name, options: [['imp', 'Liste importieren (WebUntis, Excel, CSV)'], ['add', 'Namen eintippen'], ...(data.classes.length > 1 ? [['mix', 'Aus anderen Klassen übernehmen']] : [])] });
      if (o === 'imp') actions.importStudents();
      if (o === 'add') actions.addStudents();
      if (o === 'mix') location.hash = '#/neu/' + c.id;
    }
    if (k === 'hide') { c.hidden = !c.hidden; if (!c.hidden) delete c.hidden; await save(); if (c.hidden) { location.hash = '#/'; toast(`„${c.name}“ ausgeblendet`); } else { render(); toast(`„${c.name}“ wieder eingeblendet`); } }
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
    const type = curType(c);
    if (type !== 'an' && isAbsentOn(c, s.id, ui.date)) return;
    const undo = undoable();
    if (type === 'an' && d.v === 'A') {
      const other = data.entries.filter(e => e.c === c.id && e.s === s.id && e.d === ui.date && e.t !== 'an');
      if (other.length) {
        const list = other.map(e => `${(typeOf(c, e.t) || { label: e.t }).label}: ${entryValue(c, e)}`).join('\n');
        if (!await modal({ title: `${s.name} ist abwesend?`, text: `Für ${dayWord(ui.date) === 'Heute' ? 'heute' : fmtDay(ui.date)} gibt es schon Einträge, die dann entfernt werden:\n${list}`, ok: 'Abwesend setzen', danger: true })) return;
        data.entries = data.entries.filter(e => !other.includes(e));
      }
    }
    if (type === 'vh') {
      const n = await vermerkSheet(s.name, ui.date, typeOf(c, 'vh').label); if (!n) return;
      data.entries.push({ id: uid(), c: c.id, s: s.id, d: ui.date, t: type, v: 'x', n });
      toast(`Vermerk notiert: ${s.name.split(' ').slice(-1)[0]}`, undo);
    } else {
      const i = data.entries.findIndex(e => e.c === c.id && e.s === d.s && e.d === ui.date && e.t === type);
      if (i >= 0 && data.entries[i].v === d.v) return actions.entryNote({ v: data.entries[i].id }, true);
      let e;
      if (i >= 0) { e = data.entries[i]; e.v = d.v; }
      else { e = { id: uid(), c: c.id, s: d.s, d: ui.date, t: type, v: d.v }; data.entries.push(e); }
      const lbl = valInfo(c, type, d.v)[1];
      toast(`${s.name.split(' ').slice(-1)[0]}: ${lbl}`, [undo, { label: 'Anmerkung', fn: () => actions.entryNote({ v: e.id }) }]);
    }
    const row = document.querySelector(`[data-row="${d.s}"]`);
    if (row) row.outerHTML = rowHTML(c, s);
    haptic();
    await save();
  },
  async setVal(inp) {
    const c = currentClass(); if (!c) return;
    const type = curType(c), kind = kindOf(c, type), sid = inp.dataset.s;
    if (isAbsentOn(c, sid, ui.date)) return;
    let v = inp.value.trim();
    if (scaleOf(c, type) === 'pct' && v) {
      const n = parseFloat(v.replace(',', '.').replace(/[^\d.]/g, ''));
      if (isNaN(n) || n < 0 || n > 100) { toast('Bitte einen Wert von 0 bis 100 eingeben'); inp.value = ''; return; }
      inp.value = fmtVal(n); v = '%' + round3(n);
      const i0 = data.entries.findIndex(e => e.c === c.id && e.s === sid && e.d === ui.date && e.t === type);
      if (i0 >= 0) data.entries[i0].v = v; else data.entries.push({ id: uid(), c: c.id, s: sid, d: ui.date, t: type, v });
      inp.closest('.valbox').classList.add('filled');
      return save();
    }
    if (kind === 'num' && v) {
      const n = parseFloat(v.replace(',', '.').replace(/[^\d.\-]/g, ''));
      if (isNaN(n)) { toast('Bitte eine Zahl eingeben'); inp.value = ''; return; }
      v = String(n); inp.value = fmtVal(v);
    }
    const i = data.entries.findIndex(e => e.c === c.id && e.s === sid && e.d === ui.date && e.t === type);
    if (!v) { if (i >= 0) data.entries.splice(i, 1); }
    else if (i >= 0) data.entries[i].v = v;
    else data.entries.push({ id: uid(), c: c.id, s: sid, d: ui.date, t: type, v });
    inp.closest('.valbox').classList.toggle('filled', !!v);
    await save();
  },
  goCats() { const c = currentClass(); if (c) location.hash = '#/kat/' + c.id; },
  async catToggle(d) {
    const c = currentClass(); if (!c) return;
    const h = cfg(c).cats.hidden, i = h.indexOf(d.t);
    if (i >= 0) h.splice(i, 1); else h.push(d.t);
    await save(); render();
  },
  async entryNote(d, fromRow) {
    const e = data.entries.find(x => x.id === d.v); if (!e) return;
    const c = getClass(e.c), t = typeOf(c, e.t) || { label: e.t }, kind = kindOf(c, e.t);
    const s = c && c.students.find(x => x.id === e.s);
    const val = e.t === 'vh' ? 'Vermerk' : kind === 'num' ? withUnit(e.v, t.unit) : valInfo(c, e.t, e.v)[1];
    let remove = false;
    const r = await modal({
      title: 'Anmerkung', ok: 'Speichern',
      text: `${s ? s.name + ' · ' : ''}${t.label} ${val} · ${fmtDay(e.d)}`,
      body: `<textarea name="note" rows="4" placeholder="z. B. Thema, Beobachtung, Begründung der Note …">${esc(e.n || '')}</textarea>
        ${fromRow ? '<button type="button" class="link danger left" data-rm>Eintrag entfernen</button>' : ''}`,
      mount(dl) {
        const b = dl.querySelector('[data-rm]');
        if (b) b.addEventListener('click', () => { remove = true; dl.querySelector('[value=ok]').click(); });
        setTimeout(() => { const ta = dl.querySelector('[name=note]'); ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }, 80);
      },
      collect(dl) { return { n: dl.querySelector('[name=note]').value.trim() }; }
    });
    if (!r) return;
    if (remove) { data.entries = data.entries.filter(x => x !== e); toast('Eintrag entfernt'); }
    else { if (r.n) e.n = r.n; else delete e.n; toast(r.n ? 'Anmerkung gespeichert' : 'Anmerkung entfernt'); }
    await save();
    const row = c && document.querySelector(`[data-row="${e.s}"]`);
    if (row && s && location.hash.startsWith('#/k/')) row.outerHTML = rowHTML(c, s); else render();
  },
  async catEdit(d) {
    const c = currentClass(); if (!c) return;
    const k = d.t, t = typeOf(c, k); if (!t) return;
    const r = await catEditSheet(c, k); if (!r) return;
    const cf = cfg(c), x = customOf(c, k);
    if (x) {
      if (r.label) x.label = r.label;
      if (x.kind === 'num') { x.unit = r.unit || ''; x.high = r.high; }
    } else if (!r.label || r.label === TYPES[k].label) delete cf.cats.labels[k];
    else cf.cats.labels[k] = r.label;
    await save(); render(); toast('Gespeichert');
  },
  async catAdd() {
    const c = currentClass(); if (!c) return;
    const r = await catSheet(); if (!r) return;
    if (!r.label) return toast('Bitte einen Namen eingeben');
    const id = 'x' + uid();
    cfg(c).cats.custom.push({ id, label: r.label, kind: r.kind, ...(r.kind === 'num' ? { unit: r.unit, high: r.high } : {}) });
    if (r.kind === 'note') { applyScale(c, id, r.sc); cfg(c).weight[id] = 0; }
    ui.type = id; saveUi();
    await save(); render(); toast(`„${r.label}“ angelegt`);
  },
  async catDelete(d) {
    const c = currentClass(); if (!c) return;
    const x = customOf(c, d.t); if (!x) return;
    const n = data.entries.filter(e => e.c === c.id && e.t === x.id).length;
    if (!await modal({ title: 'Kategorie löschen?', text: `„${x.label}“${n ? ` und ${plural(n, 'Eintrag', 'Einträge')}` : ''} werden endgültig gelöscht.\nTipp: Mit dem Auge kannst du sie stattdessen nur ausblenden.`, ok: 'Löschen', danger: true })) return;
    const cf = cfg(c);
    cf.cats.custom = cf.cats.custom.filter(y => y !== x);
    cf.cats.hidden = cf.cats.hidden.filter(k => k !== x.id);
    delete cf.weight[x.id]; delete cf.scale[x.id];
    data.entries = data.entries.filter(e => !(e.c === c.id && e.t === x.id));
    await save(); render(); toast('Kategorie gelöscht');
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
  async scaleEdit(d) {
    const c = currentClass(); if (!c) return;
    const k = d.t, t = typeOf(c, k); if (!t) return;
    const st = scaleState(c, k);
    const r = await modal({ title: 'Notenskala', text: t.label, ok: 'Speichern', body: '<div class="scalebox"></div>',
      mount(dl) { bindScale(dl.querySelector('.scalebox'), st); }, collect: () => st });
    if (!r) return;
    applyScale(c, k, r); await save(); render(); toast(`${t.label}: ${SCALE_NAMES[r.scale]}`);
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
    const k = await modal({ title: 'Wie stark soll diese Note zählen?', text: `${(typeOf(getClass(e.c), e.t) || { long: e.t }).long} · ${fmtDayLong(e.d)} · ${valInfo(getClass(e.c), e.t, e.v)[1]}`, options: opts, cancel: 'Abbrechen' });
    if (!k) return;
    if (k === '1') delete e.w; else e.w = +k;
    await save(); render(); toast(k === '1' ? 'Zählt normal' : `Zählt jetzt ×${fmtW(+k)}`);
  },
  async vhStudent() {
    const c = currentClass(); const s = c && c.students.find(x => x.id === currentStudentId()); if (!s) return;
    if (isAbsentOn(c, s.id, today())) return toast(`${s.name} ist heute abwesend`);
    const n = await vermerkSheet(s.name, today(), typeOf(c, 'vh').label); if (!n) return;
    data.entries.push({ id: uid(), c: c.id, s: s.id, d: today(), t: 'vh', v: 'x', n });
    await save(); render(); toast('Vermerk notiert');
  },
  async bulkFill(d) {
    const c = currentClass(); if (!c) return;
    const type = curType(c), undo = undoable();
    let n = 0;
    for (const s of c.students) {
      if (!data.entries.some(e => e.c === c.id && e.s === s.id && e.d === ui.date && e.t === type) && (type === 'an' || !isAbsentOn(c, s.id, ui.date))) {
        data.entries.push({ id: uid(), c: c.id, s: s.id, d: ui.date, t: type, v: d.v }); n++;
      }
    }
    await save(); render(); toast(n ? `${n}× ${type === 'an' ? 'anwesend' : 'als gebracht'} eingetragen` : 'Alle sind schon eingetragen', n ? undo : null);
  },

  async studentMenu() {
    const c = currentClass(); const s = c && c.students.find(x => x.id === currentStudentId()); if (!s) return;
    const k = await modal({ title: s.name, options: [...(visKeys(c).includes('vh') ? [['vh', `${typeOf(c, 'vh').label}: Vermerk notieren`]] : []), ['ren', 'Umbenennen'], ['del', 'Aus der Klasse entfernen', true]], cancel: 'Schließen' });
    if (k === 'vh') return actions.vhStudent();
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
    const what = e.t === 'vh' ? typeOf(getClass(e.c), 'vh').label + ': ' + (e.n || 'Vermerk')
      : (() => { const c = getClass(e.c), t = typeOf(c, e.t) || { long: e.t }, kind = kindOf(c, e.t);
          return `${t.long}: ${kind === 'num' ? withUnit(e.v, t.unit) : kind === 'text' ? e.v : valInfo(c, e.t, e.v)[1]}`; })();
    if (!await modal({ title: 'Eintrag löschen?', text: `${fmtDayLong(e.d)}\n${what}`, ok: 'Löschen', danger: true })) return;
    const undo = undoable();
    data.entries = data.entries.filter(x => x !== e); await save(); render(); toast('Eintrag gelöscht', undo);
  },

  async exportMenu() {
    const c = currentClass(); if (!c) return;
    const what = await modal({ title: 'Exportieren', text: c.name, options: [['tr', 'Trends der Klasse'], ['cat', 'Kategorien'], ['csv', 'Rohdaten (CSV)']] });
    if (!what) return;
    if (what === 'csv') {
      const k = await modal({ title: 'Rohdaten (CSV)', text: c.name, options: [['ov', 'Übersicht – eine Zeile pro Kind'], ['all', 'Alle Einträge – eine Zeile pro Eintrag']] });
      if (k === 'ov') actions.exportOverview();
      if (k === 'all') actions.exportEntries();
      return;
    }
    let cat = null;
    if (what === 'cat') {
      cat = await pickCats(c);
      if (!cat || !cat.length) return;
    }
    const label = !cat ? 'Trends' : cat.length === 1 ? typeOf(c, cat[0]).label : 'Kategorien';
    const fmt = await modal({ title: cat && cat.length > 1 ? plural(cat.length, 'Kategorie', 'Kategorien') : label,
      text: cat && cat.length > 1 ? cat.map(k => typeOf(c, k).label).join(' · ') : c.name, options: [['pdf', 'Als PDF'], ['xlsx', 'Als Excel (.xlsx)']] });
    if (!fmt) return;
    const base = `${safeName(label)}_${safeName(c.name)}_${periodFile()}`;
    if (fmt === 'pdf') saveFile(base + '.pdf', 'application/pdf', cat ? catPDF(c, cat) : classTrendsPDF(c, trendRows(c)));
    else saveFile(base + '.xlsx', XLSX_MIME, cat ? catXLSX(c, cat) : classTrendsXLSX(c, trendRows(c)));
  },
  async studentExport() {
    const c = currentClass(); const s = c && c.students.find(x => x.id === currentStudentId()); if (!s) return;
    const k = await modal({ title: 'Trend exportieren', text: s.name, options: [['pdf', 'Als PDF'], ['xlsx', 'Als Excel (.xlsx)']] });
    if (!k) return;
    const base = `Trend_${safeName(s.name)}_${periodFile()}`;
    if (k === 'pdf') saveFile(base + '.pdf', 'application/pdf', studentTrendPDF(c, s));
    else saveFile(base + '.xlsx', XLSX_MIME, studentTrendXLSX(c, s));
  },
  async exportTrends() {
    const c = currentClass(); if (!c) return;
    const k = await modal({ title: 'Trends exportieren', text: c.name, options: [['pdf', 'Als PDF'], ['xlsx', 'Als Excel-Datei (.xlsx)']] });
    if (!k) return;
    const rows = trendRows(c);
    const base = `Trends_${safeName(c.name)}_${periodFile()}`;
    if (k === 'pdf') saveFile(base + '.pdf', 'application/pdf', classTrendsPDF(c, rows));
    else saveFile(base + '.xlsx', XLSX_MIME, classTrendsXLSX(c, rows));
  },
  exportOverview() {
    const c = currentClass(); if (!c) return;
    const keys = visKeys(c);
    const head = ['Name'];
    for (const k of keys) {
      const t = typeOf(c, k), kind = kindOf(c, k);
      if (k === 'an') head.push('anwesend', 'abwesend');
      else if (k === 'hu') head.push(`${t.label} gebracht`, `${t.label} nicht gebracht`);
      else if (k === 'vh') head.push(`${t.label} Vermerke`, `${t.label} zuletzt`);
      else if (kind === 'num') head.push(`${t.label} Bestwert${t.unit ? ' (' + t.unit + ')' : ''}`, `${t.label} zuletzt`, `${t.label} Messungen`);
      else if (kind === 'text') head.push(`${t.label} Anzahl`, `${t.label} zuletzt`);
      else head.push(`${t.label} Ø`, `${t.label} Einträge`);
    }
    head.push('Gesamtnote');
    const rows = [head];
    for (const s of [...c.students].sort(byName)) {
      const st = stats(c, s.id);
      const r = [s.name + (s.from ? ` (${s.from})` : '')];
      for (const k of keys) {
        const kind = kindOf(c, k);
        if (k === 'an') r.push(st.abs.AN, st.abs.A);
        else if (k === 'hu') r.push(st.hu.y, st.hu.n);
        else if (k === 'vh') r.push(st.vh.n, st.vh.last);
        else if (kind === 'num') { const x = st.nums[k]; r.push(x.best == null ? '' : fmtVal(x.best), x.last == null ? '' : fmtVal(x.last), x.n); }
        else if (kind === 'text') { const x = st.texts[k]; r.push(x.n, x.last); }
        else r.push(st.avg[k] == null ? '' : fmtNum(st.avg[k]), st.list[k].join(' ') + (st.pas[k] ? ` (${st.pas[k]}× passiv)` : ''));
      }
      r.push(st.total == null ? '' : fmtNum(st.total));
      rows.push(r);
    }
    rows.push([], [`Gewichtung: ${weightSummary(c)}`]);
    saveFile(`Übersicht_${safeName(c.name)}_${periodFile()}.csv`, 'text/csv', toCSV(rows));
  },
  exportEntries() {
    const c = currentClass(); if (!c) return;
    const names = Object.fromEntries(c.students.map(s => [s.id, s.name]));
    const rows = [['Datum', 'Name', 'Kategorie', 'Wert', 'Gewicht', 'Notiz']];
    entriesOf(c.id).filter(e => names[e.s]).sort((a, b) => a.d.localeCompare(b.d) || names[a.s].localeCompare(names[b.s], 'de'))
      .forEach(e => rows.push([e.d.split('-').reverse().join('.'), names[e.s], (typeOf(c, e.t) || { long: e.t }).long,
        e.t === 'hu' ? (e.v === 'y' ? 'gebracht' : 'nicht gebracht') : e.t === 'vh' ? 'Vermerk'
          : kindOf(c, e.t) === 'num' ? withUnit(e.v, typeOf(c, e.t).unit) : kindOf(c, e.t) === 'text' ? e.v : valInfo(c, e.t, e.v)[1],
        e.w ? fmtW(e.w) : '1', e.n || '']));
    saveFile(`Einträge_${safeName(c.name)}_${periodFile()}.csv`, 'text/csv', toCSV(rows));
  },
  async exportBackup() {
    let k = await loadBackupKey();
    if (!k) {
      const pw = await secretSheet({ title: 'Sicherungspasswort festlegen', text: 'Sicherungen werden verschlüsselt. Mit diesem Passwort öffnest du sie später wieder – z. B. auf einem neuen Handy. Bitte gut merken oder notieren.', twice: true, ok: 'Festlegen und sichern' });
      if (!pw) return;
      await setBackupPassword(pw); k = await loadBackupKey();
    }
    const key = await crypto.subtle.importKey('raw', k.raw, 'AES-GCM', false, ['encrypt']);
    const box = await Crypt.seal(key, TE.encode(JSON.stringify(data)));
    const out = { app: 'klassenbuch', format: 2, exportiert: new Date().toISOString(),
      enc: { alg: 'AES-256-GCM', kdf: 'PBKDF2-SHA-256', iter: k.iter, salt: toB64(k.salt), iv: toB64(box.iv), ct: toB64(box.ct) } };
    if (!await saveFile(`KeimBook-Sicherung_${today()}.json`, 'application/json', JSON.stringify(out))) return;
    backup.last = Date.now(); backup.snooze = 0;
    await DB.set('backup', backup).catch(() => { });
    if (location.hash.startsWith('#/einstellungen')) render();
  },
  async importBackup(arg) {
    const f = arg instanceof File ? arg : await pickFile(); if (!f) return;
    // Keine Sicherung, sondern z. B. eine Schülerliste? Dann als Liste importieren.
    const head = new Uint8Array(await f.slice(0, 4).arrayBuffer());
    if (head[0] !== 0x7B && !/\.json$/i.test(f.name)) return actions.importAny(f);
    let inc, j;
    try { j = JSON.parse(await readText(f)); if (!j || j.app !== 'klassenbuch') throw 0; } catch { return toast('Das ist keine gültige KeimBook-Sicherung'); }
    if (j.enc) {
      const pw = await secretSheet({ title: 'Sicherung öffnen', text: 'Diese Sicherung ist verschlüsselt. Gib das Sicherungspasswort ein.', ok: 'Öffnen' });
      if (!pw) return;
      try {
        const key = await crypto.subtle.importKey('raw', await Crypt.rawKey(pw, fromB64(j.enc.salt), j.enc.iter), 'AES-GCM', false, ['decrypt']);
        inc = JSON.parse(TD.decode(await Crypt.open(key, { iv: fromB64(j.enc.iv), ct: fromB64(j.enc.ct) })));
      } catch { return toast('Falsches Passwort'); }
    } else inc = j.data;
    if (!inc || !Array.isArray(inc.classes) || !Array.isArray(inc.entries)) return toast('Das ist keine gültige KeimBook-Sicherung');
    const k = await modal({
      title: 'Sicherung importieren', text: `${plural(inc.classes.length, 'Klasse', 'Klassen')}, ${plural(inc.entries.length, 'Eintrag', 'Einträge')}`,
      options: [['merge', 'Ergänzen (vorhandene Daten behalten)'], ['replace', 'Alles ersetzen', true]]
    });
    if (!k) return;
    if (k === 'replace') {
      if (data.classes.length && !await modal({ title: 'Alles ersetzen?', text: 'Alle aktuellen Daten auf diesem Gerät werden überschrieben.', ok: 'Ersetzen', danger: true })) return;
      data = { classes: inc.classes, entries: inc.entries };
      migrate(data);
    } else {
      const ids = new Set(data.entries.map(e => e.id));
      for (const c of inc.classes) {
        const ex = getClass(c.id);
        if (!ex) data.classes.push(c);
        else { const sids = new Set(ex.students.map(s => s.id)); c.students.forEach(s => { if (!sids.has(s.id)) ex.students.push(s); }); }
      }
      inc.entries.forEach(e => { if (!ids.has(e.id)) data.entries.push(e); });
      migrate(data);
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
document.addEventListener('change', e => { const a = e.target.dataset && e.target.dataset.ch; if (a && actions[a]) actions[a](e.target); });
document.addEventListener('change', e => { if (e.target.classList && e.target.classList.contains('valin')) actions.setVal(e.target); });
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' || !e.target.classList || !e.target.classList.contains('valin')) return;
  e.preventDefault();
  const all = [...document.querySelectorAll('.valin')], i = all.indexOf(e.target);
  if (all[i + 1]) all[i + 1].focus(); else e.target.blur();
});

/* ---------- Start ---------- */
async function loadData() {
  const d = await DB.get('data');
  if (d && Array.isArray(d.classes)) data = d;
  if (migrate(data)) await save();
}

async function start() {
  try { await DB.open(); } catch { $('#view').innerHTML = '<div class="nothing">Speicher nicht verfügbar. Bitte den privaten Modus deaktivieren.</div>'; return; }
  const code = (await DB.get('license').catch(() => null)) || lsGet('kb.license', null);
  if (code) {
    const res = await verifyLicense(code);
    if (!res.error) {
      license = res;
      lockCfg = await DB.get('lock').catch(() => null) || null;
      hasBkPw = !!(await DB.get('bkkey').catch(() => null));
      if (lockCfg) locked = true; else await loadData();
    }
    else lockMsg = res.error;
  }
  backup = Object.assign({ last: 0, snooze: 0 }, await DB.get('backup').catch(() => null));
  render();
  setTimeout(backupCheck, 1200);
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => { });
}

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => { });
}
start();
