// time.js — Time tab (no frame rate): a decimal in any unit broken down and totalled, between two dates,
// since / until a date (live), date ± duration, and unix epoch ↔ date. Maths in timespan.js.
import { S, $, $$, esc, page, resultCard, bindCopy } from './core.js';
import { numInput } from './field.js';
import { UNITS, unitById, toMs, breakdown, calendarDiff, addToDate, epochToDate, fmtParts, fmtNum, fmtHms, fmtDate, toLocalInput, parseLocalInput } from './timespan.js';
import { addHistory } from './history.js';

let ticker = null; // the Since / Until clock

const unitPick = (name, cur) => `<select name="${name}" class="unitsel">${UNITS.map((u) => `<option value="${u.id}"${u.id === cur ? ' selected' : ''}>${u.label}</option>`).join('')}</select>`;
const dateInput = (name, value, label) => `<label class="field"><span>${esc(label)}</span><input type="datetime-local" name="${name}" value="${esc(value)}" step="1"></label>`;
// every unit as a total, for a copyable list
const totalsList = (ms) => `<ul class="list">${[...UNITS].reverse().map((u) => `<li class="conv" data-copy="${fmtNum(ms / u.ms, 6)}" role="button" tabindex="0">
  <span class="c-rate">${u.label}</span><span class="c-tc">${fmtNum(ms / u.ms, 6)}</span></li>`).join('')}</ul>`;

function renderTime() {
  const t = S.time;
  clearInterval(ticker);
  // 1 · convert a value
  const val = Number(t.value), vMs = t.value !== '' && Number.isFinite(val) ? toMs(val, t.unit) : null;
  // 2 · between dates
  const a = parseLocalInput(t.a), b = parseLocalInput(t.b), diff = a && b ? calendarDiff(a, b) : null;
  // 4 · date ± duration
  const base = parseLocalInput(t.base), plus = Number(t.plus);
  const moved = base && t.plus !== '' && Number.isFinite(plus) ? addToDate(base, t.sign === '-' ? -plus : plus, t.plusUnit) : null;
  // 5 · epoch
  const ep = Number(t.epoch), epDate = t.epoch !== '' && Number.isFinite(ep) ? epochToDate(ep) : null;

  const body = `
    <h2 class="section-name">Convert a value</h2>
    <div class="unitrow">${numInput('value', t.value, { label: 'Amount', step: '0.01' })}<label class="field"><span>Unit</span>${unitPick('unit', t.unit)}</label></div>
    ${vMs === null ? '<p class="footnote">1.23 years, 1.97 hours, 99282 days — type a decimal and pick its unit.</p>'
      : `${resultCard(fmtParts(breakdown(vMs)), [fmtHms(vMs)], { label: `${esc(t.value)} ${unitById(t.unit).label.toLowerCase()} is`, wide: true })}${totalsList(vMs)}`}

    <h2 class="section-name">Between two dates</h2>
    ${dateInput('a', t.a, 'From')}${dateInput('b', t.b, 'To')}
    ${diff ? `${resultCard(fmtParts(diff), [`${fmtNum(diff.totalMs / 86400000, 2)} days`, `${fmtNum(diff.months)} months and ${diff.d} days`, fmtHms(diff.totalMs)], { label: diff.neg ? 'Earlier by' : 'Apart', wide: true })}${totalsList(diff.totalMs)}` : ''}

    <h2 class="section-name">Since · Until</h2>
    ${dateInput('since', t.since, 'Date')}
    <div id="live"></div>

    <h2 class="section-name">Date ± duration</h2>
    ${dateInput('base', t.base, 'Start')}
    <div class="unitrow three"><div class="seg sign" role="group"><button type="button" data-sign="+" aria-pressed="${t.sign !== '-'}">+</button><button type="button" data-sign="-" aria-pressed="${t.sign === '-'}">−</button></div>
      ${numInput('plus', t.plus, { label: 'Amount', step: '0.01' })}<label class="field"><span>Unit</span>${unitPick('plusUnit', t.plusUnit)}</label></div>
    ${moved ? resultCard(fmtDate(moved), [moved.toLocaleDateString([], { weekday: 'long' }), `${fmtNum(Math.abs(moved - base) / 86400000, 2)} days ${moved < base ? 'earlier' : 'later'}`], { label: 'Lands on', wide: true }) : ''}

    <h2 class="section-name">Unix epoch</h2>
    ${numInput('epoch', t.epoch, { label: 'Seconds or milliseconds since 1970', step: '1' })}
    ${epDate ? resultCard(fmtDate(epDate), [epDate.toISOString(), `${epDate.getTime() / 1000} s · ${epDate.getTime()} ms`], { label: 'Local time', wide: true }) : ''}
    <div class="row end"><button type="button" class="btn small" id="now">Now</button></div>`;
  const root = page({ title: 'Time', body, gear: true });
  bindCopy(root);
  $$('.numin', root).forEach((i) => i.addEventListener('input', () => { t[i.name] = i.value; update(i.name); }));
  $$('input[type="datetime-local"]', root).forEach((i) => i.addEventListener('change', () => { t[i.name] = i.value; update(i.name); }));
  $$('.unitsel', root).forEach((s) => s.addEventListener('change', () => { t[s.name] = s.value; update(s.name); }));
  $$('.sign button', root).forEach((b) => b.addEventListener('click', () => { t.sign = b.dataset.sign; renderTime(); }));
  $('#now', root).addEventListener('click', () => { t.epoch = String(Math.floor(Date.now() / 1000)); renderTime(); });
  startLive();
  if (vMs !== null) addHistory('time', `${t.value} ${unitById(t.unit).label.toLowerCase()}`, fmtParts(breakdown(vMs)));
  if (diff) addHistory('time', `${fmtDate(a)} → ${fmtDate(b)}`, fmtParts(diff));
}

// Since / Until: redraws its own card every second without touching the rest of the page.
function startLive() {
  const since = parseLocalInput(S.time.since), box = $('#live');
  if (!since || !box) return;
  const draw = () => {
    const d = calendarDiff(since, new Date()), future = d.neg;
    box.innerHTML = resultCard(fmtParts(d, { to: 's' }), [`${fmtNum(d.totalMs / 86400000, 2)} days`, `${fmtNum(d.totalMs / 1000, 0)} seconds`, fmtHms(d.totalMs)], { label: future ? 'Until' : 'Since', wide: true });
    bindCopy(box);
  };
  draw();
  ticker = setInterval(draw, 1000);
}

function update(name) {
  const el = $(`[name="${name}"]`), pos = el?.selectionStart, top = scrollY;
  renderTime();
  const again = $(`[name="${name}"]`);
  if (!again) return;
  again.focus({ preventScroll: true });
  if (again.classList.contains('numin') && pos != null) try { again.setSelectionRange(pos, pos); } catch {}
  scrollTo(0, top);
}

export { renderTime };
