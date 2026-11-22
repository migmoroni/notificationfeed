import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assertTapReport } from '../tap-lib.mjs';
test('CI exige identidades Node reais e recusa skip/todo apesar de exit code zero', () => {
	const source =
		'# Subtest: expected\nok 1 - expected\n# tests 1\n# pass 1\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0\n';
	assert.doesNotThrow(() => assertTapReport(source, ['expected']));
	for (const output of [
		source.replace('# skipped 0', '# skipped 1'),
		source.replace('# todo 0', '# todo 1'),
		source.replace('# Subtest: expected', '# Subtest: omitted'),
		''
	])
		assert.throws(() => assertTapReport(output, ['expected']));
});
