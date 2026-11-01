// ui.js — small screen pieces shared by the tabs: fold-away sections that remember being open, segmented pickers and the TC / FR / SEC mode button.
import { S, $$, esc } from './core.js';

// ---------- fold ----------
const fold = (key, title, body) => `<details class="fold" data-fold="${esc(key)}"${S.folds[key] ? ' open' : ''}>
  <summary>${esc(title)}<span class="chev" aria-hidden="true">›</span></summary><div class="fold-body">${body}</div></details>`;
function bindFolds(root) {
  $$('details[data-fold]', root).forEach((d) => d.addEventListener('toggle', () => { S.folds[d.dataset.fold] = d.open; }));
}

// ---------- segmented picker ----------
const seg = (name, options, cur) => `<div class="seg" role="group" data-seg="${esc(name)}">${options.map(([v, label]) =>
  `<button type="button" data-v="${esc(v)}" aria-pressed="${String(v) === String(cur)}">${esc(label)}</button>`).join('')}</div>`;
function bindSeg(root, name, onPick) {
  $$(`[data-seg="${name}"] button`, root).forEach((b) => b.addEventListener('click', () => onPick(b.dataset.v)));
}

// ---------- TC / FR / SEC button (a native picker under a small accent key) ----------
const MODES = [['tc', 'Timecode', 'TC'], ['frames', 'Frames', 'FR'], ['seconds', 'Seconds', 'SEC']];
const modeKey = (cur, cls = 'modekey') => `<label class="${cls}" title="Enter as"><span>${MODES.find((m) => m[0] === cur)?.[2] ?? 'TC'}<i aria-hidden="true">⌃⌄</i></span>
  <select name="mode" aria-label="Enter as">${MODES.map(([v, l]) => `<option value="${v}"${v === cur ? ' selected' : ''}>${l}</option>`).join('')}</select></label>`;

export { fold, bindFolds, seg, bindSeg, modeKey, MODES };
