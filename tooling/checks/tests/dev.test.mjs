import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readJSON } from '../io.mjs';

test('contrato dev fixa ambiente comum, portas e comandos sem mudar o produto', () => {
	const contract = readJSON('tooling/checks/contracts/dev.json');
	assert.equal(contract.schemaVersion, 1);
	assert.deepEqual(contract.environment, { TZ: 'UTC', LANG: 'en_US.UTF-8', LC_ALL: 'en_US.UTF-8' });
	assert.deepEqual(contract.expectedIntl, { locale: 'en-US', timeZone: 'UTC' });
	assert.deepEqual(contract.ports, { dev: 5173, preview: 4173, e2eDev: 4175 });
	assert.equal(contract.strictPort, true);
	assert.equal(contract.watchFlag, '--watch');
	assert.deepEqual(contract.fixtureRuns, { watch: 2, batch: 1 });
	assert.equal(
		contract.publicCommands['pwa:preview'],
		'pnpm build && pnpm preview --host 127.0.0.1'
	);
});

test('configuração efetiva de dev e preview recusa portas móveis e desalinhamento Tauri', async () => {
	const { inspectDevSettings, assertServerSettings } = await import('../dev-lib.mjs');
	const contract = readJSON('tooling/checks/contracts/dev.json');
	const settings = await inspectDevSettings(process.cwd());
	assert.doesNotThrow(() => assertServerSettings(settings, contract));
	for (const mutate of [
		(value) => {
			value.server.strictPort = false;
		},
		(value) => {
			value.preview.strictPort = false;
		},
		(value) => {
			value.server.port++;
		},
		(value) => {
			value.preview.port++;
		},
		(value) => {
			value.devUrl = 'http://localhost:5174';
		}
	]) {
		const value = structuredClone(settings);
		mutate(value);
		assert.throws(() => assertServerSettings(value, contract));
	}
});

test('watch reexecuta após alteração e lote usa as mesmas assertions sob outro fuso', async () => {
	const { proveTestEnvironment } = await import('../dev-lib.mjs');
	const result = await proveTestEnvironment(process.cwd());
	assert.equal(result.watchRuns.length, 2);
	assert.equal(result.batchRuns.length, 1);
	assert.deepEqual(
		result.watchRuns.map((value) => value.revision),
		[1, 2]
	);
	assert.deepEqual(result.batchRuns[0], result.watchRuns[1]);
	assert.equal(result.termination.expected, true);
});

test('Vite dev e preview falham explicitamente em porta reservada pelo harness', async () => {
	const { proveOccupiedPorts } = await import('../dev-lib.mjs');
	const results = await proveOccupiedPorts(process.cwd());
	assert.deepEqual(
		results.map((value) => value.mode),
		['dev', 'preview']
	);
	for (const result of results) {
		assert.notEqual(result.code, 0);
		assert.match(result.output, /Port \d+ is already in use/);
		assert.equal(result.timedOut, false);
	}
});
