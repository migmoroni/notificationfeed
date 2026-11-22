import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const cli = fileURLToPath(new URL('./vitest.mjs', import.meta.resolve('vitest/package.json')));
const result = spawnSync(process.execPath, [cli, 'run', ...process.argv.slice(2)], {
  stdio: 'inherit', env: { ...process.env, TZ: 'UTC' }
});
if (result.error) throw result.error;
if (result.signal) throw new Error(`Vitest interrompido: ${result.signal}`);
process.exitCode = result.status ?? 1;
