<script lang="ts">
	import { browse } from '$lib/stores/browse.svelte.js';
	import CategoryTree from './CategoryTree.svelte';
	import { Separator } from '$lib/components/ui/separator/index.js';
</script>

<nav class="flex flex-col gap-3" aria-label="Filtros por categoria">
	<CategoryTree treeId="subject" label="Assunto" />
	<Separator />
	<CategoryTree treeId="content_type" label="Formato" />
</nav>
