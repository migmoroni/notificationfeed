import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const child = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '4175', '--strictPort'], { detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
let output = '', ended = false;
child.stdout.on('data', chunk => output += chunk);
child.stderr.on('data', chunk => output += chunk);
const completion = new Promise(resolve => child.once('close', (code, signal) => { ended = true; resolve({ code, signal }); }));
child.once('error', error => { output += error.message; });
try {
  let html = '';
  for (let attempt = 0; attempt < 100; attempt++) {
    assert.equal(ended, false, output);
    try {
      const response = await fetch('http://127.0.0.1:4175/', { signal: AbortSignal.timeout(1000) });
      if (response.ok) { html = await response.text(); break; }
    } catch { /* servidor ainda inicializando; limite total abaixo */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.match(html, /__sveltekit_dev/, 'servidor SvelteKit não respondeu pelo comando público da raiz');
  const client = await fetch('http://127.0.0.1:4175/@vite/client', { signal: AbortSignal.timeout(5000) });
  assert.equal(client.status, 200);
  assert.match(await client.text(), /createHotContext/, 'cliente HMR do Vite ausente');
  console.log('dev: comando da raiz iniciou Vite no workspace web e respondeu HTTP');
} finally {
  if (!ended) process.kill(-child.pid, 'SIGTERM');
  const result = await completion;
  mkdirSync('.artifacts/migration', { recursive: true });
  writeFileSync('.artifacts/migration/dev-smoke.log', output);
  assert.ok(result.signal === 'SIGTERM' || result.code === 0 || result.code === 143, 'servidor não encerrou de forma controlada');
}
