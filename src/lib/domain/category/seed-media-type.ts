/**
 * Media Type Seed — primary media format taxonomy.
 */

import type { SeedCategory } from './category-seed.js';

export const mediaTypeSeed: SeedCategory[] = [
	{ id: 'mt-media',       label: 'Media Type',  treeId: 'media_type', parentId: null,        depth: 0, order: 0, isSystem: true },
	{ id: 'mt-media-text',  label: 'Text',        treeId: 'media_type', parentId: 'mt-media',  depth: 1, order: 0, isSystem: true },
	{ id: 'mt-media-image', label: 'Image',       treeId: 'media_type', parentId: 'mt-media',  depth: 1, order: 1, isSystem: true },
	{ id: 'mt-media-video', label: 'Video',       treeId: 'media_type', parentId: 'mt-media',  depth: 1, order: 2, isSystem: true },
	{ id: 'mt-media-audio', label: 'Audio',       treeId: 'media_type', parentId: 'mt-media',  depth: 1, order: 3, isSystem: true },
	{ id: 'mt-media-mixed', label: 'Mixed',       treeId: 'media_type', parentId: 'mt-media',  depth: 1, order: 4, isSystem: true },
];
