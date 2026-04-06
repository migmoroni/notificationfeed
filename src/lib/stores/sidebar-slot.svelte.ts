import type { Snippet } from 'svelte';

let _snippet = $state<Snippet | null>(null);

export const sidebarSlot = {
	get snippet() {
		return _snippet;
	},
	set(s: Snippet | null) {
		_snippet = s;
	}
};
