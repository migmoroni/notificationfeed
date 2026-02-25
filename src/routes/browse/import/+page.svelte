<script lang="ts">
	import { activeUser } from '$lib/stores/active-user.svelte.js';
	import { consumer } from '$lib/stores/consumer.svelte.js';
	import { browse } from '$lib/stores/browse.svelte.js';
	import { parseNotfeedJson, importNotfeedJson, importSimpleUrls } from '$lib/services/import.service.js';
	import type { PageExport } from '$lib/domain/creator-page/page-export.js';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Upload from '@lucide/svelte/icons/upload';
	import Link from '@lucide/svelte/icons/link';
	import FileJson from '@lucide/svelte/icons/file-json';
	import Check from '@lucide/svelte/icons/check';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';

	let activeTab = $state('file');

	// ── File import state ──────────────────────────────────────────────
	let selectedFile = $state<File | null>(null);
	let parsedExport = $state<PageExport | null>(null);
	let fileError = $state('');

	// ── URL import state ───────────────────────────────────────────────
	let urlText = $state('');

	// ── Shared state ───────────────────────────────────────────────────
	let importing = $state(false);
	let resultMessage = $state('');
	let resultSuccess = $state(false);

	const urlCount = $derived(() => {
		return urlText
			.split('\n')
			.map((l) => l.trim())
			.filter((l) => l.startsWith('http://') || l.startsWith('https://')).length;
	});

	function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		fileError = '';
		parsedExport = null;
		selectedFile = file;

		const reader = new FileReader();
		reader.onload = () => {
			const text = reader.result as string;
			const parsed = parseNotfeedJson(text);
			if (!parsed) {
				fileError = 'Arquivo inválido. Verifique se é um .notfeed.json válido.';
				return;
			}
			parsedExport = parsed;
		};
		reader.onerror = () => {
			fileError = 'Erro ao ler o arquivo.';
		};
		reader.readAsText(file);
	}

	async function handleImportFile() {
		if (!parsedExport || !activeUser.current) return;
		importing = true;
		resultMessage = '';

		try {
			const result = await importNotfeedJson(parsedExport, activeUser.current.id);
			resultMessage = result.message;
			resultSuccess = result.success;

			if (result.success) {
				// Reload consumer states + browse data
				await consumer.init();
				browse.loadCategories();
			}
		} catch (err) {
			resultMessage = `Erro inesperado: ${err instanceof Error ? err.message : String(err)}`;
			resultSuccess = false;
		} finally {
			importing = false;
		}
	}

	async function handleImportUrls() {
		if (!activeUser.current) return;
		importing = true;
		resultMessage = '';

		const urls = urlText
			.split('\n')
			.map((l) => l.trim())
			.filter((l) => l.length > 0);

		try {
			const result = await importSimpleUrls(urls, activeUser.current.id);
			resultMessage = result.message;
			resultSuccess = result.success;

			if (result.success) {
				await consumer.init();
				browse.loadCategories();
				urlText = '';
			}
		} catch (err) {
			resultMessage = `Erro inesperado: ${err instanceof Error ? err.message : String(err)}`;
			resultSuccess = false;
		} finally {
			importing = false;
		}
	}
</script>

<svelte:head>
	<title>Notfeed — Importar</title>
</svelte:head>

<div class="mx-auto w-full max-w-2xl px-4 py-4">
	<!-- Header -->
	<div class="mb-6 flex items-center gap-3">
		<Button variant="ghost" size="icon" onclick={() => history.back()}>
			<ArrowLeft class="size-5" />
		</Button>
		<div>
			<h1 class="text-xl font-bold">Importar</h1>
			<p class="text-sm text-muted-foreground">Adicione conteúdo ao seu catálogo</p>
		</div>
	</div>

	<!-- Result banner -->
	{#if resultMessage}
		<div
			class="mb-4 flex items-start gap-2 rounded-lg border p-3 text-sm {resultSuccess
				? 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400'
				: 'border-destructive/30 bg-destructive/10 text-destructive'}"
		>
			{#if resultSuccess}
				<Check class="mt-0.5 size-4 shrink-0" />
			{:else}
				<AlertCircle class="mt-0.5 size-4 shrink-0" />
			{/if}
			<span>{resultMessage}</span>
		</div>
	{/if}

	<!-- Tabs -->
	<Tabs bind:value={activeTab}>
		<TabsList class="grid w-full grid-cols-2">
			<TabsTrigger value="file">
				<FileJson class="mr-1.5 size-4" />
				Arquivo .notfeed.json
			</TabsTrigger>
			<TabsTrigger value="urls">
				<Link class="mr-1.5 size-4" />
				URLs
			</TabsTrigger>
		</TabsList>

		<!-- File import tab -->
		<TabsContent value="file" class="mt-4 space-y-4">
			<div class="rounded-lg border-2 border-dashed border-muted p-6 text-center">
				<Upload class="mx-auto mb-2 size-8 text-muted-foreground" />
				<p class="mb-2 text-sm text-muted-foreground">
					Selecione um arquivo <code class="rounded bg-muted px-1.5 py-0.5 text-xs">.notfeed.json</code>
				</p>
				<input
					type="file"
					accept=".notfeed.json,.json,application/json"
					onchange={handleFileSelect}
					class="mx-auto block w-fit cursor-pointer text-sm file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
				/>
			</div>

			{#if fileError}
				<p class="text-sm text-destructive">{fileError}</p>
			{/if}

			{#if parsedExport}
				<!-- Preview -->
				<div class="rounded-lg border bg-card p-4 space-y-2">
					<h3 class="font-semibold">{parsedExport.page.title}</h3>
					{#if parsedExport.page.bio}
						<p class="text-sm text-muted-foreground">{parsedExport.page.bio}</p>
					{/if}
					{#if parsedExport.creatorDisplayName}
						<p class="text-xs text-muted-foreground">
							Por: {parsedExport.creatorDisplayName}
						</p>
					{/if}
					<div class="flex gap-3 text-xs text-muted-foreground">
						<span>{parsedExport.profiles.length} profile(s)</span>
						<span>
							{parsedExport.profiles.reduce((sum, p) => sum + (p.fonts?.length ?? 0), 0)} font(s)
						</span>
					</div>
					{#if parsedExport.page.tags?.length}
						<div class="flex flex-wrap gap-1">
							{#each parsedExport.page.tags as tag (tag)}
								<span class="rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">
									{tag}
								</span>
							{/each}
						</div>
					{/if}
				</div>

				<Button class="w-full" disabled={importing} onclick={handleImportFile}>
					{#if importing}
						Importando…
					{:else}
						Importar página
					{/if}
				</Button>
			{/if}
		</TabsContent>

		<!-- URL import tab -->
		<TabsContent value="urls" class="mt-4 space-y-4">
			<div>
				<label for="url-input" class="mb-1.5 block text-sm font-medium">
					Cole as URLs (uma por linha)
				</label>
				<textarea
					id="url-input"
					bind:value={urlText}
					rows="8"
					placeholder={"https://example.com/feed.xml\nhttps://blog.example.com/rss\nhttps://example.com/atom.xml"}
					class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
				></textarea>
				<p class="mt-1 text-xs text-muted-foreground">
					{urlCount()} URL(s) válida(s) detectada(s). Suporta RSS e Atom.
				</p>
			</div>

			<Button class="w-full" disabled={importing || urlCount() === 0} onclick={handleImportUrls}>
				{#if importing}
					Importando…
				{:else}
					Importar {urlCount()} URL(s)
				{/if}
			</Button>
		</TabsContent>
	</Tabs>

	<!-- Back link -->
	<div class="mt-6 text-center">
		<button
			onclick={() => history.back()}
			class="text-sm text-muted-foreground hover:text-foreground underline transition-colors"
		>
			Voltar
		</button>
	</div>
</div>
