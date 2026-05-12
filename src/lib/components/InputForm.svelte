<script lang="ts">
	import { i18n } from '$lib/i18n/i18n.svelte';
	import { combineDateTimeInputs, toDatePart, toTimePart } from '$lib/format';
	import type { FormState } from '$lib/state.svelte';

	let { state }: { state: FormState } = $props();

	const t = $derived(i18n.t);

	let startAtDate = $derived(toDatePart(state.startAt));
	let startAtTime = $derived(toTimePart(state.startAt));
	let readyByDate = $derived(toDatePart(state.readyBy));
	let readyByTime = $derived(toTimePart(state.readyBy));

	// Native <input type="time"> follows the browser's UI locale, which means en-US
	// users see AM/PM. For de/it we fall back to a 24-hour text input so the picker
	// matches the selected app language.
	const useNativeTime = $derived(i18n.locale === 'en');
	const timePattern = '([01]?\\d|2[0-3])[.:][0-5]\\d';

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
		<legend class="font-display text-tomato-700 text-lg">{t.form.section_when}</legend>
		<label class="block">
			<span class="block text-sm font-medium text-stone-700">{t.form.startAt}</span>
			<div class="mt-1 flex gap-2">
				<input
					type="date"
					class="border-dough-300 focus:border-tomato-500 min-w-0 flex-1 rounded-lg border bg-white px-3 py-2 text-base shadow-sm"
					value={startAtDate}
					oninput={(e) => setStartAt(e.currentTarget.value, startAtTime)}
				/>
				{#if useNativeTime}
					<input
						type="time"
						class="border-dough-300 focus:border-tomato-500 w-28 rounded-lg border bg-white px-3 py-2 text-base shadow-sm"
						value={startAtTime}
						oninput={(e) => setStartAt(startAtDate, e.currentTarget.value)}
					/>
				{:else}
					<input
						type="text"
						inputmode="numeric"
						pattern={timePattern}
						placeholder="HH:MM"
						class="border-dough-300 focus:border-tomato-500 w-24 rounded-lg border bg-white px-3 py-2 text-base shadow-sm"
						value={startAtTime}
						oninput={(e) => setStartAt(startAtDate, e.currentTarget.value)}
					/>
				{/if}
			</div>
			<div class="mt-1 flex items-center justify-between gap-2">
				<span class="block text-xs text-stone-500">{t.form.startAt_help}</span>
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
			<span class="block text-sm font-medium text-stone-700">{t.form.readyBy}</span>
			<div class="mt-1 flex gap-2">
				<input
					type="date"
					class="border-dough-300 focus:border-tomato-500 min-w-0 flex-1 rounded-lg border bg-white px-3 py-2 text-base shadow-sm"
					value={readyByDate}
					oninput={(e) => setReadyBy(e.currentTarget.value, readyByTime)}
				/>
				{#if useNativeTime}
					<input
						type="time"
						class="border-dough-300 focus:border-tomato-500 w-28 rounded-lg border bg-white px-3 py-2 text-base shadow-sm"
						value={readyByTime}
						oninput={(e) => setReadyBy(readyByDate, e.currentTarget.value)}
					/>
				{:else}
					<input
						type="text"
						inputmode="numeric"
						pattern={timePattern}
						placeholder="HH:MM"
						class="border-dough-300 focus:border-tomato-500 w-24 rounded-lg border bg-white px-3 py-2 text-base shadow-sm"
						value={readyByTime}
						oninput={(e) => setReadyBy(readyByDate, e.currentTarget.value)}
					/>
				{/if}
			</div>
			<span class="mt-1 block text-xs text-stone-500">{t.form.readyBy_help}</span>
		</label>
	</fieldset>

	<fieldset class="grid grid-cols-1 gap-4 sm:grid-cols-2">
		<legend class="font-display text-tomato-700 col-span-full text-lg">
			{t.form.section_recipe}
		</legend>

		<label class="block">
			<span class="block text-sm font-medium text-stone-700">{t.form.pizzaCount}</span>
			<input
				type="number"
				min="1"
				max="100"
				step="1"
				class="border-dough-300 mt-1 w-full rounded-lg border bg-white px-3 py-2 text-base shadow-sm"
				bind:value={state.pizzaCount}
			/>
		</label>

		<div class="block">
			<label class="block text-sm font-medium text-stone-700" for="ball-weight">
				{t.form.ballWeight}
			</label>
			<input
				id="ball-weight"
				type="number"
				min="100"
				max="600"
				step="1"
				class="border-dough-300 mt-1 w-full rounded-lg border bg-white px-3 py-2 text-base shadow-sm"
				bind:value={state.ballWeight}
			/>
			<button
				type="button"
				class="bg-tomato-500 hover:bg-tomato-600 mt-1.5 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-white"
				onclick={() => state.roundBallWeight()}
				title={t.form.ballWeight_round_help}
			>
				<span aria-hidden="true">↻</span>
				{t.form.ballWeight_round}
			</button>
		</div>

		<label class="block">
			<span class="block text-sm font-medium text-stone-700">{t.form.hydration}</span>
			<input
				type="number"
				min="50"
				max="90"
				step="1"
				class="border-dough-300 mt-1 w-full rounded-lg border bg-white px-3 py-2 text-base shadow-sm"
				bind:value={state.hydration}
			/>
			<span class="mt-1 block text-xs text-stone-500">{t.form.hydration_help}</span>
		</label>

		<label class="block">
			<span class="block text-sm font-medium text-stone-700">{t.form.salt}</span>
			<input
				type="number"
				min="0"
				max="5"
				step="0.1"
				class="border-dough-300 mt-1 w-full rounded-lg border bg-white px-3 py-2 text-base shadow-sm"
				bind:value={state.saltPercent}
			/>
		</label>

		<label class="block">
			<span class="block text-sm font-medium text-stone-700">{t.form.roomTemp}</span>
			<input
				type="number"
				min="10"
				max="35"
				step="0.5"
				class="border-dough-300 mt-1 w-full rounded-lg border bg-white px-3 py-2 text-base shadow-sm"
				bind:value={state.roomTempC}
			/>
			<span class="mt-1 block text-xs text-stone-500">{t.form.roomTemp_help}</span>
		</label>

		<label class="block">
			<span class="block text-sm font-medium text-stone-700">{t.form.yeastType}</span>
			<select
				class="border-dough-300 mt-1 w-full rounded-lg border bg-white px-3 py-2 text-base shadow-sm"
				bind:value={state.yeastType}
			>
				<option value="fresh">{t.form.yeast_fresh}</option>
				<option value="sourdough">{t.form.yeast_sourdough}</option>
			</select>
		</label>

		{#if state.yeastType === 'sourdough'}
			<label class="block">
				<span class="block text-sm font-medium text-stone-700">{t.form.starterHydration}</span>
				<input
					type="number"
					min="40"
					max="150"
					step="5"
					class="border-dough-300 mt-1 w-full rounded-lg border bg-white px-3 py-2 text-base shadow-sm"
					bind:value={state.starterHydration}
				/>
				<span class="mt-1 block text-xs text-stone-500">{t.form.starterHydration_help}</span>
			</label>
		{/if}
	</fieldset>

	<fieldset class="grid grid-cols-1 gap-4 sm:grid-cols-2">
		<legend class="font-display text-tomato-700 col-span-full text-lg">
			{t.form.section_advanced}
		</legend>
		<label class="block">
			<span class="block text-sm font-medium text-stone-700">{t.form.preFerment}</span>
			<select
				class="border-dough-300 mt-1 w-full rounded-lg border bg-white px-3 py-2 text-base shadow-sm"
				bind:value={state.preFermentType}
			>
				<option value="none">{t.form.preFerment_none}</option>
				<option value="biga">{t.form.preFerment_biga}</option>
				<option value="poolish">{t.form.preFerment_poolish}</option>
			</select>
		</label>

		{#if state.preFermentType !== 'none'}
			<label class="block">
				<span class="block text-sm font-medium text-stone-700">{t.form.preFermentFlour}</span>
				<input
					type="number"
					min="5"
					max="80"
					step="5"
					class="border-dough-300 mt-1 w-full rounded-lg border bg-white px-3 py-2 text-base shadow-sm"
					bind:value={state.preFermentFlour}
				/>
			</label>
		{/if}
	</fieldset>
</form>
