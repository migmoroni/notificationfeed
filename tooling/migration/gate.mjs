import assert from 'node:assert/strict';
import { mkdirSync, cpSync } from 'node:fs';
import { resolve } from 'node:path';
import { manifest, contracts, hash, readJSON, writeJSON, inputHash, predecessor, runProcess, assertProcess, assertTestIdentities } from './lib.mjs';

const [phase, ...extra] = process.argv.slice(2);
assert.equal(extra.length, 0, 'o gate não aceita flags de exclusão');
predecessor(phase);
const dir = `.artifacts/migration/${phase}/${new Date().toISOString().replaceAll(':', '-')}`;
mkdirSync(dir, { recursive: true });
const commands = {
  contracts: ['npm', ['run', 'check:contracts', '--', '--realized', phase]],
  architecture: ['npm', ['run', 'lint:architecture', '--', '--phase', phase]],
  arbiter: ['npm', ['run', 'test:gate']],
  types: ['npm', ['run', 'check']],
  unit: ['npm', ['run', 'test:run', '--', '--reporter=json', `--outputFile=${resolve('.artifacts/migration/unit.json')}`]],
  build: ['npm', ['run', 'build']],
  reference: ['node', ['tooling/migration/check.mjs', '--reference', phase]],
  'e2e-types': ['npm', ['run', 'check:e2e']],
  e2e: ['npm', ['run', 'test:e2e', '--', '--project=chromium']],
  'reference-build': ['node', ['tooling/e2e/reference.mjs']],
  'cargo-metadata': ['cargo', ['metadata', '--locked', '--no-deps', '--format-version', '1', '--manifest-path', 'apps/desktop/src-tauri/Cargo.toml']],
  'dev-smoke': ['node', ['tooling/migration/dev-smoke.mjs']],
  exports: ['node', ['tooling/migration/exports.mjs']],
  upgrade: ['node', ['tooling/e2e/upgrade.mjs']],
  'cargo-check': ['cargo', ['check', '--locked', '--manifest-path', 'apps/desktop/src-tauri/Cargo.toml']],
  'cargo-test': ['cargo', ['test', '--locked', '--manifest-path', 'apps/desktop/src-tauri/Cargo.toml']],
  appimage: ['npm', ['run', 'tauri:appimage']],
  bundle: ['node', ['tooling/migration/bundle.mjs']],
  install: ['node', ['tooling/migration/install.mjs']],
  'reference-rebuild': ['node', ['tooling/e2e/reproduce-reference.mjs']],
  'dev-e2e': ['npm', ['run', 'test:e2e:dev', '--', '--project=chromium']],
  diff: ['node', ['tooling/migration/audit.mjs']]
};
if (phase === 'P6') commands.upgrade = ['node', ['tooling/e2e/upgrade.mjs', '--reproduced']];
// Checks de fases futuras são adicionados apenas com seus contratos/testes.
for (const id of contracts.phases[phase]) assert.ok(commands[id], `${phase}: check obrigatório ainda não implementado: ${id}`);
const evidence = { version: 1, phase, contractHash: hash(JSON.stringify({ manifest, contracts })), inputHash: inputHash(), startedAt: new Date().toISOString(), finishedAt: null, commands: [], status: 'running', tools: { node: process.versions.node } };
try {
  for (const id of contracts.phases[phase]) {
    console.log(`[${phase}] ${id}`);
    const [command, args] = commands[id];
    const result = await runProcess(command, args, {
      log: `${dir}/${id}.log`,
      timeoutMs: ['cargo-check', 'cargo-test', 'appimage'].includes(id) ? 1800000 : ['install', 'reference-rebuild'].includes(id) ? 900000 : 180000,
      env: { NOTFEED_GATE_STARTED_AT: evidence.startedAt }
    });
    evidence.commands.push({ id, ...result });
    writeJSON(`${dir}/evidence.json`, evidence);
    assertProcess(result);
    if (id === 'unit' && phase !== 'P0') assertTestIdentities(readJSON('tooling/migration/reference/inventory.json').tests, readJSON('.artifacts/migration/unit.json'));
    if (id === 'e2e') {
      const report = readJSON('.artifacts/e2e/report.json');
      assert.equal(report.stats.unexpected, 0);
      assert.equal(report.stats.skipped, 0);
      assert.equal(report.stats.flaky, 0);
      assert.equal(report.stats.expected, 3, 'todos os cenários e provas adversas devem executar');
    }
    if (id === 'dev-e2e') {
      const report = readJSON('.artifacts/e2e/dev-report.json');
      assert.equal(report.stats.expected, 1);
      for (const field of ['unexpected', 'skipped', 'flaky']) assert.equal(report.stats[field], 0);
    }
    if (id === 'bundle') cpSync('.artifacts/native/bundle-evidence.json', `${dir}/bundle-evidence.json`);
    if (id === 'upgrade') cpSync('.artifacts/e2e/upgrade-evidence.json', `${dir}/upgrade-evidence.json`);
  }
  evidence.finalInputHash = inputHash();
  // Somente o bootstrap P0 cria o inventário versionado durante o gate.
  // Nas demais fases, ferramentas não podem modificar fontes/lockfiles auditados.
  if (phase !== 'P0') assert.equal(evidence.finalInputHash, evidence.inputHash, 'arquivos auditados foram alterados durante o gate');
  evidence.inputHash = evidence.finalInputHash;
  evidence.status = 'passed';
} catch (error) {
  evidence.status = 'failed';
  evidence.error = error.message;
  process.exitCode = 1;
} finally {
  evidence.finishedAt = new Date().toISOString();
  writeJSON(`${dir}/evidence.json`, evidence);
  if (evidence.status === 'passed') writeJSON(`.artifacts/migration/${phase}/latest.json`, evidence);
  console.log(`${phase}: ${evidence.status}; ${dir}/evidence.json`);
  if (evidence.error) console.error(evidence.error);
}
