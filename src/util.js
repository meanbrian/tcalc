// util.js — tiny shared helpers for the Worker: JSON responses, HttpError + fail(), sha256, readJson,
// logEvent (never throws), and the clean* validators with user-readable errors.

class HttpError extends Error {
  constructor(status, message, extra = {}) { super(message); this.status = status; this.extra = extra; }
}
const fail = (status, message, extra) => { throw new HttpError(status, message, extra); };
const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } });

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Constant-time compare of two strings (secrets and codes).
async function sameSecret(a, b) {
  const [x, y] = await Promise.all([sha256(String(a ?? '')), sha256(String(b ?? ''))]);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}

async function readJson(request, max = 16 * 1024) {
  const text = await request.text();
  if (text.length > max) fail(413, 'Request too large');
  try { return text ? JSON.parse(text) : {}; } catch { return fail(400, 'Bad JSON'); }
}

// Dev-tab log. Messages are cut to 500 chars; never holds secrets or request bodies.
async function logEvent(env, level, msg) {
  try { await env.DB.prepare('INSERT INTO events (ts, level, msg) VALUES (?, ?, ?)').bind(Date.now(), level, String(msg).slice(0, 500)).run(); }
  catch { /* logging must never break a request */ }
}

// ---------- validators ----------
const cleanText = (v, max, name) => {
  const s = String(v ?? '').trim();
  if (s.length > max) fail(400, `${name} is too long (max ${max} characters)`);
  return s;
};
const cleanBool = (v) => v === true || v === 1 || v === '1' || v === 'true';

export { HttpError, fail, json, sha256, sameSecret, readJson, logEvent, cleanText, cleanBool };
