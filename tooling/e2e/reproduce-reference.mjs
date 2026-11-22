import { artifactRoot, artifactScope, workspaceCleanup } from '../checks/artifacts-lib.mjs';
import assert from 'node:assert/strict';
import {
	cpSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	symlinkSync,
	writeFileSync
} from 'node:fs';
import path from 'node:path';
import { execute, readJSON, writeJSON, hash, filesUnder } from '../checks/io.mjs';
import { verifyRecipe } from '../checks/reference-lib.mjs';
import { downloadVerified } from '../checks/download.mjs';

const recipe = readJSON('tooling/e2e/reference/stage-2-entry.json');
verifyRecipe(recipe);
const root = process.cwd();
mkdirSync('.artifacts/e2e/reproduction', { recursive: true });
const area = path.resolve(mkdtempSync('.artifacts/e2e/reproduction/stage-2-'));
const source = path.join(area, 'source'),
	tools = path.join(area, 'tools');
mkdirSync(tools);
await artifactScope(
	artifactRoot(),
	area,
	async () => {
		const commands = [];
		const downloads = [];
		async function run(id, command, args, cwd = root, env = {}) {
			const result = await execute(command, args, { cwd, env });
			writeJSON(path.join(area, `${id}.json`), result);
			commands.push({
				id,
				command,
				args,
				cwd,
				code: result.code,
				signal: result.signal,
				timedOut: result.timedOut
			});
			return result.stdout.trim();
		}
		async function download(url, target, algorithm, digest, encoding = 'hex') {
			downloads.push(await downloadVerified(url, target, algorithm, digest, encoding));
		}
		await run('clone', 'git', ['clone', '--no-checkout', path.resolve(recipe.bundle), source]);
		await run('checkout', 'git', ['checkout', '--detach', recipe.checkpoint], source);
		const tracked = (await run('tracked', 'git', ['ls-files', '-z'], source))
			.split('\0')
			.filter((file) => file && !file.endsWith('/state.md'))
			.sort();
		const sourceHash = () =>
			hash(
				tracked.map((file) => `${file}:${hash(readFileSync(path.join(source, file)))}`).join('\n')
			);
		const inputHash = sourceHash();
		assert.equal(inputHash, recipe.inputHash, 'fontes não correspondem à entrada auditada');
		const nodeArchive = path.join(tools, 'node.tar.xz'),
			npmArchive = path.join(tools, 'npm.tgz');
		await download(recipe.node.url, nodeArchive, 'sha256', recipe.node.sha256);
		await download(
			recipe.npm.url,
			npmArchive,
			'sha512',
			recipe.npm.integrity.slice('sha512-'.length),
			'base64'
		);
		for (const name of ['node', 'npm', 'bin']) mkdirSync(path.join(tools, name));
		await run('node-extract', 'tar', [
			'-xf',
			nodeArchive,
			'--strip-components=1',
			'-C',
			path.join(tools, 'node')
		]);
		await run('npm-extract', 'tar', [
			'-xf',
			npmArchive,
			'--strip-components=1',
			'-C',
			path.join(tools, 'npm')
		]);
		const node = path.join(tools, 'node/bin/node');
		symlinkSync(node, path.join(tools, 'bin/node'));
		const quote = (value) => `'${value.replaceAll("'", "'\\''")}'`;
		writeFileSync(
			path.join(tools, 'bin/npm'),
			`#!/bin/sh\nexec ${quote(node)} ${quote(path.join(tools, 'npm/bin/npm-cli.js'))} "$@"\n`,
			{ mode: 0o755 }
		);
		const env = {
			PATH: `${path.join(tools, 'bin')}:${process.env.PATH}`,
			npm_config_cache: path.join(area, 'cache')
		};
		const native = recipe.nativePrebuild;
		assert.equal(process.platform, native.platform);
		assert.equal(process.arch, native.arch);
		assert.equal(
			readJSON(path.join(source, 'package-lock.json')).packages[`node_modules/${native.package}`]
				.version,
			native.version
		);
		const prebuild = path.join(env.npm_config_cache, native.cacheFile);
		mkdirSync(path.dirname(prebuild), { recursive: true });
		await download(native.url, prebuild, 'sha256', native.sha256);
		assert.equal(await run('node-version', node, ['--version']), `v${recipe.node.version}`);
		assert.equal(
			await run('npm-version', path.join(tools, 'bin/npm'), ['--version'], source, env),
			recipe.npm.version
		);
		await run('install', path.join(tools, 'bin/npm'), ['ci'], source, env);
		await run('build', path.join(tools, 'bin/npm'), ['run', 'build'], source, env);
		assert.equal(sourceHash(), inputHash, 'reprodução alterou fontes/lock');
		assert.equal(recipe.buildDestination, '.artifacts/e2e/stage-2-entry-build');
		rmSync(recipe.buildDestination, { recursive: true, force: true });
		cpSync(path.join(source, recipe.build), recipe.buildDestination, {
			recursive: true,
			force: false,
			errorOnExist: true
		});
		writeJSON(recipe.evidenceDestination, {
			schemaVersion: 1,
			checkpoint: recipe.checkpoint,
			inputHash,
			source,
			area,
			recipeHash: hash(readFileSync('tooling/e2e/reference/stage-2-entry.json')),
			versions: { node: recipe.node.version, npm: recipe.npm.version },
			buildFiles: filesUnder(recipe.buildDestination).map((file) => ({
				file,
				hash: hash(readFileSync(file))
			})),
			commands,
			downloads
		});
		console.log(`Entrada da etapa 2 reconstruída isoladamente de ${recipe.checkpoint}: ${area}`);
	},
	() => workspaceCleanup(artifactRoot(), area, 'reference')
);
