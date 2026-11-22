import { pnpmGraph } from '../../checks/graph-lib.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { graphDelta, assertGraphDelta } from '../manager-lib.mjs';

test('grafo pnpm descobre workspaces, pacotes e arestas de JSON completo do lock', () => {
	const tree = [
		{
			name: 'app',
			version: '1.0.0',
			path: '/repo/apps/web',
			dependencies: {
				example: {
					version: '2.0.0',
					path: '/repo/node_modules/.pnpm/example@2.0.0/node_modules/example',
					dependencies: {
						child: {
							version: '3.0.0',
							path: '/repo/node_modules/.pnpm/child@3.0.0/node_modules/child'
						}
					}
				}
			}
		}
	];
	const graph = pnpmGraph(tree, '/repo');
	assert.ok(graph.nodes.some((node) => node.name === 'child' && node.version === '3.0.0'));
	assert.ok(graph.edges.some((edge) => edge.from === 'example@2.0.0' && edge.to === 'child@3.0.0'));
	assert.throws(() => pnpmGraph([], '/repo'));
	assert.throws(() =>
		pnpmGraph([{ name: 'app', path: '/repo', dependencies: { missing: {} } }], '/repo')
	);
});
test('conversão recusa versão/aresta inexplicada e mapping que não coincide com o delta atual', () => {
	const before = { nodes: ['example@1.0.0'], edges: ['app>example@1.0.0'] };
	const after = { nodes: ['example@2.0.0'], edges: ['app>example@2.0.0'] };
	const delta = graphDelta(before, after);
	assert.throws(() => assertGraphDelta(delta, []));
	const decisions = Object.entries(delta).flatMap(([kind, values]) =>
		values.map((value) => ({
			kind,
			value,
			reason: 'Reviewed compatibility resolution',
			evidence: ['fixture']
		}))
	);
	assert.doesNotThrow(() => assertGraphDelta(delta, decisions));
	assert.throws(() =>
		assertGraphDelta(delta, [
			...decisions,
			{ kind: 'addedNodes', value: 'unrelated@1.0.0', reason: 'unused', evidence: ['fixture'] }
		])
	);
});
test('listagem de lock conserva versões distintas mesmo quando paths indicam o mesmo local', () => {
	const graph = pnpmGraph(
		[
			{
				name: 'app',
				version: '1.0.0',
				path: '/repo',
				dependencies: {
					first: {
						version: '1.0.0',
						path: '/repo/first',
						dependencies: { shared: { version: '1.0.0', path: '/repo/node_modules/shared' } }
					},
					second: {
						version: '1.0.0',
						path: '/repo/second',
						dependencies: { shared: { version: '2.0.0', path: '/repo/node_modules/shared' } }
					}
				}
			}
		],
		'/repo'
	);
	assert.deepEqual(
		graph.nodes
			.filter((node) => node.name === 'shared')
			.map((node) => node.version)
			.sort(),
		['1.0.0', '2.0.0']
	);
});
