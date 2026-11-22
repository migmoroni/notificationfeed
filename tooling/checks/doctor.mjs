import assert from 'node:assert/strict';
import { inspectEnvironment } from './doctor-lib.mjs';
try {
	const args = process.argv.slice(2);
	assert.ok(
		args.length === 2 && args[0] === '--target',
		'uso: pnpm run doctor --target web|desktop'
	);
	const { commands, ...result } = await inspectEnvironment(args[1]);
	console.log(JSON.stringify({ ...result, checkedCommands: commands.length }));
} catch (error) {
	console.error(error.message);
	process.exitCode = 1;
}
