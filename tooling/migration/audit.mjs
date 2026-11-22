import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { validateActual, lintArchitecture, filesUnder, readJSON, assertCheckCoverage } from './lib.mjs';

validateActual('P6');
lintArchitecture('P6');
execFileSync('git', ['diff', '--check'], { stdio: 'inherit' });
const changed = execFileSync('git', ['diff', '--name-only', '--diff-filter=AM'], { encoding: 'utf8' }).trim().split('\n');
const untracked = execFileSync('git', ['ls-files', '--others', '--exclude-standard', '-z'], { encoding: 'utf8' }).split('\0');
const docs = [...new Set([...changed, ...untracked].filter(file => file.endsWith('.md') && existsSync(file)))];
let links = 0;
for (const file of docs) {
  const text = readFileSync(file, 'utf8');
  assert.ok(text.endsWith('\n'), `${file}: falta newline final`);
  for (const line of text.split('\n')) {
    const whitespace = line.match(/[\t ]+$/)?.[0];
    assert.ok(!whitespace || whitespace === '  ', `${file}: espaços finais fora de uma quebra Markdown`);
  }
  assert.equal((text.match(/^```/gm) ?? []).length % 2, 0, `${file}: bloco de código aberto`);
  for (const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = match[1].replace(/^<|>$/g, '').split('#')[0];
    if (!target || /^[a-z]+:/i.test(target)) continue;
    assert.ok(existsSync(path.resolve(path.dirname(file), target)), `${file}: link local ausente ${target}`);
    links++;
  }
}
const packageFiles = filesUnder('packages/notfeed/src');
assert.ok(packageFiles.length > 0);
assert.deepEqual(readJSON('tsconfig.json'), { extends: './apps/web/tsconfig.json' }, 'configuração do editor da raiz divergiu');
assertCheckCoverage('tsconfig.json', packageFiles.filter(file => /\.(ts|js|svelte)$/.test(file)));
console.log(`Auditoria final: estrutura e fontes únicas; ${docs.length} documentos e ${links} links locais; diff sem erros`);
