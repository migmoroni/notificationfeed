import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { writeJSON, readJSON } from './io.mjs';
import {
	inspectDevSettings,
	assertServerSettings,
	proveTestEnvironment,
	proveOccupiedPorts
} from './dev-lib.mjs';
const root = process.cwd();
const settings = await inspectDevSettings(root);
assertServerSettings(settings, readJSON('tooling/checks/contracts/dev.json'));
const tests = await proveTestEnvironment(root);
const ports = await proveOccupiedPorts(root);
const evidence = path.resolve('.artifacts/checks/dev', `${randomUUID()}.json`);
writeJSON(evidence, { schemaVersion: 1, status: 'passed', settings, tests, ports });
console.log(JSON.stringify({ evidence }));
