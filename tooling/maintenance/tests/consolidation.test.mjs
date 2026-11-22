import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readJSON, validateManifest, plan } from '../lib.mjs';
import { phaseChecks } from '../phases.mjs';

const contract = readJSON('tooling/maintenance/contracts/consolidation.json');

test('contrato de consolidação exige recuperação externa, locks e predecessor aprovado', () => {
	const manifest = readJSON(`${plan}/contracts/etapa-2.json`);
	validateManifest(manifest);
	assert.equal(manifest.phasePredecessors['2.7'], '2.6');
	assert.deepEqual(manifest.fixedUnits['2.7'], []);
	assert.equal(contract.schemaVersion, 1);
	assert.equal(contract.phase, '2.7');
	assert.equal(contract.profile, 'Complete');
	for (const key of ['restoreOutsideRepository', 'prepareFromRestoredSources', 'preserveGitIndex'])
		assert.equal(contract.checkpoint[key], true);
	assert.deepEqual(contract.checkpoint.files, [
		'head.bundle',
		'sources.tar.gz',
		'snapshot.json',
		'state.md'
	]);
	assert.deepEqual(contract.checkpoint.locks, [
		'pnpm-lock.yaml',
		'apps/desktop/src-tauri/Cargo.lock',
		'mise.lock',
		'.mise/locks/npm-pnpm/11.28.12/package.json',
		'.mise/locks/npm-pnpm/11.28.12/aube-lock.yaml'
	]);
});

test('consolidação exige CI atual antes do custo local, checkpoint e perfil completo sem omissões', () => {
	const checks = phaseChecks('2.7', null, process.execPath);
	const ids = checks.map((check) => check.id);
	assert.deepEqual(ids, contract.checkOrder);
	assert.equal(new Set(ids).size, 30);
	assert.deepEqual(ids.slice(0, 4), ['CI-REMOTE', 'CHECKPOINT', 'INSTALL', 'PROVISION']);
	const previous = phaseChecks('2.6', null, process.execPath).map((check) => check.id);
	assert.deepEqual([...ids].filter((id) => id !== 'CHECKPOINT').sort(), [...previous].sort());
	assert.equal(checks[0].jsonReceipt, true);
	assert.deepEqual(checks[1].args, ['tooling/maintenance/checkpoint.mjs']);
	assert.equal(checks[1].jsonReceipt, true);
	for (const id of ['BROWSER-DEV', 'BROWSER', 'UPGRADE'])
		assert.ok(ids.indexOf('BUNDLE-INSPECT') < ids.indexOf(id));
	assert.throws(() => phaseChecks('2.7', 'configuration', process.execPath));
	assert.throws(() => phaseChecks('2.8', null, process.execPath));
});
