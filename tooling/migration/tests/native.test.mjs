import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertNativePayload, assertNativeSections } from '../native-lib.mjs';

test('bundle exige ELF, entrada desktop, identidade e assets atuais', () => {
  const good = Buffer.from('\x7fELFindex.html_app/immutable/current.jsapp.notfeed.desktop');
  const entry = '[Desktop Entry]\nName=Notfeed\nExec=notfeed\nType=Application\n';
  const assets = ['index.html', '_app/immutable/current.js'];
  assert.doesNotThrow(() => assertNativePayload(good, good, assets, entry));
  assert.throws(() => assertNativePayload(good, Buffer.from('not ELF'), assets, entry));
  assert.throws(() => assertNativePayload(good, good, ['_app/immutable/other.js'], entry));
  assert.throws(() => assertNativePayload(good, good, assets, entry.replace('Exec=notfeed', 'Exec=other')));
});
test('payload aceita somente a troca exata do marcador Tauri; código e demais recursos são imutáveis', () => {
  const compiled = { '.text': Buffer.from('code'), '.rodata': Buffer.from('resources __TAURI_BUNDLE_TYPE_VAR_UNK end'), '.note.gnu.build-id': Buffer.from('id') };
  const packed = { ...compiled, '.rodata': Buffer.from('resources __TAURI_BUNDLE_TYPE_VAR_APP end') };
  assert.doesNotThrow(() => assertNativeSections(compiled, packed));
  assert.throws(() => assertNativeSections(compiled, { ...packed, '.text': Buffer.from('other') }));
  assert.throws(() => assertNativeSections(compiled, { ...packed, '.rodata': Buffer.from('different __TAURI_BUNDLE_TYPE_VAR_APP end') }));
  assert.throws(() => assertNativeSections(compiled, { ...packed, '.note.gnu.build-id': Buffer.from('old') }));
  assert.throws(() => assertNativeSections(compiled, compiled));
});
