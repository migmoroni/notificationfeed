<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import type { Font } from '$lib/domain/font/font.js';
	import { createFontStore } from '$lib/persistence/font.store.js';
	import FontDetail from '$lib/components/browse/FontDetail.svelte';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';

	interface Props {
		backHref: string;
		backLabel: string;
	}

	let { backHref, backLabel }: Props = $props();

	let font: Font | null = $state(null);
	let loading = $state(true);
	let notFound = $state(false);

	const fontId = $derived(page.params.fontId!);

	onMount(async () => {
		const fontStore = createFontStore();
		const found = await fontStore.getById(fontId);
		if (!found) {
			notFound = true;
			loading = false;
			return;
		}
		font = found;
		loading = false;
	});
</script>

<svelte:head>
	<title>Notfeed — {font?.title ?? 'Font'}</title>
</svelte:head>

<div class="container mx-auto max-w-2xl px-4 py-4">
	<a
		href={backHref}
		class="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
	>
		<ArrowLeft class="size-4" />
		{backLabel}
	</a>

	{#if loading}
		<div class="animate-pulse space-y-4">
			<div class="h-8 w-48 bg-muted rounded"></div>
			<div class="h-20 bg-muted rounded-lg"></div>
		</div>
	{:else if notFound}
		<div class="py-12 text-center">
			<p class="text-sm text-muted-foreground">Font não encontrada.</p>
			<a href={backHref} class="text-sm text-primary hover:underline mt-2 inline-block">Voltar</a>
		</div>
	{:else if font}
		<FontDetail {font} defaultOpen={true} />
	{/if}
</div>
