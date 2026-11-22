import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readJSON } from '../io.mjs';
import { verifyRecipe } from '../reference-lib.mjs';

test('referência exige bundle íntegro, revisão interna e runtimes exatos verificáveis', () => {
	const recipe = readJSON('tooling/e2e/reference/stage-2-entry.json');
	assert.doesNotThrow(() => verifyRecipe(recipe));
	for (const bad of [
		{ ...recipe, bundleHash: '0'.repeat(64) },
		{ ...recipe, checkpoint: '0'.repeat(40) },
		{ ...recipe, node: { ...recipe.node, version: 'latest' } },
		{ ...recipe, npm: { ...recipe.npm, integrity: null } },
		{ ...recipe, selfContained: false }
	])
		assert.throws(() => verifyRecipe(bad));
});
test('artefato histórico exige versão/SHA256/HTTPS e cache isolado sem traversal', () => {
	const recipe = readJSON('tooling/e2e/reference/stage-2-entry.json');
	assert.doesNotThrow(() => verifyRecipe(recipe));
	for (const changed of [
		{ version: 'latest' },
		{ sha256: 'invalid' },
		{ url: 'http://example.test/archive.tgz' },
		{ cacheFile: '../source/package-lock.json' },
		{ cacheFile: '/global/cache.tgz' }
	])
		assert.throws(() =>
			verifyRecipe({ ...recipe, nativePrebuild: { ...recipe.nativePrebuild, ...changed } })
		);
});
