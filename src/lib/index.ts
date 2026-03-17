// Notfeed — $lib barrel exports

// Domain — User
export type { UserBase, UserRole } from './domain/user/user.js';
export type { UserConsumer, NewUserConsumer, TreeActivation, NodeActivation, FavoriteTab } from './domain/user/user-consumer.js';
export { SYSTEM_FAVORITES_TAB_ID } from './domain/user/user-consumer.js';
export type { UserCreator, NewUserCreator, NostrKeypair, SyncStatus } from './domain/user/user-creator.js';
export type { PriorityLevel } from './domain/user/priority-level.js';

// Domain — Content Model
export type { ContentNode, ContentNodeHeader, NodeRole, CreatorBody, ProfileBody, FontBody } from './domain/content-node/content-node.js';
export type { ContentTree, TreeSection } from './domain/content-tree/content-tree.js';
export type { ContentMedia } from './domain/content-media/content-media.js';
export type { TreeExport } from './domain/tree-export/tree-export.js';
export type { TreePublication } from './domain/tree-export/tree-publication.js';

// Domain — Category
export type { Category, NewCategory, CategoryTreeId } from './domain/category/category.js';
export { CATEGORY_SEED } from './domain/category/category-seed.js';

// Domain — Category Assignment
export type { CategoryAssignment } from './domain/shared/category-assignment.js';
export { SUGGESTED_CATEGORIES_PER_TREE, validateAssignments } from './domain/shared/category-assignment.js';

// Domain — Favorite Tab
export type { FavoriteTab as FavoriteTabDomain } from './domain/favorite-tab/favorite-tab.js';
export type { FavoriteTabRepository } from './domain/favorite-tab/favorite-tab.js';

// Domain — Shared Value Objects
export type { ImageAsset, ImageSlot, AcceptedImageFormat } from './domain/shared/image-asset.js';

// Domain — Services
export { buildNodeActivationMap, resolveEffectivePriority, buildPriorityMap, buildPriorityMapMultiTree } from './domain/shared/priority-resolver.js';
export { sortByPriority } from './domain/shared/feed-sorter.js';
export type { SortedPost } from './domain/shared/feed-sorter.js';

// Layout
export { layout, initLayout } from './stores/layout.svelte.js';
export type { LayoutMode, LayoutState, InputCapability } from './stores/layout.svelte.js';

// Stores — Consumer
export { consumer } from './stores/consumer.svelte.js';

// Stores — Creator
export { creator } from './stores/creator.svelte.js';
export { previewFeed } from './stores/preview-feed.svelte.js';

// Stores — Feed
export { feed } from './stores/feed.svelte.js';

// Stores — Browse
export { browse } from './stores/browse.svelte.js';

// Stores — Favorites
export { favorites } from './stores/favorites.svelte.js';
export type { FavoriteItem } from './stores/favorites.svelte.js';

// Normalization
export type { CanonicalPost } from './normalization/canonical-post.js';

// Platform
export { detectPlatform, getCapabilities } from './platform/capabilities.js';
export type { Platform, Capabilities } from './platform/capabilities.js';

// Utils — Date
export { formatRelativeDate, formatShortDate } from './utils/date.js';

// Components — Feed
export { PostCard, FeedList, PriorityFilter, CategoryFilter } from './components/feed/index.js';
export type { PriorityFilterValue } from './components/feed/index.js';

// Components — Browse
export { SearchBar } from './components/browse/index.js';
export { default as CategoryTree } from './components/shared/CategoryTree.svelte';
export { default as TreeSelector } from './components/shared/TreeSelector.svelte';
export { EntityCard, EntityList, NodeDetailPage } from './components/shared/entity/index.js';

// Components — Creator
export {
	TagInput, CategoryPicker,
	MediaUpload, NodeForm, NodeHeaderForm,
	TreeEditor, PublishButton, ExportButton,
	CopyFromConsumerDialog
} from './components/creator/index.js';

// Services
export { processImage, createImagePreviewUrl } from './services/image.service.js';
export { downloadTreeExport, exportTree } from './services/export.service.js';
export { copyNodesToCreator } from './services/copy-consumer.service.js';
