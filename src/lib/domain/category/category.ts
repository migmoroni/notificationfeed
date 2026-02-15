/**
 * Category — hierarchical taxonomy system.
 *
 * Two coexisting branches:
 * - Standard: fixed tree shipped with the app (immutable by users)
 * - Custom: free-form folder-like tree created by UserConsumer only
 *
 * Only sublevels (depth >= 1) can be associated with entities.
 * Root levels are structural groupings only.
 */

export type CategoryOrigin = 'standard' | 'custom';

export interface Category {
	id: string;

	/** Display name */
	label: string;

	/** Parent category ID (null = root) */
	parentId: string | null;

	/** Whether this is a standard (app) or custom (user) category */
	origin: CategoryOrigin;

	/**
	 * Owner — only set for custom categories.
	 * Always references a UserConsumer (creators use standard categories).
	 */
	ownerId: string | null;

	/** Depth in the tree (0 = root, >= 1 = sublevel) */
	depth: number;
}

export type NewCategory = Omit<Category, 'id' | 'depth'>;

/**
 * Contract for Category persistence.
 */
export interface CategoryRepository {
	getAll(): Promise<Category[]>;
	getById(id: string): Promise<Category | null>;
	getByOrigin(origin: CategoryOrigin): Promise<Category[]>;
	getChildren(parentId: string): Promise<Category[]>;
	getByOwnerId(ownerId: string): Promise<Category[]>;
	getSublevels(): Promise<Category[]>;
	create(category: NewCategory): Promise<Category>;
	update(id: string, data: Partial<NewCategory>): Promise<Category>;
	delete(id: string): Promise<void>;
}
