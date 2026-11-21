import assert from 'node:assert/strict';
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	symlinkSync,
	writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import {
	acquireArtifactLease,
	artifactScope,
	cleanArtifacts,
	pruneArtifactPayloads
} from '../artifacts-lib.mjs';

function fixture(work) {
	const root = mkdtempSync(path.join(tmpdir(), 'notfeed-retention-'));
	const artifacts = path.join(root, '.artifacts');
	mkdirSync(artifacts);
	const put = (relative, content = 'payload') => {
		const file = path.join(artifacts, relative);
		mkdirSync(path.dirname(file), { recursive: true });
		writeFileSync(file, content);
		return file;
	};
	return Promise.resolve()
		.then(() => work({ root, artifacts, put }))
		.finally(() => rmSync(root, { recursive: true, force: true }));
}

test('retenção elimina payloads repetidos e preserva provas, fontes, ferramentas e checkpoints', () =>
	fixture(async ({ artifacts, put }) => {
		const durable = [
			'maintenance/install/candidate-a/source/package.json',
			'maintenance/install/candidate-a/source/.artifacts/native/current-a/evidence.json',
			'maintenance/install/candidate-a/source/.artifacts/e2e/reproduction/stage-2-a/build.json',
			'maintenance/install/candidate-a/install.log.stdout',
			'maintenance/checkpoints/2.4/sources.tar.gz',
			'toolchains/node/bin/node',
			'e2e/stage-2-entry-build/index.html',
			'ci/web/runs/a/artifact/evidence.json'
		].map((file) => put(file));
		const disposable = [
			'maintenance/install/candidate-a/store/cache',
			'maintenance/install/candidate-a/source/node_modules/pkg/index.js',
			'maintenance/install/candidate-a/source/.artifacts/e2e/reproduction/stage-2-a/source/node_modules/pkg/index.js',
			'maintenance/install/candidate-a/source/.artifacts/native/current-a/squashfs-root/binary',
			'security/current-a/rustsec/.git/pack',
			'e2e/reproduction/stage-2-a/tools/node',
			'native/current-a/compiled/.rodata'
		].map((file) => put(file));
		const cache = put('maintenance/native-cache/release/binary');
		const before = durable.map((file) => readFileSync(file));
		await cleanArtifacts(artifacts);
		for (const file of disposable) assert.equal(existsSync(file), false, file);
		for (const [index, file] of durable.entries())
			assert.deepEqual(readFileSync(file), before[index]);
		assert.equal(existsSync(cache), true);
		await cleanArtifacts(artifacts, { caches: true });
		assert.equal(existsSync(cache), false);
		assert.equal((await cleanArtifacts(artifacts)).removed.length, 0);
	}));

test('limpeza recusa fronteira externa, symlink e área em uso sem remover payloads', () =>
	fixture(async ({ root, artifacts, put }) => {
		const file = put('security/current-a/rustsec/data');
		assert.throws(
			() => pruneArtifactPayloads(artifacts, path.join(root, 'outside'), ['cache']),
			/fronteira/
		);
		assert.throws(
			() => pruneArtifactPayloads(artifacts, path.dirname(file), ['../../../..']),
			/fronteira/
		);
		const release = acquireArtifactLease(artifacts, path.dirname(file));
		await assert.rejects(() => cleanArtifacts(artifacts), /em uso/);
		assert.equal(existsSync(file), true);
		release();
		const external = path.join(root, 'external');
		mkdirSync(external);
		writeFileSync(path.join(external, 'valuable'), 'keep');
		symlinkSync(external, path.join(artifacts, 'native'));
		await assert.rejects(() => cleanArtifacts(artifacts), /simbólico/);
		assert.equal(readFileSync(path.join(external, 'valuable'), 'utf8'), 'keep');
	}));

test('escopo limpa em sucesso e falha, preservando diagnóstico e liberando lease', () =>
	fixture(async ({ artifacts, put }) => {
		const area = path.join(artifacts, 'e2e/reproduction/stage-2-a');
		const payload = put('e2e/reproduction/stage-2-a/cache/data');
		const log = put('e2e/reproduction/stage-2-a/install.json', '{"code":1}');
		const clean = () => pruneArtifactPayloads(artifacts, area, ['cache']);
		await assert.rejects(
			() =>
				artifactScope(
					artifacts,
					area,
					async () => {
						throw new Error('build failed');
					},
					clean
				),
			/build failed/
		);
		assert.equal(existsSync(payload), false);
		assert.equal(readFileSync(log, 'utf8'), '{"code":1}');
		await artifactScope(
			artifacts,
			area,
			async () => put('e2e/reproduction/stage-2-a/cache/data'),
			clean
		);
		assert.equal(existsSync(payload), false);
		await cleanArtifacts(artifacts);
	}));

test('simulação não remove arquivos e erros de limpeza preservam a falha original', () =>
	fixture(async ({ artifacts, put }) => {
		const payload = put('security/current-a/rustsec/data');
		const area = path.dirname(path.dirname(payload));
		const preview = await cleanArtifacts(artifacts, { dryRun: true });
		assert.equal(preview.removed.length, 0);
		assert.ok(preview.targets.includes(path.dirname(payload)));
		assert.ok(existsSync(payload));
		await assert.rejects(
			() =>
				artifactScope(
					artifacts,
					area,
					async () => {
						throw new Error('audit failed');
					},
					() => {
						throw new Error('cleanup failed');
					}
				),
			(error) => {
				assert.ok(error instanceof AggregateError);
				assert.deepEqual(
					error.errors.map((item) => item.message),
					['audit failed', 'cleanup failed']
				);
				return true;
			}
		);
		await cleanArtifacts(artifacts);
	}));
