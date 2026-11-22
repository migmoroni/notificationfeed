/**
 * Translation function — reads current language from the runes store.
 *
 * Because currentLanguage() reads a $state variable, calling t() inside
 * a Svelte 5 template automatically creates a reactive dependency.
 *
 * Supports {varName} interpolation in dictionary values.
 */

import { languages } from './index.js';
import { currentLanguage } from './store.svelte.js';
import { DEFAULT_LANGUAGE } from './types.js';

export function t(key: string, params?: Record<string, string | number>): string {
	const lang = currentLanguage();
	const raw = languages[lang]?.[key] ?? languages[DEFAULT_LANGUAGE]?.[key] ?? key;

	if (!params) return raw;

	return raw.replace(/\{(\w+)\}/g, (_, name) => {
		const val = params[name];
		return val !== undefined ? String(val) : `{${name}}`;
	});
}
