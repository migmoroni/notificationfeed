import { artifactRoot, artifactScope, candidateCleanup } from '../checks/artifacts-lib.mjs';
import assert from 'node:assert/strict';
import {
	copyFileSync,
	existsSync,
	lstatSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	readlinkSync,
	realpathSync,
	symlinkSync
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	snapshot,
	assertStable,
	hash,
	runProcess,
	assertProcess,
	writeJSON,
	plan
} from './lib.mjs';
import { execute } from '../checks/io.mjs';
import { assertSvelteSingleton } from '../checks/resolve.mjs';
import { provisionPrebuild } from '../checks/download.mjs';
import { currentPnpmGraph } from './manager.mjs';

export async function assertLocalProduct(root) {
	const script =
		'import {createRequire} from "node:module";import {realpathSync} from "node:fs";import path from "node:path";const require=createRequire(path.join(process.argv[1],"apps/web/package.json"));console.log(realpathSync(require.resolve("@notfeed/product")));';
	const result = await execute(process.execPath, ['--input-type=module', '-e', script, root], {
		cwd: root
	});
	const actual = result.stdout.trim();
	const expected = realpathSync(path.join(root, 'packages/notfeed/src/index.ts'));
	assert.equal(actual, expected, 'produto não resolvido no workspace local');
}
export function assertLocks(before, after) {
	assert.ok(Object.keys(before).length === 2, 'locks JS e Rust obrigatórios');
	assert.deepEqual(after, before, 'instalação alterou locks');
}
export async function prepareCandidate(root, output) {
	const before = snapshot(root);
	mkdirSync(output, { recursive: true });
	const area = mkdtempSync(path.join(output, 'candidate-'));
	return await artifactScope(
		artifactRoot(),
		area,
		async () => {
			const candidate = path.join(area, 'source');
			mkdirSync(candidate);
			for (const entry of before.files) {
				const source = path.join(root, entry.path),
					target = path.join(candidate, entry.path);
				mkdirSync(path.dirname(target), { recursive: true });
				if (lstatSync(source).isSymbolicLink()) symlinkSync(readlinkSync(source), target);
				else copyFileSync(source, target);
			}
			copyFileSync(path.join(root, plan, 'state.md'), path.join(candidate, plan, 'state.md'));
			assertStable(before, snapshot(candidate));
			// Frozen installation of both ecosystems' existing lockfiles; Cargo is checked separately.
			const manager = JSON.parse(
				readFileSync(path.join(candidate, 'package.json'), 'utf8')
			).packageManager?.startsWith('pnpm@')
				? 'pnpm'
				: 'npm';
			const lockfiles = [
				manager === 'pnpm' ? 'pnpm-lock.yaml' : 'package-lock.json',
				'apps/desktop/src-tauri/Cargo.lock'
			];
			const locks = () =>
				Object.fromEntries(
					lockfiles.map((file) => [file, hash(readFileSync(path.join(candidate, file)))])
				);
			const lockBefore = locks();
			const cacheEnv = { npm_config_cache: path.join(area, 'npm-cache') };
			for (const cache of [
				cacheEnv.npm_config_cache,
				path.join(area, 'store'),
				path.join(area, 'cache')
			])
				assert.ok(!existsSync(cache), 'cache inicial não está vazio');
			const native = JSON.parse(
				readFileSync(path.join(candidate, 'tooling/checks/contracts/prebuild.json'), 'utf8')
			);
			const versions =
				manager === 'pnpm'
					? (await currentPnpmGraph()).nodes
							.filter((node) => node.name === native.package)
							.map((node) => node.version)
					: Object.entries(
							JSON.parse(readFileSync(path.join(candidate, 'package-lock.json'), 'utf8')).packages
						)
							.filter(
								([name]) =>
									name.endsWith(`/node_modules/${native.package}`) ||
									name === `node_modules/${native.package}`
							)
							.map(([, pkg]) => pkg.version);
			const downloads = [
				await provisionPrebuild(native, { cache: cacheEnv.npm_config_cache, versions })
			];
			const args =
				manager === 'pnpm'
					? [
							'install',
							'--frozen-lockfile',
							'--store-dir',
							path.join(area, 'store'),
							'--cache-dir',
							path.join(area, 'cache')
						]
					: ['ci', '--cache', path.join(area, 'npm-cache')];
			const result = await runProcess(manager, args, {
				cwd: candidate,
				log: path.join(area, 'install.log'),
				timeoutMs: 600000,
				env: cacheEnv
			});
			assertProcess(result);
			assertLocks(lockBefore, locks());
			assertStable(before, snapshot(candidate));
			await assertLocalProduct(candidate);
			let cached = null;
			if (manager === 'pnpm') {
				assertSvelteSingleton(candidate);
				cached = await runProcess(manager, [...args, '--offline'], {
					cwd: candidate,
					log: path.join(area, 'cached.log'),
					timeoutMs: 600000,
					env: cacheEnv
				});
				assertProcess(cached);
				assertLocks(lockBefore, locks());
				assertStable(before, snapshot(candidate));
			}
			const browserArgs =
				manager === 'pnpm'
					? ['exec', 'playwright', 'install', 'chromium']
					: ['exec', '--no', '--', 'playwright', 'install', 'chromium'];
			const browser = await runProcess(manager, browserArgs, {
				cwd: candidate,
				log: path.join(area, 'browser.log'),
				timeoutMs: 600000,
				env: { PLAYWRIGHT_SKIP_BROWSER_GC: '1' }
			});
			assertProcess(browser);
			assertLocks(lockBefore, locks());
			assertStable(before, snapshot(candidate));
			const evidence = {
				schemaVersion: 1,
				manager,
				candidate,
				inputHash: before.hash,
				finalHash: snapshot(candidate).hash,
				locks: lockBefore,
				command: result,
				cached,
				browser,
				downloads,
				caches: {
					store: path.join(area, 'store'),
					metadata: path.join(area, 'cache'),
					lifecycle: cacheEnv.npm_config_cache
				},
				cacheInitiallyEmpty: true,
				localProductResolved: true
			};
			writeJSON(path.join(area, 'evidence.json'), evidence);
			return { candidate, evidence: path.join(area, 'evidence.json') };
		},
		(status) => (status === 'failed' ? candidateCleanup(artifactRoot(), area) : [])
	);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	assert.equal(process.argv.length, 2, 'install.mjs não aceita flags para omitir verificações');
	const result = await prepareCandidate(
		process.cwd(),
		path.resolve('.artifacts/maintenance/install')
	);
	console.log(JSON.stringify(result));
}
