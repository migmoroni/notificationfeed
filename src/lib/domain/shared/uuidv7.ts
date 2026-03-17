/**
 * UUIDv7 generator — timestamp-ordered, globally unique IDs.
 *
 * Uses native crypto.getRandomValues for randomness.
 * Embeds a millisecond-precision Unix timestamp in the first 48 bits,
 * ensuring natural chronological ordering when sorted lexicographically.
 *
 * Format: xxxxxxxx-xxxx-7xxx-yxxx-xxxxxxxxxxxx
 *   - Bits  0–47:  Unix timestamp in ms
 *   - Bits 48–51:  Version (0b0111 = 7)
 *   - Bits 52–63:  Random
 *   - Bits 64–65:  Variant (0b10)
 *   - Bits 66–127: Random
 */

export function uuidv7(): string {
	const now = Date.now();

	const bytes = new Uint8Array(16);
	crypto.getRandomValues(bytes);

	// Encode timestamp (48 bits) into bytes 0–5
	bytes[0] = (now / 2 ** 40) & 0xff;
	bytes[1] = (now / 2 ** 32) & 0xff;
	bytes[2] = (now / 2 ** 24) & 0xff;
	bytes[3] = (now / 2 ** 16) & 0xff;
	bytes[4] = (now / 2 ** 8) & 0xff;
	bytes[5] = now & 0xff;

	// Set version 7 (bits 48–51)
	bytes[6] = (bytes[6] & 0x0f) | 0x70;

	// Set variant 10 (bits 64–65)
	bytes[8] = (bytes[8] & 0x3f) | 0x80;

	const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
