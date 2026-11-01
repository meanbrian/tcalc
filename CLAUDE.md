# tcalc — code map

**TCalc** — timecode and clip time calculator for editors at **tcalc.meanbrian.com**. One Cloudflare Worker serves the
static app (`public/`) and a small API (`src/`): a dev door, config switches, a visit log. **No user accounts**;
every calculation runs in the browser. D1 holds only dev config, dev sessions, visits and events.
Pushing to `main` deploys (Workers Builds). Built to the meanbrian dev playbook (meanbrian/dev-playbook).

Read this map, then open only the file you need. Every file starts with a short comment saying what it does.

## Server — `src/`

| File | What's in it | Routes |
| --- | --- | --- |
| `index.js` | Entry: security headers (`withHeaders`), Origin + `X-tcalc` check, dispatch, closed/maintenance gate on `/`, visit log, error catch, cron | |
| `util.js` | `json`, `fail`, `HttpError`, `sha256`, `sameSecret`, `readJson`, `logEvent`, `cleanText`, `cleanBool` | |
| `auth.js` | Dev sign-in (`DEV_USERNAME` + `DEV_SETUP_CODE`), sessions (hashed cookie), 10-strike lockout, `isDev()` | `/auth/dev-login`, `/auth/logout`, `/auth/me` |
| `config.js` | `getConfig` / `setConfig`: closed, maintenance, message, features; `publicConfig` | `/api/config` (GET, public); `/api/app-open` (GET, iPhone app: same + a visit row, path `ios`) |
| `visits.js` | `logVisit` (one row per page view), `visitStats` (one batch, all LIMITed), `clearVisits`, `purgeVisits` | |
| `dev.js` | Dev tab API | `/api/dev/config` (GET/PUT), `/api/dev/traffic` (GET/DELETE), `/api/dev/events` |
| `pages.js` | The Closed (410) and Under Maintenance (503) pages | |
| `homeicon.js` | Serves `/` with the apple-touch-icon inlined as a data URL (read once from ASSETS) | |

Database changes go in a new numbered file in `migrations/` (never edit an applied one).

## Front end — `public/`

Plain JavaScript modules, no build step. `index.html` loads `js/main.js`, which loads the rest.

| File | Screen / job |
| --- | --- |
| `js/main.js` | Start here: hash router, tab bar (Calc · Offset · Convert · Clips · Time; hides switched-off features; Settings is the ⚙ at the top), boot (`/api/config`, `/auth/me`), SW |
| `js/core.js` | Shared: state `S`, prefs (localStorage `tcalc.prefs`), `rate()`, `api()`, `toast`, `copyText`, theme, `rateBar`, `page`, `resultCard`, `APP_VERSION` |
| `js/timecode.js` | Pure maths: rates, parse, drop-frame, frames ↔ tc ↔ seconds, conversions, formatting (tests in `test/`) |
| `js/field.js` | Timecode entry field (digits shift in from the right) + number field; `bindTcInputs`, `tcFrames` |
| `js/history.js` | Recent results in localStorage (`tcalc.history`, last 100); History page |
| `js/calc.js` | Calc tab: running tape of ± timecodes / frames / seconds |
| `js/offset.js` | Offset tab: B − A as ± frames / seconds / tc, apply the offset to a third tc |
| `js/convert.js` | Convert tab: frames / seconds / clock, speed change, every other rate (same frames or same time) |
| `js/clips.js` | Clips tab: how many fit, total runtime of a pasted list, handles |
| `js/time.js` | Time tab (no frame rate): decimal value in any unit → breakdown + totals, between two dates, since/until (live), date ± duration, unix epoch |
| `js/timespan.js` | Pure time maths: units ↔ ms, `breakdown`, `calendarDiff` (clamped month stepping), `addToDate`, epoch, formatting (tests in `test/`) |
| `js/settings.js` | Settings (house style) + pages: Frame Rate, Appearance, About |
| `js/privacy.js` | The privacy text (once) + Settings › Privacy page; `privacy-static.js` draws `/privacy.html` (linked from Closed / Maintenance) |
| `js/dev.js` | `#/dev`: sign-in, Closed / Maintenance / message, feature switches, Traffic, Events, Sign Out |
| `js/icons.js` | All SVG icons |
| `styles.css` | All styles (light/dark tokens at the top, indigo accent) |
| `glass.css` | Liquid Glass layer: tab bar, ‹ button, toast |
| `_headers` | Security headers for static files (keep in step with `withHeaders` in `src/index.js`) |
| `sw.js` | Offline cache. Its file list must match `public/js` |
| `index.html` splash | `.splash` inside `#app` (styles.css): hidden 0.3 s, then fades in; the first render replaces it. Logo `splash-logo.png` (white +/− 0:01) |

## Data — D1 tables

| Table | Holds | Key indexes |
| --- | --- | --- |
| `config` | `app` row (JSON switches), `lock` row (login lockout) | key |
| `sessions` | dev sessions: token hash, expiry | `(expires_at)` |
| `visits` | one row per page view: ts, ip, country, city, ua, path — kept 30 days | `(ts DESC)`, `(ip, ts DESC)` |
| `events` | dev log — kept 30 days | `(ts DESC)` |

## Releasing

1. Bump `APP_VERSION` in `public/js/core.js` **and** `CACHE` in `public/sw.js` (same number).
   Fix = last digit, feature = middle, breaking = first.
2. New migration? Apply it to the remote D1 before pushing.
3. Run the security check (playbook §11.6) and `npm test`.
4. Commit as `vX.Y.Z: what changed`; push to `main`.

## House rules

- Brian's dev projects: private GitHub repo + Cloudflare. Commit and push every change straight to `main`, except when his message ends with "?" (then answer only). Never push anything that costs money or deletes data that can't be recovered: ask first.
- Never enter secrets in forms; he sets `DEV_USERNAME` / `DEV_SETUP_CODE` in Cloudflare.
- Keep files small (~300 lines); update this map in the same commit as any new file or route.
- Security exceptions (playbook §11.1): none.
- Maths lives only in `timecode.js` (frames) and `timespan.js` (calendar time); screens format, they don't calculate. Add a test when touching them.
- Public app, so nothing a visitor types ever reaches the server; keep it that way.
- The iPhone app (meanbrian/tcalc-ios) reads `/api/app-open`; keep its JSON shape (`features`, `closed`, `maintenance`, `message`) stable.
