/**
 * Non-reactive translation lookup — safe to call from contexts where
 * the Svelte 5 runes store is unavailable (service worker, isomorphic
 * post-manager, etc.). Imports the JSON dictionaries directly without
 * touching `store.svelte.ts`.
 *
 * Use this from background code that knows which user's language it
 * is producing output for. UI code should keep using the reactive
 * `t()` from `./t.ts`.
 */

import enUS from './languages/en-US.json';
import ptBR from './languages/pt-BR.json';
import { DEFAULT_LANGUAGE, type Dictionary, type Language } from './types.js';

const dictionaries: Record<Language, Dictionary> = {
	'en-US': enUS,
	'pt-BR': ptBR
};

/**
 * Translate `key` for an explicit language, with optional
 * `{name}` interpolation. Falls back to the default language and
 * finally to the raw key when no entry is found.
 */
export function tFor(
	lang: string | undefined,
	key: string,
	params?: Record<string, string | number>
): string {
	const resolved: Language =
		(lang && (lang in dictionaries) ? (lang as Language) : DEFAULT_LANGUAGE);
	const raw =
		dictionaries[resolved]?.[key] ??
		dictionaries[DEFAULT_LANGUAGE]?.[key] ??
		key;

	if (!params) return raw;
	return raw.replace(/\{(\w+)\}/g, (_, name) => {
		const val = params[name];
		return val !== undefined ? String(val) : `{${name}}`;
	});
}
