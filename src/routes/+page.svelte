<script lang="ts">
	import { browser } from '$app/environment';
	import { base } from '$app/paths';
	import { onMount } from 'svelte';

	import { buildIcs } from '$lib/dough/ics';
	import { decodeInputs, encodeInputs } from '$lib/dough/urlState';
	import Community from '$lib/components/Community.svelte';
	import Ingredients from '$lib/components/Ingredients.svelte';
	import InputForm from '$lib/components/InputForm.svelte';
	import LangSwitcher from '$lib/components/LangSwitcher.svelte';
	import ModeBadge from '$lib/components/ModeBadge.svelte';
	import ScheduleTable from '$lib/components/ScheduleTable.svelte';
	import ThemeSwitcher from '$lib/components/ThemeSwitcher.svelte';
	import Warnings from '$lib/components/Warnings.svelte';
	import { formatBallWeight, formatDateTime } from '$lib/format';
	import { i18n } from '$lib/i18n/i18n.svelte';
	import { interpolate } from '$lib/i18n/interpolate';
	import { qrCode } from '$lib/qr';
	import { FormState } from '$lib/state.svelte';
	import { stepDescription, stepTitle } from '$lib/stepCopy';

	const currentYear = new Date().getFullYear();
	const appVersion = __APP_VERSION__;

	const btnClass =
		'bg-tomato-500 hover:bg-tomato-600 rounded-full px-4 py-2 text-sm font-semibold text-white disabled:opacity-50';

	const menuItemClass =
		'hover:bg-dough-100 block w-full px-4 py-2 text-left text-sm font-medium text-stone-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-stone-200 dark:hover:bg-stone-700';

	const cardClass =
		'border-dough-200 rounded-2xl border bg-white/80 p-6 shadow-sm backdrop-blur dark:border-stone-700 dark:bg-stone-900/70 print:rounded-none print:border-0 print:bg-transparent print:p-0 print:shadow-none print:backdrop-blur-none print:break-inside-avoid';

	const form = new FormState();
	const t = $derived(i18n.t);
	const locale = $derived(i18n.locale);

	let copied = $state<'share' | 'trmnl' | null>(null);
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

	const shareUrl = $derived(
		browser
			? `${window.location.origin}${window.location.pathname}?${encodeInputs(form.serializable())}`
			: ''
	);

	// Locale lives in the URL path so the prerendered HTML for that route
	// ships with localized labels — TRMNL's renderer doesn't run our JS to
	// re-render after navigator.languages detection.
	const trmnlUrl = $derived(
		browser
			? `${window.location.origin}${base}/trmnl/${locale}?${encodeInputs(form.serializable())}`
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
		// Open the dedicated print route in a new tab. That route owns the
		// print stylesheet, mounts a self-contained recipe summary, and
		// auto-triggers window.print() — the user sees the system dialog
		// directly without our chrome bleeding through.
		const qs = encodeInputs(form.serializable());
		const printUrl = `${base}/print/${locale}?${qs}`;
		window.open(printUrl, '_blank');
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

	async function copy(kind: 'share' | 'trmnl', url: string) {
		try {
			await navigator.clipboard.writeText(url);
			copied = kind;
			setTimeout(() => (copied = null), 1500);
		} catch {
			// best-effort: select the input on failure (omitted for brevity)
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

<main class="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 print:max-w-none print:px-0 print:py-0">
	<header
		class="print:border-dough-300 mb-8 flex flex-wrap items-start justify-between gap-4 print:mb-3 print:block print:border-b print:pb-2"
	>
		<div>
			<h1
				class="font-display text-tomato-700 dark:text-tomato-300 text-4xl sm:text-5xl print:text-2xl"
			>
				{t.app.title}
			</h1>
			<p class="mt-2 max-w-xl text-stone-600 dark:text-stone-300 print:hidden">
				{t.app.tagline}
			</p>
		</div>
		<div class="flex flex-wrap items-center gap-2 print:hidden">
			<LangSwitcher />
			<ThemeSwitcher />
		</div>
	</header>

	<section class="print-only mb-3 break-inside-avoid">
		<div class="grid grid-cols-2 gap-6">
			<div>
				<h2 class="font-display text-tomato-700 mb-1 text-lg">{t.print.recipe_heading}</h2>
				<table class="tabular w-full border-collapse">
					<tbody>
						<tr class="border-dough-200/70 border-b last:border-0">
							<th class="text-left font-normal text-stone-600">{t.form.readyBy}</th>
							<td class="text-right font-medium tabular-nums">
								{formatDateTime(form.readyBy, locale)}
							</td>
						</tr>
						<tr class="border-dough-200/70 border-b last:border-0">
							<th class="text-left font-normal text-stone-600">{t.form.pizzaCount}</th>
							<td class="text-right font-medium tabular-nums">
								{form.pizzaCount} × {formatBallWeight(form.ballWeight)} g
							</td>
						</tr>
						<tr class="border-dough-200/70 border-b last:border-0">
							<th class="text-left font-normal text-stone-600">{t.form.hydration}</th>
							<td class="text-right font-medium tabular-nums">{form.hydration}%</td>
						</tr>
						<tr class="border-dough-200/70 border-b last:border-0">
							<th class="text-left font-normal text-stone-600">{t.form.salt}</th>
							<td class="text-right font-medium tabular-nums">{form.saltPercent}%</td>
						</tr>
						<tr class="border-dough-200/70 border-b last:border-0">
							<th class="text-left font-normal text-stone-600">{t.form.yeastType}</th>
							<td class="text-right font-medium">{yeastLabel}</td>
						</tr>
						<tr class="border-dough-200/70 border-b last:border-0">
							<th class="text-left font-normal text-stone-600">{t.form.roomTemp}</th>
							<td class="text-right font-medium tabular-nums">{form.roomTempC} °C</td>
						</tr>
						{#if form.schedule.mode === 'cold'}
							<tr class="border-dough-200/70 border-b last:border-0">
								<th class="text-left font-normal text-stone-600">{t.form.fridgeTemp}</th>
								<td class="text-right font-medium tabular-nums">{form.fridgeTempC} °C</td>
							</tr>
						{/if}
						{#if preFermentLabel}
							<tr class="border-dough-200/70 border-b last:border-0">
								<th class="text-left font-normal text-stone-600">{t.form.preFerment}</th>
								<td class="text-right font-medium">{preFermentLabel}</td>
							</tr>
						{/if}
					</tbody>
				</table>
			</div>
			<div>
				<h2 class="font-display text-tomato-700 mb-1 text-lg">{t.ingredients.heading}</h2>
				<Ingredients
					ingredients={form.schedule.ingredients}
					yeastType={form.yeastType}
					yeastPercent={form.schedule.yeastPercent}
				/>
			</div>
		</div>
	</section>

	<div class="grid grid-cols-1 gap-8 lg:grid-cols-5 print:block print:gap-0">
		<section
			class="border-dough-200 rounded-2xl border bg-white/80 p-6 shadow-sm backdrop-blur lg:col-span-2 lg:min-w-0 dark:border-stone-700 dark:bg-stone-900/70 print:hidden"
		>
			<InputForm state={form} />
		</section>

		<section class="space-y-6 lg:col-span-3 print:space-y-2">
			<div class={cardClass}>
				<div class="mb-4 flex flex-wrap items-end justify-between gap-3 print:mb-1">
					<div>
						<h2
							class="font-display print:text-tomato-700 text-2xl text-stone-900 dark:text-stone-100 print:text-lg"
						>
							{t.schedule.heading}
						</h2>
						<div class="mt-2 print:hidden"><ModeBadge mode={form.schedule.mode} /></div>
					</div>
					<div class="relative print:hidden">
						<details bind:this={actionsRef} bind:open={actionsOpen}>
							<summary
								class="{btnClass} flex cursor-pointer list-none items-center gap-2 select-none"
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
									class={menuItemClass}
									onclick={downloadIcs}
									disabled={!form.schedule.feasible}
								>
									{t.actions.download_ics}
								</button>
								<button
									type="button"
									role="menuitem"
									class={menuItemClass}
									onclick={printPage}
									disabled={!form.schedule.feasible}
								>
									{t.actions.print}
								</button>
								<button
									type="button"
									role="menuitem"
									class={menuItemClass}
									onclick={() => copy('share', window.location.href)}
								>
									{copied === 'share' ? t.actions.copied : t.actions.share}
								</button>
								<button
									type="button"
									role="menuitem"
									class={menuItemClass}
									onclick={() => copy('trmnl', trmnlUrl)}
								>
									{copied === 'trmnl' ? t.actions.copied : t.actions.trmnl}
								</button>
							</div>
						</details>
					</div>
				</div>

				<Warnings warnings={form.schedule.warnings} />
				<div class="mt-4 print:mt-1">
					<ScheduleTable schedule={form.schedule} />
				</div>
			</div>

			<div class="{cardClass} print:hidden">
				<div class="mb-4 flex flex-wrap items-center justify-between gap-3 print:mb-1">
					<h2 class="font-display text-2xl text-stone-900 dark:text-stone-100 print:text-base">
						{t.ingredients.heading}
					</h2>
					<button
						type="button"
						class="bg-tomato-500 hover:bg-tomato-600 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-white print:hidden"
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

	<section class="{cardClass} mt-8 print:hidden">
		<Community />
	</section>

	<footer class="mt-12 text-center text-xs text-stone-500 dark:text-stone-400 print:hidden">
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

	<footer class="print-only mt-4 border-t border-stone-300 pt-3 text-[8pt] text-stone-500">
		<div class="flex items-end justify-between gap-4">
			<p>{t.footer.about} <span class="text-stone-400">· v{appVersion}</span></p>
			{#if shareUrl}
				{@const qr = qrCode(shareUrl)}
				<div class="flex shrink-0 flex-col items-center gap-1">
					<svg viewBox="0 0 {qr.size} {qr.size}" class="h-24 w-24 text-black" aria-hidden="true">
						<path d={qr.path} fill="currentColor" />
					</svg>
					<p class="text-stone-600">{t.print.scan_to_open}</p>
				</div>
			{/if}
		</div>
	</footer>
</main>
