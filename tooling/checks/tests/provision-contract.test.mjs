import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { readJSON } from '../io.mjs';

test('C11 fixa seleção oficial, pins atuais, perfis e fronteiras antes do bootstrap', () => {
	const contract = readJSON('tooling/checks/contracts/provision.json');
	const tools = readJSON('tooling/checks/contracts/tools.json');
	const manifest = readJSON('package.json');
	assert.equal(contract.schemaVersion, 1);
	assert.equal(contract.mise.version, '2026.11.11');
	assert.deepEqual(contract.mise.bootstrapModes, {
		development: 'validate-path-only',
		isolated: '--install-dir <absolute directory>'
	});
	assert.equal(contract.policy.installPersonalMise, false);
	assert.equal(Object.hasOwn(contract.mise, 'installRelativePath'), false);
	assert.equal(
		contract.mise.url,
		`https://github.com/jdx/mise/releases/download/v${contract.mise.version}/mise-v${contract.mise.version}-linux-x64`
	);
	assert.match(contract.mise.sha256, /^[a-f0-9]{64}$/);
	assert.match(contract.mise.checksumsSha256, /^[a-f0-9]{64}$/);
	assert.ok(
		contract.sources.every((source) =>
			/^https:\/\/(?:github.com\/jdx\/mise\/|mise.jdx.dev\/)/.test(source)
		)
	);
	for (const name of ['node', 'pnpm', 'rust', 'cargoAudit']) {
		assert.equal(contract.pins[name].version, tools[name]);
		assert.ok(contract.pins[name].owner);
	}
	assert.equal(readFileSync('.nvmrc', 'utf8').trim(), contract.pins.node.version);
	assert.equal(manifest.packageManager, `pnpm@${contract.pins.pnpm.version}`);
	assert.deepEqual(contract.pins.rust.components, tools.rustComponents);
	assert.equal(contract.pins.pnpm.backend, 'npm:pnpm');
	assert.equal(contract.rustup.selfUpdate, false);
	assert.equal(contract.rustup.changeDefault, false);
	assert.deepEqual(contract.rustup.installArguments, [
		'toolchain',
		'install',
		tools.rust,
		'--no-self-update',
		'--profile',
		'minimal',
		...tools.rustComponents.flatMap((name) => ['--component', name])
	]);
	assert.equal(contract.policy.projectLocked, true);
	assert.equal(contract.policy.requireChecksum, true);
	assert.deepEqual(contract.policy.platforms, ['linux-x64']);
	for (const name of [
		'globalDefaults',
		'shellEdits',
		'automaticApt',
		'changeHome',
		'doctorInstalls',
		'docker'
	])
		assert.equal(contract.policy[name], false);
	assert.deepEqual(contract.profiles.web.tools, ['node', 'pnpm']);
	assert.deepEqual(contract.profiles.desktop.tools, ['node', 'pnpm', 'rust', 'cargoAudit']);
	assert.deepEqual(contract.environments, {
		development: { id: 'debian', version: '13', arch: 'x64' },
		ci: { id: 'ubuntu', version: '24.04', arch: 'x64' }
	});
	for (const target of ['web', 'desktop']) {
		assert.ok(contract.cases[target].length);
		assert.equal(new Set(contract.cases[target]).size, contract.cases[target].length);
		assert.equal(contract.profiles[target].task, `setup:${target}`);
	}
	for (const field of ['environment', 'executables', 'locks', 'commands', 'cases', 'cleanup'])
		assert.ok(contract.receiptFields.includes(field));
});
