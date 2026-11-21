import assert from 'node:assert/strict';
import { lstatSync, readFileSync, readlinkSync } from 'node:fs';
import path from 'node:path';
import { filesUnder, hash, readJSON } from './io.mjs';

export function classifyImpact(files, { historyAvailable = true, forceFull = false } = {}) {
	const documentation = (file) =>
		/\.md$/i.test(file) &&
		!file.startsWith('.github/') &&
		(!file.startsWith('docs/plans/') || /(?:^|\/)state\.md$/.test(file));
	const complete =
		forceFull || !historyAvailable || !files.length || files.some((file) => !documentation(file));
	return {
		profile: complete ? 'complete' : 'docs',
		requiredJobs: complete
			? ['impact', 'web', 'desktop', 'integration']
			: ['impact', 'integration'],
		reason: forceFull
			? 'explicit full request'
			: !historyAvailable
				? 'comparison history unavailable'
				: complete
					? 'runtime/shared/contracts/native/unknown'
					: 'documentation only',
		files
	};
}
export function ciFingerprint(root = process.cwd()) {
	const files = filesUnder(root)
		.filter((file) => !/^docs\/(?:.*\/)?state\.md$/.test(path.relative(root, file)))
		.map((file) => ({
			path: path.relative(root, file),
			sha256: hash(lstatSync(file).isSymbolicLink() ? readlinkSync(file) : readFileSync(file))
		}));
	const contracts = files.filter((file) => file.path.startsWith('tooling/checks/contracts/'));
	const locks = ['pnpm-lock.yaml', 'apps/desktop/src-tauri/Cargo.lock'].flatMap((name) =>
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
export function assertCIJobs(needs, profile) {
	assert.ok(['docs', 'complete'].includes(profile));
	assert.equal(needs.impact?.result, 'success', 'impact ausente/falho');
	for (const name of ['web', 'desktop']) {
		assert.ok(needs[name], `job ausente: ${name}`);
		if (profile === 'complete')
			assert.equal(needs[name].result, 'success', `job obrigatório falhou/omitido: ${name}`);
		else assert.ok(['success', 'skipped'].includes(needs[name].result), `job falhou: ${name}`);
	}
}
export function validateCIReceipt(receipt, expected) {
	const contract = readJSON(new URL('./contracts/ci.json', import.meta.url));
	assert.equal(receipt.schemaVersion, 1);
	assert.equal(receipt.status, 'passed');
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
	assert.equal(receipt.artifacts.length, 2);
	for (const base of contract.receipt.artifactNames) {
		const artifact = receipt.artifacts.find((item) => item.name === `${base}-${receipt.attempt}`);
		assert.ok(artifact, `artefato ausente: ${base}`);
		assert.match(artifact.digest, /^sha256:[a-f0-9]{64}$/);
		assert.ok(Number.isInteger(artifact.id) && artifact.id > 0);
		assert.equal(artifact.proof.status, 'passed');
		assert.equal(artifact.proof.job, base.slice('proof-'.length));
		for (const field of ['headSha', 'checkoutSha', 'inputHash', 'contractsHash', 'locks'])
			assert.deepEqual(artifact.proof[field], receipt[field], `artefato divergente: ${field}`);
		assert.ok(artifact.files.length);
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
