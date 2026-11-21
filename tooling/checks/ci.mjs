import assert from 'node:assert/strict';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import {
	appendFileSync,
	copyFileSync,
	cpSync,
	rmSync,
	existsSync,
	mkdirSync,
	readFileSync,
	statSync,
	writeFileSync
} from 'node:fs';
import { execute, filesUnder, hash, readJSON, writeJSON } from './io.mjs';
import { ciFingerprint, classifyImpact, assertCIJobs } from './ci-lib.mjs';
import { runSteps } from './verify-lib.mjs';
import { assertTapReport } from './tap-lib.mjs';

const args = process.argv.slice(2),
	command = args[0];
const contract = readJSON('tooling/checks/contracts/ci.json');
function eventData() {
	return process.env.GITHUB_EVENT_PATH ? readJSON(process.env.GITHUB_EVENT_PATH) : {};
}
async function identity() {
	const checkoutSha = (await execute('git', ['rev-parse', 'HEAD'])).stdout.trim();
	const event = eventData();
	return {
		checkoutSha,
		headSha: event.pull_request?.head.sha ?? checkoutSha,
		baseSha: event.pull_request?.base.sha ?? null,
		event: process.env.GITHUB_EVENT_NAME ?? 'local',
		runId: Number(process.env.GITHUB_RUN_ID ?? 0),
		attempt: Number(process.env.GITHUB_RUN_ATTEMPT ?? 0)
	};
}
if (command === 'check') {
	assert.equal(args.length, 1);
	const { readWorkflow, assertWorkflow } = await import('./ci-workflow.mjs');
	assertWorkflow(await readWorkflow(contract.workflow), contract);
	console.log('Contrato e YAML da CI aprovados.');
} else if (command === 'impact') {
	assert.equal(args.length, 1);
	const event = eventData(),
		info = await identity();
	const base = event.pull_request?.base.sha ?? event.before;
	let files = [],
		historyAvailable =
			typeof base === 'string' && /^[a-f0-9]{40}$/.test(base) && !/^0+$/.test(base);
	if (historyAvailable) {
		try {
			files = (await execute('git', ['diff', '--name-only', '-z', base, info.checkoutSha])).stdout
				.split('\0')
				.filter(Boolean);
		} catch {
			historyAvailable = false;
		}
	}
	const forceFull =
		event.inputs?.full === true ||
		event.inputs?.full === 'true' ||
		Boolean(event.pull_request?.body?.includes(contract.fullRequestMarker));
	const impact = classifyImpact(files, { historyAvailable, forceFull });
	for (const file of files.filter(
		(file) => /\.md$/i.test(file) && existsSync(file) && !file.startsWith('docs/plans/etapa-1-')
	)) {
		const text = readFileSync(file, 'utf8').replace(/```[\s\S]*?```/g, '');
		for (const match of text.matchAll(/\[[^\]]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)) {
			const href = match[1].replace(/^<|>$/g, '');
			if (/^(?:[a-z][a-z0-9+.-]*:|#|\/)/i.test(href)) continue;
			const target = decodeURIComponent(href.split('#')[0]);
			if (target)
				assert.ok(
					existsSync(path.resolve(path.dirname(file), target)),
					`link local ausente: ${file} -> ${href}`
				);
		}
	}
	await execute('git', ['diff', '--check']);
	if (process.env.GITHUB_OUTPUT)
		appendFileSync(process.env.GITHUB_OUTPUT, `profile=${impact.profile}\n`);
	writeJSON('.artifacts/ci/impact.json', {
		...impact,
		...info,
		...ciFingerprint(),
		status: 'passed'
	});
	console.log(JSON.stringify(impact));
} else if (command === 'aggregate') {
	assert.equal(args.length, 1);
	const needs = JSON.parse(process.env.NEEDS_JSON ?? 'null');
	assert.ok(needs);
	assertCIJobs(needs, needs.impact?.outputs?.profile);
	console.log('Jobs obrigatórios aprovados.');
} else if (command === 'run') {
	assert.ok(args.length === 2 && ['web', 'desktop'].includes(args[1]));
	const startedAt = Date.now();
	const job = args[1],
		directory = path.resolve('.artifacts/ci', job, 'runs', randomUUID()),
		artifact = path.join(directory, 'artifact');
	mkdirSync(artifact, { recursive: true });
	const fingerprint = ciFingerprint(),
		info = await identity();
	assert.equal(fingerprint.locks.length, 2);
	const receipt = {
		schemaVersion: 1,
		status: 'running',
		job,
		...info,
		inputHash: fingerprint.inputHash,
		contractsHash: fingerprint.contractsHash,
		locks: fingerprint.locks,
		commands: [],
		runner: {
			os: process.env.RUNNER_OS,
			arch: process.env.RUNNER_ARCH,
			image: process.env.ImageOS,
			version: process.env.ImageVersion
		}
	};
	try {
		const steps =
			job === 'web'
				? [
						{ id: 'QUICK', command: 'pnpm', args: ['verify:quick'], jsonReceipt: true },
						{ id: 'TOOLING', command: 'pnpm', args: ['test:tooling'] }
					]
				: [{ id: 'INTEGRATION', command: 'pnpm', args: ['verify:integration'], jsonReceipt: true }];
		await runSteps(steps, { directory, records: receipt.commands });
		if (job === 'web') {
			const { expectedNodeTests } = await import('./source-lib.mjs');
			const tests = filesUnder('tooling/checks/tests').filter((file) => file.endsWith('.test.mjs'));
			const output = receipt.commands.find((item) => item.id === 'TOOLING').stdout;
			receipt.tooling = assertTapReport(output, expectedNodeTests(tests));
		}
		assert.equal(
			ciFingerprint().inputHash,
			fingerprint.inputHash,
			'CI alterou fontes/contratos/locks'
		);
		const aggregate = readJSON(JSON.parse(receipt.commands[0].stdout).evidence);
		receipt.versions = JSON.parse(
			aggregate.commands.find((item) => item.id === 'DOCTOR').stdout
		).versions;
		receipt.status = 'passed';
	} catch (error) {
		receipt.status = 'failed';
		receipt.error = error.message;
		throw error;
	} finally {
		const candidates = ['checks', 'e2e', 'security', 'native']
			.flatMap((name) => filesUnder(path.resolve('.artifacts', name)))
			.filter((file) => {
				const relative = path.relative(path.resolve('.artifacts'), file);
				return (
					/^(?:checks\/|e2e\/results\/|e2e\/(?:report|dev-report|upgrade-report)\.json$|security\/current-[^/]+\/(?:evidence|collection)\.json$|native\/current-[^/]+\/evidence\.json$)/.test(
						relative
					) &&
					/\.(?:json|stdout|stderr|failure|zip|png)$/.test(file) &&
					statSync(file).mtimeMs >= startedAt
				);
			});
		const files = [];
		for (const file of candidates) {
			const relative = path.join('reports', path.relative(path.resolve('.artifacts'), file));
			const target = path.join(artifact, relative);
			mkdirSync(path.dirname(target), { recursive: true });
			copyFileSync(file, target);
			files.push({ path: relative, sha256: hash(readFileSync(target)) });
		}
		receipt.files = files;
		writeJSON(path.join(artifact, 'evidence.json'), receipt);
		const published = path.resolve('.artifacts/ci', job, 'artifact');
		rmSync(published, { recursive: true, force: true });
		cpSync(artifact, published, { recursive: true });
		console.log(JSON.stringify({ evidence: path.join(artifact, 'evidence.json') }));
	}
} else throw new Error('uso: ci.mjs check|impact|aggregate|run web|run desktop');
