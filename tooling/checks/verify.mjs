import { artifactRoot, artifactScope } from './artifacts-lib.mjs';
import assert from 'node:assert/strict';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { readJSON, writeJSON } from './io.mjs';
import { runSteps } from './verify-lib.mjs';
const args = process.argv.slice(2);
const profiles = readJSON('tooling/checks/contracts/verify.json').profiles;
assert.ok(
	args.length === 1 && Object.hasOwn(profiles, args[0]),
	'uso: verify.mjs quick|rust|integration; flags de exclusão não são aceitas'
);
const profile = args[0],
	startedAt = new Date().toISOString();
const directory = path.resolve('.artifacts/checks', profile, randomUUID());
mkdirSync(directory, { recursive: true });
await artifactScope(artifactRoot(), directory, async () => {
	const receipt = { schemaVersion: 1, status: 'running', profile, startedAt, commands: [] };
	try {
		receipt.commands = await runSteps(profiles[profile], {
			directory,
			records: receipt.commands,
			env: { NOTFEED_BUILD_STARTED_AT: startedAt }
		});
		receipt.status = 'passed';
	} catch (error) {
		receipt.status = 'failed';
		receipt.error = error.message;
		throw error;
	} finally {
		receipt.finishedAt = new Date().toISOString();
		writeJSON(path.join(directory, 'evidence.json'), receipt);
	}
	console.log(JSON.stringify({ evidence: path.join(directory, 'evidence.json') }));
});
