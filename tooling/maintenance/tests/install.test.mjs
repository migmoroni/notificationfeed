import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { assertLocalProduct, assertLocks } from '../install.mjs';

test('consumidor resolve produto local; pacote ausente ou origem externa reprovam', async () => {
	const root = mkdtempSync(path.join(tmpdir(), 'notfeed-workspace-resolution-'));
	try {
		const web = path.join(root, 'apps/web'),
			product = path.join(root, 'packages/notfeed');
		mkdirSync(web, { recursive: true });
		mkdirSync(path.join(product, 'src'), { recursive: true });
		writeFileSync(path.join(web, 'package.json'), '{}');
		writeFileSync(
			path.join(product, 'package.json'),
			JSON.stringify({ name: '@notfeed/product', exports: { '.': './src/index.ts' } })
		);
		writeFileSync(path.join(product, 'src/index.ts'), 'export {};');
		await assert.rejects(() => assertLocalProduct(root));
		const modules = path.join(web, 'node_modules/@notfeed');
		mkdirSync(modules, { recursive: true });
		const external = path.join(root, 'external');
		mkdirSync(external);
		writeFileSync(
			path.join(external, 'package.json'),
			JSON.stringify({ name: '@notfeed/product', main: 'index.js' })
		);
		writeFileSync(path.join(external, 'index.js'), 'module.exports = {};');
		symlinkSync(external, path.join(modules, 'product'));
		await assert.rejects(() => assertLocalProduct(root));
		rmSync(path.join(modules, 'product'));
		symlinkSync(product, path.join(modules, 'product'));
		await assert.doesNotReject(() => assertLocalProduct(root));
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
test('instalação que altera lock ou omite um dos ecossistemas reprova', () => {
	const before = { 'package-lock.json': 'a', 'apps/desktop/src-tauri/Cargo.lock': 'b' };
	assert.doesNotThrow(() => assertLocks(before, { ...before }));
	assert.throws(() => assertLocks(before, { ...before, 'package-lock.json': 'changed' }));
	assert.throws(() => assertLocks(before, { 'package-lock.json': 'a' }));
});
