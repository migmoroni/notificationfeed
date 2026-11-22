import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as yaml from 'prettier/plugins/yaml';

export async function readWorkflow(file) {
	const ast = await yaml.parsers.yaml.parse(readFileSync(file, 'utf8'));
	function value(node, key = false) {
		assert.ok(!node.anchor && !node.tag, 'anchors/tags YAML não são permitidos na CI');
		if (
			[
				'root',
				'document',
				'documentBody',
				'mappingKey',
				'mappingValue',
				'sequenceItem',
				'flowSequenceItem'
			].includes(node.type)
		) {
			const children = node.children.filter((child) => !['documentHead'].includes(child.type));
			if (children.length === 0) return null;
			assert.equal(children.length, 1, 'documento/valor YAML ambíguo');
			return value(children[0], key);
		}
		if (['mapping', 'flowMapping'].includes(node.type)) {
			const result = {};
			for (const item of node.children) {
				assert.ok(['mappingItem', 'flowMappingItem'].includes(item.type));
				const name = value(item.children[0], true);
				assert.equal(typeof name, 'string');
				assert.ok(!Object.hasOwn(result, name), 'chave YAML duplicada');
				result[name] = value(item.children[1]);
			}
			return result;
		}
		if (['sequence', 'flowSequence'].includes(node.type))
			return node.children.map((child) => value(child));
		assert.ok(
			['plain', 'quoteDouble', 'quoteSingle', 'blockLiteral', 'blockFolded'].includes(node.type),
			`nó YAML não permitido: ${node.type}`
		);
		if (node.type === 'plain' && !key) {
			if (node.value === 'true') return true;
			if (node.value === 'false') return false;
			if (['null', '~'].includes(node.value)) return null;
			if (/^(?:0|[1-9]\d*)$/.test(node.value)) return Number(node.value);
		}
		return node.value;
	}
	return value(ast);
}
export function assertWorkflow(workflow, contract) {
	assert.equal(workflow.name, contract.name);
	assert.ok(!JSON.stringify(workflow).includes('${{ secrets.'));
	assert.deepEqual(Object.keys(workflow.on).sort(), [...contract.events].sort());
	assert.deepEqual(workflow.on.push.branches, [contract.integrationBranch]);
	assert.deepEqual(workflow.permissions, contract.permissions);
	assert.equal(Object.hasOwn(workflow, 'env'), false, 'Ambiente global não contratado.');
	assert.deepEqual(Object.keys(workflow.jobs), contract.jobs);
	const job = workflow.jobs.web;
	assert.equal(job['runs-on'], contract.runner);
	for (const field of ['if', 'needs', 'continue-on-error', 'permissions', 'strategy'])
		assert.equal(Object.hasOwn(job, field), false, `Campo não contratado: ${field}`);
	assert.equal(Object.hasOwn(job, 'env'), false, 'runner não está disponível em jobs.<job_id>.env');
	assert.deepEqual(
		job.steps.map((step) => step.id),
		contract.stepOrder
	);
	const steps = Object.fromEntries(job.steps.map((step) => [step.id, step]));
	assert.equal(contract.provisioning.environmentStep, 'tools');
	assert.deepEqual(steps.tools.env, contract.provisioning.environment);
	const actions = new Set(contract.actions.map((action) => `${action.name}@${action.revision}`));
	for (const step of job.steps) {
		if (step.id !== contract.provisioning.environmentStep)
			assert.equal(Object.hasOwn(step, 'env'), false, 'Ambiente do mise não pode ser sobrescrito.');
		assert.equal(Object.hasOwn(step, 'continue-on-error'), false);
		if (step.id !== 'proof') assert.equal(Object.hasOwn(step, 'if'), false);
		if (step.uses) assert.ok(actions.has(step.uses), `action/revisão não autorizada: ${step.uses}`);
		if (step.run) {
			assert.ok(
				!/continue-on-error|\|\|\s*true|--if-present|--passWithNoTests|--ignore-scripts|pull_request_target|\b(?:cargo|rustup|corepack)\b|playwright|AppImage/.test(
					step.run
				)
			);
			assert.ok(!/\$\{\{\s*(?:github\.event|secrets\.)/.test(step.run));
		}
	}
	assert.ok(steps.checkout.uses.startsWith('actions/checkout@'));
	assert.equal(steps.checkout.with['persist-credentials'], false);
	assert.equal(
		steps.system.run.trim(),
		`sudo apt-get update\nsudo apt-get install -y ${contract.systemPackages.join(' ')}`
	);
	const bootstrap = steps.tools.run;
	const assignments = Object.keys(contract.provisioning.environment)
		.map((name) => `"${name}=$${name}"`)
		.join(' ');
	assert.ok(
		bootstrap.startsWith(`printf '%s\\n' ${assignments} >> "$GITHUB_ENV"\n`),
		'Ambiente do mise precisa persistir para cache, setup e verificações.'
	);
	for (const command of [
		'test ! -e "$MISE_DATA_DIR"',
		`bash ${contract.provisioning.bootstrap}`,
		`--install-dir "${contract.provisioning.bootstrapInstallDirectory}"`,
		'install --locked',
		'trust "$PWD/mise.toml"',
		'bin-paths >> "$GITHUB_PATH"',
		'node tooling/checks/provision.mjs check'
	])
		assert.ok(bootstrap.includes(command), `Bootstrap incompleto: ${command}`);
	assert.ok(steps.cache.uses.startsWith('actions/setup-node@'));
	for (const field of ['node-version', 'node-version-file'])
		assert.equal(Object.hasOwn(steps.cache.with, field), false);
	assert.equal(steps.cache.with.cache, 'pnpm');
	assert.deepEqual(
		steps.cache.with['cache-dependency-path'].trim().split('\n'),
		contract.cache.inputs
	);
	assert.equal(steps.setup.run, contract.provisioning.setups.web);
	assert.equal(steps.verify.run, 'mise exec -- node tooling/checks/ci.mjs run web');
	assert.ok(steps.proof.uses.startsWith('actions/upload-artifact@'));
	assert.equal(steps.proof.if, 'always()');
	assert.deepEqual(steps.proof.with, {
		name: 'proof-web-${{ github.run_attempt }}',
		path: '.artifacts/ci/web/artifact',
		'retention-days': contract.retentionDays,
		'if-no-files-found': 'error'
	});
}
