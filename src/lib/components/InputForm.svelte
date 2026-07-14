<script lang="ts">
	import { i18n } from '$lib/i18n/i18n.svelte';
	import { combineDateTimeInputs, toDatePart, toTimePart } from '$lib/format';
	import { uiMode } from '$lib/mode.svelte';
	import type { FormState } from '$lib/state.svelte';
	import FormField from './FormField.svelte';

	let { state }: { state: FormState } = $props();

	const t = $derived(i18n.t);

	let startAtDate = $derived(toDatePart(state.startAt));
	let startAtTime = $derived(toTimePart(state.startAt));
	let readyByDate = $derived(toDatePart(state.readyBy));
	let readyByTime = $derived(toTimePart(state.readyBy));

	const inputBase =
		'border-dough-300 focus:border-tomato-500 rounded-lg border bg-white px-3 py-2 text-base shadow-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100';
	const dateInputClass = `${inputBase} min-w-0 flex-1`;
	const timeInputClass = `${inputBase} w-28`;
	const selectClass = `${inputBase} mt-1 w-full`;

	function setStartAt(datePart: string, timePart: string) {
		const d = combineDateTimeInputs(datePart, timePart);
		if (d) state.startAt = d;
	}

	function setReadyBy(datePart: string, timePart: string) {
		const d = combineDateTimeInputs(datePart, timePart);
		if (d) state.readyBy = d;
	}

	function resetStartAtToNow() {
		state.startAt = new Date();
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
	</fieldset>

	<fieldset class="grid grid-cols-1 gap-4 sm:grid-cols-2">
		<legend class="font-display text-accent col-span-full text-lg">
			{t.form.section_recipe}
		</legend>

		<FormField label={t.form.pizzaCount} min={1} max={100} step={1} bind:value={state.pizzaCount} />

		<label class="block">
			<span class="block text-sm font-medium text-stone-700 dark:text-stone-200">
				{t.form.mixingMethod}
			</span>
			<select class={selectClass} bind:value={state.mixingMethod}>
				<option value="machine">{t.form.mixing_machine}</option>
				<option value="hand">{t.form.mixing_hand}</option>
			</select>
			<span class="mt-1 block text-xs text-stone-500 dark:text-stone-400">
				{t.form.mixingMethod_help}
			</span>
		</label>

		{#if uiMode.current === 'expert'}
			<FormField
				label={t.form.ballWeight}
				min={100}
				max={600}
				step={1}
				bind:value={state.ballWeight}
			/>

			<FormField
				label={t.form.hydration}
				min={50}
				max={90}
				step={1}
				help={t.form.hydration_help}
				bind:value={state.hydration}
			/>

			<FormField label={t.form.salt} min={0} max={5} step={0.1} bind:value={state.saltPercent} />

			<FormField
				label={t.form.oil}
				min={0}
				max={15}
				step={0.1}
				help={t.form.oil_help}
				bind:value={state.oilPercent}
			/>

			<FormField
				label={t.form.sugar}
				min={0}
				max={5}
				step={0.1}
				help={t.form.sugar_help}
				bind:value={state.sugarPercent}
			/>

			<FormField
				label={t.form.roomTemp}
				min={10}
				max={35}
				step={0.5}
				help={t.form.roomTemp_help}
				bind:value={state.roomTempC}
			/>

			<FormField
				label={t.form.fridgeTemp}
				min={0}
				max={12}
				step={0.5}
				help={t.form.fridgeTemp_help}
				bind:value={state.fridgeTempC}
			/>

			<label class="block">
				<span class="block text-sm font-medium text-stone-700 dark:text-stone-200">
					{t.form.yeastType}
				</span>
				<select class={selectClass} bind:value={state.yeastType}>
					<option value="fresh">{t.form.yeast_fresh}</option>
					<option value="sourdough">{t.form.yeast_sourdough}</option>
				</select>
			</label>

			{#if state.yeastType === 'sourdough'}
				<FormField
					label={t.form.starterHydration}
					min={40}
					max={150}
					step={5}
					help={t.form.starterHydration_help}
					bind:value={state.starterHydration}
				/>
			{:else}
				<fieldset class="space-y-2">
					<legend class="block text-sm font-medium text-stone-700 dark:text-stone-200">
						{t.form.preFerment}
					</legend>
					<label class="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-200">
						<input type="checkbox" class="accent-tomato-500" bind:checked={state.bigaEnabled} />
						{t.form.preFerment_biga}
					</label>
					{#if state.bigaEnabled}
						<FormField
							label={t.form.preFermentFlour_biga}
							min={5}
							max={80 - (state.poolishEnabled ? state.poolishFlourPercent : 0)}
							step={5}
							bind:value={state.bigaFlourPercent}
						/>
					{/if}
					<label class="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-200">
						<input type="checkbox" class="accent-tomato-500" bind:checked={state.poolishEnabled} />
						{t.form.preFerment_poolish}
					</label>
					{#if state.poolishEnabled}
						<FormField
							label={t.form.preFermentFlour_poolish}
							min={5}
							max={80 - (state.bigaEnabled ? state.bigaFlourPercent : 0)}
							step={5}
							bind:value={state.poolishFlourPercent}
						/>
					{/if}
					{#if state.bigaEnabled && state.poolishEnabled}
						<span class="block text-xs text-stone-500 dark:text-stone-400">
							{t.form.preFerment_sum_help}
						</span>
					{/if}
				</fieldset>
			{/if}
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

				<div>
					<p class="font-semibold text-stone-900 dark:text-stone-100">{t.form.info_night_title}</p>
					<p class="mt-1">{t.form.info_night_body}</p>
				</div>
			</div>
		</details>
	{/if}
</form>
