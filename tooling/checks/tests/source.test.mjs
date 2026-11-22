import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
	inspectImports,
	assertSourceEdge,
	assertDebtBudget,
	semanticHash,
	inspectDebt
} from '../source-lib.mjs';

test('fronteiras cobrem imports estáticos, dinâmicos, tipos e scripts Svelte', () => {
	const source =
		'<script lang="ts">import X from "../../apps/web/x.js"; type T = import("../../apps/web/type.js").T; const x = import("../../apps/web/dynamic.js");</script>';
	const imports = inspectImports('packages/notfeed/src/a.svelte', source);
	assert.equal(imports.length, 3);
	for (const entry of imports)
		assert.throws(() => assertSourceEdge('packages/notfeed/src/a.svelte', entry, 'apps/web/x.js'));
	assert.throws(() => inspectImports('a.ts', 'const x = import(name);'));
	assert.throws(() => assertSourceEdge('apps/web/src/a.ts', '../../tooling/x.js', 'tooling/x.js'));
	assert.throws(() =>
		assertSourceEdge('packages/notfeed/src/a.ts', '$lib/a.js', 'packages/notfeed/src/a.ts')
	);
	assert.doesNotThrow(() =>
		assertSourceEdge('apps/web/src/a.ts', '@notfeed/product/a.js', 'packages/notfeed/src/a.ts')
	);
});
test('contrato de dados tolera formatação, mas preserva nomes e valores', () => {
	assert.equal(
		semanticHash('const name = "notfeed-v2";'),
		semanticHash("// comment\nconst name='notfeed-v2';\n")
	);
	assert.notEqual(
		semanticHash('const name = "notfeed-v2";'),
		semanticHash('const name = "other";')
	);
});
test('orçamento sintático recusa ocorrência nova, duplicada ou movida e aceita remoção', () => {
	const debt = { file: 'a.ts', kind: 'any', anchor: 'a', owner: 'parse' };
	assert.doesNotThrow(() => assertDebtBudget([debt], [debt]));
	assert.doesNotThrow(() => assertDebtBudget([debt], []));
	assert.throws(() => assertDebtBudget([debt], [debt, debt]));
	assert.throws(() => assertDebtBudget([debt], [{ ...debt, file: 'new.ts' }]));
	assert.throws(() => assertDebtBudget([debt], [{ ...debt, anchor: 'new' }]));
});

test('dívida é sintaxe: strings/comentários comuns não viram any; âncora muda com responsabilidade', () => {
	const source =
		'const text = "any @ts-ignore"; // any\nfunction parse(value: any) { return value; }';
	const before = inspectDebt('example.ts', source);
	assert.equal(before.length, 1);
	assert.equal(before[0].kind, 'any');
	assert.deepEqual(
		inspectDebt('example.ts', source.replace('value: any', 'value :\n any')).map((x) => x.anchor),
		before.map((x) => x.anchor)
	);
	assert.notEqual(
		inspectDebt('example.ts', source.replace('function parse', 'function other'))[0].anchor,
		before[0].anchor
	);
	assert.equal(inspectDebt('example.ts', '// @ts-ignore\nlet value: unknown;').length, 1);
	assert.equal(
		inspectDebt('Example.svelte', '<script lang="ts">let value: any;</script><p>any @ts-ignore</p>')
			.length,
		1
	);
});
