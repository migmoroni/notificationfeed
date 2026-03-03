<script lang="ts">
	import type { ImageAsset } from '$lib/domain/shared/image-asset.js';
	import type { CategoryAssignment } from '$lib/domain/shared/category-assignment.js';
	import type { FontProtocol, FontConfig, FontRssConfig, FontAtomConfig, FontNostrConfig } from '$lib/domain/font/font.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import ImageUpload from './ImageUpload.svelte';
	import TagInput from './TagInput.svelte';
	import CategoryTreePicker from './CategoryTreePicker.svelte';

	interface FontFormData {
		title: string;
		tags: string[];
		avatar: ImageAsset | null;
		protocol: FontProtocol;
		config: FontConfig;
		categoryAssignments: CategoryAssignment[];
		defaultEnabled: boolean;
	}

	interface Props {
		mode: 'create' | 'edit';
		initial?: FontFormData;
		/** Inherited categories from parent profile (shown read-only) */
		inheritedCategories?: CategoryAssignment[];
		onsave: (data: FontFormData) => void;
		oncancel: () => void;
		saving?: boolean;
	}

	let { mode, initial, inheritedCategories = [], onsave, oncancel, saving = false }: Props = $props();

	let title = $state(initial?.title ?? '');
	let tags = $state<string[]>(initial?.tags ?? []);
	let avatar = $state<ImageAsset | null>(initial?.avatar ?? null);
	let protocol = $state<FontProtocol>(initial?.protocol ?? 'rss');
	let categoryAssignments = $state<CategoryAssignment[]>(initial?.categoryAssignments ?? []);
	let defaultEnabled = $state(initial?.defaultEnabled ?? true);

	// Protocol-specific fields
	let rssUrl = $state((initial?.config as FontRssConfig)?.url ?? '');
	let atomUrl = $state((initial?.config as FontAtomConfig)?.url ?? '');
	let nostrRelays = $state<string[]>((initial?.config as FontNostrConfig)?.relays ?? []);
	let nostrPubkey = $state((initial?.config as FontNostrConfig)?.pubkey ?? '');
	let nostrKinds = $state<string>((initial?.config as FontNostrConfig)?.kinds?.join(', ') ?? '');

	let relayInput = $state('');

	function buildConfig(): FontConfig {
		switch (protocol) {
			case 'rss':
				return { url: rssUrl.trim() };
			case 'atom':
				return { url: atomUrl.trim() };
			case 'nostr': {
				const config: FontNostrConfig = {
					relays: nostrRelays,
					pubkey: nostrPubkey.trim()
				};
				const kindsArr = nostrKinds
					.split(',')
					.map((k) => parseInt(k.trim(), 10))
					.filter((n) => !isNaN(n));
				if (kindsArr.length > 0) config.kinds = kindsArr;
				return config;
			}
		}
	}

	let isValid = $derived(() => {
		if (!title.trim()) return false;
		switch (protocol) {
			case 'rss': return rssUrl.trim().startsWith('http');
			case 'atom': return atomUrl.trim().startsWith('http');
			case 'nostr': return nostrRelays.length > 0 && nostrPubkey.trim().length > 0;
		}
	});

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!isValid() || saving) return;

		onsave({
			title: title.trim(),
			tags,
			avatar,
			protocol,
			config: buildConfig(),
			categoryAssignments,
			defaultEnabled
		});
	}

	function addRelay() {
		const trimmed = relayInput.trim();
		if (trimmed && !nostrRelays.includes(trimmed)) {
			nostrRelays = [...nostrRelays, trimmed];
		}
		relayInput = '';
	}

	function removeRelay(relay: string) {
		nostrRelays = nostrRelays.filter((r) => r !== relay);
	}

	function handleProtocolChange(value: string | undefined) {
		if (value) protocol = value as FontProtocol;
	}
</script>

<form onsubmit={handleSubmit} class="space-y-4">
	<div class="space-y-2">
		<Label for="font-title">Título *</Label>
		<Input
			id="font-title"
			bind:value={title}
			placeholder="Nome da font"
			required
		/>
	</div>

	<div class="space-y-2">
		<Label>Protocolo *</Label>
		<Select.Root type="single" value={protocol} onValueChange={handleProtocolChange}>
			<Select.Trigger class="w-full">
				{protocol === 'rss' ? 'RSS' : protocol === 'atom' ? 'Atom' : 'Nostr'}
			</Select.Trigger>
			<Select.Content>
				<Select.Item value="rss">RSS</Select.Item>
				<Select.Item value="atom">Atom</Select.Item>
				<Select.Item value="nostr">Nostr</Select.Item>
			</Select.Content>
		</Select.Root>
	</div>

	{#if protocol === 'rss'}
		<div class="space-y-2">
			<Label for="rss-url">URL do Feed RSS *</Label>
			<Input
				id="rss-url"
				bind:value={rssUrl}
				placeholder="https://example.com/feed.xml"
				type="url"
			/>
		</div>
	{:else if protocol === 'atom'}
		<div class="space-y-2">
			<Label for="atom-url">URL do Feed Atom *</Label>
			<Input
				id="atom-url"
				bind:value={atomUrl}
				placeholder="https://example.com/atom.xml"
				type="url"
			/>
		</div>
	{:else if protocol === 'nostr'}
		<div class="space-y-2">
			<Label for="nostr-pubkey">Public Key *</Label>
			<Input
				id="nostr-pubkey"
				bind:value={nostrPubkey}
				placeholder="npub1..."
			/>
		</div>

		<div class="space-y-2">
			<Label>Relays *</Label>
			{#if nostrRelays.length > 0}
				<div class="flex flex-wrap gap-1">
					{#each nostrRelays as relay}
						<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground text-xs">
							{relay}
							<button type="button" class="hover:text-destructive" onclick={() => removeRelay(relay)}>×</button>
						</span>
					{/each}
				</div>
			{/if}
			<div class="flex gap-2">
				<Input
					bind:value={relayInput}
					placeholder="wss://relay.example.com"
					onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRelay(); } }}
				/>
				<Button variant="outline" type="button" onclick={addRelay}>+</Button>
			</div>
		</div>

		<div class="space-y-2">
			<Label for="nostr-kinds">Kinds (opcional, separados por vírgula)</Label>
			<Input
				id="nostr-kinds"
				bind:value={nostrKinds}
				placeholder="1, 30023"
			/>
		</div>
	{/if}

	<div class="space-y-2">
		<Label>Tags</Label>
		<TagInput {tags} onchange={(v) => (tags = v)} />
	</div>

	<ImageUpload
		slot="avatar"
		value={avatar}
		onchange={(v) => (avatar = v)}
		label="Avatar"
	/>

	<CategoryTreePicker
		assignments={categoryAssignments}
		onchange={(v) => (categoryAssignments = v)}
		inherited={inheritedCategories}
	/>

	<div class="flex items-center gap-2">
		<Switch id="font-enabled" bind:checked={defaultEnabled} />
		<Label for="font-enabled">Ativo por padrão</Label>
	</div>

	<div class="flex gap-2 justify-end">
		<Button variant="outline" type="button" onclick={oncancel} disabled={saving}>
			Cancelar
		</Button>
		<Button type="submit" disabled={!isValid() || saving}>
			{#if saving}
				Salvando…
			{:else if mode === 'create'}
				Adicionar Font
			{:else}
				Salvar
			{/if}
		</Button>
	</div>
</form>
