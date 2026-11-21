import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as yaml from 'prettier/plugins/yaml';
import { readJSON } from './io.mjs';

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
	const tools = readJSON(new URL('./contracts/tools.json', import.meta.url));
	assert.equal(workflow.name, contract.name);
	assert.ok(
		!JSON.stringify(workflow).includes('${{ secrets.'),
		'segredos não são usados neste workflow'
	);
	assert.deepEqual(Object.keys(workflow.on).sort(), [...contract.events].sort());
	assert.deepEqual(workflow.on.push.branches, [contract.integrationBranch]);
	assert.deepEqual(workflow.permissions, contract.permissions);
	assert.deepEqual(Object.keys(workflow.jobs).sort(), [...contract.jobs].sort());
	const actions = new Set(contract.actions.map((action) => `${action.name}@${action.revision}`));
	for (const [name, job] of Object.entries(workflow.jobs)) {
		assert.equal(job['runs-on'], contract.runner);
		assert.equal(Object.hasOwn(job, 'continue-on-error'), false);
		assert.equal(Object.hasOwn(job, 'permissions'), false);
		assert.ok(job.steps.length);
		for (const step of job.steps) {
			assert.equal(Object.hasOwn(step, 'continue-on-error'), false);
			if (step.uses) {
				assert.ok(actions.has(step.uses), `action/revisão não autorizada: ${step.uses}`);
				if (step.uses.startsWith('actions/checkout@'))
					assert.equal(step.with['persist-credentials'], false);
				if (step.uses.startsWith('actions/setup-node@'))
					assert.equal(String(step.with['node-version']), tools.node);
			}
			if (step.run) {
				assert.ok(
					!/continue-on-error|\|\|\s*true|--if-present|--passWithNoTests|--ignore-scripts|pull_request_target/.test(
						step.run
					)
				);
				assert.ok(
					!/\$\{\{\s*(?:github\.event|secrets\.)/.test(step.run),
					'interpolar eventos/segredos no shell é proibido'
				);
			}
		}
		if (['web', 'desktop'].includes(name)) {
			assert.equal(job.if, "needs.impact.outputs.profile == 'complete'");
			const commands = job.steps
				.filter((step) => step.run)
				.map((step) => step.run)
				.join('\n');
			assert.ok(commands.includes(`pnpm@${tools.pnpm}`));
			assert.ok(commands.includes('pnpm install --frozen-lockfile'));
			assert.ok(commands.includes('node tooling/checks/prebuild.mjs'));
			assert.ok(commands.includes('playwright install --with-deps chromium'));
			assert.ok(commands.includes(`node tooling/checks/ci.mjs run ${name}`));
			const cache = job.steps.find((step) => step.with?.cache === 'pnpm');
			assert.ok(cache, 'cache pnpm sem política');
			assert.deepEqual(
				cache.with['cache-dependency-path'].trim().split('\n'),
				contract.cache.inputs
			);
			const upload = job.steps.find((step) => step.uses?.startsWith('actions/upload-artifact@'));
			assert.equal(upload.with.name, `proof-${name}-` + '${{ github.run_attempt }}');
			assert.equal(upload.with.path, `.artifacts/ci/${name}/artifact`);
			assert.equal(upload.with['retention-days'], contract.retentionDays);
			assert.equal(upload.with['if-no-files-found'], 'error');
			if (name === 'desktop') {
				for (const [key, value] of Object.entries(contract.nativeEnvironment))
					assert.equal(job.env[key], value);
				assert.ok(
					commands.includes(
						`rustup toolchain install ${tools.rust} --profile minimal --component rustfmt --component clippy`
					)
				);
				assert.ok(
					commands.includes(`cargo install cargo-audit --version ${tools.cargoAudit} --locked`)
				);
				for (const systemPackage of contract.nativePackages)
					assert.ok(commands.includes(systemPackage));
			}
			assert.ok(
				job.steps.some(
					(step) => step.uses?.startsWith('actions/upload-artifact@') && step.if === 'always()'
				)
			);
		}
	}
	assert.equal(workflow.jobs.integration.if, 'always()');
	assert.deepEqual([...workflow.jobs.integration.needs].sort(), ['desktop', 'impact', 'web']);
	assert.ok(
		workflow.jobs.integration.steps.some(
			(step) => step.run === 'node tooling/checks/ci.mjs aggregate'
		)
	);
}
