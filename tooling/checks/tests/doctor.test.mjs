import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { execute, readJSON } from '../io.mjs';
import { executablePath } from '../provision-lib.mjs';

test('contratos doctor e agregados separam web de Rust e fixam a ordem do bundle', () => {
	const tools = readJSON('tooling/checks/contracts/tools.json');
	const profiles = readJSON('tooling/checks/contracts/verify.json').profiles;
	assert.equal(tools.automaticInstallation, false);
	assert.deepEqual(tools.webRequirementNames, ['node', 'pnpm', 'locks', 'workspaces', 'chromium']);
	assert.equal(
		profiles.quick.some((step) => step.command === 'cargo'),
		false
	);
	assert.equal(
		profiles.quick.some((step) => step.unitReport),
		true
	);
	const ids = profiles.integration.map((step) => step.id);
	assert.ok(ids.indexOf('BUNDLE-BUILD') < ids.indexOf('BUNDLE-INSPECT'));
	for (const id of ['BROWSER-DEV', 'BROWSER', 'UPGRADE'])
		assert.ok(ids.indexOf('BUNDLE-INSPECT') < ids.indexOf(id));
	assert.equal(profiles.integration.filter((step) => step.id.includes('BUILD')).length, 1);
	for (const step of profiles.rust.filter((step) =>
		['check', 'test', 'clippy'].includes(step.args[0])
	)) {
		assert.ok(step.args.includes('--locked'));
		assert.equal(step.args.includes('--all-features'), false);
	}
});

test('doctor web funciona sem executáveis Rust/GTK e desktop reprova nesse PATH', async () => {
	const directory = mkdtempSync(path.join(tmpdir(), 'notfeed-web-only-'));
	try {
		symlinkSync(process.execPath, path.join(directory, 'node'));
		// pnpm run starts scripts through the host shell; no desktop tool is present.
		symlinkSync('/bin/sh', path.join(directory, 'sh'));
		symlinkSync(executablePath('mise'), path.join(directory, 'mise'));
		for (const command of ['readlink', 'dirname'])
			symlinkSync(executablePath(command), path.join(directory, command));
		const pnpm = process.env.PATH.split(path.delimiter)
			.map((dir) => path.join(dir, 'pnpm'))
			.find(existsSync);
		assert.ok(pnpm);
		symlinkSync(pnpm, path.join(directory, 'pnpm'));
		const cli = ['run', 'doctor'];
		const result = await execute('pnpm', [...cli, '--target', 'web'], {
			env: { PATH: directory }
		});
		assert.equal(JSON.parse(result.stdout).status, 'passed');
		await assert.rejects(
			execute('pnpm', [...cli, '--target', 'desktop'], { env: { PATH: directory } }),
			(error) => {
				const failure = JSON.parse(error.message);
				assert.match(failure.stderr, /rustc.*rustup|Rust.*rustup/s);
				return failure.code === 1;
			}
		);
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
});

test('doctor recusa versão incompatível e Chromium ausente com ação explícita', async () => {
	const { assertToolVersion, assertChromiumVersion } = await import('../doctor-lib.mjs');
	assert.doesNotThrow(() =>
		assertChromiumVersion('Google Chrome for Testing 159.0.8154.6', '159.0.8154.6')
	);
	assert.throws(() =>
		assertChromiumVersion('Google Chrome for Testing 159.0.8154.5', '159.0.8154.6')
	);
	assert.throws(() => assertChromiumVersion('Other Browser 159.0.8154.6', '159.0.8154.6'));
	assert.throws(
		() => assertToolVersion('node', '22.21.1', '24.22.3', 'use .nvmrc'),
		/node.*24\.22\.3/
	);
	assert.doesNotThrow(() => assertToolVersion('node', '24.22.3', '24.22.3', 'use .nvmrc'));
	const directory = mkdtempSync(path.join(tmpdir(), 'notfeed-browser-missing-'));
	try {
		await assert.rejects(
			execute(process.execPath, ['tooling/checks/doctor.mjs', '--target', 'web'], {
				env: { PLAYWRIGHT_BROWSERS_PATH: directory }
			}),
			(error) => {
				const failure = JSON.parse(error.message);
				assert.match(failure.stderr, /playwright install chromium/);
				return failure.code === 1;
			}
		);
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
});

test('agregador preserva argumentos e encerra na primeira falha sem executar sucessores', async () => {
	const { runSteps } = await import('../verify-lib.mjs');
	const steps = [
		{ id: 'first', command: 'tool', args: ['two words', '--literal=$x'] },
		{ id: 'failed', command: 'tool', args: [] },
		{ id: 'forbidden', command: 'tool', args: [] }
	];
	const calls = [];
	await assert.rejects(
		runSteps(steps, {
			executor: async (command, args) => {
				calls.push({ command, args });
				if (calls.length === 2) throw new Error('root cause');
				return { code: 0, signal: null, timedOut: false, error: null, stdout: 'ok', stderr: '' };
			}
		}),
		/root cause/
	);
	assert.deepEqual(
		calls,
		steps.slice(0, 2).map(({ command, args }) => ({ command, args }))
	);
});
