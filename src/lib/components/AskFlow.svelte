<script lang="ts">
	import { combineDateTimeInputs, toDatePart, toTimePart } from '$lib/format';
	import { i18n } from '$lib/i18n/i18n.svelte';
	import { interpolate } from '$lib/i18n/interpolate';
	import type { FormState } from '$lib/state.svelte';
	import { ASK_STEPS, nextStep, prevStep, stepIndex, type AskStep } from '$lib/view';
	import FermentWindowSlider from './FermentWindowSlider.svelte';
	import FlourSelect from './FlourSelect.svelte';
	import Masthead from './Masthead.svelte';
	import MastheadMenu from './MastheadMenu.svelte';
	import PlanGlance from './PlanGlance.svelte';

	// The composing surface, and the first thing a new visitor sees: one
	// question per sheet, set in the sign painter's face at a size nothing else
	// on the page can compete with, with the order forming beside it as a ticket
	// stub. Nobody is ever made to walk through this twice — anyone who arrives
	// carrying a recipe lands on the plan instead (see src/lib/view.ts).
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

	function go(next: AskStep) {
		dir = stepIndex(next) > stepIndex(step) ? 1 : -1;
		moved = true;
		onstep(next);
	}

	// The new question is what changed, so that is where the reader — keyboard
	// or screen reader — is put down.
	$effect(() => {
		void step;
		if (moved) heading?.focus();
	});

	const MIXING: { value: 'spiral' | 'stand' | 'hand'; label: () => string }[] = [
		{ value: 'spiral', label: () => t.form.mixing_spiral },
		{ value: 'stand', label: () => t.form.mixing_stand },
		{ value: 'hand', label: () => t.form.mixing_hand }
	];

	const COPY: Record<AskStep, { question: () => string; lede: () => string }> = {
		when: { question: () => t.ask.when_question, lede: () => t.ask.when_lede },
		pizzas: { question: () => t.ask.pizzas_question, lede: () => t.ask.pizzas_lede },
		flour: { question: () => t.ask.flour_question, lede: () => t.ask.flour_lede },
		window: { question: () => t.ask.window_question, lede: () => t.ask.window_lede },
		method: { question: () => t.ask.method_question, lede: () => t.ask.method_lede }
	};

	const readyByDate = $derived(toDatePart(form.readyBy));
	const readyByTime = $derived(toTimePart(form.readyBy));

	function setReadyBy(datePart: string, timePart: string) {
		const d = combineDateTimeInputs(datePart, timePart);
		if (d) form.setReadyBy(d);
	}

	function setPizzas(value: number) {
		form.pizzaCount = Math.min(100, Math.max(1, value));
	}

	const previous = $derived(prevStep(step));
	const following = $derived(nextStep(step));
	const index = $derived(stepIndex(step));
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
		<div class="grid gap-10 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start lg:gap-14">
			<div class="min-w-0">
				<!-- The measure across the top of the sheet: the flag painted under a
				     ruled strip, growing from a green sliver to the whole tricolore as
				     the questions are answered. A row of grey dots would have said
				     nothing about where you are in a printed sequence. Each division
				     is a jump back to its own question. -->
				<nav aria-label={t.nav.questions}>
					<div class="progress-rule">
						<span
							class="progress-paint"
							style="width:{((index + 1) / ASK_STEPS.length) * 100}%"
							aria-hidden="true"
						></span>
						{#each ASK_STEPS as s (s)}
							<button
								type="button"
								class="progress-seg"
								aria-label={COPY[s].question()}
								aria-current={s === step ? 'step' : undefined}
								onclick={() => go(s)}
							></button>
						{/each}
					</div>
					<p class="label-caps text-ink-soft mt-2">
						{interpolate(t.nav.progress, { n: index + 1, total: ASK_STEPS.length })}
					</p>
				</nav>

				<!-- Keyed on the step so the whole question block is replaced, which is
				     what lets it slide in as one sheet rather than re-rendering in
				     place. The stub beside it deliberately sits outside the key: it is
				     the continuity, and re-animating it would contradict that. -->
				{#key step}
					<div class="kt-enter mt-7" style="--kt-dir:{dir}">
						<h1 class="question max-w-[14ch]" tabindex="-1" bind:this={heading}>
							{COPY[step].question()}
						</h1>
						<p class="lede mt-5">{COPY[step].lede()}</p>

						<div class="mt-8 max-w-xl">
							{#if step === 'when'}
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
							{:else if step === 'pizzas'}
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
							{:else if step === 'flour'}
								<label class="block">
									<span class="sr-only">{t.form.flour}</span>
									<FlourSelect {form} class="input-lg w-full text-lg sm:text-xl" />
								</label>
							{:else if step === 'window'}
								<FermentWindowSlider {form} warnings />
							{:else}
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
									<p class="text-ink-soft max-w-[46ch] pt-2 text-sm leading-relaxed">
										{t.form.mixingMethod_help}
									</p>
								</fieldset>
							{/if}
						</div>
					</div>
				{/key}
			</div>

			<div class="lg:sticky lg:top-8">
				<PlanGlance {form} />
			</div>
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
