// calc.js — Calc tab, worked like Apple's Calculator (same as the iPhone app): the display on top (the tape in
// small lines, the entry or total big, digits roll), the keypad below. 10 − 3 = works as on any calculator: an
// operator adds the entry with the operator before it. Keys: digits, . , Backspace, + − , Enter or =, Esc.
import { S, $, esc, rate, fmtOpts, page, rollHtml, copyText, toast } from './core.js';
import { dial, bindDial } from './dial.js';
import { modeKey } from './ui.js';
import { format } from './field.js';
import { framesToTc, fmtTc, fmtFrames, fmtSec, secondsToFrames, strToFrames } from './timecode.js';
import { addHistory } from './history.js';

const total = () => S.calc.tape.reduce((n, e) => n + (e.op === '-' ? -e.frames : e.frames), 0);
const tcOf = (frames) => fmtTc(framesToTc(frames, rate(), fmtOpts()), rate());
const tapeText = () => S.calc.tape.map((e) => `${e.op} ${e.label}`).join(' ');

function renderCalc() {
  const c = S.calc;
  const key = (k, cls = 'dg', label = k, aria = k) => `<button type="button" class="key ${cls}" data-k="${esc(k)}" aria-label="${esc(aria)}">${label}</button>`;
  const body = `${dial()}
    <section class="display">
      <div class="d-tape" id="tape"></div>
      <div class="d-sub" id="sub"></div>
      <div class="d-big" id="big" role="button" tabindex="0" title="Copy"></div>
    </section>
    <div class="keys">
      ${key('AC', 'fn', 'AC', 'All clear')}${modeKey(c.mode, 'key fn modek')}${key('⌫', 'fn', '⌫', 'Delete')}${key('copy', 'fn', '⧉', 'Copy total')}
      ${key('7')}${key('8')}${key('9')}${key('−', 'op', '−', 'Subtract')}
      ${key('4')}${key('5')}${key('6')}${key('+', 'op', '+', 'Add')}
      ${key('1')}${key('2')}${key('3')}${key('=', 'op eq', '=', 'Equals')}
      ${key('0', 'dg zero')}${key('x', 'dg', '00')}
    </div>`;
  const root = page({ title: 'TCalc', body, gear: true, cls: 'calcpage' });
  bindDial(root, renderCalc);
  root.querySelector('.keys').addEventListener('click', (e) => { const b = e.target.closest('[data-k]'); if (b) press(b.dataset.k); });
  $('select[name="mode"]', root).addEventListener('change', (e) => { c.mode = e.target.value; c.entry = ''; renderCalc(); });
  const big = $('#big', root);
  big.addEventListener('click', copyTotal);
  big.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); copyTotal(); } });
  draw();
}

// ---------- display ----------
function bigText() {
  const c = S.calc;
  if (!c.entry) return tcOf(total());
  if (c.mode === 'tc') return format(c.entry);
  if (c.mode === 'frames') return `${fmtFrames(Number(c.entry))} fr`;
  return `${c.entry} s`;
}
function draw() {
  const c = S.calc, sum = total(), r = rate();
  const tape = $('#tape'), sub = $('#sub'), big = $('#big');
  if (!big) return;
  tape.innerHTML = c.tape.map((e, i) => `<div class="d-line"><span>${e.op === '-' ? '−' : '+'}  ${esc(e.label)}</span>
    <button type="button" class="d-del" data-del="${i}" aria-label="Remove ${esc(e.label)}">✕</button></div>`).join('');
  tape.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => { c.tape.splice(Number(b.dataset.del), 1); draw(); }));
  tape.scrollTop = tape.scrollHeight;
  sub.textContent = c.entry || c.pending ? `${tcOf(sum)}  ${c.pending === '-' ? '−' : '+'}` : `${fmtFrames(sum)} fr  ·  ${fmtSec(sum * r.den / r.num)}`;
  const text = bigText();
  big.innerHTML = rollHtml('calc', text);
  big.setAttribute('aria-label', `${c.entry ? 'Entry' : 'Total'} ${text}`);
  const ac = document.querySelector('[data-k="AC"]');
  if (ac) ac.textContent = c.entry ? 'C' : 'AC';
  const x = document.querySelector('[data-k="x"]');
  if (x) x.textContent = c.mode === 'seconds' ? '.' : '00';
}

// ---------- keys ----------
function press(k) {
  const c = S.calc;
  navigator.vibrate?.(3);
  if (k === 'AC') { if (c.entry) c.entry = ''; else { c.tape = []; c.pending = null; c.finished = false; } }
  else if (k === '⌫') c.entry = c.entry.slice(0, -1);
  else if (k === 'copy') return copyTotal();
  else if (k === '+' || k === '−') { commit(); c.pending = k === '−' ? '-' : '+'; c.finished = false; }
  else if (k === '=') {
    commit(); c.pending = null; c.finished = true;
    if (c.tape.length) addHistory('calc', tapeText(), tcOf(total()));
  } else if (k === 'x' && c.mode === 'seconds') {
    fresh();
    if (!c.entry.includes('.')) c.entry = c.entry ? `${c.entry}.` : '0.';
  } else { fresh(); type(k === 'x' ? '00' : k); }
  draw();
}

// After =, a digit starts a new sum (an operator carries on with the total).
function fresh() { const c = S.calc; if (c.finished && !c.entry) { c.tape = []; c.finished = false; } }

function type(d) {
  const c = S.calc;
  let next = c.entry + d;
  if (c.mode === 'seconds') { if (/^0\d/.test(next)) next = next.replace(/^0+(?=\d)/, ''); if (next.length > 10) return; }
  else { next = next.replace(/^0+/, ''); if (next.length > (c.mode === 'tc' ? 8 : 9)) return; }
  c.entry = next;
}

// Add the entry to the tape with the pending operator.
function commit() {
  const c = S.calc, r = rate();
  if (!c.entry) return;
  let frames = null, label = '';
  if (c.mode === 'tc') { frames = strToFrames(c.entry, r); if (frames !== null) label = tcOf(frames); }
  else if (c.mode === 'frames') { frames = Math.round(Number(c.entry)); label = `${fmtFrames(frames)} fr`; }
  else { const v = Number(c.entry); frames = secondsToFrames(v, r); label = fmtSec(v); }
  c.entry = '';
  if (frames === null || !Number.isFinite(frames)) return toast('Not a valid entry');
  c.tape.push({ op: c.pending || '+', frames, label });
}

function copyTotal() {
  if (S.calc.tape.length) addHistory('calc', tapeText(), tcOf(total()));
  copyText(tcOf(total()));
}

// A real keyboard works too (on Calc only, and not while typing in a field).
addEventListener('keydown', (e) => {
  if (!document.querySelector('main.calcpage') || e.target.matches('input, textarea, select') || e.metaKey || e.ctrlKey || e.altKey) return;
  const map = { Backspace: '⌫', Delete: '⌫', Escape: 'AC', Enter: '=', '=': '=', '+': '+', '-': '−', '.': 'x', ',': 'x' };
  const k = /^\d$/.test(e.key) ? e.key : map[e.key];
  if (!k) return;
  if (k === 'x' && S.calc.mode !== 'seconds') return;
  e.preventDefault();
  press(k);
});

export { renderCalc };
