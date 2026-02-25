/**
 * Unit tests for image.service.ts
 *
 * Tests the pure utility functions. Canvas-dependent functions
 * (processImage) require a browser environment and are tested via E2E.
 */

import { describe, it, expect } from 'vitest';
import { createImagePreviewUrl } from './image.service.js';
import type { ImageAsset } from '$lib/domain/shared/image-asset.js';

// ── Helpers ────────────────────────────────────────────────────────────

function makeAsset(overrides: Partial<ImageAsset> = {}): ImageAsset {
	return {
		data: 'dGVzdA==', // "test" in base64
		width: 200,
		height: 200,
		originalFormat: 'image/png',
		slot: 'avatar',
		...overrides
	};
}

// ── createImagePreviewUrl ──────────────────────────────────────────────

describe('createImagePreviewUrl', () => {
	it('returns a data URL with webp mime and base64 data', () => {
		const asset = makeAsset({ data: 'abc123' });
		const url = createImagePreviewUrl(asset);
		expect(url).toBe('data:image/webp;base64,abc123');
	});

	it('handles empty data gracefully', () => {
		const asset = makeAsset({ data: '' });
		const url = createImagePreviewUrl(asset);
		expect(url).toBe('data:image/webp;base64,');
	});

	it('preserves long base64 strings', () => {
		const longData = 'A'.repeat(10000);
		const asset = makeAsset({ data: longData });
		const url = createImagePreviewUrl(asset);
		expect(url).toContain(longData);
		expect(url.startsWith('data:image/webp;base64,')).toBe(true);
	});
});
