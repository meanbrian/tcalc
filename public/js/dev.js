// dev.js — the dev door (#/dev): sign in with the dev username + setup code, then switches (Closed, Under
// Maintenance + message, features on/off), Traffic (#/dev/traffic) and Events (#/dev/events), Sign Out.
import { S, $, $$, esc, api, page, toast, localSet } from './core.js';

const FEATURES = [['calc', 'Calculator'], ['offset', 'Offset'], ['convert', 'Convert'], ['clips', 'Clips'], ['time', 'Time'], ['history', 'History']];
const sw = (id, name, on, red = false) =>
  `<label class="row"><span class="rname${red ? ' red' : ''}">${esc(name)}</span><span class="switch"><input type="checkbox" data-sw="${id}"${on ? ' checked' : ''}><span></span></span></label>`;

// ---------- sign in ----------
function renderDevLogin() {
  const body = `<form class="group text" id="f">
      <label class="field"><span>Username</span><input type="text" name="username" autocomplete="username" autocapitalize="off" required></label>
      <label class="field"><span>Setup code</span><input type="password" name="code" autocomplete="current-password" required></label>
      <button type="submit" class="btn primary block">Sign In</button>
    </form><p class="footnote">Developer only. Ten wrong tries lock this door for 15 minutes.</p>`;
  const root = page({ title: 'Developer', body, back: '#/settings' });
  $('#f', root).addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try { await api('/auth/dev-login', { method: 'POST', body: { username: fd.get('username'), code: fd.get('code') } }); S.dev = true; renderDev(); }
    catch (err) { toast(err.message); }
  });
}

// ---------- main dev page ----------
async function renderDev() {
  if (!S.dev) return renderDevLogin();
  const nav = S.nav;
  let cfg;
  try { cfg = await api('/api/dev/config'); } catch (err) { if (err.status === 401) { S.dev = false; return renderDevLogin(); } return toast(err.message); }
  if (nav !== S.nav) return;
  const body = `
    <h2 class="section-name">App</h2>
    <div class="group">${sw('closed', 'Closed', cfg.closed, true)}${sw('maintenance', 'Under Maintenance', cfg.maintenance)}</div>
    <p class="footnote">Closed shows a "no longer available" page to everyone (HTTP 410). Maintenance shows a "back soon" page (503). You still get in while signed in here.</p>
    <label class="field"><span>Message shown on those pages</span><input type="text" id="msg" maxlength="300" value="${esc(cfg.message)}" placeholder="Optional"></label>
    <div class="row end"><button type="button" class="btn small" id="savemsg">Save Message</button></div>
    <h2 class="section-name">Features</h2>
    <div class="group">${FEATURES.map(([k, n]) => sw(`f:${k}`, n, cfg.features[k] !== false)).join('')}</div>
    <p class="footnote">A feature switched off disappears from the tab bar on the next load.</p>
    <div class="group"><a class="row" href="#/dev/traffic"><span class="rname">Traffic</span><span class="rchev">›</span></a><a class="row" href="#/dev/events"><span class="rname">Events</span><span class="rchev">›</span></a></div>
    <div class="group"><button type="button" class="row red center" id="out">Sign Out</button></div>`;
  const root = page({ title: 'Developer', body, back: '#/settings' });
  $$('[data-sw]', root).forEach((el) => el.addEventListener('change', () => save(el.dataset.sw.startsWith('f:')
    ? { features: { [el.dataset.sw.slice(2)]: el.checked } } : { [el.dataset.sw]: el.checked })));
  $('#savemsg', root).addEventListener('click', () => save({ message: $('#msg').value }));
  $('#out', root).addEventListener('click', async () => { await api('/auth/logout', { method: 'POST' }).catch(() => {}); S.dev = false; location.hash = '#/settings'; });
}

async function save(patch) {
  try { const cfg = await api('/api/dev/config', { method: 'PUT', body: patch }); S.features = cfg.features; localSet('tcalc.features', cfg.features); toast('✓ Saved'); }
  catch (err) { toast(err.message); renderDev(); }
}

// ---------- traffic ----------
const when = (ts) => new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
async function renderTraffic() {
  const nav = S.nav;
  let t;
  try { t = await api('/api/dev/traffic'); } catch (err) { return toast(err.message); }
  if (nav !== S.nav) return;
  const table = (rows, head, cell) => `<div class="tbl"><table><thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${cell(r).map((c) => `<td>${esc(c ?? '')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const body = `
    <div class="stats"><div><b>${t.totals.views}</b><span>views · 30 d</span></div><div><b>${t.totals.ips}</b><span>IPs · 30 d</span></div></div>
    <h2 class="section-name">By day</h2>${table(t.days, ['Day', 'Views', 'IPs'], (r) => [r.day, r.views, r.ips])}
    <h2 class="section-name">Top IPs · 7 d</h2>${table(t.ips, ['IP', 'Where', 'Views', 'Last'], (r) => [r.ip, [r.city, r.country].filter(Boolean).join(', '), r.views, when(r.last_ts)])}
    <h2 class="section-name">Countries · 30 d</h2>${table(t.countries, ['Country', 'Views', 'IPs'], (r) => [r.country, r.views, r.ips])}
    <h2 class="section-name">Last 100 hits</h2>${table(t.recent, ['When', 'IP', 'Where', 'Agent'], (r) => [when(r.ts), r.ip, [r.city, r.country].filter(Boolean).join(', '), r.ua])}
    <div class="group"><button type="button" class="row red center" id="clear">Clear Traffic Log</button></div>
    <p class="footnote">Visits are kept 30 days, then dropped by the nightly cron.</p>`;
  const root = page({ title: 'Traffic', body, back: '#/dev' });
  $('#clear', root).addEventListener('click', async () => {
    if (!confirm('Delete every visit row?')) return;
    try { await api('/api/dev/traffic', { method: 'DELETE' }); toast('Cleared'); renderTraffic(); } catch (err) { toast(err.message); }
  });
}

// ---------- events ----------
async function renderEvents() {
  const nav = S.nav;
  let e;
  try { e = await api('/api/dev/events'); } catch (err) { return toast(err.message); }
  if (nav !== S.nav) return;
  const body = e.events.length ? `<ul class="list">${e.events.map((ev) => `<li class="ev ${esc(ev.level)}"><span>${when(ev.ts)} · ${esc(ev.level)}</span><div>${esc(ev.msg)}</div></li>`).join('')}</ul>`
    : '<div class="empty"><p>No events yet.</p></div>';
  page({ title: 'Events', body, back: '#/dev' });
}

export { renderDev, renderTraffic, renderEvents };
