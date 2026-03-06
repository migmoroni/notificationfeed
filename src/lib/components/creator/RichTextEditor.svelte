<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Editor } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';
	import Placeholder from '@tiptap/extension-placeholder';
	import Bold from '@lucide/svelte/icons/bold';
	import Italic from '@lucide/svelte/icons/italic';
	import List from '@lucide/svelte/icons/list';
	import ListOrdered from '@lucide/svelte/icons/list-ordered';
	import Heading2 from '@lucide/svelte/icons/heading-2';
	import Heading3 from '@lucide/svelte/icons/heading-3';
	import Quote from '@lucide/svelte/icons/quote';
	import Undo from '@lucide/svelte/icons/undo-2';
	import Redo from '@lucide/svelte/icons/redo-2';
	import RemoveFormatting from '@lucide/svelte/icons/remove-formatting';

	interface Props {
		value: string;
		onchange: (html: string) => void;
		placeholder?: string;
	}

	let { value, onchange, placeholder = '' }: Props = $props();

	let element: HTMLDivElement;
	let editor: Editor | null = $state(null);

	onMount(() => {
		editor = new Editor({
			element,
			extensions: [
				StarterKit.configure({
					heading: { levels: [2, 3] }
				}),
				Placeholder.configure({ placeholder })
			],
			content: value,
			editorProps: {
				attributes: {
					class: 'prose prose-sm dark:prose-invert focus:outline-none min-h-[80px] max-h-[300px] overflow-y-auto px-3 py-2 w-full'
				}
			},
			onUpdate: ({ editor: e }) => {
				const html = e.getHTML();
				onchange(html === '<p></p>' ? '' : html);
			}
		});
	});

	onDestroy(() => {
		editor?.destroy();
	});

	function btn(active: boolean): string {
		return `p-1.5 rounded transition-colors ${active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}`;
	}
</script>

<div class="rounded-md border border-input bg-background">
	<!-- Toolbar -->
	{#if editor}
		<div class="flex items-center gap-0.5 px-1.5 py-1 border-b border-input flex-wrap">
			<button type="button" class={btn(editor.isActive('bold'))} onclick={() => editor?.chain().focus().toggleBold().run()} title="Negrito">
				<Bold class="size-4" />
			</button>
			<button type="button" class={btn(editor.isActive('italic'))} onclick={() => editor?.chain().focus().toggleItalic().run()} title="Itálico">
				<Italic class="size-4" />
			</button>

			<div class="w-px h-5 bg-border mx-1"></div>

			<button type="button" class={btn(editor.isActive('heading', { level: 2 }))} onclick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} title="Título H2">
				<Heading2 class="size-4" />
			</button>
			<button type="button" class={btn(editor.isActive('heading', { level: 3 }))} onclick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} title="Título H3">
				<Heading3 class="size-4" />
			</button>

			<div class="w-px h-5 bg-border mx-1"></div>

			<button type="button" class={btn(editor.isActive('bulletList'))} onclick={() => editor?.chain().focus().toggleBulletList().run()} title="Lista">
				<List class="size-4" />
			</button>
			<button type="button" class={btn(editor.isActive('orderedList'))} onclick={() => editor?.chain().focus().toggleOrderedList().run()} title="Lista numerada">
				<ListOrdered class="size-4" />
			</button>
			<button type="button" class={btn(editor.isActive('blockquote'))} onclick={() => editor?.chain().focus().toggleBlockquote().run()} title="Citação">
				<Quote class="size-4" />
			</button>

			<div class="w-px h-5 bg-border mx-1"></div>

			<button type="button" class={btn(false)} onclick={() => editor?.chain().focus().clearNodes().unsetAllMarks().run()} title="Limpar formatação">
				<RemoveFormatting class="size-4" />
			</button>
			<button type="button" class={btn(false)} onclick={() => editor?.chain().focus().undo().run()} title="Desfazer">
				<Undo class="size-4" />
			</button>
			<button type="button" class={btn(false)} onclick={() => editor?.chain().focus().redo().run()} title="Refazer">
				<Redo class="size-4" />
			</button>
		</div>
	{/if}

	<!-- Editor -->
	<div bind:this={element}></div>
</div>

<style>
	:global(.tiptap p.is-editor-empty:first-child::before) {
		content: attr(data-placeholder);
		float: left;
		color: var(--color-muted-foreground);
		pointer-events: none;
		height: 0;
		opacity: 0.5;
	}
</style>
