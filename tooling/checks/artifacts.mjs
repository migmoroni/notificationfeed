import assert from 'node:assert/strict';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { artifactRoot, cleanArtifacts } from './artifacts-lib.mjs';
import { writeJSON } from './io.mjs';

const args = process.argv.slice(2);
assert.ok(
	new Set(args).size === args.length &&
		args.every((arg) => ['--caches', '--dry-run'].includes(arg)),
	'uso: artifacts.mjs [--caches] [--dry-run]'
);
const root = artifactRoot();
const receipt = await cleanArtifacts(root, {
	caches: args.includes('--caches'),
	dryRun: args.includes('--dry-run')
});
const evidence = path.join(root, 'retention', `${randomUUID()}.json`);
writeJSON(evidence, { ...receipt, finishedAt: new Date().toISOString() });
console.log(JSON.stringify({ evidence, ...receipt }, null, 2));
