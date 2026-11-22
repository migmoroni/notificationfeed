import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { readJSON } from '../io.mjs';

test('contrato CI fixa jobs, revisões completas, permissões e instalação congelada', () => {
	const contract = readJSON('tooling/checks/contracts/ci.json');
	assert.deepEqual(contract.jobs, ['web']);
	assert.deepEqual(contract.permissions, { contents: 'read' });
	for (const action of contract.actions) assert.match(action.revision, /^[a-f0-9]{40}$/);
	assert.equal(contract.cache.frozenInstallRequired, true);
	assert.equal(contract.receipt.publishedAppImage, false);
});
test('prova mínima recusa check ausente, falha, skip, build removido e outro escopo', async () => {
	const { assertCIProof } = await import('../ci-lib.mjs');
	const contract = readJSON('tooling/checks/contracts/ci.json');
	const proof = {
		status: 'passed',
		scope: contract.scope,
		job: 'web',
		commands: contract.checks.map((step) => ({
			id: step.id,
			command: step.command,
			args: [
				...step.args,
				...(step.unitReport ? ['--reporter=json', '--outputFile=/fixture/unit.json'] : [])
			],
			code: 0,
			signal: null,
			timedOut: false,
			error: null
		}))
	};
	assert.doesNotThrow(() => assertCIProof(proof));
	for (const mutate of [
		(value) => value.commands.pop(),
		(value) => {
			value.commands[0].code = 1;
		},
		(value) => {
			value.commands[0].timedOut = true;
		},
		(value) => {
			value.commands[0].args = [];
		},
		(value) => {
			value.scope = 'desktop';
		},
		(value) => {
			value.status = 'skipped';
		},
		(value) => {
			value.commands.push(value.commands[0]);
		}
	]) {
		const changed = structuredClone(proof);
		mutate(changed);
		assert.throws(() => assertCIProof(changed));
	}
});
test('impressão digital muda com fontes/contratos e conserva somente ledger mutável', async () => {
	const { ciFingerprint } = await import('../ci-lib.mjs');
	const directory = mkdtempSync(path.join(tmpdir(), 'notfeed-ci-hash-'));
	try {
		mkdirSync(path.join(directory, 'docs/plans/phase'), { recursive: true });
		writeFileSync(path.join(directory, 'docs/plans/phase/state.md'), 'pending');
		writeFileSync(path.join(directory, 'source.ts'), 'export const n=1;');
		const before = ciFingerprint(directory).inputHash;
		writeFileSync(path.join(directory, 'docs/plans/phase/state.md'), 'approved');
		assert.equal(ciFingerprint(directory).inputHash, before);
		writeFileSync(path.join(directory, 'source.ts'), 'export const n=2;');
		assert.notEqual(ciFingerprint(directory).inputHash, before);
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
});
test('workflow real é parseado e recusa action flutuante, permissões e falha mascarada', async () => {
	const { readWorkflow, assertWorkflow } = await import('../ci-workflow.mjs');
	const contract = readJSON('tooling/checks/contracts/ci.json');
	const workflow = await readWorkflow(contract.workflow);
	assert.doesNotThrow(() => assertWorkflow(workflow, contract));
	for (const mutate of [
		(value) => {
			value.jobs.web.steps[0].uses = 'actions/checkout@v6';
		},
		(value) => {
			value.permissions.contents = 'write';
		},
		(value) => {
			value.jobs.web['continue-on-error'] = true;
		},
		(value) => {
			value.jobs.web.if = 'false';
		},
		(value) => {
			delete value.jobs.web;
		}
	]) {
		const value = structuredClone(workflow);
		mutate(value);
		assert.throws(() => assertWorkflow(value, contract));
	}
});
test('recibo CI não aprova run errado, job ausente ou artefato divergente', async () => {
	const { validateCIReceipt } = await import('../ci-lib.mjs');
	const pv = readJSON('tooling/checks/contracts/provision.json');
	const coreVersions = {
		mise: pv.mise.version,
		node: pv.pins.node.version,
		pnpm: pv.pins.pnpm.version
	};
	const expected = {
		runId: 12,
		attempt: 1,
		headSha: 'a'.repeat(40),
		checkoutSha: 'b'.repeat(40),
		inputHash: 'c'.repeat(64),
		contractsHash: 'd'.repeat(64),
		locks: [{ file: 'pnpm-lock.yaml', sha256: 'e'.repeat(64) }]
	};
	const receipt = {
		schemaVersion: 1,
		status: 'passed',
		runId: 12,
		attempt: 1,
		url: 'https://github.com/migmoroni/notificationfeed/actions/runs/12',
		event: 'pull_request',
		...expected,
		scope: 'web-minimum',
		jobs: ['web'].map((name) => ({
			name,
			conclusion: 'success'
		})),
		artifacts: ['web'].map((job) => ({
			id: 1,
			name: `proof-${job}-1`,
			digest: `sha256:${'f'.repeat(64)}`,
			proof: {
				status: 'passed',
				job,
				...expected,
				scope: 'web-minimum',
				commands: readJSON('tooling/checks/contracts/ci.json').checks.map((step) => ({
					id: step.id,
					command: step.command,
					args: [
						...step.args,
						...(step.unitReport ? ['--reporter=json', '--outputFile=/fixture/unit.json'] : [])
					],
					code: 0,
					signal: null,
					timedOut: false,
					error: null
				})),
				versions: coreVersions,
				provision: {
					environment: { ...pv.environments.ci, platform: 'linux' },
					versions: coreVersions,
					dependenciesInitiallyAbsent: true,
					setupPath: 'reports/setup/run/evidence.json',
					setupSha256: '1'.repeat(64),
					bootstrapPath: 'reports/setup/bootstrap.json',
					bootstrapSha256: '2'.repeat(64),
					markerPath: 'reports/setup/mise-data-fresh.stdout'
				}
			},
			files: [
				{ path: 'evidence.json', sha256: 'f'.repeat(64) },
				{ path: 'reports/setup/run/evidence.json', sha256: '1'.repeat(64) },
				{ path: 'reports/setup/bootstrap.json', sha256: '2'.repeat(64) },
				{ path: 'reports/setup/mise-data-fresh.stdout', sha256: '3'.repeat(64) }
			]
		}))
	};
	assert.doesNotThrow(() => validateCIReceipt(receipt, expected));
	for (const mutate of [
		(value) => {
			value.headSha = '0'.repeat(40);
		},
		(value) => {
			value.jobs.pop();
		},
		(value) => {
			value.jobs[0].conclusion = 'skipped';
		},
		(value) => {
			value.artifacts[0].proof.inputHash = '0'.repeat(64);
		},
		(value) => {
			value.artifacts[0].digest = 'missing';
		},
		(value) => {
			value.artifacts[0].proof.provision.environment.id = 'debian';
		},
		(value) => {
			value.artifacts[0].proof.provision.versions = { ...coreVersions, pnpm: '11.28.13' };
		},
		(value) => {
			value.artifacts[0].proof.provision.dependenciesInitiallyAbsent = false;
		},
		(value) => {
			value.artifacts[0].files.pop();
		}
	]) {
		const value = structuredClone(receipt);
		mutate(value);
		assert.throws(() => validateCIReceipt(value, expected));
	}
});
