import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { hash } from './lib.mjs';

export function verifyReferenceRecipe(recipe) {
  const bytes = readFileSync(recipe.bundle);
  assert.equal(hash(bytes), recipe.bundleHash, 'bundle do checkpoint alterado');
  const header = bytes.subarray(0, bytes.indexOf('\n\n')).toString('utf8');
  assert.match(header, /^# v[23] git bundle\n/);
  assert.match(header, new RegExp(`^${recipe.checkpoint} refs/migration/stage1-p1$`, 'm'));
  assert.match(header, new RegExp(`^-${recipe.prerequisite} `, 'm'));
}
