import assert from 'node:assert/strict';
import test from 'node:test';

import { formatFlowDateValue } from '../studio/lib/flow-date-value.ts';

test('formats flow date and date-time values without shifting time zones', () => {
  assert.equal(formatFlowDateValue('tanggal', '2026-11-05'), '5 Nov 2026');
  assert.equal(formatFlowDateValue('tanggal_waktu', '2026-11-05T09:30'), '5 Nov 2026, 09.30');
  assert.equal(formatFlowDateValue('tanggal', '2026-13-05'), null);
  assert.equal(formatFlowDateValue('tanggal', 'besok'), null);
  assert.equal(formatFlowDateValue('tanggal', 20261105), null);
});
