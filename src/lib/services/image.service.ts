/**
 * Image Service — client-side image processing for uploads.
 *
 * Converts uploaded images to WEBP, resizes to max dimensions per slot,
 * and returns an ImageAsset ready for persistence.
 *
 * Uses Canvas API — browser-only (no server-side usage).
 */

import type { ImageAsset, ImageSlot, AcceptedImageFormat } from '$lib/domain/shared/image-asset.js';
import { IMAGE_MAX_DIMENSIONS, ACCEPTED_IMAGE_FORMATS } from '$lib/domain/shared/image-asset.js';
import { IMAGE_LIMITS } from '$lib/config/back-settings.js';

/**
 * Process an uploaded image file into an ImageAsset.
 *
 * Steps:
 * 1. Validate format against ACCEPTED_IMAGE_FORMATS
 * 2. Load into an HTMLImageElement
 * 3. Resize to fit within IMAGE_MAX_DIMENSIONS[slot]
 * 4. Draw onto canvas, export as WEBP base64
 */
export async function processImage(file: File, slot: ImageSlot): Promise<ImageAsset> {
	// Validate format
	const format = file.type as AcceptedImageFormat;
	if (!ACCEPTED_IMAGE_FORMATS.includes(format)) {
		throw new Error(
			`Formato não suportado: ${file.type}. Aceitos: ${ACCEPTED_IMAGE_FORMATS.join(', ')}`
		);
	}

	// Load image
	const img = await loadImage(file);

	// Calculate target dimensions
	const maxDim = IMAGE_MAX_DIMENSIONS[slot];
	const { width, height } = fitDimensions(img.naturalWidth, img.naturalHeight, maxDim.width, maxDim.height);

	// Draw to canvas and export as WEBP
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;

	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('Canvas 2D context not available');

	ctx.drawImage(img, 0, 0, width, height);

	const dataUrl = canvas.toDataURL('image/webp', IMAGE_LIMITS.webpQuality);
	const base64 = dataUrl.split(',')[1];

	return {
		data: base64,
		width,
		height,
		originalFormat: format,
		slot
	};
}

/**
 * Create a displayable URL from an ImageAsset.
 */
export function createImagePreviewUrl(asset: ImageAsset): string {
	return `data:image/webp;base64,${asset.data}`;
}

// ── Helpers ────────────────────────────────────────────────────────────

function loadImage(file: File): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const url = URL.createObjectURL(file);
		const img = new Image();
		img.onload = () => {
			URL.revokeObjectURL(url);
			resolve(img);
		};
		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error('Falha ao carregar imagem'));
		};
		img.src = url;
	});
}

/**
 * Fit dimensions within maxWidth × maxHeight while preserving aspect ratio.
 * If the image is already smaller, returns original dimensions.
 */
function fitDimensions(
	srcWidth: number,
	srcHeight: number,
	maxWidth: number,
	maxHeight: number
): { width: number; height: number } {
	if (srcWidth <= maxWidth && srcHeight <= maxHeight) {
		return { width: srcWidth, height: srcHeight };
	}

	const ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight);
	return {
		width: Math.round(srcWidth * ratio),
		height: Math.round(srcHeight * ratio)
	};
}
