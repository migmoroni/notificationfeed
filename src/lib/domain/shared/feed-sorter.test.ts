/**
 * Unit tests for feed-sorter.
 *
 * Tests the sortByPriority function: bucket grouping + date sorting.
 */

import { describe, it, expect } from 'vitest';
import { sortByPriority } from './feed-sorter.js';
import type { CanonicalPost } from '$lib/normalization/canonical-post.js';
import type { PriorityLevel } from './consumer-state.js';

// ── Helpers ────────────────────────────────────────────────────────────

function makePost(id: string, fontId: string, publishedAt: string): CanonicalPost {
	return {
		id,
		fontId,
		protocol: 'rss',
		title: `Post ${id}`,
		content: 'content',
		url: `https://example.com/${id}`,
		author: 'author',
		publishedAt: new Date(publishedAt),
		ingestedAt: new Date(),
		read: false
	};
}

// ── sortByPriority ─────────────────────────────────────────────────────

describe('sortByPriority', () => {
	it('groups posts by priority: 1 before 2 before 3', () => {
		const posts = [
			makePost('a', 'font-low', '2026-02-10T10:00:00Z'),
			makePost('b', 'font-high', '2026-02-10T10:00:00Z'),
			makePost('c', 'font-med', '2026-02-10T10:00:00Z')
		];

		const priorityMap = new Map<string, PriorityLevel>([
			['font-high', 1],
			['font-med', 2],
			['font-low', 3]
		]);

		const sorted = sortByPriority(posts, priorityMap);

		expect(sorted[0].priority).toBe(1);
		expect(sorted[0].post.id).toBe('b');
		expect(sorted[1].priority).toBe(2);
		expect(sorted[1].post.id).toBe('c');
		expect(sorted[2].priority).toBe(3);
		expect(sorted[2].post.id).toBe('a');
	});

	it('sorts by date descending within each priority bucket', () => {
		const posts = [
			makePost('old', 'font-a', '2026-02-01T10:00:00Z'),
			makePost('new', 'font-a', '2026-02-15T10:00:00Z'),
			makePost('mid', 'font-a', '2026-02-10T10:00:00Z')
		];

		const priorityMap = new Map<string, PriorityLevel>([
			['font-a', 1]
		]);

		const sorted = sortByPriority(posts, priorityMap);

		expect(sorted.map((s) => s.post.id)).toEqual(['new', 'mid', 'old']);
	});

	it('assigns priority 3 to posts with no entry in priorityMap', () => {
		const posts = [
			makePost('known', 'font-known', '2026-02-10T10:00:00Z'),
			makePost('unknown', 'font-unknown', '2026-02-10T10:00:00Z')
		];

		const priorityMap = new Map<string, PriorityLevel>([
			['font-known', 1]
		]);

		const sorted = sortByPriority(posts, priorityMap);

		expect(sorted[0].post.id).toBe('known');
		expect(sorted[0].priority).toBe(1);
		expect(sorted[1].post.id).toBe('unknown');
		expect(sorted[1].priority).toBe(3);
	});

	it('returns empty array for empty input', () => {
		const sorted = sortByPriority([], new Map());
		expect(sorted).toEqual([]);
	});

	it('handles all posts in same priority bucket', () => {
		const posts = [
			makePost('a', 'font-1', '2026-02-01T10:00:00Z'),
			makePost('b', 'font-2', '2026-02-15T10:00:00Z'),
			makePost('c', 'font-3', '2026-02-10T10:00:00Z')
		];

		const priorityMap = new Map<string, PriorityLevel>([
			['font-1', 2],
			['font-2', 2],
			['font-3', 2]
		]);

		const sorted = sortByPriority(posts, priorityMap);

		// All priority 2, sorted by date desc
		expect(sorted.every((s) => s.priority === 2)).toBe(true);
		expect(sorted.map((s) => s.post.id)).toEqual(['b', 'c', 'a']);
	});

	it('interleaves multiple fonts across priorities correctly', () => {
		const posts = [
			makePost('p1-old', 'font-hi', '2026-02-01T10:00:00Z'),
			makePost('p1-new', 'font-hi', '2026-02-15T10:00:00Z'),
			makePost('p3-old', 'font-lo', '2026-02-02T10:00:00Z'),
			makePost('p3-new', 'font-lo', '2026-02-14T10:00:00Z'),
			makePost('p2-mid', 'font-md', '2026-02-10T10:00:00Z')
		];

		const priorityMap = new Map<string, PriorityLevel>([
			['font-hi', 1],
			['font-md', 2],
			['font-lo', 3]
		]);

		const sorted = sortByPriority(posts, priorityMap);
		const ids = sorted.map((s) => s.post.id);

		// Bucket 1: font-hi posts (new first, old second)
		expect(ids[0]).toBe('p1-new');
		expect(ids[1]).toBe('p1-old');
		// Bucket 2: font-md posts
		expect(ids[2]).toBe('p2-mid');
		// Bucket 3: font-lo posts (new first, old second)
		expect(ids[3]).toBe('p3-new');
		expect(ids[4]).toBe('p3-old');
	});
});
