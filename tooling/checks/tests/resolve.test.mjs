import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { packageDirectory, assertSvelteSingleton } from '../resolve.mjs';

test('resolução usa consumidor e rejeita pacote ausente ou cópia incompatível do framework', () => {
	for (const duplicate of [false, true]) {
		const root = mkdtempSync(path.join(tmpdir(), 'notfeed-layout-'));
		try {
			const shared = path.join(root, 'shared');
			mkdirSync(shared);
			writeFileSync(
				path.join(shared, 'package.json'),
				JSON.stringify({ name: 'svelte', main: 'index.js' })
			);
			writeFileSync(path.join(shared, 'index.js'), 'module.exports = {};');
			for (const consumer of ['', 'apps/web', 'packages/notfeed']) {
				const directory = path.join(root, consumer);
				mkdirSync(path.join(directory, 'node_modules'), { recursive: true });
				writeFileSync(path.join(directory, 'package.json'), '{}');
				const target = duplicate && consumer === 'apps/web' ? path.join(root, 'other') : shared;
				if (target !== shared) {
					mkdirSync(target);
					writeFileSync(
						path.join(target, 'package.json'),
						JSON.stringify({ name: 'svelte', main: 'index.js' })
					);
					writeFileSync(path.join(target, 'index.js'), 'module.exports = {};');
				}
				symlinkSync(target, path.join(directory, 'node_modules/svelte'));
			}
			assert.equal(packageDirectory(root, 'svelte'), shared);
			assert.throws(() => packageDirectory(root, 'notfeed-missing-package'));
			if (duplicate) assert.throws(() => assertSvelteSingleton(root));
			else assert.doesNotThrow(() => assertSvelteSingleton(root));
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	}
});
test('CID IPFS/IPNS mantém bytes e identidade entre consumidores multiformats 13/14', async () => {
	const product = createRequire(path.resolve('packages/notfeed/package.json'));
	const unixfs = packageDirectory('packages/notfeed', '@helia/unixfs');
	const direct = await import(pathToFileURL(product.resolve('multiformats/cid')).href);
	const manifest = path.join(packageDirectory(unixfs, 'multiformats'), 'package.json');
	const receiverExport = JSON.parse(readFileSync(manifest, 'utf8')).exports['./cid'].import;
	const receiver = await import(new URL(receiverExport, pathToFileURL(manifest)).href);
	const peer = await import(pathToFileURL(product.resolve('@libp2p/peer-id')).href);
	const first = direct.CID.parse('QmYwAPJzv5CZsnAzt8auVTLRKtq1ZkroDVr1g5d5fLhzfD');
	for (const cid of [first, first.toV1()]) {
		const accepted = receiver.CID.asCID(cid);
		assert.ok(accepted);
		assert.equal(accepted.toString(), cid.toString());
		assert.deepEqual(accepted.bytes, cid.bytes);
	}
	const identity = '12D3KooWKnDdG3iXw9eTFijk3EWSunZcFi54Zka4wmtqtt6rPxc8';
	const cid = direct.CID.parse(peer.peerIdFromString(identity).toCID().toString());
	assert.equal(peer.peerIdFromCID(cid).toString(), identity);
	assert.deepEqual(receiver.CID.asCID(cid).bytes, cid.bytes);
});
