import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			fallback: 'index.html'
		}),
		// Manual SW registration: gated by capabilities.platform in $lib/platform/web/sw-register.ts
		// (skipped under Tauri).
		serviceWorker: {
			register: false
		}
	}
};

export default config;
