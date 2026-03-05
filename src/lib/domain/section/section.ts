/**
 * Section — visual grouping within a container (CreatorPage or Profile).
 *
 * Sections are a purely organizational layer:
 * - A CreatorPage uses Sections to group its Profiles.
 * - A Profile uses Sections to group its Fonts.
 *
 * Sections are flat (no nesting), do NOT create routes, do NOT affect
 * feed/sync/ranking/priority, and deleting a Section only clears
 * `sectionId` on children — never deletes entities.
 *
 * Storage: sections are grouped inside a SectionContainer (one record
 * per containerId in IndexedDB). This gives O(1) lookup by container.
 *
 * Invariants:
 * - No cross-container references — a Section can only be referenced
 *   by children of its container.
 * - No sub-sections — Sections are strictly one level deep.
 * - Title max 30 chars.
 * - `order` is sibling-scoped (meaningful within a single container).
 * - Entities with `sectionId: null` belong to the virtual "Sem seção" group.
 */

export type SectionContainerType = 'creator' | 'profile';

/** A single section item within a container. */
export interface Section {
	id: string;

	/** Display name (max 30 chars) */
	title: string;

	/** CSS color value (e.g. '#4a90d9', 'oklch(...)') */
	color: string;

	/** Sort order among siblings in the same container (0-based) */
	order: number;

	createdAt: Date;
}

export type NewSection = Omit<Section, 'id' | 'createdAt'>;

/**
 * Grouped storage unit — one record per containerId.
 * The keyPath in IndexedDB is `containerId`.
 */
export interface SectionContainer {
	/** The creatorPageId (if 'creator') or profileId (if 'profile') */
	containerId: string;

	/** What kind of container this holds sections for */
	containerType: SectionContainerType;

	/** All sections for this container, ordered by `order` */
	sections: Section[];
}

/**
 * Contract for Section persistence (container-based).
 */
export interface SectionRepository {
	getAll(): Promise<SectionContainer[]>;
	getByContainer(containerId: string): Promise<SectionContainer | null>;
	saveContainer(container: SectionContainer): Promise<void>;
	deleteContainer(containerId: string): Promise<void>;
}
