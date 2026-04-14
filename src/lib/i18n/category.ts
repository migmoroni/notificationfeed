/**
 * Category translations — per-tree, per-language label dictionaries.
 *
 * Translation files live in `./languages/category/{locale}/{tree}.json`.
 * Exports tCat(categoryId) which resolves the category label for the
 * current active language, falling back through the language chain.
 */

import { currentLanguage } from './store.svelte.js';
import { DEFAULT_LANGUAGE } from './types.js';
import type { Language } from './types.js';

import enSubject from './languages/category/en-US/subject.json';
import enContentType from './languages/category/en-US/content-type.json';
import enMediaType from './languages/category/en-US/media-type.json';
import enRegion from './languages/category/en-US/region.json';
import enLanguage from './languages/category/en-US/language.json';

import ptSubject from './languages/category/pt-BR/subject.json';
import ptContentType from './languages/category/pt-BR/content-type.json';
import ptMediaType from './languages/category/pt-BR/media-type.json';
import ptRegion from './languages/category/pt-BR/region.json';
import ptLanguage from './languages/category/pt-BR/language.json';

type CatDict = Record<string, string>;

/** Merged per-language category dictionaries (all trees flattened). */
const categoryLabels: Record<Language, CatDict> = {
	'en-US': { ...enSubject, ...enContentType, ...enMediaType, ...enRegion, ...enLanguage },
	'pt-BR': { ...ptSubject, ...ptContentType, ...ptMediaType, ...ptRegion, ...ptLanguage }
};

/**
 * Translate a category by its ID.
 *
 * Reads the current language reactively (Svelte 5 runes),
 * falls back to DEFAULT_LANGUAGE, then to the raw ID.
 */
export function tCat(categoryId: string): string {
	const lang = currentLanguage();
	return (
		categoryLabels[lang]?.[categoryId] ??
		categoryLabels[DEFAULT_LANGUAGE]?.[categoryId] ??
		categoryId
	);
}
