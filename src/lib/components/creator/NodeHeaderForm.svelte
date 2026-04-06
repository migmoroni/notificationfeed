<script lang="ts">
	import type { NodeHeader } from '$lib/domain/content-tree/content-tree.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Label } from '$lib/components/ui/label/index.js';

	interface Props {
		header: NodeHeader;
		onchange: (header: NodeHeader) => void;
	}

	let {
		header,
		onchange
	}: Props = $props();

	function update(patch: Partial<NodeHeader>) {
		onchange({ ...header, ...patch });
	}
</script>

<div class="space-y-4">
	<div class="space-y-2">
		<Label for="node-title">Título *</Label>
		<Input
			id="node-title"
			value={header.title}
			oninput={(e) => update({ title: e.currentTarget.value })}
			placeholder="Título"
			required
		/>
	</div>

	<div class="space-y-2">
		<Label for="node-subtitle">Subtítulo</Label>
		<Input
			id="node-subtitle"
			value={header.subtitle ?? ''}
			oninput={(e) => update({ subtitle: e.currentTarget.value || undefined })}
			placeholder="Subtítulo ou tagline"
		/>
	</div>

	<div class="space-y-2">
		<Label for="node-summary">Bio / Descrição</Label>
		<Textarea
			id="node-summary"
			value={header.summary ?? ''}
			oninput={(e) => update({ summary: e.currentTarget.value || undefined })}
			placeholder="Descrição breve"
			rows={3}
		/>
	</div>
</div>
