import assert from 'node:assert/strict';
import { filesUnder, bootstrapChecks, readJSON } from './lib.mjs';
import { expectedNodeTests } from '../checks/source-lib.mjs';

export function phaseChecks(phase, unit, node) {
	assert.ok(
		['2.1', '2.2', '2.3', '2.4', '2.5', '2.6'].includes(phase),
		'fase ainda não adotada no executor'
	);
	if (phase === '2.6') assert.ok([null, 'configuration', 'execution'].includes(unit));
	if (phase === '2.1' && unit === 'bootstrap') return bootstrapChecks(node);
	const groups = readJSON('tooling/maintenance/contracts/updates.json').groups;
	const environment = readJSON('tooling/maintenance/contracts/environment-units.json');
	assert.ok(
		unit === null ||
			(phase === '2.1' && unit === 'diagnosis') ||
			(phase === '2.5' && environment.order.includes(unit)) ||
			(phase === '2.6' && ['configuration', 'execution'].includes(unit)) ||
			groups.some((group) => group.phase === phase && group.id === unit)
	);
	const active = (name) =>
		Number(phase) > 2.5 ||
		(phase === '2.5' &&
			(unit === null || environment.order.indexOf(unit) >= environment.order.indexOf(name)));
	const script = (id, file, args = [], extra = {}) => ({
		id,
		command: node,
		args: [file, ...args],
		...extra
	});
	const manager = Number(phase) >= 2.3 ? 'pnpm' : 'npm';
	const npm = (id, name, args = [], extra = {}) => ({
		id,
		command: manager,
		args: ['run', name, ...args],
		...extra
	});
	const nodeTests = (id, directory) => {
		const files = filesUnder(process.cwd(), directory).filter((file) => file.endsWith('.test.mjs'));
		assert.ok(files.length);
		return {
			id,
			command: node,
			args: ['--test', '--test-reporter=tap', '--experimental-test-isolation=none', ...files],
			expectedTests: expectedNodeTests(files)
		};
	};
	if (phase === '2.6' && unit === 'configuration')
		return [
			script('CONTRACT', 'tooling/maintenance/check.mjs', ['--phase', phase, '--unit', unit]),
			script('CI-CONFIG', 'tooling/checks/ci.mjs', ['check']),
			nodeTests('ARBITER', 'tooling/maintenance/tests'),
			nodeTests('TOOLING', 'tooling/checks/tests'),
			script('CI-PROVE', 'tooling/checks/ci.mjs', ['prove', 'web'], {
				timeoutMs: 1800000,
				jsonReceipt: true
			}),
			{ id: 'DIFF', command: 'git', args: ['diff', '--check'] }
		];

	const checks = [
		script('INSTALL', 'tooling/maintenance/install.mjs', [], {
			installsCandidate: true,
			timeoutMs: 900000
		}),
		...(active('provision')
			? [
					script('PROVISION', 'tooling/checks/provision.mjs', ['prove', '--target', 'desktop'], {
						timeoutMs: 3600000,
						jsonReceipt: true
					})
				]
			: []),
		script('CONTRACT', 'tooling/maintenance/check.mjs', [
			'--phase',
			phase,
			...(unit ? ['--unit', unit] : [])
		]),
		...(phase === '2.6' ? [script('CI-CONFIG', 'tooling/checks/ci.mjs', ['check'])] : []),
		nodeTests('ARBITER', 'tooling/maintenance/tests'),
		nodeTests('TOOLING', 'tooling/checks/tests'),
		...(active('checks')
			? [
					npm('ARCHITECTURE', 'check:architecture'),
					npm('RESTRICTIONS', 'check:restrictions'),
					npm('PERMANENT-CONTRACTS', 'check:contracts')
				]
			: []),
		npm('TYPES', 'check'),
		npm('E2E-TYPES', 'check:e2e'),
		...(active('lint')
			? [
					npm('LINT', 'lint'),
					{
						id: 'CLIPPY',
						command: 'cargo',
						args: [
							'clippy',
							'--locked',
							'--manifest-path',
							'apps/desktop/src-tauri/Cargo.toml',
							'--all-targets',
							'--',
							'-D',
							'warnings'
						],
						timeoutMs: 1200000
					}
				]
			: []),
		...(active('format')
			? [
					npm('FORMAT', 'format:check'),
					{
						id: 'RUST-FMT',
						command: 'cargo',
						args: ['fmt', '--manifest-path', 'apps/desktop/src-tauri/Cargo.toml', '--', '--check']
					}
				]
			: []),
		...(active('dev')
			? [
					script('DEV-ENV', 'tooling/checks/dev-env.mjs', [], {
						timeoutMs: 240000,
						jsonReceipt: true
					})
				]
			: []),
		...(active('doctor')
			? [
					npm('DOCTOR-WEB', 'doctor', ['--target', 'web']),
					npm('DOCTOR-DESKTOP', 'doctor', ['--target', 'desktop'])
				]
			: []),
		npm(
			'UNIT',
			'test:run',
			[
				...(manager === 'npm' ? ['--'] : []),
				'--reporter=json',
				'--outputFile=../../.artifacts/unit.json'
			],
			{ unitReport: '.artifacts/unit.json' }
		),
		script(
			'SECURITY',
			'tooling/maintenance/security.mjs',
			['--phase', phase, ...(phase !== '2.1' && unit ? ['--unit', unit] : [])],
			{ timeoutMs: 900000, jsonReceipt: true }
		),
		{
			id: 'CARGO-CHECK',
			command: 'cargo',
			args: ['check', '--locked', '--manifest-path', 'apps/desktop/src-tauri/Cargo.toml'],
			timeoutMs: 1200000
		},
		{
			id: 'CARGO-TEST',
			command: 'cargo',
			args: ['test', '--locked', '--manifest-path', 'apps/desktop/src-tauri/Cargo.toml'],
			timeoutMs: 1200000
		},
		npm('BUNDLE-BUILD', 'tauri:appimage', [], { timeoutMs: 1800000 }),
		script('BUNDLE-INSPECT', 'tooling/checks/bundle.mjs', [], {
			timeoutMs: 240000,
			jsonReceipt: true
		}),
		npm('BROWSER-DEV', 'test:e2e:dev', [], {
			browserReport: '.artifacts/e2e/dev-report.json',
			browserCount: 1
		}),
		npm('BROWSER', 'test:e2e', [], {
			browserReport: '.artifacts/e2e/report.json',
			browserCount: 3
		}),
		npm('UPGRADE', 'test:e2e:upgrade', [], {
			browserReport: '.artifacts/e2e/upgrade-report.json',
			browserCount: 3,
			timeoutMs: 900000
		}),
		...(phase === '2.6' && unit !== 'configuration'
			? [
					script(
						'CI-REMOTE',
						'tooling/maintenance/check-ci.mjs',
						[
							'--receipt',
							process.env.NOTFEED_CI_RECEIPT ?? `${process.cwd()}/.artifacts/ci/latest.json`
						],
						{ timeoutMs: 900000, jsonReceipt: true }
					)
				]
			: []),
		{ id: 'DIFF', command: 'git', args: ['diff', '--check'] }
	];
	const native = readJSON('tooling/checks/contracts/tools.json').nativeEnvironment;
	return checks.map((check) =>
		['CLIPPY', 'CARGO-CHECK', 'CARGO-TEST', 'BUNDLE-BUILD'].includes(check.id)
			? { ...check, env: native }
			: check
	);
}
