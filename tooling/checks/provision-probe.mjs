import assert from 'node:assert/strict';
import {
	copyFileSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	renameSync,
	writeFileSync
} from 'node:fs';
import path from 'node:path';
import { homedir } from 'node:os';
import { execute, filesUnder, hash, writeJSON } from './io.mjs';
import { ciFingerprint } from './ci-lib.mjs';
import { artifactRoot, artifactScope, candidateCleanup } from './artifacts-lib.mjs';
import {
	assertProvisionReceipt,
	provisionContract,
	provisionLocks,
	provisionEnvironment,
	resetsProvisionKey
} from './provision-lib.mjs';

function personalState() {
	return Object.fromEntries(
		[
			'.bashrc',
			'.profile',
			'.local/bin/mise',
			'.rustup/settings.toml',
			'.cargo/bin/rustup',
			'.config/mise/config.toml',
			'.config/mise/config.override.toml',
			'.local/share/pnpm/bin/pnpm'
		].map((name) => {
			const file = path.join(homedir(), name);
			return [file, existsSync(file) ? hash(readFileSync(file)) : null];
		})
	);
}
export async function probeCommand(
	context,
	id,
	command,
	args,
	{ cwd = context.candidate, env = {}, failure = false, pattern, timeoutMs = 1800000 } = {}
) {
	console.error(`Provision: ${id}`);
	const startedAt = new Date().toISOString();
	let result;
	try {
		result = await execute(command, args, {
			cwd,
			env: { ...provisionEnvironment(context), ...env },
			timeoutMs
		});
	} catch (error) {
		result = JSON.parse(error.message);
	}
	const index = context.commands.length;
	const stdoutPath = path.join(context.area, `${index}-${id}.stdout`),
		stderrPath = path.join(context.area, `${index}-${id}.stderr`);
	writeFileSync(stdoutPath, result.stdout);
	writeFileSync(stderrPath, result.stderr);
	context.commands.push({
		id,
		startedAt,
		finishedAt: new Date().toISOString(),
		...result,
		expectedCode: failure ? 1 : 0,
		stdoutPath,
		stderrPath,
		stdoutHash: hash(result.stdout),
		stderrHash: hash(result.stderr)
	});
	writeJSON(path.join(context.area, 'context.json'), context);
	if (failure) {
		assert.equal(result.code, 1, `${id}: expected rejection`);
		if (pattern) assert.match(result.stderr, pattern);
	} else assert.equal(result.code, 0);
	assert.equal(result.signal, null);
	assert.equal(result.timedOut, false);
	assert.equal(result.error, null);
	return result;
}
export async function prepareProvisionCandidate(root, output, { target = 'web' } = {}) {
	assert.ok(['web', 'ci'].includes(target));
	mkdirSync(output, { recursive: true });
	const area = mkdtempSync(path.join(output, 'candidate-')),
		candidate = path.join(area, 'source');
	return await artifactScope(
		artifactRoot(),
		area,
		async () => {
			mkdirSync(candidate);
			for (const file of filesUnder(root)) {
				const target = path.join(candidate, path.relative(root, file));
				mkdirSync(path.dirname(target), { recursive: true });
				copyFileSync(file, target);
			}
			const sentinel = path.join(area, 'sentinel');
			mkdirSync(sentinel);
			for (const name of ['node', 'pnpm', 'rustc', 'cargo', 'rustup', 'cargo-audit', 'pkg-config'])
				writeFileSync(
					path.join(sentinel, name),
					'#!/bin/sh\nprintf "%s\\n" "$0" >> "$NOTFEED_SENTINEL_LOG"\nexit 87\n',
					{ mode: 0o755 }
				);
			const unsetKeys = Object.keys(process.env).filter(resetsProvisionKey);
			const env = Object.fromEntries(unsetKeys.map((key) => [key, undefined]));
			Object.assign(env, {
				PATH: `${sentinel}:/usr/bin:/bin`,
				MISE_DATA_DIR: path.join(area, 'mise-data'),
				MISE_CACHE_DIR: path.join(area, 'mise-cache'),
				MISE_CONFIG_DIR: path.join(area, 'mise-config'),
				MISE_STATE_DIR: path.join(area, 'mise-state'),
				XDG_DATA_HOME: path.join(area, 'bootstrap'),
				XDG_CACHE_HOME: path.join(area, 'cache'),
				NOTFEED_SENTINEL_LOG: path.join(area, 'sentinel.log'),
				NOTFEED_SETUP_STORE: path.join(area, 'store'),
				NOTFEED_SETUP_CACHE: path.join(area, 'cache/pnpm'),
				PLAYWRIGHT_SKIP_BROWSER_GC: '1',
				...(target === 'ci'
					? { PLAYWRIGHT_BROWSERS_PATH: path.join(area, 'forbidden-chromium') }
					: {})
			});
			const fingerprint = ciFingerprint(candidate);
			const context = {
				schemaVersion: 1,
				area,
				candidate,
				env,
				unsetKeys,
				commands: [],
				inputHash: fingerprint.inputHash,
				contractsHash: fingerprint.contractsHash,
				locks: provisionLocks(candidate),
				startedAt: new Date().toISOString(),
				personalBefore: personalState(),
				userDataHome: process.env.XDG_DATA_HOME ?? path.join(homedir(), '.local/share'),
				cacheInitiallyEmpty: true
			};
			for (const name of ['mise-data', 'mise-cache', 'store'])
				assert.equal(existsSync(path.join(area, name)), false);
			const bootstrap = await probeCommand(context, 'bootstrap-clean', '/bin/bash', [
				'tooling/setup/install-mise.sh',
				'--install-dir',
				path.join(area, 'bootstrap/bin')
			]);
			context.mise = bootstrap.stdout.trim();
			await probeCommand(context, 'trust', context.mise, [
				'trust',
				path.join(candidate, 'mise.toml')
			]);
			await probeCommand(context, 'install-tools', context.mise, ['install', '--locked']);
			const resolved = JSON.parse(
				(await probeCommand(context, 'environment', context.mise, ['env', '--json'])).stdout
			);
			Object.assign(context.env, resolved);
			await probeCommand(context, 'setup-clean', context.mise, ['run', `setup:${target}`]);
			assert.equal(
				existsSync(context.env.NOTFEED_SENTINEL_LOG),
				false,
				'Setup web invoked an external tool.'
			);
			assert.equal(
				existsSync(
					path.join(
						context.env.XDG_DATA_HOME,
						provisionContract(root).directories.auditRelativePath
					)
				),
				false
			);
			assert.equal(ciFingerprint(candidate).inputHash, context.inputHash);
			writeJSON(path.join(area, 'context.json'), context);
			return context;
		},
		(status) => (status === 'failed' ? candidateCleanup(artifactRoot(), area) : [])
	);
}

async function negativeToolConfigurations(context) {
	const fixture = path.join(context.area, 'tool-fixture');
	mkdirSync(fixture);
	const contract = provisionContract(context.candidate);
	const names = [
		'mise.toml',
		'.nvmrc',
		'package.json',
		'tooling/checks/contracts/provision.json',
		...contract.lockFiles.map((item) => item.file)
	];
	function reset() {
		for (const name of names) {
			const target = path.join(fixture, name);
			mkdirSync(path.dirname(target), { recursive: true });
			copyFileSync(path.join(context.candidate, name), target);
		}
	}
	reset();
	await probeCommand(
		context,
		'trust-fixture',
		context.mise,
		['trust', path.join(fixture, 'mise.toml')],
		{ cwd: fixture }
	);
	for (const id of ['missing-lock', 'divergent-pin', 'missing-platform']) {
		reset();
		if (id === 'missing-lock')
			renameSync(path.join(fixture, 'mise.lock'), path.join(fixture, 'missing.lock'));
		if (id === 'divergent-pin') writeFileSync(path.join(fixture, '.nvmrc'), '24.22.2\n');
		if (id === 'missing-platform')
			writeFileSync(
				path.join(fixture, 'mise.lock'),
				readFileSync(path.join(fixture, 'mise.lock'), 'utf8').replace(
					'platforms.linux-x64',
					'platforms.macos-arm64'
				)
			);
		for (const args of [
			['exec', '--', '/bin/true'],
			['run', 'setup:web']
		])
			await probeCommand(context, `${id}-${args[0]}`, context.mise, args, {
				cwd: fixture,
				failure: true,
				pattern: /contract|template|lock|mise\.lock/s
			});
	}
}
async function bootstrapFailures(context) {
	const bin = path.join(context.area, 'bad-download');
	mkdirSync(bin);
	for (const [id, body] of [
		[
			'checksum-failure',
			'while [ "$#" -gt 0 ]; do if [ "$1" = "--output" ]; then shift; printf corrupted > "$1"; exit 0; fi; shift; done; exit 1'
		],
		['download-failure', 'exit 1']
	]) {
		writeFileSync(path.join(bin, 'curl'), `#!/bin/sh\n${body}\n`, { mode: 0o755 });
		await probeCommand(
			context,
			id,
			'/bin/bash',
			[
				'tooling/setup/install-mise.sh',
				'--install-dir',
				path.join(context.area, 'failed-bootstrap')
			],
			{
				env: {
					PATH: `${bin}:/usr/bin:/bin`,
					XDG_DATA_HOME: path.join(context.area, 'failed-bootstrap')
				},
				failure: true
			}
		);
		assert.equal(existsSync(path.join(context.area, 'failed-bootstrap/mise')), false);
	}
}
export async function proveWeb(context) {
	const hook = path.join(context.area, 'runtime-hook.cjs'),
		runtimeLog = path.join(context.area, 'runtime.jsonl');
	writeFileSync(
		hook,
		"require('node:fs').appendFileSync(process.env.NOTFEED_RUNTIME_LOG,JSON.stringify({argv:process.argv,version:process.versions.node,executable:process.execPath})+'\\n');\n"
	);
	const runtime = JSON.parse(
		(
			await probeCommand(
				context,
				'effective-runtime',
				'pnpm',
				[
					'exec',
					'node',
					'--eval',
					'console.log(JSON.stringify({version:process.versions.node,executable:process.execPath}))'
				],
				{
					env: {
						NODE_OPTIONS: `--require=${JSON.stringify(hook)}`,
						NOTFEED_RUNTIME_LOG: runtimeLog
					}
				}
			)
		).stdout
	);
	assert.equal(runtime.version, provisionContract(context.candidate).pins.node.version);
	assert.ok(runtime.executable.startsWith(context.env.MISE_DATA_DIR + path.sep));
	context.runtimes = readFileSync(runtimeLog, 'utf8')
		.trim()
		.split('\n')
		.map((line) => JSON.parse(line));
	assert.ok(
		context.runtimes.some((item) => item.argv.some((arg) => arg.endsWith('/pnpm.mjs'))),
		'Runtime do próprio pnpm não observado.'
	);
	for (const item of context.runtimes) {
		assert.equal(item.version, runtime.version);
		assert.equal(item.executable, runtime.executable);
	}
	const selected = JSON.parse(
		(
			await probeCommand(context, 'external-path', context.mise, [
				'exec',
				'--',
				'node',
				'--eval',
				'console.log(JSON.stringify({version:process.versions.node,executable:process.execPath}))'
			])
		).stdout
	);
	assert.deepEqual(selected, runtime);
	assert.equal(existsSync(context.env.NOTFEED_SENTINEL_LOG), false);
	const other = path.join(context.area, 'other-project'),
		otherTool = path.join(context.area, 'other-tool');
	mkdirSync(other);
	mkdirSync(path.join(otherTool, 'bin'), { recursive: true });
	writeFileSync(path.join(otherTool, 'bin/node'), '#!/bin/sh\nprintf "fixture-node-99\\n"\n', {
		mode: 0o755
	});
	writeFileSync(path.join(other, 'mise.toml'), `[tools]\nnode = "path:${otherTool}"\n`);
	await probeCommand(
		context,
		'trust-other',
		context.mise,
		['trust', path.join(other, 'mise.toml')],
		{ cwd: other }
	);
	assert.equal(
		(
			await probeCommand(
				context,
				'other-project',
				context.mise,
				['exec', '--', 'node', '--version'],
				{ cwd: other, env: { NOTFEED_TOOL_LOCK: undefined } }
			)
		).stdout.trim(),
		'fixture-node-99'
	);
	await negativeToolConfigurations(context);
	await bootstrapFailures(context);
	// One installed candidate also proves everyday setup independent of stage history.
	const hidden = [];
	try {
		for (const name of ['tooling/maintenance', 'tooling/migration', 'docs/plans']) {
			const source = path.join(context.candidate, name),
				target = path.join(context.area, 'hidden', name);
			mkdirSync(path.dirname(target), { recursive: true });
			renameSync(source, target);
			hidden.push([source, target]);
		}
		await probeCommand(context, 'warm-repeat', context.mise, ['run', 'setup:web']);
		await probeCommand(context, 'offline-repeat', 'pnpm', [
			'install',
			'--frozen-lockfile',
			'--offline',
			'--store-dir',
			context.env.NOTFEED_SETUP_STORE,
			'--cache-dir',
			context.env.NOTFEED_SETUP_CACHE
		]);
		context.independence = {
			absent: ['tooling/maintenance', 'tooling/migration', 'docs/plans'],
			verified: true
		};
		for (const name of context.independence.absent)
			assert.equal(existsSync(path.join(context.candidate, name)), false);
		await probeCommand(context, 'doctor', 'pnpm', ['run', 'doctor', '--target', 'web']);
		await probeCommand(context, 'quick', 'pnpm', ['verify:quick']);
	} finally {
		for (const [source, target] of hidden) renameSync(target, source);
	}
	assert.deepEqual(provisionLocks(context.candidate), context.locks);
	assert.equal(ciFingerprint(context.candidate).inputHash, context.inputHash);
	assert.deepEqual(personalState(), context.personalBefore);
	return runtime;
}
export async function proveDesktop(context) {
	const usualData = context.userDataHome;
	Object.assign(context.env, {
		XDG_DATA_HOME: usualData,
		PATH: `${context.env.PATH.split(path.delimiter)
			.filter((part) => part !== path.join(context.area, 'sentinel'))
			.join(path.delimiter)}:${path.join(homedir(), '.cargo/bin')}`
	});
	const resolved = JSON.parse(
		(await probeCommand(context, 'desktop-environment', context.mise, ['env', '--json'])).stdout
	);
	Object.assign(context.env, resolved);
	await probeCommand(context, 'override-failure', context.mise, ['run', 'setup:desktop'], {
		env: { RUSTUP_TOOLCHAIN: 'stable' },
		failure: true,
		pattern: /RUSTUP_TOOLCHAIN/
	});
	await probeCommand(context, 'setup-desktop', context.mise, ['run', 'setup:desktop']);
	const setup = JSON.parse(context.commands.find((item) => item.id === 'setup-desktop').stdout);
	assert.deepEqual(
		JSON.parse(readFileSync(setup.evidence, 'utf8')).commands.find((item) => item.id === 'RUST')
			.args,
		provisionContract(context.candidate).rustup.installArguments
	);
	const native = path.join(context.area, 'missing-native');
	mkdirSync(native);
	writeFileSync(
		path.join(native, 'pkg-config'),
		'#!/bin/sh\nif [ "$1" = "--exists" ]; then exit 1; fi\nprintf "fixture-pkg-config\\n"\n',
		{ mode: 0o755 }
	);
	await probeCommand(
		context,
		'native-library-failure',
		'pnpm',
		['run', 'doctor', '--target', 'desktop'],
		{
			env: { PATH: `${native}:${context.env.PATH}` },
			failure: true,
			pattern: /Biblioteca .* ausente.*Instale/
		}
	);
	await probeCommand(context, 'effective-rust', 'rustc', ['--version']);
	await probeCommand(context, 'desktop-doctor', 'pnpm', ['run', 'doctor', '--target', 'desktop']);
	assert.equal(ciFingerprint(context.candidate).inputHash, context.inputHash);
	assert.deepEqual(personalState(), context.personalBefore);
}
export function provisionReceipt(context, target, versions, executables, cleanup) {
	const receipt = {
		schemaVersion: 1,
		status: 'passed',
		target,
		environment: versions.environment,
		versions: versions.versions,
		executables,
		inputHash: context.inputHash,
		contractsHash: context.contractsHash,
		locks: context.locks,
		commands: context.commands,
		cases: provisionContract(context.candidate).cases[target].map((id) => ({
			id,
			status: 'passed',
			commands: provisionContract(context.candidate).caseCommands[target][id]
		})),
		runtimes: context.runtimes,
		independence: context.independence,
		startedAt: context.startedAt,
		finishedAt: new Date().toISOString(),
		cleanup
	};
	assertProvisionReceipt(receipt, {
		target,
		inputHash: context.inputHash,
		contractsHash: context.contractsHash,
		locks: context.locks
	});
	return receipt;
}
