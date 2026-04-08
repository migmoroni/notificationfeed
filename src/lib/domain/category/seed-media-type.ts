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
	{ id: 'mt-media-text',           label: 'Text',              treeId: 'media_type', parentId: null,             depth: 0, order: 0, isSystem: true },
	{ id: 'mt-text-article',         label: 'Article',           treeId: 'media_type', parentId: 'mt-media-text', depth: 1, order: 0, isSystem: true },
	{ id: 'mt-text-essay',           label: 'Essay',             treeId: 'media_type', parentId: 'mt-media-text', depth: 1, order: 1, isSystem: true },
	{ id: 'mt-text-review',          label: 'Review',            treeId: 'media_type', parentId: 'mt-media-text', depth: 1, order: 2, isSystem: true },
	{ id: 'mt-text-opinion',         label: 'Opinion / Editorial', treeId: 'media_type', parentId: 'mt-media-text', depth: 1, order: 3, isSystem: true },
	{ id: 'mt-text-report',          label: 'Report',            treeId: 'media_type', parentId: 'mt-media-text', depth: 1, order: 4, isSystem: true },
	{ id: 'mt-text-academic',        label: 'Academic Paper',    treeId: 'media_type', parentId: 'mt-media-text', depth: 1, order: 5, isSystem: true },
	{ id: 'mt-text-tutorial',        label: 'Tutorial / Guide',  treeId: 'media_type', parentId: 'mt-media-text', depth: 1, order: 6, isSystem: true },
	{ id: 'mt-text-interview',       label: 'Interview',         treeId: 'media_type', parentId: 'mt-media-text', depth: 1, order: 7, isSystem: true },
	{ id: 'mt-text-newsletter',      label: 'Newsletter',        treeId: 'media_type', parentId: 'mt-media-text', depth: 1, order: 8, isSystem: true },
	{ id: 'mt-text-book',            label: 'Book / Chapter',    treeId: 'media_type', parentId: 'mt-media-text', depth: 1, order: 9, isSystem: true },
	{ id: 'mt-text-poetry',          label: 'Poetry',            treeId: 'media_type', parentId: 'mt-media-text', depth: 1, order: 10, isSystem: true },
	{ id: 'mt-text-fiction',         label: 'Fiction / Short Story', treeId: 'media_type', parentId: 'mt-media-text', depth: 1, order: 11, isSystem: true },
	{ id: 'mt-text-reference',       label: 'Reference / Documentation', treeId: 'media_type', parentId: 'mt-media-text', depth: 1, order: 12, isSystem: true },

	// ── Image (DCMI: StillImage / schema.org: ImageObject, Photograph…) ──
	{ id: 'mt-media-image',          label: 'Image',             treeId: 'media_type', parentId: null,              depth: 0, order: 1, isSystem: true },
	{ id: 'mt-image-photo',          label: 'Photography',       treeId: 'media_type', parentId: 'mt-media-image', depth: 1, order: 0, isSystem: true },
	{ id: 'mt-image-illustration',   label: 'Illustration',      treeId: 'media_type', parentId: 'mt-media-image', depth: 1, order: 1, isSystem: true },
	{ id: 'mt-image-infographic',    label: 'Infographic',       treeId: 'media_type', parentId: 'mt-media-image', depth: 1, order: 2, isSystem: true },
	{ id: 'mt-image-diagram',        label: 'Diagram / Chart',   treeId: 'media_type', parentId: 'mt-media-image', depth: 1, order: 3, isSystem: true },
	{ id: 'mt-image-comic',          label: 'Comic / Cartoon',   treeId: 'media_type', parentId: 'mt-media-image', depth: 1, order: 4, isSystem: true },
	{ id: 'mt-image-map',            label: 'Map',               treeId: 'media_type', parentId: 'mt-media-image', depth: 1, order: 5, isSystem: true },
	{ id: 'mt-image-digital-art',    label: 'Digital Art',       treeId: 'media_type', parentId: 'mt-media-image', depth: 1, order: 6, isSystem: true },
	{ id: 'mt-image-screenshot',     label: 'Screenshot',        treeId: 'media_type', parentId: 'mt-media-image', depth: 1, order: 7, isSystem: true },

	// ── Video (DCMI: MovingImage / schema.org: VideoObject, Movie…) ──
	{ id: 'mt-media-video',          label: 'Video',             treeId: 'media_type', parentId: null,              depth: 0, order: 2, isSystem: true },
	{ id: 'mt-video-documentary',    label: 'Documentary',       treeId: 'media_type', parentId: 'mt-media-video', depth: 1, order: 0, isSystem: true },
	{ id: 'mt-video-tutorial',       label: 'Tutorial / How-to', treeId: 'media_type', parentId: 'mt-media-video', depth: 1, order: 1, isSystem: true },
	{ id: 'mt-video-vlog',           label: 'Vlog',              treeId: 'media_type', parentId: 'mt-media-video', depth: 1, order: 2, isSystem: true },
	{ id: 'mt-video-short-film',     label: 'Short Film',        treeId: 'media_type', parentId: 'mt-media-video', depth: 1, order: 3, isSystem: true },
	{ id: 'mt-video-interview',      label: 'Interview',         treeId: 'media_type', parentId: 'mt-media-video', depth: 1, order: 4, isSystem: true },
	{ id: 'mt-video-lecture',        label: 'Lecture / Webinar',  treeId: 'media_type', parentId: 'mt-media-video', depth: 1, order: 5, isSystem: true },
	{ id: 'mt-video-livestream',     label: 'Live Stream',       treeId: 'media_type', parentId: 'mt-media-video', depth: 1, order: 6, isSystem: true },
	{ id: 'mt-video-animation',      label: 'Animation',         treeId: 'media_type', parentId: 'mt-media-video', depth: 1, order: 7, isSystem: true },
	{ id: 'mt-video-music-video',    label: 'Music Video',       treeId: 'media_type', parentId: 'mt-media-video', depth: 1, order: 8, isSystem: true },
	{ id: 'mt-video-news-clip',      label: 'News Clip',         treeId: 'media_type', parentId: 'mt-media-video', depth: 1, order: 9, isSystem: true },
	{ id: 'mt-video-review',         label: 'Review',            treeId: 'media_type', parentId: 'mt-media-video', depth: 1, order: 10, isSystem: true },

	// ── Audio (DCMI: Sound / schema.org: AudioObject, PodcastEpisode…) ──
	{ id: 'mt-media-audio',          label: 'Audio',             treeId: 'media_type', parentId: null,              depth: 0, order: 3, isSystem: true },
	{ id: 'mt-audio-podcast',        label: 'Podcast',           treeId: 'media_type', parentId: 'mt-media-audio', depth: 1, order: 0, isSystem: true },
	{ id: 'mt-audio-music',          label: 'Music',             treeId: 'media_type', parentId: 'mt-media-audio', depth: 1, order: 1, isSystem: true },
	{ id: 'mt-audio-audiobook',      label: 'Audiobook',         treeId: 'media_type', parentId: 'mt-media-audio', depth: 1, order: 2, isSystem: true },
	{ id: 'mt-audio-interview',      label: 'Interview',         treeId: 'media_type', parentId: 'mt-media-audio', depth: 1, order: 3, isSystem: true },
	{ id: 'mt-audio-lecture',        label: 'Lecture',            treeId: 'media_type', parentId: 'mt-media-audio', depth: 1, order: 4, isSystem: true },
	{ id: 'mt-audio-radio',          label: 'Radio Show',        treeId: 'media_type', parentId: 'mt-media-audio', depth: 1, order: 5, isSystem: true },
	{ id: 'mt-audio-commentary',     label: 'Commentary',        treeId: 'media_type', parentId: 'mt-media-audio', depth: 1, order: 6, isSystem: true },

	// ── Interactive (DCMI: InteractiveResource / schema.org: WebApplication…) ──
	{ id: 'mt-media-interactive',    label: 'Interactive',       treeId: 'media_type', parentId: null,                   depth: 0, order: 4, isSystem: true },
	{ id: 'mt-inter-article',        label: 'Interactive Article', treeId: 'media_type', parentId: 'mt-media-interactive', depth: 1, order: 0, isSystem: true },
	{ id: 'mt-inter-slideshow',      label: 'Slideshow',         treeId: 'media_type', parentId: 'mt-media-interactive', depth: 1, order: 1, isSystem: true },
	{ id: 'mt-inter-data-viz',       label: 'Data Visualization', treeId: 'media_type', parentId: 'mt-media-interactive', depth: 1, order: 2, isSystem: true },
	{ id: 'mt-inter-webapp',         label: 'Web Application',   treeId: 'media_type', parentId: 'mt-media-interactive', depth: 1, order: 3, isSystem: true },
	{ id: 'mt-inter-game',           label: 'Game',              treeId: 'media_type', parentId: 'mt-media-interactive', depth: 1, order: 4, isSystem: true },
	{ id: 'mt-inter-virtual-tour',   label: 'Virtual Tour',      treeId: 'media_type', parentId: 'mt-media-interactive', depth: 1, order: 5, isSystem: true },
];

