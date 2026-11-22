import assert from 'node:assert/strict';
import { readJSON, plan, parseRequest } from './lib.mjs';
import { validateRealized } from './diagnosis-lib.mjs';
import { assertProductContracts } from './source-contracts.mjs';
import { npmGraph } from './inventory-lib.mjs';
import { assertUpdateTargets, updateGroups } from './updates-lib.mjs';
import { readFileSync } from 'node:fs';
import { assertManager } from './manager.mjs';
import { assertToolchainPins } from './toolchain-lib.mjs';
import { execute } from '../checks/io.mjs';
import { assertNativeProject } from '../checks/native-lib.mjs';

assert.equal(process.argv[2], '--phase', 'uso: check.mjs --phase <fase> [--unit <unidade>]');
const manifest = readJSON(`${plan}/contracts/etapa-2.json`);
const groups = readJSON('tooling/maintenance/contracts/updates.json').groups;
const request = parseRequest(process.argv.slice(3), manifest, {
	2.2: groups.filter((group) => group.phase === '2.2').map((group) => group.id),
	2.4: groups.filter((group) => group.phase === '2.4').map((group) => group.id)
});
assert.equal(manifest.executionStarted, true, 'execução não iniciada no manifesto');
if (request.phase === '2.1' && request.unit === 'bootstrap')
	console.log('Contrato 2.1/bootstrap válido; não aprova diagnóstico nem fases posteriores.');
else {
	const names = ['baseline', 'toolchain', 'security', 'updates', 'lint-policy', 'ci-policy'];
	validateRealized(
		Object.fromEntries(
			names.map((name) => [name, readJSON(`tooling/maintenance/contracts/${name}.json`)])
		)
	);
	assertProductContracts(request.phase);
	const nativeMetadata = JSON.parse(
		(
			await execute('cargo', [
				'metadata',
				'--locked',
				'--no-deps',
				'--format-version',
				'1',
				'--manifest-path',
				'apps/desktop/src-tauri/Cargo.toml'
			])
		).stdout
	);
	assert.equal(nativeMetadata.packages.length, 1, 'crate adicional fora do escopo');
	assertNativeProject(
		nativeMetadata.packages[0],
		readJSON('tooling/checks/contracts/native-project.json')
	);
	const graph = Number(request.phase) >= 2.3 ? await assertManager(request.phase) : null;
	if (request.phase === '2.2' || Number(request.phase) >= 2.4) {
		for (const group of updateGroups(groups, request.phase, request.unit)) {
			for (const [name, range] of Object.entries(group.peerFloors ?? {}))
				assert.equal(
					readJSON('packages/notfeed/package.json').peerDependencies[name],
					range,
					`peer divergente: ${name}`
				);
		}
		const cargo = [
			...readFileSync('apps/desktop/src-tauri/Cargo.lock', 'utf8').matchAll(
				/\[\[package\]\]\nname = "([^"]+)"\nversion = "([^"]+)"/g
			)
		].map((match) => ({ name: match[1], version: match[2] }));
		const nodes = [...(graph?.nodes ?? npmGraph(readJSON('package-lock.json')).nodes), ...cargo];
		if (Number(request.phase) >= 2.4) {
			const expected = Object.fromEntries(
				updateGroups(groups, request.phase, request.unit)
					.flatMap((group) => group.dependencies)
					.filter((dependency) => ['node', 'rust', 'cargo-audit'].includes(dependency.name))
					.map((dependency) => [dependency.name, dependency.after])
			);
			const actual = {
				node: {
					version: process.versions.node,
					declared: readFileSync('.nvmrc', 'utf8').trim(),
					engine: readJSON('package.json').engines.node
				}
			};
			if (expected.rust) {
				const config = readFileSync('rust-toolchain.toml', 'utf8');
				assert.equal(
					config.trim(),
					`[toolchain]\nchannel = "${expected.rust}"\nprofile = "minimal"\ncomponents = ["rustfmt", "clippy"]`
				);
				const version = (await execute('rustc', ['--version'])).stdout.match(
					/^rustc (\d+\.\d+\.\d+)/
				)?.[1];
				const components = (
					await execute('rustup', [
						'component',
						'list',
						'--installed',
						'--toolchain',
						expected.rust
					])
				).stdout
					.split('\n')
					.map((line) => line.split('-')[0]);
				actual.rust = { version, declared: expected.rust, components };
			}
			if (expected['cargo-audit'])
				actual['cargo-audit'] = {
					version: (await execute('cargo', ['audit', '--version'])).stdout.match(
						/(\d+\.\d+\.\d+)/
					)?.[1],
					declared: readJSON('tooling/maintenance/contracts/toolchain.json').tools.find(
						(tool) => tool.name === 'cargo-audit'
					).version
				};
			assertToolchainPins(expected, actual);
			nodes.push(
				...Object.entries(actual).map(([name, value]) => ({ name, version: value.version }))
			);
		}
		assertUpdateTargets(groups, request.phase, request.unit, nodes);
	}
	console.log(
		`Contratos realizados e fronteiras ${request.phase}/${request.unit ?? 'final'} válidos.`
	);
}
