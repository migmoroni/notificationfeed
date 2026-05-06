const IMAGE_PATH_RE = /\.(?:avif|webp|png|jpe?g|gif)$/i;
const DIMENSION_SEGMENT_RE = /^(\d{2,4})([x_-])(\d{2,4})$/i;
const NUMERIC_SEGMENT_RE = /^\d{2,4}$/;
const TARGET_WIDTHS = [2048, 1600, 1280, 1024, 800, 640];
const WIDTH_PARAMS = ['w', 'width', 'maxwidth', 'imgmax', 'size', 's', 'mw'];
const HEIGHT_PARAMS = ['h', 'height', 'maxheight', 'imgh', 'mh'];
const QUALITY_PARAMS = ['q', 'quality', 'imgq', 'jpegquality', 'jpgq', 'compression'];
const DPR_PARAMS = ['dpr', 'scale'];
const DIMENSION_CONTEXT_SEGMENTS = new Set([
	'thumb',
	'thumbnail',
	'small',
	'medium',
	'large',
	'standard',
	'preview',
	'images',
	'image',
	'img',
	'photo',
	'photos',
	'media',
	'cdn',
	'width',
	'height',
	'size',
	'resize'
]);

function pushUnique(target: string[], value: string | null | undefined): void {
	if (!value) return;
	if (!target.includes(value)) target.push(value);
}

function cloneWithPathSegment(base: URL, index: number, value: string): string {
	const next = new URL(base.toString());
	const segments = next.pathname.split('/');
	segments[index] = value;
	next.pathname = segments.join('/');
	return next.toString();
}

function getNumericParam(params: URLSearchParams, names: string[]): number | null {
	for (const name of names) {
		const raw = params.get(name);
		if (!raw) continue;
		const value = Number.parseInt(raw, 10);
		if (Number.isFinite(value)) return value;
	}
	return null;
}

function setNumericParamsIfLower(params: URLSearchParams, names: string[], value: number): boolean {
	let changed = false;
	for (const name of names) {
		const raw = params.get(name);
		if (!raw) continue;
		const current = Number.parseInt(raw, 10);
		if (Number.isFinite(current) && current >= value) continue;
		params.set(name, String(value));
		changed = true;
	}
	return changed;
}

function hasLikelyImagePath(url: URL): boolean {
	return IMAGE_PATH_RE.test(url.pathname);
}

function isLikelyDimensionSegment(segments: string[], index: number): boolean {
	const prev = segments[index - 1]?.toLowerCase() ?? '';
	const next = segments[index + 1]?.toLowerCase() ?? '';
	return DIMENSION_CONTEXT_SEGMENTS.has(prev) || DIMENSION_CONTEXT_SEGMENTS.has(next);
}

function getPathDimensionCandidates(url: string): string[] {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		return [];
	}

	if (!hasLikelyImagePath(parsed)) return [];

	const candidates: string[] = [];
	const segments = parsed.pathname.split('/');

	for (let i = 0; i < segments.length; i++) {
		const segment = segments[i];
		const pairMatch = segment.match(DIMENSION_SEGMENT_RE);
		if (!pairMatch) continue;

		const currentW = Number.parseInt(pairMatch[1], 10);
		const separator = pairMatch[2];
		const currentH = Number.parseInt(pairMatch[3], 10);
		if (!Number.isFinite(currentW) || !Number.isFinite(currentH) || currentW <= 0 || currentH <= 0) continue;

		for (const targetW of TARGET_WIDTHS) {
			if (targetW <= currentW) continue;
			const targetH = Math.max(1, Math.round((currentH / currentW) * targetW));
			pushUnique(candidates, cloneWithPathSegment(parsed, i, `${targetW}${separator}${targetH}`));
		}
	}

	const numericSegments: Array<{ index: number; value: number }> = [];
	for (let i = 0; i < segments.length; i++) {
		if (!NUMERIC_SEGMENT_RE.test(segments[i])) continue;
		const value = Number.parseInt(segments[i], 10);
		if (!Number.isFinite(value)) continue;
		if (value < 32 || value > 2048) continue;
		numericSegments.push({ index: i, value });
	}

	if (numericSegments.length > 0) {
		const contextual = numericSegments.filter((entry) => isLikelyDimensionSegment(segments, entry.index));
		const picked = contextual.length === 1 ? contextual[0] : numericSegments.length === 1 ? numericSegments[0] : null;
		if (picked) {
			for (const targetW of TARGET_WIDTHS) {
				if (targetW <= picked.value) continue;
				pushUnique(candidates, cloneWithPathSegment(parsed, picked.index, String(targetW)));
			}
		}
	}

	return candidates;
}

function getQueryDimensionCandidates(url: string): string[] {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		return [];
	}

	const originalWidth = getNumericParam(parsed.searchParams, WIDTH_PARAMS);
	const originalHeight = getNumericParam(parsed.searchParams, HEIGHT_PARAMS);
	const hasDimensionParams = originalWidth != null || originalHeight != null;
	const hasQualityParams = getNumericParam(parsed.searchParams, QUALITY_PARAMS) != null;
	const hasDprParams = getNumericParam(parsed.searchParams, DPR_PARAMS) != null;
	if (!hasDimensionParams && !hasQualityParams && !hasDprParams) return [];

	const candidates: string[] = [];

	for (const targetW of TARGET_WIDTHS.slice(0, 3)) {
		const next = new URL(parsed.toString());
		let changed = false;

		if (setNumericParamsIfLower(next.searchParams, WIDTH_PARAMS, targetW)) {
			changed = true;
		}

		if (originalWidth && originalHeight && originalWidth > 0) {
			const scaledHeight = Math.max(1, Math.round((originalHeight / originalWidth) * targetW));
			if (setNumericParamsIfLower(next.searchParams, HEIGHT_PARAMS, scaledHeight)) {
				changed = true;
			}
		}

		if (setNumericParamsIfLower(next.searchParams, QUALITY_PARAMS, 90)) {
			changed = true;
		}

		if (setNumericParamsIfLower(next.searchParams, DPR_PARAMS, 2)) {
			changed = true;
		}

		if (changed) {
			pushUnique(candidates, next.toString());
		}
	}

	return candidates;
}

/**
 * Builds a deterministic quality preference chain from a source URL.
 *
 * Intended for ingestion-time canonicalization, where the first candidate
 * becomes the stored `imageUrl` and consumers render it directly.
 */
export function getImageQualityCandidates(imageUrl: string | undefined | null): string[] {
	const source = imageUrl?.trim();
	if (!source) return [];

	const candidates: string[] = [];

	for (const candidate of getPathDimensionCandidates(source)) {
		pushUnique(candidates, candidate);
	}

	for (const candidate of getQueryDimensionCandidates(source)) {
		pushUnique(candidates, candidate);
	}

	pushUnique(candidates, source);

	return candidates;
}

/**
 * Resolve the single URL to persist during ingestion.
 */
export function resolveIngestionImageUrl(imageUrl: string | undefined | null): string | undefined {
	const candidates = getImageQualityCandidates(imageUrl);
	return candidates[0];
}