import assert from 'node:assert/strict';
import { existsSync, lstatSync, readFileSync, readlinkSync } from 'node:fs';
import path from 'node:path';
import { filesUnder, hash, readJSON } from './io.mjs';

export function ciFingerprint(root = process.cwd()) {
	const files = filesUnder(root)
		.filter((file) => !/^docs\/(?:.*\/)?state\.md$/.test(path.relative(root, file)))
		.map((file) => ({
			path: path.relative(root, file),
			sha256: hash(lstatSync(file).isSymbolicLink() ? readlinkSync(file) : readFileSync(file))
		}));
	const contracts = files.filter((file) => file.path.startsWith('tooling/checks/contracts/'));
	const provisionFile = path.join(root, 'tooling/checks/contracts/provision.json');
	const toolLocks = existsSync(provisionFile)
		? readJSON(provisionFile).lockFiles.map((item) => item.file)
		: [];
	const locks = ['pnpm-lock.yaml', 'apps/desktop/src-tauri/Cargo.lock', ...toolLocks].flatMap(
		(name) =>
			files
				.filter((file) => file.path === name)
				.map((file) => ({ file: file.path, sha256: file.sha256 }))
	);
	return {
		inputHash: hash(JSON.stringify(files)),
		contractsHash: hash(JSON.stringify(contracts)),
		locks,
		files
	};
}
export function assertPreparedSetup(setup, expected) {
	const provision = readJSON(new URL('./contracts/provision.json', import.meta.url));
	assert.equal(setup.schemaVersion, 1);
	assert.equal(setup.status, 'passed');
	assert.equal(setup.target, expected.target);
	assert.equal(setup.inputHash, expected.inputHash);
	assert.deepEqual(setup.locks, expected.locks);
	assert.ok(Date.parse(setup.finishedAt) >= Date.parse(setup.startedAt));
	if (expected.remote) {
		assert.equal(
			setup.initial.dependenciesAbsent,
			true,
			'CI deve instalar dependências em checkout limpo.'
		);
		for (const [key, value] of Object.entries(provision.environments.ci))
			assert.equal(setup.provision.environment[key], value);
	}
	for (const name of ['mise', 'node', 'pnpm'])
		assert.equal(
			setup.provision.versions[name],
			name === 'mise' ? provision.mise.version : provision.pins[name].version
		);
	const required =
		expected.target === 'ci'
			? ['LOCK', 'PREBUILD', 'DEPENDENCIES']
			: [
					'LOCK',
					'PREBUILD',
					'DEPENDENCIES',
					'CHROMIUM',
					...(expected.target === 'desktop'
						? ['RUSTUP', 'RUST', 'RUST-VERSION', 'AUDITOR-VERSION']
						: []),
					'DOCTOR'
				];
	if (expected.target === 'ci')
		assert.deepEqual(
			setup.commands.map((command) => command.id),
			required
		);
	for (const id of required)
		assert.ok(
			setup.commands.some((command) => command.id === id),
			`Setup sem ${id}`
		);
	for (const command of setup.commands) {
		assert.equal(command.code, 0);
		assert.equal(command.signal, null);
		assert.equal(command.timedOut, false);
		assert.equal(command.error, null);
	}
	const install = setup.commands.find((command) => command.id === 'DEPENDENCIES');
	assert.ok(install.args.includes('--frozen-lockfile'));
	assert.ok(!install.args.some((arg) => /ignore-scripts|--force|--no-frozen/.test(arg)));
	if (expected.target === 'desktop')
		assert.deepEqual(
			setup.commands.find((command) => command.id === 'RUST').args,
			provision.rustup.installArguments
		);
}
export function assertCIProof(proof) {
	const contract = readJSON(new URL('./contracts/ci.json', import.meta.url));
	assert.equal(proof.status, 'passed');
	assert.equal(proof.scope, contract.scope);
	assert.equal(proof.job, 'web');
	assert.deepEqual(
		proof.commands.map((command) => command.id),
		contract.checks.map((step) => step.id)
	);
	for (const [index, step] of contract.checks.entries()) {
		const command = proof.commands[index];
		assert.equal(command.code, 0);
		assert.equal(command.signal, null);
		assert.equal(command.timedOut, false);
		assert.equal(command.error, null);
		if (step.command === 'node')
			assert.ok(
				command.command === 'node' ||
					(path.isAbsolute(command.command) && path.basename(command.command) === 'node')
			);
		else assert.equal(command.command, step.command);
		assert.deepEqual(command.args.slice(0, step.args.length), step.args);
		const extra = command.args.slice(step.args.length);
		if (step.unitReport) {
			assert.equal(extra.length, 2);
			assert.equal(extra[0], '--reporter=json');
			assert.match(extra[1], /^--outputFile=\//);
		} else assert.deepEqual(extra, []);
	}
}
export function validateCIReceipt(receipt, expected) {
	const contract = readJSON(new URL('./contracts/ci.json', import.meta.url));
	const pv = readJSON(new URL('./contracts/provision.json', import.meta.url));
	assert.equal(receipt.schemaVersion, 1);
	assert.equal(receipt.status, 'passed');
	assert.equal(receipt.scope, contract.scope);
	assert.ok(Number.isInteger(receipt.runId) && receipt.runId > 0);
	assert.ok(Number.isInteger(receipt.attempt) && receipt.attempt > 0);
	assert.equal(
		receipt.url,
		`https://github.com/${contract.repository}/actions/runs/${receipt.runId}`
	);
	assert.ok(contract.events.includes(receipt.event));
	for (const field of [
		'runId',
		'attempt',
		'headSha',
		'checkoutSha',
		'inputHash',
		'contractsHash',
		'locks'
	])
		if (Object.hasOwn(expected, field))
			assert.deepEqual(receipt[field], expected[field], `CI diferente: ${field}`);
	for (const field of ['headSha', 'checkoutSha']) assert.match(receipt[field], /^[a-f0-9]{40}$/);
	for (const field of ['inputHash', 'contractsHash'])
		assert.match(receipt[field], /^[a-f0-9]{64}$/);
	assert.deepEqual(
		receipt.jobs.map((job) => job.name).sort(),
		[...contract.jobs].sort(),
		'jobs ausentes/inesperados'
	);
	for (const job of receipt.jobs)
		assert.equal(job.conclusion, 'success', `job obrigatório não aprovado: ${job.name}`);
	assert.equal(receipt.artifacts.length, contract.receipt.artifactNames.length);
	for (const base of contract.receipt.artifactNames) {
		const artifact = receipt.artifacts.find((item) => item.name === `${base}-${receipt.attempt}`);
		assert.ok(artifact, `artefato ausente: ${base}`);
		assert.match(artifact.digest, /^sha256:[a-f0-9]{64}$/);
		assert.ok(Number.isInteger(artifact.id) && artifact.id > 0);
		assertCIProof(artifact.proof);
		assert.equal(artifact.proof.job, base.slice('proof-'.length));
		for (const field of ['headSha', 'checkoutSha', 'inputHash', 'contractsHash', 'locks'])
			assert.deepEqual(artifact.proof[field], receipt[field], `artefato divergente: ${field}`);
		assert.ok(artifact.files.length);
		const prepared = artifact.proof.provision;
		assert.deepEqual(prepared.environment, { ...pv.environments.ci, platform: 'linux' });
		const versions = {
			mise: pv.mise.version,
			node: pv.pins.node.version,
			pnpm: pv.pins.pnpm.version
		};
		assert.deepEqual(prepared.versions, versions);
		for (const [name, version] of Object.entries(versions))
			assert.equal(artifact.proof.versions[name], version);
		assert.equal(prepared.dependenciesInitiallyAbsent, true);
		for (const kind of ['setup', 'bootstrap']) {
			assert.match(prepared[`${kind}Sha256`], /^[a-f0-9]{64}$/);
			assert.ok(
				artifact.files.some(
					(file) =>
						file.path === prepared[`${kind}Path`] && file.sha256 === prepared[`${kind}Sha256`]
				)
			);
		}
		assert.equal(prepared.bootstrapPath, 'reports/setup/bootstrap.json');
		assert.equal(prepared.markerPath, 'reports/setup/mise-data-fresh.stdout');
		assert.ok(artifact.files.some((file) => file.path === prepared.markerPath));
		const names = new Set();
		for (const file of artifact.files) {
			assert.ok(!path.isAbsolute(file.path) && !file.path.split(/[\\/]/).includes('..'));
			assert.ok(!names.has(file.path));
			names.add(file.path);
			assert.match(file.sha256, /^[a-f0-9]{64}$/);
			assert.ok(
				!/\.(?:AppImage|so|node|tar|tgz)$/i.test(file.path),
				'bundle/binário não deve ser publicado'
			);
		}
	}
}
