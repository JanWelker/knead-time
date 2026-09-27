<script lang="ts">
	import { i18n } from '$lib/i18n/i18n.svelte';
	import type { FormState } from '$lib/state.svelte';
	import FormField from './FormField.svelte';
	import { INPUT_BOUNDS } from '$lib/dough/inputBounds';

	// The baker's percentages, everything measured against the flour. Rendered
	// bare — no fieldset, no legend — because two surfaces frame them
	// differently: the adjust sheet puts them in a group under a banner beside
	// the mixing method, the ask flow gives them a screen with a question over
	// them. What must not differ is which fields there are and what order they
	// come in, which is the whole reason this is one component and not two
	// copies (issue #316).
	let { form }: { form: FormState } = $props();

	const t = $derived(i18n.t);
</script>

<FormField
	id="field-hydration"
	label={t.form.hydration}
	min={INPUT_BOUNDS.hydration.min}
	max={INPUT_BOUNDS.hydration.max}
	step={1}
	help={t.form.hydration_help}
	bind:value={form.hydration}
/>

<FormField
	id="field-salt"
	label={t.form.salt}
	min={INPUT_BOUNDS.saltPercent.min}
	max={INPUT_BOUNDS.saltPercent.max}
	step={0.1}
	bind:value={form.saltPercent}
/>

<FormField
	label={t.form.oil}
	min={INPUT_BOUNDS.oilPercent.min}
	max={INPUT_BOUNDS.oilPercent.max}
	step={0.1}
	help={t.form.oil_help}
	bind:value={form.oilPercent}
/>

<FormField
	label={t.form.sugar}
	min={INPUT_BOUNDS.sugarPercent.min}
	max={INPUT_BOUNDS.sugarPercent.max}
	step={0.1}
	help={t.form.sugar_help}
	bind:value={form.sugarPercent}
/>
