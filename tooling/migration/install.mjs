import assert from 'node:assert/strict';
import { readFileSync, rmSync } from 'node:fs';
import { readJSON, hash, runProcess, assertProcess } from './lib.mjs';

const before = hash(readFileSync('package-lock.json'));
for (const directory of readJSON('tooling/migration/final-contract.json').cleanGeneratedDirectories) rmSync(directory, { recursive: true, force: true });
assertProcess(await runProcess('npm', ['ci'], { log: '.artifacts/migration/install.log', timeoutMs: 600000 }));
assert.equal(hash(readFileSync('package-lock.json')), before, 'npm ci alterou o lockfile');
assertProcess(await runProcess('npm', ['exec', '--', 'playwright', 'install', 'chromium'], { env: { PLAYWRIGHT_SKIP_BROWSER_GC: '1' }, log: '.artifacts/migration/browser-install.log', timeoutMs: 600000 }));
console.log('npm ci e Chromium fixado aprovados; lockfile preservado, saídas antigas de web descartadas');
