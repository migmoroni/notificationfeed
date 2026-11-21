import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const cli = fileURLToPath(new URL('./vitest.mjs', import.meta.resolve('vitest/package.json')));
const args = process.argv.slice(2);
const watch = args[0] === '--watch';
if (watch) args.shift();
const environment = JSON.parse(
	readFileSync(new URL('./contracts/dev.json', import.meta.url), 'utf8')
).environment;
const result = spawnSync(process.execPath, [cli, watch ? 'watch' : 'run', ...args], {
	stdio: 'inherit',
	env: { ...process.env, ...environment }
});
if (result.error) throw result.error;
if (result.signal) throw new Error(`Vitest interrompido: ${result.signal}`);
process.exitCode = result.status ?? 1;
