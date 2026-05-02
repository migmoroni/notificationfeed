import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbMock = vi.hoisted(() => ({
	records: [] as any[],
	put: vi.fn(async (item: any) => {
		const idx = dbMock.records.findIndex((r) => r._pk === item._pk);
		if (idx >= 0) dbMock.records[idx] = item;
		else dbMock.records.push(item);
	})
}));

vi.mock('./db.js', () => ({
	getStorageBackend: vi.fn(async () => ({
		posts: {
			async getAll() { return dbMock.records; },
			async getById(id: string) { return dbMock.records.find((r) => r._pk === id) ?? null; },
			async query(index: string, value: unknown) {
				if (index === 'byUser') return dbMock.records.filter((r) => r.userId === value);
				if (index === 'byUserNode') return dbMock.records.filter((r) => r._userNode === value);
				return [];
			},
			put: dbMock.put,
			async delete(id: string) {
				dbMock.records = dbMock.records.filter((r) => r._pk !== id);
			}
		}
	}))
}));

import { trashOldPostsForUser } from './post.store.js';
import { savePostsForUser } from './post.store.js';

const DAY_MS = 86_400_000;
const USER_ID = 'user-1';
const NODE_ID = 'tree-1:font-1';

function post(overrides: Partial<any> = {}) {
	const id = overrides.id ?? 'post-1';
	return {
		_pk: `${USER_ID}|${NODE_ID}|${id}`,
		_userNode: `${USER_ID}|${NODE_ID}`,
		userId: USER_ID,
		nodeId: NODE_ID,
		id,
		protocol: 'jsonfeed',
		title: 'Post',
		content: '',
		url: 'https://example.com/post',
		author: '',
		publishedAt: 0,
		ingestedAt: 0,
		read: false,
		savedAt: null,
		trashedAt: null,
		notifiedAt: null,
		...overrides
	};
}

describe('trashOldPostsForUser', () => {
	beforeEach(() => {
		dbMock.records = [];
		dbMock.put.mockClear();
	});

	it('keeps posts with old publication dates when they were ingested recently', async () => {
		const now = Date.UTC(2026, 4, 1);
		const cutoff = now - 180 * DAY_MS;
		dbMock.records = [post({ publishedAt: Date.UTC(2020, 7, 7), ingestedAt: now - DAY_MS })];

		const count = await trashOldPostsForUser(USER_ID, [NODE_ID], cutoff, now);

		expect(count).toBe(0);
		expect(dbMock.records[0].trashedAt).toBeNull();
	});

	it('trashes posts whose ingestion date is older than the cutoff', async () => {
		const now = Date.UTC(2026, 4, 1);
		const cutoff = now - 180 * DAY_MS;
		dbMock.records = [post({ publishedAt: now - DAY_MS, ingestedAt: cutoff - 1 })];

		const count = await trashOldPostsForUser(USER_ID, [NODE_ID], cutoff, now);

		expect(count).toBe(1);
		expect(dbMock.records[0].trashedAt).toBe(now);
	});
});
describe('savePostsForUser cross-protocol dedup', () => {
	beforeEach(() => {
		dbMock.records = [];
		dbMock.put.mockClear();
	});

	function ingested(id: string, url: string, protocol: string) {
		return {
			userId: USER_ID,
			nodeId: NODE_ID,
			id,
			protocol,
			title: 't',
			content: '',
			url,
			author: '',
			publishedAt: 1,
			ingestedAt: 1,
			read: false,
			savedAt: null,
			trashedAt: null
		} as any;
	}

	it('skips inserting a post when an existing record has the same normalized URL', async () => {
		dbMock.records = [post({ id: 'rss-1', url: 'https://example.com/post' })];
		const res = await savePostsForUser(USER_ID, [
			ingested('atom-1', 'https://example.com/post/', 'atom')
		]);
		expect(res.inserted).toBe(0);
		expect(res.updated).toBe(0);
		expect(dbMock.records).toHaveLength(1);
		expect(dbMock.records[0].id).toBe('rss-1');
	});

	it('inserts when URLs differ even by protocol', async () => {
		dbMock.records = [post({ id: 'rss-1', url: 'https://example.com/a' })];
		const res = await savePostsForUser(USER_ID, [
			ingested('atom-1', 'https://example.com/b', 'atom')
		]);
		expect(res.inserted).toBe(1);
		expect(dbMock.records).toHaveLength(2);
	});

	it('treats trailing-slash and case differences as duplicates', async () => {
		dbMock.records = [post({ id: 'rss-1', url: 'https://Example.COM/x' })];
		const res = await savePostsForUser(USER_ID, [
			ingested('jf-1', 'https://example.com/x/', 'jsonfeed')
		]);
		expect(res.inserted).toBe(0);
		expect(dbMock.records).toHaveLength(1);
	});

	it('updates existing record when same composite id arrives again', async () => {
		dbMock.records = [post({ id: 'p1', url: 'https://example.com/p', title: 'old' })];
		const res = await savePostsForUser(USER_ID, [
			{ ...ingested('p1', 'https://example.com/p', 'rss'), title: 'new' }
		]);
		expect(res.updated).toBe(1);
		expect(res.inserted).toBe(0);
		expect(dbMock.records[0].title).toBe('new');
	});
});
