import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { hash } from './io.mjs';

export function verifyRecipe(recipe) {
	assert.equal(recipe.schemaVersion, 1);
	assert.equal(recipe.selfContained, true);
	assert.match(recipe.checkpoint, /^[a-f0-9]{40}$/);
	assert.match(recipe.inputHash, /^[a-f0-9]{64}$/);
	const bytes = readFileSync(recipe.bundle);
	assert.equal(hash(bytes), recipe.bundleHash);
	const header = bytes.subarray(0, 4096).toString('utf8').split('\n\n')[0];
	assert.ok(
		header.split('\n').includes(`${recipe.checkpoint} HEAD`),
		'revisão não corresponde ao bundle'
	);
	assert.ok(
		!header.split('\n').some((line) => line.startsWith('-')),
		'bundle exige objetos externos'
	);
	for (const tool of ['node', 'npm']) {
		assert.match(recipe[tool].version, /^\d+\.\d+\.\d+$/);
		assert.ok(recipe[tool].url.startsWith('https://'));
	}
	assert.match(recipe.node.sha256, /^[a-f0-9]{64}$/);
	assert.match(recipe.npm.integrity, /^sha512-[a-zA-Z0-9+/]+=*$/);
	verifyNativePrebuild(recipe.nativePrebuild);
}
export function verifyNativePrebuild(native) {
	assert.equal(native.package, 'node-datachannel');
	assert.match(native.version, /^\d+\.\d+\.\d+$/);
	assert.equal(native.platform, 'linux');
	assert.equal(native.arch, 'x64');
	assert.ok(
		native.url.startsWith(
			`https://github.com/murat-dogan/node-datachannel/releases/download/v${native.version}/`
		)
	);
	assert.match(native.sha256, /^[a-f0-9]{64}$/);
	assert.match(
		native.cacheFile,
		/^_prebuilds\/[a-f0-9]{6}-node-datachannel-v\d+\.\d+\.\d+-napi-v8-linux-x64\.tar\.gz$/
	);
	assert.ok(native.cacheFile.includes(`-v${native.version}-`));
}
