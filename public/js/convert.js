// convert.js — Convert tab (same as the iPhone app): a timecode (or frame count / seconds) at the From rate (the
// shared dial) shown at the To rate (Convert's own, prefs.to), keeping the same frames (conform) or the same real
// time; ⇄ swaps the rates and carries the answer over. Folded below: a speed change and the clip at every rate.
import { S, $, $$, esc, rate, toRate, fmtOpts, savePrefs, page, resultCard, bindCopy } from './core.js';
import { dial, bindDial } from './dial.js';
import { fold, bindFolds, seg, bindSeg, modeKey } from './ui.js';
import { tcInput, numInput, bindTcInputs, tcFrames, tcDigits } from './field.js';
import { RATES, framesToTc, fmtTc, fmtFrames, fmtSec, fmtClock, framesToSeconds, secondsToFrames, sameTime, atSpeed } from './timecode.js';
import { addHistory } from './history.js';

const tcAt = (frames, r) => fmtTc(framesToTc(frames, r, fmtOpts()), r);

function entryFrames() {
  const v = S.convert, r = rate();
  let n = null;
  if (v.mode === 'tc' && v.tc) n = tcFrames({ dataset: { d: v.tc } });
  if (v.mode === 'frames' && v.tc !== '') n = Math.round(Number(v.tc));
  if (v.mode === 'seconds' && v.tc !== '') n = secondsToFrames(Number(v.tc), r);
  return Number.isFinite(n) ? n : null;
}
const converted = (n) => (S.convert.how === 'time' ? sameTime(n, rate(), toRate()) : n);

function renderConvert() {
  const v = S.convert, r = rate(), to = toRate(), n = entryFrames();
  const entry = v.mode === 'tc' ? tcInput('tc', v.tc) : numInput('tc', v.tc, { placeholder: v.mode === 'frames' ? 'Frames' : 'Seconds' });
  const toOpts = [...RATES.map((x) => [x.id, x.label]), ['custom', `Custom (${S.prefs.custom})`]];
  let result = '';
  if (n !== null) {
    const m = converted(n), s = framesToSeconds(m, to), sp = atSpeed(n, v.speed / 100);
    result = `${resultCard(tcAt(m, to), [`${fmtFrames(m)} fr`, fmtSec(s), fmtClock(s)], { label: `At ${to.label}`, key: 'convert' })}
      <p class="footnote center">At ${esc(r.label)}: ${fmtFrames(n)} fr · ${fmtSec(framesToSeconds(n, r))} · ${v.how === 'time' ? 'real length kept' : 'every frame kept'}</p>
      ${fold('convert-speed', 'Speed change', `${numInput('speed', v.speed, { label: 'Played at %', min: 1 })}
        ${resultCard(tcAt(sp, r), [`${fmtFrames(sp)} fr`, fmtSec(framesToSeconds(sp, r))], { label: 'On the timeline', wide: true })}`)}
      ${fold('convert-all', 'All frame rates', `<ul class="rows">${RATES.filter((x) => x.id !== r.id).map((x) => {
        const k = v.how === 'time' ? sameTime(n, r, x) : n;
        return `<li data-copy="${tcAt(k, x)}" role="button" tabindex="0"><span>${x.label}</span><b>${tcAt(k, x)}</b></li>`; }).join('')}</ul>`)}`;
  }
  const body = `${dial()}
    <div class="entryrow">${modeKey(v.mode)}${entry}</div>
    <div class="ratepair">
      <div class="rp-side"><small>FROM</small><b>${esc(r.label)}</b></div>
      <button type="button" class="swap" aria-label="Swap frame rates">⇄</button>
      <label class="rp-side to"><small>TO ⌃⌄</small><b>${esc(to.label)}</b>
        <select name="to" aria-label="To frame rate">${toOpts.map(([id, l]) => `<option value="${id}"${id === S.prefs.to ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
    </div>
    ${seg('how', [['frames', 'Same frames'], ['time', 'Same time']], v.how)}
    ${result}`;
  const root = page({ title: 'Convert', body, gear: true });
  bindDial(root, renderConvert);
  bindCopy(root);
  bindFolds(root);
  bindTcInputs(root, (name, input) => {
    if (name === 'tc') v.tc = v.mode === 'tc' ? tcDigits(input) : input.value;
    if (name === 'speed') v.speed = Math.max(1, Number(input.value) || 1);
    update(name);
  });
  $('select[name="mode"]', root).addEventListener('change', (e) => { v.mode = e.target.value; v.tc = ''; renderConvert(); });
  $('select[name="to"]', root).addEventListener('change', (e) => { S.prefs.to = e.target.value; savePrefs(); renderConvert(); });
  $('.swap', root).addEventListener('click', swap);
  bindSeg(root, 'how', (how) => { v.how = how; renderConvert(); });
  if (n !== null) addHistory('convert', `${tcAt(n, r)} @ ${r.label} → ${to.label}`, tcAt(converted(n), to));
}

// To becomes From (the dial moves) and the answer becomes the new entry.
function swap() {
  const v = S.convert, n = entryFrames(), m = n === null ? null : converted(n);
  [S.prefs.rate, S.prefs.to] = [S.prefs.to, S.prefs.rate];
  savePrefs();
  if (m !== null && v.mode === 'tc') v.tc = tcAt(m, rate()).replace(/\D/g, '').replace(/^0+/, '');
  if (m !== null && v.mode === 'frames') v.tc = String(m);
  renderConvert();
}

function update(name) {
  const el = $(`[name="${name}"]`), pos = el?.selectionStart, top = scrollY;
  renderConvert();
  const again = $(`[name="${name}"]`);
  if (again) { again.focus({ preventScroll: true }); if (again.classList.contains('numin') && pos) try { again.setSelectionRange(pos, pos); } catch {} }
  scrollTo(0, top);
}

export { renderConvert };
