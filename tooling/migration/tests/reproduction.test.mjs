import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readJSON } from '../lib.mjs';
import { verifyReferenceRecipe } from '../reference-lib.mjs';

test('checkpoint P1 exige bytes do bundle e revisão exatos', () => {
  const recipe = readJSON('tooling/migration/reference/pwa-reference.json');
  assert.doesNotThrow(() => verifyReferenceRecipe(recipe));
  assert.throws(() => verifyReferenceRecipe({ ...recipe, bundleHash: '0'.repeat(64) }));
  assert.throws(() => verifyReferenceRecipe({ ...recipe, checkpoint: '0'.repeat(40) }));
  assert.throws(() => verifyReferenceRecipe({ ...recipe, prerequisite: '0'.repeat(40) }));
});
