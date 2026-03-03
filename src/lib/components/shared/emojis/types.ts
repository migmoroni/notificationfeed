export interface EmojiEntry {
	emoji: string;
	name: string;
}

export interface EmojiCategory {
	label: string;
	emojis: EmojiEntry[];
}
