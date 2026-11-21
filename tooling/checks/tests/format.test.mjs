import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { runInNewContext } from 'node:vm';
import * as prettier from 'prettier';
import ts from 'typescript';
import { parse } from 'svelte/compiler';
import { readJSON, filesUnder, execute, hash } from '../io.mjs';

test('formatter mantém valores JS/TS e aceita componentes Svelte com runes', async () => {
	const options = readJSON('tooling/checks/contracts/format.json').options;
	for (const [file, source] of [
		['fixture.js', 'const value={a:1,items:[2,3]};JSON.stringify(value)'],
		['fixture.ts', 'const value:{a:number}={a:1};JSON.stringify(value)']
	]) {
		const formatted = await prettier.format(source, { ...options, filepath: file });
		const compile = (value) =>
			ts.transpileModule(value, {
				compilerOptions: { target: ts.ScriptTarget.ESNext, removeComments: true }
			}).outputText;
		assert.equal(runInNewContext(compile(formatted)), runInNewContext(compile(source)));
		assert.equal(await prettier.check(formatted, { ...options, filepath: file }), true);
	}
	const source = '<script lang="ts">let n=$state(1)</script><button onclick={()=>n++}>{n}</button>';
	const formatted = await prettier.format(source, { ...options, filepath: 'Fixture.svelte' });
	assert.doesNotThrow(() => parse(formatted, { modern: true }));
	assert.equal(await prettier.check(formatted, { ...options, filepath: 'Fixture.svelte' }), true);
});

test('formatter check rejeita arquivo fora do padrão sem escrever nele', async () => {
	const directory = mkdtempSync(path.join(tmpdir(), 'notfeed-format-'));
	const file = path.join(directory, 'bad.js');
	try {
		writeFileSync(file, 'const value={a:1}');
		const before = hash(readFileSync(file));
		await assert.rejects(
			execute('pnpm', [
				'exec',
				'prettier',
				'--check',
				file,
				'--config',
				path.resolve('.prettierrc.json')
			]),
			(error) => JSON.parse(error.message).code === 1
		);
		assert.equal(hash(readFileSync(file)), before);
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
});

test('formatter descobre fontes ativas e preserva exclusões históricas identificadas', async () => {
	const root = process.cwd(),
		ignorePath = path.resolve('.prettierignore');
	const sources = filesUnder(root).filter(
		(file) =>
			/\.(?:js|mjs|cjs|ts|svelte|css|html)$/.test(file) &&
			!path.relative(root, file).startsWith('tooling/migration/')
	);
	assert.ok(sources.length);
	for (const file of sources) {
		const info = await prettier.getFileInfo(file, {
			ignorePath,
			plugins: ['prettier-plugin-svelte']
		});
		assert.equal(info.ignored, false, `fonte ativa excluída: ${file}`);
		assert.ok(info.inferredParser, `parser ausente: ${file}`);
	}
	for (const file of [
		'tooling/migration/lib.mjs',
		'tooling/e2e/reference/stage-2-entry.json',
		'tooling/maintenance/contracts/baseline.json'
	])
		assert.equal((await prettier.getFileInfo(file, { ignorePath })).ignored, true);
	for (const file of [
		'README.md',
		'docs/plans/etapa-2-base-tecnica-e-ambiente/README.md',
		'tooling/checks/contracts/project.json'
	])
		assert.equal((await prettier.getFileInfo(file, { ignorePath })).ignored, false);
});
