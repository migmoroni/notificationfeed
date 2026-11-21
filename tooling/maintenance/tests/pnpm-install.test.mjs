import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { writeJSON, runProcess, assertProcess } from '../lib.mjs';

test('pnpm real recusa peer incompatível e alteração de manifesto em instalação congelada', async () => {
	const root = mkdtempSync(path.join(tmpdir(), 'notfeed-pnpm-negative-'));
	try {
		for (const compatible of [false, true]) {
			const directory = path.join(root, compatible ? 'good' : 'bad');
			mkdirSync(directory);
			mkdirSync(path.join(directory, 'framework'));
			mkdirSync(path.join(directory, 'consumer'));
			writeJSON(path.join(directory, 'package.json'), {
				name: 'fixture',
				private: true,
				packageManager: 'pnpm@11.28.12',
				dependencies: {
					'notfeed-fixture-framework': 'file:./framework',
					'notfeed-fixture-consumer': 'file:./consumer'
				}
			});
			writeJSON(path.join(directory, 'framework/package.json'), {
				name: 'notfeed-fixture-framework',
				version: compatible ? '2.0.0' : '1.0.0'
			});
			writeJSON(path.join(directory, 'consumer/package.json'), {
				name: 'notfeed-fixture-consumer',
				version: '1.0.0',
				peerDependencies: { 'notfeed-fixture-framework': '^2.0.0' }
			});
			const args = [
				'install',
				'--offline',
				'--strict-peer-dependencies',
				'--ignore-scripts',
				'--store-dir',
				path.join(directory, 'store'),
				'--cache-dir',
				path.join(directory, 'cache')
			];
			const result = await runProcess('pnpm', args, {
				cwd: directory,
				log: path.join(directory, 'install.log')
			});
			if (!compatible) {
				assert.equal(result.exitCode, 1);
				assert.equal(result.error, null);
				assert.equal(result.signal, null);
				assert.match(readFileSync(result.stdoutPath, 'utf8'), /ERR_PNPM_PEER_DEP_ISSUES/);
			} else {
				assertProcess(result);
				const manifest = JSON.parse(readFileSync(path.join(directory, 'package.json'), 'utf8'));
				manifest.dependencies['notfeed-fixture-new'] = '1.0.0';
				writeJSON(path.join(directory, 'package.json'), manifest);
				const frozen = await runProcess('pnpm', [...args, '--frozen-lockfile'], {
					cwd: directory,
					log: path.join(directory, 'frozen.log')
				});
				assert.equal(frozen.exitCode, 1);
				assert.equal(frozen.error, null);
				assert.equal(frozen.signal, null);
				assert.match(readFileSync(frozen.stdoutPath, 'utf8'), /ERR_PNPM_OUTDATED_LOCKFILE/);
			}
		}
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
