import { artifactRoot, artifactScope, candidateCleanup } from '../checks/artifacts-lib.mjs';
import { assertTapReport } from '../checks/tap-lib.mjs';
import { assertBrowserReport, assertTypeReport } from '../checks/verify-lib.mjs';
import assert from 'node:assert/strict';
import path from 'node:path';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import {
	readJSON,
	writeJSON,
	plan,
	parseRequest,
	snapshot,
	assertStable,
	contractsHash,
	assertEvidence,
	assertProcess,
	runProcess,
	hash,
	assertPredecessor
} from './lib.mjs';
import { phaseChecks } from './phases.mjs';
import { assertUnitReport } from '../checks/unit-lib.mjs';
import { receiptChecks } from './receipt-lib.mjs';
import {
	assertProvisionReceipt,
	executablePath,
	provisionEnvironment
} from '../checks/provision-lib.mjs';
import { assertCIProof, ciFingerprint } from '../checks/ci-lib.mjs';
import { verifyProofFiles } from '../checks/ci-live.mjs';

const root = process.cwd();
const manifest = readJSON(`${plan}/contracts/etapa-2.json`);
const historical = readJSON('tooling/maintenance/contracts/historical-gates.json');
const groups = readJSON('tooling/maintenance/contracts/updates.json').groups;
const request = parseRequest(
	process.argv.slice(2),
	manifest,
	Object.fromEntries(
		['2.2', '2.4'].map((phase) => [
			phase,
			groups.filter((group) => group.phase === phase).map((group) => group.id)
		])
	)
);
const checks = phaseChecks(request.phase, request.unit, process.execPath);
const startedAt = new Date().toISOString();
const directory = path.resolve(
	manifest.evidenceRoot,
	request.phase,
	request.unit ?? 'final',
	`${startedAt.replaceAll(':', '-')}-${randomUUID()}`
);
mkdirSync(directory, { recursive: true });
let candidate = root,
	candidateEnv = {},
	provisionContext,
	finalReceipt;
try {
	finalReceipt = await artifactScope(
		artifactRoot(),
		directory,
		async () => {
			const revisionResult = await runProcess('git', ['rev-parse', 'HEAD'], {
				log: path.join(directory, 'revision.log')
			});
			assertProcess(revisionResult);
			const revision = readFileSync(revisionResult.stdoutPath, 'utf8').trim();
			assert.match(revision, /^[a-f0-9]{40}$/);
			const before = snapshot(root);
			const receipt = {
				schemaVersion: 1,
				...request,
				status: 'running',
				profile:
					request.unit === 'bootstrap'
						? 'Bootstrap'
						: request.phase === '2.6' && request.unit === 'configuration'
							? 'Web-CI-Configuration'
							: 'Complete',
				revision,
				inputHash: before.hash,
				contractsHash: contractsHash(root),
				startedAt,
				versions: { node: process.versions.node },
				expectedChecks: checks.map((check) => check.id),
				commands: [],
				reports: [],
				skipped: []
			};

			function report(file) {
				assert.ok(existsSync(file), `relatório ausente: ${file}`);
				assert.ok(
					statSync(file).mtimeMs >= Date.parse(startedAt),
					`relatório anterior à execução: ${file}`
				);
				receipt.reports.push({ path: file, hash: hash(readFileSync(file)) });
			}
			function unitReceipt(unit) {
				const pointer = readJSON(
					path.resolve(manifest.evidenceRoot, request.phase, unit, 'latest.json')
				);
				const previous = readJSON(pointer.evidence);
				assertEvidence(previous, {
					phase: request.phase,
					unit,
					inputHash: previous.inputHash,
					contractsHash: previous.contractsHash,
					checks: receiptChecks(
						previous,
						readFileSync(pointer.evidence, 'utf8'),
						phaseChecks(request.phase, unit, process.execPath).map((check) => check.id),
						historical,
						request.phase === '2.5' && unit !== 'provision'
					)
				});
				return previous;
			}
			try {
				const remote = checks.find((check) => check.id === 'CI-REMOTE');
				if (remote)
					assert.ok(
						existsSync(remote.args.at(-1)),
						'Execução exige recibo CI real; publique e valide o run antes deste gate.'
					);
				if (request.phase === '2.1' && request.unit === 'diagnosis') unitReceipt('bootstrap');
				if (request.phase === '2.1' && request.unit === null) {
					unitReceipt('bootstrap');
					const diagnosis = unitReceipt('diagnosis');
					assert.equal(
						diagnosis.inputHash,
						before.hash,
						'diagnóstico não representa as fontes atuais'
					);
					assert.equal(diagnosis.contractsHash, receipt.contractsHash);
				}
				if (request.phase !== '2.1') {
					const previousPhase = manifest.phasePredecessors[request.phase];
					const previousFile = readJSON(
						path.resolve(manifest.evidenceRoot, previousPhase, 'final/latest.json')
					).evidence;
					const previous = readJSON(previousFile);
					assertPredecessor(request.phase, previous, manifest);
					assertEvidence(previous, {
						phase: previousPhase,
						unit: null,
						inputHash: previous.inputHash,
						contractsHash: previous.contractsHash,
						checks: receiptChecks(
							previous,
							readFileSync(previousFile, 'utf8'),
							phaseChecks(previousPhase, null, process.execPath).map((check) => check.id),
							historical,
							previousPhase !== '2.5'
						)
					});
					const phaseUnits =
						manifest.fixedUnits[request.phase] ??
						groups.filter((group) => group.phase === request.phase).map((group) => group.id);
					const index =
						request.unit === null ? phaseUnits.length : phaseUnits.indexOf(request.unit);
					assert.ok(index >= 0, 'unidade sem posição de execução');
					for (const unit of phaseUnits.slice(0, index)) unitReceipt(unit);
				}
				for (const check of checks) {
					console.log(`Executando ${check.id}${candidate === root ? '' : ' no candidato isolado'}`);
					const command =
						provisionContext && check.command === process.execPath
							? executablePath('node', candidateEnv.PATH)
							: check.command;
					const result = await runProcess(command, check.args, {
						cwd: candidate,
						log: path.join(directory, `${check.id}.log`),
						timeoutMs: check.timeoutMs ?? 240000,
						env: {
							...candidateEnv,
							...check.env,
							NOTFEED_PROVISION_ACTIVE: checks.some((item) => item.id === 'PROVISION') ? '1' : '0',
							NOTFEED_PROVISION_CONTEXT: provisionContext,
							NOTFEED_GATE_STARTED_AT: startedAt,
							NOTFEED_ARTIFACT_ROOT: artifactRoot(),
							NOTFEED_BUILD_STARTED_AT: startedAt,
							NOTFEED_MAINTENANCE_HISTORY: path.resolve(root, manifest.evidenceRoot),
							CARGO_TARGET_DIR: path.resolve(root, '.artifacts/maintenance/native-cache')
						}
					});
					receipt.commands.push({ id: check.id, ...result });
					assertProcess(result);
					if (check.installsCandidate) {
						const installed = JSON.parse(readFileSync(result.stdoutPath, 'utf8'));
						candidate = installed.candidate;
						if (installed.provisionContext) {
							provisionContext = installed.provisionContext;
							candidateEnv = provisionEnvironment(installed);
						}
						assertStable(before, snapshot(candidate));
						receipt.candidate = candidate;
						report(installed.evidence);
					}
					if (check.expectedTests) {
						const actual = assertTapReport(
							readFileSync(result.stdoutPath, 'utf8'),
							check.expectedTests
						);
						const file = path.join(directory, `${check.id}.tests.json`);
						writeJSON(file, { expected: check.expectedTests, ...actual });
						report(file);
					}
					if (check.unitReport) {
						const file = path.resolve(candidate, check.unitReport);
						assertUnitReport(
							readJSON(file),
							readJSON(path.join(candidate, 'tooling/maintenance/contracts/baseline.json')).tests,
							candidate
						);
						report(file);
					}
					if (check.browserReport) {
						const file = path.resolve(candidate, check.browserReport);
						assertBrowserReport(readJSON(file), check.browserCount);
						report(file);
					}
					if (check.jsonReceipt) {
						const child = JSON.parse(readFileSync(result.stdoutPath, 'utf8'));
						assert.equal(readJSON(child.evidence).status, 'passed');
						report(child.evidence);
						if (check.id === 'CI-PROVE') {
							const proof = readJSON(child.evidence);
							assert.equal(proof.scope, 'web-minimum');
							assert.equal(proof.inputHash, ciFingerprint(candidate).inputHash);
							assert.equal(proof.cleanup.status, 'passed');
							assert.equal(hash(readFileSync(proof.proof)), proof.proofSha256);
							const artifact = readJSON(proof.proof);
							assertCIProof(artifact);
							for (const file of verifyProofFiles(path.dirname(proof.proof), artifact))
								report(path.join(path.dirname(proof.proof), file.path));
						}
						if (check.id === 'PROVISION') {
							const aggregate = readJSON(child.evidence),
								fingerprint = ciFingerprint(candidate);
							assert.equal(aggregate.proofs.length, 2);
							for (const [index, target] of ['web', 'desktop'].entries()) {
								const file = aggregate.proofs[index];
								assertProvisionReceipt(readJSON(file), {
									target,
									inputHash: fingerprint.inputHash,
									contractsHash: fingerprint.contractsHash,
									notBefore: startedAt
								});
								report(file);
							}
							candidateEnv = provisionEnvironment(readJSON(provisionContext));
						}
					}
					if (check.id === 'CARGO-TEST') {
						const counts = [
							...readFileSync(result.stdoutPath, 'utf8').matchAll(/running (\d+) tests?/g)
						].map((match) => Number(match[1]));
						assert.ok(counts.length, 'relatório Cargo test ausente');
						receipt.nativeTestCount = counts.reduce((total, count) => total + count, 0);
						receipt.nativeCoverage =
							'Cargo check/test and packaging; behavior test counts do not establish native UI coverage';
					}
					if (check.id === 'TYPES') assertTypeReport(readFileSync(result.stdoutPath, 'utf8'));
				}
				const after = snapshot(root);
				receipt.finalHash = after.hash;
				assertStable(before, after);
				if (candidate !== root) assertStable(before, snapshot(candidate));
				receipt.endedAt = new Date().toISOString();
				receipt.status = 'passed';
				assertEvidence(receipt, {
					...request,
					inputHash: before.hash,
					contractsHash: contractsHash(root),
					checks: checks.map((check) => check.id)
				});
			} catch (failure) {
				receipt.status = 'failed';
				receipt.failure = failure.message;
				receipt.endedAt = new Date().toISOString();
				process.exitCode = 1;
			}
			finalReceipt = receipt;
			return receipt;
		},
		() => (candidate === root ? [] : candidateCleanup(artifactRoot(), path.dirname(candidate)))
	);
	if (finalReceipt.status === 'passed')
		assertEvidence(finalReceipt, {
			...request,
			inputHash: finalReceipt.inputHash,
			contractsHash: contractsHash(root),
			checks: checks.map((check) => check.id)
		});
} catch (error) {
	finalReceipt ??= {
		schemaVersion: 1,
		...request,
		startedAt,
		commands: [],
		reports: [],
		skipped: []
	};
	finalReceipt.status = 'failed';
	finalReceipt.failure = error.message;
	finalReceipt.endedAt = new Date().toISOString();
	process.exitCode = 1;
}
writeJSON(path.join(directory, 'evidence.json'), finalReceipt);
if (finalReceipt.status === 'passed')
	writeJSON(
		path.resolve(manifest.evidenceRoot, request.phase, request.unit ?? 'final', 'latest.json'),
		{ evidence: path.join(directory, 'evidence.json') }
	);
console.log(`${finalReceipt.status}: ${path.join(directory, 'evidence.json')}`);
