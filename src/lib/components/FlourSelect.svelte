<script lang="ts">
	import {
		DEFAULT_FLOUR_W,
		FLOUR_PRESETS,
		flourPresetForW,
		flourPresetGroups
	} from '$lib/dough/flour';
	import { i18n } from '$lib/i18n/i18n.svelte';
	import type { FormState } from '$lib/state.svelte';

	// The shelved flour picker. It is asked for twice — once as a whole screen
	// in the ask flow, once as a field in the adjust sheet — so the shelving
	// rules and the re-pick live here rather than in both callers.
	let { form, id, class: klass }: { form: FormState; id?: string; class?: string } = $props();

	const t = $derived(i18n.t);

	// The select has no state of its own — it reads back off flourW, so typing
	// a strength no preset matches simply lands on "custom".
	const flourChoice = $derived(
		form.flourW === null ? 'none' : (flourPresetForW(form.flourW) ?? 'custom')
	);

	// The flour is the other half of what makes a window ideal, so picking one
	// re-answers it just as changing the bake time does. "Not specified" has no
	// band to aim at, so it leaves the window alone.
	function setFlourChoice(choice: string) {
		if (choice === 'none') {
			form.setFlour(null);
			return;
		}
		if (choice === 'custom') {
			form.flourW ??= DEFAULT_FLOUR_W;
		} else {
			form.flourW = FLOUR_PRESETS.find((p) => p.id === choice)?.w ?? DEFAULT_FLOUR_W;
		}
		form.repickWindow();
	}
</script>

<select
	{id}
	class={klass}
	value={flourChoice}
	onchange={(e) => setFlourChoice(e.currentTarget.value)}
>
	<!-- Grouped by what each strength is sold for rather than listed flat:
	     twelve bag names in a row say nothing about which one suits the plan.
	     Shelves are cut on W (see flourBand) because the tolerance model clamps
	     above W 310 and could not separate the strong ones. -->
	{#each flourPresetGroups() as group (group.band)}
		<optgroup label={t.form[`flour_band_${group.band}`]}>
			{#each group.presets as preset (preset.id)}
				<option value={preset.id}>{t.form[`flour_${preset.id}`]} (W {preset.w})</option>
			{/each}
		</optgroup>
	{/each}
	<option value="custom">{t.form.flour_custom}</option>
	<option value="none">{t.form.flour_none}</option>
</select>
