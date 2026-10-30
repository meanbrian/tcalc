// offset.js — Offset tab: the difference between two timecodes. "Was at" → "Now at" gives the sync offset
// in ± frames / seconds / timecode (also In → Out for a duration), and "Apply to" shifts a third timecode by it.
import { S, $, rate, fmtOpts, page, rateBar, bindRateBar, resultCard, bindCopy } from './core.js';
import { tcInput, bindTcInputs, tcFrames, tcDigits } from './field.js';
import { framesToTc, fmtTc, fmtFrames, fmtSec, framesToSeconds } from './timecode.js';
import { addHistory } from './history.js';

const tc = (frames, opts = {}) => fmtTc(framesToTc(frames, rate(), fmtOpts()), rate(), opts);

function renderOffset() {
  const o = S.offset, r = rate();
  const a = o.a ? tcFrames({ dataset: { d: o.a } }) : null, b = o.b ? tcFrames({ dataset: { d: o.b } }) : null, c = o.c ? tcFrames({ dataset: { d: o.c } }) : null;
  const have = a !== null && b !== null, d = have ? b - a : 0;
  const body = `${rateBar()}
    <div class="pair">${tcInput('a', o.a, { label: 'Was at · In' })}${tcInput('b', o.b, { label: 'Now at · Out' })}</div>
    ${have ? resultCard(`${fmtFrames(d, { sign: true })} frames`, [tc(d, { sign: true }), fmtSec(framesToSeconds(d, r), { sign: true })], { label: 'Offset' })
      : '<p class="footnote">The clip sat at 01:34:42, you synced it and it now sits at 01:35:22 — type both and the offset shows here in frames, seconds and timecode at the chosen rate.</p>'}
    <h2 class="section-name">Apply the same offset</h2>
    ${tcInput('c', o.c, { label: 'Another clip at' })}
    ${have && c !== null ? resultCard(tc(c + d), [`${tc(c)} ${d < 0 ? '−' : '+'} ${fmtFrames(Math.abs(d))} fr`], { label: 'Moves to' }) : ''}`;
  const root = page({ title: 'Offset', body });
  bindRateBar(root, renderOffset);
  bindCopy(root);
  bindTcInputs(root, (name, input) => { o[name] = tcDigits(input); update(); });
  if (have) addHistory('offset', `${tc(a)} → ${tc(b)}`, `${fmtFrames(d, { sign: true })} fr (${tc(d, { sign: true })})`);
}

// Redraw without stealing focus: re-render only when the typed field keeps focus afterwards.
function update() {
  const focused = $('.tcin:focus')?.name;
  renderOffset();
  if (focused) { const el = $(`.tcin[name="${focused}"]`); el?.focus(); }
}

export { renderOffset };
