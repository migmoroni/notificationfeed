import assert from 'node:assert/strict';
import { checkSecurity } from '../checks/security-run.mjs';
import { readJSON, writeJSON } from './lib.mjs';
import { assertUnitSecurityPolicy, updateGroups } from './updates-lib.mjs';
const args = process.argv.slice(2);
assert.ok(
	(args.length === 2 || (args.length === 4 && args[2] === '--unit')) && args[0] === '--phase',
	'uso: security.mjs --phase <fase> [--unit <grupo>]'
);
const phase = args[1],
	unit = args[3] ?? null;
const groups = readJSON('tooling/maintenance/contracts/updates.json').groups;
if (unit !== null) updateGroups(groups, phase, unit);
const result = await checkSecurity();
const evidence = readJSON(result.evidence);
assertUnitSecurityPolicy(evidence.findings, phase, unit, groups);
writeJSON(result.evidence, { ...evidence, phase, unit });
console.log(JSON.stringify(result));
