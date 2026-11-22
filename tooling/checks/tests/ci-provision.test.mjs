import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readJSON } from '../io.mjs';
import { copyFileSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { hash, execute } from '../io.mjs';

test('contrato CI usa mise em todos os jobs e conserva action apenas como cache pnpm', () => {
	const ci = readJSON('tooling/checks/contracts/ci.json'),
		provision = readJSON(ci.provisioning.contract);
	assert.equal(ci.provisioning.requireFreshData, true);
	assert.equal(ci.provisioning.requireFreshDependencies, true);
	assert.equal(ci.cache.toolInstallations, false);
	assert.equal(ci.provisioning.bootstrapInstallDirectory, '$RUNNER_TEMP/notfeed-mise/bin');
	assert.equal(ci.provisioning.environmentStep, 'tools');
	for (const key of ['MISE_DATA_DIR', 'MISE_CACHE_DIR', 'MISE_CONFIG_DIR', 'MISE_STATE_DIR'])
		assert.ok(ci.provisioning.environment[key].startsWith('${{ runner.temp }}/'));
	for (const file of [
		'mise.toml',
		'mise.lock',
		'.mise/locks/**',
		'tooling/setup/install-mise.sh',
		ci.provisioning.contract
	])
		assert.ok(ci.cache.inputs.includes(file));
	for (const system of ['debian', 'ubuntu'])
		assert.ok(provision.systemRequirements[system].browser.includes('libnss3'));
});

test('runner.temp fica no passo tools e seus diretórios persistem no GITHUB_ENV', async () => {
	const { readWorkflow } = await import('../ci-workflow.mjs');
	const ci = readJSON('tooling/checks/contracts/ci.json');
	const workflow = await readWorkflow(ci.workflow);
	assert.equal(Object.hasOwn(workflow.jobs.web, 'env'), false);
	const tools = workflow.jobs.web.steps.find((step) => step.id === 'tools');
	assert.deepEqual(tools.env, ci.provisioning.environment);
	const directory = mkdtempSync(path.join(tmpdir(), 'notfeed ci env '));
	try {
		const file = path.join(directory, 'github-env');
		const expected = Object.fromEntries(
			Object.entries(tools.env).map(([key, value]) => [
				key,
				value.replace('${{ runner.temp }}', directory)
			])
		);
		const script = tools.run.split('\n').filter((line) => line.includes('>> "$GITHUB_ENV"'));
		assert.equal(script.length, 1);
		await execute('bash', ['-euc', script[0]], { env: { ...expected, GITHUB_ENV: file } });
		assert.deepEqual(
			readFileSync(file, 'utf8').trim().split('\n').sort(),
			Object.entries(expected)
				.map(([key, value]) => `${key}=${value}`)
				.sort()
		);
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
});

test('runner mínimo recusa comandos removidos e desktop mesmo sem node_modules', async () => {
	const directory = mkdtempSync(path.join(tmpdir(), 'notfeed-ci-tools-only-'));
	try {
		for (const file of [
			'ci.mjs',
			'ci-lib.mjs',
			'provision-lib.mjs',
			'io.mjs',
			'verify-lib.mjs',
			'unit-lib.mjs',
			'tap-lib.mjs',
			'contracts/ci.json'
		]) {
			const target = path.join(directory, 'tooling/checks', file);
			mkdirSync(path.dirname(target), { recursive: true });
			copyFileSync(path.join('tooling/checks', file), target);
		}
		for (const args of [['impact'], ['aggregate'], ['run', 'desktop']]) {
			await assert.rejects(
				execute(process.execPath, ['tooling/checks/ci.mjs', ...args], { cwd: directory }),
				(error) => {
					const failure = JSON.parse(error.message);
					assert.match(failure.stderr, /uso: ci.mjs/);
					return failure.code === 1;
				}
			);
		}
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
});

test('CI recusa setup de outra árvore, falha, locks alterados ou dependências previamente presentes no runner', async () => {
	const { assertPreparedSetup } = await import('../ci-lib.mjs');
	const provision = readJSON('tooling/checks/contracts/provision.json');
	const expected = {
		target: 'ci',
		inputHash: 'a'.repeat(64),
		locks: [{ file: 'mise.lock', sha256: 'b'.repeat(64) }],
		remote: true
	};
	const setup = {
		schemaVersion: 1,
		status: 'passed',
		target: 'ci',
		inputHash: expected.inputHash,
		locks: expected.locks,
		initial: { dependenciesAbsent: true },
		startedAt: new Date().toISOString(),
		finishedAt: new Date().toISOString(),
		commands: ['LOCK', 'PREBUILD', 'DEPENDENCIES'].map((id) => ({
			id,
			code: 0,
			signal: null,
			timedOut: false,
			error: null,
			args: id === 'DEPENDENCIES' ? ['install', '--frozen-lockfile'] : []
		})),
		provision: {
			versions: {
				mise: provision.mise.version,
				node: provision.pins.node.version,
				pnpm: provision.pins.pnpm.version
			},
			environment: { ...provision.environments.ci, platform: 'linux' }
		}
	};
	assert.doesNotThrow(() => assertPreparedSetup(setup, expected));
	for (const mutate of [
		(r) => {
			r.inputHash = 'c'.repeat(64);
		},
		(r) => {
			r.status = 'failed';
		},
		(r) => {
			r.locks = [];
		},
		(r) => {
			r.initial.dependenciesAbsent = false;
		},
		(r) => {
			r.commands[0].code = 1;
		},
		(r) => {
			r.commands.pop();
		},
		(r) => {
			r.provision.versions.node = '26.13.1';
		},
		(r) => {
			r.commands[2].args.push('--ignore-scripts');
		}
	]) {
		const changed = structuredClone(setup);
		mutate(changed);
		assert.throws(() => assertPreparedSetup(changed, expected));
	}
});

test('workflow exige bootstrap anterior a Node e proíbe seletor Node paralelo na action de cache', async () => {
	const { readWorkflow, assertWorkflow } = await import('../ci-workflow.mjs');
	const contract = readJSON('tooling/checks/contracts/ci.json');
	const workflow = await readWorkflow(contract.workflow);
	assert.doesNotThrow(() => assertWorkflow(workflow, contract));
	for (const mutate of [
		(w) => {
			w.jobs.web.steps = w.jobs.web.steps.filter((s) => s.id !== 'tools');
		},
		(w) => {
			w.jobs.web.steps.find((s) => s.with?.cache === 'pnpm').with['node-version'] = '24.22.3';
		},
		(w) => {
			w.jobs.web.steps.find((s) => s.id === 'tools').env.MISE_DATA_DIR = '/shared/tools';
		},
		(w) => {
			const tools = w.jobs.web.steps.find((s) => s.id === 'tools');
			w.jobs.web.env = tools.env;
			delete tools.env;
		},
		(w) => {
			const tools = w.jobs.web.steps.find((s) => s.id === 'tools');
			tools.run = tools.run.replace('"MISE_STATE_DIR=$MISE_STATE_DIR"', '');
		},
		(w) => {
			const tools = w.jobs.web.steps.find((s) => s.id === 'tools');
			tools.run = tools.run.replace(' --install-dir "$RUNNER_TEMP/notfeed-mise/bin"', '');
		}
	]) {
		const changed = structuredClone(workflow);
		mutate(changed);
		assert.throws(() => assertWorkflow(changed, contract));
	}
});

test('prova publicada valida setup e bootstrap reais e recusa referência fora do manifesto', async () => {
	const { verifyProofFiles } = await import('../ci-live.mjs');
	const root = mkdtempSync(path.join(tmpdir(), 'notfeed-ci-provision-files-')),
		directory = path.join(root, 'artifact');
	mkdirSync(directory);
	try {
		const pv = readJSON('tooling/checks/contracts/provision.json'),
			versions = { mise: pv.mise.version, node: pv.pins.node.version, pnpm: pv.pins.pnpm.version },
			environment = { ...pv.environments.ci, platform: 'linux' },
			date = new Date().toISOString();
		const proof = {
			job: 'web',
			event: 'push',
			inputHash: 'a'.repeat(64),
			locks: [],
			files: [],
			provision: {
				versions,
				environment,
				setupPath: 'reports/setup/run/evidence.json',
				bootstrapPath: 'reports/setup/bootstrap.json',
				markerPath: 'reports/setup/mise-data-fresh.stdout'
			}
		};
		const setup = {
			schemaVersion: 1,
			status: 'passed',
			target: 'ci',
			inputHash: proof.inputHash,
			locks: [],
			initial: { dependenciesAbsent: true },
			startedAt: date,
			finishedAt: date,
			provision: { versions, environment },
			commands: ['LOCK', 'PREBUILD', 'DEPENDENCIES'].map((id) => ({
				id,
				code: 0,
				signal: null,
				timedOut: false,
				error: null,
				args: id === 'DEPENDENCIES' ? ['install', '--frozen-lockfile'] : []
			}))
		};
		function put(name, text) {
			const file = path.join(directory, name);
			mkdirSync(path.dirname(file), { recursive: true });
			writeFileSync(file, text);
			proof.files.push({ path: name, sha256: hash(text) });
			return hash(text);
		}
		const setupText = JSON.stringify(setup);
		proof.provision.setupSha256 = put(proof.provision.setupPath, setupText);
		proof.provision.bootstrapSha256 = put(
			proof.provision.bootstrapPath,
			JSON.stringify({
				status: 'passed',
				versions,
				environment,
				executables: {
					node: '/fixture/data/installs/node/bin/node',
					pnpm: '/fixture/data/installs/pnpm/bin/pnpm'
				}
			})
		);
		put(proof.provision.markerPath, '/fixture/data\n');
		writeFileSync(path.join(directory, 'evidence.json'), JSON.stringify(proof));
		assert.doesNotThrow(() => verifyProofFiles(directory, proof));
		writeFileSync(path.join(root, 'outside.json'), setupText);
		const changed = structuredClone(proof);
		changed.provision.setupPath = '../outside.json';
		assert.throws(() => verifyProofFiles(directory, changed), /manifesto/);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
