import assert from 'node:assert/strict';
import { builtinModules, createRequire } from 'node:module';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { filesUnder, readJSON, execute } from './io.mjs';
import {
	inspectImports,
	assertSourceEdge,
	assertDebtBudget,
	inspectDebt,
	assertCheckCoverage,
	assertVitestCoverage,
	assertNoTestShortcuts,
	readCompilerConfig
} from './source-lib.mjs';
import { assertSvelteSingleton } from './resolve.mjs';

const isSource = (file) => /\.(?:js|mjs|cjs|ts|svelte)$/.test(file);
const configuration = (root) => readJSON(path.join(root, 'tooling/checks/contracts/project.json'));
const productFiles = (root, contract) =>
	contract.sources.flatMap((directory) => filesUnder(path.join(root, directory))).filter(isSource);

export function assertActiveTooling(root) {
	for (const directory of ['tooling/checks', 'tooling/e2e']) {
		for (const file of filesUnder(path.join(root, directory)).filter(isSource)) {
			for (const specifier of inspectImports(file, readFileSync(file, 'utf8'), {
				allowComputed: true
			})) {
				const target = specifier.startsWith('.')
					? path.relative(root, path.resolve(path.dirname(file), specifier))
					: specifier;
				assert.ok(
					!/(?:^|\/)tooling\/(?:maintenance|migration)(?:\/|$)/.test(target),
					`${file}: dependência de fase ${specifier}`
				);
				assert.ok(
					!target.startsWith('../maintenance/') && !target.startsWith('../migration/'),
					`${file}: dependência histórica`
				);
			}
		}
	}
	for (const relative of ['', 'apps/web', 'apps/desktop', 'packages/notfeed']) {
		const manifest = path.join(root, relative, 'package.json');
		if (!existsSync(manifest)) continue;
		for (const command of Object.values(readJSON(manifest).scripts ?? {}))
			assert.ok(
				!/tooling\/(?:migration|maintenance)\//.test(command),
				`${manifest}: comando cotidiano depende de fase`
			);
	}
}

export function assertArchitecture(root = process.cwd()) {
	const contract = configuration(root);
	assertActiveTooling(root);
	for (const [directory, name] of Object.entries(contract.workspaces))
		assert.equal(readJSON(path.join(root, directory, 'package.json')).name, name);
	assert.equal(
		readJSON(path.join(root, 'apps/web/package.json')).dependencies['@notfeed/product'],
		'workspace:*'
	);
	assert.deepEqual(
		readJSON(path.join(root, contract.product, 'package.json')).exports,
		contract.exports
	);
	const packageRoot = realpathSync(path.join(root, contract.product));
	const webRequire = createRequire(path.join(root, 'apps/web/package.json'));
	assert.equal(
		webRequire.resolve('@notfeed/product'),
		path.join(packageRoot, 'src/index.ts'),
		'produto externo ao workspace'
	);
	assertSvelteSingleton(root);
	for (const file of productFiles(root, contract)) {
		const relative = path.relative(root, file),
			workspace = relative.startsWith('packages/') ? contract.product : 'apps/web';
		const pkg = readJSON(path.join(root, workspace, 'package.json'));
		const declared = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies };
		const require = createRequire(path.join(root, workspace, 'package.json'));
		for (const specifier of inspectImports(relative, readFileSync(file, 'utf8'))) {
			let target = specifier;
			if (specifier.startsWith('.'))
				target = path.relative(root, path.resolve(path.dirname(file), specifier));
			else if (specifier === '@notfeed/product' || specifier.startsWith('@notfeed/product/')) {
				const resolved = require.resolve(specifier);
				assert.ok(resolved.startsWith(`${packageRoot}${path.sep}`), 'export fora do pacote local');
				target = path.relative(root, resolved);
			}
			assertSourceEdge(relative, specifier, target);
			if (specifier.startsWith('$')) {
				const allowed = contract.virtualImports[workspace === contract.product ? 'product' : 'web'];
				assert.ok(allowed.includes(specifier), `${relative}: módulo virtual desconhecido`);
				if (specifier === '$service-worker')
					assert.equal(relative, 'apps/web/src/service-worker.ts');
			} else if (specifier.startsWith('.')) {
				assert.ok(!target.startsWith('..'), `${relative}: import externo ao repositório`);
				assert.ok(
					[target, target.replace(/\.js$/, '.ts'), `${target}/index.ts`, `${target}/index.js`].some(
						(value) => existsSync(path.join(root, value))
					),
					`${relative}: import sem arquivo ${specifier}`
				);
			} else if (!specifier.startsWith('node:') && !builtinModules.includes(specifier)) {
				const name = specifier.startsWith('@')
					? specifier.split('/').slice(0, 2).join('/')
					: specifier.split('/')[0];
				assert.ok(declared[name], `${relative}: dependência não declarada ${name}`);
			}
		}
	}
}

export function assertRestrictions(root = process.cwd()) {
	const contract = configuration(root);
	const active = filesUnder(root).filter(
		(file) => isSource(file) && !path.relative(root, file).startsWith('tooling/migration/')
	);
	const debt = active.flatMap((file) => {
		const relative = path.relative(root, file),
			source = readFileSync(file, 'utf8');
		if (/\.(?:test|spec)\.[cm]?[jt]s$/.test(file)) assertNoTestShortcuts(relative, source);
		return inspectDebt(relative, source).map((entry) => ({ file: relative, ...entry }));
	});
	assertDebtBudget(
		readJSON(path.join(root, 'tooling/checks/contracts/restrictions.json')).allowed,
		debt
	);
}

export function assertDataContract(actual, expected) {
	assert.deepEqual(actual, expected, 'banco/schema/formato de exportação alterado');
}

export async function assertProjectContracts(root = process.cwd()) {
	const contract = configuration(root);
	for (const [name, command] of Object.entries(contract.publicCommands))
		assert.equal(
			readJSON(path.join(root, 'package.json')).scripts[name],
			command,
			`comando público ausente/divergente: ${name}`
		);
	const workspaces = JSON.parse(
		(await execute('pnpm', ['config', 'get', 'packages', '--json'], { cwd: root })).stdout
	);
	assert.deepEqual(workspaces, Object.keys(contract.workspaces), 'topologia workspace divergente');
	assert.equal(
		readJSON(path.join(root, 'apps/web/package.json')).scripts.check,
		contract.typeCommand,
		'comando de tipos não cobre os dois projetos'
	);
	const configs = contract.typeConfigs.map((file) => path.join(root, file));
	for (const file of configs)
		for (const key of ['strict', 'checkJs', 'allowJs'])
			assert.equal(readCompilerConfig(file).options[key], true, `tipos relaxados: ${key}`);
	assertCheckCoverage(configs[0], productFiles(root, contract), configs.slice(1));
	const tests = productFiles(root, contract).filter((file) => file.endsWith('.test.ts'));
	assertVitestCoverage(
		readFileSync(path.join(root, contract.testConfig), 'utf8'),
		tests,
		path.join(root, 'apps/web')
	);
	for (const file of tests) assertNoTestShortcuts(file, readFileSync(file, 'utf8'));
	const required = readJSON(path.join(root, 'tooling/checks/contracts/unit.json')).required;
	assert.ok(required.length);
	for (const identity of required)
		assert.ok(
			tests.includes(path.join(root, identity.file)),
			`arquivo de teste obrigatório ausente: ${identity.file}`
		);
	const load = (file) => import(pathToFileURL(path.join(root, file)).href);
	const settings = await load('packages/notfeed/src/config/back-settings.ts');
	const schema = await load('packages/notfeed/src/persistence/schema.ts');
	const exported = await load('packages/notfeed/src/domain/tree-export/tree-export.ts');
	const treeSource = ts.createSourceFile(
		'tree-export.ts',
		readFileSync(path.join(root, 'packages/notfeed/src/domain/tree-export/tree-export.ts'), 'utf8'),
		ts.ScriptTarget.Latest,
		true
	);
	const treeInterface = treeSource.statements.find(
		(node) => ts.isInterfaceDeclaration(node) && node.name.text === 'TreeExport'
	);
	assert.ok(treeInterface, 'interface pública de exportação ausente');
	assertDataContract(
		{
			persistence: {
				dbName: settings.PERSISTENCE.dbName,
				dbSchemaVersion: settings.PERSISTENCE.dbSchemaVersion
			},
			stores: schema.STORE_SPECS,
			treeExport: {
				extension: exported.TREE_EXPORT_EXTENSION,
				mime: exported.TREE_EXPORT_MIME,
				fields: treeInterface.members.map((member) => member.name.getText(treeSource))
			}
		},
		contract.data
	);
	const desktop = readJSON(path.join(root, 'apps/desktop/src-tauri/tauri.conf.json'));
	assert.equal(desktop.identifier, contract.desktop.identifier);
	assert.equal(desktop.version, contract.desktop.version);
	assert.equal(desktop.build.frontendDist, contract.desktop.frontendDist);
	assert.deepEqual(
		readJSON(path.join(root, 'apps/desktop/src-tauri/capabilities/default.json')),
		contract.desktop.capabilities
	);
}
