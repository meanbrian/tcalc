// config.js — the app's switches, one JSON row in D1: closed, maintenance (+ message) and which features are on.
// getConfig() is read on every page view; setConfig() only from the Dev tab.
import { cleanText, cleanBool } from './util.js';

const FEATURES = ['calc', 'offset', 'convert', 'clips', 'time', 'history'];
const DEFAULTS = { closed: false, maintenance: false, message: '', features: Object.fromEntries(FEATURES.map((f) => [f, true])) };

async function getConfig(env) {
  const row = await env.DB.prepare('SELECT value FROM config WHERE key = ?').bind('app').first();
  if (!row) return { ...DEFAULTS, features: { ...DEFAULTS.features } };
  try { const v = JSON.parse(row.value); return { ...DEFAULTS, ...v, features: { ...DEFAULTS.features, ...(v.features || {}) } }; }
  catch { return { ...DEFAULTS, features: { ...DEFAULTS.features } }; }
}

// input: a partial object from the Dev tab; unknown keys are ignored.
async function setConfig(env, input) {
  const cur = await getConfig(env);
  const next = {
    closed: input.closed === undefined ? cur.closed : cleanBool(input.closed),
    maintenance: input.maintenance === undefined ? cur.maintenance : cleanBool(input.maintenance),
    message: input.message === undefined ? cur.message : cleanText(input.message, 300, 'Message'),
    features: { ...cur.features },
  };
  for (const f of FEATURES) if (input.features && input.features[f] !== undefined) next.features[f] = cleanBool(input.features[f]);
  await env.DB.prepare('INSERT INTO config (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at')
    .bind('app', JSON.stringify(next), Date.now()).run();
  return next;
}

// What the public app may know: features and a maintenance note (never the dev state).
const publicConfig = (c) => ({ features: c.features, maintenance: c.maintenance, message: c.maintenance || c.closed ? c.message : '' });

export { FEATURES, getConfig, setConfig, publicConfig };
