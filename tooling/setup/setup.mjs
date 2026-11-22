import assert from 'node:assert/strict';
import { existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { execute, writeJSON } from '../checks/io.mjs';
import { ciFingerprint } from '../checks/ci-lib.mjs';
import { artifactRoot, artifactScope, pruneArtifactPayloads } from '../checks/artifacts-lib.mjs';
import {
	assertRustOverride,
	inspectProvision,
	provisionContract,
	provisionLocks
} from '../checks/provision-lib.mjs';

const args = process.argv.slice(2);
assert.ok(
	args.length === 1 && ['web', 'desktop', 'ci'].includes(args[0]),
	'uso: setup.mjs web|desktop|ci'
);
const target = args[0],
	root = process.cwd(),
	contract = provisionContract();
if (target === 'desktop') assertRustOverride(process.env, contract);
const directory = path.resolve('.artifacts/setup', randomUUID());
mkdirSync(directory, { recursive: true });
const receipt = {
	schemaVersion: 1,
	status: 'running',
	target,
	startedAt: new Date().toISOString(),
	commands: []
};
receipt.inputHash = ciFingerprint(root).inputHash;
receipt.initial = { dependenciesAbsent: !existsSync(path.join(root, 'node_modules')) };
const locks = provisionLocks();
receipt.locks = locks;
async function run(id, command, commandArgs, env = {}, timeoutMs = 900000) {
	console.error(`Setup ${target}: ${id}`);
	try {
		const result = await execute(command, commandArgs, { cwd: root, env, timeoutMs });
		receipt.commands.push({ id, ...result });
		writeJSON(path.join(directory, `${id}.json`), result);
		return result;
	} catch (error) {
		writeJSON(path.join(directory, `${id}.failure.json`), { error: error.message });
		throw error;
	}
}
await artifactScope(
	artifactRoot(),
	directory,
	async () => {
		try {
			receipt.provision = await inspectProvision();
			await run('LOCK', 'mise', ['lock', '--check', '--platform', 'linux-x64']);
			const cache = path.join(directory, 'npm-cache');
			await run('PREBUILD', process.execPath, ['tooling/checks/prebuild.mjs', '--cache', cache]);
			const installArgs = ['install', '--frozen-lockfile'];
			if (process.env.NOTFEED_SETUP_STORE)
				installArgs.push('--store-dir', process.env.NOTFEED_SETUP_STORE);
			if (process.env.NOTFEED_SETUP_CACHE)
				installArgs.push('--cache-dir', process.env.NOTFEED_SETUP_CACHE);
			await run('DEPENDENCIES', 'pnpm', installArgs, { npm_config_cache: cache });
			if (target !== 'ci')
				await run('CHROMIUM', 'pnpm', ['exec', 'playwright', 'install', 'chromium'], {
					PLAYWRIGHT_SKIP_BROWSER_GC: '1'
				});
			if (target === 'desktop') {
				await run('RUSTUP', 'rustup', ['--version']);
				await run('RUST', 'rustup', contract.rustup.installArguments);
				// Validate effective selection before compiling/installing the auditor.
				const rust = await run('RUST-VERSION', 'rustc', ['--version']);
				assert.equal(
					rust.stdout.trim().split(' ')[1],
					contract.pins.rust.version,
					'Override rustup incompatível; confira rustup override list.'
				);
				const prefix = path.join(
					process.env.XDG_DATA_HOME ?? path.join(homedir(), '.local/share'),
					contract.directories.auditRelativePath
				);
				const audit = path.join(prefix, 'bin/cargo-audit');
				if (!existsSync(audit))
					await run(
						'AUDITOR',
						'cargo',
						[
							'install',
							'cargo-audit',
							'--version',
							contract.pins.cargoAudit.version,
							'--locked',
							'--root',
							prefix
						],
						{ CARGO_TARGET_DIR: path.join(directory, 'audit-target'), CARGO_BUILD_JOBS: '2' },
						1800000
					);
				const auditVersion = await run('AUDITOR-VERSION', audit, ['--version']);
				assert.equal(auditVersion.stdout.trim().split(' ')[1], contract.pins.cargoAudit.version);
			}
			if (target !== 'ci') {
				const doctor = await run('DOCTOR', 'pnpm', ['run', 'doctor', '--target', target]);
				receipt.doctor = doctor.stdout;
			}
			assert.deepEqual(provisionLocks(), locks, 'Setup alterou locks.');
			assert.equal(ciFingerprint(root).inputHash, receipt.inputHash, 'Setup alterou fontes.');
			receipt.status = 'passed';
		} catch (error) {
			receipt.status = 'failed';
			receipt.error = error.message;
			throw error;
		} finally {
			receipt.finishedAt = new Date().toISOString();
			writeJSON(path.join(directory, 'evidence.json'), receipt);
		}
	},
	() => pruneArtifactPayloads(artifactRoot(), directory, ['npm-cache', 'audit-target'])
);
// stdout is a single structured pointer, suitable for CI and the provision probes.
console.log(JSON.stringify({ evidence: path.join(directory, 'evidence.json') }));
