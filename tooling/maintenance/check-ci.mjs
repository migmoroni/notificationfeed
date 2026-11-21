import assert from 'node:assert/strict';
import path from 'node:path';
import { readJSON, writeJSON, execute } from '../checks/io.mjs';
import { ciFingerprint } from '../checks/ci-lib.mjs';
import { collectLiveCI } from '../checks/ci-live.mjs';
const args = process.argv.slice(2);
assert.ok(
	args.length === 2 && ['--run', '--receipt'].includes(args[0]),
	'uso: check-ci.mjs --run <id> ou --receipt <arquivo>'
);
const runId = args[0] === '--run' ? Number(args[1]) : readJSON(args[1]).runId;
const headSha = (await execute('git', ['rev-parse', 'HEAD'])).stdout.trim();
const fingerprint = ciFingerprint();
const result = await collectLiveCI(runId, {
	headSha,
	inputHash: fingerprint.inputHash,
	contractsHash: fingerprint.contractsHash,
	locks: fingerprint.locks
});
assert.equal(
	ciFingerprint().inputHash,
	fingerprint.inputHash,
	'fontes alteradas durante verificação remota'
);
writeJSON(path.resolve('.artifacts/ci/latest.json'), result);
console.log(JSON.stringify(result));
