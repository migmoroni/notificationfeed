/**
 * i18n — zero-dependency internationalization system.
 *
 * Flat JSON dictionaries, Svelte 5 runes store, reactive t() function.
 * Language is persisted per-user in IndexedDB.
 */

import enUS from './languages/en-US.json';
import ptBR from './languages/pt-BR.json';
import type { Dictionary, Language } from './types.js';

export { type Language, type Dictionary, ALL_LANGUAGES, DEFAULT_LANGUAGE } from './types.js';
export { currentLanguage, setLanguage, initLanguage } from './store.svelte.ts';
export { t } from './t.ts';
export { tCat } from './category.ts';

export const languages: Record<Language, Dictionary> = {
	'en-US': enUS,
	'pt-BR': ptBR
};
