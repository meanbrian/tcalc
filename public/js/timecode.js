// timecode.js — pure timecode math, no DOM. Frame rates, parsing typed timecodes, drop-frame (SMPTE rule),
// frames ↔ timecode ↔ seconds, and formatting. Every screen does its sums through this file.

// ---------- frame rates ----------
// nom = nominal frames per second used for the HH:MM:SS:FF count; num/den = the true rate.
const RATES = [
  { id: '23.976', label: '23.976', num: 24000, den: 1001, nom: 24, df: false },
  { id: '24', label: '24', num: 24, den: 1, nom: 24, df: false },
  { id: '25', label: '25', num: 25, den: 1, nom: 25, df: false },
  { id: '29.97df', label: '29.97 DF', num: 30000, den: 1001, nom: 30, df: true },
  { id: '29.97', label: '29.97 NDF', num: 30000, den: 1001, nom: 30, df: false },
  { id: '30', label: '30', num: 30, den: 1, nom: 30, df: false },
  { id: '48', label: '48', num: 48, den: 1, nom: 48, df: false },
  { id: '50', label: '50', num: 50, den: 1, nom: 50, df: false },
  { id: '59.94df', label: '59.94 DF', num: 60000, den: 1001, nom: 60, df: true },
  { id: '59.94', label: '59.94 NDF', num: 60000, den: 1001, nom: 60, df: false },
  { id: '60', label: '60', num: 60, den: 1, nom: 60, df: false },
  { id: '120', label: '120', num: 120, den: 1, nom: 120, df: false },
];

// A rate from its id; 'custom' builds one from a number (e.g. 47.952 or 240).
function rateById(id, customFps = 30) {
  const r = RATES.find((x) => x.id === id);
  if (r) return r;
  const fps = Number(customFps) > 0 ? Number(customFps) : 30;
  const den = Number.isInteger(fps) ? 1 : 1000;
  return { id: 'custom', label: String(fps), num: Math.round(fps * den), den, nom: Math.max(1, Math.round(fps)), df: false };
}
const fps = (r) => r.num / r.den;
const dropPerMin = (r) => (r.df ? r.nom / 15 : 0); // 30 → 2, 60 → 4

// ---------- parsing ----------
// "01:23:05:12", "1:23:05;12", "23:05:12" (right-aligned), "5:12", or plain digits "12305" → 00:01:23:05.
// Returns { h, m, s, f } or null.
function parseTc(str) {
  const t = String(str ?? '').trim();
  if (!t) return null;
  let parts;
  if (/^[0-9]+$/.test(t)) {
    const d = t.slice(-8).padStart(8, '0');
    parts = [d.slice(0, 2), d.slice(2, 4), d.slice(4, 6), d.slice(6, 8)];
  } else {
    parts = t.split(/[:;.,\s]+/).filter(Boolean);
    if (parts.length < 1 || parts.length > 4 || parts.some((p) => !/^[0-9]+$/.test(p))) return null;
    while (parts.length < 4) parts.unshift('0');
  }
  const [h, m, s, f] = parts.map(Number);
  return { h, m, s, f };
}

// ---------- frames ↔ timecode ----------
function tcToFrames({ h, m, s, f }, r) {
  const N = r.nom;
  const minutes = h * 60 + m;
  // Typed codes that don't exist in drop-frame (00:01:00;00) bump to the first real one (00:01:00;02).
  if (r.df && s === 0 && minutes % 10 !== 0 && f < dropPerMin(r)) f = dropPerMin(r);
  let frames = (minutes * 60 + s) * N + f;
  if (r.df) frames -= dropPerMin(r) * (minutes - Math.floor(minutes / 10));
  return frames;
}

// frames may be negative; wrap24 keeps hours inside a day like a deck would.
function framesToTc(frames, r, { wrap24 = false } = {}) {
  const neg = frames < 0;
  let n = Math.abs(Math.round(frames));
  const N = r.nom;
  if (r.df) {
    const D = dropPerMin(r), per10 = N * 600 - 9 * D, perMin = N * 60 - D;
    const tens = Math.floor(n / per10), rest = n % per10;
    n += 9 * D * tens + (rest >= D ? D * Math.floor((rest - D) / perMin) : 0);
  }
  const f = n % N, s = Math.floor(n / N) % 60, m = Math.floor(n / (N * 60)) % 60;
  let h = Math.floor(n / (N * 3600));
  if (wrap24) h %= 24;
  return { h, m, s, f, neg };
}

// ---------- seconds ----------
const framesToSeconds = (frames, r) => (frames * r.den) / r.num;
const secondsToFrames = (sec, r) => Math.round((sec * r.num) / r.den);

// ---------- conversions ----------
// Same frame count at another rate (the clip is re-timed; durations change).
const sameFrames = (frames) => frames;
// Same real time at another rate (frames are re-sampled; durations stay).
const sameTime = (frames, from, to) => secondsToFrames(framesToSeconds(frames, from), to);
// A clip played at speed (1 = normal, 0.5 = half) takes frames / speed frames of timeline.
const atSpeed = (frames, speed) => (speed > 0 ? Math.round(frames / speed) : 0);

// ---------- formatting ----------
const pad = (n, w = 2) => String(n).padStart(w, '0');
function fmtTc(tc, r, { sign = false } = {}) {
  const fw = r.nom >= 100 ? 3 : 2, sep = r.df ? ';' : ':';
  const body = `${pad(tc.h)}:${pad(tc.m)}:${pad(tc.s)}${sep}${pad(tc.f, fw)}`;
  return tc.neg ? `-${body}` : sign ? `+${body}` : body;
}
const fmtFrames = (frames, { sign = false } = {}) => `${frames < 0 ? '-' : sign ? '+' : ''}${Math.abs(frames).toLocaleString()}`;
function fmtSec(sec, { sign = false } = {}) {
  const v = Math.abs(sec), s = v.toFixed(3).replace(/\.?0+$/, '');
  return `${sec < 0 ? '-' : sign ? '+' : ''}${s} s`;
}
// 0:01:23.456 style, for people who think in minutes.
function fmtClock(sec) {
  const v = Math.abs(sec), h = Math.floor(v / 3600), m = Math.floor(v / 60) % 60, s = v - h * 3600 - m * 60;
  return `${sec < 0 ? '-' : ''}${h}:${pad(m)}:${s.toFixed(3).padStart(6, '0')}`;
}

// A parsed string → frames, or null if it isn't a timecode.
const strToFrames = (str, r) => { const tc = parseTc(str); return tc ? tcToFrames(tc, r) : null; };
// Normalise typed timecode (65 frames, DF skipped frames, 90 seconds) to the real one.
const normalizeTc = (str, r, opts) => { const n = strToFrames(str, r); return n === null ? null : fmtTc(framesToTc(n, r, opts), r); };

export {
  RATES, rateById, fps, dropPerMin, parseTc, tcToFrames, framesToTc, framesToSeconds, secondsToFrames,
  sameFrames, sameTime, atSpeed, fmtTc, fmtFrames, fmtSec, fmtClock, strToFrames, normalizeTc,
};
