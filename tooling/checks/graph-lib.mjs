import assert from 'node:assert/strict';
import path from 'node:path';
import semver from 'semver';

export function pnpmGraph(projects, root) {
	assert.ok(Array.isArray(projects) && projects.length, 'lista pnpm vazia/inválida');
	const workspaces = new Map(projects.map((project) => [path.resolve(project.path), project]));
	const nodes = new Map(),
		edges = new Map(),
		visited = new WeakSet();
	function visit(entry, name) {
		assert.ok(entry.path && name, 'nó pnpm incompleto');
		const workspace = workspaces.get(path.resolve(entry.path));
		const version = workspace?.version ?? entry.version;
		assert.ok(semver.valid(version), `versão pnpm inválida: ${name}/${version}`);
		const id = workspace
			? `workspace:${path.relative(root, entry.path) || '.'}`
			: `${name}@${version}`;
		nodes.set(`${id}:${path.relative(root, entry.path)}`, {
			name,
			version,
			id,
			location: path.relative(root, entry.path),
			workspace: !!workspace
		});
		if (visited.has(entry)) return id;
		visited.add(entry);
		for (const kind of ['dependencies', 'devDependencies', 'optionalDependencies']) {
			for (const [dependency, target] of Object.entries(entry[kind] ?? {})) {
				const to = visit(target, dependency);
				const edge = { from: id, to, name: dependency, kind };
				edges.set(JSON.stringify(edge), edge);
			}
		}
		return id;
	}
	for (const project of projects) visit(project, project.name);
	return { nodes: [...nodes.values()], edges: [...edges.values()] };
}
