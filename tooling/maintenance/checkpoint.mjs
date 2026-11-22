import assert from 'node:assert/strict';
import {
	copyFileSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { artifactRoot, artifactScope, candidateCleanup } from '../checks/artifacts-lib.mjs';
import { prepareProvisionCandidate } from '../checks/provision-probe.mjs';
import {
	assertProcess,
	assertStable,
	hash,
	plan,
	readJSON,
	runProcess,
	snapshot,
	writeJSON
} from './lib.mjs';

assert.equal(process.argv.length, 2, 'checkpoint.mjs não aceita flags para omitir verificações');
const root = process.cwd();
const contract = readJSON('tooling/maintenance/contracts/consolidation.json');
assert.equal(contract.schemaVersion, 1);
assert.equal(contract.phase, '2.7');
for (const key of ['restoreOutsideRepository', 'prepareFromRestoredSources', 'preserveGitIndex'])
	assert.equal(contract.checkpoint[key], true);
const output = path.join(artifactRoot(), 'maintenance/checkpoints/2.7');
mkdirSync(output, { recursive: true });
const directory = mkdtempSync(path.join(output, 'current-'));
const evidence = path.join(directory, 'evidence.json');
const before = snapshot(root);
const receipt = {
	schemaVersion: 1,
	status: 'running',
	phase: '2.7',
	inputHash: before.hash,
	startedAt: new Date().toISOString(),
	commands: []
};
let temporary, prepared;
try {
	await artifactScope(
		artifactRoot(),
		directory,
		async () => {
			async function command(id, executable, args, cwd = root) {
				const result = await runProcess(executable, args, {
					cwd,
					log: path.join(directory, `${id}.log`),
					timeoutMs: 240000
				});
				receipt.commands.push({ id, ...result });
				assertProcess(result);
				return readFileSync(result.stdoutPath, 'utf8').trim();
			}
			const indexBefore = await command('index-before', 'git', ['ls-files', '--stage', '-z']);
			receipt.revision = await command('revision', 'git', ['rev-parse', 'HEAD']);
			for (const file of contract.activeDocumentation) assert.ok(existsSync(path.join(root, file)));
			const locks = () =>
				Object.fromEntries(
					contract.checkpoint.locks.map((file) => [file, hash(readFileSync(path.join(root, file)))])
				);
			receipt.locks = locks();
			writeJSON(path.join(directory, 'snapshot.json'), before);
			copyFileSync(path.join(root, plan, 'state.md'), path.join(directory, 'state.md'));
			writeFileSync(
				path.join(directory, 'files.list'),
				`${before.files.map((file) => file.path).join('\0')}\0`
			);
			await command('bundle', 'git', [
				'bundle',
				'create',
				path.join(directory, 'head.bundle'),
				'HEAD'
			]);
			await command('bundle-verify', 'git', [
				'bundle',
				'verify',
				path.join(directory, 'head.bundle')
			]);
			await command('archive', 'tar', [
				'--create',
				'--gzip',
				'--file',
				path.join(directory, 'sources.tar.gz'),
				'--directory',
				root,
				'--null',
				'--verbatim-files-from',
				'--files-from',
				path.join(directory, 'files.list')
			]);
			receipt.files = Object.fromEntries(
				contract.checkpoint.files.map((file) => [
					file,
					hash(readFileSync(path.join(directory, file)))
				])
			);
			temporary = mkdtempSync(path.join(tmpdir(), 'notfeed-checkpoint-'));
			const relative = path.relative(root, temporary);
			assert.ok(
				relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative),
				'restauração dentro do repositório'
			);
			const restored = path.join(temporary, 'restored');
			await command('restore-clone', 'git', [
				'clone',
				'--no-checkout',
				path.join(directory, 'head.bundle'),
				restored
			]);
			await command('restore-index', 'git', ['read-tree', 'HEAD'], restored);
			await command('restore-sources', 'tar', [
				'--extract',
				'--gzip',
				'--file',
				path.join(directory, 'sources.tar.gz'),
				'--directory',
				restored
			]);
			copyFileSync(path.join(directory, 'state.md'), path.join(restored, plan, 'state.md'));
			assertStable(before, snapshot(restored));
			assert.equal(
				await command('restored-revision', 'git', ['rev-parse', 'HEAD'], restored),
				receipt.revision
			);
			// All inputs to the clean bootstrap/setup come from the recovered archive.
			prepared = await prepareProvisionCandidate(restored, path.join(directory, 'installation'));
			assertStable(before, snapshot(prepared.candidate));
			receipt.installation = path.join(prepared.area, 'context.json');
			receipt.installationHash = hash(readFileSync(receipt.installation));
			receipt.restoredHash = snapshot(restored).hash;
			receipt.restoredOutsideRepository = true;
			assertStable(before, snapshot(root));
			assert.deepEqual(locks(), receipt.locks);
			assert.equal(await command('index-after', 'git', ['ls-files', '--stage', '-z']), indexBefore);
			for (const [file, expected] of Object.entries(receipt.files))
				assert.equal(hash(readFileSync(path.join(directory, file))), expected);
		},
		() => {
			if (temporary) rmSync(temporary, { recursive: true, force: true });
			return prepared ? candidateCleanup(artifactRoot(), prepared.area) : [];
		}
	);
	receipt.status = 'passed';
} catch (error) {
	receipt.status = 'failed';
	receipt.failure = error.message;
	process.exitCode = 1;
}
receipt.endedAt = new Date().toISOString();
writeJSON(evidence, receipt);
console.log(JSON.stringify({ evidence }));
