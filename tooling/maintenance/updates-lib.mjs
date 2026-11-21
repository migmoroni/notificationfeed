import assert from 'node:assert/strict';

export function updateGroups(groups, phase, unit) {
	if (Number(phase) >= 2.5) {
		const order = ['checks', 'lint', 'format', 'dev', 'doctor'];
		if (phase === '2.5' && unit !== null)
			assert.ok(order.includes(unit), `unidade não registrada: ${phase}/${unit}`);
		return groups.filter(
			(group) =>
				Number(group.phase) <= Number(phase) &&
				(group.phase !== '2.5' ||
					Number(phase) > 2.5 ||
					unit === null ||
					(order.indexOf(group.adoptionUnit) >= 0 &&
						order.indexOf(group.adoptionUnit) <= order.indexOf(unit)))
		);
	}
	const required = groups.filter(
		(group) => Number(group.phase) <= Number(phase) && group.phase !== '2.5'
	);
	if (unit === null) return required;
	const index = required.findIndex((group) => group.phase === phase && group.id === unit);
	assert.ok(index >= 0, `unidade não registrada: ${phase}/${unit}`);
	return required.slice(0, index + 1);
}
export function assertUpdateTargets(groups, phase, unit, nodes) {
	for (const group of updateGroups(groups, phase, unit)) {
		for (const dependency of group.dependencies) {
			assert.ok(
				nodes.some((node) => node.name === dependency.name && node.version === dependency.after),
				`alvo não resolvido: ${group.id}/${dependency.name}@${dependency.after}`
			);
		}
	}
}
export function assertUnitSecurityPolicy(findings, phase, unit, groups) {
	const required = new Set(updateGroups(groups, phase, unit).map((group) => group.id));
	const registered = new Set(groups.map((group) => group.id));
	for (const finding of findings) {
		assert.ok(registered.has(finding.group), `grupo de segurança não registrado: ${finding.key}`);
		if (finding.exposure !== 'applicable' || finding.status !== 'scheduled' || phase === '2.1')
			continue;
		const finalPolicy = Number(phase) >= 2.4 && unit === null;
		const urgentPolicy = finding.urgent && Number(phase) >= 2.3;
		assert.ok(
			!(finalPolicy || urgentPolicy || required.has(finding.group)),
			`risco pendente na unidade/fase: ${finding.key}`
		);
	}
}
