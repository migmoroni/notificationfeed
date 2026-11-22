import assert from 'node:assert/strict';
import { assertProjectContracts } from './project-lib.mjs';
assert.equal(process.argv.length, 2);
await assertProjectContracts();
console.log('Contratos permanentes de tipos, descoberta, dados e identidade aprovados.');
