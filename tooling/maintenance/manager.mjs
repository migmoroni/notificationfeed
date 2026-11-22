import { pnpmGraph } from '../checks/graph-lib.mjs';
import assert from 'node:assert/strict';
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execute } from '../checks/io.mjs';
import { assertSvelteSingleton } from '../checks/resolve.mjs';
import { readJSON, hash } from './lib.mjs';
import { canonicalGraph, graphDelta, assertGraphDelta } from './manager-lib.mjs';

export async function currentPnpmGraph() {
	const result = await execute('pnpm', [
		'list',
		'--recursive',
		'--lockfile-only',
		'--depth',
		'Infinity',
		'--json'
	]);
	return pnpmGraph(JSON.parse(result.stdout), process.cwd());
}
export async function assertManager(phase) {
	const contract = readJSON('tooling/maintenance/contracts/manager.json');
	const pkg = readJSON('package.json');
	assert.equal(pkg.packageManager, `pnpm@${contract.version}`);
	assert.equal(pkg.engines.pnpm, contract.version);
	assert.equal((await execute('pnpm', ['--version'])).stdout.trim(), contract.version);
	assert.ok(existsSync('pnpm-lock.yaml'));
	assert.ok(!existsSync('package-lock.json'), 'lock npm ativo');
	for (const [key, expected] of Object.entries({
		...contract.policies,
		allowBuilds: contract.allowBuilds
	})) {
		const actual = JSON.parse((await execute('pnpm', ['config', 'get', key, '--json'])).stdout);
		assert.deepEqual(actual, expected, `política pnpm divergente: ${key}`);
	}
	const maturity = JSON.parse(
		(await execute('pnpm', ['config', 'get', 'minimumReleaseAgeExclude', '--json'])).stdout
	);
	assert.deepEqual(
		maturity ?? [],
		contract.releaseAgeExceptions ?? [],
		'exceção de maturidade não revisada'
	);
	const overrides = JSON.parse(
		(await execute('pnpm', ['config', 'get', 'overrides', '--json'])).stdout
	);
	assert.deepEqual(overrides ?? {}, contract.overrides ?? {}, 'override não revisado');
	for (const file of [
		'package.json',
		...contract.workspaces.map((workspace) => `${workspace}/package.json`)
	]) {
		for (const command of Object.values(readJSON(file).scripts ?? {}))
			assert.ok(!/\bnpm\s/.test(command), `comando npm ativo: ${file}`);
	}
	assert.equal(readJSON('apps/web/package.json').dependencies['@notfeed/product'], 'workspace:*');
	const tauri = readJSON('apps/desktop/src-tauri/tauri.conf.json');
	assert.equal(tauri.build.beforeBuildCommand, 'pnpm --dir ../.. --filter @notfeed/web build');
	assert.equal(tauri.build.beforeDevCommand, 'pnpm --dir ../.. --filter @notfeed/web dev');
	assertSvelteSingleton(process.cwd());
	const graph = await currentPnpmGraph();
	assert.deepEqual(
		graph.nodes
			.filter((node) => node.workspace)
			.map((node) => node.location)
			.sort(),
		['', ...contract.workspaces].sort()
	);
	if (phase === '2.3') {
		const before = readJSON('tooling/maintenance/contracts/npm-before-pnpm.json');
		assert.equal(
			hash(readFileSync('apps/desktop/src-tauri/Cargo.lock')),
			before.cargoLockHash,
			'conversão alterou Cargo.lock'
		);
		const delta = graphDelta(canonicalGraph(before.graph, 'npm'), canonicalGraph(graph, 'pnpm'));
		assertGraphDelta(delta, readJSON('tooling/maintenance/contracts/manager-delta.json').decisions);
	}
	return graph;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	assert.equal(process.argv.length, 2);
	await assertManager('2.3');
	console.log('Gerenciador, políticas, consumidores e deltas aprovados.');
}
