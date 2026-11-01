// settings.js — Settings tab in the house style: short groups of rows (coloured icon · name · value · ›), each
// opening its own page that slides in. Pages: Frame Rate, Appearance, History (history.js), About. Version at the bottom.
import { APP_VERSION, S, $, $$, esc, savePrefs, applyTheme, page, toast } from './core.js';
import { RATES, rateById } from './timecode.js';
import { I } from './icons.js';
import { historyOn } from './history.js';

const row = (href, color, icon, name, value = '') =>
  `<a class="row" href="${href}"><span class="ric ${color}">${icon}</span><span class="rname">${esc(name)}</span><span class="rval">${esc(value)}</span><span class="rchev">${I.chev}</span></a>`;
const switchRow = (id, color, icon, name, on) =>
  `<label class="row"><span class="ric ${color}">${icon}</span><span class="rname">${esc(name)}</span><span class="switch"><input type="checkbox" id="${id}"${on ? ' checked' : ''}><span></span></span></label>`;
const THEMES = { auto: 'Automatic', light: 'Light', dark: 'Dark' };

function renderSettings() {
  const r = rateById(S.prefs.rate, S.prefs.custom);
  const body = `
    <div class="group">
      ${row('#/settings/rate', 'indigo', I.film, 'Frame Rate', r.label)}
      ${switchRow('wrap', 'orange', I.clock, '24-Hour Wrap', S.prefs.wrap24)}
    </div>
    <p class="footnote">Wrap keeps hours inside a day, the way a deck counts. Off, totals can run past 24 hours.</p>
    <div class="group">
      ${row('#/settings/appearance', 'gray', I.moon, 'Appearance', THEMES[S.prefs.theme])}
      ${S.features.history !== false ? switchRow('hist', 'green', I.history, 'Keep History', S.prefs.history) : ''}
      ${historyOn() ? row('#/settings/history', 'green', I.history, 'History') : ''}
    </div>
    <div class="group">${row('#/settings/about', 'blue', I.info, 'About TCalc')}${row('#/settings/privacy', 'gray', I.shield, 'Privacy')}${S.dev ? row('#/dev', 'red', I.wrench, 'Developer') : ''}</div>
    <p class="version">TCalc ${esc(APP_VERSION)} · made by meanbrian</p>`;
  const root = page({ title: 'Settings', body, back: S.lastTab || '#/' });
  $('#wrap', root).addEventListener('change', (e) => { S.prefs.wrap24 = e.target.checked; savePrefs(); });
  $('#hist', root)?.addEventListener('change', (e) => { S.prefs.history = e.target.checked; savePrefs(); renderSettings(); });
}

// ---------- pages ----------
function renderRatePage() {
  const body = `<div class="group">${RATES.map((r) => `<button type="button" class="row pick" data-rate="${r.id}" aria-pressed="${S.prefs.rate === r.id}">
      <span class="rname">${r.label}</span><span class="rval">${r.df ? 'drop frame' : r.den === 1001 ? 'non-drop' : ''}</span><span class="rcheck">✓</span></button>`).join('')}
    <button type="button" class="row pick" data-rate="custom" aria-pressed="${S.prefs.rate === 'custom'}"><span class="rname">Custom</span><span class="rval">${S.prefs.rate === 'custom' ? esc(S.prefs.custom) + ' fps' : ''}</span><span class="rcheck">✓</span></button></div>
    <p class="footnote">The default rate for every tab. You can still change it on each screen; the last choice sticks.</p>`;
  const root = page({ title: 'Frame Rate', body, back: '#/settings' });
  $$('.pick', root).forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.rate === 'custom') {
      const v = prompt('Custom frame rate (fps)', S.prefs.custom);
      if (v === null) return;
      const n = Number(v);
      if (!(n > 0 && n <= 1000)) return toast('Enter a number between 1 and 1000');
      S.prefs.custom = n;
    }
    S.prefs.rate = b.dataset.rate; savePrefs(); renderRatePage(); toast('✓ Saved');
  }));
}

function renderAppearancePage() {
  const body = `<div class="group">${Object.entries(THEMES).map(([k, v]) => `<button type="button" class="row pick" data-theme="${k}" aria-pressed="${S.prefs.theme === k}">
      <span class="rname">${v}</span><span class="rcheck">✓</span></button>`).join('')}</div>
    <p class="footnote">Automatic follows the phone's light or dark setting.</p>`;
  const root = page({ title: 'Appearance', body, back: '#/settings' });
  $$('.pick', root).forEach((b) => b.addEventListener('click', () => { S.prefs.theme = b.dataset.theme; savePrefs(); applyTheme(); renderAppearancePage(); }));
}

function renderAboutPage() {
  const body = `<div class="group text">
      <p>TCalc is a timecode and clip-time calculator for editors: add and subtract timecodes, find sync offsets and durations, convert between frame rates and speeds, and total up clip lists. Drop-frame (29.97 / 59.94 DF) follows the SMPTE rule.</p>
      <p>Everything is worked out on your device. Nothing you type is sent anywhere; history and settings stay in this browser.</p>
      <p>Add it to your home screen and it works offline.</p>
      <p><a href="#/settings/privacy">Privacy</a> — what is and isn't kept.</p>
    </div>
    <p class="version">Version ${esc(APP_VERSION)} · meanbrian.com</p>`;
  page({ title: 'About', body, back: '#/settings' });
}

export { renderSettings, renderRatePage, renderAppearancePage, renderAboutPage };
