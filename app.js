'use strict';
/* Klassenbuch – läuft komplett lokal. Keine Netzwerkanfragen, keine externen Dienste. */

// Öffentlicher Lizenzschlüssel. Lizenzen können nur mit dem passenden privaten Schlüssel
// (im Ordner "PRIVAT-nicht-hochladen") erzeugt werden.
const PUBLIC_KEY = {
  kty: 'EC', crv: 'P-256',
  x: 'kHkzCWyGjuxGxGf_3AMH2F_MKEWEjH1hfCnBf7K1Imo',
  y: 'Fv556fMFzralLJTUqYxNxI68b9Fd4ctkLzgn07BzKj0'
};
const APP_VERSION = '1.2';

const TYPES = {
  ma: { label: 'Mitarbeit', long: 'Mitarbeit', vals: [['+', '+', 'g'], ['~', '~', 'm'], ['-', '−', 'b']] },
  mu: { label: 'Mündlich', long: 'Mündliche Wiederholung', vals: grades() },
  sw: { label: 'Schriftlich', long: 'Schriftliche Wiederholung', vals: grades() },
  hu: { label: 'HÜ', long: 'Hausübung', vals: [['y', '✓', 'g'], ['n', '✗', 'b']] }
};
function grades() { return [['1', '1', 'g'], ['2', '2', 'g'], ['3', '3', 'm'], ['4', '4', 'm'], ['5', '5', 'b']]; }
const valInfo = (t, v) => TYPES[t].vals.find(x => x[0] === v) || [v, v, 'm'];

/* ---------- Hilfsfunktionen ---------- */
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const isoDate = d => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 10); };
const today = () => isoDate(new Date());
const fmtDay = iso => new Date(iso + 'T12:00').toLocaleDateString('de-AT', { weekday: 'short', day: 'numeric', month: 'numeric' });
const fmtDayLong = iso => new Date(iso + 'T12:00').toLocaleDateString('de-AT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const fmtNum = n => n.toFixed(1).replace('.', ',');
const byName = (a, b) => a.name.localeCompare(b.name, 'de', { sensitivity: 'base' });
const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } };
const b64uDec = s => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return Uint8Array.from(atob(s), c => c.charCodeAt(0)); };

const ICON = {
  gear: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
  more: '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><circle cx="5" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="19" cy="12" r="2" fill="currentColor"/></svg>',
  plus: '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  left: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  right: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  chev: '<svg class="chev" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
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
const ui = Object.assign({ tab: 'e', type: 'ma', date: today(), filter: 'all' }, lsGet('kb.ui', {}));
ui.date = today(); // beim Start immer heute

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

function viewLock(msg = '') {
  setHeader('Klassenbuch');
  $('#view').innerHTML = `
    <div class="lock">
      <img class="logo" src="icon-192.png" alt="">
      <h2>Freischalten</h2>
      <p>Diese App kann nur mit einer persönlichen Lizenz verwendet werden.</p>
      <textarea id="lic" placeholder="Lizenzcode hier einfügen" autocapitalize="off" autocomplete="off" spellcheck="false"></textarea>
      <p class="err">${esc(msg)}</p>
      <button class="btn primary block" data-a="activate">Freischalten</button>
      <p class="hint">Tipp: Wenn du die App auf dem Home-Bildschirm installiert hast, gib den Code direkt in der installierten App ein.</p>
    </div>`;
}

/* ---------- Kopfzeile ---------- */
function setHeader(title, back = null, act = null) {
  $('#title').textContent = title;
  const b = $('#back'), a = $('#act');
  b.hidden = !back; if (back) b.href = back;
  a.hidden = !act;
  if (act) { a.innerHTML = ICON[act.icon]; a.dataset.a = act.a; a.setAttribute('aria-label', act.label || ''); }
  document.title = title === 'Klassenbuch' ? title : title + ' – Klassenbuch';
}

/* ---------- Routing ---------- */
function render() {
  if (!license) return viewLock();
  const [view, a, b] = location.hash.replace(/^#\/?/, '').split('/');
  const v = $('#view');
  if (view === 'k' && getClass(a)) v.innerHTML = viewClass(getClass(a));
  else if (view === 's' && getClass(a) && getClass(a).students.find(s => s.id === b)) v.innerHTML = viewStudent(getClass(a), b);
  else if (view === 'einstellungen') v.innerHTML = viewSettings();
  else { if (location.hash && location.hash !== '#/') history.replaceState(null, '', '#/'); v.innerHTML = viewHome(); }
}
window.addEventListener('hashchange', () => { render(); $('main').scrollTop = 0; });
// Kein Zoomen per Zwei-Finger-Geste (iOS ignoriert user-scalable=no)
['gesturestart', 'gesturechange', 'gestureend'].forEach(t => document.addEventListener(t, e => e.preventDefault(), { passive: false }));
/* ---------- Startseite ---------- */
function viewHome() {
  setHeader('Klassenbuch', null, { icon: 'gear', a: 'goSettings', label: 'Einstellungen' });
  if (!data.classes.length) {
    return `<div class="empty"><p>Noch keine Klasse angelegt.</p>
      <div class="stack"><button class="btn primary" data-a="importAny">Schülerliste importieren</button>
      <button class="btn" data-a="addClass">Klasse selbst anlegen</button></div>
      <p class="hint">WebUntis-Export (Excel oder CSV) – Klassen werden automatisch angelegt. Auch Datensicherungen lassen sich hier einlesen.</p></div>`;
  }
  const items = [...data.classes].sort(byName).map(c => `
    <li><a class="item" href="#/k/${c.id}"><span class="grow">${esc(c.name)}</span>
    <span class="muted">${c.students.length} ${c.students.length === 1 ? 'Schüler:in' : 'Schüler:innen'}</span>${ICON.chev}</a></li>`).join('');
  return `<ul class="list">${items}</ul>
    <div class="actions-row"><button class="btn ghost" data-a="addClass">${ICON.plus} Neue Klasse</button>
    <button class="btn ghost" data-a="importAny">Importieren</button></div>`;
}

/* ---------- Klasse ---------- */
function viewClass(c) {
  setHeader(c.name, '#/', { icon: 'more', a: 'classMenu', label: 'Klassenmenü' });
  if (!c.students.length) {
    return `<div class="empty"><p>Diese Klasse hat noch keine Schüler:innen.</p>
      <div class="stack"><button class="btn primary" data-a="addStudents">Namen eingeben</button>
      <button class="btn" data-a="importStudents">Liste importieren</button></div>
      <p class="hint">WebUntis-Export, Excel (.xlsx) oder CSV.</p></div>`;
  }
  const seg = `<div class="seg">
    <button class="${ui.tab === 'e' ? 'on' : ''}" data-a="tab" data-v="e">Eintragen</button>
    <button class="${ui.tab === 'u' ? 'on' : ''}" data-a="tab" data-v="u">Übersicht</button></div>`;
  return seg + (ui.tab === 'u' ? viewOverview(c) : viewEntry(c));
}

function viewEntry(c) {
  const chips = Object.entries(TYPES).map(([k, t]) =>
    `<button class="chip ${ui.type === k ? 'on' : ''}" data-a="type" data-v="${k}">${t.label}</button>`).join('');
  const rows = [...c.students].sort(byName).map(s => rowHTML(c, s)).join('');
  const bulk = ui.type === 'hu' ? `<div class="bulk"><button class="btn ghost" data-a="bulkHu">Alle übrigen ✓</button></div>` : '';
  return `
    <div class="datebar">
      <button class="icon-btn" data-a="day" data-v="-1" aria-label="Vorheriger Tag">${ICON.left}</button>
      <input type="date" id="date" value="${ui.date}" aria-label="Datum">
      <button class="icon-btn" data-a="day" data-v="1" aria-label="Nächster Tag">${ICON.right}</button>
    </div>
    <div class="daylabel">${ui.date === today() ? 'Heute, ' : ''}${esc(fmtDayLong(ui.date))}</div>
    <div class="chips">${chips}</div>${bulk}
    <ul class="list">${rows}</ul>`;
}

function rowHTML(c, s) {
  const cur = data.entries.find(e => e.c === c.id && e.s === s.id && e.d === ui.date && e.t === ui.type);
  const btns = TYPES[ui.type].vals.map(([v, label, cls]) =>
    `<button class="v ${cls} ${cur && cur.v === v ? 'on' : ''}" data-a="mark" data-s="${s.id}" data-v="${v}" aria-label="${esc(TYPES[ui.type].label + ' ' + label)}">${label}</button>`).join('');
  return `<li class="row" data-row="${s.id}"><a class="name" href="#/s/${c.id}/${s.id}">${esc(s.name)}</a><div class="vals">${btns}</div></li>`;
}

function stats(cid, sid) {
  const es = entriesOf(cid, sid);
  const st = { ma: { '+': 0, '~': 0, '-': 0 }, mu: [], sw: [], hu: { y: 0, n: 0 } };
  for (const e of es) {
    if (e.t === 'ma') st.ma[e.v] = (st.ma[e.v] || 0) + 1;
    else if (e.t === 'hu') st.hu[e.v] = (st.hu[e.v] || 0) + 1;
    else if (st[e.t]) st[e.t].push(+e.v);
  }
  const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
  st.muAvg = avg(st.mu); st.swAvg = avg(st.sw);
  return st;
}
const gradeCls = g => g == null ? '' : g < 2.5 ? 'g-t' : g < 4.5 ? 'm-t' : 'b-t';

function viewOverview(c) {
  const rows = [...c.students].sort(byName).map(s => {
    const st = stats(c.id, s.id);
    const huT = st.hu.y + st.hu.n;
    return `<tr data-a="go" data-v="#/s/${c.id}/${s.id}">
      <td>${esc(s.name)}</td>
      <td><span class="ma"><span class="g-t">${st.ma['+']}</span><span class="m-t">${st.ma['~']}</span><span class="b-t">${st.ma['-']}</span></span></td>
      <td class="${gradeCls(st.muAvg)}">${st.muAvg == null ? '–' : fmtNum(st.muAvg)}</td>
      <td class="${gradeCls(st.swAvg)}">${st.swAvg == null ? '–' : fmtNum(st.swAvg)}</td>
      <td>${huT ? `${st.hu.y}/${huT}` : '–'}</td></tr>`;
  }).join('');
  return `<div class="tbl-wrap"><table class="tbl">
    <thead><tr><th>Name</th><th>+ ~ −</th><th>Mü</th><th>Schr</th><th>HÜ</th></tr></thead>
    <tbody>${rows}</tbody></table></div>
    <p class="legend">+ ~ − = Mitarbeit · Mü/Schr = Notenschnitt der Wiederholungen · HÜ = gebracht/gesamt</p>
    <div class="stack filter"><button class="btn" data-a="exportOverview">Übersicht exportieren (CSV)</button></div>`;
}

/* ---------- Schüler:in ---------- */
function viewStudent(c, sid) {
  const s = c.students.find(x => x.id === sid);
  setHeader(s.name, '#/k/' + c.id, { icon: 'more', a: 'studentMenu', label: 'Menü' });
  const st = stats(c.id, sid);
  const huT = st.hu.y + st.hu.n;
  const tiles = `<div class="tiles">
    <div class="tile"><div class="k">Mitarbeit</div><div class="val"><span class="ma"><span class="g-t">+${st.ma['+']}</span><span class="m-t">~${st.ma['~']}</span><span class="b-t">−${st.ma['-']}</span></span></div></div>
    <div class="tile"><div class="k">Hausübungen</div><div class="val">${huT ? `${st.hu.y}/${huT}` : '–'}</div><div class="sub">${st.hu.n ? `${st.hu.n}× nicht gebracht` : huT ? 'immer gebracht' : 'noch keine'}</div></div>
    <div class="tile"><div class="k">Mündlich Ø</div><div class="val ${gradeCls(st.muAvg)}">${st.muAvg == null ? '–' : fmtNum(st.muAvg)}</div><div class="sub">${st.mu.length ? st.mu.join(', ') : 'noch keine'}</div></div>
    <div class="tile"><div class="k">Schriftlich Ø</div><div class="val ${gradeCls(st.swAvg)}">${st.swAvg == null ? '–' : fmtNum(st.swAvg)}</div><div class="sub">${st.sw.length ? st.sw.join(', ') : 'noch keine'}</div></div>
  </div>`;
  const chips = [['all', 'Alle'], ...Object.entries(TYPES).map(([k, t]) => [k, t.label])].map(([k, l]) =>
    `<button class="chip ${ui.filter === k ? 'on' : ''}" data-a="filter" data-v="${k}">${l}</button>`).join('');
  const es = entriesOf(c.id, sid).filter(e => ui.filter === 'all' || e.t === ui.filter)
    .sort((a, b) => b.d.localeCompare(a.d) || a.t.localeCompare(b.t));
  const list = es.length ? `<ul class="list">${es.map(e => {
    const [, label, cls] = valInfo(e.t, e.v);
    return `<li class="entry"><span class="date">${esc(fmtDay(e.d))}</span><span class="type">${TYPES[e.t].long}</span>
      <span class="badge ${cls}">${label}</span><button class="del" data-a="delEntry" data-v="${e.id}" aria-label="Eintrag löschen">×</button></li>`;
  }).join('')}</ul>` : `<p class="hint">Keine Einträge.</p>`;
  return `${tiles}<div class="chips filter">${chips}</div>${list}`;
}

/* ---------- Einstellungen ---------- */
function viewSettings() {
  setHeader('Einstellungen', '#/');
  const exp = license.info.x ? 'gültig bis ' + fmtDayLong(license.info.x) : 'unbefristet';
  return `
    <div class="section-title">Datensicherung</div>
    <ul class="list">
      <li><button class="item link-btn" data-a="exportBackup"><span class="grow">Sicherung exportieren</span>${ICON.chev}</button></li>
      <li><button class="item link-btn" data-a="importBackup"><span class="grow">Sicherung importieren</span>${ICON.chev}</button></li>
    </ul>
    <p class="hint">Alle Daten liegen nur auf diesem Gerät. Exportiere regelmäßig eine Sicherung – z. B. in die Dateien-App oder auf einen USB-Stick.</p>

    <div class="section-title">Lizenz</div>
    <ul class="list"><li class="item"><span class="grow">${esc(license.info.n)}</span><span class="muted">${esc(exp)}</span></li></ul>

    <div class="section-title">Datenschutz</div>
    <ul class="list"><li class="item"><span class="grow">Die App sendet keine Daten ins Internet. Es gibt kein Konto, keine Cloud und keine Analyse.</span></li></ul>

    <div class="section-title">Gefahrenbereich</div>
    <ul class="list"><li><button class="item link-btn danger" data-a="wipe"><span class="grow">Alle Daten löschen</span></button></li></ul>
    <p class="hint">Version ${APP_VERSION}</p>`;
}

/* ---------- Dialoge ---------- */
function modal(o) {
  return new Promise(res => {
    const d = $('#dlg');
    const field = o.input ? `<input name="v" value="${esc(o.value || '')}" placeholder="${esc(o.placeholder || '')}" autocomplete="off">`
      : o.textarea ? `<textarea name="v" rows="8" placeholder="${esc(o.placeholder || '')}">${esc(o.value || '')}</textarea>` : '';
    const opts = o.options ? o.options.map(([k, l, dan]) => `<button value="${k}" class="opt${dan ? ' danger' : ''}">${esc(l)}</button>`).join('') : '';
    d.innerHTML = `<form method="dialog" class="sheet">
      ${o.title ? `<h3>${esc(o.title)}</h3>` : ''}${o.text ? `<p>${esc(o.text)}</p>` : ''}${field}<div>${opts}</div>
      <div class="row-btns">${o.options ? '' : `<button value="ok" class="btn ${o.danger ? 'danger fill' : 'primary'}">${esc(o.ok || 'OK')}</button>`}
      <button value="" class="btn ghost" formnovalidate>${esc(o.cancel || 'Abbrechen')}</button></div></form>`;
    let done = false;
    const finish = r => {
      if (done) return; done = true;
      const f = d.querySelector('[name=v]');
      res(o.options ? (r || null) : r === 'ok' ? (f ? f.value : true) : null);
      if (d.open) d.close();
    };
    d.querySelector('form').addEventListener('submit', e => { e.preventDefault(); finish(e.submitter ? e.submitter.value : 'ok'); });
    d.onclose = () => finish('');
    d.showModal();
    const f = d.querySelector('[name=v]');
    if (f) setTimeout(() => f.focus(), 60);
  });
}
$('#dlg').addEventListener('click', e => { if (e.target === e.currentTarget) e.currentTarget.close(); });

let toastTimer;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

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
  toast('Datei gespeichert: ' + name);
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
const namesFromRows = rows => [...parseStudents(rows).groups.values()].flat();

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
const currentClass = () => { const [v, a] = location.hash.replace(/^#\/?/, '').split('/'); return (v === 'k' || v === 's') ? getClass(a) : null; };
const currentStudentId = () => location.hash.replace(/^#\/?/, '').split('/')[2];

const actions = {
  async activate() {
    const res = await verifyLicense($('#lic').value);
    if (res.error) return viewLock(res.error);
    license = res; lsSet('kb.license', res.code); await DB.set('license', res.code);
    await loadData(); render(); toast('Freigeschaltet für ' + res.info.n);
  },
  goSettings() { location.hash = '#/einstellungen'; },
  go(d) { location.hash = d.v; },

  async addClass() {
    const name = (await modal({ title: 'Neue Klasse', input: true, placeholder: 'z. B. 3B Mathematik', ok: 'Anlegen' }) || '').trim();
    if (!name) return;
    const c = { id: uid(), name, students: [] };
    data.classes.push(c); await save(); location.hash = '#/k/' + c.id;
  },
  async classMenu() {
    const c = currentClass(); if (!c) return;
    const k = await modal({
      title: c.name, options: [
        ['add', 'Schüler:innen hinzufügen'], ['imp', 'Liste importieren (WebUntis, Excel, CSV)'],
        ['ov', 'Übersicht exportieren (CSV)'], ['all', 'Alle Einträge exportieren (CSV)'],
        ['ren', 'Klasse umbenennen'], ['del', 'Klasse löschen', true]
      ], cancel: 'Schließen'
    });
    if (k === 'add') actions.addStudents();
    if (k === 'imp') actions.importStudents();
    if (k === 'ov') actions.exportOverview();
    if (k === 'all') actions.exportEntries();
    if (k === 'ren') {
      const n = (await modal({ title: 'Klasse umbenennen', input: true, value: c.name, ok: 'Speichern' }) || '').trim();
      if (n) { c.name = n; await save(); render(); }
    }
    if (k === 'del') {
      if (!await modal({ title: 'Klasse löschen?', text: `„${c.name}“ und alle Einträge werden gelöscht. Das kann nicht rückgängig gemacht werden.`, ok: 'Löschen', danger: true })) return;
      data.classes = data.classes.filter(x => x !== c);
      data.entries = data.entries.filter(e => e.c !== c.id);
      await save(); location.hash = '#/'; toast('Klasse gelöscht');
    }
  },
  async addStudents() {
    const c = currentClass(); if (!c) return;
    const txt = await modal({ title: 'Schüler:innen hinzufügen', text: 'Ein Name pro Zeile.', textarea: true, placeholder: 'Muster Anna\nBeispiel Ben', ok: 'Hinzufügen' });
    if (!txt) return;
    const n = addNames(c, txt.split(/\r?\n/).map(x => x.replace(/[;,\t]+/g, ' ').replace(/\s+/g, ' ').trim()).filter(Boolean));
    await save(); render(); toast(n + ' hinzugefügt');
  },
  async importStudents() {
    const c = currentClass(); if (!c) return;
    const f = await pickFile(); if (!f) return;
    try {
      const p = parseStudents(await readTable(f));
      // Enthält die Datei mehrere Klassen, nur die passende übernehmen
      let names = [...p.groups.values()].flat();
      if (p.hasClass && p.groups.size > 1) {
        const match = [...p.groups.keys()].find(k => k.toLowerCase() === c.name.toLowerCase() || c.name.toLowerCase().startsWith(k.toLowerCase() + ' '));
        if (match) names = p.groups.get(match);
      }
      if (!names.length) return toast('Keine Namen in der Datei gefunden');
      const n = addNames(c, names); await save(); render();
      toast(`${n} importiert${names.length - n ? `, ${names.length - n} schon vorhanden` : ''}`);
    } catch (e) { toast(e && e.message ? e.message : 'Datei konnte nicht gelesen werden'); }
  },

  // Startseite: eine Datei für alles – WebUntis/Excel/CSV-Listen oder Datensicherung
  async importAny(arg) {
    const f = arg instanceof File ? arg : await pickFile(); if (!f) return;
    let rows;
    try {
      const head = new Uint8Array(await f.slice(0, 4).arrayBuffer());
      if (head[0] === 0x7B || /\.json$/i.test(f.name)) return actions.importBackup(f);
      rows = await readTable(f);
    } catch (e) { return toast(e && e.message ? e.message : 'Datei konnte nicht gelesen werden'); }
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
    const summary = groups.map(([k, n]) => `${k}: ${n.length} ${findClass(k) ? '(wird ergänzt)' : '(neu)'}`).join('\n');
    if (!await modal({ title: groups.length === 1 ? 'Klasse importieren' : `${groups.length} Klassen importieren`, text: summary, ok: 'Importieren' })) return;

    let added = 0, created = 0, last = null;
    for (const [k, names] of groups) {
      let c = findClass(k);
      if (!c) { c = { id: uid(), name: k, students: [] }; data.classes.push(c); created++; }
      added += addNames(c, names); last = c;
    }
    await save();
    toast(`${created ? created + (created === 1 ? ' Klasse' : ' Klassen') + ' angelegt, ' : ''}${added} Schüler:innen importiert`);
    if (groups.length === 1) location.hash = '#/k/' + last.id; else { location.hash = '#/'; render(); }
  },

  tab(d) { ui.tab = d.v; saveUi(); render(); },
  type(d) { ui.type = d.v; saveUi(); render(); },
  filter(d) { ui.filter = d.v; saveUi(); render(); },
  day(d) { const x = new Date(ui.date + 'T12:00'); x.setDate(x.getDate() + +d.v); ui.date = isoDate(x); render(); },

  async mark(d) {
    const c = currentClass(); if (!c) return;
    const i = data.entries.findIndex(e => e.c === c.id && e.s === d.s && e.d === ui.date && e.t === ui.type);
    if (i >= 0 && data.entries[i].v === d.v) data.entries.splice(i, 1);
    else if (i >= 0) data.entries[i].v = d.v;
    else data.entries.push({ id: uid(), c: c.id, s: d.s, d: ui.date, t: ui.type, v: d.v });
    const s = c.students.find(x => x.id === d.s);
    const li = document.querySelector(`[data-row="${d.s}"]`);
    if (li && s) li.outerHTML = rowHTML(c, s);
    if (navigator.vibrate) navigator.vibrate(8);
    await save();
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
    const c = currentClass(); const sid = currentStudentId(); const s = c && c.students.find(x => x.id === sid); if (!s) return;
    const k = await modal({ title: s.name, options: [['ren', 'Umbenennen'], ['del', 'Aus Klasse entfernen', true]], cancel: 'Schließen' });
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
    if (!await modal({ title: 'Eintrag löschen?', text: `${TYPES[e.t].long} vom ${fmtDay(e.d)}: ${valInfo(e.t, e.v)[1]}`, ok: 'Löschen', danger: true })) return;
    data.entries = data.entries.filter(x => x !== e); await save(); render();
  },

  exportOverview() {
    const c = currentClass(); if (!c) return;
    const rows = [['Name', 'Mitarbeit +', 'Mitarbeit ~', 'Mitarbeit −', 'Ø Mündlich', 'Noten Mündlich', 'Ø Schriftlich', 'Noten Schriftlich', 'HÜ gebracht', 'HÜ nicht gebracht']];
    for (const s of [...c.students].sort(byName)) {
      const st = stats(c.id, s.id);
      rows.push([s.name, st.ma['+'], st.ma['~'], st.ma['-'],
        st.muAvg == null ? '' : fmtNum(st.muAvg), st.mu.join(' '),
        st.swAvg == null ? '' : fmtNum(st.swAvg), st.sw.join(' '), st.hu.y, st.hu.n]);
    }
    saveFile(`Übersicht_${safeName(c.name)}_${today()}.csv`, 'text/csv', toCSV(rows));
  },
  exportEntries() {
    const c = currentClass(); if (!c) return;
    const names = Object.fromEntries(c.students.map(s => [s.id, s.name]));
    const rows = [['Datum', 'Name', 'Kategorie', 'Wert']];
    entriesOf(c.id).filter(e => names[e.s]).sort((a, b) => a.d.localeCompare(b.d) || names[a.s].localeCompare(names[b.s], 'de'))
      .forEach(e => rows.push([e.d.split('-').reverse().join('.'), names[e.s], TYPES[e.t].long,
        e.t === 'hu' ? (e.v === 'y' ? 'gebracht' : 'nicht gebracht') : valInfo(e.t, e.v)[1]]));
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
      title: 'Sicherung importieren', text: `${inc.classes.length} Klasse(n), ${inc.entries.length} Einträge.`,
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
  const el = e.target.closest('[data-a]');
  if (!el || !actions[el.dataset.a]) return;
  e.preventDefault();
  actions[el.dataset.a](el.dataset, el);
});
document.addEventListener('change', e => {
  if (e.target.id === 'date' && e.target.value) { ui.date = e.target.value; render(); }
});

/* ---------- Start ---------- */
async function loadData() {
  const d = await DB.get('data');
  if (d && Array.isArray(d.classes)) data = d;
}

async function start() {
  try { await DB.open(); } catch { $('#view').innerHTML = '<div class="empty"><p>Speicher nicht verfügbar. Bitte privaten Modus deaktivieren.</p></div>'; return; }
  const code = (await DB.get('license').catch(() => null)) || lsGet('kb.license', null);
  if (code) {
    const res = await verifyLicense(code);
    if (!res.error) { license = res; await loadData(); }
    else { render(); return viewLock(res.error); }
  }
  render();
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => { });
}

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => { });
}
start();
