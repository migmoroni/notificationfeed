/**
 * Standardized error types for the application.
 */

export class NotfeedError extends Error {
	constructor(
		message: string,
		public readonly code: string
	) {
		super(message);
		this.name = 'NotfeedError';
	}
}

export class IngestionError extends NotfeedError {
	constructor(message: string, public readonly fontId: string) {
		super(message, 'INGESTION_ERROR');
		this.name = 'IngestionError';
	}
}

export class PersistenceError extends NotfeedError {
	constructor(message: string) {
		super(message, 'PERSISTENCE_ERROR');
		this.name = 'PersistenceError';
	}
}

export class PlatformError extends NotfeedError {
	constructor(message: string) {
		super(message, 'PLATFORM_ERROR');
		this.name = 'PlatformError';
	}
}
