import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdirSync, mkdtempSync } from 'node:fs';
import { execute, readJSON, writeJSON } from './io.mjs';
import { provisionPrebuild } from './download.mjs';
const args = process.argv.slice(2);
assert.ok(
	args.length === 0 || (args.length === 2 && args[0] === '--cache'),
	'uso: node tooling/checks/prebuild.mjs [--cache <diretório novo>]'
);
mkdirSync('.artifacts/setup', { recursive: true });
const cache = path.resolve(
	args[1] ?? path.join(mkdtempSync('.artifacts/setup/prebuild-'), 'npm-cache')
);
const contract = readJSON('tooling/checks/contracts/prebuild.json');
const graph = JSON.parse(
	(
		await execute('pnpm', [
			'list',
			'--recursive',
			'--lockfile-only',
			'--depth',
			'Infinity',
			'--json'
		])
	).stdout
);
const versions = new Set();
function visit(entry) {
	for (const kind of ['dependencies', 'devDependencies', 'optionalDependencies'])
		for (const [name, target] of Object.entries(entry[kind] ?? {})) {
			if (name === contract.package) versions.add(target.version);
			visit(target);
		}
}
for (const project of graph) visit(project);
const download = await provisionPrebuild(contract, { cache, versions: [...versions] });
const evidence = path.resolve(cache, '../prebuild.json');
writeJSON(evidence, {
	schemaVersion: 1,
	status: 'passed',
	cache,
	versions: [...versions],
	download
});
console.log(
	JSON.stringify({
		cache,
		evidence,
		install:
			'Use npm_config_cache=<cache> pnpm install --frozen-lockfile; todos os scripts permanecem habilitados.'
	})
);
