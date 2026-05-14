<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { SvelteDate } from 'svelte/reactivity';

	import { computeSchedule } from '$lib/dough/schedule';
	import { currentStepIndex } from '$lib/dough/scheduleStatus';
	import type { DoughInputs } from '$lib/dough/types';
	import { decodeInputs } from '$lib/dough/urlState';
	import { formatBallWeight, formatDateTime, formatDuration, formatTime } from '$lib/format';
	import { i18n } from '$lib/i18n/i18n.svelte';
	import { LOCALES, type Locale } from '$lib/i18n/messages';
	import { stepDescription, stepTitle } from '$lib/stepCopy';

	// Locale comes from the URL path (/trmnl/<locale>). TRMNL's renderer
	// doesn't run our JS so navigator.languages detection in the root layout
	// never fires there — baking the locale into the prerendered HTML is the
	// only way each language ships with localized labels. Falls back to 'en'
	// when the path has no locale segment (legacy /trmnl URLs) or a junk one.
	// The root layout's onMount skips navigator-language detection on this
	// route (see src/routes/+layout.svelte) so this set sticks on the client.
	function isLocale(s: unknown): s is Locale {
		return typeof s === 'string' && (LOCALES as readonly string[]).includes(s);
	}
	const pageLocale: Locale = isLocale(page.params.locale) ? page.params.locale : 'en';
	i18n.set(pageLocale);

	const DEFAULT_INPUTS: DoughInputs = {
		readyBy: new Date(Date.now() + 24 * 60 * 60 * 1000),
		startAt: new Date(),
		pizzaCount: 6,
		ballWeight: 280,
		hydration: 70,
		saltPercent: 3,
		yeastType: 'fresh',
		starterHydration: 100,
		roomTempC: 22,
		fridgeTempC: 4,
		preFerment: null
	};

	// Decode the URL synchronously on the client so the very first paint after
	// hydration already shows the user's recipe — TRMNL's screenshot service
	// has a 5 s budget, and waiting for onMount can land outside it. On the
	// server (SSR at build time) `browser` is false, so the prerendered HTML
	// ships with DEFAULT_INPUTS — that's the fallback TRMNL captures if JS
	// never runs in its renderer.
	let inputs: DoughInputs = $state(
		browser ? { ...DEFAULT_INPUTS, ...decodeInputs(window.location.search) } : DEFAULT_INPUTS
	);
	// Use SvelteDate so re-assignment is reactive — TRMNL renders once but in a
	// local browser this ticks so the highlight follows real time.
	const now = new SvelteDate();

	onMount(() => {
		const tick = setInterval(() => now.setTime(Date.now()), 30_000);
		return () => clearInterval(tick);
	});

	const schedule = $derived(computeSchedule(inputs));
	const idx = $derived(currentStepIndex(schedule.steps, now));
	const t = $derived(i18n.t);
	const locale = $derived(i18n.locale);

	// Decide what to feature in the big panel:
	//   - past the bake → "done" message
	//   - middle of the schedule → current step labelled "now"
	//   - before the first step → first step labelled "next"
	const featured = $derived.by(() => {
		const steps = schedule.steps;
		if (steps.length === 0) return null;
		const last = steps.length - 1;
		if (idx === last) return { step: steps[last], label: t.trmnl.done, isDone: true };
		if (idx >= 0) return { step: steps[idx], label: t.trmnl.now, isDone: false };
		return { step: steps[0], label: t.trmnl.next, isDone: false };
	});

	const yeastLabel = $derived(
		inputs.yeastType === 'fresh' ? t.form.yeast_fresh : t.form.yeast_sourdough
	);

	const preFermentLabel = $derived(
		inputs.preFerment?.type === 'biga'
			? t.form.preFerment_biga
			: inputs.preFerment?.type === 'poolish'
				? t.form.preFerment_poolish
				: null
	);
</script>

<svelte:head>
	<title>{t.app.title} — TRMNL</title>
	<!-- All styles live here (not in the component's <style> block) so they
	     ship inline in the SSR'd HTML. TRMNL's renderer doesn't reliably load
	     external stylesheets — a screenshot of the route showed correct DOM
	     but no scoped CSS applied. Inline survives that. -->
	<style>
		html,
		body {
			background: #ffffff !important;
			color: #000000 !important;
		}
		.trmnl {
			width: 800px;
			height: 480px;
			margin: 0 auto;
			padding: 16px 20px;
			box-sizing: border-box;
			background: #ffffff;
			color: #000000;
			font-family:
				'Inter',
				ui-sans-serif,
				system-ui,
				-apple-system,
				sans-serif;
			font-size: 16px;
			line-height: 1.3;
			display: flex;
			flex-direction: column;
			gap: 10px;
		}
		.trmnl .head {
			display: flex;
			justify-content: space-between;
			align-items: baseline;
			gap: 16px;
		}
		.trmnl .brand {
			display: flex;
			flex-direction: column;
			gap: 2px;
			min-width: 0;
		}
		.trmnl .title {
			font-size: 28px;
			font-weight: 600;
			letter-spacing: -0.01em;
		}
		.trmnl .summary {
			font-size: 13px;
		}
		.trmnl .ready {
			display: flex;
			flex-direction: column;
			align-items: flex-end;
			text-align: right;
		}
		.trmnl .readyLabel {
			font-size: 11px;
			text-transform: uppercase;
			letter-spacing: 0.08em;
		}
		.trmnl .readyTime {
			font-size: 22px;
			font-weight: 600;
			font-variant-numeric: tabular-nums;
		}
		.trmnl .panel {
			border: 2px solid #000;
			padding: 10px 14px;
			display: flex;
			flex-direction: column;
			gap: 4px;
		}
		.trmnl .panel.done {
			border-width: 3px;
			text-align: center;
			justify-content: center;
			align-items: center;
			padding: 18px 14px;
		}
		.trmnl .panelLabel {
			font-size: 11px;
			text-transform: uppercase;
			letter-spacing: 0.1em;
		}
		.trmnl .panelTitle {
			display: flex;
			justify-content: space-between;
			align-items: baseline;
			font-size: 28px;
			font-weight: 600;
			gap: 12px;
		}
		.trmnl .panel.done .panelTitle {
			font-size: 40px;
			justify-content: center;
		}
		.trmnl .panelTime {
			font-size: 22px;
			font-weight: 500;
			font-variant-numeric: tabular-nums;
		}
		.trmnl .panelDesc {
			font-size: 14px;
		}
		.trmnl .rows {
			width: 100%;
			border-collapse: collapse;
			font-variant-numeric: tabular-nums;
		}
		.trmnl .rows td {
			padding: 5px 0;
			font-size: 15px;
			vertical-align: middle;
		}
		.trmnl .rowTime {
			width: 200px;
			white-space: nowrap;
			padding-right: 12px;
		}
		.trmnl .rows tr.past td {
			text-decoration: line-through;
			color: #666;
		}
		.trmnl .rows tr.current td {
			font-weight: 700;
			background: #000;
			color: #fff;
			padding-left: 6px;
			padding-right: 6px;
		}
		.trmnl .rows tr.rowReady td {
			font-weight: 700;
		}
	</style>
</svelte:head>

<div class="trmnl">
	<header class="head">
		<div class="brand">
			<span class="title">{t.app.title}</span>
			<span class="summary">
				{inputs.pizzaCount} × {formatBallWeight(inputs.ballWeight)} g · {inputs.hydration}% · {yeastLabel}{#if preFermentLabel}
					· {preFermentLabel}{/if} · {schedule.mode === 'cold' ? t.mode.cold : t.mode.room}
			</span>
		</div>
		<div class="ready">
			<span class="readyLabel">{t.form.readyBy}</span>
			<!-- Locale-formatted dates like "Fri, May 15, 02:17 PM" pack two commas
			     into the headline slot — at the readyTime size that reads cluttered.
			     Strip them; falls through cleanly for locales that don't use commas
			     in their long-date format. -->
			<span class="readyTime">{formatDateTime(inputs.readyBy, locale).replace(/,/g, '')}</span>
		</div>
	</header>

	{#if featured}
		<section class="panel" class:done={featured.isDone}>
			<div class="panelLabel">{featured.label}</div>
			{#if featured.isDone}
				<div class="panelTitle">{stepTitle(featured.step, t)}</div>
			{:else}
				<div class="panelTitle">
					<span>{stepTitle(featured.step, t)}</span>
					<span class="panelTime">
						{formatTime(featured.step.at, locale)} - {formatTime(
							new Date(featured.step.at.getTime() + featured.step.durationMinutes * 60_000),
							locale
						)}
						({formatDuration(featured.step.durationMinutes, locale)})
					</span>
				</div>
				<div class="panelDesc">{stepDescription(featured.step, t, schedule)}</div>
			{/if}
		</section>
	{/if}

	<table class="rows">
		<tbody>
			{#each schedule.steps as step, i (step.kind + '-' + step.at.getTime())}
				<tr
					class:past={i < idx}
					class:current={i === idx && idx < schedule.steps.length - 1}
					class:rowReady={step.kind === 'ready'}
				>
					<td class="rowTime">{formatDateTime(step.at, locale)}</td>
					<td class="rowStep">{stepTitle(step, t)}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
