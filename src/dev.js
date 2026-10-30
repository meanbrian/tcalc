// dev.js — /api/dev/* for the signed-in dev: config (close / maintenance / features), traffic stats, events.
import { json, readJson } from './util.js';
import { getConfig, setConfig } from './config.js';
import { visitStats, clearVisits } from './visits.js';

async function handleDev(request, env, path) {
  if (path === '/api/dev/config') {
    if (request.method === 'GET') return json(await getConfig(env));
    if (request.method === 'PUT') return json(await setConfig(env, await readJson(request)));
  }
  if (path === '/api/dev/traffic' && request.method === 'GET') return json(await visitStats(env));
  if (path === '/api/dev/traffic' && request.method === 'DELETE') { await clearVisits(env); return json({ ok: true }); }
  if (path === '/api/dev/events' && request.method === 'GET') {
    const { results } = await env.DB.prepare('SELECT ts, level, msg FROM events ORDER BY ts DESC LIMIT 100').all();
    return json({ events: results });
  }
  return null;
}

export { handleDev };
