import { assertBrowserReport } from '../../checks/verify-lib.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { phaseChecks } from '../phases.mjs';

test('diagnóstico exige instalação, segurança, consumidores, bundle antes do navegador e atualização', () => {
	const checks = phaseChecks('2.1', 'diagnosis', process.execPath);
	const ids = checks.map((check) => check.id);
	for (const id of [
		'INSTALL',
		'CONTRACT',
		'ARBITER',
		'TOOLING',
		'TYPES',
		'E2E-TYPES',
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
		assert.ok(ids.includes(id));
	assert.equal(new Set(ids).size, ids.length);
	assert.ok(ids.indexOf('BUNDLE-INSPECT') < ids.indexOf('BROWSER'));
	assert.ok(ids.indexOf('BUNDLE-INSPECT') < ids.indexOf('UPGRADE'));
	assert.throws(() => phaseChecks('2.8', null, process.execPath));
});
test('relatório real de navegador recusa caso ausente, erro, skip e flaky', () => {
	const report = { stats: { expected: 3, unexpected: 0, skipped: 0, flaky: 0 }, errors: [] };
	assert.doesNotThrow(() => assertBrowserReport(report, 3));
	for (const field of ['unexpected', 'skipped', 'flaky'])
		assert.throws(() =>
			assertBrowserReport({ ...report, stats: { ...report.stats, [field]: 1 } }, 3)
		);
	assert.throws(() => assertBrowserReport(report, 4));
	assert.throws(() => assertBrowserReport({ ...report, errors: [{ message: 'failed' }] }, 3));
});
test('correção prioritária usa unidade registrada e não antecipa o gerenciador', () => {
	const checks = phaseChecks('2.2', 'network-js', process.execPath);
	const ids = checks.map((check) => check.id);
	for (const id of ['INSTALL', 'SECURITY', 'UPGRADE', 'BUNDLE-INSPECT'])
		assert.ok(ids.includes(id));
	assert.equal(checks.find((check) => check.id === 'TYPES').command, 'npm');
	assert.ok(checks.find((check) => check.id === 'SECURITY').args.includes('network-js'));
	assert.throws(() => phaseChecks('2.2', 'unknown', process.execPath));
});
test('conversão exige pnpm no candidato limpo e todos os consumidores', () => {
	const checks = phaseChecks('2.3', null, process.execPath);
	assert.equal(checks.find((check) => check.id === 'TYPES').command, 'pnpm');
	for (const id of ['INSTALL', 'SECURITY', 'BUNDLE-INSPECT', 'BROWSER', 'UPGRADE'])
		assert.ok(checks.some((check) => check.id === id));
});
test('grupo de atualização exige unidade registrada e perfil completo com pnpm', () => {
	const checks = phaseChecks('2.4', 'node-types', process.execPath);
	assert.equal(checks.find((check) => check.id === 'TYPES').command, 'pnpm');
	assert.ok(checks.find((check) => check.id === 'SECURITY').args.includes('node-types'));
	assert.throws(() => phaseChecks('2.4', 'unknown', process.execPath));
});
test('executor exige TAP explícito para não depender do reporter padrão do runtime', () => {
	for (const [phase, unit] of [
		['2.1', 'bootstrap'],
		['2.4', 'node-types']
	]) {
		for (const check of phaseChecks(phase, unit, process.execPath).filter(
			(check) => check.expectedTests
		))
			assert.ok(check.args.includes('--test-reporter=tap'));
	}
});
test('checks permanentes entram em 2.5 antes de lint e bundle produz recibo verificável', () => {
	const checks = phaseChecks('2.5', 'checks', process.execPath);
	for (const id of ['ARCHITECTURE', 'RESTRICTIONS', 'PERMANENT-CONTRACTS'])
		assert.ok(checks.some((check) => check.id === id));
	assert.equal(checks.find((check) => check.id === 'BUNDLE-INSPECT').jsonReceipt, true);
	assert.ok(!checks.some((check) => check.id === 'LINT'));
	assert.throws(() => phaseChecks('2.5', 'unknown', process.execPath));
});

test('configuração CI exige prova local e não aprova execução remota ou consolidação', () => {
	const checks = phaseChecks('2.6', 'configuration', process.execPath);
	assert.ok(checks.some((check) => check.id === 'CI-CONFIG'));
	const proof = checks.find((check) => check.id === 'CI-PROVE');
	assert.ok(proof?.jsonReceipt);
	assert.deepEqual(proof.args, ['tooling/checks/ci.mjs', 'prove', 'web']);
	assert.ok(!checks.some((check) => check.id === 'CI-REMOTE'));
	assert.ok(
		phaseChecks('2.6', 'execution', process.execPath).some((check) => check.id === 'CI-REMOTE')
	);
	assert.ok(phaseChecks('2.6', null, process.execPath).some((check) => check.id === 'CI-REMOTE'));
	assert.throws(() => phaseChecks('2.7', 'configuration', process.execPath));
});
