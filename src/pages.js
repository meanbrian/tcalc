// pages.js — the two pages served instead of the app: Closed and Under Maintenance. Plain HTML on styles.css
// (no inline styles, so the strict CSP holds). The dev's own message is escaped before it goes in.

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function notice(title, text, message) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>TCalc — ${esc(title)}</title><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/styles.css"></head>
<body><main class="notice"><div class="notice-card"><h1>${esc(title)}</h1><p>${esc(text)}</p>${message ? `<p class="muted">${esc(message)}</p>` : ''}<p class="muted small"><a href="/privacy.html">Privacy</a></p></div></main></body></html>`;
}

const html = (body, status) => new Response(body, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
const closedPage = (cfg) => html(notice('TCalc is closed', 'This app is no longer available.', cfg.message), 410);
const maintenancePage = (cfg) => html(notice('Under maintenance', 'TCalc is being worked on. Check back soon.', cfg.message), 503);

export { closedPage, maintenancePage };
