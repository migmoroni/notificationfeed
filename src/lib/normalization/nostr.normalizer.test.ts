import { describe, expect, it } from 'vitest';
import { normalizeNostrEvent } from './nostr.normalizer.js';
import type { NostrEvent } from '$lib/ingestion/nostr/nostr.client.js';

const NODE_ID = 'tree-1:font-1';

describe('normalizeNostrEvent', () => {
	it('uses imageUrl captured by client from nostr tags', () => {
		const event: NostrEvent = {
			id: 'event-1',
			pubkey: 'pubkey-1',
			created_at: 1777000000,
			kind: 1,
			tags: [['image', 'https://cdn.example.com/nostr/pic.jpg']],
			content: 'post content',
			sig: 'sig-1',
			imageUrl: 'https://cdn.example.com/nostr/pic.jpg'
		};

		const post = normalizeNostrEvent(event, NODE_ID);
		expect(post.imageUrl).toBe('https://cdn.example.com/nostr/pic.jpg');
	});

	it('falls back to image URL present in content text', () => {
		const event: NostrEvent = {
			id: 'event-2',
			pubkey: 'pubkey-2',
			created_at: 1777001000,
			kind: 1,
			tags: [['p', 'someone']],
			content: 'look https://images.example.com/feed/photo.webp for details',
			sig: 'sig-2'
		};

		const post = normalizeNostrEvent(event, NODE_ID);
		expect(post.imageUrl).toBe('https://images.example.com/feed/photo.webp');
	});

	it('uses videoUrl captured by client from nostr tags', () => {
		const event: NostrEvent = {
			id: 'event-3',
			pubkey: 'pubkey-3',
			created_at: 1777002000,
			kind: 1,
			tags: [['video', 'https://cdn.example.com/nostr/video.mp4']],
			content: 'post content',
			sig: 'sig-3',
			videoUrl: 'https://cdn.example.com/nostr/video.mp4'
		};

		const post = normalizeNostrEvent(event, NODE_ID);
		expect(post.videoUrl).toBe('https://cdn.example.com/nostr/video.mp4');
	});

	it('falls back to video URL in content text', () => {
		const event: NostrEvent = {
			id: 'event-4',
			pubkey: 'pubkey-4',
			created_at: 1777003000,
			kind: 1,
			tags: [['p', 'someone']],
			content: 'watch https://videos.example.com/note-4.webm now',
			sig: 'sig-4'
		};

		const post = normalizeNostrEvent(event, NODE_ID);
		expect(post.videoUrl).toBe('https://videos.example.com/note-4.webm');
	});

	it('uses audioUrl captured by client from nostr tags', () => {
		const event: NostrEvent = {
			id: 'event-5',
			pubkey: 'pubkey-5',
			created_at: 1777004000,
			kind: 1,
			tags: [['audio', 'https://cdn.example.com/nostr/audio.mp3']],
			content: 'post content',
			sig: 'sig-5',
			audioUrl: 'https://cdn.example.com/nostr/audio.mp3'
		};

		const post = normalizeNostrEvent(event, NODE_ID);
		expect(post.audioUrl).toBe('https://cdn.example.com/nostr/audio.mp3');
	});

	it('falls back to audio URL in content text', () => {
		const event: NostrEvent = {
			id: 'event-6',
			pubkey: 'pubkey-6',
			created_at: 1777005000,
			kind: 1,
			tags: [['p', 'someone']],
			content: 'listen https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC now',
			sig: 'sig-6'
		};

		const post = normalizeNostrEvent(event, NODE_ID);
		expect(post.audioUrl).toBe('https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC');
	});
});
