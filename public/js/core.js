// core.js — shared by every screen: app state S, saved prefs (localStorage), the frame-rate picker,
// api() with timeout, toast, copy, theme, page shell helpers, APP_VERSION.
import { RATES, rateById } from './timecode.js';
import { I } from './icons.js';

const APP_VERSION = '1.2.1'; // bump with each release; shown at the bottom of Settings

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const app = $('#app');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function localGet(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } }
function localSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }

// ---------- state ----------
const DEFAULT_PREFS = { rate: '23.976', custom: 30, wrap24: true, history: true, theme: 'auto' };
const S = {
  nav: 0,
  lastTab: '#/', // where ‹ on Settings goes back to
  prefs: { ...DEFAULT_PREFS, ...localGet('tcalc.prefs', {}) },
  features: localGet('tcalc.features', { calc: true, offset: true, convert: true, clips: true, time: true, history: true }),
  dev: false,
  // each screen keeps what was typed so tabs don't lose work
  calc: { tape: [], entry: '', mode: 'tc' },
  offset: { a: '', b: '', c: '' },
  convert: { tc: '', mode: 'frames', speed: 50 },
  clips: { clip: '', total: '', list: '', inTc: '', outTc: '', handle: 12 },
  time: { value: '', unit: 'h', a: '', b: '', since: '', base: '', plus: '', plusUnit: 'd', sign: '+', epoch: '' },
};
const savePrefs = () => localSet('tcalc.prefs', S.prefs);
const rate = () => rateById(S.prefs.rate, S.prefs.custom);
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

// ---------- frame-rate picker (every calculating screen) ----------
function rateBar() {
  const cur = S.prefs.rate;
  return `<div class="rates" role="group" aria-label="Frame rate">${RATES.map((r) =>
    `<button type="button" class="chip" data-rate="${r.id}" aria-pressed="${cur === r.id}">${r.label}</button>`).join('')}
    <button type="button" class="chip" data-rate="custom" aria-pressed="${cur === 'custom'}">${cur === 'custom' ? esc(S.prefs.custom) : 'Custom'}</button></div>`;
}
// Tapping a chip saves the rate and redraws the screen (every result follows the rate).
function bindRateBar(root, redraw) {
  $$('.rates .chip', root).forEach((b) => b.addEventListener('click', async () => {
    const id = b.dataset.rate;
    if (id === 'custom') {
      const v = prompt('Custom frame rate (fps)', S.prefs.custom);
      if (v === null) return;
      const n = Number(v);
      if (!(n > 0 && n <= 1000)) return toast('Enter a number between 1 and 1000');
      S.prefs.custom = n;
    }
    S.prefs.rate = id; savePrefs(); redraw();
  }));
  // the chosen chip scrolls into view
  $('.rates .chip[aria-pressed="true"]', root)?.scrollIntoView({ block: 'nearest', inline: 'center' });
}

// ---------- page shell ----------
// A tab: large title, optional subtitle, body, a glass ⚙ to Settings (gear). Settings pages add a glass ‹ back button.
function page({ title, sub = '', body, back = null, gear = false, cls = '' }) {
  const bar = back ? `<a class="gbtn" href="${back}" aria-label="Back">${I.back}</a>` : gear ? `<span></span><a class="gbtn" href="#/settings" aria-label="Settings">${I.settings}</a>` : '';
  app.innerHTML = `<main class="${cls}">
    <div class="pagetop">${bar ? `<div class="pt-bar">${bar}</div>` : ''}
      <h1 class="large-title">${esc(title)}</h1>${sub ? `<p class="sub">${esc(sub)}</p>` : ''}</div>
    ${body}</main>`;
  if (back) $('main').classList.add('slide-in');
  return app;
}

// A result card: a big line and small lines under it; tapping copies the big line.
function resultCard(big, lines = [], { label = '', wide = false } = {}) {
  return `<section class="result${wide ? ' wide' : ''}" data-copy="${esc(big)}" role="button" tabindex="0" aria-label="Copy result">
    ${label ? `<div class="r-label">${esc(label)}</div>` : ''}<div class="r-big">${esc(big)}</div>
    ${lines.length ? `<div class="r-lines">${lines.map((l) => `<span>${esc(l)}</span>`).join('')}</div>` : ''}</section>`;
}
function bindCopy(root) {
  $$('[data-copy]', root).forEach((el) => {
    const go = () => copyText(el.dataset.copy);
    el.addEventListener('click', go);
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
  });
}

export { APP_VERSION, $, $$, app, esc, localGet, localSet, S, savePrefs, rate, fmtOpts, api, toast, copyText, applyTheme, rateBar, bindRateBar, page, resultCard, bindCopy };
