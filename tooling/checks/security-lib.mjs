import assert from 'node:assert/strict';
import semver from 'semver';

export function normalizePnpmAudit(report, exitCode) {
	assert.ok(report.advisories && report.metadata?.vulnerabilities && !report.error);
	const severities = ['info', 'low', 'moderate', 'high', 'critical'];
	const counts = report.metadata.vulnerabilities;
	for (const key of severities) assert.ok(Number.isInteger(counts[key]) && counts[key] >= 0);
	for (const key of [
		'dependencies',
		'devDependencies',
		'optionalDependencies',
		'totalDependencies'
	])
		assert.ok(Number.isInteger(report.metadata[key]) && report.metadata[key] >= 0);
	assert.equal(
		Object.keys(report.advisories).length,
		severities.reduce((sum, key) => sum + counts[key], 0)
	);
	assert.equal(exitCode, severities.slice(1).some((key) => counts[key] > 0) ? 1 : 0);
	const result = new Map();
	for (const advisory of Object.values(report.advisories)) {
		const id = advisory.github_advisory_id;
		assert.ok(
			id &&
				advisory.url?.endsWith(id) &&
				advisory.title &&
				advisory.module_name &&
				severities.includes(advisory.severity)
		);
		assert.ok(semver.validRange(advisory.vulnerable_versions));
		assert.ok(Array.isArray(advisory.findings) && advisory.findings.length);
		for (const finding of advisory.findings) {
			assert.ok(
				semver.valid(finding.version) &&
					semver.satisfies(finding.version, advisory.vulnerable_versions, {
						includePrerelease: true
					})
			);
			assert.ok(
				Array.isArray(finding.paths) &&
					finding.paths.length &&
					finding.paths.every((value) => typeof value === 'string' && value.length)
			);
			const key = `pnpm:${id}:${advisory.module_name}@${finding.version}`;
			const entry = {
				key,
				id,
				ecosystem: 'npm',
				package: advisory.module_name,
				version: finding.version,
				source: advisory.url,
				title: advisory.title,
				severity: advisory.severity,
				affected: advisory.vulnerable_versions,
				path: [...new Set(finding.paths)].sort()
			};
			if (result.has(key)) {
				const previous = result.get(key);
				entry.path = [...new Set([...previous.path, ...entry.path])].sort();
				entry.affected = `${previous.affected} || ${entry.affected}`;
				if (severities.indexOf(previous.severity) > severities.indexOf(entry.severity))
					entry.severity = previous.severity;
			}
			result.set(key, entry);
		}
	}
	return [...result.values()];
}

export function evaluateCurrentFindings(current, decisions, prove, graphHash) {
	const reviewed = new Map(decisions.map((finding) => [finding.key, finding]));
	return current.map((finding) => {
		const decision = reviewed.get(finding.key);
		assert.ok(decision, `advisory/caminho não classificado: ${finding.key}`);
		assert.equal(finding.package, decision.package);
		assert.notEqual(decision.status, 'fixed', `correção ainda reportada: ${finding.key}`);
		const active = { ...decision, ...finding, graphHash };
		if (decision.status === 'not-applicable' || decision.status === 'mitigated') prove(active);
		return active;
	});
}

export function normalizeCargoAudit(report, exitCode) {
	assert.match(report.database?.['last-commit'] ?? '', /^[a-f0-9]{40}$/);
	assert.ok(
		Number.isInteger(report.database['advisory-count']) &&
			Number.isInteger(report.lockfile?.['dependency-count'])
	);
	assert.ok(
		Array.isArray(report.vulnerabilities?.list) &&
			report.warnings &&
			typeof report.warnings === 'object'
	);
	assert.equal(report.vulnerabilities.count, report.vulnerabilities.list.length);
	assert.equal(report.vulnerabilities.found, report.vulnerabilities.count > 0);
	assert.equal(exitCode, report.vulnerabilities.found ? 1 : 0);
	const entries = [...report.vulnerabilities.list, ...(report.warnings.unsound ?? [])];
	return entries.map((value) => {
		assert.ok(
			value.advisory?.id &&
				value.advisory.title &&
				value.package?.name &&
				value.package.version &&
				value.versions
		);
		return {
			key: `cargo:${value.advisory.id}:${value.package.name}@${value.package.version}`,
			id: value.advisory.id,
			ecosystem: 'cargo',
			package: value.package.name,
			version: value.package.version,
			source: `https://rustsec.org/advisories/${value.advisory.id}.html`,
			severity: value.advisory.cvss ? 'cvss-recorded-in-raw-report' : 'unrated',
			title: value.advisory.title,
			affected: value.versions
		};
	});
}

export function validateFinding(finding, today) {
	for (const field of [
		'key',
		'id',
		'ecosystem',
		'package',
		'version',
		'severity',
		'source',
		'preconditions',
		'fixedVersion',
		'group'
	])
		assert.ok(typeof finding[field] === 'string' && finding[field].length, `finding.${field}`);
	for (const field of ['path', 'contexts', 'evidence'])
		assert.ok(
			Array.isArray(finding[field]) &&
				finding[field].length &&
				finding[field].every((value) => typeof value === 'string' && value.length),
			`finding.${field}`
		);
	assert.ok(
		['applicable', 'not-applicable'].includes(finding.exposure),
		'exposição não classificada'
	);
	assert.ok(
		['scheduled', 'fixed', 'mitigated', 'not-applicable'].includes(finding.status),
		'decisão não classificada'
	);
	assert.match(finding.graphHash, /^[a-f0-9]{64}$/);
	assert.match(finding.reviewBy, /^\d{4}-\d{2}-\d{2}$/);
	assert.ok(finding.reviewBy >= today, 'revisão de segurança vencida');
	assert.equal(typeof finding.urgent, 'boolean');
	assert.equal(finding.status === 'not-applicable', finding.exposure === 'not-applicable');
	if (finding.status === 'not-applicable') {
		assert.equal(finding.urgent, false);
		assert.ok(
			typeof finding.condition === 'string' && finding.condition.length,
			'não aplicabilidade sem condição verificável'
		);
	}
	if (finding.status === 'mitigated')
		assert.ok(
			typeof finding.mitigationTest === 'string' && finding.mitigationTest.length,
			'mitigação sem teste'
		);
}

export function evaluatePermanentFindings(current, policy, prove, { today, graphs }) {
	const active = current.flatMap((finding) =>
		evaluateCurrentFindings([finding], policy.findings, prove, graphs[finding.ecosystem])
	);
	const reviewed = new Map(policy.findings.map((value) => [value.key, value]));
	return active.map((finding) => {
		if (finding.ecosystem === 'npm')
			assert.deepEqual(
				[...finding.path].sort(),
				[...reviewed.get(finding.key).path].sort(),
				`caminho novo: ${finding.key}`
			);
		const value = { ...finding, graphHash: graphs[finding.ecosystem] };
		validateFinding(value, today);
		assert.ok(
			!(value.exposure === 'applicable' && value.status === 'scheduled'),
			`risco bloqueante: ${value.key}`
		);
		return value;
	});
}
