<script lang="ts">
	import { i18n } from '$lib/i18n/i18n.svelte';
	import { combineDateTimeInputs, toDatePart, toTimePart } from '$lib/format';
	import { DEFAULT_FLOUR_W, FLOUR_PRESETS, flourPresetForW } from '$lib/dough/flour';
	import { uiMode } from '$lib/mode.svelte';
	import type { FormState } from '$lib/state.svelte';
	import FormField from './FormField.svelte';
	import FermentWindowSlider from './FermentWindowSlider.svelte';
	import Warnings from './Warnings.svelte';

	let { form }: { form: FormState } = $props();

	const t = $derived(i18n.t);

	let startAtDate = $derived(toDatePart(form.startAt));
	let startAtTime = $derived(toTimePart(form.startAt));
	let readyByDate = $derived(toDatePart(form.readyBy));
	let readyByTime = $derived(toTimePart(form.readyBy));

	const inputBase =
		'border-dough-300 focus:border-tomato-500 rounded-lg border bg-white px-3 py-2 text-base shadow-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100';
	const dateInputClass = `${inputBase} min-w-0 flex-1`;
	const timeInputClass = `${inputBase} w-28`;
	const selectClass = `${inputBase} mt-1 w-full`;

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

	// The select has no state of its own — it reads back off flourW, so typing
	// a strength no preset matches simply lands on "custom".
	const flourChoice = $derived(
		form.flourW === null ? 'none' : (flourPresetForW(form.flourW) ?? 'custom')
	);

	function setFlourChoice(choice: string) {
		if (choice === 'none') {
			form.flourW = null;
			return;
		}
		if (choice === 'custom') {
			form.flourW ??= DEFAULT_FLOUR_W;
			return;
		}
		form.flourW = FLOUR_PRESETS.find((p) => p.id === choice)?.w ?? DEFAULT_FLOUR_W;
	}
</script>

<form class="space-y-8" onsubmit={(e) => e.preventDefault()}>
	<fieldset class="space-y-3">
		<legend class="font-display text-accent text-lg">
			{t.form.section_when}
		</legend>
		<label class="block">
			<span class="block text-sm font-medium text-stone-700 dark:text-stone-200">
				{t.form.startAt}
			</span>
			<div class="mt-1 flex gap-2">
				<input
					type="date"
					class={dateInputClass}
					value={startAtDate}
					max={readyByDate}
					oninput={(e) => setStartAt(e.currentTarget.value, startAtTime)}
				/>
				<input
					type="time"
					class={timeInputClass}
					value={startAtTime}
					oninput={(e) => setStartAt(startAtDate, e.currentTarget.value)}
				/>
			</div>
			<div class="mt-1 flex items-center justify-between gap-2">
				<span class="block text-xs text-stone-500 dark:text-stone-400">{t.form.startAt_help}</span>
				<button
					type="button"
					class="bg-tomato-500 hover:bg-tomato-600 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
					onclick={resetStartAtToNow}
				>
					{t.form.startAt_now}
				</button>
			</div>
			{#if startAtClamped}
				<p
					class="border-tomato-300 bg-tomato-50 text-tomato-800 dark:border-tomato-700 dark:bg-tomato-900/40 dark:text-tomato-200 mt-2 rounded-lg border px-3 py-2 text-sm"
					role="alert"
				>
					{t.form.startAt_clamped}
				</p>
			{/if}
		</label>
		<label class="block">
			<span class="block text-sm font-medium text-stone-700 dark:text-stone-200">
				{t.form.readyBy}
			</span>
			<div class="mt-1 flex gap-2">
				<input
					type="date"
					class={dateInputClass}
					value={readyByDate}
					oninput={(e) => setReadyBy(e.currentTarget.value, readyByTime)}
				/>
				<input
					type="time"
					class={timeInputClass}
					value={readyByTime}
					oninput={(e) => setReadyBy(readyByDate, e.currentTarget.value)}
				/>
			</div>
			<span class="mt-1 block text-xs text-stone-500 dark:text-stone-400">
				{t.form.readyBy_help}
			</span>
		</label>
		<!-- The window spans the two times above and rewrites startAt as you
		     drag it, so it belongs with them rather than over in the schedule.
		     Its own explanation always shows, like every other field's help
		     text — the schedule's short/detailed toggle is in the other column
		     and must not reach across into this one. -->
		<FermentWindowSlider {form} />
	</fieldset>

	<fieldset class="grid grid-cols-1 gap-4 sm:grid-cols-2">
		<legend class="font-display text-accent col-span-full text-lg">
			{t.form.section_recipe}
		</legend>
		<FormField label={t.form.pizzaCount} min={1} max={100} step={1} bind:value={form.pizzaCount} />
		{#if uiMode.current === 'expert'}
			<FormField
				label={t.form.ballWeight}
				min={100}
				max={600}
				step={1}
				bind:value={form.ballWeight}
			/>
		{/if}

		<!-- Flour sits with the mixing method, not down in the expert fields:
		     which flour is in the cupboard is something every baker knows, and
		     it decides the fermentation band the schedule paints. The W number
		     behind it stays expert-only — the presets already carry it. -->
		<label class="block">
			<span class="block text-sm font-medium text-stone-700 dark:text-stone-200">
				{t.form.flour}
			</span>
			<select
				class={selectClass}
				value={flourChoice}
				onchange={(e) => setFlourChoice(e.currentTarget.value)}
			>
				{#each FLOUR_PRESETS as preset (preset.id)}
					<option value={preset.id}>{t.form[`flour_${preset.id}`]} (W {preset.w})</option>
				{/each}
				<option value="custom">{t.form.flour_custom}</option>
				<option value="none">{t.form.flour_none}</option>
			</select>
			<span class="mt-1 block text-xs text-stone-500 dark:text-stone-400">
				{t.form.flour_help}
			</span>
		</label>
		{#if uiMode.current === 'expert' && form.flourW !== null}
			<FormField
				label={t.form.flourW}
				min={150}
				max={400}
				step={5}
				help={t.form.flourW_help}
				bind:value={form.flourW}
			/>
		{/if}
		{#if uiMode.current === 'expert'}
			<FormField
				label={t.form.hydration}
				min={50}
				max={90}
				step={1}
				help={t.form.hydration_help}
				bind:value={form.hydration}
			/>

			<FormField label={t.form.salt} min={0} max={5} step={0.1} bind:value={form.saltPercent} />

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

		<label class="block">
			<span class="block text-sm font-medium text-stone-700 dark:text-stone-200">
				{t.form.mixingMethod}
			</span>
			<select class={selectClass} bind:value={form.mixingMethod}>
				<option value="spiral">{t.form.mixing_spiral}</option>
				<option value="stand">{t.form.mixing_stand}</option>
				<option value="hand">{t.form.mixing_hand}</option>
			</select>
			<span class="mt-1 block text-xs text-stone-500 dark:text-stone-400">
				{t.form.mixingMethod_help}
			</span>
		</label>
		{#if uiMode.current === 'expert'}
			<label class="block">
				<span class="block text-sm font-medium text-stone-700 dark:text-stone-200">
					{t.form.yeastType}
				</span>
				<select class={selectClass} bind:value={form.yeastType}>
					<option value="fresh">{t.form.yeast_fresh}</option>
					<option value="instant">{t.form.yeast_instant}</option>
					<option value="active-dry">{t.form.yeast_active_dry}</option>
					<option value="sourdough">{t.form.yeast_sourdough}</option>
				</select>
				{#if form.yeastType === 'active-dry'}
					<span class="mt-1 block text-xs text-stone-500 dark:text-stone-400">
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
					<legend class="block text-sm font-medium text-stone-700 dark:text-stone-200">
						{t.form.preFerment}
					</legend>
					<label class="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-200">
						<input type="checkbox" class="accent-tomato-500" bind:checked={form.bigaEnabled} />
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
					<label class="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-200">
						<input type="checkbox" class="accent-tomato-500" bind:checked={form.poolishEnabled} />
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
						<span class="block text-xs text-stone-500 dark:text-stone-400">
							{t.form.preFerment_sum_help}
						</span>
					{/if}
					{#if form.bigaEnabled || form.poolishEnabled}
						<label class="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-200">
							<input
								type="checkbox"
								class="accent-tomato-500"
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
				<label class="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-200">
					<input type="checkbox" class="accent-tomato-500" bind:checked={form.autolyse} />
					<span>
						{t.form.autolyse_toggle}
						<span class="block text-xs font-normal text-stone-500 dark:text-stone-400">
							{t.form.autolyse_help}
						</span>
					</span>
				</label>
			{/if}

			<label class="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-200">
				<input
					type="checkbox"
					class="accent-tomato-500"
					checked={form.ballProof === 'cold'}
					onchange={(e) => (form.ballProof = e.currentTarget.checked ? 'cold' : 'room')}
				/>
				<span>
					{t.form.ballProof_toggle}
					<span class="block text-xs font-normal text-stone-500 dark:text-stone-400">
						{t.form.ballProof_help}
					</span>
				</span>
			</label>

			<FormField
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

			<!-- too-cold / too-warm fire on roomTempC alone. Full width so the
			     two-column grid does not split the temperature pair above. -->
			<div class="col-span-full">
				<Warnings warnings={form.schedule.warnings} place="temperature" />
			</div>
		{/if}
	</fieldset>

	<div>
		<button
			type="button"
			class="text-accent cursor-pointer text-sm font-medium underline-offset-2 hover:underline"
			onclick={() => uiMode.set(uiMode.current === 'beginner' ? 'expert' : 'beginner')}
		>
			{uiMode.current === 'beginner' ? t.form.mode_expert : t.form.mode_beginner}
		</button>
		{#if uiMode.current === 'beginner'}
			<span class="mt-1 block text-xs text-stone-500 dark:text-stone-400">
				{t.form.mode_help}
			</span>
		{/if}
	</div>

	{#if uiMode.current === 'expert'}
		<details
			class="border-dough-300 bg-dough-50/60 group min-w-0 rounded-lg border border-dashed p-3 text-xs text-stone-700 open:bg-white/70 dark:border-stone-600 dark:bg-stone-800/40 dark:text-stone-300 dark:open:bg-stone-900/60"
		>
			<summary
				class="text-accent flex cursor-pointer list-none items-center gap-2 font-medium select-none"
			>
				<span
					class="font-mono text-[0.7rem] tracking-tight transition-transform group-open:rotate-90"
					aria-hidden="true">▶</span
				>
				<span>{t.form.info_heading}</span>
			</summary>
			<div class="mt-3 min-w-0 space-y-4 leading-relaxed">
				<p>{t.form.info_intro}</p>

				<div class="min-w-0">
					<p class="font-semibold text-stone-900 dark:text-stone-100">{t.form.info_q10_title}</p>
					<p class="mt-1">{t.form.info_q10_caption}</p>
					<pre
						class="border-dough-200 mt-1 overflow-x-auto rounded border bg-white px-2 py-1 font-mono text-[0.72rem] text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100">f(T) = 2^((T − 22) / 10)</pre>
				</div>

				<div class="min-w-0">
					<p class="font-semibold text-stone-900 dark:text-stone-100">{t.form.info_units_title}</p>
					<p class="mt-1">{t.form.info_units_body}</p>
					<ul class="mt-1 list-disc space-y-0.5 pl-5">
						<li>{t.form.info_units_fresh}</li>
						<li>{t.form.info_units_sourdough}</li>
					</ul>
					<p class="mt-2">{t.form.info_units_solve}</p>
					<pre
						class="border-dough-200 mt-1 overflow-x-auto rounded border bg-white px-2 py-1 font-mono text-[0.72rem] text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100">yeast% = target / Σ (w · hours · f(T))</pre>
					<p class="mt-2">{t.form.info_units_carriers}</p>
				</div>

				<div class="min-w-0">
					<p class="font-semibold text-stone-900 dark:text-stone-100">
						{t.form.info_preferment_title}
					</p>
					<p class="mt-1">{t.form.info_preferment_body}</p>
					<ul class="mt-1 list-disc space-y-0.5 pl-5">
						<li>{t.form.info_preferment_biga}</li>
						<li>{t.form.info_preferment_poolish}</li>
					</ul>
					<p class="mt-2">{t.form.info_preferment_wall}</p>
					<pre
						class="border-dough-200 mt-1 overflow-x-auto rounded border bg-white px-2 py-1 font-mono text-[0.72rem] text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100">wallHours = refHours / f(roomTempC),  8 ≤ wallHours ≤ 24</pre>
					<p class="mt-2">{t.form.info_preferment_yeast}</p>
				</div>

				<div>
					<p class="font-semibold text-stone-900 dark:text-stone-100">{t.form.info_switch_title}</p>
					<p class="mt-1">{t.form.info_switch_body}</p>
				</div>

				<div>
					<p class="font-semibold text-stone-900 dark:text-stone-100">{t.form.info_budget_title}</p>
					<p class="mt-1">{t.form.info_budget_body}</p>
				</div>

				<div>
					<p class="font-semibold text-stone-900 dark:text-stone-100">
						{t.form.info_autolyse_title}
					</p>
					<p class="mt-1">{t.form.info_autolyse_body}</p>
				</div>

				<div class="min-w-0">
					<p class="font-semibold text-stone-900 dark:text-stone-100">{t.form.info_water_title}</p>
					<p class="mt-1">{t.form.info_water_body}</p>
					<pre
						class="border-dough-200 mt-1 overflow-x-auto rounded border bg-white px-2 py-1 font-mono text-[0.72rem] text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100">water = 3·23 − 2·room − friction</pre>
				</div>

				<div class="min-w-0">
					<p class="font-semibold text-stone-900 dark:text-stone-100">{t.form.info_mass_title}</p>
					<p class="mt-1">{t.form.info_mass_body}</p>
					<pre
						class="border-dough-200 mt-1 overflow-x-auto rounded border bg-white px-2 py-1 font-mono text-[0.72rem] text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100">flour = total / pctSum</pre>
					<p class="mt-2">{t.form.info_mass_caption_fresh}</p>
					<pre
						class="border-dough-200 mt-1 overflow-x-auto rounded border bg-white px-2 py-1 font-mono text-[0.72rem] text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100">pctSum = 100 + hydration + salt% + yeast% + oil% + sugar%</pre>
					<p class="mt-2">{t.form.info_mass_caption_sourdough}</p>
					<pre
						class="border-dough-200 mt-1 overflow-x-auto rounded border bg-white px-2 py-1 font-mono text-[0.72rem] text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100">pctSum = 100 + hydration + salt% + oil% + sugar%</pre>
				</div>

				<div>
					<p class="font-semibold text-stone-900 dark:text-stone-100">{t.form.info_round_title}</p>
					<p class="mt-1">{t.form.info_round_body}</p>
				</div>

				<div>
					<p class="font-semibold text-stone-900 dark:text-stone-100">{t.form.info_fit_title}</p>
					<p class="mt-1">{t.form.info_fit_body}</p>
				</div>

				<div class="min-w-0">
					<p class="font-semibold text-stone-900 dark:text-stone-100">{t.form.info_flour_title}</p>
					<p class="mt-1">{t.form.info_flour_body}</p>
					<pre
						class="border-dough-200 mt-1 overflow-x-auto rounded border bg-white px-2 py-1 font-mono text-[0.72rem] text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100">hours(W) = lo · (hi/lo)^((W − Wlo) / (Whi − Wlo))</pre>
				</div>

				<div>
					<p class="font-semibold text-stone-900 dark:text-stone-100">{t.form.info_night_title}</p>
					<p class="mt-1">{t.form.info_night_body}</p>
				</div>
			</div>
		</details>
	{/if}
</form>
