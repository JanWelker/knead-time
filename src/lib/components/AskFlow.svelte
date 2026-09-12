<script lang="ts">
	import { combineDateTimeInputs, toDatePart, toTimePart } from '$lib/format';
	import { i18n } from '$lib/i18n/i18n.svelte';
	import { interpolate } from '$lib/i18n/interpolate';
	import { uiMode } from '$lib/mode.svelte';
	import type { UiMode } from '$lib/storedMode';
	import type { FormState } from '$lib/state.svelte';
	import { askSteps, nextStep, prevStep, stepIndex, type AskStep } from '$lib/view';
	import DoughFields from './DoughFields.svelte';
	import FermentWindowSlider from './FermentWindowSlider.svelte';
	import FlourSelect from './FlourSelect.svelte';
	import FormField from './FormField.svelte';
	import LeavenFields from './LeavenFields.svelte';
	import Masthead from './Masthead.svelte';
	import MastheadMenu from './MastheadMenu.svelte';
	import ProofFields from './ProofFields.svelte';

	// The composing surface, and the first thing a new visitor sees: one
	// decision per sheet, set in the sign painter's face at a size nothing else
	// on the page can compete with. Nobody is ever made to walk through this
	// twice — anyone who arrives carrying a recipe lands on the plan instead
	// (see src/lib/view.ts).
	//
	// The first question is which route to take, and its answer decides which of
	// the rest are asked (issue #316): the flow walks the fields the chosen view
	// mode shows, in the recipe sheet's own order, so the two doors into the same
	// twenty numbers cannot disagree about what there is or what comes first. The
	// three advanced screens render the sheet's own field groups rather than a
	// second hand-written copy of them.
	//
	// There used to be a running "your plan so far" stub beside the question.
	// Below `lg` it stacked *under* the question rather than beside it, so on the
	// phone this flow is written for it cost most of a screen before a single
	// answer had been given.
	let {
		form,
		step,
		onstep,
		onplan,
		onlibrary
	}: {
		form: FormState;
		step: AskStep;
		onstep: (step: AskStep) => void;
		onplan: () => void;
		onlibrary: () => void;
	} = $props();

	const t = $derived(i18n.t);

	// Which way the sheet slides. Set by the control that moves us, so a Back
	// button pulls the question in from the left and Next from the right; the
	// browser's own back button keeps whatever the last move was.
	let dir = $state(1);

	let heading = $state<HTMLHeadingElement | null>(null);
	// Only after a move: focusing the heading on first paint would scroll a
	// freshly opened page and read the question before the visitor asked for it.
	let moved = false;

	// The walk this visitor is on. Answering the first question re-cuts it, and
	// the progress rule below re-divides with it — which is the honest way to
	// show what the answer just bought or cost.
	const steps = $derived(askSteps(uiMode.current));
	const index = $derived(stepIndex(step, steps));
	const previous = $derived(prevStep(step, steps));
	const following = $derived(nextStep(step, steps));

	function go(next: AskStep) {
		dir = stepIndex(next, steps) > index ? 1 : -1;
		moved = true;
		onstep(next);
	}

	// The new question is what changed, so that is where the reader — keyboard
	// or screen reader — is put down.
	$effect(() => {
		void step;
		if (moved) heading?.focus();
	});

	const MODES: { value: UiMode; label: () => string }[] = [
		{ value: 'beginner', label: () => t.ask.mode_simple },
		{ value: 'expert', label: () => t.ask.mode_advanced }
	];

	const MIXING: { value: 'spiral' | 'stand' | 'hand'; label: () => string }[] = [
		{ value: 'spiral', label: () => t.form.mixing_spiral },
		{ value: 'stand', label: () => t.form.mixing_stand },
		{ value: 'hand', label: () => t.form.mixing_hand }
	];

	// Copy is looked up by step name rather than listed in a record: every
	// question has the same four pieces, so a record was nine rows of the same
	// four lines and one more place to forget a new step.
	const question = (s: AskStep) => t.ask[`${s}_question`];
	const lede = (s: AskStep) => t.ask[`${s}_lede`];

	const readyByDate = $derived(toDatePart(form.readyBy));
	const readyByTime = $derived(toTimePart(form.readyBy));

	function setReadyBy(datePart: string, timePart: string) {
		const d = combineDateTimeInputs(datePart, timePart);
		if (d) form.setReadyBy(d);
	}

	function setPizzas(value: number) {
		form.pizzaCount = Math.min(100, Math.max(1, value));
	}

	const groupClass = 'grid grid-cols-1 gap-4 sm:grid-cols-2';
</script>

{#snippet askMenu(close: () => void)}
	<div role="group" class="menu-group">
		<button
			type="button"
			role="menuitem"
			class="menu-item"
			onclick={() => {
				close();
				onlibrary();
			}}
		>
			{t.nav.library}
		</button>
	</div>
{/snippet}

<div class="view" data-view="ask">
	<Masthead>
		<MastheadMenu items={askMenu} />
		<!-- The escape hatch stays in the row rather than going into the menu: a
		     sequence of questions with no visible way out reads as a trap. -->
		<button type="button" class="btn-ghost" onclick={onplan}>{t.nav.skip}</button>
	</Masthead>

	<div class="view-pad flex-1 pt-8 pb-10 sm:pt-14">
		<div class="max-w-3xl">
			<!-- The measure across the top of the sheet: the flag painted under a
			     ruled strip, growing from a green sliver to the whole tricolore as
			     the questions are answered. A row of grey dots would have said
			     nothing about where you are in a printed sequence. Each division
			     is a jump back to its own question. -->
			<nav aria-label={t.nav.questions}>
				<div class="progress-rule">
					<span
						class="progress-paint"
						style="width:{((index + 1) / steps.length) * 100}%"
						aria-hidden="true"
					></span>
					{#each steps as s (s)}
						<button
							type="button"
							class="progress-seg"
							aria-label={question(s)}
							aria-current={s === step ? 'step' : undefined}
							onclick={() => go(s)}
						></button>
					{/each}
				</div>
				<p class="label-caps text-ink-soft mt-2">
					{interpolate(t.nav.progress, { n: index + 1, total: steps.length })}
				</p>
			</nav>

			<!-- Keyed on the step so the whole question block is replaced, which is
			     what lets it slide in as one sheet rather than re-rendering in
			     place. -->
			{#key step}
				<div class="kt-enter mt-7" style="--kt-dir:{dir}">
					<h1 class="question max-w-[14ch]" tabindex="-1" bind:this={heading}>
						{question(step)}
					</h1>
					<p class="lede mt-5">{lede(step)}</p>

					<div class="mt-8 max-w-xl">
						{#if step === 'mode'}
							<fieldset class="space-y-2">
								<legend class="sr-only">{t.ask.mode_question}</legend>
								{#each MODES as option (option.value)}
									<label class="tile">
										<input
											type="radio"
											name="uiMode"
											value={option.value}
											class="accent-accent size-4"
											checked={uiMode.current === option.value}
											onchange={() => uiMode.set(option.value)}
										/>
										<span class="text-lg font-semibold">{option.label()}</span>
									</label>
								{/each}
							</fieldset>
						{:else if step === 'when'}
							<!-- Stacked on a phone: a native date box needs room for its own
							     picker glyph, and side by side with the time it clipped the year
							     at 390 px. -->
							<div class="flex flex-col gap-3 sm:flex-row">
								<input
									type="date"
									class="input-lg min-w-0 sm:flex-1"
									value={readyByDate}
									aria-label="{t.form.readyBy} — {t.form.field_date}"
									oninput={(e) => setReadyBy(e.currentTarget.value, readyByTime)}
								/>
								<input
									type="time"
									class="input-lg w-full sm:w-44"
									value={readyByTime}
									aria-label="{t.form.readyBy} — {t.form.field_time}"
									oninput={(e) => setReadyBy(readyByDate, e.currentTarget.value)}
								/>
							</div>
						{:else if step === 'flour'}
							<label class="block">
								<span class="sr-only">{t.form.flour}</span>
								<FlourSelect {form} class="input-lg w-full text-lg sm:text-xl" />
							</label>
							<!-- The raw W behind the preset is expert-only in the sheet and
							     expert-only here, for the same reason: the shelves already
							     carry it. -->
							{#if uiMode.current === 'expert' && form.flourW !== null}
								<div class="mt-4 max-w-xs">
									<FormField
										label={t.form.flourW}
										min={150}
										max={400}
										step={5}
										help={t.form.flourW_help}
										bind:value={form.flourW}
										oncommit={() => form.repickWindow()}
									/>
								</div>
							{/if}
						{:else if step === 'window'}
							<FermentWindowSlider {form} warnings />
						{:else if step === 'batch'}
							<div class="flex items-center gap-3">
								<button
									type="button"
									class="stepper"
									aria-label={t.ask.fewer}
									onclick={() => setPizzas(form.pizzaCount - 1)}
								>
									<span aria-hidden="true">−</span>
								</button>
								<input
									type="number"
									min="1"
									max="100"
									step="1"
									inputmode="numeric"
									class="input-lg w-28 text-center"
									aria-label={t.form.pizzaCount}
									bind:value={form.pizzaCount}
									onchange={(e) => {
										// An emptied number box writes null upstream; put the live
										// value back rather than leave the field blank against it.
										if (e.currentTarget.value === '')
											e.currentTarget.value = String(form.pizzaCount);
									}}
								/>
								<button
									type="button"
									class="stepper"
									aria-label={t.ask.more}
									onclick={() => setPizzas(form.pizzaCount + 1)}
								>
									<span aria-hidden="true">+</span>
								</button>
							</div>
							{#if uiMode.current === 'expert'}
								<div class="mt-4 max-w-xs">
									<FormField
										label={t.form.ballWeight}
										min={100}
										max={600}
										step={1}
										bind:value={form.ballWeight}
									/>
								</div>
							{/if}
						{:else if step === 'dough'}
							<fieldset class={groupClass}>
								<legend class="sr-only">{t.adjust.group_dough}</legend>
								<DoughFields {form} />
							</fieldset>
						{:else if step === 'method'}
							<fieldset class="space-y-2">
								<legend class="sr-only">{t.form.mixingMethod}</legend>
								{#each MIXING as method (method.value)}
									<label class="tile">
										<input
											type="radio"
											name="mixingMethod"
											value={method.value}
											class="accent-accent size-4"
											bind:group={form.mixingMethod}
										/>
										<span class="text-lg font-semibold">{method.label()}</span>
									</label>
								{/each}
							</fieldset>
						{:else if step === 'leaven'}
							<fieldset class={groupClass}>
								<legend class="sr-only">{t.adjust.group_leaven}</legend>
								<LeavenFields {form} />
							</fieldset>
						{:else}
							<fieldset class={groupClass}>
								<legend class="sr-only">{t.adjust.group_proof}</legend>
								<ProofFields {form} />
							</fieldset>
						{/if}
					</div>

					<!-- Every question says what its answer buys and what it costs. A
					     control with no consequence written next to it is a survey
					     question, and half of these are decisions a first-time baker has
					     no way to weigh from the label alone. Both headings are set in
					     the same ink: basil is spent on fermentation quality and the
					     flag, tomato on refusals, and neither of these is either. -->
					<dl class="mt-9 max-w-[52ch] space-y-4">
						<div>
							<dt class="label-caps text-ink-soft">{t.ask.upside_label}</dt>
							<dd class="text-ink mt-1 text-sm leading-relaxed">{t.ask[`${step}_upside`]}</dd>
						</div>
						<div>
							<dt class="label-caps text-ink-soft">{t.ask.downside_label}</dt>
							<dd class="text-ink mt-1 text-sm leading-relaxed">{t.ask[`${step}_downside`]}</dd>
						</div>
					</dl>
				</div>
			{/key}
		</div>
	</div>

	<div class="view-pad rule py-5">
		<div class="flex items-center justify-between gap-4">
			<button
				type="button"
				class="btn-ghost px-4 py-2.5"
				disabled={previous === null}
				onclick={() => previous && go(previous)}
			>
				{t.nav.back}
			</button>

			{#if following}
				<button type="button" class="btn-tomato" onclick={() => go(following)}>
					{t.nav.next}
				</button>
			{:else}
				<button type="button" class="btn-tomato" onclick={onplan}>{t.nav.see_plan}</button>
			{/if}
		</div>
	</div>
</div>
