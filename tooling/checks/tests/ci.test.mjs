import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { readJSON } from '../io.mjs';

test('contrato CI fixa jobs, revisões completas, permissões e instalação congelada', () => {
	const contract = readJSON('tooling/checks/contracts/ci.json');
	assert.deepEqual(contract.jobs, ['impact', 'web', 'desktop', 'integration']);
	assert.deepEqual(contract.permissions, { contents: 'read' });
	for (const action of contract.actions) assert.match(action.revision, /^[a-f0-9]{40}$/);
	assert.equal(contract.cache.frozenInstallRequired, true);
	assert.equal(contract.receipt.publishedAppImage, false);
});
test('impacto desconhecido, contratos, locks e pedido explícito nunca viram somente docs', async () => {
	const { classifyImpact } = await import('../ci-lib.mjs');
	assert.equal(classifyImpact(['docs/development.md']).profile, 'docs');
	for (const file of [
		'apps/web/src/routes/+page.svelte',
		'apps/desktop/src-tauri/Cargo.lock',
		'pnpm-lock.yaml',
		'rust-toolchain.toml',
		'tooling/checks/contracts/ci.json',
		'.github/workflows/verify.yml',
		'docs/plans/etapa-x/contratos.md',
		'unknown.file'
	])
		assert.equal(classifyImpact([file]).profile, 'complete');
	assert.equal(classifyImpact(['README.md'], { historyAvailable: false }).profile, 'complete');
	assert.equal(classifyImpact(['README.md'], { forceFull: true }).profile, 'complete');
});
test('agregador CI recusa falha, cancelamento e skip obrigatório mesmo sendo always', async () => {
	const { assertCIJobs } = await import('../ci-lib.mjs');
	const jobs = {
		impact: { result: 'success' },
		web: { result: 'success' },
		desktop: { result: 'success' }
	};
	assert.doesNotThrow(() => assertCIJobs(jobs, 'complete'));
	for (const result of ['failure', 'cancelled', 'skipped'])
		assert.throws(() => assertCIJobs({ ...jobs, desktop: { result } }, 'complete'));
	assert.throws(() => assertCIJobs({ impact: jobs.impact, web: jobs.web }, 'complete'));
	assert.doesNotThrow(() =>
		assertCIJobs(
			{ impact: jobs.impact, web: { result: 'skipped' }, desktop: { result: 'skipped' } },
			'docs'
		)
	);
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
			value.jobs.integration.if = 'success()';
		},
		(value) => {
			delete value.jobs.desktop;
		}
	]) {
		const value = structuredClone(workflow);
		mutate(value);
		assert.throws(() => assertWorkflow(value, contract));
	}
});
test('recibo CI não aprova run errado, job ausente ou artefato divergente', async () => {
	const { validateCIReceipt } = await import('../ci-lib.mjs');
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
		jobs: ['impact', 'web', 'desktop', 'integration'].map((name) => ({
			name,
			conclusion: 'success'
		})),
		artifacts: ['web', 'desktop'].map((job) => ({
			id: job === 'web' ? 1 : 2,
			name: `proof-${job}-1`,
			digest: `sha256:${'f'.repeat(64)}`,
			proof: { status: 'passed', job, ...expected },
			files: [{ path: 'evidence.json', sha256: 'f'.repeat(64) }]
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
			value.jobs[1].conclusion = 'skipped';
		},
		(value) => {
			value.artifacts[0].proof.inputHash = '0'.repeat(64);
		},
		(value) => {
			value.artifacts[0].digest = 'missing';
		}
	]) {
		const value = structuredClone(receipt);
		mutate(value);
		assert.throws(() => validateCIReceipt(value, expected));
	}
});
