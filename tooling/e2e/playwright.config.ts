import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';

export default defineConfig({
	testDir: '.',
	testMatch: 'migration.spec.ts',
	workers: 1,
	retries: 0,
	timeout: 90_000,
	expect: { timeout: 10_000 },
	outputDir: '../../.artifacts/e2e/results',
	reporter: [
		['list'],
		[
			'json',
			{
				outputFile: resolve(
					process.env.NOTFEED_UPGRADE === '1'
						? '.artifacts/e2e/upgrade-report.json'
						: '.artifacts/e2e/report.json'
				)
			}
		]
	],
	use: {
		baseURL: 'http://127.0.0.1:4173',
		locale: 'en-US',
		timezoneId: 'UTC',
		viewport: { width: 1280, height: 900 },
		serviceWorkers: 'allow',
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure'
	},
	projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
	webServer: {
		command: 'node --experimental-strip-types tooling/e2e/server.ts',
		cwd: '../..',
		url: 'http://127.0.0.1:4173/__test/health',
		reuseExistingServer: false,
		timeout: 15_000
	}
});
