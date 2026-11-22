import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { verifyNativePrebuild } from './reference-lib.mjs';

export async function downloadVerified(
	url,
	target,
	algorithm,
	digest,
	encoding = 'hex',
	fetcher = fetch
) {
	assert.equal(new URL(url).protocol, 'https:');
	assert.ok(
		(algorithm === 'sha256' && encoding === 'hex') ||
			(algorithm === 'sha512' && encoding === 'base64')
	);
	assert.match(digest, algorithm === 'sha256' ? /^[a-f0-9]{64}$/ : /^[a-zA-Z0-9+/]{86}==$/);
	const response = await fetcher(url, { signal: AbortSignal.timeout(120000) });
	assert.ok(response.ok, `${response.status}: ${url}`);
	const bytes = Buffer.from(await response.arrayBuffer());
	assert.equal(
		createHash(algorithm).update(bytes).digest(encoding),
		digest,
		`integridade inválida: ${url}`
	);
	mkdirSync(path.dirname(target), { recursive: true });
	writeFileSync(target, bytes);
	return { url, target, algorithm, digest, verified: true };
}

export async function provisionPrebuild(
	native,
	{ cache, versions, platform = process.platform, arch = process.arch, fetcher = fetch }
) {
	verifyNativePrebuild(native);
	assert.deepEqual(
		[...new Set(versions)].sort(),
		[native.version],
		'versão nativa do grafo diverge do artefato revisado'
	);
	assert.equal(platform, native.platform);
	assert.equal(arch, native.arch);
	const target = path.resolve(cache, native.cacheFile);
	assert.ok(!existsSync(target), 'artefato de cache anterior não é uma obtenção nova');
	return await downloadVerified(native.url, target, 'sha256', native.sha256, 'hex', fetcher);
}
