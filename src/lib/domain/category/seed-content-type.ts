/**
 * Content Type Seed — accessibility taxonomy (schema.org + W3C WAI).
 *
 * Based on schema.org accessibility properties (https://schema.org/accessMode, accessibilityFeature, etc.)
 * and W3C Web Accessibility Initiative guidelines.
 */

import type { SeedCategory } from './category-seed.js';
import type { CategoryDataEntry } from './category-data.js';
import { resolveEntry, deriveDepth } from './category-data.js';
import data from './data/content-type.json';

export const contentTypeSeed: SeedCategory[] = (data as CategoryDataEntry[]).map((e) =>
resolveEntry(e, 'content_type', deriveDepth(e.id, false))
);
