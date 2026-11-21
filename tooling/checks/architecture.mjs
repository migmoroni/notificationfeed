import assert from 'node:assert/strict';
import { assertArchitecture } from './project-lib.mjs';
assert.equal(process.argv.length, 2);
assertArchitecture();
console.log('Fronteiras, exports, dependências e resolução local aprovados.');
