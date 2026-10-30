// privacy.js — the privacy text, written once: the Settings › Privacy page in the app, and /privacy.html
// (linked from the Closed / Maintenance pages) draws the same lines through privacy-static.js.
import { page, esc } from './core.js';

const PRIVACY = [
  ['What you type stays here', 'Timecodes, dates and clip lists are worked out on your device. Nothing you enter is sent to a server.'],
  ['Settings and History', 'Your frame rate, appearance and the History list are kept in this browser\'s storage. Clear History in Settings, or clear the site\'s data in your browser, and they are gone.'],
  ['Page views', 'When the app loads, the server notes the time, your IP address, the rough location it maps to and your browser name. This is used only to watch for abuse and to see how many people use the app. Each record is deleted after 30 days.'],
  ['No cookies, no tracking', 'Visitors get no cookies. There are no analytics scripts, no ads and nothing shared with anyone else. The only cookie the site ever sets is the owner\'s own sign-in.'],
  ['Questions', 'tcalc is made by meanbrian. Reach me through meanbrian.com.'],
];

const privacyHtml = () => `<div class="group text">${PRIVACY.map(([h, p]) => `<h3>${esc(h)}</h3><p>${esc(p)}</p>`).join('')}</div>`;

function renderPrivacyPage() {
  page({ title: 'Privacy', body: privacyHtml(), back: '#/settings' });
}

export { PRIVACY, privacyHtml, renderPrivacyPage };
