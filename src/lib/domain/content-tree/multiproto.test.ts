import { describe, it, expect } from 'vitest';
import {
	getPrimaryProtocolEntry,
	getProtocolEntriesByPriority,
	createProtocolEntry
} from './content-tree.js';
import type { FontBody, FontProtocolEntry } from './content-tree.js';

function body(entries: FontProtocolEntry[]): FontBody {
	return { role: 'font', protocols: entries, defaultEnabled: true };
}

describe('getPrimaryProtocolEntry', () => {
	it('returns the entry flagged primary', () => {
		const a = createProtocolEntry('rss', { url: 'a' }, false);
		const b = createProtocolEntry('atom', { url: 'b' }, true);
		expect(getPrimaryProtocolEntry(body([a, b]))?.id).toBe(b.id);
	});

	it('falls back to the first entry when no flag is set', () => {
		const a = createProtocolEntry('rss', { url: 'a' }, false);
		const b = createProtocolEntry('atom', { url: 'b' }, false);
		expect(getPrimaryProtocolEntry(body([a, b]))?.id).toBe(a.id);
	});

	it('returns null on empty array', () => {
		expect(getPrimaryProtocolEntry(body([]))).toBeNull();
	});
});

describe('getProtocolEntriesByPriority', () => {
	it('orders declared primary first, then fallbacks by descending score', () => {
		const p = createProtocolEntry('rss', { url: 'p' }, true);
		const f1 = createProtocolEntry('atom', { url: 'f1' }, false);
		const f2 = createProtocolEntry('jsonfeed', { url: 'f2' }, false);
		const ordered = getProtocolEntriesByPriority(body([p, f1, f2]), {
			[f1.id]: 1,
			[f2.id]: 5
		});
		expect(ordered.map((e) => e.id)).toEqual([p.id, f2.id, f1.id]);
	});

	it('uses effective primary override when provided', () => {
		const p = createProtocolEntry('rss', { url: 'p' }, true);
		const f1 = createProtocolEntry('atom', { url: 'f1' }, false);
		const ordered = getProtocolEntriesByPriority(body([p, f1]), {}, f1.id);
		expect(ordered[0].id).toBe(f1.id);
	});
});

describe('createProtocolEntry', () => {
	it('creates a non-primary entry by default with a unique id', () => {
		const a = createProtocolEntry('rss', { url: 'x' });
		const b = createProtocolEntry('rss', { url: 'x' });
		expect(a.primary).toBe(false);
		expect(b.primary).toBe(false);
		expect(a.id).not.toBe(b.id);
	});
});
