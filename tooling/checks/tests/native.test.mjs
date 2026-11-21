import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	assertNativePayload,
	assertNativeSections,
	nativePaths,
	assertNativeProject
} from '../native-lib.mjs';
import { readJSON } from '../io.mjs';

test('contrato nativo rejeita mudança de identidade, backend, plugins e features declaradas', () => {
	const contract = readJSON('tooling/checks/contracts/native-project.json');
	assert.doesNotThrow(() => assertNativeProject(structuredClone(contract), contract));
	const mutations = [
		(project) => {
			project.name = 'other';
		},
		(project) => {
			project.rust_version = '1.90';
		},
		(project) => {
			project.features.default = ['backend-sqlite'];
		},
		(project) => {
			project.dependencies.find((dependency) => dependency.name === 'tauri-plugin-sql').optional =
				false;
		},
		(project) => {
			project.dependencies.push({ ...project.dependencies[0], name: 'tauri-plugin-updater' });
		},
		(project) => {
			project.dependencies
				.find((dependency) => dependency.name === 'tauri')
				.features.push('devtools');
		}
	];
	for (const mutate of mutations) {
		const project = structuredClone(contract);
		mutate(project);
		assert.throws(() => assertNativeProject(project, contract));
	}
});

test('bundle exige ELF, entrada desktop, identidade e assets atuais', () => {
	const good = Buffer.from('\x7fELFindex.html_app/immutable/current.jsapp.notfeed.desktop');
	const entry = '[Desktop Entry]\nName=Notfeed\nExec=notfeed\nType=Application\n';
	const assets = ['index.html', '_app/immutable/current.js'];
	assert.doesNotThrow(() => assertNativePayload(good, good, assets, entry));
	assert.throws(() => assertNativePayload(good, Buffer.from('not ELF'), assets, entry));
	assert.throws(() => assertNativePayload(good, good, ['_app/immutable/other.js'], entry));
	assert.throws(() =>
		assertNativePayload(good, good, assets, entry.replace('Exec=notfeed', 'Exec=other'))
	);
});
test('cache Cargo muda somente caminhos gerados, preservando binário e bundle esperados', () => {
	const contract = {
		target: 'apps/desktop/src-tauri/target',
		binary: 'apps/desktop/src-tauri/target/release/notfeed',
		bundle: 'apps/desktop/src-tauri/target/release/bundle/appimage/Notfeed.AppImage',
		frontend: 'apps/web/build'
	};
	const actual = nativePaths(contract, '/source', '/cache/target');
	assert.equal(actual.binary, '/cache/target/release/notfeed');
	assert.equal(actual.bundle, '/cache/target/release/bundle/appimage/Notfeed.AppImage');
	assert.equal(actual.frontend, contract.frontend);
	assert.equal(
		nativePaths(contract, '/source', null).binary,
		'/source/apps/desktop/src-tauri/target/release/notfeed'
	);
	assert.throws(() =>
		nativePaths({ ...contract, binary: 'outside/notfeed' }, '/source', '/cache/target')
	);
});
test('payload aceita somente a troca exata do marcador Tauri; código e demais recursos são imutáveis', () => {
	const compiled = {
		'.text': Buffer.from('code'),
		'.rodata': Buffer.from('resources __TAURI_BUNDLE_TYPE_VAR_UNK end'),
		'.note.gnu.build-id': Buffer.from('id')
	};
	const packed = {
		...compiled,
		'.rodata': Buffer.from('resources __TAURI_BUNDLE_TYPE_VAR_APP end')
	};
	assert.doesNotThrow(() => assertNativeSections(compiled, packed));
	assert.throws(() => assertNativeSections(compiled, { ...packed, '.text': Buffer.from('other') }));
	assert.throws(() =>
		assertNativeSections(compiled, {
			...packed,
			'.rodata': Buffer.from('different __TAURI_BUNDLE_TYPE_VAR_APP end')
		})
	);
	assert.throws(() =>
		assertNativeSections(compiled, { ...packed, '.note.gnu.build-id': Buffer.from('old') })
	);
	assert.throws(() => assertNativeSections(compiled, compiled));
});
