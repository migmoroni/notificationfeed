import assert from 'node:assert/strict';
import {
	closeSync,
	existsSync,
	lstatSync,
	mkdirSync,
	openSync,
	readdirSync,
	rmSync,
	writeFileSync
} from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { readJSON, writeJSON } from './io.mjs';

const policy = readJSON(new URL('./contracts/artifacts.json', import.meta.url));
export function artifactRoot() {
	return path.resolve(process.env.NOTFEED_ARTIFACT_ROOT ?? '.artifacts');
}
function assertInside(root, target) {
	assert.equal(path.basename(root), '.artifacts', 'fronteira deve ser .artifacts');
	const relative = path.relative(root, target);
	assert.ok(
		relative && !relative.startsWith('..') && !path.isAbsolute(relative),
		`fora da fronteira: ${target}`
	);
	for (const part of ['', ...relative.split(path.sep)]) {
		root = path.join(root, part);
		assert.ok(
			!lstatSync(root, { throwIfNoEntry: false })?.isSymbolicLink(),
			`componente simbólico: ${root}`
		);
	}
}
function safeTargets(root, area, payloads) {
	assertInside(root, area);
	return payloads.map((relative) => {
		const target = path.resolve(area, relative);
		assertInside(root, target);
		assert.ok(target.startsWith(`${area}${path.sep}`), `fora da fronteira da área: ${target}`);
		return target;
	});
}
export function pruneArtifactPayloads(root, area, payloads) {
	const targets = safeTargets(root, area, payloads);
	return removeTargets(targets);
}
function removeTargets(targets) {
	const removed = [];
	for (const target of targets)
		if (existsSync(target)) {
			rmSync(target, { recursive: true, force: true });
			removed.push(target);
		}
	return removed;
}
export function acquireArtifactLease(root, area) {
	assertInside(root, area);
	const lock = path.join(root, '.cleanup.lock');
	assert.ok(!existsSync(lock), 'limpeza em curso');
	const leases = path.join(root, '.leases');
	mkdirSync(leases, { recursive: true });
	assertInside(root, leases);
	const lease = path.join(leases, `${randomUUID()}.json`);
	writeFileSync(
		lease,
		JSON.stringify({ area, pid: process.pid, startedAt: new Date().toISOString() }),
		{ flag: 'wx' }
	);
	if (existsSync(lock)) {
		rmSync(lease);
		throw new Error('limpeza em curso');
	}
	return () => rmSync(lease, { force: true });
}
export async function artifactScope(root, area, work, cleanup = () => []) {
	const release = acquireArtifactLease(root, area);
	let result, failure, cleanupFailure;
	try {
		result = await work();
	} catch (error) {
		failure = error;
	}
	try {
		const removed = cleanup(failure ? 'failed' : 'passed');
		writeJSON(path.join(area, 'retention.json'), {
			workStatus: failure ? 'failed' : 'passed',
			removed,
			finishedAt: new Date().toISOString()
		});
	} catch (error) {
		cleanupFailure = error;
	} finally {
		release();
	}
	if (failure && cleanupFailure)
		throw new AggregateError(
			[failure, cleanupFailure],
			`${failure.message}; limpeza falhou: ${cleanupFailure.message}`
		);
	if (failure) throw failure;
	if (cleanupFailure) throw cleanupFailure;
	return result;
}

export function candidateCleanup(root, area) {
	return [
		...pruneArtifactPayloads(root, area, policy.candidatePayloads),
		...removeTargets(planArtifactCleanup(path.join(area, 'source/.artifacts')))
	];
}
export function workspaceCleanup(root, area, kind) {
	assert.ok(['reference', 'native', 'security'].includes(kind));
	return pruneArtifactPayloads(root, area, policy[`${kind}Payloads`]);
}
function planArtifactCleanup(root, { caches = false } = {}) {
	if (!existsSync(root)) return [];
	const targets = [];
	function children(relative, pattern) {
		const directory = path.join(root, relative);
		assertInside(root, directory);
		if (!existsSync(directory)) return [];
		return readdirSync(directory)
			.filter((name) => pattern.test(name))
			.map((name) => {
				const area = path.join(directory, name);
				assertInside(root, area);
				assert.ok(lstatSync(area).isDirectory(), `área não é diretório: ${area}`);
				return area;
			});
	}
	for (const area of children('maintenance/install', /^candidate-[\w-]+$/)) {
		targets.push(...safeTargets(root, area, policy.candidatePayloads));
		targets.push(...planArtifactCleanup(path.join(area, 'source/.artifacts')));
	}
	for (const run of children('provision', /^[a-f0-9-]{36}$/)) {
		for (const name of readdirSync(run).filter((name) => /^candidate-[\w-]+$/.test(name))) {
			const area = path.join(run, name);
			targets.push(...safeTargets(root, area, policy.candidatePayloads));
			targets.push(...planArtifactCleanup(path.join(area, 'source/.artifacts')));
		}
	}
	for (const area of children('setup', /^(?:[a-f0-9-]{36}|prebuild-[\w-]+)$/))
		targets.push(...safeTargets(root, area, ['npm-cache', 'audit-target']));
	for (const [directory, pattern, kind] of [
		['e2e/reproduction', /^(?:stage-2-[\w-]+|\d+)$/, 'reference'],
		['security', /^current-[\w-]+$/, 'security'],
		['native', /^current-[\w-]+$/, 'native']
	])
		for (const area of children(directory, pattern))
			targets.push(...safeTargets(root, area, policy[`${kind}Payloads`]));
	// Historical inspectors used fixed extraction paths; their reports stay in native/.
	targets.push(...safeTargets(root, path.join(root, 'native'), ['extracted', 'sections']));
	if (caches)
		for (const relative of policy.optionalCaches) {
			const target = path.join(root, relative);
			assertInside(root, target);
			targets.push(target);
		}
	return targets;
}
export async function cleanArtifacts(root, { caches = false, dryRun = false } = {}) {
	mkdirSync(root, { recursive: true });
	assert.equal(path.basename(root), '.artifacts', 'fronteira deve ser .artifacts');
	assert.ok(!lstatSync(root).isSymbolicLink(), 'raiz simbólica');
	const lock = path.join(root, '.cleanup.lock');
	const fd = openSync(lock, 'wx');
	try {
		const leases = path.join(root, '.leases');
		assertInside(root, leases);
		assert.ok(
			!existsSync(leases) || readdirSync(leases).length === 0,
			'artefatos em uso; inspecione os leases antes de limpar'
		);
		const targets = planArtifactCleanup(root, { caches }).filter((file) => existsSync(file));
		return { dryRun, caches, removed: dryRun ? [] : removeTargets(targets), targets };
	} finally {
		closeSync(fd);
		rmSync(lock);
	}
}
