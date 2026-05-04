<script lang="ts">
	import type {
		FontBody,
		FontProtocol,
		FontProtocolEntry,
		FontConfig,
		FontNostrConfig,
		FontRssConfig,
		FontAtomConfig,
		FontJsonfeedConfig
	} from '$lib/domain/content-tree/content-tree.js';
	import { createProtocolEntry } from '$lib/domain/content-tree/content-tree.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import X from '@lucide/svelte/icons/x';
	import Plus from '@lucide/svelte/icons/plus';
	import Star from '@lucide/svelte/icons/star';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import { t } from '$lib/i18n/t.js';

	interface Props {
		body: FontBody;
		onchange: (body: FontBody) => void;
	}

	let { body, onchange }: Props = $props();

	function emitProtocols(next: FontProtocolEntry[]) {
		onchange({ role: 'font', protocols: next, defaultEnabled: body.defaultEnabled });
	}

	function emitDefaultEnabled(value: boolean) {
		onchange({ role: 'font', protocols: body.protocols, defaultEnabled: value });
	}

	function updateEntry(index: number, patch: Partial<FontProtocolEntry>) {
		const next = body.protocols.map((e, i) => (i === index ? { ...e, ...patch } : e));
		emitProtocols(next);
	}

	function updateConfig(index: number, config: FontConfig) {
		updateEntry(index, { config });
	}

	function changeProtocol(index: number, protocol: FontProtocol) {
		// Reset config to a blank shape matching the new protocol kind.
		let config: FontConfig;
		switch (protocol) {
			case 'rss':
			case 'atom':
			case 'jsonfeed':
				config = { url: '' } as FontRssConfig | FontAtomConfig | FontJsonfeedConfig;
				break;
			case 'nostr':
				config = { pubkey: '', relays: [] } as FontNostrConfig;
				break;
		}
		updateEntry(index, { protocol, config });
	}

	function markPrimary(index: number) {
		const next = body.protocols.map((e, i) => ({ ...e, primary: i === index }));
		emitProtocols(next);
	}

	function removeEntry(index: number) {
		if (body.protocols.length <= 1) return;
		let next = body.protocols.filter((_, i) => i !== index);
		// If we removed the primary, promote the first remaining entry.
		if (!next.some((e) => e.primary)) {
			next = next.map((e, i) => ({ ...e, primary: i === 0 }));
		}
		emitProtocols(next);
	}

	function addEntry() {
		const fresh = createProtocolEntry('rss', { url: '' }, false);
		emitProtocols([...body.protocols, fresh]);
	}

	function nostrAddRelay(index: number, relay: string) {
		const trimmed = relay.trim();
		if (!trimmed) return;
		const cfg = body.protocols[index].config as FontNostrConfig;
		if (cfg.relays.includes(trimmed)) return;
		updateConfig(index, { ...cfg, relays: [...cfg.relays, trimmed] });
	}

	function nostrRemoveRelay(index: number, relay: string) {
		const cfg = body.protocols[index].config as FontNostrConfig;
		updateConfig(index, { ...cfg, relays: cfg.relays.filter((r) => r !== relay) });
	}

	// Per-entry transient relay-input buffer (keyed by entry id).
	let relayBuffer = $state<Record<string, string>>({});
</script>

<div class="space-y-4">
	{#each body.protocols as entry, idx (entry.id)}
		<div class="rounded-md border p-3 space-y-3 {entry.primary ? 'border-primary' : 'border-muted'}">
			<div class="flex items-center justify-between gap-2">
				<div class="flex items-center gap-2">
					{#if entry.primary}
						<Badge variant="default" class="gap-1">
							<Star class="size-3" />
							{t('form.protocol_primary_badge')}
						</Badge>
					{:else}
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onclick={() => markPrimary(idx)}
							title={t('form.mark_primary')}
						>
							<Star class="size-4" />
							<span class="sr-only">{t('form.mark_primary')}</span>
						</Button>
					{/if}
				</div>

				{#if body.protocols.length > 1 && !entry.primary}
					<Button
						type="button"
						variant="ghost"
						size="icon"
						onclick={() => removeEntry(idx)}
						title={t('form.remove_protocol')}
					>
						<Trash2 class="size-4" />
					</Button>
				{/if}
			</div>

			<div class="space-y-2">
				<Label>{t('form.protocol')}</Label>
				<Select.Root
					type="single"
					value={entry.protocol}
					onValueChange={(v) => v && changeProtocol(idx, v as FontProtocol)}
				>
					<Select.Trigger class="w-full">
						{#if entry.protocol === 'rss'}RSS
						{:else if entry.protocol === 'atom'}Atom
						{:else if entry.protocol === 'jsonfeed'}JSON Feed
						{:else if entry.protocol === 'nostr'}Nostr
						{:else}Selecionar…{/if}
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="rss">RSS</Select.Item>
						<Select.Item value="atom">Atom</Select.Item>
						<Select.Item value="jsonfeed">JSON Feed</Select.Item>
						<Select.Item value="nostr">Nostr</Select.Item>
					</Select.Content>
				</Select.Root>
			</div>

			{#if entry.protocol === 'rss'}
				<div class="space-y-2">
					<Label for="rss-url-{entry.id}">URL do Feed RSS *</Label>
					<Input
						id="rss-url-{entry.id}"
						type="text"
						value={(entry.config as FontRssConfig).url}
						oninput={(e) => updateConfig(idx, { url: (e.currentTarget as HTMLInputElement).value })}
						placeholder={t('form.feed_url_placeholder')}
					/>
				</div>
			{:else if entry.protocol === 'atom'}
				<div class="space-y-2">
					<Label for="atom-url-{entry.id}">URL do Feed Atom *</Label>
					<Input
						id="atom-url-{entry.id}"
						type="text"
						value={(entry.config as FontAtomConfig).url}
						oninput={(e) => updateConfig(idx, { url: (e.currentTarget as HTMLInputElement).value })}
						placeholder={t('form.atom_url_placeholder')}
					/>
				</div>
			{:else if entry.protocol === 'jsonfeed'}
				<div class="space-y-2">
					<Label for="jsonfeed-url-{entry.id}">{t('form.jsonfeed_url_label')}</Label>
					<Input
						id="jsonfeed-url-{entry.id}"
						type="text"
						value={(entry.config as FontJsonfeedConfig).url}
						oninput={(e) => updateConfig(idx, { url: (e.currentTarget as HTMLInputElement).value })}
						placeholder={t('form.jsonfeed_url_placeholder')}
					/>
				</div>
			{:else if entry.protocol === 'nostr'}
				{@const cfg = entry.config as FontNostrConfig}
				<div class="space-y-4">
					<div class="space-y-2">
						<Label for="nostr-pubkey-{entry.id}">{t('form.nostr_pubkey')}</Label>
						<Input
							id="nostr-pubkey-{entry.id}"
							value={cfg.pubkey}
							oninput={(e) =>
								updateConfig(idx, {
									...cfg,
									pubkey: (e.currentTarget as HTMLInputElement).value
								})}
							placeholder={t('form.nostr_pubkey_placeholder')}
						/>
					</div>

					<div class="space-y-2">
						<Label>{t('form.relays')}</Label>
						{#if cfg.relays.length > 0}
							<div class="flex flex-wrap gap-1">
								{#each cfg.relays as relay}
									<Badge variant="secondary" class="gap-1 pr-1">
										<span class="max-w-50 truncate">{relay}</span>
										<button
											type="button"
											class="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
											onclick={() => nostrRemoveRelay(idx, relay)}
										>
											<X class="size-3" />
										</button>
									</Badge>
								{/each}
							</div>
						{/if}
						<div class="flex gap-2">
							<Input
								value={relayBuffer[entry.id] ?? ''}
								oninput={(e) =>
									(relayBuffer[entry.id] = (e.currentTarget as HTMLInputElement).value)}
								onkeydown={(e) => {
									if (e.key === 'Enter') {
										e.preventDefault();
										nostrAddRelay(idx, relayBuffer[entry.id] ?? '');
										relayBuffer[entry.id] = '';
									}
								}}
								placeholder={t('form.nostr_relay_placeholder')}
								class="flex-1"
							/>
							<Button
								type="button"
								variant="outline"
								size="icon"
								onclick={() => {
									nostrAddRelay(idx, relayBuffer[entry.id] ?? '');
									relayBuffer[entry.id] = '';
								}}
							>
								<Plus class="size-4" />
							</Button>
						</div>
					</div>
				</div>
			{/if}
		</div>
	{/each}

	<Button type="button" variant="outline" onclick={addEntry} class="w-full">
		<Plus class="size-4" />
		{t('form.add_protocol')}
	</Button>

	<div class="flex items-center gap-2 pt-2">
		<Switch
			id="font-enabled"
			checked={body.defaultEnabled}
			onCheckedChange={(v) => emitDefaultEnabled(v)}
		/>
		<Label for="font-enabled">{t('form.active_by_default')}</Label>
	</div>
</div>
