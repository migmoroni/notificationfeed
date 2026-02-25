/**
 * Category Seed — official taxonomy data shipped with the app.
 *
 * This constant is used ONLY for initial population.
 * At runtime, all category data comes from IndexedDB.
 *
 * If the taxonomy changes during development, delete the local DB and reload.
 */

import type { Category, CategoryTreeId } from './category.js';

type SeedCategory = Omit<Category, 'isActive'>;

// ── Subject Tree ───────────────────────────────────────────────────────

const subjectTree: SeedCategory[] = [
	// Technology
	{ id: 'subj-tech',          label: 'Technology',           treeId: 'subject', parentId: null,            depth: 0, order: 0, isSystem: true },
	{ id: 'subj-tech-oss',      label: 'Open Source',          treeId: 'subject', parentId: 'subj-tech',     depth: 1, order: 0, isSystem: true },
	{ id: 'subj-tech-webdev',   label: 'Web Development',      treeId: 'subject', parentId: 'subj-tech',     depth: 1, order: 1, isSystem: true },
	{ id: 'subj-tech-ai',       label: 'Artificial Intelligence', treeId: 'subject', parentId: 'subj-tech',  depth: 1, order: 2, isSystem: true },
	{ id: 'subj-tech-security', label: 'Security',             treeId: 'subject', parentId: 'subj-tech',     depth: 1, order: 3, isSystem: true },
	{ id: 'subj-tech-mobile',   label: 'Mobile',               treeId: 'subject', parentId: 'subj-tech',     depth: 1, order: 4, isSystem: true },
	{ id: 'subj-tech-devops',   label: 'DevOps & Infra',       treeId: 'subject', parentId: 'subj-tech',     depth: 1, order: 5, isSystem: true },

	// Science
	{ id: 'subj-science',       label: 'Science',              treeId: 'subject', parentId: null,            depth: 0, order: 1, isSystem: true },
	{ id: 'subj-science-phys',  label: 'Physics',              treeId: 'subject', parentId: 'subj-science',  depth: 1, order: 0, isSystem: true },
	{ id: 'subj-science-bio',   label: 'Biology',              treeId: 'subject', parentId: 'subj-science',  depth: 1, order: 1, isSystem: true },
	{ id: 'subj-science-space', label: 'Space & Astronomy',    treeId: 'subject', parentId: 'subj-science',  depth: 1, order: 2, isSystem: true },

	// Politics
	{ id: 'subj-politics',       label: 'Politics',            treeId: 'subject', parentId: null,              depth: 0, order: 2, isSystem: true },
	{ id: 'subj-politics-natl',  label: 'National Politics',   treeId: 'subject', parentId: 'subj-politics',  depth: 1, order: 0, isSystem: true },
	{ id: 'subj-politics-intl',  label: 'International Politics', treeId: 'subject', parentId: 'subj-politics', depth: 1, order: 1, isSystem: true },

	// Economy
	{ id: 'subj-economy',        label: 'Economy',             treeId: 'subject', parentId: null,             depth: 0, order: 3, isSystem: true },
	{ id: 'subj-economy-finance', label: 'Finance & Markets',  treeId: 'subject', parentId: 'subj-economy',  depth: 1, order: 0, isSystem: true },
	{ id: 'subj-economy-crypto', label: 'Crypto & Web3',       treeId: 'subject', parentId: 'subj-economy',  depth: 1, order: 1, isSystem: true },
	{ id: 'subj-economy-startup', label: 'Startups',           treeId: 'subject', parentId: 'subj-economy',  depth: 1, order: 2, isSystem: true },

	// Culture
	{ id: 'subj-culture',         label: 'Culture',            treeId: 'subject', parentId: null,             depth: 0, order: 4, isSystem: true },
	{ id: 'subj-culture-gaming',  label: 'Gaming',             treeId: 'subject', parentId: 'subj-culture',  depth: 1, order: 0, isSystem: true },
	{ id: 'subj-culture-music',   label: 'Music',              treeId: 'subject', parentId: 'subj-culture',  depth: 1, order: 1, isSystem: true },
	{ id: 'subj-culture-film',    label: 'Film & TV',          treeId: 'subject', parentId: 'subj-culture',  depth: 1, order: 2, isSystem: true },
	{ id: 'subj-culture-books',   label: 'Books & Literature', treeId: 'subject', parentId: 'subj-culture',  depth: 1, order: 3, isSystem: true },

	// Health
	{ id: 'subj-health',          label: 'Health',             treeId: 'subject', parentId: null,             depth: 0, order: 5, isSystem: true },
	{ id: 'subj-health-fitness',  label: 'Fitness',            treeId: 'subject', parentId: 'subj-health',   depth: 1, order: 0, isSystem: true },
	{ id: 'subj-health-mental',   label: 'Mental Health',      treeId: 'subject', parentId: 'subj-health',   depth: 1, order: 1, isSystem: true },
	{ id: 'subj-health-nutrition', label: 'Nutrition',         treeId: 'subject', parentId: 'subj-health',   depth: 1, order: 2, isSystem: true },

	// Education
	{ id: 'subj-education',       label: 'Education',          treeId: 'subject', parentId: null,             depth: 0, order: 6, isSystem: true },
	{ id: 'subj-education-lang',  label: 'Languages',          treeId: 'subject', parentId: 'subj-education', depth: 1, order: 0, isSystem: true },
	{ id: 'subj-education-math',  label: 'Mathematics',        treeId: 'subject', parentId: 'subj-education', depth: 1, order: 1, isSystem: true }
];

// ── Content Type Tree ──────────────────────────────────────────────────

const contentTypeTree: SeedCategory[] = [
	// Format
	{ id: 'ct-format',           label: 'Format',              treeId: 'content_type', parentId: null,          depth: 0, order: 0, isSystem: true },
	{ id: 'ct-format-news',      label: 'News',                treeId: 'content_type', parentId: 'ct-format',   depth: 1, order: 0, isSystem: true },
	{ id: 'ct-format-analysis',  label: 'Analysis',            treeId: 'content_type', parentId: 'ct-format',   depth: 1, order: 1, isSystem: true },
	{ id: 'ct-format-research',  label: 'Research',            treeId: 'content_type', parentId: 'ct-format',   depth: 1, order: 2, isSystem: true },
	{ id: 'ct-format-tutorial',  label: 'Tutorial',            treeId: 'content_type', parentId: 'ct-format',   depth: 1, order: 3, isSystem: true },
	{ id: 'ct-format-opinion',   label: 'Opinion',             treeId: 'content_type', parentId: 'ct-format',   depth: 1, order: 4, isSystem: true },
	{ id: 'ct-format-review',    label: 'Review',              treeId: 'content_type', parentId: 'ct-format',   depth: 1, order: 5, isSystem: true },
	{ id: 'ct-format-interview', label: 'Interview',           treeId: 'content_type', parentId: 'ct-format',   depth: 1, order: 6, isSystem: true },
	{ id: 'ct-format-podcast',   label: 'Podcast',             treeId: 'content_type', parentId: 'ct-format',   depth: 1, order: 7, isSystem: true },
	{ id: 'ct-format-video',     label: 'Video',               treeId: 'content_type', parentId: 'ct-format',   depth: 1, order: 8, isSystem: true }
];

// ── Full seed ──────────────────────────────────────────────────────────

export const CATEGORY_SEED: SeedCategory[] = [...subjectTree, ...contentTypeTree];
