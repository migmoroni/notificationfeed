/**
 * Ingestion scheduler.
 *
 * Orchestrates polling for RSS/Atom and WebSocket subscriptions for Nostr.
 * Takes ContentNode (role='font') instead of the old Font entity.
 */

import type { ContentNode, FontBody, FontNostrConfig, FontRssConfig, FontAtomConfig } from '$lib/domain/content-node/content-node.js';
import { isFontNode } from '$lib/domain/content-node/content-node.js';
import type { CanonicalPost } from '$lib/normalization/canonical-post.js';
import { createNostrClient } from './nostr/nostr.client.js';
import { fetchRssFeed } from './rss/rss.client.js';
import { fetchAtomFeed } from './atom/atom.client.js';

type OnPostsIngested = (posts: CanonicalPost[]) => void;

interface ActiveSubscription {
	nodeId: string;
	disconnect: () => void;
}

const activeSubscriptions = new Map<string, ActiveSubscription>();
const pollingIntervals = new Map<string, ReturnType<typeof setInterval>>();

const DEFAULT_POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Start ingestion for a font node.
 * Extracts protocol and config from the node's body.
 */
export function startIngestion(node: ContentNode, onPosts: OnPostsIngested): void {
	if (!isFontNode(node)) return;

	const nodeId = node.metadata.id;
	const body = node.data.body as FontBody;

	stopIngestion(nodeId);

	switch (body.protocol) {
		case 'nostr': {
			const client = createNostrClient(body.config as FontNostrConfig, nodeId);
			client.connect((post) => onPosts([post]));
			activeSubscriptions.set(nodeId, { nodeId, disconnect: () => client.disconnect() });
			break;
		}
		case 'rss': {
			const poll = async () => {
				const posts = await fetchRssFeed(body.config as FontRssConfig, nodeId);
				onPosts(posts);
			};
			poll();
			pollingIntervals.set(nodeId, setInterval(poll, DEFAULT_POLL_INTERVAL_MS));
			break;
		}
		case 'atom': {
			const poll = async () => {
				const posts = await fetchAtomFeed(body.config as FontAtomConfig, nodeId);
				onPosts(posts);
			};
			poll();
			pollingIntervals.set(nodeId, setInterval(poll, DEFAULT_POLL_INTERVAL_MS));
			break;
		}
	}
}

export function stopIngestion(nodeId: string): void {
	const sub = activeSubscriptions.get(nodeId);
	if (sub) {
		sub.disconnect();
		activeSubscriptions.delete(nodeId);
	}

	const interval = pollingIntervals.get(nodeId);
	if (interval) {
		clearInterval(interval);
		pollingIntervals.delete(nodeId);
	}
}

export function stopAllIngestion(): void {
	for (const nodeId of activeSubscriptions.keys()) {
		stopIngestion(nodeId);
	}
	for (const nodeId of pollingIntervals.keys()) {
		stopIngestion(nodeId);
	}
}
