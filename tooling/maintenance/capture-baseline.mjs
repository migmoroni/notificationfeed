import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execute } from '../checks/io.mjs';
import { readJSON, writeJSON, hash } from './lib.mjs';
import { npmGraph } from './inventory-lib.mjs';
import { assertUnitReport } from '../checks/unit-lib.mjs';
import { inspectDebt, semanticHash } from '../checks/source-lib.mjs';

const reference = readJSON('.artifacts/e2e/stage-2-entry.json');
const source = reference.source;
const recipe = readJSON('tooling/e2e/reference/stage-2-entry.json');
const tracked = (await execute('git', ['ls-files', '-z'], { cwd: source })).stdout
	.split('\0')
	.filter((file) => file && !file.endsWith('/state.md'))
	.sort();
const files = tracked.map((file) => ({
	path: file,
	sha256: hash(readFileSync(path.join(source, file))),
	classification: /^(apps|packages)\//.test(file)
		? 'product'
		: /^(tooling|scripts)\//.test(file)
			? 'tooling'
			: 'configuration-or-documentation'
}));
const inputHash = hash(files.map((file) => `${file.path}:${file.sha256}`).join('\n'));
assert.equal(inputHash, reference.inputHash);
const npm = npmGraph(readJSON(path.join(source, 'package-lock.json')));
const cargo = readJSON('/tmp/notfeed-stage2-cargo-all-metadata.json');
const cargoLinux = readJSON('/tmp/notfeed-stage2-cargo-metadata.json');
const cargoLock = readJSON('/tmp/notfeed-stage2-cargo-lock.json');
const compiled = new Set(
	readFileSync('/tmp/notfeed-stage2-cargo-features.txt', 'utf8')
		.split('\n')
		.map((line) => line.split('|')[0].split(' ').slice(0, 2).join(' '))
);
const cargoIds = new Map(
	cargo.packages.map((pkg) => [pkg.id, `${pkg.name}@${pkg.version}:${pkg.source ?? 'workspace'}`])
);
function canonicalCargoGraph(graph) {
	return {
		root: cargoIds.get(graph.root),
		nodes: graph.nodes.map((node) => ({
			...node,
			id: cargoIds.get(node.id),
			dependencies: node.dependencies.map((id) => cargoIds.get(id)),
			deps: node.deps.map((dep) => ({ ...dep, pkg: cargoIds.get(dep.pkg) }))
		}))
	};
}
const unit = readJSON('/tmp/notfeed-stage2-unit.json');
const tests = unit.testResults.flatMap((file) =>
	file.assertionResults.map((result) => ({
		file: path.relative(process.cwd(), file.name),
		fullName: result.fullName
	}))
);
assertUnitReport(unit, tests, process.cwd());
const historicalRestrictions = [],
	storageKeys = new Set();
for (const file of tracked.filter(
	(file) => /^(apps|packages|tooling)\//.test(file) && /\.(?:ts|js|mjs|svelte)$/.test(file)
)) {
	const text = readFileSync(path.join(source, file), 'utf8');
	historicalRestrictions.push(...inspectDebt(file, text).map((debt) => ({ file, ...debt })));
	if (/^(apps|packages)\//.test(file))
		for (const match of text.matchAll(/['"`](notfeed[^'"`\n]*)['"`]/g)) storageKeys.add(match[1]);
}
const versions = {};
for (const [name, command, args] of [
	['node', process.execPath, ['--version']],
	['npm', 'npm', ['--version']],
	['rust', 'rustc', ['--version']],
	['cargo', 'cargo', ['--version']],
	['cargo-audit', 'cargo', ['audit', '--version']]
])
	versions[name] = (await execute(command, args)).stdout.trim();
const manifest = readJSON('docs/plans/etapa-2-base-tecnica-e-ambiente/contracts/etapa-2.json');
const protectedFiles = [
	'packages/notfeed/src/config/back-settings.ts',
	'packages/notfeed/src/persistence/schema.ts',
	'packages/notfeed/src/domain/tree-export/tree-export.ts',
	'apps/desktop/src-tauri/tauri.conf.json',
	...tracked.filter((file) => file.startsWith('apps/desktop/src-tauri/capabilities/'))
];
const record = {
	schemaVersion: 1,
	revision: reference.checkpoint,
	inputHash,
	reconstruction: {
		referenceRecipe: 'tooling/e2e/reference/stage-2-entry.json',
		bundleHash: recipe.bundleHash,
		source
	},
	referenceRecipe: 'tooling/e2e/reference/stage-2-entry.json',
	files,
	lockfiles: ['package-lock.json', 'apps/desktop/src-tauri/Cargo.lock'].map((file) => ({
		file,
		sha256: hash(readFileSync(path.join(source, file)))
	})),
	graphHash: hash(JSON.stringify(npm)),
	dependencies: [
		...npm.nodes,
		...cargo.packages.map((pkg) => ({
			ecosystem: 'cargo',
			name: pkg.name,
			version: pkg.version,
			location: cargoIds.get(pkg.id),
			source: pkg.source,
			rustVersion: pkg.rust_version,
			compiled: compiled.has(`${pkg.name} v${pkg.version}`)
		}))
	],
	edges: npm.edges,
	rustGraph: canonicalCargoGraph(cargo.resolve),
	rustLinuxGraph: canonicalCargoGraph(cargoLinux.resolve),
	rustTarget: 'x86_64-unknown-linux-gnu',
	rustLockPackages: cargoLock.package,
	tests,
	historicalRestrictions,
	routes: tracked.filter((file) => file.startsWith('apps/web/src/routes/')),
	storageKeys: [...storageKeys].sort(),
	protected: {
		...manifest.protected,
		files: protectedFiles.map((file) => {
			const text = readFileSync(path.join(source, file), 'utf8');
			return {
				path: file,
				sha256: hash(text),
				semanticHash: file.endsWith('.json')
					? hash(JSON.stringify(JSON.parse(text)))
					: semanticHash(text)
			};
		})
	},
	environment: {
		os: os.platform(),
		architecture: os.arch(),
		release: os.release(),
		versions,
		browsers: readJSON('node_modules/playwright-core/browsers.json').browsers.filter((browser) =>
			browser.name.startsWith('chromium')
		),
		scripts: Object.fromEntries(
			[
				'package.json',
				...Object.keys(manifest.workspacePackages).map((dir) => `${dir}/package.json`)
			].map((file) => [file, readJSON(path.join(source, file)).scripts ?? {}])
		),
		gaps: [
			'npm workspace; no lint/formatter/CI/rust pin',
			'watch lacks UTC launcher',
			'dev/preview ports not strict',
			'active test scripts depend on historical tooling/migration'
		],
		nativePrerequisites: [
			'pkg-config',
			'webkit2gtk-4.1',
			'gtk+-3.0',
			'librsvg-2.0',
			'ayatana-appindicator3-0.1',
			'openssl',
			'objcopy',
			'patchelf'
		]
	},
	generation: {
		source: 'isolated reconstruction from versioned self-contained Git bundle',
		unitReport: '.artifacts/maintenance/2.1/diagnosis/inventory/unit.json',
		excludes: ['state.md', 'generated files, node_modules, build, target, .git']
	}
};
writeJSON('tooling/maintenance/contracts/baseline.json', record);
console.log(
	`Baseline: ${files.length} arquivos, ${npm.nodes.length} nós npm/${npm.edges.length} arestas, ${tests.length} testes, ${historicalRestrictions.length} ocorrências históricas.`
);
