import assert from 'node:assert/strict';
import { cpSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { readJSON, writeJSON, hash, filesUnder, runProcess, assertProcess } from '../migration/lib.mjs';
import { verifyReferenceRecipe } from '../migration/reference-lib.mjs';

const recipe = readJSON('tooling/migration/reference/pwa-reference.json');
verifyReferenceRecipe(recipe);
assert.equal(process.versions.node, recipe.node);
assert.equal(execFileSync('npm', ['--version'], { encoding: 'utf8' }).trim(), recipe.npm);
const root = process.cwd();
const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const indexPath = execFileSync('git', ['rev-parse', '--git-path', 'index'], { encoding: 'utf8' }).trim();
const indexHash = hash(readFileSync(indexPath));
const area = path.resolve(`.artifacts/e2e/reproduction/${Date.now()}`);
const repository = `${area}/repository.git`, source = `${area}/source`;
mkdirSync(source, { recursive: true });
const commands = [];
async function run(id, command, args, cwd = root) {
  const result = await runProcess(command, args, { cwd, log: `${area}/${id}.log`, timeoutMs: 600000 });
  commands.push({ id, ...result });
  assertProcess(result);
}
function sourceHash() {
  const entries = execFileSync('git', [`--git-dir=${repository}`, 'ls-tree', '-r', '-z', recipe.checkpoint], { encoding: 'utf8' }).split('\0').filter(Boolean);
  return hash(entries.map(entry => entry.split('\t')[1]).filter(file => !file.endsWith('/state.md')).sort().map(file => `${file}:${hash(readFileSync(path.join(source, file)))}`).join('\n'));
}
try {
  await run('init', 'git', ['init', '--bare', repository]);
  // Importar somente a base versionada em um repositório isolado prova que
  // a referência não está sendo recuperada por objetos P1 já no cache local.
  await run('base', 'git', [`--git-dir=${repository}`, 'fetch', '--no-tags', '--depth=1', root, recipe.prerequisite]);
  await run('bundle', 'git', [`--git-dir=${repository}`, 'bundle', 'unbundle', path.resolve(recipe.bundle)]);
  await run('archive', 'git', [`--git-dir=${repository}`, 'archive', '--format=tar', `--output=${area}/source.tar`, recipe.checkpoint]);
  await run('extract', 'tar', ['-xf', `${area}/source.tar`, '-C', source]);
  assert.equal(sourceHash(), recipe.inputHash, 'fontes do checkpoint diferem da referência P1 auditada');
  await run('install', 'npm', ['ci'], source);
  await run('build', 'npm', ['run', 'build'], source);
  assert.equal(sourceHash(), recipe.inputHash, 'reprodução alterou fontes ou lockfile do checkpoint');
  const target = '.artifacts/e2e/reproduced-reference-build';
  rmSync(target, { recursive: true, force: true });
  cpSync(`${source}/build`, target, { recursive: true });
  writeJSON('.artifacts/e2e/reproduced-reference.json', { checkpoint: recipe.checkpoint, inputHash: recipe.inputHash, buildFiles: filesUnder(target).map(file => ({ file, hash: hash(readFileSync(file)) })), commands });
  console.log(`Referência P1 reconstruída de ${recipe.checkpoint}; fontes e lockfile idênticos ao checkpoint auditado`);
} finally {
  assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), head, 'HEAD atual alterado');
  assert.equal(hash(readFileSync(indexPath)), indexHash, 'índice atual alterado');
  // Somente a área sintética criada nesta execução; logs ficam preservados.
  rmSync(source, { recursive: true, force: true });
  rmSync(repository, { recursive: true, force: true });
}
