import assert from 'node:assert/strict';
import path from 'node:path';
import { collectSecurity, checkSecurity } from './security-run.mjs';
const args = process.argv.slice(2);
assert.ok(
	args.length === 1 && ['collect', 'check'].includes(args[0]),
	'uso: security.mjs collect|check'
);
if (args[0] === 'check') console.log(JSON.stringify(await checkSecurity()));
else {
	const result = await collectSecurity();
	console.log(
		JSON.stringify({
			collection: path.join(result.directory, 'collection.json'),
			findings: result.receipt.findings.length
		})
	);
}
