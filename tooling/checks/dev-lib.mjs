import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import {
	closeSync,
	existsSync,
	mkdtempSync,
	openSync,
	readFileSync,
	rmSync,
	symlinkSync,
	writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { execute, readJSON } from './io.mjs';

export function assertServerSettings(settings, contract) {
	for (const [key, port] of [
		['server', contract.ports.dev],
		['preview', contract.ports.preview]
	]) {
		assert.equal(settings[key].port, port, `${key}: porta divergente`);
		assert.equal(settings[key].strictPort, true, `${key}: strictPort obrigatório`);
	}
	assert.equal(settings.devUrl, `http://localhost:${contract.ports.dev}`);
}
export async function inspectDevSettings(root) {
	const result = await execute(
		process.execPath,
		[
			'--input-type=module',
			'-e',
			`
  import { resolveConfig } from 'vite';
  const config = await resolveConfig({}, 'serve');
  console.log('NOTFEED_CONFIG='+JSON.stringify({server:config.server,preview:config.preview}));
 `
		],
		{ cwd: path.join(root, 'apps/web') }
	);
	const line = result.stdout.split('\n').find((value) => value.startsWith('NOTFEED_CONFIG='));
	assert.ok(line, 'Vite não retornou configuração efetiva');
	const settings = JSON.parse(line.slice('NOTFEED_CONFIG='.length));
	settings.devUrl = readJSON(
		path.join(root, 'apps/desktop/src-tauri/tauri.conf.json')
	).build.devUrl;
	const contract = readJSON(path.join(root, 'tooling/checks/contracts/dev.json'));
	const web = readJSON(path.join(root, 'apps/web/package.json'));
	const main = readJSON(path.join(root, 'package.json'));
	for (const [name, command] of Object.entries(contract.webCommands))
		assert.equal(web.scripts[name], command);
	for (const [name, command] of Object.entries(contract.publicCommands))
		assert.equal(main.scripts[name], command);
	const e2e = readFileSync(path.join(root, 'tooling/e2e/playwright.dev.config.ts'), 'utf8');
	assert.ok(e2e.includes(`--port ${contract.ports.e2eDev} --strictPort`));
	assert.match(e2e, /reuseExistingServer:\s*false/);
	assert.match(
		readFileSync(path.join(root, 'tooling/e2e/playwright.config.ts'), 'utf8'),
		/reuseExistingServer:\s*false/
	);
	return settings;
}
async function until(predicate, timeoutMs, diagnostic) {
	const limit = Date.now() + timeoutMs;
	while (!predicate()) {
		assert.ok(Date.now() < limit, `timeout: ${diagnostic()}`);
		await delay(50);
	}
}
export async function proveTestEnvironment(root) {
	const contract = readJSON(path.join(root, 'tooling/checks/contracts/dev.json'));
	const directory = mkdtempSync(path.join(tmpdir(), 'notfeed-watch-'));
	const output = path.join(directory, 'watch.stdout'),
		errors = path.join(directory, 'watch.stderr');
	let child,
		closed = false,
		stopResult,
		closePromise;
	const observations = path.join(directory, 'observations.jsonl');
	const fixture = path.join(directory, 'clock.test.mjs');
	const readRuns = () =>
		existsSync(observations)
			? readFileSync(observations, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse)
			: [];
	const source = (revision) => `
  import {test} from 'vitest';
  import assert from 'node:assert/strict';
  import {appendFileSync} from 'node:fs';
  test('same clock and locale assertions',()=>{
   const environment=${JSON.stringify(contract.environment)};
   for(const [key,value] of Object.entries(environment)) assert.equal(process.env[key],value);
   const options=new Intl.DateTimeFormat().resolvedOptions();
   assert.equal(options.timeZone,'UTC');assert.equal(options.locale,'en-US');
   const instant=new Date('2020-01-02T12:34:56.000Z');
   assert.equal(instant.getHours(),12);assert.equal(instant.getTimezoneOffset(),0);
   appendFileSync(process.env.NOTFEED_ENV_OBSERVATIONS,JSON.stringify({revision:${revision},locale:options.locale,timeZone:options.timeZone,hour:instant.getHours(),environment})+'\\n');
  });
 `;
	try {
		symlinkSync(path.join(root, 'node_modules'), path.join(directory, 'node_modules'));
		writeFileSync(path.join(directory, 'package.json'), '{"type":"module"}');
		writeFileSync(
			path.join(directory, 'vitest.config.mjs'),
			`export default {test:{include:['clock.test.mjs'],environment:'node'}};`
		);
		writeFileSync(fixture, source(1));
		const outFd = openSync(output, 'w'),
			errFd = openSync(errors, 'w');
		child = spawn(process.execPath, [path.join(root, 'tooling/checks/unit.mjs'), '--watch'], {
			cwd: directory,
			detached: true,
			stdio: ['ignore', outFd, errFd],
			env: {
				...process.env,
				CI: 'true',
				TZ: 'Asia/Tokyo',
				LANG: 'pt_BR.UTF-8',
				LC_ALL: 'pt_BR.UTF-8',
				NOTFEED_ENV_OBSERVATIONS: observations
			}
		});
		closeSync(outFd);
		closeSync(errFd);
		closePromise = new Promise((resolve) => {
			child.once('error', (error) => {
				closed = true;
				stopResult = { error: error.message };
				resolve(stopResult);
			});
			child.once('close', (code, signal) => {
				closed = true;
				stopResult = { code, signal };
				resolve(stopResult);
			});
		});
		const diagnostic = () =>
			`${JSON.stringify(stopResult)} ${readFileSync(output, 'utf8')} ${readFileSync(errors, 'utf8')}`;
		await until(
			() => {
				assert.equal(closed, false, diagnostic());
				return (
					readRuns().length === 1 && /Waiting for file changes/i.test(readFileSync(output, 'utf8'))
				);
			},
			contract.watchTimeoutMs,
			diagnostic
		);
		writeFileSync(fixture, source(2));
		await until(
			() => {
				assert.equal(closed, false, diagnostic());
				return readRuns().length === 2;
			},
			contract.watchTimeoutMs,
			diagnostic
		);
		const watchRuns = readRuns();
		assert.deepEqual(
			watchRuns.map((value) => value.revision),
			[1, 2]
		);
		process.kill(-child.pid, 'SIGTERM');
		const result = await closePromise;
		assert.equal(result.signal, 'SIGTERM', JSON.stringify(result));
		const watchOutput = {
			stdout: readFileSync(output, 'utf8'),
			stderr: readFileSync(errors, 'utf8')
		};
		rmSync(observations);
		const report = path.join(directory, 'batch.json');
		await execute(
			process.execPath,
			[path.join(root, 'tooling/checks/unit.mjs'), '--reporter=json', `--outputFile=${report}`],
			{
				cwd: directory,
				env: {
					TZ: 'Pacific/Honolulu',
					LANG: 'pt_BR.UTF-8',
					LC_ALL: 'pt_BR.UTF-8',
					NOTFEED_ENV_OBSERVATIONS: observations
				}
			}
		);
		const batchReport = readJSON(report),
			batchRuns = readRuns();
		assert.equal(batchReport.success, true);
		assert.equal(batchReport.numPassedTests, 1);
		for (const key of ['numFailedTests', 'numPendingTests', 'numTodoTests'])
			assert.equal(batchReport[key], 0);
		assert.deepEqual(batchRuns, [watchRuns[1]]);
		return {
			watchRuns,
			batchRuns,
			termination: { ...result, expected: true },
			watchOutput,
			batchReport
		};
	} finally {
		if (child && !closed) {
			process.kill(-child.pid, 'SIGKILL');
			await closePromise;
		}
		rmSync(directory, { recursive: true, force: true });
	}
}
export async function proveOccupiedPorts(root) {
	// Preview requires generated SvelteKit server files, even for a rejected bind.
	// Prepare them through the public build before probing either real command.
	await execute('pnpm', ['build'], { cwd: root, timeoutMs: 240000 });
	const results = [];
	for (const mode of ['dev', 'preview']) {
		const server = createServer();
		await new Promise((resolve, reject) => {
			server.once('error', reject);
			server.listen(0, '127.0.0.1', resolve);
		});
		try {
			const port = server.address().port;
			let failure;
			try {
				await execute(
					'pnpm',
					[
						'--filter',
						'@notfeed/web',
						mode === 'dev' ? 'dev' : 'preview',
						'--host',
						'127.0.0.1',
						'--port',
						String(port)
					],
					{ cwd: root, timeoutMs: 30000 }
				);
			} catch (error) {
				failure = JSON.parse(error.message);
			}
			assert.ok(failure, `${mode}: servidor ignorou ocupação`);
			assert.equal(failure.timedOut, false);
			assert.equal(failure.signal, null);
			assert.equal(failure.error, null);
			assert.ok(Number.isInteger(failure.code) && failure.code !== 0);
			const output = failure.stdout + failure.stderr;
			assert.match(output, new RegExp(`Port ${port} is already in use`));
			results.push({ mode, port, code: failure.code, timedOut: failure.timedOut, output });
		} finally {
			await new Promise((resolve, reject) =>
				server.close((error) => (error ? reject(error) : resolve()))
			);
		}
	}
	return results;
}
