import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
	appendFileSync,
	closeSync,
	existsSync,
	lstatSync,
	mkdirSync,
	openSync,
	readFileSync,
	readdirSync,
	readlinkSync,
	writeFileSync
} from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';

export const plan = 'docs/plans/etapa-2-base-tecnica-e-ambiente';
export const hash = (value) => createHash('sha256').update(value).digest('hex');
export const readJSON = (file) => JSON.parse(readFileSync(file, 'utf8'));
export function writeJSON(file, value) {
	mkdirSync(path.dirname(file), { recursive: true });
	writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}
export function validateManifest(manifest) {
	assert.equal(manifest.schemaVersion, 1);
	assert.deepEqual(manifest.phaseOrder, ['2.1', '2.2', '2.3', '2.4', '2.5', '2.6', '2.7']);
	manifest.phaseOrder.forEach((phase, index) =>
		assert.equal(manifest.phasePredecessors[phase], manifest.phaseOrder[index - 1] ?? null)
	);
	assert.equal(manifest.gateSuccessExitCode, 0);
	for (const key of [
		'allowSkippedRequiredChecks',
		'allowFailedBaselineTests',
		'allowRelaxedRulesToPass',
		'allowNewBusinessModules',
		'allowCompatibilityWrappers'
	])
		assert.equal(manifest[key], false, key);
	assert.deepEqual(manifest.fixedUnits['2.1'], ['bootstrap', 'diagnosis']);
	assert.deepEqual(manifest.requireRealCiAtPhaseClose, ['2.6', '2.7']);
	assert.equal(manifest.protected.databaseVersion, 18);
	assert.equal(manifest.protected.strictTypeScript, true);
	assert.equal(manifest.protected.checkJs, true);
}
export function parseRequest(args, manifest, registered = {}) {
	validateManifest(manifest);
	assert.ok(
		args.length === 1 || (args.length === 3 && args[1] === '--unit'),
		'uso: <fase> [--unit <unidade>]'
	);
	const phase = args[0],
		unit = args[2] ?? null;
	assert.ok(manifest.phaseOrder.includes(phase), `fase desconhecida: ${phase}`);
	if (unit !== null)
		assert.ok(
			[...(manifest.fixedUnits[phase] ?? []), ...(registered[phase] ?? [])].includes(unit),
			`unidade não registrada: ${phase}/${unit}`
		);
	return { phase, unit };
}
const generated = new Set([
	'.git',
	'.artifacts',
	'node_modules',
	'.svelte-kit',
	'build',
	'target',
	'gen',
	'.output',
	'.vercel',
	'.netlify',
	'.wrangler'
]);
export function filesUnder(root, relative = '') {
	return readdirSync(path.join(root, relative), { withFileTypes: true })
		.flatMap((entry) => {
			const file = path.posix.join(relative, entry.name);
			if (
				generated.has(entry.name) ||
				file === `${plan}/state.md` ||
				(/^\.env(?:\.|$)/.test(entry.name) && !['.env.example', '.env.test'].includes(entry.name))
			)
				return [];
			return entry.isDirectory() ? filesUnder(root, file) : [file];
		})
		.sort();
}
export function snapshot(root) {
	const files = filesUnder(root).map((file) => ({
		path: file,
		sha256: hash(
			lstatSync(path.join(root, file)).isSymbolicLink()
				? `symlink:${readlinkSync(path.join(root, file))}`
				: readFileSync(path.join(root, file))
		)
	}));
	return { hash: hash(JSON.stringify(files)), files };
}
export function assertStable(before, after) {
	assert.equal(after.hash, before.hash, 'fontes/contratos/locks alterados durante o gate');
	assert.deepEqual(after.files, before.files);
}
export function contractsHash(root) {
	const files = filesUnder(root).filter(
		(file) =>
			file.startsWith(`${plan}/contracts/`) ||
			file.startsWith('tooling/maintenance/contracts/') ||
			file.startsWith('tooling/checks/contracts/')
	);
	assert.ok(files.length);
	return hash(
		JSON.stringify(files.map((file) => [file, hash(readFileSync(path.join(root, file)))]))
	);
}
export function assertProcess(result) {
	assert.equal(result.exitCode, 0, `processo falhou: ${result.command}`);
	assert.equal(result.signal, null);
	assert.equal(result.timedOut, false);
	assert.equal(result.error, null);
	assert.ok(
		Number.isFinite(Date.parse(result.startedAt)) && Number.isFinite(Date.parse(result.endedAt))
	);
	assert.ok(Date.parse(result.endedAt) >= Date.parse(result.startedAt));
	assert.ok(result.command && Array.isArray(result.args) && path.isAbsolute(result.cwd));
	assert.match(result.logHash, /^[a-f0-9]{64}$/);
	assert.equal(hash(readFileSync(result.log)), result.logHash, 'log ausente ou alterado');
	assert.equal(
		hash(readFileSync(result.stdoutPath)),
		result.stdoutHash,
		'stdout ausente ou alterado'
	);
	assert.equal(
		hash(readFileSync(result.stderrPath)),
		result.stderrHash,
		'stderr ausente ou alterado'
	);
}
export async function runProcess(
	command,
	args,
	{ cwd = process.cwd(), log, timeoutMs = 120000, env = {}, stdoutPath = null, stderrPath = null }
) {
	assert.ok(path.isAbsolute(log), 'log deve ser absoluto');
	assert.ok(Number.isFinite(timeoutMs) && timeoutMs > 0);
	mkdirSync(path.dirname(log), { recursive: true });
	const startedAt = new Date().toISOString();
	writeFileSync(log, `${JSON.stringify({ command, args, cwd, startedAt })}\n`);
	stdoutPath ??= `${log}.stdout`;
	stderrPath ??= `${log}.stderr`;
	const stdoutFd = openSync(stdoutPath, 'w'),
		stderrFd = openSync(stderrPath, 'w');
	return await new Promise((resolve) => {
		let timedOut = false,
			error = null,
			escalation;
		const child = spawn(command, args, {
			cwd,
			env: { ...process.env, ...env },
			detached: true,
			stdio: ['ignore', stdoutFd, stderrFd]
		});
		child.on('error', (failure) => {
			error = failure.message;
			appendFileSync(log, `${error}\n`);
		});
		function kill(signal) {
			if (!child.pid) return;
			try {
				process.kill(-child.pid, signal);
			} catch (failure) {
				if (failure.code !== 'ESRCH') {
					error = failure.message;
					appendFileSync(log, `${error}\n`);
				}
			}
		}
		const timer = setTimeout(() => {
			timedOut = true;
			kill('SIGTERM');
			escalation = setTimeout(() => kill('SIGKILL'), 1000);
		}, timeoutMs);
		child.on('close', (exitCode, signal) => {
			clearTimeout(timer);
			clearTimeout(escalation);
			closeSync(stdoutFd);
			closeSync(stderrFd);
			const stdout = readFileSync(stdoutPath),
				stderr = readFileSync(stderrPath);
			appendFileSync(log, stdout);
			appendFileSync(log, stderr);
			const endedAt = new Date().toISOString();
			appendFileSync(log, `${JSON.stringify({ exitCode, signal, timedOut, error, endedAt })}\n`);
			resolve({
				command,
				args,
				cwd: path.resolve(cwd),
				startedAt,
				endedAt,
				exitCode,
				signal,
				timedOut,
				error,
				timeoutMs,
				log,
				logHash: hash(readFileSync(log)),
				stdoutPath,
				stderrPath,
				stdoutHash: hash(stdout),
				stderrHash: hash(stderr)
			});
		});
	});
}
export function assertEvidence(receipt, expected) {
	assert.equal(receipt.schemaVersion, 1);
	assert.equal(receipt.status, 'passed');
	assert.match(receipt.revision, /^[a-f0-9]{40}$/);
	assert.ok(receipt.profile && receipt.versions?.node);
	assert.ok(
		Number.isFinite(Date.parse(receipt.startedAt)) && Number.isFinite(Date.parse(receipt.endedAt))
	);
	assert.ok(Date.parse(receipt.endedAt) >= Date.parse(receipt.startedAt));
	for (const key of ['phase', 'unit', 'inputHash', 'contractsHash'])
		assert.equal(receipt[key], expected[key], key);
	for (const key of ['inputHash', 'contractsHash']) assert.match(receipt[key], /^[a-f0-9]{64}$/);
	assert.equal(receipt.finalHash, receipt.inputHash);
	assert.deepEqual(receipt.skipped, []);
	assert.ok(expected.checks.length > 0);
	assert.deepEqual(receipt.expectedChecks, expected.checks);
	assert.deepEqual(
		receipt.commands.map((command) => command.id),
		expected.checks
	);
	for (const command of receipt.commands) {
		assertProcess(command);
		assert.ok(Date.parse(command.startedAt) >= Date.parse(receipt.startedAt));
		assert.ok(Date.parse(command.endedAt) <= Date.parse(receipt.endedAt));
	}
	assert.ok(Array.isArray(receipt.reports));
	for (const report of receipt.reports) assert.equal(hash(readFileSync(report.path)), report.hash);
}
export function assertPredecessor(phase, receipt, manifest) {
	const predecessor = manifest.phasePredecessors[phase];
	if (predecessor === null) return;
	assert.ok(receipt, `${predecessor}: gate final não aprovado`);
	assert.equal(receipt.phase, predecessor);
	assert.equal(receipt.unit, null);
	assertEvidence(receipt, {
		phase: predecessor,
		unit: null,
		inputHash: receipt.inputHash,
		contractsHash: receipt.contractsHash,
		checks: receipt.expectedChecks
	});
}

export function bootstrapChecks(node) {
	return [
		{
			id: 'CONTRACT-TEST',
			command: node,
			args: [
				'--test',
				'--test-reporter=tap',
				'--experimental-test-isolation=none',
				'tooling/maintenance/tests/contracts.test.mjs'
			],
			expectedTests: ['manifesto preserva sequência, fronteiras e política de aprovação']
		},
		{
			id: 'ARBITER',
			command: node,
			args: [
				'--test',
				'--test-reporter=tap',
				'--experimental-test-isolation=none',
				'tooling/maintenance/tests/arbiter.test.mjs'
			],
			expectedTests: [
				'contrato recusa fase, unidade, flag e sequência desconhecidas',
				'lista bootstrap fixa e não vazia inclui contratos, árbitro e DIFF',
				'processo falho, sinal, timeout, ferramenta ausente e recibo parcial reprovam',
				'snapshot cobre arquivos novos e recusa mutação, mas ignora gerados e state',
				'recibo exige execução atual, contratos/fontes, logs, todos os checks e zero skips',
				'fase dependente requer recibo completo; predecessor não precisa hash da árvore futura',
				'relatório Node exige casos reais e zero falhas, skips, cancelamentos ou todo'
			]
		},
		{
			id: 'CONTRACT',
			command: node,
			args: ['tooling/maintenance/check.mjs', '--phase', '2.1', '--unit', 'bootstrap']
		},
		{ id: 'DIFF', command: 'git', args: ['diff', '--check'] }
	];
}
