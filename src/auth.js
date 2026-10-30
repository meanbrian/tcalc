// auth.js — the dev door. One account: DEV_USERNAME + DEV_SETUP_CODE (Cloudflare secrets). Sessions live in D1
// as SHA-256 of a random cookie; lockout after 10 wrong tries for 15 minutes. Routes: /auth/dev-login, /auth/logout, /auth/me.
import { json, fail, sha256, sameSecret, readJson, logEvent, cleanText } from './util.js';

const COOKIE = 'tcalc_dev';
const SESSION_MS = 30 * 24 * 3600 * 1000; // 30 days
const LOCK_MAX = 10, LOCK_MS = 15 * 60 * 1000;

// ---------- sessions ----------
function cookieValue(request) {
  const m = (request.headers.get('cookie') || '').match(new RegExp(`(?:^|;\\s*)${COOKIE}=([A-Za-z0-9_-]+)`));
  return m ? m[1] : null;
}

// true when the request carries a live dev session.
async function isDev(env, request) {
  const token = cookieValue(request);
  if (!token) return false;
  const row = await env.DB.prepare('SELECT expires_at FROM sessions WHERE token_hash = ? AND expires_at > ?').bind(await sha256(token), Date.now()).first();
  return !!row;
}

function randomToken() {
  const b = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
const setCookie = (token, maxAge) => `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;

// ---------- lockout (a config row: { n, until }) ----------
async function getLock(env) {
  const row = await env.DB.prepare('SELECT value FROM config WHERE key = ?').bind('lock').first();
  try { return row ? JSON.parse(row.value) : { n: 0, until: 0 }; } catch { return { n: 0, until: 0 }; }
}
const setLock = (env, lock) => env.DB.prepare('INSERT INTO config (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at')
  .bind('lock', JSON.stringify(lock), Date.now()).run();

// ---------- routes ----------
async function handleAuth(request, env, path) {
  if (path === '/auth/me' && request.method === 'GET') return json({ dev: await isDev(env, request) });

  if (path === '/auth/dev-login' && request.method === 'POST') {
    const lock = await getLock(env);
    if (lock.until > Date.now()) fail(429, 'Too many tries. Wait 15 minutes.');
    const body = await readJson(request);
    const username = cleanText(body.username, 64, 'Username'), code = cleanText(body.code, 128, 'Code');
    const ok = env.DEV_USERNAME && env.DEV_SETUP_CODE && (await sameSecret(username, env.DEV_USERNAME)) && (await sameSecret(code, env.DEV_SETUP_CODE));
    if (!ok) {
      const n = lock.until > Date.now() ? lock.n + 1 : (lock.n || 0) + 1;
      await setLock(env, { n, until: n >= LOCK_MAX ? Date.now() + LOCK_MS : 0 });
      await logEvent(env, 'warn', `dev login failed from ${request.headers.get('cf-connecting-ip') || '?'}`);
      fail(401, 'Wrong username or code');
    }
    const token = randomToken(), now = Date.now();
    await env.DB.batch([
      env.DB.prepare('INSERT INTO sessions (token_hash, created_at, expires_at) VALUES (?, ?, ?)').bind(await sha256(token), now, now + SESSION_MS),
      env.DB.prepare('DELETE FROM config WHERE key = ?').bind('lock'),
    ]);
    await logEvent(env, 'info', 'dev signed in');
    return json({ ok: true }, 200, { 'set-cookie': setCookie(token, SESSION_MS / 1000) });
  }

  if (path === '/auth/logout' && request.method === 'POST') {
    const token = cookieValue(request);
    if (token) await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(token)).run();
    return json({ ok: true }, 200, { 'set-cookie': setCookie('', 0) });
  }
  return null;
}

// Daily cron: drop expired sessions.
const expireSessions = (env) => env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(Date.now()).run();

export { handleAuth, isDev, expireSessions };
