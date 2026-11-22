import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, mkdirSync, writeFileSync, appendFileSync } from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import ts from 'typescript';
import { parse } from 'svelte/compiler';

export const plan = 'docs/plans/etapa-1-migracao-estrutural';
export const manifest = JSON.parse(readFileSync(`${plan}/contracts/etapa-1.json`, 'utf8'));
export const contracts = JSON.parse(readFileSync('tooling/migration/contracts.json', 'utf8'));
export const hash = value => createHash('sha256').update(value).digest('hex');
export const readJSON = file => JSON.parse(readFileSync(file, 'utf8'));
export function writeJSON(file, value) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}
export function filesUnder(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (['node_modules', '.svelte-kit', 'build', 'target', 'gen', '.git'].includes(entry.name)) return [];
    const file = `${dir}/${entry.name}`;
    return entry.isDirectory() ? filesUnder(file) : [file];
  }).sort();
}
export function canonical(file) {
  return file.replace(/^packages\/notfeed\/src\//, 'src/lib/')
    .replace(/^apps\/web\//, '').replace(/^apps\/desktop\//, '');
}
export function destination(file, phase) {
  const n = Number(phase.slice(1));
  if (n < 2) return file;
  if (file.startsWith('src-tauri/')) return `apps/desktop/${file}`;
  if (n >= 3 && file.startsWith('src/lib/')) return file.replace('src/lib/', 'packages/notfeed/src/');
  return `apps/web/${file}`;
}
export function inspectSource(file, source) {
  const imports = [], restrictions = [];
  const sections = [];
  if (file.endsWith('.svelte')) {
    // Validate the complete component too; TS parses only its script ranges.
    const component = parse(source, { modern: true });
    for (const script of [component.instance, component.module].filter(Boolean)) {
      const start = source.indexOf('>', script.start) + 1;
      const end = source.lastIndexOf('</script', script.end);
      sections.push({ source: source.slice(start, end), offset: start });
    }
  } else sections.push({ source, offset: 0 });
  for (const section of sections) {
    const tree = ts.createSourceFile(file.endsWith('.svelte') ? `${file}.ts` : file, section.source, ts.ScriptTarget.Latest, true);
    function spec(node) {
      if (!ts.isStringLiteralLike(node)) throw new Error(`${file}: import calculado não verificável`);
      imports.push({ value: node.text, start: section.offset + node.getStart(tree) + 1, end: section.offset + node.end - 1 });
    }
    function visit(node) {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) spec(node.moduleSpecifier);
      if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) spec(node.argument.literal);
      if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || node.expression.getText(tree) === 'require')) spec(node.arguments[0]);
      if (node.kind === ts.SyntaxKind.AnyKeyword) {
        const start = section.offset + node.getStart(tree);
        const line = source.slice(0, start).split('\n').length;
        restrictions.push({ kind: 'any', line, hash: hash(source.split('\n')[line - 1].trim()) });
      }
      ts.forEachChild(node, visit);
    }
    visit(tree);
  }
  source.split('\n').forEach((line, index) => {
    if (/@ts-(?:ignore|nocheck|expect-error)|eslint-disable|svelte-ignore/.test(line)) restrictions.push({ kind: 'suppression', line: index + 1, hash: hash(line.trim()) });
  });
  return { imports, restrictions };
}
export function resolveImport(file, specifier) {
  if (specifier.startsWith('$lib/')) return `src/lib/${specifier.slice(5)}`;
  if (specifier === '@notfeed/product') return 'src/lib/index.ts';
  if (specifier.startsWith('@notfeed/product/')) return `src/lib/${specifier.slice(17)}`;
  if (specifier.startsWith('.')) return canonical(path.posix.normalize(path.posix.join(path.posix.dirname(file), specifier)));
  return specifier;
}
export function normalizeSource(file, source, imports) {
  let result = source;
  for (const entry of [...imports].sort((a, b) => b.start - a.start)) {
    const value = resolveImport(file, entry.value).replace(/\.js$/, '.ts');
    result = result.slice(0, entry.start) + value + result.slice(entry.end);
  }
  return result;
}
export function assertEdge(from, to, phase) {
  if (Number(phase.slice(1)) >= 3) assert.ok(!to.startsWith('$lib'), `${from}: alias antigo ${to}`);
  if (from.startsWith('packages/')) assert.ok(!to.startsWith('apps/'), `${from}: aresta proibida para ${to}`);
  if (/^(src|apps\/web|packages)\//.test(from)) assert.ok(!/^(tooling|docs|apps\/desktop)\//.test(to), `${from}: import proibido ${to}`);
}
export function assertProcess(result) {
  assert.equal(result.exitCode, 0, `processo falhou: ${result.command ?? ''}`);
  assert.equal(result.signal, null, 'processo recebeu sinal');
  assert.equal(result.timedOut, false, 'timeout');
}
export async function runProcess(command, args, { cwd = process.cwd(), log, timeoutMs = 180000, env = {} }) {
  mkdirSync(path.dirname(log), { recursive: true });
  writeFileSync(log, '');
  const started = Date.now();
  return await new Promise(resolve => {
    const child = spawn(command, args, { cwd, env: { ...process.env, TZ: 'UTC', ...env }, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] });
    let timedOut = false, error = null;
    child.stdout.on('data', chunk => appendFileSync(log, chunk));
    child.stderr.on('data', chunk => appendFileSync(log, chunk));
    child.on('error', value => { error = value.message; });
    const timer = setTimeout(() => {
      timedOut = true;
      try { process.kill(-child.pid, 'SIGKILL'); } catch { child.kill('SIGKILL'); }
    }, timeoutMs);
    child.on('close', (exitCode, signal) => {
      clearTimeout(timer);
      if (error) appendFileSync(log, `\n${error}\n`);
      resolve({ command, args, exitCode, signal, timedOut, error, durationMs: Date.now() - started, log });
    });
  });
}
export function assertPredecessor(phase, evidence) {
  const predecessor = manifest.phasePredecessors[phase];
  assert.ok(manifest.phaseOrder.includes(phase), `fase inválida ${phase}`);
  if (!predecessor) return;
  assert.equal(evidence?.phase, predecessor, `${phase}: predecessor não aprovado`);
  assert.equal(evidence.status, 'passed');
  assert.ok(evidence.inputHash && evidence.contractHash, 'checkpoint ausente');
  assert.deepEqual(evidence.commands.map(x => x.id), contracts.phases[predecessor]);
  evidence.commands.forEach(assertProcess);
}
export function predecessor(phase) {
  const previous = manifest.phasePredecessors[phase];
  const file = `.artifacts/migration/${previous}/latest.json`;
  const history = 'tooling/migration/reference/approvals.json';
  const historical = existsSync(history) ? readJSON(history).approvals[previous] : null;
  assertPredecessor(phase, previous && existsSync(file) ? readJSON(file) : historical);
}
export function reportIdentities(report, root = process.cwd()) {
  assert.equal(report.success, true, 'suíte não aprovada');
  return report.testResults.flatMap(file => file.assertionResults.map(test => {
    assert.equal(test.status, 'passed', `${test.fullName}: teste não passou`);
    return { file: canonical(path.relative(root, file.name)), fullName: test.fullName };
  })).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
}
export function assertTestIdentities(expected, report, root) {
  assert.deepEqual(reportIdentities(report, root), expected, 'identidades de testes alteradas ou omitidas');
}
export function assertInventory(reference, current, approved = []) {
  assert.deepEqual(current.files.map(x => x.path), reference.files.map(x => x.path), 'fontes perdidas, duplicadas ou novas');
  for (const item of reference.files) {
    const change = approved.find(change => change.path === item.path);
    if (change) assert.equal(change.before, item.normalizedSha256, `${item.path}: origem do delta inválida`);
    assert.equal(current.files.find(x => x.path === item.path)?.normalizedSha256, change?.after ?? item.normalizedSha256, `${item.path}: lógica/dado/asset alterado`);
  }
  const clean = values => values.map(({ line, ...item }) => item);
  assert.deepEqual(clean(current.historicalRestrictions), clean(reference.historicalRestrictions), 'tipagem/supressão alterada');
}
export function assertDependencyVersions(reference, current, allowed) {
  for (const [name, version] of Object.entries(reference)) assert.equal(current[name], version, `${name}: versão/dependência alterada`);
  for (const name of Object.keys(current)) assert.ok(name in reference || allowed.includes(name), `${name}: nova dependência não autorizada`);
}
export function assertTopology(phase, roots) {
  const n = Number(phase.slice(1));
  for (const dir of ['src', 'static', 'src-tauri']) assert.equal(roots[dir], n < 2, `${dir}: topologia inválida em ${phase}`);
  assert.equal(roots.product, n >= 3, 'pacote em fase incorreta');
  assert.equal(roots.webLib, n === 2, 'árvore lib em fase incorreta');
}
export function assertWorkspaceMetadata(root, web, desktop, build, phase) {
  const contract = readJSON('tooling/migration/workspace-contract.json');
  assert.deepEqual(root.workspaces, contract.phases[Number(phase.slice(1)) >= 3 ? 'P3' : 'P2']);
  assert.equal(web.name, contract.web);
  assert.equal(desktop.name, contract.desktop);
  assert.equal(web.private, true);
  assert.equal(desktop.private, true);
  assert.equal(build.frontendDist, contract.desktopFrontendDist);
  assert.equal(build.beforeDevCommand, contract.beforeDevCommand);
  assert.equal(build.beforeBuildCommand, contract.beforeBuildCommand);
  assert.equal(build.devUrl, contract.devUrl);
}
export function resolveExportTarget(exports, specifier, exists) {
  let target = exports[specifier];
  if (!target) {
    for (const [key, pattern] of Object.entries(exports)) {
      if (!key.includes('*')) continue;
      const [prefix, suffix] = key.split('*');
      if (specifier.startsWith(prefix) && specifier.endsWith(suffix)) {
        target = pattern.replace('*', specifier.slice(prefix.length, specifier.length - suffix.length));
        break;
      }
    }
  }
  assert.ok(target && !target.includes('..') && exists(target), `${specifier}: export sem destino válido`);
  return target;
}
export function assertCheckCoverage(configFile, sources) {
  const absolute = path.resolve(configFile);
  const config = ts.readConfigFile(absolute, ts.sys.readFile);
  assert.ok(!config.error, 'tsconfig ilegível');
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, path.dirname(absolute), undefined, absolute, undefined, [{ extension: '.svelte', isMixedContent: true, scriptKind: ts.ScriptKind.Deferred }]);
  const included = new Set(parsed.fileNames.map(file => path.resolve(file)));
  for (const file of sources) assert.ok(included.has(path.resolve(file)), `${file}: fonte omitida do check`);
}
export function inputHash() {
  const files = execFileSync('git', ['ls-files', '-co', '--exclude-standard', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
  return hash([...new Set(files)].filter(file => !file.endsWith('/state.md') && existsSync(file)).sort().map(file => `${file}:${hash(readFileSync(file))}`).join('\n'));
}
export function inventory(phase) {
  const root = Number(phase.slice(1)) < 2 ? ['src', 'static', 'src-tauri'] : ['apps/web/src', 'apps/web/static', 'apps/desktop/src-tauri', ...(Number(phase.slice(1)) >= 3 ? ['packages/notfeed/src'] : [])];
  const historicalRestrictions = [], storageKeys = new Set();
  const files = root.flatMap(filesUnder).map(file => {
    const bytes = readFileSync(file), source = bytes.toString('utf8');
    let normalized = bytes;
    if (/\.(?:ts|js|svelte|mjs)$/.test(file)) {
      const result = inspectSource(file, source);
      normalized = normalizeSource(file, source, result.imports);
      historicalRestrictions.push(...result.restrictions.map(entry => ({ path: canonical(file), ...entry })));
      for (const match of source.matchAll(/['"`](notfeed[^'"`\n]*)['"`]/g)) storageKeys.add(match[1]);
    }
    if (canonical(file) === 'src-tauri/tauri.conf.json') {
      const config = JSON.parse(source);
      config.build = { ...config.build, beforeDevCommand: '<web-dev>', beforeBuildCommand: '<web-build>', frontendDist: '<web-build-dir>' };
      normalized = JSON.stringify(config);
    }
    if (canonical(file) === 'src/app.css' && Number(phase.slice(1)) >= 3) {
      const directive = readJSON('tooling/migration/product-contract.json').cssSource;
      assert.equal(source.split(directive).length, 2, 'fonte CSS do pacote ausente ou duplicada');
      normalized = source.replace(directive, '');
    }
    return { path: canonical(file), sha256: hash(bytes), normalizedSha256: hash(normalized) };
  }).sort((a, b) => a.path.localeCompare(b.path));
  historicalRestrictions.sort((a, b) => a.path.localeCompare(b.path) || a.line - b.line);
  const packages = ['package.json', 'apps/web/package.json', 'apps/desktop/package.json', 'packages/notfeed/package.json'].filter(existsSync).map(readJSON);
  const dependencies = Object.fromEntries(packages.flatMap(pkg => Object.entries({ ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies })).filter(([name]) => !name.startsWith('@notfeed/')).sort(([a], [b]) => a.localeCompare(b)));
  const lock = readJSON('package-lock.json');
  const resolved = Object.fromEntries(Object.entries(lock.packages).filter(([name, pkg]) => name.includes('node_modules/') && pkg.version).map(([name, pkg]) => [name, pkg.version]));
  const implicitDependencies = {};
  for (const file of root.flatMap(filesUnder).filter(file => /\.(ts|js|svelte)$/.test(file))) {
    for (const { value } of inspectSource(file, readFileSync(file, 'utf8')).imports) {
      if (/^(\.|\$|@notfeed\/)/.test(value)) continue;
      const name = value.startsWith('@') ? value.split('/').slice(0, 2).join('/') : value.split('/')[0];
      if (!dependencies[name]) {
        assert.ok(resolved[`node_modules/${name}`], `${file}: biblioteca ausente do lockfile: ${name}`);
        implicitDependencies[name] = resolved[`node_modules/${name}`];
      }
    }
  }
  const web = Number(phase.slice(1)) < 2 ? '' : 'apps/web/';
  const protectedFiles = ['src/lib/config/back-settings.ts', 'src/lib/persistence/schema.ts', 'src/lib/domain/tree-export/tree-export.ts'].map(file => ({ path: file, hash: hash(normalizeSource(destination(file, phase), readFileSync(destination(file, phase), 'utf8'), inspectSource(destination(file, phase), readFileSync(destination(file, phase), 'utf8')).imports)) }));
  return { version: 1, revision: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), tools: { node: process.versions.node, npm: execFileSync('npm', ['--version'], { encoding: 'utf8' }).trim(), cargo: execFileSync('cargo', ['--version'], { encoding: 'utf8' }).trim() }, files, dependencies, implicitDependencies, resolved, tests: [], routes: filesUnder(`${web}src/routes`).map(canonical), storageKeys: [...storageKeys].sort(), protectedFiles, historicalRestrictions };
}
export function validateActual(phase) {
  const n = Number(phase.slice(1)), original = n < 2;
  assertTopology(phase, { src: existsSync('src'), static: existsSync('static'), 'src-tauri': existsSync('src-tauri'), product: existsSync('packages/notfeed/src'), webLib: existsSync('apps/web/src/lib') });
  const web = original ? '' : 'apps/web/';
  const desktop = original ? '' : 'apps/desktop/';
  const config = readJSON(`${desktop}src-tauri/tauri.conf.json`);
  if (!original) {
    assertWorkspaceMetadata(readJSON('package.json'), readJSON('apps/web/package.json'), readJSON('apps/desktop/package.json'), config.build, phase);
    for (const [directory, name] of [['apps/web', '@notfeed/web'], ['apps/desktop', '@notfeed/desktop'], ...(n >= 3 ? [['packages/notfeed', '@notfeed/product']] : [])]) {
      const link = readJSON(`node_modules/${name}/package.json`);
      assert.equal(link.name, readJSON(`${directory}/package.json`).name, `${name}: workspace não resolvido`);
      const lock = readJSON('package-lock.json');
      assert.equal(lock.packages[`node_modules/${name}`].link, true);
      assert.equal(lock.packages[`node_modules/${name}`].resolved, directory);
    }
  }
  assert.equal(config.identifier, manifest.protected.desktopIdentifier);
  assert.equal(config.version, manifest.protected.desktopVersion);
  assert.deepEqual(config.bundle.targets, manifest.protected.desktopBundleTargets);
  assert.equal(config.build.frontendDist, original ? '../build' : '../../web/build');
  const compiler = ts.readConfigFile(`${web}tsconfig.json`, ts.sys.readFile).config.compilerOptions;
  assert.equal(compiler.strict, true);
  assert.equal(compiler.checkJs, true);
  assert.equal(compiler.skipLibCheck, true);
  if (n >= 3) {
    const product = readJSON('packages/notfeed/package.json');
    const contract = readJSON('tooling/migration/product-contract.json');
    assert.equal(product.name, contract.name);
    assert.equal(product.version, contract.packageVersion);
    assert.equal(product.private, true);
    assert.deepEqual(product.exports, contract.exports);
    assert.equal(readJSON('apps/web/package.json').dependencies[contract.name], contract.packageVersion);
    const sources = ['apps/web/src', 'packages/notfeed/src'].flatMap(filesUnder).filter(file => /\.(ts|js|svelte)$/.test(file) && !file.includes('service-worker'));
    assertCheckCoverage('apps/web/tsconfig.json', sources);
    assert.ok(!JSON.stringify(compiler.paths ?? {}).includes('$lib'), 'alias antigo no tsconfig');
    assert.ok(!JSON.stringify(readJSON('apps/web/components.json').aliases).includes('$lib'), 'alias antigo no gerador de componentes');
    assert.match(readFileSync('apps/web/src/service-worker.ts', 'utf8'), /import\('@notfeed\/product\/ingestion\/post-manager\.js'\)/);
    assert.ok(!/alias\s*:/.test(readFileSync('apps/web/svelte.config.js', 'utf8')), 'alias de compatibilidade não permitido');
  }
  const pkg = readJSON('package.json');
  for (const [name, script] of Object.entries(pkg.scripts)) assert.ok(!/\|\||--if-present|--passWithNoTests/.test(script), `${name}: sucesso artificial`);
  const svelte = readFileSync(`${web}svelte.config.js`, 'utf8');
  assert.match(svelte, /fallback:\s*'index.html'/);
  assert.match(svelte, /relative:\s*false/);
  assert.match(svelte, /register:\s*false/);
  const current = inventory(phase);
  const referencePath = 'tooling/migration/reference/inventory.json';
  if (existsSync(referencePath)) {
    const reference = readJSON(referencePath);
    const approvedPath = 'tooling/migration/reference/approved-changes.json';
    assertInventory(reference, current, existsSync(approvedPath) ? readJSON(approvedPath) : []);
    assert.deepEqual(current.protectedFiles, reference.protectedFiles);
    assert.deepEqual(current.storageKeys, reference.storageKeys);
    assert.deepEqual(current.routes, reference.routes);
    const expectedDependencies = { ...reference.dependencies };
    for (const [name, version] of Object.entries(reference.implicitDependencies)) if (current.dependencies[name]) expectedDependencies[name] = version;
    assertDependencyVersions(expectedDependencies, current.dependencies, manifest.approvedNewDevDependencies);
    for (const [key, version] of Object.entries(reference.resolved)) assert.equal(current.resolved[key], version, `${key}: upgrade incidental`);
  }
  return current;
}
export function lintArchitecture(phase) {
  const roots = Number(phase.slice(1)) < 2 ? ['src'] : ['apps/web/src', 'packages/notfeed/src'];
  const referencePath = 'tooling/migration/reference/inventory.json';
  const implicit = existsSync(referencePath) ? readJSON(referencePath).implicitDependencies : inventory(phase).implicitDependencies;
  for (const file of roots.flatMap(filesUnder).filter(file => /\.(ts|js|svelte)$/.test(file))) {
    const source = readFileSync(file, 'utf8');
    assert.ok(!/\b(?:it|test|describe)\s*\.\s*(?:skip|todo|only|fail)\b/.test(source), `${file}: teste desabilitado`);
    for (const entry of inspectSource(file, source).imports) {
      if (file.startsWith('packages/') && entry.value.startsWith('$')) assert.ok(manifest.frameworkImportsAlreadyPresent.includes(entry.value), `${file}: módulo virtual não autorizado ${entry.value}`);
      assertEdge(file, entry.value, phase);
      let target = resolveImport(file, entry.value);
      const actualTarget = target.startsWith('src/') ? destination(target, phase) : target;
      assertEdge(file, actualTarget, phase);
      if (entry.value.startsWith('.') || entry.value.startsWith('$lib/') || entry.value.startsWith('@notfeed/')) {
        const candidates = [actualTarget, actualTarget.replace(/\.js$/, '.ts'), `${actualTarget}/index.ts`, `${actualTarget}/index.js`];
        assert.ok(candidates.some(existsSync), `${file}: import sem arquivo ${entry.value}`);
      } else if (!entry.value.startsWith('$app/') && entry.value !== '$service-worker') {
        const name = entry.value.startsWith('@') ? entry.value.split('/').slice(0, 2).join('/') : entry.value.split('/')[0];
        const pkgPath = file.startsWith('packages/') ? 'packages/notfeed/package.json' : file.startsWith('apps/') ? 'apps/web/package.json' : 'package.json';
        const pkg = readJSON(pkgPath);
        const declared = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies }[name];
        const historical = implicit[name];
        assert.ok(declared || (Number(phase.slice(1)) < 2 && historical), `${file}: dependência não declarada ${name}`);
      }
    }
  }
  validateActual(phase);
}
