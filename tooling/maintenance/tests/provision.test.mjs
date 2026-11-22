import assert from 'node:assert/strict';
import { test } from 'node:test';
import { phaseChecks } from '../phases.mjs';
import { readJSON, hash } from '../lib.mjs';

test('provision é obrigatório no novo fechamento e usa o candidato instalado antes dos consumidores', () => {
	const manifest = readJSON('docs/plans/etapa-2-base-tecnica-e-ambiente/contracts/etapa-2.json');
	const environment = readJSON('tooling/maintenance/contracts/environment-units.json');
	assert.deepEqual(manifest.fixedUnits['2.5'], environment.order);
	assert.equal(environment.order.at(-1), 'provision');
	for (const [phase, unit] of [
		['2.5', 'provision'],
		['2.5', null]
	]) {
		const ids = phaseChecks(phase, unit, process.execPath).map((item) => item.id);
		assert.ok(ids.indexOf('INSTALL') < ids.indexOf('PROVISION'));
		assert.ok(ids.indexOf('PROVISION') < ids.indexOf('CONTRACT'));
	}
	for (const unit of environment.order.slice(0, -1))
		assert.ok(!phaseChecks('2.5', unit, process.execPath).some((item) => item.id === 'PROVISION'));
});

test('correção transitiva após mise exige requalificação pelo perfil completo atual', () => {
	const fix = readJSON('tooling/maintenance/contracts/url-security-fix.json');
	assert.equal(fix.validationGate.phase, '2.5');
	assert.equal(fix.validationGate.unit, 'provision');
	const ids = phaseChecks(fix.validationGate.phase, fix.validationGate.unit, process.execPath).map(
		(check) => check.id
	);
	for (const id of [
		'INSTALL',
		'PROVISION',
		'CONTRACT',
		'ARBITER',
		'TOOLING',
		'ARCHITECTURE',
		'RESTRICTIONS',
		'PERMANENT-CONTRACTS',
		'TYPES',
		'E2E-TYPES',
		'LINT',
		'CLIPPY',
		'FORMAT',
		'RUST-FMT',
		'DEV-ENV',
		'DOCTOR-WEB',
		'DOCTOR-DESKTOP',
		'UNIT',
		'SECURITY',
		'CARGO-CHECK',
		'CARGO-TEST',
		'BUNDLE-BUILD',
		'BUNDLE-INSPECT',
		'BROWSER-DEV',
		'BROWSER',
		'UPGRADE',
		'DIFF'
	])
		assert.ok(ids.includes(id), `requalificação incompleta: ${id}`);
	assert.ok(ids.indexOf('BUNDLE-INSPECT') < ids.indexOf('BROWSER'));
	assert.ok(ids.indexOf('BUNDLE-INSPECT') < ids.indexOf('UPGRADE'));
});
test('recibo histórico exige hash registrado e não pode aprovar fechamento novo', async () => {
	const { receiptChecks } = await import('../receipt-lib.mjs');
	const content = JSON.stringify({
		phase: '2.5',
		unit: null,
		expectedChecks: ['INSTALL', 'CONTRACT']
	});
	const receipt = JSON.parse(content),
		current = ['INSTALL', 'PROVISION', 'CONTRACT'];
	const registry = {
		approvals: [{ sha256: hash(content), phase: '2.5', unit: null, checks: receipt.expectedChecks }]
	};
	assert.deepEqual(
		receiptChecks(receipt, content, current, registry, true),
		receipt.expectedChecks
	);
	assert.throws(() => receiptChecks(receipt, content, current, registry, false));
	assert.throws(() => receiptChecks(receipt, content + ' ', current, registry, true));
	assert.throws(() =>
		receiptChecks({ ...receipt, expectedChecks: current }, content, current, registry, true)
	);
	const native = readJSON('tooling/checks/contracts/tools.json').nativeEnvironment;
	for (const check of phaseChecks('2.5', 'provision', process.execPath).filter((item) =>
		['CLIPPY', 'CARGO-CHECK', 'CARGO-TEST', 'BUNDLE-BUILD'].includes(item.id)
	))
		assert.deepEqual(check.env, native);
});

test('configuração CI mínima exige prova limpa e mantém consumidores completos nos gates locais', () => {
	const ci = readJSON('tooling/checks/contracts/ci.json');
	const policy = readJSON('tooling/maintenance/contracts/ci-policy.json');
	assert.equal(policy.scope, ci.scope);
	assert.deepEqual(policy.jobs, ci.jobs);
	assert.deepEqual(policy.provisioning, ci.provisioning);
	const checks = phaseChecks('2.6', 'configuration', process.execPath);
	assert.deepEqual(
		checks.map((item) => item.id),
		['CONTRACT', 'CI-CONFIG', 'ARBITER', 'TOOLING', 'CI-PROVE', 'DIFF']
	);
	assert.deepEqual(checks.find((item) => item.id === 'CI-PROVE').args, [
		'tooling/checks/ci.mjs',
		'prove',
		'web'
	]);
	for (const id of ['PROVISION', 'CARGO-TEST', 'BUNDLE-BUILD', 'BROWSER', 'UPGRADE'])
		assert.ok(phaseChecks('2.5', null, process.execPath).some((item) => item.id === id));
});
