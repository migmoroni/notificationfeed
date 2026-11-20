export type { EmojiEntry, EmojiCategory } from './types.js';

import type { EmojiCategory } from './types.js';
import { faces } from './faces.js';
import { gestures } from './gestures.js';
import { people } from './people.js';
import { animals } from './animals.js';
import { nature } from './nature.js';
import { food } from './food.js';
import { drinks } from './drinks.js';
import { activities } from './activities.js';
import { travel } from './travel.js';
import { objects } from './objects.js';
import { symbols } from './symbols.js';
import { flags } from './flags.js';

export const CATEGORIES: EmojiCategory[] = [
	{ label: 'Faces', emojis: faces },
	{ label: 'Gestures', emojis: gestures },
	{ label: 'People', emojis: people },
	{ label: 'Animals', emojis: animals },
	{ label: 'Nature', emojis: nature },
	{ label: 'Food', emojis: food },
	{ label: 'Drinks', emojis: drinks },
	{ label: 'Activities', emojis: activities },
	{ label: 'Travel', emojis: travel },
	{ label: 'Objects', emojis: objects },
	{ label: 'Symbols', emojis: symbols },
	{ label: 'Flags', emojis: flags },
];
