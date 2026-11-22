import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
	copyFileSync,
	mkdtempSync,
	mkdirSync,
	writeFileSync,
	readFileSync,
	rmSync,
	existsSync,
	symlinkSync
} from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { execute, hash, readJSON } from '../io.mjs';

test('provision recusa pins divergentes e override Rust sem alterar defaults', async () => {
	const { assertProvisionPins, assertRustOverride } = await import('../provision-lib.mjs');
	const contract = readJSON('tooling/checks/contracts/provision.json');
	assert.doesNotThrow(() => assertProvisionPins(process.cwd(), contract));
	const changed = structuredClone(contract);
	changed.pins.pnpm.version = '11.28.13';
	assert.throws(() => assertProvisionPins(process.cwd(), changed));
	assert.doesNotThrow(() => assertRustOverride({}, contract));
	assert.doesNotThrow(() => assertRustOverride({ RUSTUP_TOOLCHAIN: '1.100.0' }, contract));
	assert.throws(
		() => assertRustOverride({ RUSTUP_TOOLCHAIN: 'stable' }, contract),
		/RUSTUP_TOOLCHAIN/
	);
});

test('isolamento conserva a remoção de variáveis após serialização sem permitir alterar HOME', async () => {
	const { provisionEnvironment } = await import('../provision-lib.mjs');
	const context = {
		unsetKeys: ['MISE_GLOBAL_CONFIG_FILE', 'RUSTUP_TOOLCHAIN', 'NODE_OPTIONS'],
		env: {
			MISE_GLOBAL_CONFIG_FILE: undefined,
			RUSTUP_TOOLCHAIN: undefined,
			NODE_OPTIONS: undefined,
			MISE_DATA_DIR: '/fixture/data',
			PATH: '/fixture/bin'
		}
	};
	const restored = provisionEnvironment(JSON.parse(JSON.stringify(context)));
	for (const key of context.unsetKeys) {
		assert.ok(Object.hasOwn(restored, key));
		assert.equal(restored[key], undefined);
	}
	assert.equal(restored.MISE_DATA_DIR, '/fixture/data');
	assert.throws(() => provisionEnvironment({ unsetKeys: ['HOME'], env: {} }));
});

test('bootstrap local valida o mise pessoal e recusa ausência ou corrupção sem instalar', async () => {
	const directory = mkdtempSync(path.join(tmpdir(), 'notfeed-bootstrap-local-'));
	try {
		const script = path.resolve('tooling/setup/install-mise.sh');
		const { executablePath } = await import('../provision-lib.mjs');
		const original = executablePath('mise');
		const before = hash(readFileSync(original));
		symlinkSync(original, path.join(directory, 'mise'));
		writeFileSync(path.join(directory, 'curl'), '#!/bin/sh\nexit 87\n', { mode: 0o755 });
		const env = { PATH: `${directory}:/usr/bin:/bin`, XDG_DATA_HOME: path.join(directory, 'data') };
		const result = await execute('/bin/bash', [script], { env });
		assert.equal(result.stdout.trim(), path.join(directory, 'mise'));
		assert.equal(hash(readFileSync(original)), before);
		assert.equal(existsSync(env.XDG_DATA_HOME), false);
		rmSync(path.join(directory, 'mise'));
		await assert.rejects(execute('/bin/bash', [script], { env }), (error) => {
			const failure = JSON.parse(error.message);
			assert.match(failure.stderr, /mise.*PATH/);
			return failure.code === 1;
		});
		writeFileSync(path.join(directory, 'mise'), '#!/bin/sh\nexit 87\n', { mode: 0o755 });
		await assert.rejects(execute('/bin/bash', [script], { env }), (error) => {
			const failure = JSON.parse(error.message);
			assert.match(failure.stderr, /checksum|integridade/i);
			return failure.code === 1;
		});
		assert.equal(existsSync(env.XDG_DATA_HOME), false);
		assert.equal(hash(readFileSync(original)), before);
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
});

test('bootstrap isolado sem Node recusa download e checksum incorreto antes de instalar', async () => {
	const directory = mkdtempSync(path.join(tmpdir(), 'notfeed-bootstrap-negative-'));
	try {
		const bin = path.join(directory, 'bin');
		mkdirSync(bin);
		const script = path.resolve('tooling/setup/install-mise.sh');
		assert.ok(existsSync(script), 'bootstrap must exist before testing failures');
		const data = path.join(directory, 'data');
		for (const body of [
			'exit 22',
			'while [ "$#" -gt 0 ]; do if [ "$1" = "--output" ]; then shift; printf corrupted > "$1"; exit 0; fi; shift; done; exit 2'
		]) {
			writeFileSync(path.join(bin, 'curl'), `#!/bin/sh\n${body}\n`, { mode: 0o755 });
			await assert.rejects(
				execute('/bin/bash', [script, '--install-dir', data], {
					env: { PATH: `${bin}:/usr/bin:/bin`, XDG_DATA_HOME: data }
				})
			);
			assert.equal(existsSync(path.join(data, 'mise')), false);
		}
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
});

test('bootstrap isolado exige destino absoluto e preserva instalação incompatível ou simbólica', async () => {
	const directory = mkdtempSync(path.join(tmpdir(), 'notfeed-bootstrap-destination-'));
	try {
		const script = path.resolve('tooling/setup/install-mise.sh');
		await assert.rejects(execute('/bin/bash', [script, '--install-dir', 'relative']));
		const file = path.join(directory, 'mise');
		writeFileSync(file, 'preserve this file');
		await assert.rejects(execute('/bin/bash', [script, '--install-dir', directory]));
		assert.equal(readFileSync(file, 'utf8'), 'preserve this file');
		rmSync(file);
		const personal = path.join(directory, 'personal');
		writeFileSync(personal, 'preserve personal file');
		symlinkSync(personal, file);
		await assert.rejects(execute('/bin/bash', [script, '--install-dir', directory]));
		assert.equal(readFileSync(personal, 'utf8'), 'preserve personal file');
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
});

test('provision exige recibo fresco completo com casos, locks, processos e limpeza', async () => {
	const { assertProvisionReceipt } = await import('../provision-lib.mjs');
	for (const value of [{}, { schemaVersion: 1, status: 'passed', target: 'web', cases: [] }])
		assert.throws(() =>
			assertProvisionReceipt(value, { target: 'web', inputHash: 'a'.repeat(64) })
		);
});

test('validador de provision aceita prova completa e recusa caso, runtime, log ou resultado alterado', async () => {
	const { assertProvisionReceipt, provisionLocks } = await import('../provision-lib.mjs');
	const directory = mkdtempSync(path.join(tmpdir(), 'notfeed-provision-receipt-'));
	try {
		const output = path.join(directory, 'output');
		writeFileSync(output, '');
		const contract = readJSON('tooling/checks/contracts/provision.json');
		const date = new Date().toISOString();
		const receipt = {
			schemaVersion: 1,
			status: 'passed',
			target: 'web',
			environment: { ...contract.environments.development, platform: 'linux' },
			versions: {
				mise: contract.mise.version,
				node: contract.pins.node.version,
				pnpm: contract.pins.pnpm.version
			},
			executables: { node: '/fixture/node' },
			inputHash: 'a'.repeat(64),
			contractsHash: 'b'.repeat(64),
			locks: provisionLocks(),
			startedAt: date,
			finishedAt: date,
			cleanup: { status: 'passed' },
			runtimes: [
				{
					argv: ['node', '/fixture/pnpm.mjs'],
					version: contract.pins.node.version,
					executable: '/fixture/node'
				},
				{ argv: ['node'], version: contract.pins.node.version, executable: '/fixture/node' }
			],
			independence: {
				absent: ['tooling/maintenance', 'tooling/migration', 'docs/plans'],
				verified: true
			},
			cases: contract.cases.web.map((id) => ({
				id,
				status: 'passed',
				commands: contract.caseCommands.web[id]
			})),
			commands: []
		};
		for (const id of new Set(Object.values(contract.caseCommands.web).flat())) {
			const code = /failure|^missing-|^divergent-/.test(id) ? 1 : 0;
			receipt.commands.push({
				id,
				code,
				expectedCode: code,
				command: 'fixture',
				args: [],
				cwd: directory,
				startedAt: date,
				finishedAt: date,
				signal: null,
				timedOut: false,
				error: null,
				stdoutPath: output,
				stderrPath: output,
				stdoutHash: hash(''),
				stderrHash: hash('')
			});
		}
		const expected = {
			target: 'web',
			inputHash: receipt.inputHash,
			contractsHash: receipt.contractsHash,
			locks: receipt.locks,
			notBefore: date
		};
		assert.doesNotThrow(() => assertProvisionReceipt(receipt, expected));
		for (const mutate of [
			(item) => item.cases.pop(),
			(item) => item.commands.pop(),
			(item) => {
				item.runtimes[0].version = '26.13.1';
			},
			(item) => {
				item.commands[0].code = 1;
			},
			(item) => {
				item.commands[0].stdoutHash = '0'.repeat(64);
			},
			(item) => {
				item.cleanup.status = 'pending';
			},
			(item) => {
				item.inputHash = 'c'.repeat(64);
			},
			(item) => {
				item.commands[0].startedAt = '2000-01-01T00:00:00Z';
			}
		]) {
			const changed = structuredClone(receipt);
			mutate(changed);
			assert.throws(() => assertProvisionReceipt(changed, expected));
		}
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
});

test('mise exec e setup recusam lock ausente ou divergente mesmo com ferramentas já instaladas', async () => {
	const { executablePath } = await import('../provision-lib.mjs');
	const directory = mkdtempSync(path.join(tmpdir(), 'notfeed-lock-guard-'));
	const mise = executablePath('mise');
	try {
		const global = path.join(directory, 'personal.toml');
		writeFileSync(
			global,
			'[settings]\nlocked = false\nexec_auto_install = false\n[settings.task]\nrun_auto_install = false\n'
		);
		const environment = {
			MISE_STATE_DIR: path.join(directory, 'state'),
			MISE_GLOBAL_CONFIG_FILE: global
		};
		const contract = readJSON('tooling/checks/contracts/provision.json');
		const files = [
			'mise.toml',
			'.nvmrc',
			'package.json',
			'tooling/checks/contracts/provision.json',
			...contract.lockFiles.map((item) => item.file)
		];
		const reset = () => {
			for (const file of files) {
				const target = path.join(directory, file);
				mkdirSync(path.dirname(target), { recursive: true });
				copyFileSync(file, target);
			}
		};
		reset();
		await execute(mise, ['trust', path.join(directory, 'mise.toml')], {
			env: environment
		});
		for (const change of ['missing-lock', 'pin', 'checksum', 'platform', 'sidecar']) {
			reset();
			if (change === 'missing-lock') rmSync(path.join(directory, 'mise.lock'));
			if (change === 'pin') writeFileSync(path.join(directory, '.nvmrc'), '24.22.2\n');
			if (change === 'checksum')
				writeFileSync(
					path.join(directory, 'mise.lock'),
					readFileSync(path.join(directory, 'mise.lock'), 'utf8').replace(
						'sha256:061ec3',
						'sha256:000000'
					)
				);
			if (change === 'platform')
				writeFileSync(
					path.join(directory, 'mise.lock'),
					readFileSync(path.join(directory, 'mise.lock'), 'utf8').replace(
						'platforms.linux-x64',
						'platforms.macos-arm64'
					)
				);
			if (change === 'sidecar')
				writeFileSync(path.join(directory, contract.lockFiles[1].file), '{}');
			for (const args of [
				['exec', '--', '/bin/true'],
				['run', 'setup:web']
			])
				await assert.rejects(
					execute(mise, args, {
						cwd: directory,
						env: environment
					}),
					(error) => {
						const failure = JSON.parse(error.message);
						assert.equal(failure.code, 1);
						assert.match(
							failure.stderr,
							/failed to parse template|Notfeed: tool|Failed to read file/s
						);
						return true;
					}
				);
		}
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
});
