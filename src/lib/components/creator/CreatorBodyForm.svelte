<script lang="ts">
	import type { CreatorBody } from '$lib/domain/content-tree/content-tree.js';

	interface Props {
		body: CreatorBody;
		onchange: (body: CreatorBody) => void;
	}

	let { body, onchange }: Props = $props();
</script>

<!-- Creator body has no role-specific fields currently -->
<div class="text-sm text-muted-foreground">
	Nenhuma configuração específica para o nó criador.
</div>
