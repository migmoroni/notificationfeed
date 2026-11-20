import { describe, it, expect } from 'vitest';
import { npubToHex } from './bech32.js';

describe('npubToHex', () => {
	it('decodes a known fiatjaf npub to hex', () => {
		// Public test vector — fiatjaf's pubkey
		const npub = 'npub180cvv07tjdrrgpa0j7j7tmnyl2yr6yr7l8j4s3evf6u64th6gkwsyjh6w6';
		expect(npubToHex(npub)).toBe('3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d');
	});

	it('passes through valid 64-char hex unchanged (lowercased)', () => {
		const hex = '3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d';
		expect(npubToHex(hex)).toBe(hex);
		expect(npubToHex(hex.toUpperCase())).toBe(hex);
	});

	it('returns null for malformed input', () => {
		expect(npubToHex('')).toBeNull();
		expect(npubToHex('not-an-npub')).toBeNull();
		expect(npubToHex('npub1invalidchecksum0000000000000000000000000000000000000000000000')).toBeNull();
	});
});
