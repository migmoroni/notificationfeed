import { validateFinding } from '../checks/security-lib.mjs';
import assert from 'node:assert/strict';
import semver from 'semver';

export function materializePnpmDecisions(current, mapping, previous) {
	const reviewed = new Map(mapping.map((entry) => [entry.key, entry]));
	const original = new Map(previous.map((entry) => [entry.key, entry]));
	return current.map((finding) => {
		const entry = reviewed.get(finding.key);
		assert.ok(
			entry?.reason && entry.legacyKeys?.length,
			`classificação pnpm ausente: ${finding.key}`
		);
		assert.deepEqual(
			[...entry.paths].sort(),
			[...finding.path].sort(),
			`caminho pnpm novo requer revisão: ${finding.key}`
		);
		const decisions = entry.legacyKeys.map((key) => {
			assert.ok(original.has(key));
			return original.get(key);
		});
		const base = decisions[0];
		for (const decision of decisions) {
			for (const key of ['id', 'package', 'version']) assert.equal(decision[key], finding[key]);
			for (const key of ['group', 'urgent', 'exposure', 'status', 'condition', 'mitigationTest'])
				assert.deepEqual(decision[key], base[key], `classificação ambígua: ${finding.key}`);
		}
		return {
			...base,
			key: finding.key,
			path: finding.path,
			evidence: [...base.evidence, entry.reason],
			legacyKeys: entry.legacyKeys
		};
	});
}

export function filterNpmFindings(findings, lock) {
	return findings.flatMap((finding) => {
		const version = lock.packages[finding.node]?.version;
		assert.ok(semver.valid(version), `versão ausente/inválida: ${finding.node}`);
		assert.ok(semver.validRange(finding.affected), `faixa inválida: ${finding.affected}`);
		return semver.satisfies(version, finding.affected, { includePrerelease: true })
			? [{ ...finding, version }]
			: [];
	});
}

export function normalizeNpmAudit(report, exitCode) {
	assert.equal(report.auditReportVersion, 2, 'relatório npm inválido');
	assert.ok(report.vulnerabilities && report.metadata?.vulnerabilities && !report.error);
	assert.equal(Object.keys(report.vulnerabilities).length, report.metadata.vulnerabilities.total);
	assert.equal(
		exitCode,
		report.metadata.vulnerabilities.total > 0 ? 1 : 0,
		'auditor não terminou corretamente'
	);
	const entries = Object.entries(report.vulnerabilities).flatMap(([name, value]) => {
		assert.equal(value.name, name);
		assert.ok(Array.isArray(value.via) && Array.isArray(value.nodes) && value.nodes.length);
		return value.via.flatMap((advisory) => {
			if (typeof advisory === 'string') {
				assert.ok(report.vulnerabilities[advisory], `advisory herdado ausente: ${advisory}`);
				return [];
			}
			assert.ok(advisory.url && advisory.title && advisory.severity && advisory.range);
			return value.nodes.map((node) => ({
				key: `npm:${advisory.url.split('/').at(-1)}:${node}`,
				id: advisory.url.split('/').at(-1),
				ecosystem: 'npm',
				package: name,
				node,
				severity: advisory.severity,
				source: advisory.url,
				title: advisory.title,
				affected: advisory.range
			}));
		});
	});
	const merged = new Map();
	for (const entry of entries) {
		const existing = merged.get(entry.key);
		if (existing) existing.affected += ` || ${entry.affected}`;
		else merged.set(entry.key, { ...entry });
	}
	return [...merged.values()];
}

export function assertSecurityPolicy(findings, phase, today) {
	assert.ok(['2.1', '2.2', '2.3', '2.4', '2.5', '2.6', '2.7'].includes(phase));
	const keys = new Set();
	for (const finding of findings) {
		validateFinding(finding, today);
		assert.ok(!keys.has(finding.key), 'finding duplicado');
		keys.add(finding.key);
		if (phase === '2.1') continue;
		const pending = finding.exposure === 'applicable' && finding.status === 'scheduled';
		if (['2.2', '2.3'].includes(phase))
			assert.ok(!(pending && finding.urgent), `urgente pendente: ${finding.key}`);
		else assert.ok(!pending, `risco bloqueante: ${finding.key}`);
	}
}
export function validateRealized(records) {
	const names = ['baseline', 'toolchain', 'security', 'updates', 'lint-policy', 'ci-policy'];
	for (const name of names)
		assert.equal(records[name]?.schemaVersion, 1, `registro ausente/inválido: ${name}`);
	const baseline = records.baseline;
	assert.match(baseline.revision, /^[a-f0-9]{40}$/);
	for (const field of ['inputHash', 'graphHash']) assert.match(baseline[field], /^[a-f0-9]{64}$/);
	for (const field of [
		'files',
		'dependencies',
		'tests',
		'historicalRestrictions',
		'routes',
		'storageKeys'
	])
		assert.ok(Array.isArray(baseline[field]), field);
	assert.ok(baseline.files.length && baseline.dependencies.length && baseline.tests.length);
	assert.ok(baseline.referenceRecipe && baseline.environment && baseline.protected);
	const namesSeen = new Set();
	for (const tool of records.toolchain.tools) {
		assert.ok(tool.name && !namesSeen.has(tool.name));
		namesSeen.add(tool.name);
		assert.match(tool.version, /^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/);
		for (const field of [
			'current',
			'source',
			'consultedAt',
			'compatibility',
			'installation',
			'adoptionPhase'
		])
			assert.ok(tool[field]);
	}
	for (const required of [
		'node',
		'pnpm',
		'rust',
		'cargo-audit',
		'eslint',
		'@eslint/js',
		'globals',
		'typescript-eslint',
		'eslint-plugin-svelte',
		'eslint-config-prettier',
		'prettier',
		'prettier-plugin-svelte'
	])
		assert.ok(namesSeen.has(required), `ferramenta não selecionada: ${required}`);
	assert.ok(Array.isArray(records.updates.groups) && records.updates.groups.length);
	const groups = new Set();
	for (const group of records.updates.groups) {
		assert.ok(group.id && !groups.has(group.id));
		groups.add(group.id);
		assert.ok(
			group.dependencies.length && group.tests.length && group.sources.length && group.reason
		);
		assert.ok(['Base', 'Web', 'Desktop', 'Complete'].includes(group.profile));
		assert.ok(['2.2', '2.4', '2.5'].includes(group.phase));
		assert.ok(
			group.predecessor === null ||
				(groups.has(group.predecessor) && group.predecessor !== group.id)
		);
		for (const dependency of group.dependencies) {
			assert.ok(dependency.name && dependency.before);
			assert.match(dependency.after, /^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/);
		}
	}
	assert.ok(
		records['lint-policy'].files.length && Object.keys(records['lint-policy'].rules).length
	);
	assert.equal(records['lint-policy'].noInlineConfig, true);
	const ci = records['ci-policy'];
	assert.ok(ci.runner && ci.architecture && ci.integrationBranch && ci.jobs.length);
	assert.deepEqual(ci.events, ['pull_request', 'push', 'workflow_dispatch']);
	for (const action of ci.actions) assert.match(action.revision, /^[a-f0-9]{40}$/);
	assert.ok(records.security.reports.length >= 2);
	assert.equal(
		records.security.reviewStatus,
		'complete',
		'revisão de segurança ainda não concluída'
	);
	assert.ok(records.security.findings.every((finding) => groups.has(finding.group)));
	assertSecurityPolicy(records.security.findings, '2.1', records.security.evaluatedAt.slice(0, 10));
}
