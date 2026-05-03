export type FeedViewMode = 'list' | 'cards' | 'posts';

let currentMode = $state<FeedViewMode>('cards');

export const viewModeStore = {
	get mode() {
		return currentMode;
	},
	set mode(mode: FeedViewMode) {
		currentMode = mode;
	}
};
