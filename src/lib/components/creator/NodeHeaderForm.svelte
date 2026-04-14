<script lang="ts">
	import type { NodeHeader } from '$lib/domain/content-tree/content-tree.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { t } from '$lib/i18n/t.js';

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
		<Label for="node-title">{t('form.title_required')}</Label>
		<Input
			id="node-title"
			value={header.title}
			oninput={(e) => update({ title: e.currentTarget.value })}
			placeholder={t('form.title_placeholder')}
			required
		/>
	</div>

	<div class="space-y-2">
		<Label for="node-subtitle">{t('form.subtitle')}</Label>
		<Input
			id="node-subtitle"
			value={header.subtitle ?? ''}
			oninput={(e) => update({ subtitle: e.currentTarget.value || undefined })}
			placeholder={t('form.subtitle_or_tagline')}
		/>
	</div>

	<div class="space-y-2">
		<Label for="node-summary">{t('form.bio_description')}</Label>
		<Textarea
			id="node-summary"
			value={header.summary ?? ''}
			oninput={(e) => update({ summary: e.currentTarget.value || undefined })}
			placeholder={t('form.description_placeholder')}
			rows={3}
		/>
	</div>
</div>
