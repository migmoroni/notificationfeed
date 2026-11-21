import assert from 'node:assert/strict';
import { test } from 'node:test';
import path from 'node:path';
import { ESLint } from 'eslint';
import { filesUnder, readJSON } from '../io.mjs';

test('lint cobre JS, TS, Svelte/runes e worker com regras e níveis acordados', async () => {
	const engine = new ESLint();
	const policy = readJSON('tooling/checks/contracts/lint.json');
	for (const [file, code] of [
		['tooling/checks/lint-fixture.mjs', 'debugger;'],
		['packages/notfeed/src/lint-fixture.ts', 'const value: number = 1; debugger;'],
		['packages/notfeed/src/lint-fixture.svelte.ts', 'let value = $state(1); debugger;'],
		[
			'packages/notfeed/src/LintFixture.svelte',
			'<script lang="ts">let count = $state(0); debugger;</script><button onclick={() => count++}>{count}</button>'
		],
		[
			'apps/web/src/service-worker.ts',
			'declare const self: ServiceWorkerGlobalScope; self.addEventListener("install", () => {}); debugger;'
		]
	]) {
		const config = await engine.calculateConfigForFile(file);
		assert.ok(config, `arquivo não descoberto: ${file}`);
		assert.equal(config.linterOptions.noInlineConfig, true);
		for (const rule of Object.keys(policy.rules))
			assert.equal(config.rules[rule][0], 2, `regra relaxada: ${rule}`);
		const [report] = await engine.lintText(code, { filePath: file });
		assert.ok(
			report.messages.some((message) => message.ruleId === 'no-debugger' && message.severity === 2),
			JSON.stringify(report.messages)
		);
		assert.ok(!report.messages.some((message) => message.fatal), JSON.stringify(report.messages));
	}
});

test('lint separa globais Node/browser/worker e supressão não esconde erro', async () => {
	const engine = new ESLint();
	for (const [file, good, bad] of [
		['tooling/checks/lint-fixture.mjs', 'process.cwd();', 'window.location.reload();'],
		['packages/notfeed/src/lint-fixture.js', 'window.location.reload();', 'process.exit(1);'],
		[
			'apps/web/src/service-worker.js',
			'self.addEventListener("install", () => {});',
			'window.alert("bad");'
		]
	]) {
		assert.equal((await engine.lintText(good, { filePath: file }))[0].errorCount, 0);
		const [report] = await engine.lintText(bad, { filePath: file });
		assert.ok(report.messages.some((message) => message.ruleId === 'no-undef'));
	}
	const [suppressed] = await engine.lintText('// eslint-disable-next-line no-debugger\ndebugger;', {
		filePath: 'tooling/checks/lint-fixture.mjs'
	});
	assert.ok(suppressed.messages.some((message) => message.ruleId === 'no-debugger'));
});

test('lint descobre todas as fontes ativas e ignora somente gerados e histórico identificado', async () => {
	const root = process.cwd(),
		policy = readJSON('tooling/checks/contracts/lint.json');
	const expected = filesUnder(root).filter(
		(file) =>
			/\.(?:js|mjs|cjs|ts|svelte)$/.test(file) &&
			!path.relative(root, file).startsWith('tooling/migration/')
	);
	const reports = await new ESLint().lintFiles(policy.files);
	const discovered = new Set(reports.map((report) => path.resolve(report.filePath)));
	assert.ok(expected.length);
	for (const file of expected)
		assert.ok(discovered.has(file), `fonte ativa omitida do lint: ${file}`);
	assert.ok(
		[...discovered].every((file) => !path.relative(root, file).startsWith('tooling/migration/'))
	);
	assert.equal(readJSON('package.json').scripts.lint, policy.command);
});
