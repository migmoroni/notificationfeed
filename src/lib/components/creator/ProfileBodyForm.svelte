<script lang="ts">
	import type { ProfileBody, ExternalLink } from '$lib/domain/content-tree/content-tree.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import Plus from '@lucide/svelte/icons/plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import { t } from '$lib/i18n/t.js';

	interface Props {
		body: ProfileBody;
		onchange: (body: ProfileBody) => void;
	}

	let { body, onchange }: Props = $props();

	let links = $state<ExternalLink[]>(body.links ?? []);

	function addLink() {
		links = [...links, { title: '', url: '' }];
		emit();
	}

	function removeLink(index: number) {
		links = links.filter((_, i) => i !== index);
		emit();
	}

	function updateLink(index: number, field: 'title' | 'url', value: string) {
		links = links.map((l, i) => (i === index ? { ...l, [field]: value } : l));
		emit();
	}

	function emit() {
		onchange({ ...body, links });
	}
</script>

<div class="space-y-3">
	<div class="flex items-center justify-between">
		<Label>{t('form.external_links')}</Label>
		<Button variant="ghost" size="sm" class="h-7 text-xs" onclick={addLink}>
			<Plus class="size-3 mr-1" />
			Adicionar link
		</Button>
	</div>

	{#if links.length === 0}
		<p class="text-xs text-muted-foreground">{t('form.no_links')}</p>
	{/if}

	{#each links as link, i}
		<div class="flex items-start gap-2">
			<div class="flex-1 space-y-1">
				<Input
					class="h-8 text-sm"
					placeholder={t('form.link_title_placeholder')}
					value={link.title}
					oninput={(e) => updateLink(i, 'title', e.currentTarget.value)}
				/>
				<Input
					class="h-8 text-sm"
					placeholder={t('form.link_url_placeholder')}
					type="url"
					value={link.url}
					oninput={(e) => updateLink(i, 'url', e.currentTarget.value)}
				/>
			</div>
			<button type="button" class="p-1.5 mt-1 hover:bg-destructive/10 rounded" onclick={() => removeLink(i)}>
				<Trash2 class="size-3.5 text-destructive" />
			</button>
		</div>
	{/each}
</div>
