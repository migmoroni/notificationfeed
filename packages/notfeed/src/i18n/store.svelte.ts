/**
 * i18n language store — Svelte 5 runes.
 *
 * Holds the current language as module-level $state.
 * Svelte automatically tracks reads of currentLanguage in templates,
 * making t() calls reactive.
 */

import { DEFAULT_LANGUAGE, ALL_LANGUAGES } from './types.js';
import type { Language } from './types.js';

let lang = $state<Language>(DEFAULT_LANGUAGE);

/** Current active language (reactive). */
export function currentLanguage(): Language {
	return lang;
}

/** Change the active language. Caller is responsible for persisting to user. */
export function setLanguage(language: Language): void {
	lang = language;
}

/**
 * Detect the best language for initial load.
 * Priority: userLang → navigator match → DEFAULT_LANGUAGE.
 */
export function initLanguage(userLang?: string): Language {
	if (userLang && ALL_LANGUAGES.includes(userLang as Language)) {
		lang = userLang as Language;
		return lang;
	}

	if (typeof navigator !== 'undefined') {
		const browserLangs = navigator.languages ?? [navigator.language];
		for (const bl of browserLangs) {
			const match = ALL_LANGUAGES.find(
				(l) => l === bl || l.startsWith(bl.split('-')[0])
			);
			if (match) {
				lang = match;
				return lang;
			}
		}
	}

	lang = DEFAULT_LANGUAGE;
	return lang;
}
