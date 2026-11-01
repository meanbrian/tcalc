// offset.js — Offset tab: the difference between two timecodes. From → To gives the sync offset (or a duration)
// in ± frames, timecode and seconds; "Apply to another clip" (folded) shifts a third timecode by it.
import { S, $, rate, fmtOpts, page, resultCard, bindCopy } from './core.js';
import { dial, bindDial } from './dial.js';
import { fold, bindFolds } from './ui.js';
import { tcInput, bindTcInputs, tcFrames, tcDigits } from './field.js';
import { framesToTc, fmtTc, fmtFrames, fmtSec, framesToSeconds } from './timecode.js';
import { addHistory } from './history.js';

const tc = (frames, opts = {}) => fmtTc(framesToTc(frames, rate(), fmtOpts()), rate(), opts);
const fr = (digits) => (digits ? tcFrames({ dataset: { d: digits } }) : null);

function renderOffset() {
  const o = S.offset, r = rate();
  const a = fr(o.a), b = fr(o.b), c = fr(o.c);
  const have = a !== null && b !== null, d = have ? b - a : 0;
  const body = `${dial()}
    <div class="pair">${tcInput('a', o.a, { label: 'From' })}${tcInput('b', o.b, { label: 'To' })}</div>
    ${have ? `${resultCard(`${fmtFrames(d, { sign: true })} fr`, [tc(d, { sign: true }), fmtSec(framesToSeconds(d, r), { sign: true })], { label: 'Offset' })}
      ${fold('offset-apply', 'Apply to another clip', `${tcInput('c', o.c, { label: 'Clip at' })}
        ${c !== null ? resultCard(tc(c + d), [], { label: 'Moves to', wide: true }) : ''}`)}`
      : '<p class="footnote center">Where it was → where it is now.</p>'}`;
  const root = page({ title: 'Offset', body, gear: true });
  bindDial(root, renderOffset);
  bindCopy(root);
  bindFolds(root);
  bindTcInputs(root, (name, input) => { o[name] = tcDigits(input); update(); });
  if (have) addHistory('offset', `${tc(a)} → ${tc(b)}`, `${fmtFrames(d, { sign: true })} fr (${tc(d, { sign: true })})`);
}

// Redraw without losing the field being typed in.
function update() {
  const focused = $('.tcin:focus')?.name, top = scrollY;
  renderOffset();
  if (focused) $(`.tcin[name="${focused}"]`)?.focus({ preventScroll: true });
  scrollTo(0, top);
}

export { renderOffset };
