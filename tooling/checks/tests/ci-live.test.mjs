import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { hash } from '../io.mjs';

test('serviço CI precisa confirmar workflow/run/attempt e todos os jobs reais', async () => {
	const { assertServiceRun } = await import('../ci-live.mjs');
	const run = {
		id: 12,
		run_attempt: 1,
		status: 'completed',
		conclusion: 'success',
		event: 'pull_request',
		head_sha: 'a'.repeat(40),
		repository: { full_name: 'migmoroni/notificationfeed' }
	};
	const workflow = { path: '.github/workflows/verify.yml', name: 'Verify' };
	const jobs = ['impact', 'web', 'desktop', 'integration'].map((name, index) => ({
		id: index + 1,
		run_id: 12,
		name,
		status: 'completed',
		conclusion: 'success'
	}));
	assert.doesNotThrow(() => assertServiceRun(run, workflow, jobs, { runId: 12 }));
	for (const value of [
		{ ...run, id: 13 },
		{ ...run, status: 'in_progress' },
		{ ...run, conclusion: 'failure' }
	])
		assert.throws(() => assertServiceRun(value, workflow, jobs, { runId: 12 }));
	assert.throws(() =>
		assertServiceRun(run, { ...workflow, path: 'other.yml' }, jobs, { runId: 12 })
	);
	assert.throws(() => assertServiceRun(run, workflow, jobs.slice(1), { runId: 12 }));
	assert.throws(() =>
		assertServiceRun(run, workflow, [...jobs.slice(0, 3), { ...jobs[3], conclusion: 'skipped' }], {
			runId: 12
		})
	);
});
test('checkout PR exige relação de merge comprovada no GitHub sem confundir o head', async () => {
	const { assertCheckoutRelation } = await import('../ci-live.mjs');
	const proof = {
		event: 'pull_request',
		headSha: 'a'.repeat(40),
		baseSha: 'b'.repeat(40),
		checkoutSha: 'c'.repeat(40)
	};
	const commit = {
		sha: proof.checkoutSha,
		parents: [{ sha: proof.baseSha }, { sha: proof.headSha }]
	};
	assert.doesNotThrow(() => assertCheckoutRelation(proof, commit));
	assert.throws(() =>
		assertCheckoutRelation(proof, { ...commit, parents: [{ sha: '0'.repeat(40) }] })
	);
	assert.throws(() => assertCheckoutRelation({ ...proof, event: 'push' }, commit));
	assert.throws(() => assertCheckoutRelation(proof, { ...commit, sha: '0'.repeat(40) }));
});
test('artefatos baixados exigem hashes reais e recusam arquivo extra ou binário', async () => {
	const { verifyProofFiles } = await import('../ci-live.mjs');
	const directory = mkdtempSync(path.join(tmpdir(), 'notfeed-ci-artifact-'));
	try {
		mkdirSync(path.join(directory, 'reports'));
		writeFileSync(path.join(directory, 'reports/command.json'), '{}');
		const proof = { files: [{ path: 'reports/command.json', sha256: hash('{}') }] };
		writeFileSync(path.join(directory, 'evidence.json'), JSON.stringify(proof));
		assert.doesNotThrow(() => verifyProofFiles(directory, proof));
		writeFileSync(path.join(directory, 'reports/command.json'), 'changed');
		assert.throws(() => verifyProofFiles(directory, proof));
		writeFileSync(path.join(directory, 'reports/command.json'), '{}');
		writeFileSync(path.join(directory, 'Notfeed.AppImage'), 'binary');
		assert.throws(() => verifyProofFiles(directory, proof));
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
});

test('paginação REST funciona sem slurp e recusa página truncada ou duplicada', async () => {
	const { readPages } = await import('../ci-live.mjs');
	const calls = [];
	const pages = [
		{ total_count: 101, jobs: Array.from({ length: 100 }, (_, index) => ({ id: index + 1 })) },
		{ total_count: 101, jobs: [{ id: 101 }] }
	];
	const result = await readPages(async (page) => {
		calls.push(page);
		return pages[page - 1];
	}, 'jobs');
	assert.equal(result.length, 101);
	assert.deepEqual(calls, [1, 2]);
	await assert.rejects(readPages(async () => ({ total_count: 2, jobs: [{ id: 1 }] }), 'jobs'));
	await assert.rejects(
		readPages(async () => ({ total_count: 2, jobs: [{ id: 1 }, { id: 1 }] }), 'jobs')
	);
});
