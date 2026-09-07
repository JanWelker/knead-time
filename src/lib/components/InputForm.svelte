<script lang="ts">
	import { i18n } from '$lib/i18n/i18n.svelte';
	import { combineDateTimeInputs, toDatePart, toTimePart } from '$lib/format';
	import { INFO_SECTIONS } from '$lib/infoSections';
	import { uiMode } from '$lib/mode.svelte';
	import type { FormState } from '$lib/state.svelte';
	import FieldHelp from './FieldHelp.svelte';
	import FlourSelect from './FlourSelect.svelte';
	import FormField from './FormField.svelte';
	import FermentWindowSlider from './FermentWindowSlider.svelte';

	// Every input in DoughInputs, in one dense surface. The ask flow asks five
	// of these one screen at a time; this is the other door — a baker who
	// already knows all twelve numbers opens the adjust sheet and fills them in
	// without stepping through anything. Field order is still one list, expert
	// simply reveals more of it, so the two doors never disagree about what
	// comes first.
	let { form }: { form: FormState } = $props();

	const t = $derived(i18n.t);

	let startAtDate = $derived(toDatePart(form.startAt));
	let startAtTime = $derived(toTimePart(form.startAt));
	let readyByDate = $derived(toDatePart(form.readyBy));
	let readyByTime = $derived(toTimePart(form.readyBy));

	// `.input` in app.css carries the box itself; only the sizing differs here.
	const dateInputClass = 'input min-w-0 flex-1';
	const timeInputClass = 'input w-28';
	const selectClass = 'input w-full';

	// True while the last start-time edit had to be pulled back to the bake
	// time. Cleared by the next edit that lands legally, and by a new bake
	// time — the refusal is about one particular pair of moments.
	let startAtClamped = $state(false);

	function setStartAt(datePart: string, timePart: string) {
		const d = combineDateTimeInputs(datePart, timePart);
		if (d) startAtClamped = form.setStartAt(d);
	}

	function setReadyBy(datePart: string, timePart: string) {
		const d = combineDateTimeInputs(datePart, timePart);
		if (!d) return;
		form.setReadyBy(d);
		startAtClamped = false;
	}

	function resetStartAtToNow() {
		startAtClamped = form.setStartAt(new Date());
	}
</script>

<form class="space-y-10" onsubmit={(e) => e.preventDefault()}>
	<fieldset class="space-y-4">
		<legend class="banner mb-1">{t.adjust.group_when}</legend>
		<!-- A fieldset, not a label: a label names its FIRST labelable
		     descendant, so wrapping a date and a time box in one left the time
		     box with no accessible name at all. The legend names the moment,
		     each input names its own half. -->
		<fieldset class="group block min-w-0">
			<legend class="field-label">{t.form.startAt}</legend>
			<div class="mt-1 flex gap-2">
				<input
					id="field-startAt"
					type="date"
					class={dateInputClass}
					value={startAtDate}
					max={readyByDate}
					aria-label="{t.form.startAt} — {t.form.field_date}"
					oninput={(e) => setStartAt(e.currentTarget.value, startAtTime)}
				/>
				<input
					type="time"
					class={timeInputClass}
					value={startAtTime}
					aria-label="{t.form.startAt} — {t.form.field_time}"
					oninput={(e) => setStartAt(startAtDate, e.currentTarget.value)}
				/>
			</div>
			<div class="mt-1 flex items-center justify-between gap-2">
				<FieldHelp text={t.form.startAt_help} extra="" />
				<button type="button" class="btn-tomato-sm ml-auto shrink-0" onclick={resetStartAtToNow}>
					{t.form.startAt_now}
				</button>
			</div>
			{#if startAtClamped}
				<p class="notice notice-danger mt-2" role="alert">
					{t.form.startAt_clamped}
				</p>
			{/if}
		</fieldset>
		<fieldset class="group block min-w-0">
			<legend class="field-label">{t.form.readyBy}</legend>
			<div class="mt-1 flex gap-2">
				<input
					id="field-readyBy"
					type="date"
					class={dateInputClass}
					value={readyByDate}
					aria-label="{t.form.readyBy} — {t.form.field_date}"
					oninput={(e) => setReadyBy(e.currentTarget.value, readyByTime)}
				/>
				<input
					type="time"
					class={timeInputClass}
					value={readyByTime}
					aria-label="{t.form.readyBy} — {t.form.field_time}"
					oninput={(e) => setReadyBy(readyByDate, e.currentTarget.value)}
				/>
			</div>
			<FieldHelp text={t.form.readyBy_help} />
		</fieldset>
		<!-- The flour sits here, not down in the recipe: it is the other half of
		     what makes a window ideal, so it belongs with the times it bounds and
		     directly above the rail that paints its tolerance band. The W number
		     behind it stays expert-only — the presets already carry it. -->
		<label class="group block">
			<span class="field-label">{t.form.flour}</span>
			<FlourSelect {form} id="field-flour" class={selectClass} />
			<FieldHelp text={t.form.flour_help} />
		</label>
		{#if uiMode.current === 'expert' && form.flourW !== null}
			<FormField
				label={t.form.flourW}
				min={150}
				max={400}
				step={5}
				help={t.form.flourW_help}
				bind:value={form.flourW}
				oncommit={() => form.repickWindow()}
			/>
		{/if}

		<!-- The window rewrites startAt as you drag it, so it belongs with the two
		     times above rather than beside the schedule it produces. Its warnings
		     stay off here: the plan behind this sheet already carries them. -->
		<FermentWindowSlider {form} />
	</fieldset>

	<fieldset class="grid grid-cols-1 gap-4 sm:grid-cols-2">
		<legend class="banner col-span-full mb-1">{t.adjust.group_batch}</legend>
		<FormField
			id="field-pizzaCount"
			label={t.form.pizzaCount}
			min={1}
			max={100}
			step={1}
			bind:value={form.pizzaCount}
		/>
		{#if uiMode.current === 'expert'}
			<FormField
				id="field-ballWeight"
				label={t.form.ballWeight}
				min={100}
				max={600}
				step={1}
				bind:value={form.ballWeight}
			/>
		{/if}
	</fieldset>

	<fieldset class="grid grid-cols-1 gap-4 sm:grid-cols-2">
		<legend class="banner col-span-full mb-1">{t.adjust.group_dough}</legend>
		{#if uiMode.current === 'expert'}
			<FormField
				id="field-hydration"
				label={t.form.hydration}
				min={50}
				max={90}
				step={1}
				help={t.form.hydration_help}
				bind:value={form.hydration}
			/>

			<FormField
				id="field-salt"
				label={t.form.salt}
				min={0}
				max={5}
				step={0.1}
				bind:value={form.saltPercent}
			/>

			<FormField
				label={t.form.oil}
				min={0}
				max={15}
				step={0.1}
				help={t.form.oil_help}
				bind:value={form.oilPercent}
			/>

			<FormField
				label={t.form.sugar}
				min={0}
				max={5}
				step={0.1}
				help={t.form.sugar_help}
				bind:value={form.sugarPercent}
			/>
		{/if}

		<label class="group block">
			<span class="field-label">{t.form.mixingMethod}</span>
			<select id="field-mixingMethod" class={selectClass} bind:value={form.mixingMethod}>
				<option value="spiral">{t.form.mixing_spiral}</option>
				<option value="stand">{t.form.mixing_stand}</option>
				<option value="hand">{t.form.mixing_hand}</option>
			</select>
			<FieldHelp text={t.form.mixingMethod_help} />
		</label>
	</fieldset>

	{#if uiMode.current === 'expert'}
		<fieldset class="grid grid-cols-1 gap-4 sm:grid-cols-2">
			<legend class="banner col-span-full mb-1">{t.adjust.group_leaven}</legend>
			<label class="block">
				<span class="field-label">{t.form.yeastType}</span>
				<select class={selectClass} bind:value={form.yeastType}>
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
					min={40}
					max={150}
					step={5}
					help={t.form.starterHydration_help}
					bind:value={form.starterHydration}
				/>
			{:else}
				<fieldset class="space-y-2">
					<legend class="field-label">{t.form.preFerment}</legend>
					<label class="text-ink flex items-center gap-2 text-sm font-medium">
						<input type="checkbox" class="accent-accent size-4" bind:checked={form.bigaEnabled} />
						{t.form.preFerment_biga}
					</label>
					{#if form.bigaEnabled}
						<FormField
							label={t.form.preFermentFlour_biga}
							min={5}
							max={80 - (form.poolishEnabled ? form.poolishFlourPercent : 0)}
							step={5}
							bind:value={form.bigaFlourPercent}
						/>
					{/if}
					<label class="text-ink flex items-center gap-2 text-sm font-medium">
						<input
							type="checkbox"
							class="accent-accent size-4"
							bind:checked={form.poolishEnabled}
						/>
						{t.form.preFerment_poolish}
					</label>
					{#if form.poolishEnabled}
						<FormField
							label={t.form.preFermentFlour_poolish}
							min={5}
							max={80 - (form.bigaEnabled ? form.bigaFlourPercent : 0)}
							step={5}
							bind:value={form.poolishFlourPercent}
						/>
					{/if}
					{#if form.bigaEnabled && form.poolishEnabled}
						<span class="text-ink-soft block text-xs">{t.form.preFerment_sum_help}</span>
					{/if}
					{#if form.bigaEnabled || form.poolishEnabled}
						<label class="text-ink flex items-center gap-2 text-sm font-medium">
							<input
								type="checkbox"
								class="accent-accent size-4"
								bind:checked={form.preFermentTempEnabled}
							/>
							{t.form.preFermentTemp_toggle}
						</label>
						{#if form.preFermentTempEnabled}
							<FormField
								label={t.form.preFermentTemp}
								min={4}
								max={35}
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
				<label class="group text-ink flex items-center gap-2 text-sm font-medium">
					<input type="checkbox" class="accent-accent size-4" bind:checked={form.autolyse} />
					<span>
						{t.form.autolyse_toggle}
						<span class="text-ink-soft hidden text-xs font-normal group-focus-within:block">
							{t.form.autolyse_help}
						</span>
					</span>
				</label>
			{/if}
		</fieldset>

		<fieldset class="grid grid-cols-1 gap-4 sm:grid-cols-2">
			<legend class="banner col-span-full mb-1">{t.adjust.group_proof}</legend>
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
		</fieldset>
	{/if}

	<div class="rule pt-6">
		<button
			type="button"
			class="btn-ghost cursor-pointer"
			onclick={() => uiMode.set(uiMode.current === 'beginner' ? 'expert' : 'beginner')}
		>
			{uiMode.current === 'beginner' ? t.form.mode_expert : t.form.mode_beginner}
		</button>
		{#if uiMode.current === 'beginner'}
			<span class="text-ink-soft mt-1 block text-xs">{t.form.mode_help}</span>
		{/if}
	</div>

	{#if uiMode.current === 'expert'}
		<details
			class="border-rule bg-sheet text-ink group min-w-0 rounded-[2px] border-2 border-dashed p-3 text-xs"
		>
			<summary
				class="label-caps text-accent-ink flex cursor-pointer list-none items-center gap-2 select-none"
			>
				<span
					class="text-[0.7rem] tracking-tight transition-transform group-open:rotate-90"
					aria-hidden="true">▶</span
				>
				<span>{t.form.info_heading}</span>
			</summary>
			<div class="mt-3 min-w-0 space-y-4 leading-relaxed">
				<p>{t.form.info_intro}</p>

				<!-- Sections come from INFO_SECTIONS (src/lib/infoSections.ts), which a
				     test holds against the message bundle in both directions: no key
				     rendered that does not exist, no info_ message left unrendered.
				     Thirteen hand-written blocks could not be checked that way. -->
				{#each INFO_SECTIONS as section (section.title)}
					<div class="min-w-0">
						<p class="label-caps mt-1 text-[0.75rem]">{t.form[section.title]}</p>
						{#each section.parts as part, i (i)}
							{#if part.kind === 'text'}
								<p class="mt-1">{t.form[part.key]}</p>
							{:else if part.kind === 'list'}
								<ul class="mt-1 list-disc space-y-0.5 pl-5">
									{#each part.keys as key (key)}
										<li>{t.form[key]}</li>
									{/each}
								</ul>
							{:else}
								<pre
									class="border-rule bg-paper text-ink mt-1 overflow-x-auto rounded-[2px] border-2 px-2 py-1 font-mono text-[0.72rem]">{part.formula}</pre>
							{/if}
						{/each}
					</div>
				{/each}
			</div>
		</details>
	{/if}
</form>
