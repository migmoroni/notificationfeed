import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assertTypeReport } from '../verify-lib.mjs';
test('saída zero do compilador não aprova aviso Svelte nem relatório ausente', () => {
	assert.doesNotThrow(() => assertTypeReport('svelte-check found 0 errors and 0 warnings'));
	for (const output of [
		'success',
		'svelte-check found 0 errors and 1 warnings',
		'svelte-check found 1 errors and 0 warnings',
		'svelte-check found 0 errors and 0 warnings\nsvelte-check found 0 errors and 1 warnings'
	])
		assert.throws(() => assertTypeReport(output));
});
