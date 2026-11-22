import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';
import production from './playwright.config.js';

export default defineConfig({
	...production,
	testMatch: 'dev.spec.ts',
	use: { ...production.use, baseURL: 'http://127.0.0.1:4175' },
	reporter: [['list'], ['json', { outputFile: resolve('.artifacts/e2e/dev-report.json') }]],
	webServer: {
		command: 'pnpm dev --host 127.0.0.1 --port 4175 --strictPort',
		cwd: '../..',
		url: 'http://127.0.0.1:4175',
		reuseExistingServer: false,
		timeout: 30_000
	}
});
