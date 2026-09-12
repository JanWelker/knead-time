<script lang="ts">
	import { i18n } from '$lib/i18n/i18n.svelte';
	import type { FormState } from '$lib/state.svelte';
	import FormField from './FormField.svelte';

	// Where the dough sits while it works: the two temperatures the yeast solve
	// runs against, and whether the balls ripen cold or on the counter.
	// Rendered bare — see DoughFields for why.
	let { form }: { form: FormState } = $props();

	const t = $derived(i18n.t);
</script>

<label class="group text-ink col-span-full flex items-center gap-2 text-sm font-medium">
	<input
		type="checkbox"
		class="accent-accent size-4"
		checked={form.ballProof === 'cold'}
		onchange={(e) => (form.ballProof = e.currentTarget.checked ? 'cold' : 'room')}
	/>
	<span>
		{t.form.ballProof_toggle}
		<span class="text-ink-soft hidden text-xs font-normal group-focus-within:block">
			{t.form.ballProof_help}
		</span>
	</span>
</label>

<FormField
	id="field-roomTemp"
	label={t.form.roomTemp}
	min={10}
	max={35}
	step={0.5}
	help={t.form.roomTemp_help}
	bind:value={form.roomTempC}
/>

<FormField
	label={t.form.fridgeTemp}
	min={0}
	max={12}
	step={0.5}
	help={t.form.fridgeTemp_help}
	bind:value={form.fridgeTempC}
/>
