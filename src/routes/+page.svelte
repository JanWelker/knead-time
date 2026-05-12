<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	import { buildIcs } from '$lib/dough/ics';
	import { decodeInputs, encodeInputs } from '$lib/dough/urlState';
	import Ingredients from '$lib/components/Ingredients.svelte';
	import InputForm from '$lib/components/InputForm.svelte';
	import LangSwitcher from '$lib/components/LangSwitcher.svelte';
	import ModeBadge from '$lib/components/ModeBadge.svelte';
	import ScheduleTable from '$lib/components/ScheduleTable.svelte';
	import Warnings from '$lib/components/Warnings.svelte';
	import { formatBallWeight, formatDateTime } from '$lib/format';
	import { i18n } from '$lib/i18n/i18n.svelte';
	import { interpolate } from '$lib/i18n/interpolate';
	import { FormState } from '$lib/state.svelte';
	import { stepDescription, stepTitle } from '$lib/stepCopy';

	const currentYear = new Date().getFullYear();

	const form = new FormState();
	const t = $derived(i18n.t);
	const locale = $derived(i18n.locale);

	let copied = $state(false);
	let hydrated = $state(false);

	onMount(() => {
		const parsed = decodeInputs(window.location.search);
		form.apply(parsed);
		hydrated = true;
	});

	$effect(() => {
		if (!browser || !hydrated) return;
		const qs = encodeInputs(form.serializable());
		const next = `${window.location.pathname}?${qs}`;
		if (next !== window.location.pathname + window.location.search) {
			history.replaceState({}, '', next);
		}
	});

	const shareUrl = $derived(
		browser
			? `${window.location.origin}${window.location.pathname}?${encodeInputs(form.serializable())}`
			: ''
	);

	const yeastLabel = $derived(
		form.yeastType === 'fresh' ? t.form.yeast_fresh : t.form.yeast_sourdough
	);

	const preFermentLabel = $derived(
		form.preFermentType === 'biga'
			? t.form.preFerment_biga
			: form.preFermentType === 'poolish'
				? t.form.preFerment_poolish
				: null
	);

	function printPage() {
		window.print();
	}

	function downloadIcs() {
		const ics = buildIcs(form.schedule.steps, (step) => ({
			summary: stepTitle(step, t),
			description: stepDescription(step, t, form.schedule)
		}));
		const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'kneadtime.ics';
		document.body.appendChild(a);
		a.click();
		a.remove();
		URL.revokeObjectURL(url);
	}

	async function shareLink() {
		try {
			await navigator.clipboard.writeText(window.location.href);
			copied = true;
			setTimeout(() => (copied = false), 1500);
		} catch {
			// best-effort: select the input on failure (omitted for brevity)
		}
	}
</script>

<svelte:head>
	<title>{t.app.title} — {t.app.tagline}</title>
</svelte:head>

<main class="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 print:max-w-none print:px-0 print:py-0">
	<header class="mb-8 flex flex-wrap items-start justify-between gap-4 print:hidden">
		<div>
			<h1 class="font-display text-tomato-700 text-4xl sm:text-5xl">{t.app.title}</h1>
			<p class="mt-2 max-w-xl text-stone-600">{t.app.tagline}</p>
		</div>
		<LangSwitcher />
	</header>

	<header class="print-only mb-4">
		<h1 class="font-display text-tomato-700 text-3xl">{t.app.title}</h1>
		<p class="text-sm text-stone-600">{t.app.tagline}</p>
	</header>

	<section class="print-only mb-6 break-inside-avoid">
		<h2 class="font-display mb-2 text-xl text-stone-900">{t.print.recipe_heading}</h2>
		<dl class="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
			<dt class="text-stone-600">{t.form.readyBy}</dt>
			<dd class="font-medium">{formatDateTime(form.readyBy, locale)}</dd>
			<dt class="text-stone-600">{t.form.pizzaCount}</dt>
			<dd class="font-medium">{form.pizzaCount} × {formatBallWeight(form.ballWeight)} g</dd>
			<dt class="text-stone-600">{t.form.hydration}</dt>
			<dd class="font-medium">{form.hydration}%</dd>
			<dt class="text-stone-600">{t.form.salt}</dt>
			<dd class="font-medium">{form.saltPercent}%</dd>
			<dt class="text-stone-600">{t.form.yeastType}</dt>
			<dd class="font-medium">{yeastLabel}</dd>
			<dt class="text-stone-600">{t.form.roomTemp}</dt>
			<dd class="font-medium">{form.roomTempC} °C</dd>
			{#if preFermentLabel}
				<dt class="text-stone-600">{t.form.preFerment}</dt>
				<dd class="font-medium">{preFermentLabel}</dd>
			{/if}
		</dl>
	</section>

	<div class="grid grid-cols-1 gap-8 lg:grid-cols-5 print:block print:gap-0">
		<section
			class="border-dough-200 rounded-2xl border bg-white/80 p-6 shadow-sm backdrop-blur lg:col-span-2 print:hidden"
		>
			<InputForm state={form} />
		</section>

		<section class="space-y-6 lg:col-span-3 print:space-y-4">
			<div
				class="border-dough-200 rounded-2xl border bg-white/80 p-6 shadow-sm backdrop-blur print:rounded-none print:border-0 print:bg-transparent print:p-0 print:shadow-none print:backdrop-blur-none"
			>
				<div class="mb-4 flex flex-wrap items-end justify-between gap-3 print:mb-2">
					<div>
						<h2 class="font-display text-2xl text-stone-900">{t.schedule.heading}</h2>
						<div class="mt-2"><ModeBadge mode={form.schedule.mode} /></div>
					</div>
					<div class="flex flex-wrap gap-2 print:hidden">
						<button
							type="button"
							class="bg-tomato-500 hover:bg-tomato-600 rounded-full px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
							onclick={downloadIcs}
							disabled={!form.schedule.feasible}
						>
							{t.actions.download_ics}
						</button>
						<button
							type="button"
							class="bg-tomato-500 hover:bg-tomato-600 rounded-full px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
							onclick={printPage}
							disabled={!form.schedule.feasible}
						>
							{t.actions.print}
						</button>
						<button
							type="button"
							class="bg-tomato-500 hover:bg-tomato-600 rounded-full px-4 py-2 text-sm font-semibold text-white"
							onclick={shareLink}
						>
							{copied ? t.actions.copied : t.actions.share}
						</button>
					</div>
				</div>

				<Warnings warnings={form.schedule.warnings} />
				<div class="mt-4 print:mt-2">
					<ScheduleTable schedule={form.schedule} />
				</div>
			</div>

			<div
				class="border-dough-200 rounded-2xl border bg-white/80 p-6 shadow-sm backdrop-blur print:break-inside-avoid print:rounded-none print:border-0 print:bg-transparent print:p-0 print:shadow-none print:backdrop-blur-none"
			>
				<div class="mb-4 flex flex-wrap items-center justify-between gap-3 print:mb-2">
					<h2 class="font-display text-2xl text-stone-900">
						{t.ingredients.heading}
					</h2>
					<button
						type="button"
						class="bg-tomato-500 hover:bg-tomato-600 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-white print:hidden"
						onclick={() => form.roundBallWeight()}
						title={t.form.ballWeight_round_help}
					>
						<span aria-hidden="true">↻</span>
						{t.form.ballWeight_round}
					</button>
				</div>
				<Ingredients
					ingredients={form.schedule.ingredients}
					yeastType={form.yeastType}
					yeastPercent={form.schedule.yeastPercent}
				/>
			</div>
		</section>
	</div>

	<footer class="mt-12 text-center text-xs text-stone-500 print:hidden">
		<p>{t.footer.about}</p>
		<p class="mt-1 text-stone-400">{t.actions.share_help}</p>
		<p class="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-stone-400">
			<a
				href="https://github.com/JanWelker/knead-time"
				target="_blank"
				rel="noopener noreferrer"
				class="hover:text-tomato-600 underline-offset-2 hover:underline"
			>
				{t.footer.source}
			</a>
			<span aria-hidden="true">·</span>
			<a
				href="https://github.com/JanWelker/knead-time#readme"
				target="_blank"
				rel="noopener noreferrer"
				class="hover:text-tomato-600 underline-offset-2 hover:underline"
			>
				{t.footer.docs}
			</a>
			<span aria-hidden="true">·</span>
			<a
				href="https://github.com/JanWelker/knead-time/issues"
				target="_blank"
				rel="noopener noreferrer"
				class="hover:text-tomato-600 underline-offset-2 hover:underline"
			>
				{t.footer.support}
			</a>
		</p>
		<p class="mt-2 text-stone-400">
			<a
				href="https://github.com/JanWelker/knead-time/blob/main/LICENSE"
				target="_blank"
				rel="noopener noreferrer"
				class="hover:text-tomato-600 underline-offset-2 hover:underline"
			>
				{interpolate(t.footer.license, { year: currentYear })}
			</a>
		</p>
	</footer>

	<footer class="print-only mt-6 border-t border-stone-300 pt-3 text-xs text-stone-500">
		<p>{t.footer.about}</p>
		<p class="mt-1">
			<span class="text-stone-400">{t.print.source_label}:</span>
			<span class="break-all">{shareUrl}</span>
		</p>
	</footer>
</main>
