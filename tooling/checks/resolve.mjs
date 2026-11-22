import assert from 'node:assert/strict';
import { findPackageJSON } from 'node:module';
import { realpathSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { readJSON } from './io.mjs';

export function packageDirectory(consumer, name) {
	const manifest = findPackageJSON(name, pathToFileURL(path.resolve(consumer, 'package.json')));
	assert.ok(manifest, `manifest não encontrado para ${name} no consumidor ${consumer}`);
	assert.equal(readJSON(manifest).name, name);
	return path.dirname(realpathSync(manifest));
}
export function assertSvelteSingleton(root) {
	const locations = ['', 'apps/web', 'packages/notfeed'].map((consumer) =>
		packageDirectory(path.join(root, consumer), 'svelte')
	);
	assert.equal(new Set(locations).size, 1, 'framework duplicado entre consumidores');
}
