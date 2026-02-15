import type { Font, NewFont } from './font.js';

/**
 * Contract for Font persistence.
 * Implementations live in `$lib/persistence/`.
 */
export interface FontRepository {
	getAll(): Promise<Font[]>;
	getByProfileId(profileId: string): Promise<Font[]>;
	getById(id: string): Promise<Font | null>;
	create(font: NewFont): Promise<Font>;
	update(id: string, data: Partial<NewFont>): Promise<Font>;
	delete(id: string): Promise<void>;
}
