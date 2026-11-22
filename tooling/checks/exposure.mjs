import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import path from 'node:path';
import { readJSON, filesUnder } from './io.mjs';
import { packageDirectory } from './resolve.mjs';

export function assertBrowserCondition(condition, context) {
	switch (condition) {
		case 'static-spa-server-api-absent':
			assert.match(context.layout, /ssr\s*=\s*false/);
			assert.match(context.adapter, /@sveltejs\/adapter-static/);
			assert.ok(!/\bremoteFunctions\s*:\s*true\b/.test(context.adapter));
			assert.ok(!context.routes.some((route) => /\+server\.|\.remote\./.test(route)));
			assert.ok(
				!/\$app\/server|\benhance\s*\(|\buse:enhance\b|\bsetHeaders\s*\(/.test(context.source)
			);
			break;
		case 'vitest-server-not-enabled':
			assert.ok(!context.scripts.some((script) => /--(?:ui|api|browser)\b/.test(script)));
			assert.ok(!/\b(?:api|browser|ui)\s*:/.test(context.vitest));
			assert.ok(
				!context.installedPackages.some(
					(name) => name === '@vitest/ui' || name.startsWith('@vitest/browser')
				)
			);
			break;
		case 'react-native-target-absent':
			assert.equal(
				context.webrtc.browser['./dist/src/webrtc/index.js'],
				'./dist/src/webrtc/index.browser.js'
			);
			assert.equal(
				context.webrtc['react-native']['./dist/src/webrtc/index.js'],
				'./dist/src/webrtc/index.react-native.js'
			);
			assert.ok(!/\b(?:from\s*|import\s*\()\s*['"]react-native/.test(context.source));
			break;
		case 'helia-node-autoTLS-absent':
			assert.equal(
				context.helia.browser['./dist/src/utils/libp2p-defaults.js'],
				'./dist/src/utils/libp2p-defaults.browser.js'
			);
			assert.ok(!/autoTLS|libp2p-auto-tls/.test(context.browserDefaults));
			assert.ok(!/libp2p-auto-tls|acme-client/.test(context.source));
			break;
		case 'dht-server-disabled':
			assert.match(context.browserDefaults, /clientMode:\s*true/);
			assert.equal(context.defaultHeliaCall, true);
			break;
		default:
			throw new Error(`condição de exposição desconhecida: ${condition}`);
	}
}
export function browserContext() {
	const sources = ['apps/web/src', 'packages/notfeed/src']
		.flatMap(filesUnder)
		.filter((file) => /\.(ts|js|svelte)$/.test(file));
	const heliaSource = readFileSync('packages/notfeed/src/ingestion/net/helia-resolver.ts', 'utf8');
	const tree = ts.createSourceFile('helia-resolver.ts', heliaSource, ts.ScriptTarget.Latest, true);
	const calls = [];
	function visit(node) {
		if (ts.isCallExpression(node) && node.expression.getText(tree) === 'createHelia')
			calls.push(node.arguments.length);
		ts.forEachChild(node, visit);
	}
	visit(tree);
	const packages = [
		'package.json',
		'apps/web/package.json',
		'apps/desktop/package.json',
		'packages/notfeed/package.json'
	].map(readJSON);
	const helia = packageDirectory('packages/notfeed', 'helia');
	const webrtc = packageDirectory(helia, '@libp2p/webrtc');
	return {
		layout: readFileSync('apps/web/src/routes/+layout.ts', 'utf8'),
		adapter: readFileSync('apps/web/svelte.config.js', 'utf8'),
		routes: filesUnder('apps/web/src/routes'),
		source: sources.map((file) => readFileSync(file, 'utf8')).join('\n'),
		vitest: readFileSync('apps/web/vitest.config.ts', 'utf8'),
		scripts: packages.flatMap((pkg) => Object.values(pkg.scripts ?? {})),
		helia: readJSON(path.join(helia, 'package.json')),
		webrtc: readJSON(path.join(webrtc, 'package.json')),
		browserDefaults: readFileSync(
			path.join(helia, 'dist/src/utils/libp2p-defaults.browser.js'),
			'utf8'
		),
		installedPackages: packages.flatMap((pkg) =>
			Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })
		),
		defaultHeliaCall: calls.length === 1 && calls[0] === 0
	};
}
