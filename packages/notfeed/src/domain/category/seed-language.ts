/**
 * Language Seed — language/locale taxonomy (BCP 47).
 *
 * 3-level hierarchy: Language → Language group → Locale variant.
 * Each leaf carries a `bcp47` code for the specific locale.
 *
 * ID scheme (letter "e" = 5th tree):
 *   2nd+3rd chars: language sequence (aa = English, ab = Spanish, …)
 *   4th+5th chars: variant sequence within each language (aa, ab, ac, …)
 *
 * Reference: https://www.iana.org/assignments/language-subtag-registry
 */

import type { SeedCategory } from './category-seed.js';
import type { CategoryDataEntry } from './category-data.js';
import { resolveEntry, deriveDepth } from './category-data.js';
import data from './data/language.json';

export const languageSeed: SeedCategory[] = (data as CategoryDataEntry[]).map((e) =>
	resolveEntry(e, 'language', deriveDepth(e.id, true))
);
