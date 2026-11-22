import assert from 'node:assert/strict';
import { existsSync, mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { ciFingerprint } from './ci-lib.mjs';
import { readJSON, writeJSON } from './io.mjs';
import {
	artifactRoot,
	artifactScope,
	candidateCleanup,
	pruneArtifactPayloads
} from './artifacts-lib.mjs';
import { inspectProvision, provisionContract } from './provision-lib.mjs';
import {
	prepareProvisionCandidate,
	proveWeb,
	proveDesktop,
	provisionReceipt
} from './provision-probe.mjs';

const args = process.argv.slice(2);
if (args.length === 1 && args[0] === 'check') {
	const result = await inspectProvision();
	console.log(JSON.stringify(result));
} else {
	assert.ok(
		args.length === 3 &&
			args[0] === 'prove' &&
			args[1] === '--target' &&
			['web', 'desktop'].includes(args[2]),
		'uso: provision.mjs check|prove --target web|desktop'
	);
	const target = args[2],
		reused = process.env.NOTFEED_PROVISION_CONTEXT;
	const directory = path.resolve('.artifacts/provision', randomUUID());
	mkdirSync(directory, { recursive: true });
	let context, web, desktop, cleanup;
	await artifactScope(
		artifactRoot(),
		directory,
		async () => {
			try {
				context = reused
					? readJSON(reused)
					: await prepareProvisionCandidate(process.cwd(), directory);
				if (reused)
					assert.equal(
						path.resolve(context.candidate),
						process.cwd(),
						'Contexto pertence a outro candidato.'
					);
				assert.equal(ciFingerprint(context.candidate).inputHash, context.inputHash);
				await proveWeb(context);
				web = JSON.parse(context.commands.find((command) => command.id === 'doctor').stdout);
				if (target === 'desktop') {
					await proveDesktop(context);
					desktop = JSON.parse(
						context.commands.find((command) => command.id === 'desktop-doctor').stdout
					);
				}
				writeJSON(path.join(context.area, 'context.json'), context);
			} catch (error) {
				writeJSON(path.join(directory, 'failure.json'), { status: 'failed', error: error.message });
				throw error;
			}
		},
		() => {
			if (!context) return [];
			if (reused) {
				cleanup = { status: 'passed', mode: 'parent-lease', area: context.area };
				return [];
			}
			const removed = [
				...candidateCleanup(artifactRoot(), context.area),
				...pruneArtifactPayloads(
					artifactRoot(),
					context.area,
					provisionContract(context.candidate).directories.temporaryPayloads
				)
			];
			for (const file of removed) assert.equal(existsSync(file), false);
			cleanup = { status: 'passed', mode: 'removed', removed };
			return removed;
		}
	);
	const webFile = path.join(directory, 'web.json');
	writeJSON(webFile, provisionReceipt(context, 'web', web, web.executables, cleanup));
	const proofs = [webFile];
	if (desktop) {
		const file = path.join(directory, 'desktop.json');
		writeJSON(file, provisionReceipt(context, 'desktop', desktop, desktop.executables, cleanup));
		proofs.push(file);
	}
	const evidence = path.join(directory, 'evidence.json');
	writeJSON(evidence, {
		schemaVersion: 1,
		status: 'passed',
		target,
		inputHash: context.inputHash,
		contractsHash: context.contractsHash,
		proofs,
		cleanup
	});
	console.log(JSON.stringify({ evidence }));
}
