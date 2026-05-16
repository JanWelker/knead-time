<script lang="ts">
	import { browser } from '$app/environment';
	import { base } from '$app/paths';
	import { onMount } from 'svelte';

	import { buildIcs } from '$lib/dough/ics';
	import { decodeInputs, encodeInputs } from '$lib/dough/urlState';
	import Community from '$lib/components/Community.svelte';
	import Pizzerias from '$lib/components/Pizzerias.svelte';
	import FitScore from '$lib/components/FitScore.svelte';
	import Ingredients from '$lib/components/Ingredients.svelte';
	import InputForm from '$lib/components/InputForm.svelte';
	import LangSwitcher from '$lib/components/LangSwitcher.svelte';
	import ModeBadge from '$lib/components/ModeBadge.svelte';
	import ScheduleTable from '$lib/components/ScheduleTable.svelte';
	import ThemeSwitcher from '$lib/components/ThemeSwitcher.svelte';
	import TrmnlPush from '$lib/components/TrmnlPush.svelte';
	import Warnings from '$lib/components/Warnings.svelte';
	import { i18n } from '$lib/i18n/i18n.svelte';
	import { interpolate } from '$lib/i18n/interpolate';
	import { findMatchingPizzeria } from '$lib/pizzerias/pizzerias';
	import { FormState } from '$lib/state.svelte';
	import { stepDescription, stepTitle } from '$lib/stepCopy';

	const currentYear = new Date().getFullYear();
	const appVersion = __APP_VERSION__;

	const form = new FormState();
	const t = $derived(i18n.t);
	const locale = $derived(i18n.locale);

	let copied = $state<'share' | null>(null);
	let hydrated = $state(false);
	let actionsRef: HTMLDetailsElement | null = $state(null);
	let actionsOpen = $state(false);

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

	// Surfaces source-recipe context (timings, name) when the form params
	// match a known pizzeria. Adjusting only the bake time keeps the match.
	const activePizzeria = $derived(findMatchingPizzeria(form.inputs));

	function printPage() {
		// Dedicated print route owns its stylesheet and auto-triggers print().
		const qs = encodeInputs(form.serializable());
		window.open(`${base}/print/${locale}?${qs}`, '_blank');
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

	async function copy(url: string) {
		try {
			await navigator.clipboard.writeText(url);
			copied = 'share';
			setTimeout(() => (copied = null), 1500);
		} catch {
			// Browser denied clipboard access — drop silently; the share URL
			// is also visible in the address bar.
		}
	}

	// Close the actions menu on outside-click + Escape — <details> handles
	// click-on-summary toggle natively, but doesn't dismiss otherwise.
	$effect(() => {
		if (!browser || !actionsOpen) return;
		function onDocClick(event: MouseEvent) {
			if (actionsRef && !actionsRef.contains(event.target as Node)) {
				actionsOpen = false;
			}
		}
		function onKey(event: KeyboardEvent) {
			if (event.key === 'Escape') actionsOpen = false;
		}
		document.addEventListener('click', onDocClick);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('click', onDocClick);
			document.removeEventListener('keydown', onKey);
		};
	});
</script>

<svelte:head>
	<title>{t.app.title} — {t.app.tagline}</title>
</svelte:head>

<main class="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
	<header class="mb-8 flex flex-wrap items-start justify-between gap-4">
		<div>
			<h1 class="font-display text-accent text-4xl sm:text-5xl">{t.app.title}</h1>
			<p class="mt-2 max-w-xl text-stone-600 dark:text-stone-300">{t.app.tagline}</p>
		</div>
		<div class="flex flex-wrap items-center gap-2">
			<LangSwitcher />
			<ThemeSwitcher />
		</div>
	</header>

	<div class="grid grid-cols-1 gap-8 lg:grid-cols-5">
		<section class="card lg:col-span-2 lg:min-w-0">
			<InputForm state={form} />
		</section>

		<section class="space-y-6 lg:col-span-3">
			<div class="card">
				<div class="mb-4 flex flex-wrap items-end justify-between gap-3">
					<div>
						<h2 class="font-display text-2xl text-stone-900 dark:text-stone-100">
							{t.schedule.heading}
						</h2>
						<div class="mt-2 flex flex-wrap items-center gap-3">
							<ModeBadge mode={form.schedule.mode} />
							<FitScore schedule={form.schedule} inputs={form.serializable()} />
						</div>
					</div>
					<div class="relative">
						<details bind:this={actionsRef} bind:open={actionsOpen}>
							<summary
								class="btn-tomato flex cursor-pointer list-none items-center gap-2 select-none"
								aria-haspopup="menu"
								aria-label={t.actions.menu}
							>
								<svg
									width="14"
									height="14"
									viewBox="0 0 16 16"
									fill="currentColor"
									aria-hidden="true"
								>
									<rect y="3" width="16" height="2" rx="1" />
									<rect y="7" width="16" height="2" rx="1" />
									<rect y="11" width="16" height="2" rx="1" />
								</svg>
								<span>{t.actions.menu}</span>
							</summary>
							<div
								role="menu"
								class="border-dough-200 absolute right-0 z-20 mt-2 min-w-[14rem] overflow-hidden rounded-2xl border bg-white py-1 shadow-lg dark:border-stone-700 dark:bg-stone-800"
							>
								<button
									type="button"
									role="menuitem"
									class="menu-item"
									onclick={downloadIcs}
									disabled={!form.schedule.feasible}
								>
									{t.actions.download_ics}
								</button>
								<button
									type="button"
									role="menuitem"
									class="menu-item"
									onclick={printPage}
									disabled={!form.schedule.feasible}
								>
									{t.actions.print}
								</button>
								<button
									type="button"
									role="menuitem"
									class="menu-item"
									onclick={() => copy(window.location.href)}
								>
									{copied === 'share' ? t.actions.copied : t.actions.share}
								</button>
								<TrmnlPush
									inputs={form.serializable()}
									schedule={form.schedule}
									{locale}
									triggerClass="menu-item"
								/>
							</div>
						</details>
					</div>
				</div>

				<Warnings warnings={form.schedule.warnings} />
				<div class="mt-4">
					<ScheduleTable schedule={form.schedule} sourceTiming={activePizzeria?.timing} />
				</div>
			</div>

			<div class="card">
				<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
					<h2 class="font-display text-2xl text-stone-900 dark:text-stone-100">
						{t.ingredients.heading}
					</h2>
					<button
						type="button"
						class="btn-tomato-sm inline-flex items-center gap-1"
						onclick={() => form.roundBallWeight()}
						title={t.form.ballWeight_round_help}
						aria-label={t.form.ballWeight_round_help}
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

	<section class="card mt-8">
		<Community />
	</section>

	<section class="card mt-8">
		<Pizzerias />
	</section>

	<footer class="mt-12 text-center text-xs text-stone-500 dark:text-stone-400">
		<p>{t.footer.about}</p>
		<p class="mt-1 text-stone-400 dark:text-stone-500">{t.actions.share_help}</p>
		<p
			class="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-stone-400 dark:text-stone-500"
		>
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
		<p class="mt-2 text-stone-400 dark:text-stone-500">
			<a
				href="https://github.com/JanWelker/knead-time/blob/main/LICENSE"
				target="_blank"
				rel="noopener noreferrer"
				class="hover:text-tomato-600 underline-offset-2 hover:underline"
			>
				{interpolate(t.footer.license, { year: currentYear })}
			</a>
			<span aria-hidden="true">·</span>
			<a
				href="https://github.com/JanWelker/knead-time/releases/tag/v{appVersion}"
				target="_blank"
				rel="noopener noreferrer"
				class="hover:text-tomato-600 underline-offset-2 hover:underline"
			>
				v{appVersion}
			</a>
		</p>
	</footer>
</main>
