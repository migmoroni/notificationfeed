// Notfeed — $lib barrel exports

// Domain — User
export type { UserBase, UserRole } from './domain/user/user.js';
export type { UserConsumer, NewUserConsumer } from './domain/user/user-consumer.js';
export type { UserCreator, NewUserCreator, NostrKeypair, SyncStatus } from './domain/user/user-creator.js';

// Domain — CreatorPage
export type { CreatorPage, NewCreatorPage, PageSyncStatus } from './domain/creator-page/creator-page.js';
export type { PageExport, ProfileSnapshot, FontSnapshot } from './domain/creator-page/page-export.js';

// Domain — Profile
export type { Profile, NewProfile } from './domain/profile/profile.js';

// Domain — Font
export type { Font, NewFont, FontProtocol, FontConfig } from './domain/font/font.js';

// Domain — Category
export type { Category, NewCategory, CategoryTreeId } from './domain/category/category.js';
export { CATEGORY_SEED, CATEGORY_SEED_VERSION } from './domain/category/category-seed.js';

// Domain — Category Assignment
export type { CategoryAssignment } from './domain/shared/category-assignment.js';
export { MAX_CATEGORIES_PER_TREE, validateAssignments } from './domain/shared/category-assignment.js';

// Domain — Favorite Tab
export type { FavoriteTab } from './domain/favorite-tab/favorite-tab.js';
export type { FavoriteTabRepository } from './domain/favorite-tab/favorite-tab.js';

// Domain — Shared Value Objects
export type { ImageAsset, ImageSlot, AcceptedImageFormat } from './domain/shared/image-asset.js';
export type { FollowRef, FollowTargetType, FollowSource } from './domain/shared/follow-ref.js';
export type { ConsumerState, ConsumerEntityType, PriorityLevel } from './domain/shared/consumer-state.js';

// Domain — Services
export { resolveEffectivePriority, buildStateMap, buildPriorityMap } from './domain/shared/priority-resolver.js';
export type { PriorityContext } from './domain/shared/priority-resolver.js';
export { sortByPriority } from './domain/shared/feed-sorter.js';
export type { SortedPost } from './domain/shared/feed-sorter.js';

// Layout
export { layout, initLayout } from './stores/layout.svelte.js';
export type { LayoutMode, LayoutState, InputCapability } from './stores/layout.svelte.js';

// Stores — Consumer
export { consumer } from './stores/consumer.svelte.js';

// Stores — Feed
export { feed } from './stores/feed.svelte.js';

// Stores — Browse
export { browse } from './stores/browse.svelte.js';
export type { BrowseEntity } from './stores/browse.svelte.js';

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
export { CategoryTree, TreeSelector, EntityCard, EntityList, SearchBar, FontDetail } from './components/browse/index.js';
export type { PriorityFilterValue } from './components/feed/index.js';
