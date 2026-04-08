/**
 * Content Type Seed — accessibility taxonomy (schema.org + W3C WAI).
 *
 * Based on schema.org accessibility properties (https://schema.org/accessMode, accessibilityFeature, etc.)
 * and W3C Web Accessibility Initiative guidelines.
 */

import type { SeedCategory } from './category-seed.js';

export const contentTypeSeed: SeedCategory[] = [
	// ── accessMode — how the content is perceived ──────────────────────
	{ id: 'ct-access-mode',                     label: 'Access Mode',            treeId: 'content_type', parentId: null,              depth: 0, order: 0, isSystem: true },
	{ id: 'ct-access-mode-auditory',            label: 'Auditory',               treeId: 'content_type', parentId: 'ct-access-mode',  depth: 1, order: 0, isSystem: true },
	{ id: 'ct-access-mode-tactile',             label: 'Tactile',                treeId: 'content_type', parentId: 'ct-access-mode',  depth: 1, order: 1, isSystem: true },
	{ id: 'ct-access-mode-textual',             label: 'Textual',                treeId: 'content_type', parentId: 'ct-access-mode',  depth: 1, order: 2, isSystem: true },
	{ id: 'ct-access-mode-visual',              label: 'Visual',                 treeId: 'content_type', parentId: 'ct-access-mode',  depth: 1, order: 3, isSystem: true },

	// ── accessibilityFeature — assistive features present in the content ──
	{ id: 'ct-access-feature',                  label: 'Accessibility Feature',  treeId: 'content_type', parentId: null,                  depth: 0, order: 1, isSystem: true },
	{ id: 'ct-access-feature-alt-text',         label: 'Alternative Text',       treeId: 'content_type', parentId: 'ct-access-feature',   depth: 1, order: 0, isSystem: true },
	{ id: 'ct-access-feature-annotations',      label: 'Annotations',            treeId: 'content_type', parentId: 'ct-access-feature',   depth: 1, order: 1, isSystem: true },
	{ id: 'ct-access-feature-audio-description', label: 'Audio Description',     treeId: 'content_type', parentId: 'ct-access-feature',   depth: 1, order: 2, isSystem: true },
	{ id: 'ct-access-feature-bookmarks',        label: 'Bookmarks',              treeId: 'content_type', parentId: 'ct-access-feature',   depth: 1, order: 3, isSystem: true },
	{ id: 'ct-access-feature-captions',         label: 'Captions',               treeId: 'content_type', parentId: 'ct-access-feature',   depth: 1, order: 4, isSystem: true },
	{ id: 'ct-access-feature-described-math',   label: 'Described Math',         treeId: 'content_type', parentId: 'ct-access-feature',   depth: 1, order: 5, isSystem: true },
	{ id: 'ct-access-feature-high-contrast',    label: 'High Contrast Display',  treeId: 'content_type', parentId: 'ct-access-feature',   depth: 1, order: 6, isSystem: true },
	{ id: 'ct-access-feature-index',            label: 'Index',                  treeId: 'content_type', parentId: 'ct-access-feature',   depth: 1, order: 7, isSystem: true },
	{ id: 'ct-access-feature-large-print',      label: 'Large Print',            treeId: 'content_type', parentId: 'ct-access-feature',   depth: 1, order: 8, isSystem: true },
	{ id: 'ct-access-feature-long-description', label: 'Long Description',       treeId: 'content_type', parentId: 'ct-access-feature',   depth: 1, order: 9, isSystem: true },
	{ id: 'ct-access-feature-reading-order',    label: 'Reading Order',          treeId: 'content_type', parentId: 'ct-access-feature',   depth: 1, order: 10, isSystem: true },
	{ id: 'ct-access-feature-sign-language',    label: 'Sign Language',          treeId: 'content_type', parentId: 'ct-access-feature',   depth: 1, order: 11, isSystem: true },
	{ id: 'ct-access-feature-structural-nav',   label: 'Structural Navigation',  treeId: 'content_type', parentId: 'ct-access-feature',   depth: 1, order: 12, isSystem: true },
	{ id: 'ct-access-feature-toc',              label: 'Table of Contents',      treeId: 'content_type', parentId: 'ct-access-feature',   depth: 1, order: 13, isSystem: true },
	{ id: 'ct-access-feature-transcript',       label: 'Transcript',             treeId: 'content_type', parentId: 'ct-access-feature',   depth: 1, order: 14, isSystem: true },

	// ── accessibilityHazard — potential hazards in the content ──
	{ id: 'ct-access-hazard',                   label: 'Accessibility Hazard',   treeId: 'content_type', parentId: null,                depth: 0, order: 2, isSystem: true },
	{ id: 'ct-access-hazard-flashing',          label: 'Flashing',               treeId: 'content_type', parentId: 'ct-access-hazard', depth: 1, order: 0, isSystem: true },
	{ id: 'ct-access-hazard-motion-sim',        label: 'Motion Simulation',      treeId: 'content_type', parentId: 'ct-access-hazard', depth: 1, order: 1, isSystem: true },
	{ id: 'ct-access-hazard-sound',             label: 'Sound',                  treeId: 'content_type', parentId: 'ct-access-hazard', depth: 1, order: 2, isSystem: true },
	{ id: 'ct-access-hazard-none',              label: 'No Known Hazard',        treeId: 'content_type', parentId: 'ct-access-hazard', depth: 1, order: 3, isSystem: true },

	// ── accessibilityControl — input methods supported by the content ──
	{ id: 'ct-access-control',                  label: 'Accessibility Control',  treeId: 'content_type', parentId: null,                  depth: 0, order: 3, isSystem: true },
	{ id: 'ct-access-control-full-keyboard',    label: 'Full Keyboard Control',  treeId: 'content_type', parentId: 'ct-access-control',   depth: 1, order: 0, isSystem: true },
	{ id: 'ct-access-control-full-mouse',       label: 'Full Mouse Control',     treeId: 'content_type', parentId: 'ct-access-control',   depth: 1, order: 1, isSystem: true },
	{ id: 'ct-access-control-full-switch',      label: 'Full Switch Control',    treeId: 'content_type', parentId: 'ct-access-control',   depth: 1, order: 2, isSystem: true },
	{ id: 'ct-access-control-full-touch',       label: 'Full Touch Control',     treeId: 'content_type', parentId: 'ct-access-control',   depth: 1, order: 3, isSystem: true },
	{ id: 'ct-access-control-full-voice',       label: 'Full Voice Control',     treeId: 'content_type', parentId: 'ct-access-control',   depth: 1, order: 4, isSystem: true },

	// ── accessModeSufficient — single modes sufficient to consume the content ──
	{ id: 'ct-access-mode-suf',                 label: 'Access Mode Sufficient', treeId: 'content_type', parentId: null,                   depth: 0, order: 4, isSystem: true },
	{ id: 'ct-access-mode-suf-auditory',        label: 'Auditory',               treeId: 'content_type', parentId: 'ct-access-mode-suf',  depth: 1, order: 0, isSystem: true },
	{ id: 'ct-access-mode-suf-tactile',         label: 'Tactile',                treeId: 'content_type', parentId: 'ct-access-mode-suf',  depth: 1, order: 1, isSystem: true },
	{ id: 'ct-access-mode-suf-textual',         label: 'Textual',                treeId: 'content_type', parentId: 'ct-access-mode-suf',  depth: 1, order: 2, isSystem: true },
	{ id: 'ct-access-mode-suf-visual',          label: 'Visual',                 treeId: 'content_type', parentId: 'ct-access-mode-suf',  depth: 1, order: 3, isSystem: true },

	// ── accessibilityAPI — supported accessibility APIs ──
	{ id: 'ct-access-api',                      label: 'Accessibility API',      treeId: 'content_type', parentId: null,             depth: 0, order: 5, isSystem: true },
	{ id: 'ct-access-api-aria',                 label: 'ARIA',                   treeId: 'content_type', parentId: 'ct-access-api',  depth: 1, order: 0, isSystem: true },
	{ id: 'ct-access-api-android',              label: 'Android Accessibility',  treeId: 'content_type', parentId: 'ct-access-api',  depth: 1, order: 1, isSystem: true },
	{ id: 'ct-access-api-atk',                  label: 'ATK/AT-SPI',            treeId: 'content_type', parentId: 'ct-access-api',  depth: 1, order: 2, isSystem: true },
	{ id: 'ct-access-api-atspi',                label: 'AT-SPI',                treeId: 'content_type', parentId: 'ct-access-api',  depth: 1, order: 3, isSystem: true },
	{ id: 'ct-access-api-blackberry',           label: 'BlackBerry Accessibility', treeId: 'content_type', parentId: 'ct-access-api', depth: 1, order: 4, isSystem: true },
	{ id: 'ct-access-api-iaccessible2',         label: 'IAccessible2',           treeId: 'content_type', parentId: 'ct-access-api',  depth: 1, order: 5, isSystem: true },
	{ id: 'ct-access-api-ios',                  label: 'iOS Accessibility',      treeId: 'content_type', parentId: 'ct-access-api',  depth: 1, order: 6, isSystem: true },
	{ id: 'ct-access-api-javaswing',            label: 'Java Swing',             treeId: 'content_type', parentId: 'ct-access-api',  depth: 1, order: 7, isSystem: true },
	{ id: 'ct-access-api-macosx',               label: 'Mac OS X Accessibility', treeId: 'content_type', parentId: 'ct-access-api',  depth: 1, order: 8, isSystem: true },
	{ id: 'ct-access-api-msaa',                 label: 'MSAA',                   treeId: 'content_type', parentId: 'ct-access-api',  depth: 1, order: 9, isSystem: true },
	{ id: 'ct-access-api-uia',                  label: 'UI Automation',          treeId: 'content_type', parentId: 'ct-access-api',  depth: 1, order: 10, isSystem: true },
];
