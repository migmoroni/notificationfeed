/**
 * Subject Seed — IPTC NewsCodes Media Topics taxonomy.
 *
 * 17 top-level topics with standard subtopics.
 * Reference: https://cv.iptc.org/newscodes/mediatopic/
 */

import type { SeedCategory } from './category-seed.js';
import type { CategoryDataEntry } from './category-data.js';
import { resolveEntry, deriveDepth } from './category-data.js';
import data from './data/subject.json';

export const subjectSeed: SeedCategory[] = (data as CategoryDataEntry[]).map((e) =>
resolveEntry(e, 'subject', deriveDepth(e.id, false))
);
