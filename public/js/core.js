// core.js — shared by every screen: app state S, saved prefs (localStorage), the frame-rate picker,
// api() with timeout, toast, copy, theme, page shell, result cards with rolling numbers, APP_VERSION.
import { rateById } from './timecode.js';
import { I } from './icons.js';

const APP_VERSION = '1.4.0'; // bump with each release; shown at the bottom of Settings

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const app = $('#app');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function localGet(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } }
function localSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }

// ---------- state ----------
const DEFAULT_PREFS = { rate: '23.976', to: '29.97df', custom: 30, wrap24: true, history: true, theme: 'auto' };
const S = {
  nav: 0,
  lastTab: '#/', // where ‹ on Settings goes back to
  prefs: { ...DEFAULT_PREFS, ...localGet('tcalc.prefs', {}) },
  features: localGet('tcalc.features', { calc: true, offset: true, convert: true, clips: true, time: true, history: true }),
  dev: false,
  folds: {}, // which fold-away sections are open
  // each screen keeps what was typed so tabs don't lose work
  calc: { tape: [], entry: '', mode: 'tc', pending: null, finished: false },
  offset: { a: '', b: '', c: '' },
  convert: { tc: '', mode: 'tc', speed: 50, how: 'frames' },
  clips: { tool: 'fit', clip: '', total: '', list: '', inTc: '', outTc: '', handle: 12 },
  time: { tool: 'units', value: '', unit: 'h', a: '', b: '', since: '', base: '', plus: '', plusUnit: 'd', sign: '+', epoch: '' },
};
const savePrefs = () => localSet('tcalc.prefs', S.prefs);
const rate = () => rateById(S.prefs.rate, S.prefs.custom);
const toRate = () => rateById(S.prefs.to, S.prefs.custom); // Convert's To rate (the dial is From)
const fmtOpts = () => ({ wrap24: S.prefs.wrap24 });

// ---------- api (dev + config only; the maths never leaves the phone) ----------
async function api(path, { method = 'GET', body } = {}) {
  const opts = { method, headers: { 'x-tcalc': '1' }, credentials: 'same-origin' };
  if (body !== undefined) { opts.body = JSON.stringify(body); opts.headers['content-type'] = 'application/json'; }
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), method === 'GET' ? 20000 : 60000);
  let res;
  try { res = await fetch(path, { ...opts, signal: ctl.signal }); }
  catch { throw new Error('No connection'); }
  finally { clearTimeout(timer); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const err = new Error(data.error || `Request failed (${res.status})`); err.status = res.status; throw err; }
  return data;
}

// ---------- toast + copy ----------
let toastTimer = null;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
}
async function copyText(text, label = 'Copied') {
  try { await navigator.clipboard.writeText(text); toast(label); }
  catch { toast('Could not copy'); }
}

// ---------- theme ----------
function applyTheme() {
  const t = S.prefs.theme;
  if (t === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
}

// ---------- page shell ----------
// A tab (gear): small centred title + glass ⚙ to Settings, like the iPhone app. Settings pages: glass ‹ back + large title.
function page({ title, sub = '', body, back = null, gear = false, cls = '' }) {
  if (gear) {
    app.innerHTML = `<main class="tabpage ${cls}"><div class="topbar"><span></span><h1>${esc(title)}</h1>
      <a class="gbtn" href="#/settings" aria-label="Settings">${I.settings}</a></div>${body}</main>`;
    return app;
  }
  const bar = back ? `<a class="gbtn" href="${back}" aria-label="Back">${I.back}</a>` : '';
  app.innerHTML = `<main class="${cls}">
    <div class="pagetop">${bar ? `<div class="pt-bar">${bar}</div>` : ''}
      <h1 class="large-title">${esc(title)}</h1>${sub ? `<p class="sub">${esc(sub)}</p>` : ''}</div>
    ${body}</main>`;
  if (back) $('main').classList.add('slide-in');
  return app;
}

// Rolling numbers: screens redraw on every keystroke, so the last text per key is kept; digits that changed slide in.
const shown = new Map();
function rollHtml(key, text) {
  const old = shown.get(key) ?? '';
  shown.set(key, text);
  const chars = [...text], off = old.length - chars.length;
  return chars.map((ch, i) => (old && /\d/.test(ch) && old[i + off] !== ch ? `<span class="roll">${esc(ch)}</span>` : esc(ch))).join('');
}

// A result card: a big line and small lines under it; tapping copies the big line.
function resultCard(big, lines = [], { label = '', wide = false, key = '' } = {}) {
  return `<section class="result${wide ? ' wide' : ''}" data-copy="${esc(big)}" role="button" tabindex="0" aria-label="Copy ${esc(big)}">
    ${label ? `<div class="r-label">${esc(label)}</div>` : ''}<div class="r-big">${rollHtml(key || label || 'result', big)}</div>
    ${lines.length ? `<div class="r-lines">${lines.map((l) => `<span>${esc(l)}</span>`).join('')}</div>` : ''}</section>`;
}
function bindCopy(root) {
  $$('[data-copy]', root).forEach((el) => {
    const go = () => copyText(el.dataset.copy);
    el.addEventListener('click', go);
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
  });
}

export { APP_VERSION, $, $$, app, esc, localGet, localSet, S, savePrefs, rate, toRate, fmtOpts, api, toast, copyText, applyTheme, page, rollHtml, resultCard, bindCopy };
