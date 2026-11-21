import assert from 'node:assert/strict';
import path from 'node:path';

export function assertUnitReport(report, expected, root, { allowAdditional = false } = {}) {
	assert.equal(report.success, true);
	for (const field of ['numFailedTests', 'numPendingTests', 'numTodoTests'])
		assert.equal(report[field], 0, field);
	assert.ok(expected.length > 0);
	const actual = report.testResults.flatMap((file) =>
		file.assertionResults.map((result) => {
			assert.equal(result.status, 'passed');
			return { file: path.relative(root, file.name), fullName: result.fullName };
		})
	);
	assert.equal(report.numTotalTests, actual.length);
	assert.equal(report.numPassedTests, actual.length);
	const canonical = (entries) => entries.map((value) => `${value.file}\0${value.fullName}`).sort();
	assert.equal(new Set(canonical(actual)).size, actual.length, 'identidade duplicada');
	if (allowAdditional) {
		const all = new Set(canonical(actual));
		for (const identity of canonical(expected))
			assert.ok(all.has(identity), `caso obrigatório omitido: ${identity}`);
	} else
		assert.deepEqual(
			canonical(actual),
			canonical(expected),
			'identidade/cobertura de testes alterada'
		);
}
