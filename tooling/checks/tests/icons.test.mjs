import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
	copyFileSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	readdirSync,
	rmSync,
	symlinkSync
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execute, hash } from '../io.mjs';

test('gerador real preserva quatro PNGs e padding maskable sem alterar assets versionados', async () => {
	const web = path.resolve('apps/web');
	const sourceIcons = path.join(web, 'static/icons');
	const original = () =>
		readdirSync(sourceIcons)
			.sort()
			.map((name) => [name, hash(readFileSync(path.join(sourceIcons, name)))]);
	const before = original();
	const directory = mkdtempSync(path.join(tmpdir(), 'notfeed-icons-'));
	const icons = path.join(directory, 'static/icons');
	const sharp = createRequire(path.join(web, 'package.json'))('sharp');
	try {
		mkdirSync(path.join(directory, 'scripts'), { recursive: true });
		mkdirSync(icons, { recursive: true });
		copyFileSync(
			path.join(web, 'scripts/generate-icons.mjs'),
			path.join(directory, 'scripts/generate-icons.mjs')
		);
		copyFileSync(path.join(sourceIcons, 'source.svg'), path.join(icons, 'source.svg'));
		symlinkSync(path.join(web, 'node_modules'), path.join(directory, 'node_modules'));
		await execute(process.execPath, ['scripts/generate-icons.mjs'], {
			cwd: directory,
			timeoutMs: 30000
		});
		const expected = [
			['icon-192.png', 192],
			['icon-512.png', 512],
			['icon-maskable-512.png', 512],
			['apple-touch-icon.png', 180]
		];
		assert.deepEqual(
			readdirSync(icons).sort(),
			['source.svg', ...expected.map(([name]) => name)].sort()
		);
		for (const [name, size] of expected) {
			const metadata = await sharp(path.join(icons, name)).metadata();
			assert.equal(metadata.format, 'png');
			assert.equal(metadata.width, size);
			assert.equal(metadata.height, size);
		}
		const { data, info } = await sharp(path.join(icons, 'icon-maskable-512.png'))
			.ensureAlpha()
			.raw()
			.toBuffer({ resolveWithObject: true });
		assert.equal(info.channels, 4);
		for (const [x, y] of [
			[0, 0],
			[511, 0],
			[0, 511],
			[511, 511]
		]) {
			const offset = (y * info.width + x) * info.channels;
			assert.deepEqual([...data.subarray(offset, offset + 4)], [10, 10, 10, 255]);
		}
	} finally {
		rmSync(directory, { recursive: true, force: true });
		assert.deepEqual(original(), before, 'assets versionados foram alterados');
	}
});
