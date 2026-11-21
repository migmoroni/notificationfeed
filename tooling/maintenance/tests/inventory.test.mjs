import assert from 'node:assert/strict';
import { test } from 'node:test';
import { npmGraph } from '../inventory-lib.mjs';

test('grafo conserva nós, arestas, pares e opcionais e resolve workspace local', () => {
	const packages = {
		'': { dependencies: { product: '1.0.0', library: '^1' } },
		'node_modules/product': { resolved: 'packages/product', link: true },
		'packages/product': {
			name: 'product',
			version: '1.0.0',
			peerDependencies: { library: '^1' },
			optionalDependencies: { missing: '^1' }
		},
		'node_modules/library': { version: '1.2.3', integrity: 'sha512-example' }
	};
	const graph = npmGraph({ lockfileVersion: 3, packages });
	assert.equal(graph.nodes.length, 4);
	assert.equal(graph.edges.find((edge) => edge.name === 'product').to, 'packages/product');
	assert.equal(
		graph.edges.find((edge) => edge.kind === 'peerDependencies').to,
		'node_modules/library'
	);
	assert.equal(graph.edges.find((edge) => edge.name === 'missing').to, null);
	const broken = structuredClone(packages);
	delete broken['node_modules/library'];
	assert.throws(() => npmGraph({ lockfileVersion: 3, packages: broken }));
	const workspace = structuredClone(packages);
	workspace[''].workspaces = ['packages/product'];
	assert.equal(
		npmGraph({ lockfileVersion: 3, packages: workspace }).edges.find(
			(edge) => edge.kind === 'workspace'
		).to,
		'packages/product'
	);
});
