import assert from 'node:assert/strict';
import { accessSync, constants, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { execute, readJSON, hash } from './io.mjs';
import { packageDirectory } from './resolve.mjs';

export function assertToolVersion(name, actual, expected, action) {
	assert.equal(actual, expected, `${name}: requerido ${expected}, encontrado ${actual}. ${action}`);
}
export function assertChromiumVersion(output, expected) {
	assert.match(output, /^(?:Chromium|Google Chrome for Testing) /);
	const version = output.match(/\b(\d+\.\d+\.\d+\.\d+)\b/)?.[1];
	assertToolVersion(
		'Chromium',
		version,
		expected,
		'Execute pnpm exec playwright install chromium.'
	);
}
export async function inspectEnvironment(target, root = process.cwd()) {
	assert.ok(['web', 'desktop'].includes(target), 'alvo esperado: web ou desktop');
	const tools = readJSON(path.join(root, 'tooling/checks/contracts/tools.json'));
	const manifest = readJSON(path.join(root, 'package.json'));
	const commands = [];
	async function required(command, args, action) {
		try {
			const result = await execute(command, args, { cwd: root });
			commands.push(result);
			return result.stdout.trim();
		} catch (error) {
			throw new Error(`${command}: requisito ausente ou inválido. ${action}\n${error.message}`);
		}
	}
	assertToolVersion('node', process.versions.node, tools.node, 'Selecione a versão de .nvmrc.');
	assert.equal(readFileSync(path.join(root, '.nvmrc'), 'utf8').trim(), tools.node);
	assert.equal(manifest.engines.node, tools.node);
	assert.equal(manifest.engines.pnpm, tools.pnpm);
	assert.equal(manifest.packageManager, `pnpm@${tools.pnpm}`);
	const pnpm = await required('pnpm', ['--version'], `Instale pnpm@${tools.pnpm}.`);
	assertToolVersion('pnpm', pnpm, tools.pnpm, `Instale pnpm@${tools.pnpm}.`);
	const locks = ['pnpm-lock.yaml', 'apps/desktop/src-tauri/Cargo.lock'].map((file) => {
		assert.ok(
			existsSync(path.join(root, file)),
			`Lock ausente: ${file}. Restaure o arquivo versionado.`
		);
		return { file, sha256: hash(readFileSync(path.join(root, file))) };
	});
	assert.equal(
		existsSync(path.join(root, 'package-lock.json')),
		false,
		'Remova o lock npm concorrente.'
	);
	const projects = JSON.parse(
		await required(
			'pnpm',
			['list', '--recursive', '--depth', '0', '--json'],
			'Execute pnpm install --frozen-lockfile.'
		)
	);
	const expected = readJSON(path.join(root, 'tooling/checks/contracts/project.json')).workspaces;
	for (const [directory, name] of Object.entries(expected))
		assert.ok(
			projects.some(
				(project) =>
					project.name === name && path.resolve(project.path) === path.join(root, directory)
			),
			`Workspace não preparado: ${directory}. Execute pnpm install --frozen-lockfile.`
		);
	const executable = chromium.executablePath();
	try {
		accessSync(executable, constants.X_OK);
	} catch {
		throw new Error('Chromium ausente. Execute pnpm exec playwright install chromium.');
	}
	const browserVersion = await required(
		executable,
		['--version'],
		'Execute pnpm exec playwright install --with-deps chromium.'
	);
	const playwright = packageDirectory(packageDirectory(root, '@playwright/test'), 'playwright');
	const core = packageDirectory(playwright, 'playwright-core');
	const browser = readJSON(path.join(core, 'browsers.json')).browsers.find(
		(value) => value.name === 'chromium'
	);
	assert.ok(browser?.browserVersion);
	assertChromiumVersion(browserVersion, browser.browserVersion);
	const versions = { node: process.versions.node, pnpm, chromium: browserVersion };
	if (target === 'desktop') {
		assert.equal(process.platform, tools.target.platform, 'Alvo desktop atual requer Linux.');
		assert.equal(process.arch, tools.target.arch, 'Alvo desktop atual requer x86_64.');
		const rust = await required(
			'rustc',
			['--version'],
			`Instale Rust via rustup e selecione ${tools.rust} conforme rust-toolchain.toml.`
		);
		assertToolVersion('rustc', rust.split(' ')[1], tools.rust, 'Confira overrides rustup.');
		const cargo = await required(
			'cargo',
			['--version'],
			'Instale o componente Cargo do toolchain fixado.'
		);
		assertToolVersion('cargo', cargo.split(' ')[1], tools.rust, 'Confira overrides rustup.');
		assert.match(
			readFileSync(path.join(root, 'rust-toolchain.toml'), 'utf8'),
			new RegExp(`channel\\s*=\\s*"${tools.rust.replaceAll('.', '\\.')}"`)
		);
		const components = await required(
			'rustup',
			['component', 'list', '--installed'],
			'Instale rustfmt e clippy no toolchain fixado.'
		);
		for (const component of tools.rustComponents)
			assert.ok(
				components.split('\n').some((value) => value.startsWith(`${component}-`)),
				`Componente ${component} ausente. Execute rustup component add ${component}.`
			);
		const audit = await required(
			'cargo',
			['audit', '--version'],
			`Execute cargo install cargo-audit --version ${tools.cargoAudit} --locked.`
		);
		assertToolVersion(
			'cargo-audit',
			audit.split(' ')[1],
			tools.cargoAudit,
			`Instale cargo-audit ${tools.cargoAudit}.`
		);
		for (const [command, args] of Object.entries(tools.nativeCommands))
			await required(command, args, `Instale ${command} e consulte docs/build-targets.md.`);
		for (const [library, systemPackage] of Object.entries(tools.pkgConfig))
			await required(
				'pkg-config',
				['--exists', library],
				`Biblioteca ${library} ausente. Instale ${systemPackage}.`
			);
		versions.rust = rust;
		versions.cargo = cargo;
		versions.cargoAudit = audit;
	}
	return { schemaVersion: 1, status: 'passed', target, versions, locks, commands };
}
