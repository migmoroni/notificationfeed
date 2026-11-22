import assert from 'node:assert/strict';
import { lintArchitecture, predecessor } from './lib.mjs';
const [flag, phase, ...extra] = process.argv.slice(2);
assert.equal(flag, '--phase');
assert.equal(extra.length, 0);
predecessor(phase);
lintArchitecture(phase);
console.log(`${phase}: fronteiras e restrições válidas`);
