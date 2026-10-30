// history.js — recent calculations, kept on the phone (localStorage, last 100). addHistory() is called by each
// screen when a result is copied or a tape line is added; the History page under Settings lists them.
import { S, esc, localGet, localSet, page, bindCopy, $ } from './core.js';
import { I } from './icons.js';

const KEY = 'tcalc.history', MAX = 100;
const KINDS = { calc: 'Calculator', offset: 'Offset', convert: 'Convert', clips: 'Clips', time: 'Time' };

const getHistory = () => localGet(KEY, []);
const historyOn = () => S.prefs.history && S.features.history !== false;

// kind: calc | offset | convert | clips; text: what went in; result: the line worth copying later.
function addHistory(kind, text, result) {
  if (!historyOn()) return;
  const list = getHistory();
  if (list[0] && list[0].text === text && list[0].result === result) return; // same as the last one
  list.unshift({ ts: Date.now(), kind, rate: S.prefs.rate, text, result });
  localSet(KEY, list.slice(0, MAX));
}
const clearHistory = () => localSet(KEY, []);

const when = (ts) => {
  const d = new Date(ts), today = new Date().toDateString() === d.toDateString();
  return today ? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

// ---------- the page ----------
function renderHistory() {
  const list = getHistory();
  const body = list.length
    ? `<ul class="list">${list.map((h) => `<li class="hist" data-copy="${esc(h.result)}" role="button" tabindex="0">
        <div class="h-main"><div class="h-result">${esc(h.result)}</div><div class="h-text">${esc(h.text)}</div></div>
        <div class="h-meta">${esc(KINDS[h.kind] || h.kind)} · ${esc(h.rate)}<br>${when(h.ts)}</div></li>`).join('')}</ul>
      <p class="footnote">Tap a line to copy its result. Kept on this device only.</p>
      <div class="group"><button type="button" class="row red center" id="clear">Clear History</button></div>`
    : `<div class="empty">${I.history}<p>Results you copy will show up here.</p></div>`;
  const root = page({ title: 'History', body, back: '#/settings' });
  bindCopy(root);
  $('#clear', root)?.addEventListener('click', () => { if (confirm('Clear all history?')) { clearHistory(); renderHistory(); } });
}

export { addHistory, getHistory, clearHistory, historyOn, renderHistory };
