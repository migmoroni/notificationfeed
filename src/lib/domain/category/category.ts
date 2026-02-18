/**
 * Category — official hierarchical taxonomy system.
 *
 * All categories are system-defined (shipped with the app via seed).
 * Multiple independent trees coexist, identified by `treeId`:
 * - "subject": topic taxonomy (e.g., Open Source, Politics, Science)
 * - "content_type": format taxonomy (e.g., News, Analysis, Research)
 *
 * Only sublevels (depth >= 1) can be associated with entities.
 * Root levels are structural groupings only.
 *
 * The seed JSON is used only for initial population and migrations.
 * At runtime, all data comes from IndexedDB.
 */

/** Identifies which tree a category belongs to */
export type CategoryTreeId = 'subject' | 'content_type';

export interface Category {
	id: string;

	/** Display name */
	label: string;

	/** Which tree this category belongs to */
	treeId: CategoryTreeId;

	/** Parent category ID (null = root). Must share the same treeId. */
	parentId: string | null;

	/** Depth in the tree (0 = root, >= 1 = sublevel) */
	depth: number;

	/** Sort order among siblings */
	order: number;

	/** Always true — indicates system-managed category */
	isSystem: boolean;

	/** Whether the user has this category active locally */
	isActive: boolean;
}

export type NewCategory = Omit<Category, 'id' | 'depth'>;

/**
 * Contract for Category persistence.
 */
export interface CategoryRepository {
	getAll(): Promise<Category[]>;
	getById(id: string): Promise<Category | null>;
	getByTreeId(treeId: CategoryTreeId): Promise<Category[]>;
	getChildren(parentId: string): Promise<Category[]>;
	getRoots(treeId?: CategoryTreeId): Promise<Category[]>;
	getSublevels(treeId?: CategoryTreeId): Promise<Category[]>;
	create(category: NewCategory): Promise<Category>;
	update(id: string, data: Partial<NewCategory>): Promise<Category>;
	delete(id: string): Promise<void>;
}
