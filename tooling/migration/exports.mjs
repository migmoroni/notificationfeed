import assert from 'node:assert/strict';
import { readFileSync, existsSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { readJSON, filesUnder, inspectSource, resolveExportTarget, assertCheckCoverage } from './lib.mjs';

const pkg = readJSON('packages/notfeed/package.json');
const packageRoot = realpathSync('packages/notfeed');
assert.equal(realpathSync('node_modules/@notfeed/product'), packageRoot, 'consumidor usa pacote externo');
let count = 0;
for (const file of filesUnder('apps/web/src').filter(file => /\.(ts|svelte)$/.test(file))) {
  for (const { value } of inspectSource(file, readFileSync(file, 'utf8')).imports) {
    if (!value.startsWith('@notfeed/product')) continue;
    const subpath = value === '@notfeed/product' ? '.' : `.${value.slice('@notfeed/product'.length)}`;
    const target = resolveExportTarget(pkg.exports, subpath, target => existsSync(path.join(packageRoot, target)));
    assert.equal(fileURLToPath(import.meta.resolve(value)), path.join(packageRoot, target));
    count++;
  }
}
assert.ok(count > 0, 'nenhum consumidor do pacote');
assertCheckCoverage('apps/web/tsconfig.json', filesUnder('packages/notfeed/src').filter(file => /\.(ts|js|svelte)$/.test(file)));
console.log(`${count} imports externos resolvidos no workspace; todos os arquivos do pacote incluídos no check`);
