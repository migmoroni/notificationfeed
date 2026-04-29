#!/usr/bin/env node
/**
 * Generate PWA icons from a single SVG source.
 *
 * Inputs:  static/icons/source.svg
 * Outputs:
 *   static/icons/icon-192.png            (any-purpose)
 *   static/icons/icon-512.png            (any-purpose)
 *   static/icons/icon-maskable-512.png   (maskable, with safe padding)
 *   static/icons/apple-touch-icon.png    (180x180)
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ICONS_DIR = join(ROOT, 'static', 'icons');
const SOURCE = join(ICONS_DIR, 'source.svg');

async function render(source, size, outName, { maskable = false } = {}) {
	// Maskable icons reserve a "safe zone" of ~80% in the center.
	// Render the SVG smaller within a transparent canvas, then composite a solid background.
	if (maskable) {
		const inner = Math.round(size * 0.72);
		const innerBuf = await sharp(source).resize(inner, inner).png().toBuffer();
		const out = await sharp({
			create: {
				width: size,
				height: size,
				channels: 4,
				background: { r: 10, g: 10, b: 10, alpha: 1 }
			}
		})
			.composite([{ input: innerBuf, gravity: 'center' }])
			.png()
			.toBuffer();
		await writeFile(join(ICONS_DIR, outName), out);
	} else {
		const buf = await sharp(source).resize(size, size).png().toBuffer();
		await writeFile(join(ICONS_DIR, outName), buf);
	}
	console.log(`✓ ${outName} (${size}×${size})`);
}

async function main() {
	await mkdir(ICONS_DIR, { recursive: true });
	const svg = await readFile(SOURCE);
	await render(svg, 192, 'icon-192.png');
	await render(svg, 512, 'icon-512.png');
	await render(svg, 512, 'icon-maskable-512.png', { maskable: true });
	await render(svg, 180, 'apple-touch-icon.png');
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
