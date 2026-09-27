<script lang="ts">
	import { i18n } from '$lib/i18n/i18n.svelte';
	import type { FormState } from '$lib/state.svelte';
	import FieldHelp from './FieldHelp.svelte';
	import FormField from './FormField.svelte';
	import { INPUT_BOUNDS, PREFERMENT_SHARE_MAX, PREFERMENT_SHARE_MIN } from '$lib/dough/inputBounds';

	// What raises the dough: the carrier, any pre-ferment, and the autolyse.
	// Rendered bare so the adjust sheet and the ask flow can frame it their own
	// way — see DoughFields for why that split exists.
	//
	// This group is the one with real branching in it (pre-ferment ⊥ sourdough,
	// the two shares capped at 80 % between them, autolyse only where no
	// pre-ferment is already resting the flour), which is exactly why it is one
	// component: a second hand-written copy is a second place for those rules to
	// be almost right.
	let { form }: { form: FormState } = $props();

	const t = $derived(i18n.t);

	const selectClass = 'input w-full';
</script>

<label class="block">
	<span class="field-label">{t.form.yeastType}</span>
	<select id="field-yeastType" class={selectClass} bind:value={form.yeastType}>
		<option value="fresh">{t.form.yeast_fresh}</option>
		<option value="instant">{t.form.yeast_instant}</option>
		<option value="active-dry">{t.form.yeast_active_dry}</option>
		<option value="sourdough">{t.form.yeast_sourdough}</option>
	</select>
	{#if form.yeastType === 'active-dry'}
		<span class="text-ink-soft mt-1 block text-xs">
			{t.form.yeast_active_dry_help}
		</span>
	{/if}
</label>

{#if form.yeastType === 'sourdough'}
	<FormField
		label={t.form.starterHydration}
		min={INPUT_BOUNDS.starterHydration.min}
		max={INPUT_BOUNDS.starterHydration.max}
		step={5}
		help={t.form.starterHydration_help}
		bind:value={form.starterHydration}
	/>
{:else}
	<fieldset class="space-y-2">
		<legend class="field-label">{t.form.preFerment}</legend>
		<label class="check-row">
			<input type="checkbox" class="check-box" bind:checked={form.bigaEnabled} />
			{t.form.preFerment_biga}
		</label>
		{#if form.bigaEnabled}
			<FormField
				label={t.form.preFermentFlour_biga}
				min={PREFERMENT_SHARE_MIN}
				max={PREFERMENT_SHARE_MAX - (form.poolishEnabled ? form.poolishFlourPercent : 0)}
				step={5}
				bind:value={form.bigaFlourPercent}
			/>
		{/if}
		<label class="check-row">
			<input type="checkbox" class="check-box" bind:checked={form.poolishEnabled} />
			{t.form.preFerment_poolish}
		</label>
		{#if form.poolishEnabled}
			<FormField
				label={t.form.preFermentFlour_poolish}
				min={PREFERMENT_SHARE_MIN}
				max={PREFERMENT_SHARE_MAX - (form.bigaEnabled ? form.bigaFlourPercent : 0)}
				step={5}
				bind:value={form.poolishFlourPercent}
			/>
		{/if}
		{#if form.bigaEnabled && form.poolishEnabled}
			<span class="text-ink-soft block text-xs">{t.form.preFerment_sum_help}</span>
		{/if}
		{#if form.bigaEnabled || form.poolishEnabled}
			<label class="check-row">
				<input type="checkbox" class="check-box" bind:checked={form.preFermentTempEnabled} />
				{t.form.preFermentTemp_toggle}
			</label>
			{#if form.preFermentTempEnabled}
				<FormField
					label={t.form.preFermentTemp}
					min={INPUT_BOUNDS.preFermentTempC.min}
					max={INPUT_BOUNDS.preFermentTempC.max}
					step={0.5}
					help={t.form.preFermentTemp_help}
					bind:value={form.preFermentTempValue}
				/>
			{/if}
		{/if}
	</fieldset>
{/if}

<!-- Autolyse applies only with no pre-ferment (sourdough always
     qualifies — its starter is not a schedule pre-ferment). -->
{#if form.yeastType === 'sourdough' || !(form.bigaEnabled || form.poolishEnabled)}
	<label class="check-row group">
		<input type="checkbox" class="check-box" bind:checked={form.autolyse} />
		<span>
			{t.form.autolyse_toggle}
			<FieldHelp text={t.form.autolyse_help} extra="font-normal" />
		</span>
	</label>
{/if}
