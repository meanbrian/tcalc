// dial.js — the frame-rate dial pinned at the top of the timecode tabs (same as the iPhone app): a sideways wheel
// that snaps a rate to the middle. Drag or swipe it, tap a rate to jump, ← / → keys move it; the middle one is the
// rate every tab uses. The last stop is Custom (tap it again to type any fps).
import { S, $, esc, savePrefs, toast } from './core.js';
import { RATES } from './timecode.js';

const items = () => [
  ...RATES.map((r) => { const [top, bottom] = r.label.split(' '); return { id: r.id, top, bottom: bottom || 'FPS' }; }),
  { id: 'custom', top: String(S.prefs.custom), bottom: 'CUSTOM' },
];

function dial() {
  const cur = S.prefs.rate;
  return `<div class="dialwrap"><div class="dial" role="listbox" aria-label="Frame rate" tabindex="0">${items().map((i) =>
    `<button type="button" class="dial-i${i.id === cur ? ' on' : ''}" data-rate="${esc(i.id)}" role="option" aria-selected="${i.id === cur}">
      <b>${esc(i.top)}</b><small>${esc(i.bottom)}</small></button>`).join('')}</div></div>`;
}

// redraw() is called once the wheel settles on a new rate.
function bindDial(root, redraw) {
  const el = $('.dial', root);
  if (!el) return;
  const btn = (id) => el.querySelector(`[data-rate="${CSS.escape(id)}"]`);
  const centre = (b, smooth) => el.scrollTo({ left: b.offsetLeft - (el.clientWidth - b.offsetWidth) / 2, behavior: smooth ? 'smooth' : 'instant' });
  const nearest = () => {
    const mid = el.scrollLeft + el.clientWidth / 2;
    let best = null, gap = Infinity;
    for (const b of el.children) { const d = Math.abs(b.offsetLeft + b.offsetWidth / 2 - mid); if (d < gap) { gap = d; best = b; } }
    return best;
  };
  let lit = S.prefs.rate, timer = null;
  const settle = () => {
    const id = nearest()?.dataset.rate;
    if (id && id !== S.prefs.rate) { S.prefs.rate = id; savePrefs(); redraw(); }
  };
  const start = btn(S.prefs.rate);
  if (start) centre(start, false);
  el.addEventListener('scroll', () => {
    const b = nearest();
    if (b && b.dataset.rate !== lit) {
      el.querySelector('.on')?.classList.remove('on');
      b.classList.add('on');
      lit = b.dataset.rate;
      navigator.vibrate?.(4); // a tick where the browser allows it
    }
    clearTimeout(timer);
    timer = setTimeout(settle, 160);
  }, { passive: true });
  el.addEventListener('click', (e) => {
    const b = e.target.closest('.dial-i');
    if (!b) return;
    if (b.dataset.rate === 'custom' && S.prefs.rate === 'custom') return askCustom(redraw);
    centre(b, true);
  });
  el.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const b = btn(S.prefs.rate), next = e.key === 'ArrowLeft' ? b?.previousElementSibling : b?.nextElementSibling;
    if (next) centre(next, true);
  });
}

function askCustom(redraw) {
  const v = prompt('Custom frame rate (fps), e.g. 47.952 or 240', S.prefs.custom);
  if (v === null) return;
  const n = Number(String(v).replace(',', '.'));
  if (!(n > 0 && n <= 1000)) return toast('Enter a number between 1 and 1000');
  S.prefs.custom = n; S.prefs.rate = 'custom'; savePrefs(); redraw();
}

export { dial, bindDial };
