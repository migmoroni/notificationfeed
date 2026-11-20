import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { readJSON, writeJSON, filesUnder, hash, runProcess, assertProcess } from './lib.mjs';
import { assertNativePayload, assertNativeSections } from './native-lib.mjs';

const contract = readJSON('tooling/migration/native-contract.json');
const started = Date.parse(process.env.NOTFEED_GATE_STARTED_AT ?? '');
assert.ok(Number.isFinite(started), 'inspeção exige início identificado do gate');
assert.ok(existsSync(contract.bundle), 'AppImage ausente');
assert.ok(statSync(contract.bundle).mtimeMs >= started, 'AppImage anterior ao gate');
const dir = path.resolve('.artifacts/native/extracted');
// Diretório de extração sintético e fixo deste verificador, nunca dados do app.
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });
const result = await runProcess(path.resolve(contract.bundle), ['--appimage-extract'], { cwd: dir, log: '.artifacts/native/extract.log', timeoutMs: 120000 });
assertProcess(result);
const embedded = readFileSync(path.join(dir, contract.extractedBinary));
const compiled = readFileSync(contract.binary);
const assets = ['index.html', ...filesUnder(`${contract.frontend}/_app/immutable`).filter(file => /\.(?:js|css)$/.test(file)).map(file => path.relative(contract.frontend, file))];
assert.ok(assets.length > 1, 'frontend sem chunks');
assertNativePayload(compiled, embedded, assets, readFileSync(path.join(dir, contract.desktopEntry), 'utf8'));
const sections = {};
for (const [kind, binary] of [['compiled', path.resolve(contract.binary)], ['extracted', path.join(dir, contract.extractedBinary)]]) {
  const sectionDir = path.resolve(`.artifacts/native/sections/${kind}`);
  mkdirSync(sectionDir, { recursive: true });
  const args = contract.payloadSections.flatMap(name => ['--dump-section', `${name}=${path.join(sectionDir, name)}`]);
  const result = await runProcess('objcopy', [...args, binary, '/dev/null'], { log: `.artifacts/native/objcopy-${kind}.log` });
  assertProcess(result);
  sections[kind] = Object.fromEntries(contract.payloadSections.map(name => [name, readFileSync(path.join(sectionDir, name))]));
}
assertNativeSections(sections.compiled, sections.extracted);
assertProcess(await runProcess('patchelf', ['--print-rpath', path.join(dir, contract.extractedBinary)], { log: '.artifacts/native/rpath.log' }));
assert.equal(readFileSync('.artifacts/native/rpath.log', 'utf8').trim(), contract.rpath);
writeJSON('.artifacts/native/bundle-evidence.json', {
  bundle: contract.bundle, bundleHash: hash(readFileSync(contract.bundle)), binaryHash: hash(embedded), compiledBinaryHash: hash(compiled),
  payloadSections: Object.fromEntries(Object.entries(sections).map(([kind, values]) => [kind, Object.fromEntries(Object.entries(values).map(([name, bytes]) => [name, hash(bytes)]))])),
  allowedPackagingChanges: { bundleMarker: [contract.bundleMarkerBefore, contract.bundleMarkerAfter], rpath: contract.rpath },
  frontendVersion: readJSON(`${contract.frontend}/_app/version.json`).version,
  immutableAssets: assets.map(file => ({ file, hash: hash(readFileSync(path.join(contract.frontend, file))) })),
  identity: contract.identity, extraction: result,
  coverage: 'compilação, testes Rust existentes, empacotamento e assets; não é E2E nativo da WebView'
});
console.log(`AppImage extraída; payload ELF corresponde ao compilado, identidade e ${assets.length} assets atuais verificados`);
