/**
 * Content Type Seed — format taxonomy.
 */

import type { SeedCategory } from './category-seed.js';

export const contentTypeSeed: SeedCategory[] = [
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
	{ id: 'ct-format-video',     label: 'Video',               treeId: 'content_type', parentId: 'ct-format',   depth: 1, order: 8, isSystem: true },
];
