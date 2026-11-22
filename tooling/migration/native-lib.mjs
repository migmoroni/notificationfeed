import assert from 'node:assert/strict';
import { hash, readJSON } from './lib.mjs';

export function assertNativePayload(compiled, extracted, assets, desktopEntry) {
  assert.equal(extracted.subarray(0, 4).toString('hex'), '7f454c46', 'binário interno não é ELF');
  assert.equal(compiled.subarray(0, 4).toString('hex'), '7f454c46', 'compilado não é ELF');
  assert.match(desktopEntry, /^Name=Notfeed$/m);
  assert.match(desktopEntry, /^Exec=notfeed(?:\s.*)?$/m);
  assert.match(desktopEntry, /^Type=Application$/m);
  assert.ok(extracted.includes(Buffer.from('app.notfeed.desktop')), 'identidade desktop ausente');
  for (const asset of assets) assert.ok(extracted.includes(Buffer.from(asset)), `asset atual não embutido: ${asset}`);
}
export function assertNativeSections(compiled, extracted) {
  const contract = readJSON('tooling/migration/native-contract.json');
  assert.deepEqual(Object.keys(compiled).sort(), [...contract.payloadSections].sort());
  assert.deepEqual(Object.keys(extracted).sort(), [...contract.payloadSections].sort());
  const before = Buffer.from(contract.bundleMarkerBefore);
  const after = Buffer.from(contract.bundleMarkerAfter);
  assert.equal(before.length, after.length);
  const expectedRodata = Buffer.from(compiled['.rodata']);
  const index = expectedRodata.indexOf(before);
  assert.ok(index >= 0, 'marcador Tauri ausente');
  assert.equal(expectedRodata.indexOf(before, index + 1), -1, 'marcador Tauri duplicado');
  after.copy(expectedRodata, index);
  for (const name of contract.payloadSections) assert.equal(hash(extracted[name]), hash(name === '.rodata' ? expectedRodata : compiled[name]), `${name}: payload nativo alterado`);
}
