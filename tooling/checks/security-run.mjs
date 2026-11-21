import { artifactRoot, artifactScope, workspaceCleanup } from './artifacts-lib.mjs';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { execute, hash, readJSON, writeJSON } from './io.mjs';
import {
	normalizePnpmAudit,
	normalizeCargoAudit,
	evaluatePermanentFindings
} from './security-lib.mjs';
import { pnpmGraph } from './graph-lib.mjs';
import { browserContext, assertBrowserCondition } from './exposure.mjs';

export async function collectSecurity() {
	mkdirSync('.artifacts/security', { recursive: true });
	const directory = path.resolve(mkdtempSync('.artifacts/security/current-'));
	return await artifactScope(
		artifactRoot(),
		directory,
		async () => {
			const locks = ['pnpm-lock.yaml', 'apps/desktop/src-tauri/Cargo.lock'].map((file) => ({
				file,
				sha256: hash(readFileSync(file))
			}));
			const commands = [];
			async function run(id, command, args, normalizer) {
				let result;
				try {
					result = await execute(command, args, { timeoutMs: 900000 });
				} catch (error) {
					result = JSON.parse(error.message);
					assert.ok(
						normalizer && result.code === 1 && !result.signal && !result.timedOut && !result.error,
						`auditor/comando interrompido: ${id}\n${error.message}`
					);
				}
				const output = path.join(directory, `${id}.stdout`),
					stderr = path.join(directory, `${id}.stderr`);
				writeJSON(path.join(directory, `${id}.command.json`), result);
				writeFileSync(output, result.stdout);
				writeFileSync(stderr, result.stderr);
				commands.push({ id, ...result, output, stderrPath: stderr });
				const parsed = JSON.parse(result.stdout);
				return normalizer ? normalizer(parsed, result.code) : parsed;
			}
			const js = await run('pnpm-audit', 'pnpm', ['audit', '--json'], normalizePnpmAudit);
			const cargo = await run(
				'cargo-audit',
				'cargo',
				['audit', '--json', '--db', path.join(directory, 'rustsec'), '--file', locks[1].file],
				normalizeCargoAudit
			);
			const treeArgs = [
				'--locked',
				'--manifest-path',
				'apps/desktop/src-tauri/Cargo.toml',
				'--prefix',
				'none'
			];
			async function tree(id, edges, format) {
				const result = await execute('cargo', [
					'tree',
					...treeArgs,
					'--edges',
					edges,
					'--format',
					format
				]);
				commands.push({ id, ...result });
				return result.stdout
					.split('\n')
					.filter(Boolean)
					.map((line) => line.split('|')[0].split(' ').slice(0, 2).join(' '));
			}
			const compiled = await tree('cargo-tree', 'normal,build,dev', '{p}|{f}');
			const runtime = await tree('cargo-normal-tree', 'normal', '{p}');
			const metadata = await run('cargo-metadata', 'cargo', [
				'metadata',
				'--locked',
				'--format-version',
				'1',
				'--filter-platform',
				'x86_64-unknown-linux-gnu',
				'--manifest-path',
				'apps/desktop/src-tauri/Cargo.toml'
			]);
			const graph = pnpmGraph(
				await run('pnpm-graph', 'pnpm', [
					'list',
					'--recursive',
					'--lockfile-only',
					'--depth',
					'Infinity',
					'--json'
				]),
				process.cwd()
			);
			for (const finding of js)
				assert.ok(
					graph.nodes.some(
						(node) => node.name === finding.package && node.version === finding.version
					),
					`advisory fora do grafo: ${finding.key}`
				);
			const tools = readJSON('tooling/checks/contracts/tools.json');
			for (const [command, args, expected] of [
				['pnpm', ['--version'], tools.pnpm],
				['cargo-audit', ['--version'], `cargo-audit ${tools.cargoAudit}`]
			]) {
				const result = await execute(command, args);
				commands.push({ id: `${command}-version`, ...result });
				assert.equal(result.stdout.trim(), expected);
			}
			for (const lock of locks)
				assert.equal(hash(readFileSync(lock.file)), lock.sha256, 'auditoria alterou lock');
			const receipt = {
				schemaVersion: 1,
				status: 'collected',
				collectedAt: new Date().toISOString(),
				locks,
				commands,
				findings: [...js, ...cargo],
				graphs: { npm: hash(JSON.stringify(graph)), cargo: locks[1].sha256 },
				compiled,
				runtime,
				metadata
			};
			writeJSON(path.join(directory, 'collection.json'), receipt);
			return { directory, receipt };
		},
		() => workspaceCleanup(artifactRoot(), directory, 'security')
	);
}
function rustSources(directory) {
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		if (['.git', 'target'].includes(entry.name)) return [];
		const file = path.join(directory, entry.name);
		return entry.isDirectory() ? rustSources(file) : entry.name.endsWith('.rs') ? [file] : [];
	});
}
export function exposureProver(collection, policy) {
	const compiled = new Set(collection.compiled),
		runtime = new Set(collection.runtime);
	const context = browserContext(),
		cache = new Set();
	const prove = (finding) => {
		const identity = `${finding.condition}:${finding.package}@${finding.version}`;
		if (cache.has(identity)) return;
		const condition = finding.condition;
		if (condition === 'rust-package-not-compiled')
			assert.ok(
				!compiled.has(`${finding.package} v${finding.version}`),
				`crate passou a compilar: ${finding.key}`
			);
		else if (condition === 'glib-variant-iterator-unused') {
			const proof = policy.glibProof;
			assert.equal(finding.version, proof.version);
			const glib = collection.metadata.packages.find(
				(pkg) => pkg.name === 'glib' && pkg.version === proof.version
			);
			assert.ok(glib);
			for (const file of proof.files)
				assert.equal(
					hash(readFileSync(path.join(path.dirname(glib.manifest_path), file.path))),
					file.sha256
				);
			for (const pkg of collection.metadata.packages.filter(
				(pkg) => pkg.name !== 'glib' && compiled.has(`${pkg.name} v${pkg.version}`)
			))
				for (const file of rustSources(path.dirname(pkg.manifest_path)))
					assert.ok(
						!/VariantStrIter|array_iter_str/.test(readFileSync(file, 'utf8')),
						`chamada glib requer reavaliação: ${file}`
					);
		} else if (condition === 'rand-buildtime-precondition-absent') {
			assert.ok(!runtime.has(`rand v${finding.version}`));
			for (const file of rustSources('apps/desktop/src-tauri/src'))
				assert.ok(!/set_logger|set_boxed_logger|rand::rng\s*\(/.test(readFileSync(file, 'utf8')));
		} else assertBrowserCondition(condition, context);
		cache.add(identity);
	};
	return { prove, conditions: cache };
}
export async function checkSecurity() {
	const { directory, receipt } = await collectSecurity();
	const policy = readJSON('tooling/checks/contracts/security.json');
	const { prove, conditions } = exposureProver(receipt, policy);
	const findings = evaluatePermanentFindings(receipt.findings, policy, prove, {
		today: new Date().toISOString().slice(0, 10),
		graphs: receipt.graphs
	});
	const evidence = path.join(directory, 'evidence.json');
	writeJSON(evidence, {
		...receipt,
		status: 'passed',
		findings,
		provedConditions: [...conditions],
		policyHash: hash(JSON.stringify(policy)),
		scope: 'Current online audit and revalidated exposure; not zero raw advisories'
	});
	return {
		evidence,
		findings: findings.length,
		urgent: findings.filter((finding) => finding.urgent && finding.status === 'scheduled').length
	};
}
