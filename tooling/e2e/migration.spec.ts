import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { assertSentinel, assertControlled, snapshot, ready, createUser, importFixture, activateFeed, saveAndRead, assertActiveBuild, assertBuildRevisions } from './support.js';

test('WEB-01–03 / WEB-05 / PWA-01–02: contratos anteriores à movimentação', async ({ page, context, request }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  context.on('page', opened => opened.on('pageerror', error => errors.push(error.message)));
  context.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  context.on('request', req => { if (/^https?:/.test(req.url()) && new URL(req.url()).origin !== 'http://127.0.0.1:4173') errors.push(`rede externa: ${req.url()}`); });
  const fixtureResponse = await request.get('/__fixtures/feed.json');
  expect(fixtureResponse.ok()).toBe(true);
  const fixture: { items: { date_published: string }[] } = await fixtureResponse.json();
  const fixtureDate = Date.parse(fixture.items[0].date_published);
  expect(fixtureDate).toBeGreaterThan(Date.now() - 600_000);
  expect(fixtureDate).toBeLessThanOrEqual(Date.now() + 1000);
  const repeated: typeof fixture = await (await request.get('/__fixtures/feed.json')).json();
  expect(repeated.items[0].date_published).toBe(fixture.items[0].date_published);
  await page.goto('/user');
  await ready(page);
  await createUser(page, 'consumer', 'Migration Alice');
  await importFixture(page);
  await activateFeed(page);
  await saveAndRead(page);
  const before = await snapshot(page);
  assertSentinel(before);
  await page.reload();
  await ready(page);
  assertSentinel(await snapshot(page));

  await page.goto('/user');
  await createUser(page, 'consumer', 'Migration Bob');
  await activateFeed(page);
  const second = await snapshot(page);
  expect(second.users.filter(user => user.displayName.startsWith('Migration '))).toHaveLength(2);
  expect(second.posts.filter(post => post.userId === second.users.find(user => user.displayName === 'Migration Bob')?.id && (post.read || post.savedAt !== null))).toHaveLength(0);
  expect(second.posts.some(post => post.userId === second.users.find(user => user.displayName === 'Migration Bob')?.id && post.title === 'Migration sentinel post')).toBe(true);
  await page.goto('/user');
  await page.getByRole('button', { name: /Migration Alice/ }).click();
  await page.goto('/');
  await ready(page);
  assertSentinel(await snapshot(page));

  for (const route of ['/browse', '/library', '/browse/node/migration-tree:root', '/library/node/migration-tree:font', '/user/settings/activity', '/user/settings/ingestion', '/user/settings/notifications']) {
    await page.goto(route);
    await ready(page);
    await page.reload();
    await ready(page);
  }
  const manifest = await request.get('/manifest.webmanifest');
  expect(manifest.ok()).toBe(true);
  const manifestData: { icons: { src: string }[] } = await manifest.json();
  for (const icon of manifestData.icons) expect((await request.get(icon.src)).ok()).toBe(true);
  await page.goto('/user');
  const button = page.getByRole('button', { name: 'Create', exact: true }).first();
  // Um filho flex tem seu display inline-flex convertido para flex pelo navegador.
  await expect(button).toHaveCSS('display', 'flex');
  await expect(button).toHaveCSS('align-items', 'center');
  await expect(button).toHaveCSS('height', '28px');
  await expect(page.locator('main')).toHaveCSS('overflow-y', 'auto');

  await page.goto('/browse/node/migration-tree:root');
  await ready(page);
  await assertControlled(page);
  await assertActiveBuild(page, request);
  const persisted = await snapshot(page);
  assertSentinel(persisted);
  await context.setOffline(true);
  await page.reload();
  await ready(page);
  assertSentinel(await snapshot(page));
  await context.setOffline(false);

  // Troca de artefato mantendo o mesmo contexto e origin; nunca limpar storage.
  const switchResult = await request.post('/__test/build', { data: { target: 'current' } });
  expect(switchResult.ok()).toBe(true);
  await page.close();
  const afterPage = await context.newPage();
  await afterPage.goto('/browse/node/migration-tree:root');
  await ready(afterPage);
  await afterPage.evaluate(async () => { const reg = await navigator.serviceWorker.ready; await reg.update(); });
  await assertControlled(afterPage);
  await assertActiveBuild(afterPage, request);
  const after = await snapshot(afterPage);
  assertSentinel(after);
  expect(after.schema).toEqual(persisted.schema);
  expect(after.trees).toEqual(persisted.trees);
  expect(after.posts).toEqual(persisted.posts);
  expect(after.storage).toEqual(persisted.storage);
  expect(after.users.map(user => [user.id, user.displayName, user.activateTrees, user.activateNodes])).toEqual(persisted.users.map(user => [user.id, user.displayName, user.activateTrees, user.activateNodes]));
  await context.setOffline(true);
  await afterPage.reload();
  await ready(afterPage);
  assertSentinel(await snapshot(afterPage));
  await context.setOffline(false);
  await testInfo.attach('persistent-data', { body: JSON.stringify(after, null, 2), contentType: 'application/json' });
  expect(errors).toEqual([]);
});

test('WEB-04: publicar e exportar snapshot pelo Creator', async ({ page }) => {
  await page.goto('/user');
  await ready(page);
  await createUser(page, 'creator', 'Migration Creator');
  await page.goto('/pages/new');
  await page.locator('#page-title').fill('Migration publication');
  await page.getByRole('button', { name: 'Create and configure' }).click();
  await expect(page).toHaveURL(/\/pages\/[^/]+$/);
  await page.getByRole('button', { name: 'Publicar', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Publicar', exact: true }).click();
  await expect(page.getByText('Publicado v1')).toBeVisible();
  // ExportButton consulta a publicação quando monta, conforme o comportamento atual.
  await page.reload();
  await ready(page);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.notfeed\.json$/);
  const downloadedPath = await download.path();
  expect(downloadedPath).toBeTruthy();
  const exported = JSON.parse(await readFile(downloadedPath!, 'utf8'));
  expect(Object.keys(exported).sort()).toEqual(['creatorDisplayName', 'exportId', 'exportedAt', 'medias', 'tree', 'version'].sort());
  expect(exported).toMatchObject({ version: 1, creatorDisplayName: 'Migration Creator', medias: [] });
  expect(exported.tree.nodes[exported.tree.paths['/']].data.header.title).toBe('Migration publication');

});

test('árbitro do navegador rejeita perda da sentinela e ausência de controlador', async ({ page }) => {
  expect(() => assertSentinel({ users: [], posts: [], trees: [], schema: [], storage: {} })).toThrow();
  await page.goto('/__fixtures/empty.html');
  await expect(assertControlled(page, 200)).rejects.toThrow();
  expect(() => assertBuildRevisions(['old'], 'new')).toThrow();
  expect(() => assertBuildRevisions(['old', 'new'], 'new')).toThrow();
});
