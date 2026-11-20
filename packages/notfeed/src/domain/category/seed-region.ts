/**
 * Region Seed — geographic taxonomy (World / UN M49 macro-regions / ISO 3166-1 standard).
 *
 * The macro-region hierarchy follows the UN M49 standard:
 * https://unstats.un.org/unsd/methodology/m49/
 *
 * The country hierarchy follows the ISO 3166-1 standard:
 * https://www.iso.org/iso-3166-country-codes.html
 */

import type { SeedCategory } from './category-seed.js';
import type { CategoryDataEntry } from './category-data.js';
import { resolveEntry, deriveDepth } from './category-data.js';
import data from './data/region.json';

export const regionSeed: SeedCategory[] = (data as CategoryDataEntry[]).map((e) =>
resolveEntry(e, 'region', deriveDepth(e.id, true))
);
