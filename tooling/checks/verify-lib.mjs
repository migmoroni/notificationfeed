import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdirSync, writeFileSync, statSync, readFileSync } from 'node:fs';
import { execute, readJSON, hash } from './io.mjs';
import { assertUnitReport } from './unit-lib.mjs';

export function assertTypeReport(output) {
	const reports = [...output.matchAll(/found (\d+) errors and (\d+) warnings/g)];
	assert.ok(reports.length, 'Relatório de tipos ausente.');
	for (const report of reports) {
		assert.equal(Number(report[1]), 0, 'Erros de tipo.');
		assert.equal(Number(report[2]), 0, 'Avisos de tipo.');
	}
}
export function assertBrowserReport(report, count) {
	assert.equal(report.stats.expected, count);
	for (const field of ['unexpected', 'skipped', 'flaky'])
		assert.equal(report.stats[field], 0, field);
	assert.deepEqual(report.errors, []);
}
export async function runSteps(
	steps,
	{ cwd = process.cwd(), directory, executor = execute, env = {}, records = [] } = {}
) {
	const commands = records;
	for (const step of steps) {
		const args = [...step.args];
		const unitFile = directory && path.join(directory, 'unit.json');
		if (step.unitReport) {
			assert.ok(unitFile, 'Relatório unitário exige diretório próprio.');
			args.push('--reporter=json', `--outputFile=${unitFile}`);
		}
		if (directory) console.error(`Executando ${step.id}`);
		const startedAt = Date.now();
		let result;
		try {
			result = await executor(step.command === 'node' ? process.execPath : step.command, args, {
				cwd,
				env,
				timeoutMs: 1800000
			});
		} catch (error) {
			commands.push({
				id: step.id,
				command: step.command,
				args,
				status: 'failed',
				error: error.message
			});
			if (directory) writeFileSync(path.join(directory, `${step.id}.failure`), error.message);
			throw error;
		}
		assert.equal(result.code, 0);
		assert.equal(result.signal, null);
		assert.equal(result.timedOut, false);
		assert.equal(result.error, null);
		if (directory) {
			mkdirSync(directory, { recursive: true });
			writeFileSync(path.join(directory, `${step.id}.stdout`), result.stdout);
			writeFileSync(path.join(directory, `${step.id}.stderr`), result.stderr);
		}
		const reports = [];
		const record = { id: step.id, ...result, reports };
		commands.push(record);
		if (step.typeReport) assertTypeReport(result.stdout);
		const fresh = (file) =>
			assert.ok(statSync(file).mtimeMs >= startedAt, `relatório anterior ao comando: ${file}`);
		if (step.unitReport) {
			const contract = readJSON(path.join(cwd, 'tooling/checks/contracts/unit.json'));
			fresh(unitFile);
			assertUnitReport(readJSON(unitFile), contract.required, cwd, {
				allowAdditional: contract.allowAdditional
			});
			reports.push({ path: unitFile, hash: hash(readFileSync(unitFile)) });
		}
		if (step.browserReport) {
			const file = path.resolve(cwd, step.browserReport);
			fresh(file);
			assertBrowserReport(readJSON(file), step.browserCount);
			reports.push({ path: file, hash: hash(readFileSync(file)) });
		}
		if (step.jsonReceipt) {
			const pointer = JSON.parse(result.stdout.trim());
			fresh(pointer.evidence);
			const report = readJSON(pointer.evidence);
			assert.equal(report.status, 'passed');
			reports.push({ path: pointer.evidence, hash: hash(readFileSync(pointer.evidence)) });
		}
	}
	return commands;
}
