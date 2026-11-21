import assert from 'node:assert/strict';
import path from 'node:path';

export function npmGraph(lock) {
	assert.equal(lock.lockfileVersion, 3);
	assert.ok(lock.packages?.['']);
	const packages = lock.packages;
	function resolve(consumer, name) {
		let current = consumer;
		while (true) {
			const candidate = path.posix.join(current, 'node_modules', name);
			if (packages[candidate])
				return packages[candidate].link ? packages[candidate].resolved : candidate;
			if (!current || current === '.') return null;
			current = path.posix.dirname(current);
			if (current === '.') current = '';
		}
	}
	const nodes = Object.entries(packages).map(([location, pkg]) => ({
		ecosystem: 'npm',
		location,
		name: pkg.name ?? location.split('node_modules/').at(-1),
		version: pkg.version ?? null,
		integrity: pkg.integrity ?? null,
		resolved: pkg.resolved ?? null,
		link: pkg.link ?? false,
		dev: pkg.dev ?? false,
		optional: pkg.optional ?? false,
		peerDependenciesMeta: pkg.peerDependenciesMeta ?? {},
		engines: pkg.engines ?? {}
	}));
	const edges = Object.entries(packages).flatMap(([consumer, pkg]) => {
		if (pkg.link) return [];
		return ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'].flatMap(
			(kind) =>
				Object.entries(pkg[kind] ?? {}).map(([name, range]) => {
					const to = resolve(consumer, name);
					const optional =
						kind === 'optionalDependencies' ||
						!!pkg.peerDependenciesMeta?.[name]?.optional ||
						!!pkg.optionalDependencies?.[name];
					assert.ok(
						to !== null || optional,
						`${consumer || '<root>'}: dependência não resolvida ${name} (${kind})`
					);
					return { from: consumer, to, name, range, kind, optional };
				})
		);
	});
	for (const workspace of packages[''].workspaces ?? []) {
		assert.ok(packages[workspace]?.name, `workspace ausente: ${workspace}`);
		edges.push({
			from: '',
			to: workspace,
			name: packages[workspace].name,
			range: 'workspace:*',
			kind: 'workspace',
			optional: false
		});
	}
	return { nodes, edges };
}
