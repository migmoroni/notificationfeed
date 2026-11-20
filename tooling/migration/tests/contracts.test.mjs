import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync('docs/plans/etapa-1-migracao-estrutural/contracts/etapa-1.json', 'utf8'));
const contracts = JSON.parse(readFileSync('tooling/migration/contracts.json', 'utf8'));

// Bootstrap independente do runner: primeiro validar as leis que ele implementará.
function validate(value) {
  assert.equal(value.version, 1);
  assert.equal(value.scope, 'stage-1-structural-migration');
  assert.equal(value.packageManager, 'npm');
  assert.deepEqual(value.phaseOrder, ['P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6']);
  value.phaseOrder.forEach((phase, i) => assert.equal(value.phasePredecessors[phase], value.phaseOrder[i - 1] ?? null));
  assert.deepEqual(value.workspaces, Object.keys(value.packages));
  assert.deepEqual(value.sourceEdges, [{ from: 'apps/web', to: 'packages/notfeed' }]);
  assert.deepEqual(value.artifactEdges, [{ from: 'apps/desktop', to: 'apps/web/build' }]);
  assert.deepEqual(value.approvedNewDevDependencies, ['@playwright/test']);
  assert.deepEqual(value.phaseCycle, ['specification', 'contract', 'test', 'implementation', 'quality-gate']);
  assert.equal(value.gateSuccessExitCode, 0);
  for (const key of ['allowSkippedRequiredChecks', 'allowFailedBaselineTests', 'allowNewBusinessModules', 'allowCompatibilityWrappers']) assert.equal(value[key], false);
  assert.equal(value.protected.databaseName, 'notfeed-v2');
  assert.equal(value.protected.databaseVersion, 18);
  assert.equal(value.protected.desktopIdentifier, 'app.notfeed.desktop');
  assert.equal(value.protected.storageBackend, 'indexeddb');
  assert.deepEqual(Object.keys(contracts.phases), value.phaseOrder);
}

test('contrato aceito e schemas de inventário/evidência definidos', () => {
  validate(manifest);
  assert.ok(contracts.inventory.required.includes('tests'));
  assert.ok(contracts.evidence.processRequired.includes('signal'));
  assert.deepEqual(contracts.evidence.success, { exitCode: 0, signal: null, timedOut: false });
});
for (const [name, mutate] of [
  ['ciclo de dependências', x => x.sourceEdges.push({ from: 'packages/notfeed', to: 'apps/web' })],
  ['predecessor ausente', x => x.phasePredecessors.P3 = null],
  ['biblioteca não autorizada', x => x.approvedNewDevDependencies.push('other-library')],
  ['sucesso não zero', x => x.gateSuccessExitCode = 1],
  ['dados protegidos alterados', x => x.protected.databaseVersion++],
  ['checagem ignorada', x => x.allowSkippedRequiredChecks = true],
  ['fase ausente', x => x.phaseOrder.pop()]
]) test(`rejeita ${name}`, () => {
  const invalid = structuredClone(manifest);
  mutate(invalid);
  assert.throws(() => validate(invalid));
});
