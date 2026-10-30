// field.js — the timecode entry field. Type digits and they shift in from the right like a deck's keypad
// (1 → 00:00:00:01, 12305 → 00:01:23:05); pasted "01:23:05:12" works too. Also a plain number field.
import { esc, rate } from './core.js';
import { strToFrames } from './timecode.js';

// value: digits or a formatted timecode. Keeps the raw digits in data-d so re-renders don't lose typing.
function tcInput(name, value = '', { label = '', placeholder = '00:00:00:00' } = {}) {
  const digits = toDigits(value);
  return `<label class="field"><span>${esc(label)}</span>
    <input class="tcin" type="text" inputmode="numeric" autocomplete="off" spellcheck="false" enterkeyhint="done"
      name="${esc(name)}" data-d="${digits}" value="${format(digits)}" placeholder="${esc(placeholder)}"></label>`;
}

function numInput(name, value = '', { label = '', placeholder = '0', step = '1', min = null } = {}) {
  return `<label class="field"><span>${esc(label)}</span>
    <input class="numin" type="text" inputmode="decimal" autocomplete="off" name="${esc(name)}" value="${esc(value)}" placeholder="${esc(placeholder)}" data-step="${step}"${min === null ? '' : ` data-min="${min}"`}></label>`;
}

// ---------- digits ↔ display ----------
const toDigits = (v) => String(v ?? '').replace(/\D/g, '').slice(-8);
function format(digits) {
  if (!digits) return '';
  const d = digits.padStart(8, '0'), sep = rate().df ? ';' : ':';
  return `${d.slice(0, 2)}:${d.slice(2, 4)}:${d.slice(4, 6)}${sep}${d.slice(6)}`;
}

// Bind every .tcin under root: digits shift in, display stays formatted, onChange(name) fires per keystroke.
function bindTcInputs(root, onChange) {
  root.querySelectorAll('.tcin').forEach((input) => {
    input.addEventListener('input', () => {
      input.dataset.d = toDigits(input.value);
      input.value = format(input.dataset.d);
      onChange?.(input.name, input);
    });
    input.addEventListener('focus', () => requestAnimationFrame(() => input.setSelectionRange(input.value.length, input.value.length)));
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); });
  });
  root.querySelectorAll('.numin').forEach((input) => input.addEventListener('input', () => onChange?.(input.name, input)));
}

// The field's digits as a frame count at the current rate (null when empty).
const tcFrames = (input) => (input?.dataset.d ? strToFrames(input.dataset.d, rate()) : null);
const tcDigits = (input) => input?.dataset.d || '';

export { tcInput, numInput, bindTcInputs, tcFrames, tcDigits, format, toDigits };
