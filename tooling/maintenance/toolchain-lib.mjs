import assert from 'node:assert/strict';

export function assertToolchainPins(expected, actual) {
	for (const [name, version] of Object.entries(expected)) {
		assert.equal(actual[name]?.version, version, `versão real divergente: ${name}`);
		assert.equal(actual[name].declared, version, `pin divergente: ${name}`);
		if (name === 'node') assert.equal(actual[name].engine, version, 'engine Node divergente');
		if (name === 'rust')
			for (const component of ['rustfmt', 'clippy'])
				assert.ok(
					actual[name].components.includes(component),
					`componente Rust ausente: ${component}`
				);
	}
}
