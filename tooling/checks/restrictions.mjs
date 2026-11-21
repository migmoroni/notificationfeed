import assert from 'node:assert/strict';
import { assertRestrictions } from './project-lib.mjs';
assert.equal(process.argv.length, 2);
assertRestrictions();
console.log('Restrições sintáticas e testes sem atalhos aprovados.');
