import assert from 'node:assert/strict';
import path from 'node:path';
import { hash, readJSON } from './io.mjs';

export function assertNativeProject(project, contract) {
	const fields = ['name', 'optional', 'features', 'uses_default_features', 'kind', 'target'];
	const actual = {
		name: project.name,
		version: project.version,
		edition: project.edition,
		rust_version: project.rust_version,
		features: project.features,
		dependencies: project.dependencies
			.map((dependency) => Object.fromEntries(fields.map((field) => [field, dependency[field]])))
			.sort((a, b) => a.name.localeCompare(b.name))
	};
	assert.deepEqual(
		actual,
		contract,
		'identidade, mínimo Rust, features ou dependências nativas declaradas mudaram'
	);
}

export function nativePaths(contract, root, target) {
	const configured = path.resolve(root, contract.target);
	const destination = path.resolve(root, target ?? contract.target);
	const relocated = { ...contract, target: destination };
	for (const field of ['binary', 'bundle']) {
		const relative = path.relative(configured, path.resolve(root, contract[field]));
		assert.ok(
			relative && !relative.startsWith('..') && !path.isAbsolute(relative),
			'artefato fora do target Cargo'
		);
		relocated[field] = path.join(destination, relative);
	}
	return relocated;
}

export function assertNativePayload(compiled, extracted, assets, desktopEntry) {
	assert.equal(extracted.subarray(0, 4).toString('hex'), '7f454c46', 'binário interno não é ELF');
	assert.equal(compiled.subarray(0, 4).toString('hex'), '7f454c46', 'compilado não é ELF');
	assert.match(desktopEntry, /^Name=Notfeed$/m);
	assert.match(desktopEntry, /^Exec=notfeed(?:\s.*)?$/m);
	assert.match(desktopEntry, /^Type=Application$/m);
	assert.ok(extracted.includes(Buffer.from('app.notfeed.desktop')), 'identidade desktop ausente');
	for (const asset of assets)
		assert.ok(extracted.includes(Buffer.from(asset)), `asset atual não embutido: ${asset}`);
}
export function assertNativeSections(compiled, extracted) {
	const contract = readJSON('tooling/checks/contracts/native.json');
	assert.deepEqual(Object.keys(compiled).sort(), [...contract.payloadSections].sort());
	assert.deepEqual(Object.keys(extracted).sort(), [...contract.payloadSections].sort());
	const before = Buffer.from(contract.bundleMarkerBefore);
	const after = Buffer.from(contract.bundleMarkerAfter);
	assert.equal(before.length, after.length);
	const expectedRodata = Buffer.from(compiled['.rodata']);
	const index = expectedRodata.indexOf(before);
	assert.ok(index >= 0, 'marcador Tauri ausente');
	assert.equal(expectedRodata.indexOf(before, index + 1), -1, 'marcador Tauri duplicado');
	after.copy(expectedRodata, index);
	for (const name of contract.payloadSections)
		assert.equal(
			hash(extracted[name]),
			hash(name === '.rodata' ? expectedRodata : compiled[name]),
			`${name}: payload nativo alterado`
		);
}
