/** Supported languages. */
export type Language = 'en-US' | 'pt-BR';

/** All available languages (ordered for UI display). */
export const ALL_LANGUAGES: readonly Language[] = ['en-US', 'pt-BR'] as const;

/** Fallback language when no user preference is available. */
export const DEFAULT_LANGUAGE: Language = 'en-US';

/** A flat key→value translation dictionary. */
export type Dictionary = Record<string, string>;
