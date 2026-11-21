import { assertTapReport } from '../../checks/tap-lib.mjs';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import {
	parseRequest,
	validateManifest,
	assertProcess,
	runProcess,
	snapshot,
	assertStable,
	assertEvidence,
	assertPredecessor,
	hash,
	bootstrapChecks,
	contractsHash
} from '../lib.mjs';

const manifest = JSON.parse(
	readFileSync('docs/plans/etapa-2-base-tecnica-e-ambiente/contracts/etapa-2.json', 'utf8')
);
const digest = 'a'.repeat(64);
test('hash dos contratos inclui o destino permanente e detecta sua alteração', () => {
	const root = mkdtempSync(path.join(tmpdir(), 'notfeed-contract-hash-'));
	try {
		const file = path.join(root, 'tooling/checks/contracts/project.json');
		mkdirSync(path.dirname(file), { recursive: true });
		writeFileSync(file, '{"version":1}');
		const before = contractsHash(root);
		writeFileSync(file, '{"version":2}');
		assert.notEqual(contractsHash(root), before);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
function temporary(fn) {
	return async () => {
		const dir = mkdtempSync(path.join(tmpdir(), 'notfeed-maintenance-test-'));
		try {
			await fn(dir);
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	};
}
test('contrato recusa fase, unidade, flag e sequência desconhecidas', () => {
	assert.deepEqual(parseRequest(['2.1', '--unit', 'bootstrap'], manifest), {
		phase: '2.1',
		unit: 'bootstrap'
	});
	assert.deepEqual(parseRequest(['2.3'], manifest), { phase: '2.3', unit: null });
	for (const args of [
		[],
		['P6'],
		['2.1', '--skip', 'UNIT'],
		['2.1', '--unit'],
		['2.1', '--unit', 'other'],
		['2.1', '--unit', 'bootstrap', '--unit', 'bootstrap']
	])
		assert.throws(() => parseRequest(args, manifest));
	assert.doesNotThrow(() => validateManifest(manifest));
	for (const changed of [
		{ ...manifest, phaseOrder: ['2.2', ...manifest.phaseOrder.slice(1)] },
		{ ...manifest, allowSkippedRequiredChecks: true },
		{ ...manifest, gateSuccessExitCode: 1 }
	])
		assert.throws(() => validateManifest(changed));
});
test('lista bootstrap fixa e não vazia inclui contratos, árbitro e DIFF', () => {
	const checks = bootstrapChecks(process.execPath);
	assert.deepEqual(
		checks.map((check) => check.id),
		['CONTRACT-TEST', 'ARBITER', 'CONTRACT', 'DIFF']
	);
	assert.ok(
		checks.every((check) => check.command && Array.isArray(check.args) && check.args.length)
	);
});
test(
	'processo falho, sinal, timeout, ferramenta ausente e recibo parcial reprovam',
	temporary(async (dir) => {
		const options = { cwd: dir, log: path.join(dir, 'process.log'), timeoutMs: 3000 };
		for (const [command, args, extra] of [
			[process.execPath, ['-e', 'process.exit(7)'], {}],
			[process.execPath, ['-e', 'process.kill(process.pid, "SIGTERM")'], {}],
			[process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { timeoutMs: 50 }],
			['notfeed-command-that-does-not-exist', [], {}]
		]) {
			const result = await runProcess(command, args, { ...options, ...extra });
			assert.throws(() => assertProcess(result));
			assert.ok(readFileSync(options.log).length > 0);
		}
		assert.throws(() => assertProcess({ exitCode: 0 }));
		const ok = await runProcess(process.execPath, ['-e', 'console.log("executed")'], options);
		assert.doesNotThrow(() => assertProcess(ok));
		assert.equal(ok.logHash, hash(readFileSync(options.log)));
		assert.match(readFileSync(ok.stdoutPath, 'utf8'), /executed/);
	})
);
test(
	'snapshot cobre arquivos novos e recusa mutação, mas ignora gerados e state',
	temporary(async (dir) => {
		writeFileSync(path.join(dir, 'source.ts'), 'export const n = 1;');
		const before = snapshot(dir);
		writeFileSync(path.join(dir, 'new.ts'), 'export const n = 2;');
		assert.throws(() => assertStable(before, snapshot(dir)));
		rmSync(path.join(dir, 'new.ts'));
		writeFileSync(path.join(dir, 'source.ts'), 'export const n = 3;');
		assert.throws(() => assertStable(before, snapshot(dir)));
	})
);
test(
	'recibo exige execução atual, contratos/fontes, logs, todos os checks e zero skips',
	temporary(async (dir) => {
		const log = path.join(dir, 'ok.log');
		const result = await runProcess(process.execPath, ['-e', 'console.log("ok")'], {
			cwd: dir,
			log,
			timeoutMs: 3000
		});
		const receipt = {
			schemaVersion: 1,
			phase: '2.1',
			unit: 'bootstrap',
			status: 'passed',
			profile: 'Bootstrap',
			revision: 'b'.repeat(40),
			inputHash: digest,
			finalHash: digest,
			contractsHash: digest,
			startedAt: result.startedAt,
			endedAt: result.endedAt,
			versions: { node: process.versions.node },
			expectedChecks: ['TEST'],
			commands: [{ ...result, id: 'TEST' }],
			reports: [],
			skipped: []
		};
		const expected = {
			phase: '2.1',
			unit: 'bootstrap',
			inputHash: digest,
			contractsHash: digest,
			checks: ['TEST']
		};
		assert.doesNotThrow(() => assertEvidence(receipt, expected));
		for (const bad of [
			{ ...receipt, commands: [] },
			{ ...receipt, status: 'failed' },
			{ ...receipt, finalHash: 'c'.repeat(64) },
			{ ...receipt, skipped: ['TEST'] },
			{ ...receipt, reports: [{ path: '/nonexistent/report.json', hash: digest }] },
			{ ...receipt, contractsHash: 'c'.repeat(64) },
			{ ...receipt, inputHash: 'c'.repeat(64) },
			{ ...receipt, commands: [{ ...result, id: 'TEST', exitCode: 2 }] }
		])
			assert.throws(() => assertEvidence(bad, expected));
		writeFileSync(log, 'changed');
		assert.throws(() => assertEvidence(receipt, expected));
	})
);
test('fase dependente requer recibo completo; predecessor não precisa hash da árvore futura', () => {
	assert.doesNotThrow(() => assertPredecessor('2.1', null, manifest));
	assert.throws(() => assertPredecessor('2.2', null, manifest));
	assert.throws(() =>
		assertPredecessor('2.2', { phase: '2.1', status: 'passed', commands: [] }, manifest)
	);
});
test('relatório Node exige casos reais e zero falhas, skips, cancelamentos ou todo', () => {
	const tap =
		'# Subtest: expected\nok 1 - expected\n# tests 1\n# pass 1\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0\n';
	assert.doesNotThrow(() => assertTapReport(tap, ['expected']));
	for (const invalid of [
		'',
		tap.replace('# skipped 0', '# skipped 1'),
		tap.replace('# tests 1', '# tests 0'),
		tap.replace('# Subtest: expected', '# Subtest: other')
	])
		assert.throws(() => assertTapReport(invalid, ['expected']));
});
