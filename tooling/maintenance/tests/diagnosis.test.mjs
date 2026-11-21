import {
	normalizePnpmAudit,
	evaluateCurrentFindings,
	normalizeCargoAudit,
	validateFinding
} from '../../checks/security-lib.mjs';
import { assertUnitReport } from '../../checks/unit-lib.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
	normalizeNpmAudit,
	assertSecurityPolicy,
	validateRealized,
	filterNpmFindings,
	materializePnpmDecisions
} from '../diagnosis-lib.mjs';

const npm = {
	auditReportVersion: 2,
	vulnerabilities: {
		example: {
			name: 'example',
			nodes: ['node_modules/example'],
			severity: 'high',
			via: [
				{
					url: 'https://github.com/advisories/GHSA-example',
					title: 'unsafe request',
					severity: 'high',
					range: '<2'
				}
			]
		}
	},
	metadata: { vulnerabilities: { total: 1 } }
};
const finding = {
	key: 'npm:GHSA-example:node_modules/example',
	id: 'GHSA-example',
	ecosystem: 'npm',
	package: 'example',
	version: '1.0.0',
	path: ['app', 'example'],
	severity: 'high',
	source: 'https://github.com/advisories/GHSA-example',
	contexts: ['web'],
	preconditions: 'untrusted request',
	exposure: 'applicable',
	evidence: ['src/client.ts: request'],
	fixedVersion: '2.0.0',
	status: 'scheduled',
	group: 'network',
	urgent: true,
	reviewBy: '2026-12-01',
	graphHash: 'a'.repeat(64),
	mitigationTest: null
};
test('auditores exigem resposta completa e distinguem achado de erro de transporte', () => {
	assert.equal(normalizeNpmAudit(npm, 1).length, 1);
	const multipleRanges = structuredClone(npm);
	multipleRanges.vulnerabilities.example.via.push({
		...npm.vulnerabilities.example.via[0],
		range: '>=3 <4'
	});
	const merged = normalizeNpmAudit(multipleRanges, 1);
	assert.equal(merged.length, 1);
	assert.ok(merged[0].affected.includes('<2') && merged[0].affected.includes('>=3 <4'));
	assert.throws(() => normalizeNpmAudit(npm, 0));
	for (const bad of [{}, { error: { code: 'EAI_AGAIN' } }, { ...npm, vulnerabilities: {} }])
		assert.throws(() => normalizeNpmAudit(bad, 1));
	const cargo = {
		database: { 'last-commit': 'b'.repeat(40), 'advisory-count': 100 },
		lockfile: { 'dependency-count': 1 },
		vulnerabilities: { found: false, count: 0, list: [] },
		warnings: {}
	};
	assert.deepEqual(normalizeCargoAudit(cargo, 0), []);
	assert.throws(() => normalizeCargoAudit({ ...cargo, database: {} }, 0));
	assert.throws(() => normalizeCargoAudit(cargo, 1));
});
test('inventário aceita risco classificado; encerramento recusa pendente, desconhecido ou vencido', () => {
	assert.doesNotThrow(() => validateFinding(finding, '2026-11-20'));
	assert.doesNotThrow(() => assertSecurityPolicy([finding], '2.1', '2026-11-20'));
	for (const phase of ['2.2', '2.3', '2.4', '2.7'])
		assert.throws(() => assertSecurityPolicy([finding], phase, '2026-11-20'));
	for (const bad of [
		{ ...finding, status: 'unclassified' },
		{ ...finding, exposure: 'unknown' },
		{ ...finding, evidence: [] },
		{ ...finding, reviewBy: '2026-11-19' },
		{ ...finding, group: null }
	])
		assert.throws(() => validateFinding(bad, '2026-11-20'));
	const absent = {
		...finding,
		exposure: 'not-applicable',
		status: 'not-applicable',
		urgent: false,
		condition: 'static-spa-server-api-absent'
	};
	assert.doesNotThrow(() => assertSecurityPolicy([absent], '2.7', '2026-11-20'));
	assert.throws(() =>
		assertSecurityPolicy([{ ...finding, status: 'mitigated' }], '2.7', '2026-11-20')
	);
});
test('consulta atual recusa advisory novo, correção ainda vulnerável e condição ausente', () => {
	const current = [{ key: finding.key, package: finding.package, version: '1.0.0' }];
	assert.equal(
		evaluateCurrentFindings(current, [finding], () => {}, finding.graphHash)[0].status,
		'scheduled'
	);
	assert.throws(() =>
		evaluateCurrentFindings([{ ...current[0], key: 'new' }], [finding], () => {}, finding.graphHash)
	);
	assert.throws(() =>
		evaluateCurrentFindings(current, [{ ...finding, status: 'fixed' }], () => {}, finding.graphHash)
	);
	assert.throws(() =>
		evaluateCurrentFindings(
			current,
			[{ ...finding, status: 'not-applicable', exposure: 'not-applicable', condition: 'proof' }],
			() => {
				throw new Error('condition not proved');
			},
			finding.graphHash
		)
	);
});
test('identidades unitárias e resultados não admitem teste removido, omitido ou ignorado', () => {
	const tests = [{ file: 'packages/notfeed/src/example.test.ts', fullName: 'suite case' }];
	const report = {
		success: true,
		numTotalTests: 1,
		numPassedTests: 1,
		numFailedTests: 0,
		numPendingTests: 0,
		numTodoTests: 0,
		testResults: [
			{
				name: '/repo/packages/notfeed/src/example.test.ts',
				assertionResults: [{ fullName: 'suite case', status: 'passed' }]
			}
		]
	};
	assert.doesNotThrow(() => assertUnitReport(report, tests, '/repo'));
	for (const bad of [
		{ ...report, testResults: [] },
		{ ...report, numPendingTests: 1 },
		{
			...report,
			testResults: [
				{ ...report.testResults[0], assertionResults: [{ fullName: 'renamed', status: 'passed' }] }
			]
		}
	])
		assert.throws(() => assertUnitReport(bad, tests, '/repo'));
});
test('diagnóstico recusa registro ausente ou versão ainda não exata', () => {
	assert.throws(() => validateRealized({}));
	assert.throws(() =>
		validateRealized({ toolchain: { tools: [{ name: 'node', version: 'latest' }] } })
	);
});
test('cada faixa npm corresponde à versão concreta; prerelease, nó ausente e faixa inválida não escapam', () => {
	const audit = structuredClone(npm);
	audit.vulnerabilities.example.nodes.push('node_modules/nested/node_modules/example');
	const lock = {
		packages: {
			'node_modules/example': { version: '1.9.0' },
			'node_modules/nested/node_modules/example': { version: '2.1.0' }
		}
	};
	const selected = filterNpmFindings(normalizeNpmAudit(audit, 1), lock);
	assert.equal(selected.length, 1);
	assert.equal(selected[0].version, '1.9.0');
	assert.equal(selected[0].node, 'node_modules/example');
	const multiple = [{ ...selected[0], affected: '<1.0.0 || >=1.5 <2 || ^3.0.0' }];
	assert.equal(filterNpmFindings(multiple, lock).length, 1);
	assert.equal(
		filterNpmFindings([{ ...selected[0], affected: '>=2.0.0' }], {
			packages: { 'node_modules/example': { version: '2.1.0-beta.1' } }
		}).length,
		1
	);
	assert.throws(() => filterNpmFindings(selected, { packages: {} }));
	assert.throws(() => filterNpmFindings([{ ...selected[0], affected: 'invalid-range' }], lock));
});
test('auditoria pnpm conserva caminhos/versões e exige relatório completo e classificação equivalente', () => {
	const report = {
		advisories: {
			1: {
				module_name: 'example',
				github_advisory_id: 'GHSA-example',
				url: finding.source,
				title: 'unsafe request',
				severity: 'high',
				vulnerable_versions: '<2',
				findings: [{ version: '1.0.0', paths: ['apps__web>example'] }]
			}
		},
		metadata: {
			vulnerabilities: { info: 0, low: 0, moderate: 0, high: 1, critical: 0 },
			dependencies: 1,
			devDependencies: 0,
			optionalDependencies: 0,
			totalDependencies: 1
		}
	};
	const current = normalizePnpmAudit(report, 1);
	assert.equal(current.length, 1);
	assert.deepEqual(current[0].path, ['apps__web>example']);
	const mapping = [
		{
			key: current[0].key,
			legacyKeys: [finding.key],
			paths: current[0].path,
			reason: 'same advisory/version; reviewed graph'
		}
	];
	const decisions = materializePnpmDecisions(current, mapping, [finding]);
	assert.equal(decisions[0].group, finding.group);
	assert.throws(() => normalizePnpmAudit(report, 0));
	assert.throws(() => normalizePnpmAudit({ ...report, metadata: {} }, 1));
	assert.throws(() => materializePnpmDecisions(current, [], [finding]));
	assert.throws(() =>
		materializePnpmDecisions(current, mapping, [{ ...finding, version: '1.1.0' }])
	);
	assert.throws(() =>
		materializePnpmDecisions([{ ...current[0], path: ['other>example'] }], mapping, [finding])
	);
});
