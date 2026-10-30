// visits.js — the traffic log: one row per page view (ip, country, city, user agent, path), kept 30 days.
// logVisit() runs after the response (ctx.waitUntil); the stats queries feed the Dev tab's Traffic page.

const KEEP_MS = 30 * 24 * 3600 * 1000;

async function logVisit(env, request, path) {
  try {
    const cf = request.cf || {};
    await env.DB.prepare('INSERT INTO visits (ts, ip, country, city, ua, path) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(Date.now(), request.headers.get('cf-connecting-ip') || '?', cf.country || null, cf.city || null,
        (request.headers.get('user-agent') || '').slice(0, 120), path.slice(0, 80)).run();
  } catch { /* a lost visit row never breaks the page */ }
}

// Everything the Traffic page shows, in one batch. Every query has a LIMIT.
async function visitStats(env) {
  const since7 = Date.now() - 7 * 24 * 3600 * 1000, since30 = Date.now() - KEEP_MS;
  const [days, ips, countries, recent, totals] = await env.DB.batch([
    env.DB.prepare("SELECT date(ts / 1000, 'unixepoch') AS day, COUNT(*) AS views, COUNT(DISTINCT ip) AS ips FROM visits WHERE ts > ? GROUP BY day ORDER BY day DESC LIMIT 30").bind(since30),
    env.DB.prepare('SELECT ip, country, city, COUNT(*) AS views, MAX(ts) AS last_ts FROM visits WHERE ts > ? GROUP BY ip ORDER BY views DESC LIMIT 50').bind(since7),
    env.DB.prepare('SELECT country, COUNT(*) AS views, COUNT(DISTINCT ip) AS ips FROM visits WHERE ts > ? GROUP BY country ORDER BY views DESC LIMIT 30').bind(since30),
    env.DB.prepare('SELECT ts, ip, country, city, ua, path FROM visits ORDER BY ts DESC LIMIT 100'),
    env.DB.prepare('SELECT COUNT(*) AS views, COUNT(DISTINCT ip) AS ips FROM visits WHERE ts > ?').bind(since30),
  ]);
  return { days: days.results, ips: ips.results, countries: countries.results, recent: recent.results, totals: totals.results[0] };
}

const clearVisits = (env) => env.DB.prepare('DELETE FROM visits').run();
// Daily cron: keep 30 days of visits and events.
const purgeVisits = (env) => env.DB.batch([
  env.DB.prepare('DELETE FROM visits WHERE ts < ?').bind(Date.now() - KEEP_MS),
  env.DB.prepare('DELETE FROM events WHERE ts < ?').bind(Date.now() - KEEP_MS),
]);

export { logVisit, visitStats, clearVisits, purgeVisits };
