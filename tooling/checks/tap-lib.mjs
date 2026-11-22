import assert from 'node:assert/strict';

export function assertTapReport(output, expectedNames) {
	const totals = {};
	for (const key of ['tests', 'pass', 'fail', 'cancelled', 'skipped', 'todo']) {
		const matches = [...output.matchAll(new RegExp(`^# ${key} (\\d+)$`, 'gm'))];
		assert.equal(matches.length, 1, `relatório Node sem total único: ${key}`);
		totals[key] = Number(matches[0][1]);
	}
	assert.ok(totals.tests > 0);
	assert.equal(totals.pass, totals.tests);
	for (const key of ['fail', 'cancelled', 'skipped', 'todo']) assert.equal(totals[key], 0, key);
	const names = [...output.matchAll(/^# Subtest: (.+)$/gm)].map((match) => match[1]);
	assert.deepEqual(names.sort(), [...expectedNames].sort(), 'casos Node omitidos/renomeados');
	assert.equal(totals.tests, names.length);
	return { totals, names };
}
