import { artifactRoot, artifactScope, workspaceCleanup } from './artifacts-lib.mjs';
import assert from 'node:assert/strict';
import { readFileSync, statSync, mkdirSync, mkdtempSync } from 'node:fs';
import path from 'node:path';
import { execute, readJSON, writeJSON, filesUnder, hash } from './io.mjs';
import { assertNativePayload, assertNativeSections, nativePaths } from './native-lib.mjs';

const contract = nativePaths(
	readJSON('tooling/checks/contracts/native.json'),
	process.cwd(),
	process.env.CARGO_TARGET_DIR
);
const started = Date.parse(process.env.NOTFEED_BUILD_STARTED_AT ?? '');
assert.ok(Number.isFinite(started), 'inspeção exige início identificado do build');
assert.ok(statSync(contract.bundle).mtimeMs >= started, 'AppImage anterior à execução');
mkdirSync('.artifacts/native', { recursive: true });
const directory = path.resolve(mkdtempSync('.artifacts/native/current-'));
await artifactScope(
	artifactRoot(),
	directory,
	async () => {
		const commands = [];
		async function run(command, args, cwd = process.cwd()) {
			const result = await execute(command, args, { cwd });
			commands.push(result);
			return result;
		}
		await run(path.resolve(contract.bundle), ['--appimage-extract'], directory);
		const embeddedPath = path.join(directory, contract.extractedBinary);
		const embedded = readFileSync(embeddedPath),
			compiled = readFileSync(contract.binary);
		const assets = [
			'index.html',
			...filesUnder(`${contract.frontend}/_app/immutable`)
				.filter((file) => /\.(?:js|css)$/.test(file))
				.map((file) => path.relative(contract.frontend, file))
		];
		assert.ok(assets.length > 1, 'frontend sem chunks');
		assertNativePayload(
			compiled,
			embedded,
			assets,
			readFileSync(path.join(directory, contract.desktopEntry), 'utf8')
		);
		const sections = {};
		for (const [kind, binary] of [
			['compiled', path.resolve(contract.binary)],
			['extracted', embeddedPath]
		]) {
			const sectionDir = path.join(directory, kind);
			mkdirSync(sectionDir);
			const args = contract.payloadSections.flatMap((name) => [
				'--dump-section',
				`${name}=${path.join(sectionDir, name)}`
			]);
			await run('objcopy', [...args, binary, '/dev/null']);
			sections[kind] = Object.fromEntries(
				contract.payloadSections.map((name) => [name, readFileSync(path.join(sectionDir, name))])
			);
		}
		assertNativeSections(sections.compiled, sections.extracted);
		assert.equal(
			(await run('patchelf', ['--print-rpath', embeddedPath])).stdout.trim(),
			contract.rpath
		);
		writeJSON(path.join(directory, 'evidence.json'), {
			schemaVersion: 1,
			status: 'passed',
			startedAt: new Date(started).toISOString(),
			bundle: contract.bundle,
			bundleHash: hash(readFileSync(contract.bundle)),
			embeddedHash: hash(embedded),
			compiledHash: hash(compiled),
			sections: Object.fromEntries(
				Object.entries(sections).map(([kind, values]) => [
					kind,
					Object.fromEntries(Object.entries(values).map(([name, bytes]) => [name, hash(bytes)]))
				])
			),
			frontendVersion: readJSON(`${contract.frontend}/_app/version.json`).version,
			assets: assets.map((file) => ({
				file,
				hash: hash(readFileSync(path.join(contract.frontend, file)))
			})),
			identity: contract.identity,
			commands,
			coverage:
				'Compilação/empacotamento Linux e assets atuais; não prova WebView ou notificações nativas.'
		});
		console.log(JSON.stringify({ evidence: `${directory}/evidence.json`, assets: assets.length }));
	},
	() => workspaceCleanup(artifactRoot(), directory, 'native')
);
