import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execute } from '../io.mjs';

test('subprocesso preserva stdout/stderr reais e recusa falha, sinal e timeout', async () => {
	const result = await execute(process.execPath, [
		'-e',
		'console.log("stdout-sentinel");console.error("stderr-sentinel")'
	]);
	assert.match(result.stdout, /stdout-sentinel/);
	assert.match(result.stderr, /stderr-sentinel/);
	await assert.rejects(() => execute(process.execPath, ['-e', 'process.exit(7)']));
	await assert.rejects(() =>
		execute(process.execPath, ['-e', 'process.kill(process.pid,"SIGTERM")'])
	);
	await assert.rejects(() =>
		execute(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { timeoutMs: 50 })
	);
});
