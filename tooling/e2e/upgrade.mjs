import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readJSON, writeJSON, filesUnder, hash, execute } from '../checks/io.mjs';

const contract = readJSON('tooling/e2e/upgrade-contract.json');
const options = process.argv.slice(2);
assert.ok(options.length === 0 || (options.length === 1 && options[0] === '--reproduced'));
const reproduced = options[0] === '--reproduced';
const recipe = readJSON('tooling/e2e/reference/stage-2-entry.json');
const referenceBuild = reproduced ? recipe.buildDestination : contract.referenceBuild;
const reference = readJSON(reproduced ? recipe.evidenceDestination : contract.referenceManifest);
const actualFiles = filesUnder(referenceBuild);
assert.deepEqual(
	actualFiles,
	reference.buildFiles.map((item) => item.file)
);
for (const item of reference.buildFiles)
	assert.equal(hash(readFileSync(item.file)), item.hash, `referência alterada: ${item.file}`);
const before = readJSON(`${referenceBuild}/_app/version.json`).version;
const after = readJSON(`${contract.targetBuild}/_app/version.json`).version;
assert.notEqual(before, after, 'a atualização precisa de dois builds distintos');
const result = await execute('pnpm', ['run', 'test:e2e', '--project=chromium'], {
	env: { NOTFEED_UPGRADE: '1', NOTFEED_REFERENCE_BUILD: referenceBuild }
});
console.log(result.stdout);
const report = readJSON('.artifacts/e2e/upgrade-report.json');
assert.equal(report.stats.expected, 3);
for (const field of ['unexpected', 'skipped', 'flaky']) assert.equal(report.stats[field], 0);
writeJSON('.artifacts/e2e/upgrade-evidence.json', {
	referenceVersion: before,
	targetVersion: after,
	referenceIndexHash: hash(readFileSync(`${referenceBuild}/index.html`)),
	targetIndexHash: hash(readFileSync(`${contract.targetBuild}/index.html`)),
	referenceCheckpoint: reference.inputHash,
	origin: contract.origin,
	sameContext: true,
	clearedStorage: false,
	result,
	tests: report.stats
});
console.log(
	`Atualização da entrada da etapa 2 (${before}) → candidato (${after}): dados, controlador e offline aprovados`
);
