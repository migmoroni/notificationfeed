/**
 * Media Type Seed — content media taxonomy.
 *
 * Based on Dublin Core DCMI Type Vocabulary (https://www.dublincore.org/specifications/dublin-core/dcmi-type-vocabulary/)
 * combined with schema.org CreativeWork subtypes (https://schema.org/CreativeWork).
 *
 * Each top-level media type branches into content categories typical of that medium.
 */

import type { SeedCategory } from './category-seed.js';
import type { CategoryDataEntry } from './category-data.js';
import { resolveEntry, deriveDepth } from './category-data.js';
import data from './data/media.json';

export const mediaSeed: SeedCategory[] = (data as CategoryDataEntry[]).map((e) =>
resolveEntry(e, 'media', deriveDepth(e.id, false))
);
