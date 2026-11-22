import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { plan, manifest, predecessor, validateActual, lintArchitecture, inventory, readJSON, writeJSON, reportIdentities, assertTestIdentities } from './lib.mjs';

const [mode, phase] = process.argv.slice(2);
assert.ok(manifest.phaseOrder.includes(phase), 'informar fase P0–P6');
predecessor(phase);
if (mode === '--spec') {
  assert.ok(existsSync(`${plan}/fases/${({ P0: 'P0-referencia-e-arbitro', P1: 'P1-referencia-pwa', P2: 'P2-workspace-e-aplicativos', P3: 'P3-pacote-unico', P4: 'P4-pwa-e-dados', P5: 'P5-desktop', P6: 'P6-consolidacao' })[phase]}.md`));
  console.log(`${phase}: especificação e predecessor validados`);
} else if (mode === '--realized') {
  validateActual(phase);
  console.log(`${phase}: contratos realizados válidos`);
} else if (mode === '--lint') {
  lintArchitecture(phase);
  console.log(`${phase}: arquitetura válida`);
} else if (mode === '--reference') {
  const report = readJSON('.artifacts/migration/unit.json');
  const file = 'tooling/migration/reference/inventory.json';
  if (existsSync(file)) assertTestIdentities(readJSON(file).tests, report);
  else {
    assert.equal(phase, 'P0');
    const value = inventory(phase);
    value.tests = reportIdentities(report);
    writeJSON(file, value);
  }
  console.log(`${phase}: inventário e todas as identidades de testes validados`);
} else throw new Error(`modo desconhecido ${mode}`);
