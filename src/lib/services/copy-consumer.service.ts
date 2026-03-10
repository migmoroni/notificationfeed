/**
 * Copy-from-Consumer Service — deep copies consumer entities into creator space.
 *
 * Creates new Profiles/Fonts with ownerType='creator', new IDs.
 * The copies are fully independent from the consumer originals.
 * ImageAssets are copied by value (base64 string, no external reference).
 */

import type { Profile, NewProfile } from '$lib/domain/profile/profile.js';
import type { Font, NewFont } from '$lib/domain/font/font.js';
import { createProfileStore } from '$lib/persistence/profile.store.js';
import { createFontStore } from '$lib/persistence/font.store.js';
import { createCreatorProfileStore } from '$lib/persistence/creator-profile.store.js';
import { createProfileFontStore } from '$lib/persistence/profile-font.store.js';

const profileRepo = createProfileStore();
const fontRepo = createFontStore();
const cpRepo = createCreatorProfileStore();
const pfRepo = createProfileFontStore();

export interface CopyResult {
	profiles: Profile[];
	fonts: Font[];
}

/**
 * Deep copy profiles (and their fonts) from consumer space to creator space.
 * All entities get new IDs, ownerType='creator', and are linked to the target page.
 */
export async function copyProfilesToCreator(
	profileIds: string[],
	creatorId: string,
	creatorPageId: string
): Promise<CopyResult> {
	const copiedProfiles: Profile[] = [];
	const copiedFonts: Font[] = [];

	for (const profileId of profileIds) {
		const original = await profileRepo.getById(profileId);
		if (!original) continue;

		// Deep copy profile (no FK fields — entity is independent)
		const newProfile = await profileRepo.create({
			ownerType: 'creator',
			ownerId: creatorId,
			title: original.title,
			bio: original.bio ?? '',
			tags: [...original.tags],
			avatar: original.avatar ? { ...original.avatar } : null,
			categoryAssignments: original.categoryAssignments.map((a) => ({
				treeId: a.treeId,
				categoryIds: [...a.categoryIds]
			})),
			defaultEnabled: original.defaultEnabled
		});
		copiedProfiles.push(newProfile);

		// Create CreatorProfile junction
		await cpRepo.create({
			creatorPageId,
			profileId: newProfile.id,
			sectionId: null,
			order: copiedProfiles.length - 1
		});

		// Deep copy fonts under this profile via junction
		const originalPfs = await pfRepo.getByProfileId(profileId);
		for (const pf of originalPfs) {
			const font = await fontRepo.getById(pf.fontId);
			if (!font) continue;

			const newFont = await fontRepo.create({
				title: font.title,
				bio: font.bio ?? '',
				tags: [...font.tags],
				avatar: font.avatar ? { ...font.avatar } : null,
				protocol: font.protocol,
				config: { ...font.config },
				categoryAssignments: (font.categoryAssignments ?? []).map((a) => ({
					treeId: a.treeId,
					categoryIds: [...a.categoryIds]
				})),
				defaultEnabled: font.defaultEnabled
			});
			copiedFonts.push(newFont);

			// Create ProfileFont junction
			await pfRepo.create({
				profileId: newProfile.id,
				fontId: newFont.id,
				sectionId: null,
				order: copiedFonts.length - 1
			});
		}
	}

	return { profiles: copiedProfiles, fonts: copiedFonts };
}

/**
 * Deep copy individual fonts into a target creator profile.
 */
export async function copyFontsToProfile(
	fontIds: string[],
	targetProfileId: string
): Promise<Font[]> {
	const copiedFonts: Font[] = [];

	for (const fontId of fontIds) {
		const original = await fontRepo.getById(fontId);
		if (!original) continue;

		const newFont = await fontRepo.create({
			title: original.title,
			bio: original.bio ?? '',
			tags: [...original.tags],
			avatar: original.avatar ? { ...original.avatar } : null,
			protocol: original.protocol,
			config: { ...original.config },
			categoryAssignments: (original.categoryAssignments ?? []).map((a) => ({
				treeId: a.treeId,
				categoryIds: [...a.categoryIds]
			})),
			defaultEnabled: original.defaultEnabled
		});

		// Create ProfileFont junction
		await pfRepo.create({
			profileId: targetProfileId,
			fontId: newFont.id,
			sectionId: null,
			order: copiedFonts.length
		});

		copiedFonts.push(newFont);
	}

	return copiedFonts;
}
