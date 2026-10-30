// calc.js — Calculator tab: a running tape of timecodes added and subtracted. The total shows as timecode,
// frames and real seconds; entries can be typed as timecode, a frame count or seconds.
import { S, $, $$, esc, rate, fmtOpts, page, rateBar, bindRateBar, resultCard, bindCopy, toast } from './core.js';
import { tcInput, numInput, bindTcInputs, tcFrames, tcDigits } from './field.js';
import { framesToTc, fmtTc, fmtFrames, fmtSec, fmtClock, secondsToFrames } from './timecode.js';
import { addHistory } from './history.js';

const total = () => S.calc.tape.reduce((n, e) => n + (e.op === '-' ? -e.frames : e.frames), 0);
const tcOf = (frames) => fmtTc(framesToTc(frames, rate(), fmtOpts()), rate());

function renderCalc() {
  const r = rate(), sum = total(), c = S.calc;
  const entry = c.mode === 'tc' ? tcInput('entry', c.entry, { label: 'Timecode' })
    : numInput('entry', c.entry, { label: c.mode === 'frames' ? 'Frames' : 'Seconds', step: c.mode === 'frames' ? '1' : '0.001' });
  const body = `${rateBar()}
    ${resultCard(tcOf(sum), [`${fmtFrames(sum)} frames`, fmtSec(sum * r.den / r.num), fmtClock(sum * r.den / r.num)], { label: 'Total' })}
    <div class="seg" role="group" aria-label="Entry type">${['tc', 'frames', 'seconds'].map((m) =>
      `<button type="button" data-mode="${m}" aria-pressed="${c.mode === m}">${{ tc: 'Timecode', frames: 'Frames', seconds: 'Seconds' }[m]}</button>`).join('')}</div>
    <div class="entry">${entry}
      <div class="ops"><button type="button" class="btn op" id="sub" aria-label="Subtract">−</button><button type="button" class="btn op primary" id="add" aria-label="Add">+</button></div></div>
    ${c.tape.length ? `<ul class="tape">${c.tape.map((e, i) => `<li><span class="t-op">${e.op}</span><span class="t-tc">${esc(e.label)}</span>
      <span class="t-fr">${fmtFrames(e.frames)} fr</span><button type="button" class="iconbtn" data-del="${i}" aria-label="Remove">✕</button></li>`).join('')}</ul>
      <div class="row end"><button type="button" class="link" id="clear">Clear tape</button></div>`
    : '<p class="footnote">Type a timecode and tap + or −. The total keeps running; tap it to copy.</p>'}`;
  const root = page({ title: 'Calculator', body, gear: true });
  bindRateBar(root, renderCalc);
  bindCopy(root);
  bindTcInputs(root, (name, input) => { c.entry = c.mode === 'tc' ? tcDigits(input) : input.value; });
  $$('.seg button', root).forEach((b) => b.addEventListener('click', () => { c.mode = b.dataset.mode; c.entry = ''; renderCalc(); }));
  $('#add', root).addEventListener('click', () => push('+'));
  $('#sub', root).addEventListener('click', () => push('-'));
  $$('[data-del]', root).forEach((b) => b.addEventListener('click', () => { c.tape.splice(Number(b.dataset.del), 1); renderCalc(); }));
  $('#clear', root)?.addEventListener('click', () => { c.tape = []; renderCalc(); });
  $('.entry input', root)?.addEventListener('keydown', (e) => { if (e.key === 'Enter') push('+'); });
}

// Read the entry at the current rate, add it to the tape, remember it in History.
function push(op) {
  const c = S.calc, r = rate(), input = $('.entry input');
  let frames, label;
  if (c.mode === 'tc') { frames = tcFrames(input); label = frames === null ? '' : tcOf(frames); }
  else if (c.mode === 'frames') { frames = Math.round(Number(input.value)); label = `${fmtFrames(frames)} fr`; }
  else { frames = secondsToFrames(Number(input.value), r); label = `${fmtSec(Number(input.value))}`; }
  if (frames === null || !Number.isFinite(frames) || !input.value) return toast('Enter a value first');
  c.tape.push({ op, frames, label });
  c.entry = '';
  addHistory('calc', c.tape.map((e) => `${e.op} ${e.label}`).join(' '), tcOf(total()));
  renderCalc();
  $('.entry input')?.focus();
}

export { renderCalc };
