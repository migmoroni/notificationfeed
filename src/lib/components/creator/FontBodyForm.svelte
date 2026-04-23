<script lang="ts">
	import type { FontBody, FontProtocol, FontConfig, FontNostrConfig, FontRssConfig, FontAtomConfig } from '$lib/domain/content-tree/content-tree.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import X from '@lucide/svelte/icons/x';
	import Plus from '@lucide/svelte/icons/plus';
	import { t } from '$lib/i18n/t.js';

	interface Props {
		body: FontBody;
		onchange: (body: FontBody) => void;
	}

	let { body, onchange }: Props = $props();

	// Local mutable state mirroring body fields
	let protocol = $state<FontProtocol>(body.protocol);
	let defaultEnabled = $state(body.defaultEnabled);

	// Protocol-specific fields
	let rssUrl = $state((body.config as FontRssConfig).url ?? '');
	let atomUrl = $state((body.config as FontAtomConfig).url ?? '');
	let nostrPubkey = $state((body.config as FontNostrConfig).pubkey ?? '');
	let nostrRelays = $state<string[]>((body.config as FontNostrConfig).relays ?? []);
	let nostrKinds = $state<number[]>((body.config as FontNostrConfig).kinds ?? []);
	let newRelay = $state('');

	function buildConfig(): FontConfig {
		switch (protocol) {
			case 'rss':
				return { url: rssUrl.trim() } satisfies FontRssConfig;
			case 'atom':
				return { url: atomUrl.trim() } satisfies FontAtomConfig;
			case 'nostr':
				return {
					pubkey: nostrPubkey.trim(),
					relays: nostrRelays,
					...(nostrKinds.length > 0 ? { kinds: nostrKinds } : {})
				} satisfies FontNostrConfig;
		}
	}

	function emit() {
		onchange({
			role: 'font',
			protocol,
			config: buildConfig(),
			defaultEnabled
		});
	}

	function handleProtocolChange(value: string | undefined) {
		if (!value) return;
		protocol = value as FontProtocol;
		emit();
	}

	function addRelay() {
		const trimmed = newRelay.trim();
		if (trimmed && !nostrRelays.includes(trimmed)) {
			nostrRelays = [...nostrRelays, trimmed];
			newRelay = '';
			emit();
		}
	}

	function removeRelay(relay: string) {
		nostrRelays = nostrRelays.filter((r) => r !== relay);
		emit();
	}

	function handleRelayKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			addRelay();
		}
	}
</script>

<div class="space-y-4">
	<div class="space-y-2">
		<Label>{t('form.protocol')}</Label>
		<Select.Root type="single" value={protocol} onValueChange={handleProtocolChange}>
			<Select.Trigger class="w-full">
				{#if protocol === 'rss'}RSS
				{:else if protocol === 'atom'}Atom
				{:else if protocol === 'nostr'}Nostr
				{:else}Selecionar…{/if}
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
				type="url"
				bind:value={rssUrl}
				oninput={() => emit()}
				placeholder={t('form.feed_url_placeholder')}
			/>
		</div>
	{:else if protocol === 'atom'}
		<div class="space-y-2">
			<Label for="atom-url">URL do Feed Atom *</Label>
			<Input
				id="atom-url"
				type="url"
				bind:value={atomUrl}
				oninput={() => emit()}
				placeholder={t('form.atom_url_placeholder')}
			/>
		</div>
	{:else if protocol === 'nostr'}
		<div class="space-y-4">
			<div class="space-y-2">
				<Label for="nostr-pubkey">{t('form.nostr_pubkey')}</Label>
				<Input
					id="nostr-pubkey"
					bind:value={nostrPubkey}
					oninput={() => emit()}
					placeholder={t('form.nostr_pubkey_placeholder')}
				/>
			</div>

			<div class="space-y-2">
				<Label>{t('form.relays')}</Label>
				{#if nostrRelays.length > 0}
					<div class="flex flex-wrap gap-1">
						{#each nostrRelays as relay}
							<Badge variant="secondary" class="gap-1 pr-1">
								<span class="max-w-50 truncate">{relay}</span>
								<button
									type="button"
									class="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
									onclick={() => removeRelay(relay)}
								>
									<X class="size-3" />
								</button>
							</Badge>
						{/each}
					</div>
				{/if}
				<div class="flex gap-2">
					<Input
						bind:value={newRelay}
						onkeydown={handleRelayKeydown}
						placeholder={t('form.nostr_relay_placeholder')}
						class="flex-1"
					/>
					<Button type="button" variant="outline" size="icon" onclick={addRelay}>
						<Plus class="size-4" />
					</Button>
				</div>
			</div>
		</div>
	{/if}

	<div class="flex items-center gap-2">
		<Switch
			id="font-enabled"
			checked={defaultEnabled}
			onCheckedChange={(v) => { defaultEnabled = v; emit(); }}
		/>
		<Label for="font-enabled">{t('form.active_by_default')}</Label>
	</div>
</div>
