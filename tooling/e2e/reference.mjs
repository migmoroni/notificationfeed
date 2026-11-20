import { cpSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { filesUnder, hash, inputHash, writeJSON } from '../migration/lib.mjs';

if (existsSync('.artifacts/e2e/reference-build')) throw new Error('Referência P1 já existe; não sobrescrever um checkpoint aprovado');
cpSync('build', '.artifacts/e2e/reference-build', { recursive: true });
writeFileSync('.artifacts/e2e/reference.patch', execFileSync('git', ['diff', '--binary', 'HEAD']));
const untracked = execFileSync('git', ['ls-files', '--others', '--exclude-standard', '-z']);
execFileSync('tar', ['--null', '-T', '-', '-czf', '.artifacts/e2e/reference-untracked.tar.gz'], { input: untracked });
writeJSON('.artifacts/e2e/reference.json', {
  inputHash: inputHash(),
  revision: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  buildFiles: filesUnder('.artifacts/e2e/reference-build').map(file => ({ file, hash: hash(readFileSync(file)) })),
  playwright: JSON.parse(readFileSync('node_modules/@playwright/test/package.json', 'utf8')).version,
  browser: JSON.parse(readFileSync('node_modules/playwright-core/browsers.json', 'utf8')).browsers.filter(browser => browser.name.startsWith('chromium')),
  patchHash: hash(readFileSync('.artifacts/e2e/reference.patch')),
  untrackedArchiveHash: hash(readFileSync('.artifacts/e2e/reference-untracked.tar.gz')),
  recipe: 'Em área de teste isolada: git archive da revisão; git apply reference.patch; extrair reference-untracked.tar.gz; npm ci; npm run build. A referência contém somente artefatos de teste, nunca fontes distribuídas.'
});
