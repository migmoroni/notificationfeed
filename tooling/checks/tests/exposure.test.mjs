import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assertBrowserCondition } from '../exposure.mjs';

const context = {
	layout: 'export const ssr = false; export const prerender = false;',
	adapter: "import adapter from '@sveltejs/adapter-static'; fallback: 'index.html'",
	routes: ['+layout.ts', '+page.svelte'],
	source: 'const runtime = await createHelia();',
	vitest: 'test: { environment: "jsdom" }',
	scripts: ['vitest', 'vitest run'],
	helia: {
		browser: {
			'./dist/src/utils/libp2p-defaults.js': './dist/src/utils/libp2p-defaults.browser.js'
		}
	},
	browserDefaults: 'dht: kadDHT({ clientMode: true })',
	webrtc: {
		browser: { './dist/src/webrtc/index.js': './dist/src/webrtc/index.browser.js' },
		'react-native': { './dist/src/webrtc/index.js': './dist/src/webrtc/index.react-native.js' }
	},
	installedPackages: [],
	defaultHeliaCall: true
};
test('não aplicabilidade é condicionada ao alvo SPA, runtime browser e configuração real', () => {
	for (const condition of [
		'static-spa-server-api-absent',
		'vitest-server-not-enabled',
		'react-native-target-absent',
		'helia-node-autoTLS-absent',
		'dht-server-disabled'
	])
		assert.doesNotThrow(() => assertBrowserCondition(condition, context));
	for (const [condition, changed] of [
		['static-spa-server-api-absent', { ...context, routes: ['+server.ts'] }],
		['static-spa-server-api-absent', { ...context, layout: 'export const ssr = true;' }],
		[
			'static-spa-server-api-absent',
			{ ...context, adapter: context.adapter + ' experimental: { remoteFunctions: true }' }
		],
		['static-spa-server-api-absent', { ...context, source: '<form use:enhance />' }],
		[
			'static-spa-server-api-absent',
			{ ...context, source: 'setHeaders({ "cache-control": value })' }
		],
		['vitest-server-not-enabled', { ...context, scripts: ['vitest --api.host 0.0.0.0'] }],
		['react-native-target-absent', { ...context, source: "import x from 'react-native';" }],
		['helia-node-autoTLS-absent', { ...context, browserDefaults: 'autoTLS()' }],
		['dht-server-disabled', { ...context, browserDefaults: 'clientMode: false' }],
		['dht-server-disabled', { ...context, defaultHeliaCall: false }]
	])
		assert.throws(() => assertBrowserCondition(condition, changed));
	assert.throws(() => assertBrowserCondition('unknown', context));
});
