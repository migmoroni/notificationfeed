import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readJSON } from '../io.mjs';

test('CI mínima contrata web, build e todos os checks sem redefinir os gates locais', () => {
	const ci = readJSON('tooling/checks/contracts/ci.json');
	const provision = readJSON(ci.provisioning.contract);
	assert.equal(ci.scope, 'web-minimum');
	assert.deepEqual(ci.jobs, ['web']);
	assert.deepEqual(ci.receipt.artifactNames, ['proof-web']);
	assert.equal(ci.receipt.scopeRequiredForQualification, ci.scope);
	assert.deepEqual(ci.provisioning.setupTargets, { web: 'ci' });
	assert.deepEqual(ci.provisioning.setups, { web: 'mise run setup:ci' });
	assert.deepEqual(
		ci.checks.map((step) => step.id),
		[
			'TYPES',
			'E2E-TYPES',
			'LINT',
			'FORMAT',
			'ARCHITECTURE',
			'RESTRICTIONS',
			'CONTRACTS',
			'UNIT',
			'CI-TOOLING',
			'BUILD'
		]
	);
	assert.deepEqual(ci.checks.find((step) => step.id === 'BUILD').args, ['build']);
	assert.equal(ci.checks.find((step) => step.id === 'UNIT').unitReport, true);
	assert.equal(provision.profiles.ci.task, 'setup:ci');
	assert.equal(provision.profiles.ci.browser, null);
	assert.equal(provision.profiles.ci.doctor, null);
	assert.equal(provision.profiles.web.browser, 'chromium');
	assert.equal(provision.profiles.desktop.doctor, 'desktop');
	assert.deepEqual(readJSON('tooling/checks/contracts/tools.json').nativeEnvironment, {
		CARGO_BUILD_JOBS: '2',
		CARGO_INCREMENTAL: '0',
		CARGO_PROFILE_DEV_DEBUG: '0',
		CARGO_PROFILE_TEST_DEBUG: '0'
	});
});
