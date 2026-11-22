import { expect, type Page, type APIRequestContext } from '@playwright/test';
import { resolve } from 'node:path';

interface UserRecord {
	id: string;
	displayName: string;
	activateTrees?: unknown[];
	activateNodes?: unknown[];
}
interface PostRecord {
	userId: string;
	title: string;
	read: boolean;
	savedAt: number | null;
}
export interface Snapshot {
	users: UserRecord[];
	posts: PostRecord[];
	trees: unknown[];
	schema: unknown[];
	storage: Record<string, string>;
}
export async function ready(page: Page) {
	await expect(page.locator('main h1').first()).toBeVisible();
}
export async function createUser(page: Page, role: 'consumer' | 'creator', name: string) {
	await ready(page);
	const section = page.locator('section').filter({
		has: page.getByRole('heading', {
			name: role === 'consumer' ? 'Consumers' : 'Creators',
			exact: true
		})
	});
	await section.getByRole('button', { name: 'Create', exact: true }).click();
	const dialog = page.getByRole('dialog');
	await dialog.getByRole('textbox').fill(name);
	await dialog.getByRole('button', { name: 'Create', exact: true }).click();
	await expect(dialog).toBeHidden();
	await expect(page.locator('nav').getByText(name, { exact: true })).toBeVisible();
}
export async function importFixture(page: Page) {
	await page.goto('/browse/import');
	await ready(page);
	await page
		.locator('input[type=file]')
		.setInputFiles(resolve('tooling/e2e/fixtures/migration.notfeed.json'));
	await page.getByRole('button', { name: 'Import page', exact: true }).click();
	await expect(
		page.getByText(/Migration reference.*imported|imported.*Migration reference/i)
	).toBeVisible();
}
export async function activateFeed(page: Page) {
	await page.goto('/browse/node/migration-tree:font');
	await ready(page);
	await page.getByRole('button', { name: 'Follow', exact: true }).click();
	await expect(page.getByRole('button', { name: 'Following', exact: true })).toBeVisible();
	await page.goto('/');
	await ready(page);
	await page.getByRole('button', { name: 'Update feed', exact: true }).click();
	await expect(page.getByText('Migration sentinel post', { exact: true }).first()).toBeVisible();
}
export async function saveAndRead(page: Page) {
	const card = page.locator('article').filter({ hasText: 'Migration sentinel post' });
	await card.getByRole('button', { name: 'Save', exact: true }).click();
	const popupPromise = page.context().waitForEvent('page');
	await card.getByRole('button', { name: /Open post|Read more/i }).click();
	const popup = await popupPromise;
	await popup.close();
	await expect
		.poll(async () =>
			(await snapshot(page)).posts.some(
				(post) => post.title === 'Migration sentinel post' && post.read && post.savedAt !== null
			)
		)
		.toBe(true);
}
export async function snapshot(page: Page): Promise<Snapshot> {
	return (await page.evaluate(async () => {
		const db = await new Promise<IDBDatabase>((resolveDB, reject) => {
			const req = indexedDB.open('notfeed-v2');
			req.onsuccess = () => resolveDB(req.result);
			req.onerror = () => reject(req.error);
		});
		try {
			const names = ['users', 'posts', 'contentTrees'];
			const tx = db.transaction(names, 'readonly');
			const values = await Promise.all(
				names.map(
					(name) =>
						new Promise<unknown[]>((resolveRows, reject) => {
							const req = tx.objectStore(name).getAll();
							req.onsuccess = () => resolveRows(req.result as unknown[]);
							req.onerror = () => reject(req.error);
						})
				)
			);
			const schemaTx = db.transaction([...db.objectStoreNames], 'readonly');
			const schema = [...db.objectStoreNames].map((name) => {
				const store = schemaTx.objectStore(name);
				return {
					name,
					keyPath: store.keyPath,
					indexes: [...store.indexNames].map((indexName) => {
						const index = store.index(indexName);
						return { name: indexName, keyPath: index.keyPath, unique: index.unique };
					})
				};
			});
			return {
				users: values[0],
				posts: values[1],
				trees: values[2],
				schema: [{ database: db.name, version: db.version }, ...schema],
				storage: Object.fromEntries(
					Object.entries(localStorage).filter(([key]) => key.startsWith('notfeed'))
				)
			};
		} finally {
			db.close();
		}
	})) as Snapshot;
}
export function assertSentinel(value: Snapshot) {
	expect(value.users.some((user) => user.displayName === 'Migration Alice')).toBe(true);
	expect(
		value.posts.some(
			(post) => post.title === 'Migration sentinel post' && post.read && post.savedAt !== null
		)
	).toBe(true);
	expect(JSON.stringify(value.trees)).toContain('migration-tree:font');
}
export async function assertControlled(page: Page, timeout = 10_000) {
	await expect
		.poll(
			() =>
				page.evaluate(async () => {
					const registration = await navigator.serviceWorker.getRegistration();
					return registration?.active?.state === 'activated';
				}),
			{ timeout }
		)
		.toBe(true);
	if (!(await page.evaluate(() => !!navigator.serviceWorker.controller))) await page.reload();
	await expect
		.poll(() => page.evaluate(() => navigator.serviceWorker.controller?.scriptURL ?? ''), {
			timeout
		})
		.toBe('http://127.0.0.1:4173/service-worker.js');
}
export async function assertActiveBuild(page: Page, request: APIRequestContext) {
	const { version }: { version: string } = await (await request.get('/_app/version.json')).json();
	await expect(async () => {
		const revisions = await page.evaluate(async () => {
			const keys: string[] = [];
			for (const name of await caches.keys()) {
				if (!name.includes('precache')) continue;
				for (const req of await (await caches.open(name)).keys()) {
					const url = new URL(req.url);
					if (url.pathname === '/' && url.searchParams.has('__WB_REVISION__'))
						keys.push(url.searchParams.get('__WB_REVISION__')!);
				}
			}
			return keys;
		});
		assertBuildRevisions(revisions, version);
	}).toPass({ timeout: 10_000 });
}
export function assertBuildRevisions(actual: string[], expected: string) {
	expect(actual).toEqual([expected]);
}
