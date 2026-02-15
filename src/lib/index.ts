// Notfeed — $lib barrel exports
// Domain
export type { Profile, NewProfile } from './domain/profile/profile.js';
export type { Font, NewFont, FontProtocol, FontConfig } from './domain/font/font.js';

// Normalization
export type { CanonicalPost } from './normalization/canonical-post.js';

// Platform
export { detectPlatform, getCapabilities } from './platform/capabilities.js';
export type { Platform, Capabilities } from './platform/capabilities.js';
