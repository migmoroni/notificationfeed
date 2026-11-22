import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			fallback: 'index.html'
		}),
		// Force absolute asset URLs (e.g. /_app/immutable/...). Required because
		// composite nodeIds carry a colon (`treeId:localUuid`) and appear as the
		// last path segment in routes like /browse/node/<treeId:localUuid>. With
		// the default `paths.relative = true`, the browser would resolve dynamic
		// chunk imports relative to that segment and request `/browse/node/_app/...`,
		// which 404s and breaks the page.
		paths: {
			relative: false
		},
		// Manual SW registration: gated by capabilities.platform in $lib/platform/web/sw-register.ts
		// (skipped under Tauri).
		serviceWorker: {
			register: false
		}
	}
};

export default config;
