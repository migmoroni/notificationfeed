<script lang="ts">
	import type { ProfileBody } from '$lib/domain/content-tree/content-tree.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { Label } from '$lib/components/ui/label/index.js';

	interface Props {
		body: ProfileBody;
		onchange: (body: ProfileBody) => void;
	}

	let { body, onchange }: Props = $props();
</script>

<div class="space-y-4">
	<div class="flex items-center gap-2">
		<Switch
			id="profile-enabled"
			checked={body.defaultEnabled}
			onCheckedChange={(v) => onchange({ role: 'profile', defaultEnabled: v })}
		/>
		<Label for="profile-enabled">Ativo por padrão</Label>
	</div>
</div>
