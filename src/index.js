// tcalc — timecode and clip time calculator for editors. One Worker serves the static app (public/) and a small
// API: the dev door (auth.js), config switches (config.js), the visit log (visits.js) and the Dev tab (dev.js).
// All calculations run in the browser; there are no user accounts.
import { json, HttpError, logEvent } from './util.js';
import { handleAuth, isDev, expireSessions } from './auth.js';
import { getConfig, publicConfig } from './config.js';
import { logVisit, purgeVisits } from './visits.js';
import { handleDev } from './dev.js';
import { appPage } from './homeicon.js';
import { closedPage, maintenancePage } from './pages.js';

// Same list as public/_headers (static files). Keep the two in step.
const SECURITY_HEADERS = {
  'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; manifest-src 'self'; worker-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  'x-frame-options': 'DENY',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'same-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
  'cross-origin-opener-policy': 'same-origin',
  'strict-transport-security': 'max-age=15552000',
};

function withHeaders(res) {
  const r = new Response(res.body, res);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) r.headers.set(k, v);
  return r;
}

// Writes must come from this site's own pages: same Origin and the app's own header.
function checkOrigin(request, url) {
  if (request.method === 'GET' || request.method === 'HEAD') return;
  const origin = request.headers.get('origin');
  if (origin && origin !== url.origin) throw new HttpError(403, 'Bad origin');
  if (request.headers.get('x-tcalc') !== '1') throw new HttpError(403, 'Missing app header');
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    try {
      if (path.startsWith('/auth/') || path.startsWith('/api/')) {
        checkOrigin(request, url);
        if (path.startsWith('/auth/')) return withHeaders((await handleAuth(request, env, path)) || json({ error: 'Not found' }, 404));
        if (path === '/api/config' && request.method === 'GET') return withHeaders(json(publicConfig(await getConfig(env))));
        if (path.startsWith('/api/dev/')) {
          if (!(await isDev(env, request))) return withHeaders(json({ error: 'Not signed in' }, 401));
          return withHeaders((await handleDev(request, env, path)) || json({ error: 'Not found' }, 404));
        }
        return withHeaders(json({ error: 'Not found' }, 404));
      }

      // The app page: closed / maintenance switches first (the dev always gets through), then a visit row,
      // then the page with the home-screen icon built in.
      if (path === '/' || path === '/index.html') {
        const cfg = await getConfig(env);
        if (cfg.closed || cfg.maintenance) {
          if (!(await isDev(env, request))) return withHeaders(cfg.closed ? closedPage(cfg) : maintenancePage(cfg));
        }
        ctx.waitUntil(logVisit(env, request, path));
        return withHeaders(await appPage(env, request, '/'));
      }
      return env.ASSETS.fetch(request);
    } catch (e) {
      if (e instanceof HttpError) return withHeaders(json({ error: e.message, ...e.extra }, e.status));
      console.error(e);
      await logEvent(env, 'error', `${request.method} ${path}: ${e?.message || e}`);
      return withHeaders(json({ error: 'Server error' }, 500));
    }
  },

  // Daily cron (wrangler.jsonc "triggers"): housekeeping.
  async scheduled(event, env, ctx) {
    ctx.waitUntil(Promise.all([expireSessions(env), purgeVisits(env)]).catch((e) => logEvent(env, 'error', `cron: ${e?.message || e}`)));
  },
};
