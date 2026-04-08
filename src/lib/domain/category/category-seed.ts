/**
 * Category Seed — official taxonomy data shipped with the app.
 *
 * This constant is used ONLY for initial population.
 * At runtime, all category data comes from IndexedDB.
 *
 * If the taxonomy changes during development, delete the local DB and reload.
 *
 * Each tree lives in its own file to keep things manageable:
 *   seed-subject.ts      — IPTC NewsCodes Media Topics (17 topics)
 *   seed-content-type.ts — accessibility taxonomy (schema.org + W3C WAI)
 *   seed-media-type.ts   — content media taxonomy (DCMI + schema.org)
 *   seed-region.ts       — geographic taxonomy
 */

import type { Category } from './category.js';
import { subjectSeed } from './seed-subject.js';
import { contentTypeSeed } from './seed-content-type.js';
import { mediaTypeSeed } from './seed-media-type.js';
import { regionSeed } from './seed-region.js';

export type SeedCategory = Omit<Category, 'isActive'>;

export const CATEGORY_SEED: SeedCategory[] = [
	...subjectSeed,
	...contentTypeSeed,
	...mediaTypeSeed,
	...regionSeed,
];
