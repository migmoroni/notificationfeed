import assert from 'node:assert/strict';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import {
	copyFileSync,
	cpSync,
	rmSync,
	existsSync,
	mkdirSync,
	readFileSync,
	writeFileSync
} from 'node:fs';
import { execute, filesUnder, hash, readJSON, writeJSON } from './io.mjs';
import { ciFingerprint, assertCIProof, assertPreparedSetup } from './ci-lib.mjs';
import { inspectProvision, provisionContract } from './provision-lib.mjs';
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
} else if (command === 'prove' && args.length === 2 && args[1] === 'web') {
	const { artifactRoot, artifactScope, candidateCleanup, pruneArtifactPayloads } =
		await import('./artifacts-lib.mjs');
	const { prepareProvisionCandidate } = await import('./provision-probe.mjs');
	const { provisionEnvironment } = await import('./provision-lib.mjs');
	const { verifyProofFiles } = await import('./ci-live.mjs');
	const area = path.resolve('.artifacts/ci/probes', randomUUID());
	mkdirSync(area, { recursive: true });
	const before = ciFingerprint();
	let context, proofFile, cleanup;
	const evidence = path.join(area, 'evidence.json');
	try {
		await artifactScope(
			artifactRoot(),
			area,
			async () => {
				context = await prepareProvisionCandidate(process.cwd(), area, { target: 'ci' });
				const result = await execute(
					context.mise,
					['exec', '--', 'node', 'tooling/checks/ci.mjs', 'run', 'web'],
					{
						cwd: context.candidate,
						env: {
							...provisionEnvironment(context),
							GITHUB_EVENT_NAME: 'local',
							GITHUB_EVENT_PATH: undefined,
							GITHUB_RUN_ID: undefined,
							GITHUB_RUN_ATTEMPT: undefined
						},
						timeoutMs: 1800000
					}
				);
				writeJSON(path.join(area, 'run.json'), result);
				proofFile = JSON.parse(result.stdout).evidence;
				const proof = readJSON(proofFile);
				assertCIProof(proof);
				assert.equal(proof.inputHash, before.inputHash);
				assert.equal(proof.provision.dependenciesInitiallyAbsent, true);
				assert.equal(
					existsSync(context.env.PLAYWRIGHT_BROWSERS_PATH),
					false,
					'Minimum CI installed Chromium.'
				);
				verifyProofFiles(path.dirname(proofFile), proof);
				for (const [file, digest] of Object.entries(context.personalBefore))
					assert.equal(existsSync(file) ? hash(readFileSync(file)) : null, digest, file);
				assert.equal(ciFingerprint().inputHash, before.inputHash);
			},
			() => {
				const removed = context
					? [
							...candidateCleanup(artifactRoot(), context.area),
							...pruneArtifactPayloads(
								artifactRoot(),
								context.area,
								provisionContract().directories.temporaryPayloads
							)
						]
					: [];
				cleanup = { status: 'passed', removed };
				return removed;
			}
		);
		writeJSON(evidence, {
			schemaVersion: 1,
			status: 'passed',
			scope: contract.scope,
			inputHash: before.inputHash,
			contractsHash: before.contractsHash,
			proof: proofFile,
			proofSha256: hash(readFileSync(proofFile)),
			cleanup
		});
	} catch (error) {
		writeJSON(evidence, {
			schemaVersion: 1,
			status: 'failed',
			scope: contract.scope,
			error: error.message,
			cleanup
		});
		throw error;
	}
	console.log(JSON.stringify({ evidence }));
} else if (command === 'run' && args.length === 2 && args[1] === 'web') {
	const job = args[1],
		directory = path.resolve('.artifacts/ci', job, 'runs', randomUUID()),
		artifact = path.join(directory, 'artifact');
	mkdirSync(artifact, { recursive: true });
	const fingerprint = ciFingerprint(),
		info = await identity();
	assert.equal(fingerprint.locks.length, 2 + provisionContract().lockFiles.length);
	const receipt = {
		schemaVersion: 1,
		status: 'running',
		scope: contract.scope,
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
	const preparationFiles = [];
	try {
		const current = await inspectProvision();
		const setups = filesUnder(path.resolve('.artifacts/setup'))
			.filter((file) => path.basename(file) === 'evidence.json')
			.map((file) => ({ file, value: readJSON(file) }))
			.filter(
				({ value }) =>
					value.target === contract.provisioning.setupTargets[job] &&
					value.inputHash === fingerprint.inputHash
			)
			.sort((a, b) => Date.parse(b.value.finishedAt) - Date.parse(a.value.finishedAt));
		assert.ok(setups.length, 'Setup atual ausente: execute ' + contract.provisioning.setups[job]);
		const prepared = setups[0],
			remote = info.event !== 'local';
		assertPreparedSetup(prepared.value, {
			target: contract.provisioning.setupTargets[job],
			inputHash: fingerprint.inputHash,
			locks: fingerprint.locks,
			remote
		});
		preparationFiles.push(prepared.file);
		receipt.provision = {
			environment: current.environment,
			versions: current.versions,
			executables: current.executables,
			dependenciesInitiallyAbsent: prepared.value.initial.dependenciesAbsent,
			setupSha256: hash(readFileSync(prepared.file)),
			setupPath: path.join('reports', path.relative(path.resolve('.artifacts'), prepared.file)),
			bootstrapSha256: null,
			bootstrapPath: null,
			markerPath: null
		};
		if (remote) {
			const bootstrap = path.resolve(contract.provisioning.bootstrapReceipt);
			const proof = readJSON(bootstrap);
			assert.equal(proof.status, 'passed');
			assert.deepEqual(proof.versions, current.versions);
			assert.deepEqual(proof.environment, current.environment);
			assert.equal(
				readFileSync(contract.provisioning.freshDataMarker, 'utf8').trim(),
				process.env.MISE_DATA_DIR
			);
			receipt.provision.bootstrapSha256 = hash(readFileSync(bootstrap));
			receipt.provision.bootstrapPath = path.join(
				'reports',
				path.relative(path.resolve('.artifacts'), bootstrap)
			);
			receipt.provision.markerPath = path.join(
				'reports',
				path.relative(
					path.resolve('.artifacts'),
					path.resolve(contract.provisioning.freshDataMarker)
				)
			);
			preparationFiles.push(bootstrap, path.resolve(contract.provisioning.freshDataMarker));
		}
		await runSteps(contract.checks, { directory, records: receipt.commands });
		const { expectedNodeTests } = await import('./source-lib.mjs');
		receipt.tooling = assertTapReport(
			receipt.commands.find((item) => item.id === 'CI-TOOLING').stdout,
			expectedNodeTests(contract.toolingTests)
		);
		assert.equal(
			ciFingerprint().inputHash,
			fingerprint.inputHash,
			'CI alterou fontes/contratos/locks'
		);
		receipt.versions = current.versions;
		receipt.status = 'passed';
		assertCIProof(receipt);
	} catch (error) {
		receipt.status = 'failed';
		receipt.error = error.message;
		throw error;
	} finally {
		const candidates = [
			...preparationFiles,
			...filesUnder(directory).filter(
				(file) =>
					!file.startsWith(`${artifact}${path.sep}`) &&
					/\.(?:json|stdout|stderr|failure)$/.test(file)
			)
		];
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
} else throw new Error('uso: ci.mjs check|prove web|run web');
