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
export type { Category, NewCategory, CategoryOrigin } from './domain/category/category.js';

// Domain — Shared Value Objects
export type { ImageAsset, ImageSlot, AcceptedImageFormat } from './domain/shared/image-asset.js';
export type { FollowRef, FollowTargetType, FollowSource } from './domain/shared/follow-ref.js';
export type { ConsumerState, ConsumerEntityType } from './domain/shared/consumer-state.js';

// Normalization
export type { CanonicalPost } from './normalization/canonical-post.js';

// Platform
export { detectPlatform, getCapabilities } from './platform/capabilities.js';
export type { Platform, Capabilities } from './platform/capabilities.js';
