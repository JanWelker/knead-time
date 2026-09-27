<script lang="ts">
	import { i18n } from '$lib/i18n/i18n.svelte';
	import type { FormState } from '$lib/state.svelte';
	import FieldHelp from './FieldHelp.svelte';
	import FormField from './FormField.svelte';
	import { INPUT_BOUNDS } from '$lib/dough/inputBounds';

	// Where the dough sits while it works: the two temperatures the yeast solve
	// runs against, and whether the balls ripen cold or on the counter.
	// Rendered bare — see DoughFields for why.
	let { form }: { form: FormState } = $props();

	const t = $derived(i18n.t);
</script>

<label class="check-row group col-span-full">
	<input
		type="checkbox"
		class="check-box"
		checked={form.ballProof === 'cold'}
		onchange={(e) => (form.ballProof = e.currentTarget.checked ? 'cold' : 'room')}
	/>
	<span>
		{t.form.ballProof_toggle}
		<FieldHelp text={t.form.ballProof_help} extra="font-normal" />
	</span>
</label>

<FormField
	id="field-roomTemp"
	label={t.form.roomTemp}
	min={INPUT_BOUNDS.roomTempC.min}
	max={INPUT_BOUNDS.roomTempC.max}
	step={0.5}
	help={t.form.roomTemp_help}
	bind:value={form.roomTempC}
/>

<FormField
	label={t.form.fridgeTemp}
	min={INPUT_BOUNDS.fridgeTempC.min}
	max={INPUT_BOUNDS.fridgeTempC.max}
	step={0.5}
	help={t.form.fridgeTemp_help}
	bind:value={form.fridgeTempC}
/>
