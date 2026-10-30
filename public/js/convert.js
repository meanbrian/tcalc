// convert.js — Convert tab: one timecode (or frame count / seconds) shown as frames, seconds and a clock, then
// at every other frame rate two ways: same frame count (re-timed / conformed) or same real time. Plus speed changes.
import { S, $, $$, esc, rate, fmtOpts, page, rateBar, bindRateBar, resultCard, bindCopy } from './core.js';
import { tcInput, numInput, bindTcInputs, tcFrames, tcDigits } from './field.js';
import { RATES, framesToTc, fmtTc, fmtFrames, fmtSec, fmtClock, framesToSeconds, secondsToFrames, sameTime, atSpeed } from './timecode.js';
import { addHistory } from './history.js';

const tcAt = (frames, r) => fmtTc(framesToTc(frames, r, fmtOpts()), r);

function renderConvert() {
  const v = S.convert, r = rate();
  let frames = null;
  if (v.mode === 'tc' && v.tc) frames = tcFrames({ dataset: { d: v.tc } });
  if (v.mode === 'frames' && v.tc !== '') frames = Math.round(Number(v.tc));
  if (v.mode === 'seconds' && v.tc !== '') frames = secondsToFrames(Number(v.tc), r);
  if (!Number.isFinite(frames)) frames = null;
  const sec = frames === null ? 0 : framesToSeconds(frames, r);
  const entry = v.mode === 'tc' ? tcInput('tc', v.tc, { label: `Timecode at ${r.label}` })
    : numInput('tc', v.tc, { label: v.mode === 'frames' ? 'Frames' : 'Seconds', step: v.mode === 'frames' ? '1' : '0.001' });
  const others = RATES.filter((x) => x.id !== r.id);
  const body = `${rateBar()}
    <div class="seg" role="group" aria-label="Entry type">${['tc', 'frames', 'seconds'].map((m) =>
      `<button type="button" data-mode="${m}" aria-pressed="${v.mode === m}">${{ tc: 'Timecode', frames: 'Frames', seconds: 'Seconds' }[m]}</button>`).join('')}</div>
    ${entry}
    ${frames === null ? '<p class="footnote">Type a value and every conversion fills in below.</p>' : `
    ${resultCard(tcAt(frames, r), [`${fmtFrames(frames)} frames`, fmtSec(sec), fmtClock(sec)], { label: `At ${r.label}` })}
    <h2 class="section-name">Speed change</h2>
    <div class="speedrow">${numInput('speed', v.speed, { label: 'Played at %', step: '1', min: 1 })}
      ${resultCard(tcAt(atSpeed(frames, v.speed / 100), r), [`${fmtFrames(atSpeed(frames, v.speed / 100))} frames on the timeline`, fmtSec(framesToSeconds(atSpeed(frames, v.speed / 100), r))], { label: `${esc(v.speed)}% speed` })}</div>
    <h2 class="section-name">At other frame rates</h2>
    <div class="seg" role="group" aria-label="Conversion"><button type="button" data-how="frames" aria-pressed="${v.how !== 'time'}">Same frames</button><button type="button" data-how="time" aria-pressed="${v.how === 'time'}">Same time</button></div>
    <p class="footnote">${v.how === 'time' ? 'The clip keeps its real length; frames are re-counted at the new rate.' : 'Every frame is kept (conform / re-time); the clip gets longer or shorter.'}</p>
    <ul class="list">${others.map((x) => { const n = v.how === 'time' ? sameTime(frames, r, x) : frames; return `<li class="conv" data-copy="${tcAt(n, x)}" role="button" tabindex="0">
      <span class="c-rate">${x.label}</span><span class="c-tc">${tcAt(n, x)}</span><span class="c-sub">${fmtFrames(n)} fr · ${fmtSec(framesToSeconds(n, x))}</span></li>`; }).join('')}</ul>`}`;
  const root = page({ title: 'Convert', body });
  bindRateBar(root, renderConvert);
  bindCopy(root);
  bindTcInputs(root, (name, input) => {
    if (name === 'tc') v.tc = v.mode === 'tc' ? tcDigits(input) : input.value;
    if (name === 'speed') v.speed = Math.max(1, Number(input.value) || 1);
    update(name);
  });
  $$('.seg button[data-mode]', root).forEach((b) => b.addEventListener('click', () => { v.mode = b.dataset.mode; v.tc = ''; renderConvert(); }));
  $$('.seg button[data-how]', root).forEach((b) => b.addEventListener('click', () => { v.how = b.dataset.how; renderConvert(); }));
  if (frames !== null) addHistory('convert', `${tcAt(frames, r)} @ ${r.label}`, `${fmtFrames(frames)} fr · ${fmtSec(sec)}`);
}

function update(name) {
  const el = $(`[name="${name}"]`), pos = el?.selectionStart;
  renderConvert();
  const again = $(`[name="${name}"]`);
  if (again) { again.focus(); if (again.classList.contains('numin') && pos) try { again.setSelectionRange(pos, pos); } catch {} }
}

export { renderConvert };
