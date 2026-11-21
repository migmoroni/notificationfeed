import assert from 'node:assert/strict';
import path from 'node:path';
import {
	closeSync,
	lstatSync,
	mkdirSync,
	mkdtempSync,
	openSync,
	readFileSync,
	readdirSync
} from 'node:fs';
import { spawn } from 'node:child_process';
import { execute, hash, readJSON, writeJSON } from './io.mjs';
import { validateCIReceipt } from './ci-lib.mjs';

const configuration = () => readJSON(new URL('./contracts/ci.json', import.meta.url));
export function assertServiceRun(run, workflow, jobs, { runId }) {
	const contract = configuration();
	assert.equal(run.id, runId);
	assert.ok(Number.isInteger(run.run_attempt) && run.run_attempt > 0);
	assert.equal(run.repository.full_name.toLowerCase(), contract.repository.toLowerCase());
	assert.equal(run.status, 'completed');
	assert.equal(run.conclusion, 'success');
	assert.ok(contract.events.includes(run.event));
	assert.equal(workflow.path, contract.workflow);
	assert.equal(workflow.name, contract.name);
	assert.deepEqual(jobs.map((job) => job.name).sort(), [...contract.jobs].sort());
	for (const job of jobs) {
		assert.ok(Number.isInteger(job.id) && job.id > 0);
		assert.equal(job.run_id, runId);
		assert.equal(job.status, 'completed');
		assert.equal(job.conclusion, 'success', `job não aprovado: ${job.name}`);
	}
}
export function assertCheckoutRelation(proof, commit) {
	assert.equal(commit.sha, proof.checkoutSha);
	if (proof.event === 'pull_request' && proof.checkoutSha !== proof.headSha) {
		assert.match(proof.baseSha, /^[a-f0-9]{40}$/);
		assert.deepEqual(
			commit.parents.map((parent) => parent.sha).sort(),
			[proof.baseSha, proof.headSha].sort(),
			'merge não corresponde ao base/head do PR'
		);
	} else assert.equal(proof.checkoutSha, proof.headSha, 'checkout diferente da revisão solicitada');
}
export function verifyProofFiles(directory, proof) {
	function walk(root) {
		return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
			const file = path.join(root, entry.name);
			assert.equal(lstatSync(file).isSymbolicLink(), false, 'symlink em artefato');
			return entry.isDirectory() ? walk(file) : [path.relative(directory, file)];
		});
	}
	assert.ok(Array.isArray(proof.files) && proof.files.length);
	const expected = ['evidence.json', ...proof.files.map((file) => file.path)];
	assert.equal(new Set(expected).size, expected.length, 'arquivo duplicado');
	assert.deepEqual(walk(directory).sort(), expected.sort(), 'arquivo extra/ausente no artefato');
	for (const file of proof.files) {
		assert.ok(
			!path.isAbsolute(file.path) && !file.path.split(/[\\/]/).includes('..'),
			'path de artefato inválido'
		);
		assert.match(file.path, /\.(?:json|stdout|stderr|failure|zip|png)$/);
		assert.equal(
			hash(readFileSync(path.join(directory, file.path))),
			file.sha256,
			`hash divergente: ${file.path}`
		);
	}
	return expected.map((file) => ({
		path: file,
		sha256: hash(readFileSync(path.join(directory, file)))
	}));
}
async function binaryDownload(command, args, file) {
	const startedAt = new Date().toISOString();
	const descriptor = openSync(file, 'w');
	try {
		await new Promise((resolve, reject) => {
			const child = spawn(command, args, { stdio: ['ignore', descriptor, 'pipe'] });
			let errors = '';
			child.stderr.setEncoding('utf8');
			child.stderr.on('data', (value) => {
				errors += value;
			});
			child.once('error', reject);
			const timer = setTimeout(() => child.kill('SIGKILL'), 240000);
			child.once('close', (code, signal) => {
				clearTimeout(timer);
				if (code === 0 && !signal) resolve();
				else reject(new Error(`${command}: ${code}/${signal}: ${errors}`));
			});
		});
	} finally {
		closeSync(descriptor);
	}
	return {
		command,
		args,
		code: 0,
		signal: null,
		timedOut: false,
		error: null,
		output: file,
		startedAt,
		finishedAt: new Date().toISOString()
	};
}
export async function readPages(load, key) {
	const values = [],
		identities = new Set();
	let page = 1,
		total;
	while (true) {
		const response = await load(page);
		assert.ok(Number.isInteger(response.total_count) && response.total_count >= 0);
		assert.ok(Array.isArray(response[key]));
		if (total === undefined) total = response.total_count;
		else assert.equal(response.total_count, total, 'coleção mudou durante paginação');
		for (const value of response[key]) {
			assert.ok(!identities.has(value.id), 'item duplicado na paginação');
			identities.add(value.id);
			values.push(value);
		}
		if (response[key].length < 100 || values.length >= total) break;
		page++;
	}
	assert.equal(values.length, total, 'página truncada');
	return values;
}
export async function collectLiveCI(runId, expected) {
	const contract = configuration();
	assert.ok(Number.isInteger(runId) && runId > 0);
	mkdirSync('.artifacts/ci/receipts', { recursive: true });
	const directory = path.resolve(mkdtempSync('.artifacts/ci/receipts/current-'));
	const prefix = `repos/${contract.repository}`;
	const headers = [
		'-H',
		'Accept: application/vnd.github+json',
		'-H',
		`X-GitHub-Api-Version: ${contract.service.apiVersion}`
	];
	const commands = [];
	async function api(endpoint) {
		const args = ['api', endpoint, ...headers];
		const result = await execute('gh', args, { timeoutMs: 240000 });
		commands.push(result);
		writeJSON(path.join(directory, `api-${commands.length}.json`), { endpoint, ...result });
		return JSON.parse(result.stdout);
	}

	const run = await api(`${prefix}/actions/runs/${runId}`);
	assert.equal(run.status, 'completed', 'run ainda não concluído');
	assert.equal(run.conclusion, 'success', 'run não aprovado');
	const workflow = await api(`${prefix}/actions/workflows/${run.workflow_id}`);
	const jobs = await readPages(
		(page) =>
			api(
				`${prefix}/actions/runs/${runId}/attempts/${run.run_attempt}/jobs?per_page=100&page=${page}`
			),
		'jobs'
	);
	assertServiceRun(run, workflow, jobs, { runId });
	const available = await readPages(
			(page) => api(`${prefix}/actions/runs/${runId}/artifacts?per_page=100&page=${page}`),
			'artifacts'
		),
		artifacts = [];

	for (const base of contract.receipt.artifactNames) {
		const name = `${base}-${run.run_attempt}`;
		const matching = available.filter((item) => item.name === name);
		assert.equal(matching.length, 1, `artefato ausente/duplicado: ${name}`);
		const artifact = matching[0];
		assert.equal(artifact.expired, false);
		assert.equal(artifact.workflow_run.id, runId);
		assert.match(artifact.digest, /^sha256:[a-f0-9]{64}$/);
		const zip = path.join(directory, `${name}.zip`);
		commands.push(
			await binaryDownload(
				'gh',
				['api', `${prefix}/actions/artifacts/${artifact.id}/zip`, ...headers],
				zip
			)
		);
		assert.equal(
			`sha256:${hash(readFileSync(zip))}`,
			artifact.digest,
			'digest ZIP divergente do serviço'
		);
		const extracted = path.join(directory, name);
		mkdirSync(extracted);
		const downloaded = await execute(
			'gh',
			[
				'run',
				'download',
				String(runId),
				'--repo',
				contract.repository,
				'--name',
				name,
				'--dir',
				extracted
			],
			{ timeoutMs: 240000 }
		);
		commands.push(downloaded);
		const proof = readJSON(path.join(extracted, 'evidence.json'));
		const files = verifyProofFiles(extracted, proof);
		assert.equal(proof.runId, runId);
		assert.equal(proof.attempt, run.run_attempt);
		assert.equal(proof.event, run.event);
		assert.equal(proof.status, 'passed');
		assert.equal(proof.headSha, expected.headSha);
		assert.ok(
			[proof.headSha, proof.checkoutSha].includes(run.head_sha),
			'revisão da API não corresponde ao head/checkout'
		);
		assertCheckoutRelation(proof, await api(`${prefix}/commits/${proof.checkoutSha}`));
		artifacts.push({
			id: artifact.id,
			name,
			digest: artifact.digest,
			zip,
			extracted,
			proof,
			files
		});
	}
	const current = await api(`${prefix}/actions/runs/${runId}`);
	assert.equal(current.run_attempt, run.run_attempt, 'run mudou durante verificação');
	assert.equal(current.status, 'completed');
	assert.equal(current.conclusion, 'success');
	const receipt = {
		schemaVersion: 1,
		status: 'passed',
		verifiedAt: new Date().toISOString(),
		runId,
		attempt: run.run_attempt,
		url: run.html_url,
		event: run.event,
		headSha: artifacts[0].proof.headSha,
		checkoutSha: artifacts[0].proof.checkoutSha,
		inputHash: expected.inputHash,
		contractsHash: expected.contractsHash,
		locks: expected.locks,
		jobs,
		artifacts,
		run,
		workflow,
		commands
	};
	validateCIReceipt(receipt, { ...expected, runId, attempt: run.run_attempt });
	const evidence = path.join(directory, 'evidence.json');
	writeJSON(evidence, receipt);
	return { evidence, runId, attempt: run.run_attempt, url: run.html_url };
}
