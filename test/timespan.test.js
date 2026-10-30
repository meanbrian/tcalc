// timespan.test.js — checks the calendar and unit maths. Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toMs, breakdown, calendarDiff, addToDate, epochToDate, fmtParts, fmtHms } from '../public/js/timespan.js';

test('decimal units break down', () => {
  const b = breakdown(toMs(1.97, 'h'));
  assert.equal(b.h, 1); assert.equal(b.m, 58); assert.equal(b.s, 12);
  const y = breakdown(toMs(1.23, 'y'));
  assert.equal(y.y, 1); assert.equal(y.mo, 2);
  assert.equal(fmtParts(breakdown(toMs(99282, 'd')), { parts: 2 }), '271 years 9 months');
});

test('calendar difference borrows correctly', () => {
  const d = calendarDiff(new Date(2024, 0, 31, 23, 0), new Date(2024, 2, 1, 1, 0));
  assert.deepEqual([d.y, d.mo, d.d, d.h], [0, 1, 0, 2]); // Jan 31 23:00 → Mar 1 01:00 (leap year)
  const e = calendarDiff(new Date(2020, 5, 15), new Date(2026, 9, 30));
  assert.deepEqual([e.y, e.mo, e.d], [6, 4, 15]);
  assert.ok(calendarDiff(new Date(2026, 0, 2), new Date(2026, 0, 1)).neg);
});

test('date plus duration and epoch', () => {
  assert.equal(addToDate(new Date(2026, 0, 31), 1, 'mo').getDate(), 28); // Jan 31 + 1 month = Feb 28
  assert.equal(addToDate(new Date(2026, 0, 1), 90, 'd').getDate(), 1); // Apr 1
  assert.equal(epochToDate(1700000000).getFullYear(), 2023);
  assert.equal(epochToDate(1700000000000).getFullYear(), 2023);
  assert.equal(fmtHms(3723456), '1:02:03.456');
});
