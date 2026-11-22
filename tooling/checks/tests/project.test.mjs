import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
	copyFileSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	rmSync,
	symlinkSync,
	writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
	assertCheckCoverage,
	assertVitestCoverage,
	assertNoTestShortcuts
} from '../source-lib.mjs';
import { assertDataContract, assertActiveTooling } from '../project-lib.mjs';
import { assertUnitReport } from '../unit-lib.mjs';
import { readJSON, filesUnder, execute } from '../io.mjs';

test('descoberta exclui gerados conhecidos sem omitir pasta build de fontes ativas', () => {
	const root = mkdtempSync(path.join(tmpdir(), 'notfeed-discovery-'));
	try {
		for (const name of [
			'packages/notfeed/src/build/active.ts',
			'apps/web/build/generated.js',
			'.artifacts/output.js'
		]) {
			const file = path.join(root, name);
			mkdirSync(path.dirname(file), { recursive: true });
			writeFileSync(file, 'export {};');
		}
		assert.deepEqual(
			filesUnder(root).map((file) => path.relative(root, file)),
			['packages/notfeed/src/build/active.ts']
		);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test('cobertura real do tsconfig e Vitest recusa fonte omitida e execução parcial', () => {
	const root = mkdtempSync(path.join(tmpdir(), 'notfeed-coverage-'));
	const file = (name, content) => {
		const target = path.join(root, name);
		mkdirSync(path.dirname(target), { recursive: true });
		writeFileSync(target, content);
		return target;
	};
	try {
		const sources = [
			file('src/a.ts', 'export const a = 1;'),
			file('src/view.svelte', '<p>View</p>')
		];
		const config = file(
			'tsconfig.json',
			JSON.stringify({ compilerOptions: { strict: true, checkJs: true }, include: ['src/**/*'] })
		);
		assert.doesNotThrow(() => assertCheckCoverage(config, sources));
		writeFileSync(config, JSON.stringify({ include: ['src/**/*'], exclude: ['src/**/*.svelte'] }));
		assert.throws(() => assertCheckCoverage(config, sources));
		const additional = file(
			'tsconfig.worker.json',
			JSON.stringify({ include: ['src/**/*.svelte'] })
		);
		assert.doesNotThrow(() => assertCheckCoverage(config, sources, [additional]));
		writeFileSync(additional, JSON.stringify({ include: ['missing/**/*'] }));
		assert.throws(() => assertCheckCoverage(config, sources, [additional]));
		const tests = [
			file('src/a.test.ts', 'export {};'),
			file('packages/other/b.test.ts', 'export {};')
		];
		const vitest =
			"export default {test: {include: ['src/**/*.test.ts', 'packages/**/*.test.ts']}};";
		assert.doesNotThrow(() => assertVitestCoverage(vitest, tests, root));
		assert.throws(() =>
			assertVitestCoverage(vitest.replace(", 'packages/**/*.test.ts'", ''), tests, root)
		);
		assert.throws(() =>
			assertVitestCoverage(vitest.replace('include:', "exclude: ['**/*'], include:"), tests, root)
		);
		assert.throws(() => assertNoTestShortcuts('x.test.ts', "test.skip('case', () => {});"));
		assert.throws(() => assertNoTestShortcuts('x.test.ts', "describe.only('suite', () => {});"));
		assert.doesNotThrow(() =>
			assertNoTestShortcuts('x.test.ts', "const text = 'test.skip'; test('case', () => {});")
		);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test('contrato de dados preserva valores, stores, índices e formato sem hash de arquivo', () => {
	const contract = readJSON('tooling/checks/contracts/project.json').data;
	assert.doesNotThrow(() => assertDataContract(structuredClone(contract), contract));
	for (const mutate of [
		(value) => {
			value.persistence.dbName = 'other';
		},
		(value) => {
			value.persistence.dbSchemaVersion++;
		},
		(value) => {
			value.stores[0].keyPath = 'id';
		},
		(value) => {
			value.stores[0].indexes = [];
		},
		(value) => {
			value.treeExport.extension = '.json';
		},
		(value) => {
			value.treeExport.fields.pop();
		}
	]) {
		const value = structuredClone(contract);
		mutate(value);
		assert.throws(() => assertDataContract(value, contract));
	}
});

test('tooling permanente recusa import de fases e comandos históricos', () => {
	const root = mkdtempSync(path.join(tmpdir(), 'notfeed-boundary-'));
	try {
		mkdirSync(path.join(root, 'tooling/checks'), { recursive: true });
		writeFileSync(
			path.join(root, 'package.json'),
			JSON.stringify({ scripts: { check: 'node tooling/checks/x.mjs' } })
		);
		const file = path.join(root, 'tooling/checks/x.mjs');
		writeFileSync(file, "import fs from 'node:fs';");
		assert.doesNotThrow(() => assertActiveTooling(root));
		writeFileSync(file, "import {snapshot} from '../maintenance/lib.mjs';");
		assert.throws(() => assertActiveTooling(root));
		writeFileSync(file, "import {hash} from '../migration/lib.mjs';");
		assert.throws(() => assertActiveTooling(root));
		writeFileSync(file, "import fs from 'node:fs';");
		writeFileSync(
			path.join(root, 'package.json'),
			JSON.stringify({ scripts: { check: 'node tooling/migration/check.mjs' } })
		);
		assert.throws(() => assertActiveTooling(root));
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test('relatório permanente exige todos os casos sem falhas e permite casos acrescentados', () => {
	const expected = [{ file: 'src/a.test.ts', fullName: 'case' }];
	const report = {
		success: true,
		numTotalTests: 2,
		numPassedTests: 2,
		numFailedTests: 0,
		numPendingTests: 0,
		numTodoTests: 0,
		testResults: [
			{
				name: '/repo/src/a.test.ts',
				assertionResults: [
					{ fullName: 'case', status: 'passed' },
					{ fullName: 'new case', status: 'passed' }
				]
			}
		]
	};
	assert.doesNotThrow(() => assertUnitReport(report, expected, '/repo', { allowAdditional: true }));
	assert.throws(() => assertUnitReport(report, expected, '/repo'));
	assert.throws(() =>
		assertUnitReport({ ...report, numPendingTests: 1 }, expected, '/repo', {
			allowAdditional: true
		})
	);
	assert.throws(() =>
		assertUnitReport(report, [{ ...expected[0], fullName: 'omitted' }], '/repo', {
			allowAdditional: true
		})
	);
});

test('comandos permanentes e unitários executam sem diretórios e recibos de governança', async () => {
	const source = process.cwd();
	const root = mkdtempSync(path.join(tmpdir(), 'notfeed-independent-'));
	try {
		for (const file of filesUnder(source)) {
			const relative = path.relative(source, file);
			if (/^(?:tooling\/(?:migration|maintenance)|docs\/plans)(?:\/|$)/.test(relative)) continue;
			const target = path.join(root, relative);
			mkdirSync(path.dirname(target), { recursive: true });
			copyFileSync(file, target);
		}
		symlinkSync(path.join(source, 'node_modules'), path.join(root, 'node_modules'));
		symlinkSync(
			path.join(source, 'packages/notfeed/node_modules'),
			path.join(root, 'packages/notfeed/node_modules')
		);
		const modules = path.join(root, 'apps/web/node_modules');
		mkdirSync(modules);
		for (const name of readdirSync(path.join(source, 'apps/web/node_modules'))) {
			if (name === '@notfeed') continue;
			symlinkSync(path.join(source, 'apps/web/node_modules', name), path.join(modules, name));
		}
		mkdirSync(path.join(modules, '@notfeed'));
		symlinkSync(path.join(root, 'packages/notfeed'), path.join(modules, '@notfeed/product'));
		mkdirSync(path.join(root, 'apps/web/.svelte-kit'), { recursive: true });
		copyFileSync(
			path.join(source, 'apps/web/.svelte-kit/tsconfig.json'),
			path.join(root, 'apps/web/.svelte-kit/tsconfig.json')
		);
		for (const directory of [
			'tooling/migration',
			'tooling/maintenance',
			'docs/plans',
			'.artifacts/migration'
		])
			assert.equal(existsSync(path.join(root, directory)), false);
		for (const name of ['architecture', 'restrictions', 'contracts'])
			await execute(process.execPath, [`tooling/checks/${name}.mjs`], {
				cwd: root,
				timeoutMs: 30000
			});
		const output = path.join(root, '.artifacts/unit-independent.json');
		await execute(
			process.execPath,
			['../../tooling/checks/unit.mjs', '--reporter=json', `--outputFile=${output}`],
			{ cwd: path.join(root, 'apps/web'), timeoutMs: 120000 }
		);
		assertUnitReport(
			readJSON(output),
			readJSON('tooling/checks/contracts/unit.json').required,
			root
		);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
