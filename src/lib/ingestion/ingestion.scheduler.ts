/**
 * Ingestion scheduler.
 *
 * Orchestrates polling for RSS/Atom fonts and manages
 * WebSocket subscriptions for Nostr fonts.
 */

import type { Font } from '$lib/domain/font/font.js';
import type { CanonicalPost } from '$lib/normalization/canonical-post.js';
import { createNostrClient } from './nostr/nostr.client.js';
import { fetchRssFeed } from './rss/rss.client.js';
import { fetchAtomFeed } from './atom/atom.client.js';

type OnPostsIngested = (posts: CanonicalPost[]) => void;

interface ActiveSubscription {
	fontId: string;
	disconnect: () => void;
}

const activeSubscriptions = new Map<string, ActiveSubscription>();
const pollingIntervals = new Map<string, ReturnType<typeof setInterval>>();

const DEFAULT_POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export function startIngestion(font: Font, onPosts: OnPostsIngested): void {
	stopIngestion(font.id);

	switch (font.protocol) {
		case 'nostr': {
			const client = createNostrClient(font.config as Parameters<typeof createNostrClient>[0], font.id);
			client.connect((post) => onPosts([post]));
			activeSubscriptions.set(font.id, { fontId: font.id, disconnect: () => client.disconnect() });
			break;
		}
		case 'rss': {
			const poll = async () => {
				const posts = await fetchRssFeed(font.config as Parameters<typeof fetchRssFeed>[0], font.id);
				onPosts(posts);
			};
			poll();
			pollingIntervals.set(font.id, setInterval(poll, DEFAULT_POLL_INTERVAL_MS));
			break;
		}
		case 'atom': {
			const poll = async () => {
				const posts = await fetchAtomFeed(font.config as Parameters<typeof fetchAtomFeed>[0], font.id);
				onPosts(posts);
			};
			poll();
			pollingIntervals.set(font.id, setInterval(poll, DEFAULT_POLL_INTERVAL_MS));
			break;
		}
	}
}

export function stopIngestion(fontId: string): void {
	const sub = activeSubscriptions.get(fontId);
	if (sub) {
		sub.disconnect();
		activeSubscriptions.delete(fontId);
	}

	const interval = pollingIntervals.get(fontId);
	if (interval) {
		clearInterval(interval);
		pollingIntervals.delete(fontId);
	}
}

export function stopAllIngestion(): void {
	for (const fontId of activeSubscriptions.keys()) {
		stopIngestion(fontId);
	}
	for (const fontId of pollingIntervals.keys()) {
		stopIngestion(fontId);
	}
}
