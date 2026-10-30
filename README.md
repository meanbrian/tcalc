# tcalc

Timecode and clip time calculator for video editors — **tcalc.meanbrian.com**. Free, no sign-up, works offline.

- **Calc** — add and subtract timecodes (or frames / seconds) on a running tape
- **Offset** — a clip sat at 01:34:42, after syncing it sits at 01:35:22: how many ± frames at the chosen rate; apply the same offset to another clip
- **Convert** — frames / seconds / clock, speed changes, the same code at every other frame rate (same frames or same real time)
- **Clips** — how many clips of X fit in Y, total runtime of a pasted list, in/out with handles
- **Time** (no frame rate) — 1.23 years / 1.97 hours / 99282 days broken down and totalled in every unit, between two dates, since/until a date (live), date ± duration, unix epoch ↔ date
- Frame rates 23.976 → 120 plus custom; 29.97 and 59.94 drop-frame follow the SMPTE rule; optional 24-hour wrap
- History of copied results, kept on the device

## Deploy

Cloudflare Worker + D1, deployed by pushing to `main` (Workers Builds). Secrets: `DEV_USERNAME`, `DEV_SETUP_CODE`.

```
npm install
npm test                      # timecode maths
npm run db:migrate            # apply migrations to the remote D1 (new migrations only)
npm run dev                   # local, needs .dev.vars with the two secrets
```

## Developer door

`#/dev` (also a row in Settings once signed in): close the app, put it under maintenance with a message,
switch features on/off, see traffic (views by day, top IPs, countries, last 100 hits; kept 30 days) and events.
