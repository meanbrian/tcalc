// timecode.test.js — checks the maths against known SMPTE drop-frame values. Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rateById, parseTc, tcToFrames, framesToTc, fmtTc, framesToSeconds, sameTime, atSpeed, normalizeTc } from '../public/js/timecode.js';

const df = rateById('29.97df'), ndf = rateById('29.97'), r24 = rateById('24'), df60 = rateById('59.94df');
const rt = (s, r) => fmtTc(framesToTc(tcToFrames(parseTc(s), r), r), r);

test('parse right-aligns short entries and plain digits', () => {
  assert.deepEqual(parseTc('5:12'), { h: 0, m: 0, s: 5, f: 12 });
  assert.deepEqual(parseTc('12305'), { h: 0, m: 1, s: 23, f: 5 });
  assert.equal(parseTc('abc'), null);
});

test('drop-frame skips 2 frames every minute except each 10th', () => {
  assert.equal(fmtTc(framesToTc(1800, df), df), '00:01:00;02'); // 60 s of real frames lands past the skipped 00 and 01
  assert.equal(fmtTc(framesToTc(17982, df), df), '00:10:00;00');
  assert.equal(tcToFrames(parseTc('00:10:00;00'), df), 17982);
  assert.equal(tcToFrames(parseTc('01:00:00;00'), df), 107892);
  assert.equal(fmtTc(framesToTc(107892, df), df), '01:00:00;00');
  assert.equal(rt('00:01:00;00', df), '00:01:00;02'); // an invalid DF code normalises forward
});

test('59.94 DF drops 4 per minute', () => {
  assert.equal(tcToFrames(parseTc('00:10:00;00'), df60), 35964);
  assert.equal(fmtTc(framesToTc(35964, df60), df60), '00:10:00;00');
});

test('non-drop and integer rates round-trip', () => {
  for (const s of ['00:00:00:00', '00:59:59:29', '23:59:59:29', '12:34:56:07']) assert.equal(rt(s, ndf), s);
  assert.equal(rt('01:02:03:23', r24), '01:02:03:23');
  assert.equal(fmtTc(framesToTc(-25, r24), r24), '-00:00:01:01');
});

test('real seconds and rate conversion', () => {
  assert.ok(Math.abs(framesToSeconds(107892, df) - 3600) < 0.004); // DF one hour ≈ a real hour (3.6 ms short)
  assert.ok(Math.abs(framesToSeconds(108000, ndf) - 3603.6) < 1e-9); // NDF drifts 3.6 s
  assert.equal(sameTime(24, r24, rateById('25')), 25);
  assert.equal(atSpeed(240, 0.5), 480);
  assert.equal(normalizeTc('00:00:90:00', r24, {}), '00:01:30:00');
});
