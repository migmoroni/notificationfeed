import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { builtinModules, createRequire } from 'node:module';
import { filesUnder, readJSON, hash } from './lib.mjs';
import {
	inspectDebt,
	inspectImports,
	semanticHash,
	assertSourceEdge,
	assertDebtBudget
} from '../checks/source-lib.mjs';

export function assertProductContracts(phase) {
	const root = process.cwd(),
		baseline = readJSON('tooling/maintenance/contracts/baseline.json');
	const roots = ['apps/web/src', 'packages/notfeed/src'];
	for (const old of ['src', 'static', 'src-tauri', 'apps/web/src/lib'])
		assert.ok(!existsSync(old), `árvore antiga ativa: ${old}`);
	const debt = [];
	for (const file of roots
		.flatMap((dir) => filesUnder(root, dir))
		.filter((file) => /\.(ts|js|svelte)$/.test(file))) {
		const source = readFileSync(file, 'utf8');
		debt.push(...inspectDebt(file, source).map((entry) => ({ file, ...entry })));
		const workspace = file.startsWith('packages/') ? 'packages/notfeed' : 'apps/web';
		const pkg = readJSON(`${workspace}/package.json`),
			declared = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies };
		const require = createRequire(path.join(root, workspace, 'package.json'));
		for (const specifier of inspectImports(file, source)) {
			let target = specifier;
			if (specifier.startsWith('.'))
				target = path.posix.normalize(path.posix.join(path.posix.dirname(file), specifier));
			else if (specifier === '@notfeed/product' || specifier.startsWith('@notfeed/product/'))
				target = path.relative(root, require.resolve(specifier));
			assertSourceEdge(file, specifier, target);
			if (specifier.startsWith('$')) {
				const allowed =
					workspace === 'packages/notfeed'
						? ['$app/navigation', '$app/environment']
						: ['$app/navigation', '$app/environment', '$app/state', '$service-worker'];
				assert.ok(allowed.includes(specifier), `${file}: módulo virtual desconhecido ${specifier}`);
				if (specifier === '$service-worker') assert.equal(file, 'apps/web/src/service-worker.ts');
				continue;
			}
			if (specifier.startsWith('.'))
				assert.ok(
					[target, target.replace(/\.js$/, '.ts'), `${target}/index.ts`, `${target}/index.js`].some(
						existsSync
					),
					`${file}: import sem arquivo ${specifier}`
				);
			else if (!builtinModules.includes(specifier) && !specifier.startsWith('node:')) {
				const name = specifier.startsWith('@')
					? specifier.split('/').slice(0, 2).join('/')
					: specifier.split('/')[0];
				assert.ok(declared[name], `${file}: dependência não declarada ${name}`);
			}
		}
	}
	assertDebtBudget(baseline.historicalRestrictions, debt);
	const config = readJSON('apps/web/tsconfig.json');
	assert.equal(config.compilerOptions.strict, true);
	assert.equal(config.compilerOptions.checkJs, true);
	for (const pattern of [
		'../../packages/notfeed/src/**/*.ts',
		'../../packages/notfeed/src/**/*.svelte',
		'../../packages/notfeed/src/**/*.js'
	])
		assert.ok(config.include.includes(pattern), `descoberta incompleta: ${pattern}`);
	if (phase === '2.1')
		for (const file of baseline.files.filter((file) => file.classification === 'product'))
			assert.equal(hash(readFileSync(file.path)), file.sha256, `2.1 alterou produto: ${file.path}`);
	for (const file of baseline.protected.files.filter(
		(file) => !file.path.endsWith('tauri.conf.json')
	)) {
		const source = readFileSync(file.path, 'utf8');
		const actual = file.path.endsWith('.json')
			? hash(JSON.stringify(JSON.parse(source)))
			: semanticHash(source);
		assert.equal(actual, file.semanticHash, `dado/permissão protegida alterada: ${file.path}`);
	}
	const tauri = readJSON('apps/desktop/src-tauri/tauri.conf.json');
	assert.equal(tauri.identifier, baseline.protected.desktopIdentifier);
	assert.equal(tauri.build.frontendDist, baseline.protected.desktopFrontendDist);
}
