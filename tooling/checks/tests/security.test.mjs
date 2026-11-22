import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readJSON } from '../io.mjs';

test('política permanente contém decisões atuais sem mapeamento histórico de migração', () => {
	const policy = readJSON('tooling/checks/contracts/security.json');
	assert.equal(policy.schemaVersion, 1);
	assert.equal(policy.findings.length, 67);
	for (const finding of policy.findings) {
		assert.equal(Object.hasOwn(finding, 'legacyKeys'), false);
		assert.equal(finding.status, 'not-applicable');
		assert.equal(finding.reviewBy, '2026-11-27');
		assert.ok(finding.condition);
	}
});

test('segurança permanente recusa advisory/caminho novo, condição invalidada e revisão vencida', async () => {
	const { evaluatePermanentFindings } = await import('../security-lib.mjs');
	const finding = structuredClone(
		readJSON('tooling/checks/contracts/security.json').findings.find(
			(value) => value.ecosystem === 'npm'
		)
	);
	const policy = { findings: [finding] };
	const options = { today: '2026-11-20', graphs: { npm: 'a'.repeat(64), cargo: 'b'.repeat(64) } };
	let proofs = 0;
	assert.equal(evaluatePermanentFindings([finding], policy, () => proofs++, options).length, 1);
	assert.equal(proofs, 1);
	assert.throws(
		() => evaluatePermanentFindings([{ ...finding, key: 'new' }], policy, () => {}, options),
		/classificad|desconhecid/
	);
	assert.throws(
		() =>
			evaluatePermanentFindings(
				[{ ...finding, path: [...finding.path, 'new-path'] }],
				policy,
				() => {},
				options
			),
		/caminho/
	);
	assert.throws(
		() =>
			evaluatePermanentFindings(
				[finding],
				policy,
				() => {
					throw new Error('precondition changed');
				},
				options
			),
		/precondition changed/
	);
	assert.throws(
		() =>
			evaluatePermanentFindings([finding], policy, () => {}, { ...options, today: '2026-11-28' }),
		/vencida/
	);
});
