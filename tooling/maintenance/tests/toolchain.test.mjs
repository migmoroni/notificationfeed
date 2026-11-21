import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assertToolchainPins } from '../toolchain-lib.mjs';

test('runtime exige versão real, pin e engines coerentes; Rust exige componentes', () => {
	const expected = { node: '24.22.3' };
	const actual = { node: { version: '24.22.3', declared: '24.22.3', engine: '24.22.3' } };
	assert.doesNotThrow(() => assertToolchainPins(expected, actual));
	for (const field of ['version', 'declared', 'engine'])
		assert.throws(() =>
			assertToolchainPins(expected, { node: { ...actual.node, [field]: '22.21.1' } })
		);
	assert.throws(() => assertToolchainPins(expected, {}));
	const rust = {
		rust: { version: '1.100.0', declared: '1.100.0', components: ['clippy', 'rustfmt'] }
	};
	assert.doesNotThrow(() => assertToolchainPins({ rust: '1.100.0' }, rust));
	assert.throws(() =>
		assertToolchainPins({ rust: '1.100.0' }, { rust: { ...rust.rust, components: ['rustfmt'] } })
	);
});
