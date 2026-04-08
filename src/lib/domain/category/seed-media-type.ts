/**
 * Media Type Seed — content media taxonomy.
 *
 * Based on Dublin Core DCMI Type Vocabulary (https://www.dublincore.org/specifications/dublin-core/dcmi-type-vocabulary/)
 * combined with schema.org CreativeWork subtypes (https://schema.org/CreativeWork).
 *
 * Each top-level media type branches into content categories typical of that medium.
 */

import type { SeedCategory } from './category-seed.js';

export const mediaTypeSeed: SeedCategory[] = [
	// ── Text (DCMI: Text / schema.org: Article, Review, ScholarlyArticle…) ──
	{ id: 'ca',           label: 'Text',              treeId: 'media_type', parentId: null,             depth: 0, order: 0, isSystem: true },
	{ id: 'caaaa',         label: 'Article',           treeId: 'media_type', parentId: 'ca', depth: 1, order: 0, isSystem: true },
	{ id: 'caaab',           label: 'Essay',             treeId: 'media_type', parentId: 'ca', depth: 1, order: 1, isSystem: true },
	{ id: 'caaac',          label: 'Review',            treeId: 'media_type', parentId: 'ca', depth: 1, order: 2, isSystem: true },
	{ id: 'caaad',         label: 'Opinion / Editorial', treeId: 'media_type', parentId: 'ca', depth: 1, order: 3, isSystem: true },
	{ id: 'caaae',          label: 'Report',            treeId: 'media_type', parentId: 'ca', depth: 1, order: 4, isSystem: true },
	{ id: 'caaaf',        label: 'Academic Paper',    treeId: 'media_type', parentId: 'ca', depth: 1, order: 5, isSystem: true },
	{ id: 'caaag',        label: 'Tutorial / Guide',  treeId: 'media_type', parentId: 'ca', depth: 1, order: 6, isSystem: true },
	{ id: 'caaah',       label: 'Interview',         treeId: 'media_type', parentId: 'ca', depth: 1, order: 7, isSystem: true },
	{ id: 'caaai',      label: 'Newsletter',        treeId: 'media_type', parentId: 'ca', depth: 1, order: 8, isSystem: true },
	{ id: 'caaaj',            label: 'Book / Chapter',    treeId: 'media_type', parentId: 'ca', depth: 1, order: 9, isSystem: true },
	{ id: 'caaak',          label: 'Poetry',            treeId: 'media_type', parentId: 'ca', depth: 1, order: 10, isSystem: true },
	{ id: 'caaal',         label: 'Fiction / Short Story', treeId: 'media_type', parentId: 'ca', depth: 1, order: 11, isSystem: true },
	{ id: 'caaam',       label: 'Reference / Documentation', treeId: 'media_type', parentId: 'ca', depth: 1, order: 12, isSystem: true },

	// ── Image (DCMI: StillImage / schema.org: ImageObject, Photograph…) ──
	{ id: 'cb',          label: 'Image',             treeId: 'media_type', parentId: null,              depth: 0, order: 1, isSystem: true },
	{ id: 'cbaaa',          label: 'Photography',       treeId: 'media_type', parentId: 'cb', depth: 1, order: 0, isSystem: true },
	{ id: 'cbaab',   label: 'Illustration',      treeId: 'media_type', parentId: 'cb', depth: 1, order: 1, isSystem: true },
	{ id: 'cbaac',    label: 'Infographic',       treeId: 'media_type', parentId: 'cb', depth: 1, order: 2, isSystem: true },
	{ id: 'cbaad',        label: 'Diagram / Chart',   treeId: 'media_type', parentId: 'cb', depth: 1, order: 3, isSystem: true },
	{ id: 'cbaae',          label: 'Comic / Cartoon',   treeId: 'media_type', parentId: 'cb', depth: 1, order: 4, isSystem: true },
	{ id: 'cbaaf',            label: 'Map',               treeId: 'media_type', parentId: 'cb', depth: 1, order: 5, isSystem: true },
	{ id: 'cbaag',    label: 'Digital Art',       treeId: 'media_type', parentId: 'cb', depth: 1, order: 6, isSystem: true },
	{ id: 'cbaah',     label: 'Screenshot',        treeId: 'media_type', parentId: 'cb', depth: 1, order: 7, isSystem: true },

	// ── Video (DCMI: MovingImage / schema.org: VideoObject, Movie…) ──
	{ id: 'cc',          label: 'Video',             treeId: 'media_type', parentId: null,              depth: 0, order: 2, isSystem: true },
	{ id: 'ccaaa',    label: 'Documentary',       treeId: 'media_type', parentId: 'cc', depth: 1, order: 0, isSystem: true },
	{ id: 'ccaab',       label: 'Tutorial / How-to', treeId: 'media_type', parentId: 'cc', depth: 1, order: 1, isSystem: true },
	{ id: 'ccaac',           label: 'Vlog',              treeId: 'media_type', parentId: 'cc', depth: 1, order: 2, isSystem: true },
	{ id: 'ccaad',     label: 'Short Film',        treeId: 'media_type', parentId: 'cc', depth: 1, order: 3, isSystem: true },
	{ id: 'ccaae',      label: 'Interview',         treeId: 'media_type', parentId: 'cc', depth: 1, order: 4, isSystem: true },
	{ id: 'ccaaf',        label: 'Lecture / Webinar',  treeId: 'media_type', parentId: 'cc', depth: 1, order: 5, isSystem: true },
	{ id: 'ccaag',     label: 'Live Stream',       treeId: 'media_type', parentId: 'cc', depth: 1, order: 6, isSystem: true },
	{ id: 'ccaah',      label: 'Animation',         treeId: 'media_type', parentId: 'cc', depth: 1, order: 7, isSystem: true },
	{ id: 'ccaai',    label: 'Music Video',       treeId: 'media_type', parentId: 'cc', depth: 1, order: 8, isSystem: true },
	{ id: 'ccaaj',      label: 'News Clip',         treeId: 'media_type', parentId: 'cc', depth: 1, order: 9, isSystem: true },
	{ id: 'ccaak',         label: 'Review',            treeId: 'media_type', parentId: 'cc', depth: 1, order: 10, isSystem: true },

	// ── Audio (DCMI: Sound / schema.org: AudioObject, PodcastEpisode…) ──
	{ id: 'cd',          label: 'Audio',             treeId: 'media_type', parentId: null,              depth: 0, order: 3, isSystem: true },
	{ id: 'cdaaa',        label: 'Podcast',           treeId: 'media_type', parentId: 'cd', depth: 1, order: 0, isSystem: true },
	{ id: 'cdaab',          label: 'Music',             treeId: 'media_type', parentId: 'cd', depth: 1, order: 1, isSystem: true },
	{ id: 'cdaac',      label: 'Audiobook',         treeId: 'media_type', parentId: 'cd', depth: 1, order: 2, isSystem: true },
	{ id: 'cdaad',      label: 'Interview',         treeId: 'media_type', parentId: 'cd', depth: 1, order: 3, isSystem: true },
	{ id: 'cdaae',        label: 'Lecture',            treeId: 'media_type', parentId: 'cd', depth: 1, order: 4, isSystem: true },
	{ id: 'cdaaf',          label: 'Radio Show',        treeId: 'media_type', parentId: 'cd', depth: 1, order: 5, isSystem: true },
	{ id: 'cdaag',     label: 'Commentary',        treeId: 'media_type', parentId: 'cd', depth: 1, order: 6, isSystem: true },

	// ── Interactive (DCMI: InteractiveResource / schema.org: WebApplication…) ──
	{ id: 'ce',    label: 'Interactive',       treeId: 'media_type', parentId: null,                   depth: 0, order: 4, isSystem: true },
	{ id: 'ceaaa',        label: 'Interactive Article', treeId: 'media_type', parentId: 'ce', depth: 1, order: 0, isSystem: true },
	{ id: 'ceaab',      label: 'Slideshow',         treeId: 'media_type', parentId: 'ce', depth: 1, order: 1, isSystem: true },
	{ id: 'ceaac',       label: 'Data Visualization', treeId: 'media_type', parentId: 'ce', depth: 1, order: 2, isSystem: true },
	{ id: 'ceaad',         label: 'Web Application',   treeId: 'media_type', parentId: 'ce', depth: 1, order: 3, isSystem: true },
	{ id: 'ceaae',           label: 'Game',              treeId: 'media_type', parentId: 'ce', depth: 1, order: 4, isSystem: true },
	{ id: 'ceaaf',   label: 'Virtual Tour',      treeId: 'media_type', parentId: 'ce', depth: 1, order: 5, isSystem: true },
];

