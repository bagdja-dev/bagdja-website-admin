import assert from 'node:assert/strict';
import { test } from 'node:test';

import { groupOptionDrafts, moveOptionGroup } from '../studio/features/catalog/editor/option-groups.ts';

const options = [
  { key: 'a1', group: 'Menu' },
  { key: 'b1', group: 'Lokasi' },
  { key: 'a2', group: 'Menu' },
  { key: 'c1', group: 'Transport' },
];

test('groups options by first appearance and keeps order inside a group', () => {
  assert.deepEqual(groupOptionDrafts(options).map((option) => option.key), ['a1', 'a2', 'b1', 'c1']);
});

test('moves a whole group up or down', () => {
  assert.deepEqual(moveOptionGroup(options, 'Lokasi', -1).map((option) => option.key), ['b1', 'a1', 'a2', 'c1']);
  assert.deepEqual(moveOptionGroup(options, 'Menu', 1).map((option) => option.key), ['b1', 'a1', 'a2', 'c1']);
  assert.deepEqual(moveOptionGroup(options, 'Transport', -1).map((option) => option.key), ['a1', 'a2', 'c1', 'b1']);
});

test('ignores moves past the ends or for unknown groups', () => {
  assert.equal(moveOptionGroup(options, 'Menu', -1), options);
  assert.equal(moveOptionGroup(options, 'Transport', 1), options);
  assert.equal(moveOptionGroup(options, 'Tidak ada', 1), options);
});
