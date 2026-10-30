// privacy-static.js — draws /privacy.html (the stand-alone page linked from the Closed / Maintenance pages).
import { PRIVACY } from './privacy.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
document.getElementById('privacy').innerHTML = PRIVACY.map(([h, p]) => `<h3>${esc(h)}</h3><p>${esc(p)}</p>`).join('');
