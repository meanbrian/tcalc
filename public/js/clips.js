// clips.js — Clips tab: three editor helpers. Fit: how many clips of one length fit a total. Runtime: paste a
// list of durations, get the total. Handles: in/out plus handle frames gives the padded in/out and length.
import { S, $, $$, esc, rate, fmtOpts, page, rateBar, bindRateBar, resultCard, bindCopy } from './core.js';
import { tcInput, numInput, bindTcInputs, tcFrames, tcDigits } from './field.js';
import { framesToTc, fmtTc, fmtFrames, fmtSec, fmtClock, framesToSeconds, strToFrames } from './timecode.js';
import { addHistory } from './history.js';

const tc = (frames) => fmtTc(framesToTc(frames, rate(), fmtOpts()), rate());
const fr = (digits) => (digits ? tcFrames({ dataset: { d: digits } }) : null);

function renderClips() {
  const c = S.clips, r = rate();
  // Fit
  const clip = fr(c.clip), total = fr(c.total);
  const fit = clip > 0 && total !== null ? { n: Math.floor(total / clip), rest: total % clip } : null;
  // Runtime list: one duration per line (blank lines and labels after a tab/space are ignored)
  const lines = c.list.split(/\n/).map((l) => l.trim()).filter(Boolean);
  const parsed = lines.map((l) => strToFrames(l.split(/[\s\t]+/)[0], r)).filter((n) => n !== null);
  const sum = parsed.reduce((a, b) => a + b, 0);
  // Handles
  const inF = fr(c.inTc), outF = fr(c.outTc), h = Math.max(0, Math.round(Number(c.handle) || 0));
  const hand = inF !== null && outF !== null ? { in: inF - h, out: outF + h, len: outF - inF, padded: outF - inF + 2 * h } : null;

  const body = `${rateBar()}
    <h2 class="section-name">How many fit</h2>
    <div class="pair">${tcInput('clip', c.clip, { label: 'Clip length' })}${tcInput('total', c.total, { label: 'Total length' })}</div>
    ${fit ? resultCard(`${fit.n} clip${fit.n === 1 ? '' : 's'}`, [`${tc(fit.rest)} left over (${fmtFrames(fit.rest)} fr)`, `${fit.n} × ${tc(clip)}`], { label: 'Fit' }) : ''}
    <h2 class="section-name">Total runtime</h2>
    <label class="field"><span>One duration per line</span><textarea name="list" rows="5" placeholder="00:01:23:05&#10;00:00:42:12&#10;2:30:00">${esc(c.list)}</textarea></label>
    ${parsed.length ? resultCard(tc(sum), [`${parsed.length} clip${parsed.length === 1 ? '' : 's'} · ${fmtFrames(sum)} fr`, fmtClock(framesToSeconds(sum, r)), `average ${tc(Math.round(sum / parsed.length))}`], { label: 'Runtime' }) : ''}
    <h2 class="section-name">Handles</h2>
    <div class="pair">${tcInput('inTc', c.inTc, { label: 'In' })}${tcInput('outTc', c.outTc, { label: 'Out' })}</div>
    ${numInput('handle', c.handle, { label: 'Handle frames each side', min: 0 })}
    ${hand ? resultCard(`${tc(hand.in)} – ${tc(hand.out)}`, [`${tc(hand.padded)} with handles (${fmtFrames(hand.padded)} fr)`, `${tc(hand.len)} without (${fmtFrames(hand.len)} fr)`, fmtSec(framesToSeconds(hand.padded, r))], { label: 'With handles', wide: true }) : ''}`;
  const root = page({ title: 'Clips', body, gear: true });
  bindRateBar(root, renderClips);
  bindCopy(root);
  bindTcInputs(root, (name, input) => { c[name] = input.classList.contains('tcin') ? tcDigits(input) : input.value; update(name); });
  $('textarea[name="list"]', root).addEventListener('input', (e) => { c.list = e.target.value; update('list'); });
  if (fit) addHistory('clips', `${tc(total)} ÷ ${tc(clip)}`, `${fit.n} clips, ${tc(fit.rest)} over`);
  if (parsed.length > 1) addHistory('clips', `${parsed.length} clips`, tc(sum));
}

function update(name) {
  const el = $(`[name="${name}"]`), pos = el?.selectionStart, top = scrollY;
  renderClips();
  const again = $(`[name="${name}"]`);
  if (!again) return;
  again.focus({ preventScroll: true });
  if (!again.classList.contains('tcin') && pos != null) try { again.setSelectionRange(pos, pos); } catch {}
  scrollTo(0, top);
}

export { renderClips };
