import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { downloadVerified, provisionPrebuild } from '../download.mjs';
import { hash, readJSON } from '../io.mjs';

test('download exige HTTPS, resposta válida e digest antes de escrever artefato', async () => {
	const directory = mkdtempSync(path.join(tmpdir(), 'notfeed-download-'));
	const target = path.join(directory, 'archive');
	const bytes = Buffer.from('synthetic native artifact');
	const fetcher = async (url, options) => {
		assert.equal(url, 'https://example.test/archive');
		assert.ok(options.signal instanceof AbortSignal);
		return new Response(bytes);
	};
	try {
		await assert.rejects(
			downloadVerified('http://example.test/archive', target, 'sha256', hash(bytes), 'hex', fetcher)
		);
		await assert.rejects(
			downloadVerified(
				'https://example.test/archive',
				target,
				'sha256',
				'0'.repeat(64),
				'hex',
				fetcher
			)
		);
		await assert.rejects(
			downloadVerified(
				'https://example.test/archive',
				target,
				'sha256',
				hash(bytes),
				'hex',
				async () => new Response('error', { status: 503 })
			)
		);
		assert.equal(existsSync(target), false);
		const receipt = await downloadVerified(
			'https://example.test/archive',
			target,
			'sha256',
			hash(bytes),
			'hex',
			fetcher
		);
		assert.equal(receipt.verified, true);
		assert.deepEqual(readFileSync(target), bytes);
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
});

test('prebuild exige versão do grafo e host corretos e cache novo com integridade', async () => {
	const directory = mkdtempSync(path.join(tmpdir(), 'notfeed-prebuild-'));
	const bytes = Buffer.from('synthetic prebuild');
	const native = { ...readJSON('tooling/checks/contracts/prebuild.json'), sha256: hash(bytes) };
	let requests = 0;
	const fetcher = async () => {
		requests++;
		return new Response(bytes);
	};
	const options = {
		cache: directory,
		versions: [native.version],
		platform: native.platform,
		arch: native.arch,
		fetcher
	};
	try {
		await assert.rejects(provisionPrebuild(native, { ...options, versions: ['0.28.0'] }));
		await assert.rejects(
			provisionPrebuild(native, { ...options, versions: [native.version, '0.28.0'] })
		);
		await assert.rejects(provisionPrebuild(native, { ...options, platform: 'win32' }));
		await assert.rejects(provisionPrebuild({ ...native, cacheFile: '../escape' }, options));
		assert.equal(requests, 0);
		const receipt = await provisionPrebuild(native, options);
		assert.equal(requests, 1);
		assert.equal(receipt.digest, hash(bytes));
		assert.deepEqual(readFileSync(path.join(directory, native.cacheFile)), bytes);
		await assert.rejects(provisionPrebuild(native, options));
		assert.equal(requests, 1, 'cache anterior não deve substituir obtenção nova');
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
});
