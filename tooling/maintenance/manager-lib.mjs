import assert from 'node:assert/strict';
import semver from 'semver';

export function canonicalGraph(graph, manager) {
	const identity = (node) =>
		node.id ??
		(node.location.includes('node_modules/')
			? `${node.name}@${node.version}`
			: `workspace:${node.location || '.'}`);
	const byLocation = new Map(graph.nodes.map((node) => [node.location, identity(node)]));
	const nodes = graph.nodes.filter((node) => !node.link).map(identity);
	const edges = graph.edges
		.filter((edge) => edge.kind !== 'workspace' && edge.to !== null)
		.map((edge) => {
			const from = manager === 'npm' ? byLocation.get(edge.from) : edge.from;
			const to = manager === 'npm' ? byLocation.get(edge.to) : edge.to;
			assert.ok(from && to);
			return `${from}>${edge.name}>${to}`;
		});
	return { nodes: [...new Set(nodes)].sort(), edges: [...new Set(edges)].sort() };
}
export function graphDelta(before, after) {
	const difference = (a, b) => {
		const known = new Set(b);
		return a.filter((value) => !known.has(value)).sort();
	};
	return {
		addedNodes: difference(after.nodes, before.nodes),
		removedNodes: difference(before.nodes, after.nodes),
		addedEdges: difference(after.edges, before.edges),
		removedEdges: difference(before.edges, after.edges)
	};
}
export function assertGraphDelta(delta, decisions) {
	const actual = Object.entries(delta)
		.flatMap(([kind, values]) => values.map((value) => `${kind}\0${value}`))
		.sort();
	for (const decision of decisions)
		assert.ok(
			decision.reason?.length && decision.evidence?.length,
			'delta sem justificativa/prova'
		);
	assert.deepEqual(
		decisions.map((decision) => `${decision.kind}\0${decision.value}`).sort(),
		actual,
		'delta de grafo não revisado ou revisão divergente'
	);
}
