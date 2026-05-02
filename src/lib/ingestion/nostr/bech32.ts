/**
 * Minimal NIP-19 bech32 decoder for `npub` → 64-char hex pubkey.
 *
 * Nostr relays expect `authors` filters to contain raw hex pubkeys
 * (32 bytes = 64 hex chars). Users typically copy/paste the bech32
 * `npub1...` form, so we normalize on the way in.
 *
 * Implements just enough of BIP-173 bech32 (not bech32m) to decode
 * a 32-byte payload. No encoding, no error correction.
 */

const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';

function polymod(values: number[]): number {
	const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
	let chk = 1;
	for (const v of values) {
		const top = chk >> 25;
		chk = ((chk & 0x1ffffff) << 5) ^ v;
		for (let i = 0; i < 5; i++) if ((top >> i) & 1) chk ^= GEN[i];
	}
	return chk;
}

function hrpExpand(hrp: string): number[] {
	const out: number[] = [];
	for (let i = 0; i < hrp.length; i++) out.push(hrp.charCodeAt(i) >> 5);
	out.push(0);
	for (let i = 0; i < hrp.length; i++) out.push(hrp.charCodeAt(i) & 31);
	return out;
}

function verifyChecksum(hrp: string, data: number[]): boolean {
	return polymod(hrpExpand(hrp).concat(data)) === 1;
}

function bech32Decode(s: string): { hrp: string; data: number[] } | null {
	if (s.length < 8 || s.length > 1023) return null;
	const lower = s.toLowerCase();
	if (s !== lower && s !== s.toUpperCase()) return null;
	const sep = lower.lastIndexOf('1');
	if (sep < 1 || sep + 7 > lower.length) return null;
	const hrp = lower.slice(0, sep);
	for (let i = 0; i < hrp.length; i++) {
		const c = hrp.charCodeAt(i);
		if (c < 33 || c > 126) return null;
	}
	const data: number[] = [];
	for (let i = sep + 1; i < lower.length; i++) {
		const idx = CHARSET.indexOf(lower[i]);
		if (idx === -1) return null;
		data.push(idx);
	}
	if (!verifyChecksum(hrp, data)) return null;
	return { hrp, data: data.slice(0, data.length - 6) };
}

function fromWords(words: number[]): number[] | null {
	let acc = 0;
	let bits = 0;
	const out: number[] = [];
	const maxv = (1 << 8) - 1;
	for (const w of words) {
		if (w < 0 || w >> 5 !== 0) return null;
		acc = (acc << 5) | w;
		bits += 5;
		while (bits >= 8) {
			bits -= 8;
			out.push((acc >> bits) & maxv);
		}
	}
	if (bits >= 5 || ((acc << (8 - bits)) & maxv) !== 0) return null;
	return out;
}

function bytesToHex(bytes: number[]): string {
	return bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Decode an `npub1...` bech32 string into a 64-char lowercase hex
 * pubkey. Returns the input unchanged when it already looks like a
 * valid hex pubkey, and `null` for malformed inputs.
 */
export function npubToHex(input: string): string | null {
	if (!input) return null;
	const trimmed = input.trim();
	if (/^[0-9a-f]{64}$/i.test(trimmed)) return trimmed.toLowerCase();
	if (!trimmed.toLowerCase().startsWith('npub1')) return null;
	const decoded = bech32Decode(trimmed);
	if (!decoded || decoded.hrp !== 'npub') return null;
	const bytes = fromWords(decoded.data);
	if (!bytes || bytes.length !== 32) return null;
	return bytesToHex(bytes);
}
