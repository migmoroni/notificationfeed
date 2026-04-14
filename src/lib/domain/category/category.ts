/**
 * Category — official hierarchical taxonomy system.
 *
 * All categories are system-defined (shipped with the app via seed).
 * Multiple independent trees coexist, identified by `treeId`:
 * - "subject" (a): IPTC NewsCodes topic taxonomy
 * - "content_type" (b): accessibility taxonomy (schema.org + W3C WAI)
 * - "media_type" (c): content media taxonomy (DCMI + schema.org)
 * - "region" (d): geographic taxonomy (UN M49 + ISO 3166-1)
 * - "language" (e): language/locale taxonomy (BCP 47)
 *
 * IDs use a compact letter-based scheme (2-5 letters):
 *   1st: tree (a/b/c/d/e) · 2nd: root branch · 3rd: sub-branch or 'a' placeholder
 *   4th-5th: leaf index
 *   Each position uses a-z then A-Z (52 values per slot).
 *
 * Language tree (e) uses a sequential pair scheme:
 *   2nd+3rd chars: language sequence (aa, ab, ac, …)
 *   4th+5th chars: variant sequence within each language (aa, ab, ac, …)
 *   Each leaf carries a `bcp47` code (e.g. "pt-BR").
 *
 * Only sublevels (depth >= 1) can be associated with entities.
 * Root levels are structural groupings only.
 *
 * The seed data is used only for initial population.
 * At runtime, all data comes from IndexedDB.
 */

/** Identifies which tree a category belongs to */
export type CategoryTreeId = 'subject' | 'content_type' | 'region' | 'media_type' | 'language';

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

	/** BCP 47 language tag (only present for language tree leaves) */
	bcp47?: string;
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
