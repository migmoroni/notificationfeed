import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		include: ['src/**/*.test.ts', '../../packages/notfeed/src/**/*.test.ts'],
		environment: 'jsdom'
	}
});
