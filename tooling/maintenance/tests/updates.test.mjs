import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assertUpdateTargets, assertUnitSecurityPolicy, updateGroups } from '../updates-lib.mjs';

const groups = [
	{ id: 'network', phase: '2.2', dependencies: [{ name: 'network', after: '2.0.0' }] },
	{ id: 'tls', phase: '2.2', dependencies: [{ name: 'tls', after: '3.0.0' }] },
	{ id: 'web', phase: '2.4', dependencies: [{ name: 'web', after: '4.0.0' }] }
];
test('ferramentas entram apenas na unidade consumidora de lint e formatação', () => {
	const tools = [
		...groups,
		{ id: 'lint-tools', phase: '2.5', adoptionUnit: 'lint' },
		{ id: 'format-tools', phase: '2.5', adoptionUnit: 'format' }
	];
	assert.deepEqual(
		updateGroups(tools, '2.5', 'checks').map((group) => group.id),
		groups.map((group) => group.id)
	);
	assert.equal(updateGroups(tools, '2.5', 'lint').at(-1).id, 'lint-tools');
	assert.equal(updateGroups(tools, '2.5', 'format').at(-1).id, 'format-tools');
	assert.deepEqual(updateGroups(tools, '2.5', 'provision'), tools);
	assert.equal(updateGroups(tools, '2.6', 'configuration').length, tools.length);
	assert.throws(() => updateGroups(tools, '2.5', 'unknown'));
});
test('unidade exige alvos exatos e grupos anteriores; desconhecida ou versão antiga reprova', () => {
	const nodes = [
		{ name: 'network', version: '2.0.0' },
		{ name: 'tls', version: '1.0.0' }
	];
	assert.doesNotThrow(() => assertUpdateTargets(groups, '2.2', 'network', nodes));
	assert.throws(() => assertUpdateTargets(groups, '2.2', 'tls', nodes));
	assert.throws(() => assertUpdateTargets(groups, '2.2', null, nodes));
	assert.throws(() => assertUpdateTargets(groups, '2.2', 'unknown', nodes));
	assert.throws(() =>
		assertUpdateTargets(groups, '2.2', 'network', [{ name: 'network', version: '1.0.0' }])
	);
	assert.doesNotThrow(() =>
		assertUpdateTargets(groups, '2.2', null, [...nodes, { name: 'tls', version: '3.0.0' }])
	);
});
test('segurança de unidade permite somente grupos futuros registrados; fechamento exige todos', () => {
	const findings = [
		{ group: 'tls', urgent: true, status: 'scheduled', exposure: 'applicable', key: 'tls-risk' }
	];
	assert.doesNotThrow(() => assertUnitSecurityPolicy(findings, '2.2', 'network', groups));
	assert.throws(() => assertUnitSecurityPolicy(findings, '2.2', 'tls', groups));
	assert.throws(() => assertUnitSecurityPolicy(findings, '2.2', null, groups));
	assert.throws(() => assertUnitSecurityPolicy(findings, '2.2', 'unknown', groups));
	assert.throws(() =>
		assertUnitSecurityPolicy([{ ...findings[0], group: 'unknown' }], '2.2', 'network', groups)
	);
	const web = [{ ...findings[0], group: 'web', urgent: false }];
	assert.doesNotThrow(() => assertUnitSecurityPolicy(web, '2.2', null, groups));
	assert.throws(() => assertUnitSecurityPolicy(web, '2.4', 'web', groups));
	assert.throws(() => assertUnitSecurityPolicy(findings, '2.4', 'web', groups));
});
