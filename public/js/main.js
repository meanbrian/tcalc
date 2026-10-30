// main.js — START HERE. Hash router (#/, #/offset, #/convert, #/clips, #/settings/*, #/dev/*), the tab bar
// (features switched off in the Dev tab are left out), boot: prefs, theme, /api/config, dev check, service worker.
import { S, $, $$, app, api, applyTheme, localSet } from './core.js';
import { I } from './icons.js';
import { renderCalc } from './calc.js';
import { renderOffset } from './offset.js';
import { renderConvert } from './convert.js';
import { renderClips } from './clips.js';
import { renderSettings, renderRatePage, renderAppearancePage, renderAboutPage } from './settings.js';
import { renderHistory } from './history.js';
import { renderDev, renderTraffic, renderEvents } from './dev.js';

// ---------- tabs ----------
const TABS = [
  { id: 'calc', href: '#/', name: 'Calc', icon: I.calc, render: renderCalc },
  { id: 'offset', href: '#/offset', name: 'Offset', icon: I.offset, render: renderOffset },
  { id: 'convert', href: '#/convert', name: 'Convert', icon: I.convert, render: renderConvert },
  { id: 'clips', href: '#/clips', name: 'Clips', icon: I.clips, render: renderClips },
  { id: 'settings', href: '#/settings', name: 'Settings', icon: I.settings, render: renderSettings },
];
const onTabs = () => TABS.filter((t) => t.id === 'settings' || S.features[t.id] !== false);

let bar = null;
function drawTabs(current) {
  if (!bar) { bar = document.createElement('nav'); bar.className = 'tabbar'; bar.setAttribute('aria-label', 'Tabs'); document.body.appendChild(bar); }
  bar.innerHTML = onTabs().map((t) => `<a class="tab${t.id === current ? ' on' : ''}" href="${t.href}"${t.id === current ? ' aria-current="page"' : ''}>
    <span class="tab-ic">${t.icon}</span><span class="tab-label">${t.name}</span></a>`).join('');
}

// ---------- router ----------
const PAGES = {
  '': 'calc', 'offset': 'offset', 'convert': 'convert', 'clips': 'clips', 'settings': 'settings',
  'settings/rate': renderRatePage, 'settings/appearance': renderAppearancePage, 'settings/history': renderHistory, 'settings/about': renderAboutPage,
  'dev': renderDev, 'dev/traffic': renderTraffic, 'dev/events': renderEvents,
};
function route() {
  S.nav++;
  const path = location.hash.replace(/^#\/?/, '').replace(/\/+$/, '');
  const target = PAGES[path] ?? 'calc';
  const tabId = typeof target === 'string' ? target : path.startsWith('dev') ? 'settings' : path.split('/')[0];
  const tab = onTabs().find((t) => t.id === tabId) || onTabs()[0];
  drawTabs(tab.id);
  if (typeof target === 'string') { if (tab.id !== target) { location.hash = tab.href; return; } tab.render(); }
  else target();
  scrollTo(0, 0);
}

// ---------- boot ----------
async function boot() {
  applyTheme();
  addEventListener('hashchange', route);
  route();
  // Feature switches and the dev session, in parallel; the cached features keep the app right when offline.
  const [cfg, me] = await Promise.all([api('/api/config').catch(() => null), api('/auth/me').catch(() => null)]);
  let changed = false;
  if (cfg?.features && JSON.stringify(cfg.features) !== JSON.stringify(S.features)) { S.features = cfg.features; localSet('tcalc.features', cfg.features); changed = true; }
  if (me?.dev) { S.dev = true; changed = true; }
  if (changed) route();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
}

// iOS keyboard: mark the page so the tab bar can hide while typing.
addEventListener('focusin', (e) => { if (e.target.matches('input, textarea')) document.documentElement.classList.add('kb-open'); });
addEventListener('focusout', () => document.documentElement.classList.remove('kb-open'));

boot();

export { route };
