// homeicon.js — the iPhone home-screen icon, built into the page itself. On "Add to Home Screen" iOS fetches the
// icon in a separate background request that Cloudflare's bot protection can block; then iOS falls back to a
// letter or a screenshot. So the page carries the picture as a data URL instead: read once from the assets,
// kept in memory, swapped into <link rel="apple-touch-icon"> on the way out. Change the PNG and pages follow.

const ICON = '/apple-touch-icon.png';
let cached = null; // Promise<string> — the data URL, made once per Worker instance

function toBase64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

async function iconDataUrl(env, request) {
  cached ??= env.ASSETS.fetch(new Request(new URL(ICON, request.url)))
    .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`icon ${r.status}`))))
    .then((b) => `data:image/png;base64,${toBase64(new Uint8Array(b))}`)
    .catch((e) => { cached = null; throw e; });
  return cached;
}

// html: the page text. Any apple-touch-icon link pointing at the PNG gets the data URL instead.
export async function inlineHomeIcon(env, request, html) {
  try {
    const url = await iconDataUrl(env, request);
    return html.replace(/(<link rel="apple-touch-icon"[^>]*?href=")\/apple-touch-icon\.png[^"]*(")/g, `$1${url}$2`);
  } catch { return html; } // icon missing: leave the link as it was
}

// GET / → the app page with the icon built in.
export async function appPage(env, request, page = '/') {
  const res = await env.ASSETS.fetch(new Request(new URL(page, request.url), { headers: request.headers }));
  if (!res.ok || !(res.headers.get('content-type') || '').includes('text/html')) return res;
  const out = new Response(await inlineHomeIcon(env, request, await res.text()), res);
  out.headers.delete('content-length'); out.headers.delete('etag');
  out.headers.set('cache-control', 'no-cache');
  return out;
}
