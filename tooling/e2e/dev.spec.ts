import { test, expect } from '@playwright/test';
import { ready, createUser } from './support.js';

test('DEV-01: workspace web em desenvolvimento consome o pacote e cria conta', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	await page.goto('/user');
	await ready(page);
	await createUser(page, 'consumer', 'Migration Dev');
	await page.goto('/library');
	await ready(page);
	await expect(page.locator('nav').getByText('Migration Dev', { exact: true })).toBeVisible();
	expect(
		await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length)
	).toBe(0);
	expect(errors).toEqual([]);
});
