/**
 * Nostr ingestion client.
 *
 * Connects to Nostr relays via WebSocket, subscribes to events
 * based on Font configuration (pubkey, kinds, filters).
 */

import type { FontNostrConfig } from '$lib/domain/font/font.js';
import type { CanonicalPost } from '$lib/normalization/canonical-post.js';
import { normalizeNostrEvent } from '$lib/normalization/nostr.normalizer.js';

export interface NostrEvent {
	id: string;
	pubkey: string;
	created_at: number;
	kind: number;
	tags: string[][];
	content: string;
	sig: string;
}

export type NostrEventHandler = (post: CanonicalPost) => void;

export function createNostrClient(config: FontNostrConfig, fontId: string) {
	let connections: WebSocket[] = [];

	function connect(onEvent: NostrEventHandler): void {
		for (const relay of config.relays) {
			const ws = new WebSocket(relay);

			ws.onopen = () => {
				const filter: Record<string, unknown> = { authors: [config.pubkey] };
				if (config.kinds?.length) filter.kinds = config.kinds;
				ws.send(JSON.stringify(['REQ', `notfeed:${fontId}`, filter]));
			};

			ws.onmessage = (msg) => {
				try {
					const data = JSON.parse(msg.data);
					if (data[0] === 'EVENT' && data[2]) {
						const event = data[2] as NostrEvent;
						onEvent(normalizeNostrEvent(event, fontId));
					}
				} catch {
					// skip malformed messages
				}
			};

			connections.push(ws);
		}
	}

	function disconnect(): void {
		for (const ws of connections) {
			ws.close();
		}
		connections = [];
	}

	return { connect, disconnect };
}
