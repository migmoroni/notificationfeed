import assert from 'node:assert/strict';
import { accessSync, constants, existsSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { execute, hash, readJSON } from './io.mjs';

export const provisionContract = (root = process.cwd()) =>
	readJSON(path.join(root, 'tooling/checks/contracts/provision.json'));
export const resetsProvisionKey = (key) =>
	/^(?:MISE_|NOTFEED_TOOL_LOCK$|NOTFEED_PROVISION_CONTEXT$|RUSTUP_TOOLCHAIN$|PNPM_HOME$|NODE_OPTIONS$|npm_config_cache$)/.test(
		key
	);
export function provisionEnvironment(context) {
	assert.ok(Array.isArray(context.unsetKeys) && context.unsetKeys.every(resetsProvisionKey));
	return {
		...Object.fromEntries(context.unsetKeys.map((key) => [key, undefined])),
		...context.env
	};
}
export function assertProvisionPins(root, contract = provisionContract(root)) {
	assert.equal(contract.schemaVersion, 1);
	const tools = readJSON(path.join(root, 'tooling/checks/contracts/tools.json'));
	const manifest = readJSON(path.join(root, 'package.json'));
	for (const name of ['node', 'pnpm', 'rust', 'cargoAudit'])
		assert.equal(contract.pins[name].version, tools[name], `provision pin: ${name}`);
	assert.equal(readFileSync(path.join(root, '.nvmrc'), 'utf8').trim(), tools.node);
	assert.equal(manifest.packageManager, `pnpm@${tools.pnpm}`);
	assert.equal(manifest.engines.node, tools.node);
	assert.equal(manifest.engines.pnpm, tools.pnpm);
	assert.deepEqual(contract.rustup.installArguments, [
		'toolchain',
		'install',
		tools.rust,
		'--no-self-update',
		'--profile',
		'minimal',
		...tools.rustComponents.flatMap((name) => ['--component', name])
	]);
	assert.equal(contract.rustup.selfUpdate, false);
	assert.equal(contract.rustup.changeDefault, false);
	const rust = readFileSync(path.join(root, 'rust-toolchain.toml'), 'utf8');
	assert.match(rust, new RegExp(`channel\\s*=\\s*"${tools.rust.replaceAll('.', '\\.')}"`));
	for (const component of tools.rustComponents) assert.ok(rust.includes(`"${component}"`));
	for (const item of contract.lockFiles) {
		assert.ok(!path.isAbsolute(item.file) && !item.file.split('/').includes('..'));
		assert.equal(
			hash(readFileSync(path.join(root, item.file))),
			item.sha256,
			`tool lock integrity: ${item.file}`
		);
	}
	const bootstrap = readFileSync(path.join(root, 'tooling/setup/install-mise.sh'), 'utf8');
	assert.ok(bootstrap.includes(`mise_version='${contract.mise.version}'`));
	assert.ok(bootstrap.includes(`mise_sha256='${contract.mise.sha256}'`));
	assert.ok(
		readFileSync(path.join(root, 'mise.toml'), 'utf8').startsWith(
			`min_version = "${contract.mise.version}"\n`
		)
	);
	assert.deepEqual(contract.mise.bootstrapModes, {
		development: 'validate-path-only',
		isolated: '--install-dir <absolute directory>'
	});
	assert.equal(contract.policy.installPersonalMise, false);
	assert.equal(
		contract.mise.url,
		`https://github.com/jdx/mise/releases/download/v${contract.mise.version}/mise-v${contract.mise.version}-linux-x64`
	);
}
export function assertRustOverride(env, contract = provisionContract()) {
	if (env.RUSTUP_TOOLCHAIN)
		assert.ok(
			[
				contract.pins.rust.version,
				`${contract.pins.rust.version}-x86_64-unknown-linux-gnu`
			].includes(env.RUSTUP_TOOLCHAIN),
			`RUSTUP_TOOLCHAIN=${env.RUSTUP_TOOLCHAIN} conflita com rust-toolchain.toml; remova o override deste processo.`
		);
}
export function effectiveEnvironment() {
	const release = Object.fromEntries(
		readFileSync('/etc/os-release', 'utf8')
			.split('\n')
			.filter((line) => /^[A-Z_]+=/.test(line))
			.map((line) => {
				const index = line.indexOf('=');
				return [line.slice(0, index), line.slice(index + 1).replace(/^"|"$/g, '')];
			})
	);
	return {
		id: release.ID,
		version: release.VERSION_ID,
		platform: process.platform,
		arch: process.arch
	};
}
export function executablePath(command, search = process.env.PATH) {
	for (const directory of search.split(path.delimiter)) {
		const file = path.resolve(directory, command);
		try {
			accessSync(file, constants.X_OK);
			return realpathSync(file);
		} catch (error) {
			if (!['ENOENT', 'EACCES', 'ENOTDIR'].includes(error.code)) throw error;
		}
	}
	throw new Error(`Executável ausente: ${command}. Prepare o ambiente com mise.`);
}
export async function inspectProvision(root = process.cwd()) {
	const contract = provisionContract(root);
	assertProvisionPins(root, contract);
	const environment = effectiveEnvironment();
	assert.ok(
		Object.values(contract.environments).some(
			(expected) =>
				expected.id === environment.id &&
				expected.version === environment.version &&
				expected.arch === environment.arch
		),
		`SO fora do contrato: ${JSON.stringify(environment)}`
	);
	assert.equal(environment.platform, 'linux');
	const commands = [];
	const mise = process.env.MISE_BIN ?? executablePath('mise');
	async function run(command, args) {
		const result = await execute(command, args, { cwd: root });
		commands.push(result);
		return result.stdout.trim();
	}
	const version = await run(mise, ['--version']);
	assert.equal(
		version.split(' ')[0],
		contract.mise.version,
		`Versão do mise divergente; instale mise ${contract.mise.version} no seu ambiente.`
	);
	assert.equal(
		hash(readFileSync(mise)),
		contract.mise.sha256,
		'Binário mise diverge do checksum oficial.'
	);
	await run(mise, ['lock', '--check', '--platform', 'linux-x64', '--json']);
	const selected = JSON.parse(await run(mise, ['ls', '--current', '--json']));
	const executables = {
		mise: realpathSync(mise),
		node: realpathSync(process.execPath),
		pnpm: executablePath('pnpm')
	};
	for (const [name, key] of [
		['node', 'node'],
		['pnpm', 'npm:pnpm']
	]) {
		const entries = selected[key];
		assert.ok(
			entries?.length === 1 && entries[0].installed,
			`${name}: execute mise run setup:web.`
		);
		assert.equal(entries[0].version, contract.pins[name].version);
		assert.ok(
			executables[name].startsWith(`${realpathSync(entries[0].install_path)}${path.sep}`),
			`${name}: executável fora da seleção mise: ${executables[name]}`
		);
	}
	assert.equal(process.versions.node, contract.pins.node.version);
	assert.equal(await run('pnpm', ['--version']), contract.pins.pnpm.version);
	const config = (key) => run(mise, ['config', 'get', '--file', path.join(root, 'mise.toml'), key]);
	assert.equal(await config('tool_config.locked'), 'true');
	assert.equal(await config('settings.locked_require_checksum'), 'true');
	assert.equal(await config('settings.npm.package_manager'), 'aube');
	return {
		status: 'passed',
		environment,
		versions: {
			mise: contract.mise.version,
			node: process.versions.node,
			pnpm: contract.pins.pnpm.version
		},
		executables,
		commands
	};
}
export function provisionLocks(root = process.cwd()) {
	return [
		'pnpm-lock.yaml',
		'apps/desktop/src-tauri/Cargo.lock',
		...provisionContract(root).lockFiles.map((item) => item.file)
	].map((file) => ({ file, sha256: hash(readFileSync(path.join(root, file))) }));
}
export function assertProvisionReceipt(receipt, expected) {
	const contract = provisionContract();
	for (const field of contract.receiptFields)
		assert.ok(Object.hasOwn(receipt, field), `provision receipt: ${field}`);
	assert.equal(receipt.schemaVersion, 1);
	assert.equal(receipt.status, 'passed');
	assert.match(receipt.inputHash, /^[a-f0-9]{64}$/);
	assert.match(receipt.contractsHash, /^[a-f0-9]{64}$/);
	assert.ok(
		Object.values(contract.environments).some(
			(item) =>
				item.id === receipt.environment.id &&
				item.version === receipt.environment.version &&
				item.arch === receipt.environment.arch
		)
	);
	assert.deepEqual(
		receipt.locks.map((item) => item.file),
		[
			'pnpm-lock.yaml',
			'apps/desktop/src-tauri/Cargo.lock',
			...contract.lockFiles.map((item) => item.file)
		]
	);
	for (const key of ['target', 'inputHash', 'contractsHash', 'locks'])
		if (Object.hasOwn(expected, key)) assert.deepEqual(receipt[key], expected[key]);
	assert.deepEqual(
		receipt.cases.map((item) => item.id),
		contract.cases[receipt.target]
	);
	for (const item of receipt.cases) assert.equal(item.status, 'passed');
	for (const item of receipt.cases) {
		assert.deepEqual(item.commands, contract.caseCommands[receipt.target][item.id]);
		for (const id of item.commands)
			assert.ok(
				receipt.commands.some((command) => command.id === id),
				`Prova ausente: ${id}`
			);
	}
	for (const name of ['mise', 'node', 'pnpm'])
		assert.equal(
			receipt.versions[name],
			name === 'mise' ? contract.mise.version : contract.pins[name].version
		);
	assert.ok(receipt.runtimes.length >= 2);
	assert.ok(receipt.runtimes.some((item) => item.argv.some((arg) => arg.endsWith('/pnpm.mjs'))));
	for (const runtime of receipt.runtimes) {
		assert.equal(runtime.version, contract.pins.node.version);
		assert.equal(runtime.executable, receipt.executables.node);
	}
	assert.deepEqual(receipt.independence, {
		absent: ['tooling/maintenance', 'tooling/migration', 'docs/plans'],
		verified: true
	});
	assert.ok(receipt.commands.length && receipt.executables.node && receipt.versions.node);
	for (const command of receipt.commands) {
		assert.ok(path.isAbsolute(command.cwd) && command.command && Array.isArray(command.args));
		assert.equal(command.signal, null);
		assert.equal(command.timedOut, false);
		assert.equal(command.error, null);
		const negative =
			/^(?:(?:missing-lock|divergent-pin|missing-platform)-(?:exec|run)|checksum-failure|download-failure|override-failure|native-library-failure)$/.test(
				command.id
			);
		assert.equal(command.expectedCode, negative ? 1 : 0);
		assert.equal(command.code, command.expectedCode);
		assert.ok(Date.parse(command.startedAt) >= Date.parse(receipt.startedAt));
		assert.ok(Date.parse(command.finishedAt) <= Date.parse(receipt.finishedAt));
		for (const key of ['stdout', 'stderr']) {
			assert.ok(existsSync(command[`${key}Path`]));
			assert.equal(hash(readFileSync(command[`${key}Path`])), command[`${key}Hash`]);
		}
	}
	assert.equal(receipt.cleanup.status, 'passed');
	assert.ok(Date.parse(receipt.finishedAt) >= Date.parse(receipt.startedAt));
	if (expected.notBefore)
		assert.ok(Date.parse(receipt.startedAt) >= Date.parse(expected.notBefore));
}
