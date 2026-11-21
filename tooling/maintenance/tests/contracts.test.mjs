import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const manifest = JSON.parse(
	readFileSync('docs/plans/etapa-2-base-tecnica-e-ambiente/contracts/etapa-2.json', 'utf8')
);

test('manifesto preserva sequência, fronteiras e política de aprovação', () => {
	assert.equal(manifest.schemaVersion, 1);
	assert.deepEqual(manifest.phaseOrder, ['2.1', '2.2', '2.3', '2.4', '2.5', '2.6', '2.7']);
	manifest.phaseOrder.forEach((phase, index) => {
		assert.equal(manifest.phasePredecessors[phase], manifest.phaseOrder[index - 1] ?? null);
		assert.ok(
			readFileSync(
				`docs/plans/etapa-2-base-tecnica-e-ambiente/${manifest.phaseDocuments[phase]}`,
				'utf8'
			).includes('Quality Gate')
		);
	});
	assert.deepEqual(manifest.fixedUnits['2.1'], ['bootstrap', 'diagnosis']);
	assert.deepEqual(manifest.workspacePackages, {
		'apps/web': '@notfeed/web',
		'apps/desktop': '@notfeed/desktop',
		'packages/notfeed': '@notfeed/product'
	});
	for (const key of [
		'allowSkippedRequiredChecks',
		'allowFailedBaselineTests',
		'allowRelaxedRulesToPass',
		'allowNewBusinessModules',
		'allowCompatibilityWrappers'
	])
		assert.equal(manifest[key], false);
	assert.equal(manifest.gateSuccessExitCode, 0);
	assert.deepEqual(manifest.requireRealCiAtPhaseClose, ['2.6', '2.7']);
	assert.equal(manifest.protected.databaseVersion, 18);
	assert.equal(manifest.protected.databaseName, 'notfeed-v2');
	assert.equal(manifest.protected.strictTypeScript, true);
	assert.equal(manifest.protected.checkJs, true);
});
