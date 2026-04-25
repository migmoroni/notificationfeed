/**
 * User-scope reset — resets all UI-local filter and selection state that is
 * scoped to the active user. Call this whenever the active user changes so
 * that feed, browse, library, pages and preview all return to their defaults
 * and then re-hydrate from the new user's presets (macros, activations, etc).
 *
 * Does NOT reload data from IndexedDB — callers are responsible for calling
 * `consumer.init()` / `creator.init()` / `feed.loadFeed()` after this.
 */

import { feedEntityFilter } from './feed-entity-filter.svelte.js';
import { browseEntityFilter } from './browse-entity-filter.svelte.js';
import { previewEntityFilter } from './preview-entity-filter.svelte.js';
import { feedCategories } from './feed-categories.svelte.js';
import { browseCategories } from './browse-categories.svelte.js';
import { feedMacros } from './feed-macros.svelte.js';
import { library, ALL_LIBRARY_ID } from './library.svelte.js';
import { sidebarFlyout } from './sidebar-flyout.svelte.js';
import { consumer } from './consumer.svelte.js';
import { creator } from './creator.svelte.js';
import { activeUser } from './active-user.svelte.js';

/** Reset every user-scoped UI store to its default state. */
export function resetUserScopedState(): void {
	// Entity filters across feed / browse / preview
	feedEntityFilter.clearAll();
	browseEntityFilter.clearAll();
	previewEntityFilter.clearAll();

	// Category filters across feed / browse
	feedCategories.clearAll();
	browseCategories.clearAll();

	// Feed macro selection (activeMacroId)
	feedMacros.reset();

	// Library tab selection + multi-select
	library.setActiveTab(ALL_LIBRARY_ID, { silent: true });
	library.clearSelection();

	// Any open sidebar flyout belongs to the previous user's context
	sidebarFlyout.closeAll();

	// Drop stale role-scoped data from the previous user so favorites,
	// activations, trees and medias don't bleed across user switches.
	// Callers are expected to re-hydrate via consumer.init() / creator.init()
	// for the currently active role after this reset.
	const role = activeUser.current?.role ?? null;
	if (role !== 'consumer') consumer.clear();
	if (role !== 'creator') creator.clear();
}
