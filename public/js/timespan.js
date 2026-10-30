// timespan.js — pure time maths, no frame rates and no DOM: units ↔ milliseconds, a span broken into
// years / months / days / h / m / s / ms, calendar-exact differences between two dates, date ± duration, epoch.

// ---------- units ----------
const DAY = 86400000;
const UNITS = [
  { id: 'ms', label: 'Milliseconds', short: 'ms', ms: 1 },
  { id: 's', label: 'Seconds', short: 's', ms: 1000 },
  { id: 'min', label: 'Minutes', short: 'min', ms: 60000 },
  { id: 'h', label: 'Hours', short: 'h', ms: 3600000 },
  { id: 'd', label: 'Days', short: 'd', ms: DAY },
  { id: 'w', label: 'Weeks', short: 'wk', ms: 7 * DAY },
  { id: 'mo', label: 'Months', short: 'mo', ms: 30.436875 * DAY }, // average Gregorian month
  { id: 'y', label: 'Years', short: 'yr', ms: 365.2425 * DAY }, // average Gregorian year
];
const unitById = (id) => UNITS.find((u) => u.id === id) || UNITS[1];
const toMs = (value, unitId) => value * unitById(unitId).ms;

// A millisecond span → { y, mo, d, h, m, s, ms } using average month and year lengths (for decimals like 1.23 years).
function breakdown(totalMs) {
  let left = Math.abs(Math.round(totalMs));
  const out = { neg: totalMs < 0 };
  for (const [k, u] of [['y', 'y'], ['mo', 'mo'], ['d', 'd'], ['h', 'h'], ['m', 'min'], ['s', 's']]) {
    const size = unitById(u).ms;
    out[k] = Math.floor(left / size);
    left -= out[k] * size;
  }
  out.ms = Math.round(left);
  return out;
}

// ---------- calendar-exact difference ----------
// a, b: Date. Whole months are stepped on the calendar (Jan 31 + 1 month = Feb 28/29, like a calendar app), then
// the rest is days / h / m / s / ms — the way people say "2 years, 3 months and 5 days".
function calendarDiff(a, b) {
  const neg = b < a;
  const [from, to] = neg ? [b, a] : [a, b];
  let months = 0, cursor = from;
  // jump by years first so a century-wide range stays cheap, then by months
  while (addMonthsClamped(from, months + 12) <= to) months += 12;
  while (addMonthsClamped(from, months + 1) <= to) months += 1;
  cursor = addMonthsClamped(from, months);
  const rest = to - cursor;
  return {
    neg, y: Math.floor(months / 12), mo: months % 12, d: Math.floor(rest / DAY),
    h: Math.floor(rest / 3600000) % 24, m: Math.floor(rest / 60000) % 60, s: Math.floor(rest / 1000) % 60, ms: rest % 1000,
    months, totalMs: to - from,
  };
}
const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
// date + n months, the day clamped to the end of the target month (Jan 31 + 1 → Feb 28)
function addMonthsClamped(date, n) {
  const d = new Date(date), day = d.getDate();
  d.setDate(1); d.setMonth(d.getMonth() + n);
  d.setDate(Math.min(day, daysInMonth(d.getFullYear(), d.getMonth())));
  return d;
}

// ---------- date ± duration ----------
function addToDate(date, value, unitId) {
  const d = new Date(date);
  if (unitId === 'mo' || unitId === 'y') {
    // whole months land on the calendar; any fraction is added as average-month time
    const months = value * (unitId === 'y' ? 12 : 1), whole = Math.trunc(months);
    return new Date(addMonthsClamped(d, whole).getTime() + (months - whole) * unitById('mo').ms);
  }
  if (unitId === 'd' || unitId === 'w') {
    // whole days step the calendar so the wall-clock time survives a DST change; a fraction is added as hours
    const days = value * (unitId === 'w' ? 7 : 1), whole = Math.trunc(days);
    d.setDate(d.getDate() + whole);
    return new Date(d.getTime() + (days - whole) * DAY);
  }
  return new Date(d.getTime() + toMs(value, unitId));
}

// ---------- epoch ----------
// A number typed by a person: seconds if it looks like seconds, milliseconds if it's that big.
const epochToDate = (n) => new Date(Math.abs(n) < 1e11 ? n * 1000 : n);

// ---------- formatting ----------
const plural = (n, w) => `${fmtNum(n)} ${w}${n === 1 ? '' : 's'}`;
const WORDS = { y: 'year', mo: 'month', d: 'day', h: 'hour', m: 'minute', s: 'second', ms: 'millisecond' };
// "1 year 2 months 23 days 4 hours" — the biggest parts first, zeros skipped, at most `parts` pieces.
function fmtParts(b, { parts = 7, from = 'y', to = 'ms' } = {}) {
  const order = ['y', 'mo', 'd', 'h', 'm', 's', 'ms'];
  const out = [];
  for (const k of order.slice(order.indexOf(from), order.indexOf(to) + 1)) if (b[k]) out.push(plural(b[k], WORDS[k]));
  return (b.neg ? '-' : '') + (out.slice(0, parts).join(' ') || '0 seconds');
}
function fmtNum(n, max = 3) {
  if (!Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  const digits = abs >= 1000 ? 0 : abs >= 100 ? 1 : abs >= 10 ? 2 : max;
  return n.toLocaleString(undefined, { maximumFractionDigits: digits });
}
// hh:mm:ss.mmm from a millisecond span (days folded into hours)
function fmtHms(totalMs) {
  const v = Math.abs(totalMs), h = Math.floor(v / 3600000), m = Math.floor(v / 60000) % 60, s = Math.floor(v / 1000) % 60, ms = Math.round(v % 1000);
  return `${totalMs < 0 ? '-' : ''}${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}
const fmtDate = (d) => d.toLocaleString([], { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
// value for an <input type="datetime-local"> in local time
function toLocalInput(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
const parseLocalInput = (s) => { const d = s ? new Date(s) : null; return d && !Number.isNaN(d.getTime()) ? d : null; };

export { UNITS, unitById, toMs, breakdown, calendarDiff, daysInMonth, addMonthsClamped, addToDate, epochToDate, fmtParts, fmtNum, fmtHms, fmtDate, toLocalInput, parseLocalInput };
