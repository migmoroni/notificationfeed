import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inspectSource, assertEdge, assertProcess, assertPredecessor, assertTestIdentities, assertInventory, assertDependencyVersions, runProcess, assertWorkspaceMetadata, assertTopology, resolveExportTarget, assertCheckCoverage, readJSON } from '../lib.mjs';

test('aresta pacote → aplicativo e ponte antiga são recusadas', () => {
  assert.throws(() => assertEdge('packages/notfeed/src/a.ts', 'apps/web/src/a.ts', 'P3'));
  assert.throws(() => assertEdge('packages/notfeed/src/a.ts', '$lib/a.js', 'P3'));
  assert.doesNotThrow(() => assertEdge('apps/web/src/a.ts', 'packages/notfeed/src/a.ts', 'P3'));
});
test('AST inspeciona TS, script Svelte, import dinâmico e import de tipo', () => {
  const source = `<script lang="ts">import A from './a.js'; let a: any; type T = import('./b.js').T; const c = import('./c.js');</script>`;
  const result = inspectSource('a.svelte', source);
  assert.deepEqual(result.imports.map(x => x.value), ['./a.js', './b.js', './c.js']);
  assert.ok(result.restrictions.some(x => x.kind === 'any'));
  assert.ok(inspectSource('a.ts', '// @ts-ignore\nlet x;').restrictions.some(x => x.kind === 'suppression'));
  assert.throws(() => inspectSource('a.ts', 'const x = import(path);'));
});
test('processo falho, sinal, timeout e resultado incompleto nunca passam', () => {
  const ok = { exitCode: 0, signal: null, timedOut: false };
  assert.doesNotThrow(() => assertProcess(ok));
  for (const bad of [{ ...ok, exitCode: 2 }, { ...ok, signal: 'SIGTERM' }, { ...ok, timedOut: true }, {}]) assert.throws(() => assertProcess(bad));
});
test('subprocesso real falha, timeout e comando ausente são detectados', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'notfeed-gate-'));
  try {
    const options = { cwd: dir, log: join(dir, 'child.log'), timeoutMs: 5000 };
    const failed = await runProcess(process.execPath, ['-e', 'process.exit(7)'], options);
    assert.equal(failed.exitCode, 7);
    assert.throws(() => assertProcess(failed));
    const timeout = await runProcess(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { ...options, timeoutMs: 50 });
    assert.equal(timeout.timedOut, true);
    assert.throws(() => assertProcess(timeout));
    const missing = await runProcess('notfeed-command-does-not-exist', [], options);
    assert.throws(() => assertProcess(missing));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('predecessor exige evidência completa aprovada', () => {
  assert.doesNotThrow(() => assertPredecessor('P0', null));
  assert.throws(() => assertPredecessor('P2', null));
  assert.throws(() => assertPredecessor('P2', { phase: 'P1', status: 'failed' }));
  assert.throws(() => assertPredecessor('P2', { phase: 'P1', status: 'passed', commands: [] }));
});
test('teste omitido, ignorado ou com nome trocado é recusado', () => {
  const expected = [{ file: 'src/lib/a.test.ts', fullName: 'suite case' }];
  const report = { success: true, testResults: [{ name: '/repo/src/lib/a.test.ts', assertionResults: [{ fullName: 'suite case', status: 'passed' }] }] };
  assert.doesNotThrow(() => assertTestIdentities(expected, report, '/repo'));
  assert.throws(() => assertTestIdentities(expected, { ...report, testResults: [] }, '/repo'));
  const invalid = structuredClone(report);
  invalid.testResults[0].assertionResults[0].status = 'pending';
  assert.throws(() => assertTestIdentities(expected, invalid, '/repo'));
});
test('inventário impede nova supressão, lógica modificada e fonte perdida', () => {
  const original = { files: [{ path: 'src/lib/a.ts', normalizedSha256: 'abc' }], historicalRestrictions: [] };
  assert.doesNotThrow(() => assertInventory(original, original));
  assert.throws(() => assertInventory(original, { ...original, files: [] }));
  assert.throws(() => assertInventory(original, { ...original, files: [{ path: 'src/lib/a.ts', normalizedSha256: 'def' }] }));
  assert.throws(() => assertInventory(original, { ...original, historicalRestrictions: [{ path: 'src/lib/a.ts', kind: 'any', hash: 'x' }] }));
});
test('delta autorizado aceita apenas os hashes exatos antes/depois', () => {
  const before = { files: [{ path: 'src/lib/a.ts', normalizedSha256: 'before' }], historicalRestrictions: [] };
  const after = { ...before, files: [{ path: 'src/lib/a.ts', normalizedSha256: 'after' }] };
  const approved = [{ path: 'src/lib/a.ts', before: 'before', after: 'after' }];
  assert.throws(() => assertInventory(before, after));
  assert.doesNotThrow(() => assertInventory(before, after, approved));
  assert.throws(() => assertInventory(before, { ...after, files: [{ path: 'src/lib/a.ts', normalizedSha256: 'other' }] }, approved));
  assert.throws(() => assertInventory(before, after, [{ ...approved[0], before: 'different' }]));
});
test('versões resolvidas de produto e novas dependências são protegidas', () => {
  assert.doesNotThrow(() => assertDependencyVersions({ x: '1' }, { x: '1', '@playwright/test': '2' }, ['@playwright/test']));
  assert.throws(() => assertDependencyVersions({ x: '1' }, { x: '2' }, []));
  assert.throws(() => assertDependencyVersions({ x: '1' }, { x: '1', y: '2' }, []));
});
test('workspace rejeita árvore antiga, hook recursivo e nomes incorretos', () => {
  assert.throws(() => assertTopology('P2', { src: true, static: false, 'src-tauri': false, product: false, webLib: true }));
  assert.doesNotThrow(() => assertTopology('P2', { src: false, static: false, 'src-tauri': false, product: false, webLib: true }));
  const root = { workspaces: ['apps/web', 'apps/desktop'] };
  const web = { name: '@notfeed/web', private: true };
  const desktop = { name: '@notfeed/desktop', private: true };
  const build = { frontendDist: '../../web/build', devUrl: 'http://localhost:5173', beforeDevCommand: 'npm --prefix ../.. run dev --workspace @notfeed/web', beforeBuildCommand: 'npm --prefix ../.. run build --workspace @notfeed/web' };
  assert.doesNotThrow(() => assertWorkspaceMetadata(root, web, desktop, build, 'P2'));
  assert.throws(() => assertWorkspaceMetadata(root, web, desktop, { ...build, beforeBuildCommand: 'npm run tauri:build' }, 'P2'));
  assert.throws(() => assertWorkspaceMetadata(root, { ...web, name: '@notfeed/other' }, desktop, build, 'P2'));
  assert.throws(() => assertWorkspaceMetadata(root, web, desktop, { ...build, frontendDist: '../build' }, 'P2'));
});
test('exports de fonte resolvem TS, runes, componente e asset; alvo ausente falha', () => {
  const exports = readJSON('tooling/migration/product-contract.json').exports;
  const available = new Set(['./src/index.ts', './src/utils/date.ts', './src/stores/feed.svelte.ts', './src/components/A.svelte', './src/assets/a.svg']);
  for (const [specifier, target] of [['.', './src/index.ts'], ['./utils/date.js', './src/utils/date.ts'], ['./stores/feed.svelte.js', './src/stores/feed.svelte.ts'], ['./components/A.svelte', './src/components/A.svelte'], ['./assets/a.svg', './src/assets/a.svg']]) assert.equal(resolveExportTarget(exports, specifier, p => available.has(p)), target);
  assert.throws(() => resolveExportTarget(exports, './missing.js', p => available.has(p)));
  assert.throws(() => resolveExportTarget(exports, './private.json', p => available.has(p)));
});
test('check inclui fontes não importadas e componentes fora da web', () => {
  const dir = mkdtempSync(join(tmpdir(), 'notfeed-coverage-'));
  try {
    mkdirSync(join(dir, 'apps/web'), { recursive: true });
    mkdirSync(join(dir, 'packages/notfeed/src'), { recursive: true });
    writeFileSync(join(dir, 'packages/notfeed/src/unreachable.ts'), 'export const value: string = 1;');
    writeFileSync(join(dir, 'packages/notfeed/src/Unused.svelte'), '<p>unused</p>');
    const config = join(dir, 'apps/web/tsconfig.json');
    writeFileSync(config, JSON.stringify({ include: ['../../packages/notfeed/src/**/*.ts', '../../packages/notfeed/src/**/*.svelte'] }));
    const sources = [join(dir, 'packages/notfeed/src/unreachable.ts'), join(dir, 'packages/notfeed/src/Unused.svelte')];
    assert.doesNotThrow(() => assertCheckCoverage(config, sources));
    writeFileSync(config, JSON.stringify({ include: ['./src/**/*.ts'] }));
    assert.throws(() => assertCheckCoverage(config, sources));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
