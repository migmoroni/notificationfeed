/**
 * Content Type Seed — accessibility taxonomy (schema.org + W3C WAI).
 *
 * Based on schema.org accessibility properties (https://schema.org/accessMode, accessibilityFeature, etc.)
 * and W3C Web Accessibility Initiative guidelines.
 */

import type { SeedCategory } from './category-seed.js';

export const contentTypeSeed: SeedCategory[] = [
	// ── accessMode — how the content is perceived ──────────────────────
	{ id: 'ba',                     label: 'Access Mode',            treeId: 'content_type', parentId: null,              depth: 0, order: 0, isSystem: true },
	{ id: 'baaaa',            label: 'Auditory',               treeId: 'content_type', parentId: 'ba',  depth: 1, order: 0, isSystem: true },
	{ id: 'baaab',             label: 'Tactile',                treeId: 'content_type', parentId: 'ba',  depth: 1, order: 1, isSystem: true },
	{ id: 'baaac',             label: 'Textual',                treeId: 'content_type', parentId: 'ba',  depth: 1, order: 2, isSystem: true },
	{ id: 'baaad',              label: 'Visual',                 treeId: 'content_type', parentId: 'ba',  depth: 1, order: 3, isSystem: true },

	// ── accessibilityFeature — assistive features present in the content ──
	{ id: 'bb',                  label: 'Accessibility Feature',  treeId: 'content_type', parentId: null,                  depth: 0, order: 1, isSystem: true },
	{ id: 'bbaaa',         label: 'Alternative Text',       treeId: 'content_type', parentId: 'bb',   depth: 1, order: 0, isSystem: true },
	{ id: 'bbaab',      label: 'Annotations',            treeId: 'content_type', parentId: 'bb',   depth: 1, order: 1, isSystem: true },
	{ id: 'bbaac', label: 'Audio Description',     treeId: 'content_type', parentId: 'bb',   depth: 1, order: 2, isSystem: true },
	{ id: 'bbaad',        label: 'Bookmarks',              treeId: 'content_type', parentId: 'bb',   depth: 1, order: 3, isSystem: true },
	{ id: 'bbaae',         label: 'Captions',               treeId: 'content_type', parentId: 'bb',   depth: 1, order: 4, isSystem: true },
	{ id: 'bbaaf',   label: 'Described Math',         treeId: 'content_type', parentId: 'bb',   depth: 1, order: 5, isSystem: true },
	{ id: 'bbaag',    label: 'High Contrast Display',  treeId: 'content_type', parentId: 'bb',   depth: 1, order: 6, isSystem: true },
	{ id: 'bbaah',            label: 'Index',                  treeId: 'content_type', parentId: 'bb',   depth: 1, order: 7, isSystem: true },
	{ id: 'bbaai',      label: 'Large Print',            treeId: 'content_type', parentId: 'bb',   depth: 1, order: 8, isSystem: true },
	{ id: 'bbaaj', label: 'Long Description',       treeId: 'content_type', parentId: 'bb',   depth: 1, order: 9, isSystem: true },
	{ id: 'bbaak',    label: 'Reading Order',          treeId: 'content_type', parentId: 'bb',   depth: 1, order: 10, isSystem: true },
	{ id: 'bbaal',    label: 'Sign Language',          treeId: 'content_type', parentId: 'bb',   depth: 1, order: 11, isSystem: true },
	{ id: 'bbaam',   label: 'Structural Navigation',  treeId: 'content_type', parentId: 'bb',   depth: 1, order: 12, isSystem: true },
	{ id: 'bbaan',              label: 'Table of Contents',      treeId: 'content_type', parentId: 'bb',   depth: 1, order: 13, isSystem: true },
	{ id: 'bbaao',       label: 'Transcript',             treeId: 'content_type', parentId: 'bb',   depth: 1, order: 14, isSystem: true },

	// ── accessibilityHazard — potential hazards in the content ──
	{ id: 'bc',                   label: 'Accessibility Hazard',   treeId: 'content_type', parentId: null,                depth: 0, order: 2, isSystem: true },
	{ id: 'bcaaa',          label: 'Flashing',               treeId: 'content_type', parentId: 'bc', depth: 1, order: 0, isSystem: true },
	{ id: 'bcaab',        label: 'Motion Simulation',      treeId: 'content_type', parentId: 'bc', depth: 1, order: 1, isSystem: true },
	{ id: 'bcaac',             label: 'Sound',                  treeId: 'content_type', parentId: 'bc', depth: 1, order: 2, isSystem: true },
	{ id: 'bcaad',              label: 'No Known Hazard',        treeId: 'content_type', parentId: 'bc', depth: 1, order: 3, isSystem: true },

	// ── accessibilityControl — input methods supported by the content ──
	{ id: 'bd',                  label: 'Accessibility Control',  treeId: 'content_type', parentId: null,                  depth: 0, order: 3, isSystem: true },
	{ id: 'bdaaa',    label: 'Full Keyboard Control',  treeId: 'content_type', parentId: 'bd',   depth: 1, order: 0, isSystem: true },
	{ id: 'bdaab',       label: 'Full Mouse Control',     treeId: 'content_type', parentId: 'bd',   depth: 1, order: 1, isSystem: true },
	{ id: 'bdaac',      label: 'Full Switch Control',    treeId: 'content_type', parentId: 'bd',   depth: 1, order: 2, isSystem: true },
	{ id: 'bdaad',       label: 'Full Touch Control',     treeId: 'content_type', parentId: 'bd',   depth: 1, order: 3, isSystem: true },
	{ id: 'bdaae',       label: 'Full Voice Control',     treeId: 'content_type', parentId: 'bd',   depth: 1, order: 4, isSystem: true },

	// ── accessModeSufficient — single modes sufficient to consume the content ──
	{ id: 'be',                 label: 'Access Mode Sufficient', treeId: 'content_type', parentId: null,                   depth: 0, order: 4, isSystem: true },
	{ id: 'beaaa',        label: 'Auditory',               treeId: 'content_type', parentId: 'be',  depth: 1, order: 0, isSystem: true },
	{ id: 'beaab',         label: 'Tactile',                treeId: 'content_type', parentId: 'be',  depth: 1, order: 1, isSystem: true },
	{ id: 'beaac',         label: 'Textual',                treeId: 'content_type', parentId: 'be',  depth: 1, order: 2, isSystem: true },
	{ id: 'beaad',          label: 'Visual',                 treeId: 'content_type', parentId: 'be',  depth: 1, order: 3, isSystem: true },

	// ── accessibilityAPI — supported accessibility APIs ──
	{ id: 'bf',                      label: 'Accessibility API',      treeId: 'content_type', parentId: null,             depth: 0, order: 5, isSystem: true },
	{ id: 'bfaaa',                 label: 'ARIA',                   treeId: 'content_type', parentId: 'bf',  depth: 1, order: 0, isSystem: true },
	{ id: 'bfaab',              label: 'Android Accessibility',  treeId: 'content_type', parentId: 'bf',  depth: 1, order: 1, isSystem: true },
	{ id: 'bfaac',                  label: 'ATK/AT-SPI',            treeId: 'content_type', parentId: 'bf',  depth: 1, order: 2, isSystem: true },
	{ id: 'bfaad',                label: 'AT-SPI',                treeId: 'content_type', parentId: 'bf',  depth: 1, order: 3, isSystem: true },
	{ id: 'bfaae',           label: 'BlackBerry Accessibility', treeId: 'content_type', parentId: 'bf', depth: 1, order: 4, isSystem: true },
	{ id: 'bfaaf',         label: 'IAccessible2',           treeId: 'content_type', parentId: 'bf',  depth: 1, order: 5, isSystem: true },
	{ id: 'bfaag',                  label: 'iOS Accessibility',      treeId: 'content_type', parentId: 'bf',  depth: 1, order: 6, isSystem: true },
	{ id: 'bfaah',            label: 'Java Swing',             treeId: 'content_type', parentId: 'bf',  depth: 1, order: 7, isSystem: true },
	{ id: 'bfaai',               label: 'Mac OS X Accessibility', treeId: 'content_type', parentId: 'bf',  depth: 1, order: 8, isSystem: true },
	{ id: 'bfaaj',                 label: 'MSAA',                   treeId: 'content_type', parentId: 'bf',  depth: 1, order: 9, isSystem: true },
	{ id: 'bfaak',                  label: 'UI Automation',          treeId: 'content_type', parentId: 'bf',  depth: 1, order: 10, isSystem: true },
];
