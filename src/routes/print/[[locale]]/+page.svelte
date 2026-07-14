<script lang="ts">
	import { browser } from '$app/environment';
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import { onMount } from 'svelte';

	import { computeSchedule } from '$lib/dough/schedule';
	import type { DoughInputs } from '$lib/dough/types';
	import { decodeInputs, encodeInputs } from '$lib/dough/urlState';
	import {
		formatBallWeight,
		formatDateTime,
		formatDuration,
		formatGrams,
		formatPercent
	} from '$lib/format';
	import { i18n } from '$lib/i18n/i18n.svelte';
	import { interpolate } from '$lib/i18n/interpolate';
	import { LOCALES, type Locale } from '$lib/i18n/messages';
	import { qrCode } from '$lib/qr';
	import { stepDescription, stepIngredients, stepTitle } from '$lib/stepCopy';

	// Locale lives in the URL path so each language can ship its own prerendered
	// HTML; the root layout skips its navigator-based detection on this route.
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
		oilPercent: 0,
		sugarPercent: 0,
		yeastType: 'fresh',
		starterHydration: 100,
		roomTempC: 22,
		fridgeTempC: 4,
		mixingMethod: 'machine',
		preFerment: null
	};

	// Decode synchronously on the client so the first paint after hydration
	// already shows the user's recipe. SSR'd HTML ships with DEFAULT_INPUTS as
	// a skeleton — irrelevant in the user's real browser where JS runs.
	let inputs: DoughInputs = $state(
		browser ? { ...DEFAULT_INPUTS, ...decodeInputs(window.location.search) } : DEFAULT_INPUTS
	);
	const schedule = $derived(computeSchedule(inputs));
	const t = $derived(i18n.t);
	const locale = $derived(i18n.locale);
	const appVersion = __APP_VERSION__;
	const currentYear = new Date().getFullYear();

	const shareUrl = $derived(
		browser ? `${window.location.origin}${base}/?${encodeInputs(inputs)}` : ''
	);
	const qr = $derived(shareUrl ? qrCode(shareUrl) : null);
	const yeastLabel = $derived(
		inputs.yeastType === 'fresh' ? t.ingredients.fresh_yeast : t.ingredients.sourdough_starter
	);
	const yeastTypeLabel = $derived(
		inputs.yeastType === 'fresh' ? t.form.yeast_fresh : t.form.yeast_sourdough
	);
	const preFermentLabel = $derived(
		schedule.preFerment?.type === 'biga'
			? t.form.preFerment_biga
			: schedule.preFerment?.type === 'poolish'
				? t.form.preFerment_poolish
				: null
	);
	const totals = $derived(
		schedule.ingredients.preFerment
			? {
					flour: schedule.ingredients.flour + schedule.ingredients.preFerment.flour,
					water: schedule.ingredients.water + schedule.ingredients.preFerment.water,
					salt: schedule.ingredients.salt,
					yeast: schedule.ingredients.yeast + schedule.ingredients.preFerment.yeast
				}
			: null
	);

	onMount(() => {
		// Auto-trigger the print dialog so the Print button → new tab → dialog
		// flow is one click. Small delay lets the QR canvas paint first.
		const id = setTimeout(() => window.print(), 200);
		return () => clearTimeout(id);
	});
</script>

<svelte:head>
	<title>{t.app.title} — {t.print.recipe_heading}</title>
	<!-- Inline styles so the printed page is independent of the main app's
	     gradient background and dark-mode rules. Class names are `.printpage-`
	     prefixed to namespace against the unloaded Tailwind layout sheet
	     (mirrors the TRMNL route's pattern). -->
	<style>
		html,
		body {
			background: #ffffff !important;
			color: #000000 !important;
			margin: 0;
		}
		@page {
			size: auto;
			margin: 9mm 10mm;
		}
		.printpage {
			font-family:
				'Inter',
				ui-sans-serif,
				system-ui,
				-apple-system,
				sans-serif;
			color: #000;
			background: #fff;
			max-width: 190mm;
			margin: 0 auto;
			padding: 6mm 4mm;
			font-size: 9pt;
			line-height: 1.4;
		}
		.printpage h1,
		.printpage h2,
		.printpage h3 {
			margin: 0;
			font-weight: 700;
			letter-spacing: -0.01em;
		}
		.printpage h1 {
			font-size: 18pt;
		}
		.printpage h2 {
			font-size: 12pt;
			margin-bottom: 2mm;
		}
		.printpage h3 {
			font-size: 9.5pt;
			margin-bottom: 1mm;
		}
		.printpage-header {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 8mm;
			margin-bottom: 4mm;
			padding-bottom: 3mm;
			border-bottom: 1px solid #000;
		}
		.printpage-summary,
		.printpage-ingredients {
			width: 100%;
			border-collapse: collapse;
			font-variant-numeric: tabular-nums;
		}
		.printpage-summary th {
			text-align: left;
			font-weight: 400;
			padding: 0.8mm 0;
			color: #333;
		}
		.printpage-summary td {
			text-align: right;
			font-weight: 500;
			padding: 0.8mm 0;
		}
		.printpage-ingredients th {
			text-align: left;
			padding: 0.8mm 0;
			font-weight: 500;
		}
		.printpage-ingredients td {
			text-align: right;
			padding: 0.8mm 0;
		}
		.printpage-ingredients tr.printpage-total th,
		.printpage-ingredients tr.printpage-total td {
			font-weight: 700;
			border-top: 1px solid #000;
			padding-top: 1.2mm;
		}
		.printpage-ingredients-section {
			margin-bottom: 3mm;
		}
		.printpage-schedule {
			width: 100%;
			border-collapse: collapse;
			font-variant-numeric: tabular-nums;
		}
		.printpage-schedule thead th {
			font-size: 8pt;
			text-transform: uppercase;
			letter-spacing: 0.05em;
			font-weight: 600;
			text-align: left;
			border-bottom: 1px solid #000;
			padding: 1mm 3mm 1mm 0;
		}
		.printpage-schedule tbody td {
			padding: 1.2mm 3mm 1.2mm 0;
			vertical-align: top;
			border-bottom: 1px solid #ccc;
		}
		.printpage-schedule tbody tr:last-child td {
			border-bottom: none;
		}
		.printpage-when {
			white-space: nowrap;
			font-weight: 500;
		}
		.printpage-duration {
			white-space: nowrap;
			text-align: right;
		}
		.printpage-step-title {
			font-weight: 600;
		}
		.printpage-step-ingredients {
			font-size: 8pt;
			margin-top: 0.5mm;
		}
		.printpage-ing:not(:last-child)::after {
			content: ' · ';
			color: #888;
		}
		.printpage-step-desc {
			font-size: 8pt;
			color: #444;
			margin-top: 0.5mm;
		}
		.printpage-schedule tr.printpage-ready .printpage-step-title {
			font-weight: 700;
		}
		.printpage-footer {
			margin-top: 4mm;
			padding-top: 2mm;
			border-top: 1px solid #000;
			display: flex;
			justify-content: space-between;
			align-items: flex-end;
			gap: 8mm;
			font-size: 7.5pt;
			color: #333;
		}
		.printpage-footer p {
			margin: 0 0 0.5mm 0;
		}
		.printpage-qr {
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: 1mm;
			flex-shrink: 0;
		}
		.printpage-qr svg {
			width: 22mm;
			height: 22mm;
		}
		.printpage-qr-caption {
			font-size: 7pt;
		}
	</style>
</svelte:head>

<div class="printpage">
	<header class="printpage-header">
		<div>
			<h1>{t.app.title}</h1>
			<h2 style="margin-top: 3mm;">{t.print.recipe_heading}</h2>
			<table class="printpage-summary">
				<tbody>
					<tr>
						<th>{t.form.readyBy}</th>
						<td>{formatDateTime(inputs.readyBy, locale)}</td>
					</tr>
					<tr>
						<th>{t.form.pizzaCount}</th>
						<td>{inputs.pizzaCount} × {formatBallWeight(inputs.ballWeight)} g</td>
					</tr>
					<tr><th>{t.form.hydration}</th><td>{inputs.hydration}%</td></tr>
					<tr><th>{t.form.salt}</th><td>{inputs.saltPercent}%</td></tr>
					<tr><th>{t.form.yeastType}</th><td>{yeastTypeLabel}</td></tr>
					<tr><th>{t.form.roomTemp}</th><td>{inputs.roomTempC} °C</td></tr>
					{#if schedule.mode === 'cold'}
						<tr><th>{t.form.fridgeTemp}</th><td>{inputs.fridgeTempC} °C</td></tr>
					{/if}
					{#if preFermentLabel}
						<tr><th>{t.form.preFerment}</th><td>{preFermentLabel}</td></tr>
					{/if}
				</tbody>
			</table>
		</div>
		<div>
			<h2>{t.ingredients.heading}</h2>
			{#if schedule.ingredients.preFerment}
				<section class="printpage-ingredients-section">
					<h3>{t.ingredients.preFerment_heading}</h3>
					<table class="printpage-ingredients">
						<tbody>
							<tr
								><th>{t.ingredients.flour}</th><td
									>{formatGrams(schedule.ingredients.preFerment.flour)}</td
								></tr
							>
							<tr
								><th>{t.ingredients.water}</th><td
									>{formatGrams(schedule.ingredients.preFerment.water)}</td
								></tr
							>
							<tr
								><th>{t.ingredients.fresh_yeast}</th><td
									>{formatGrams(schedule.ingredients.preFerment.yeast)}</td
								></tr
							>
						</tbody>
					</table>
				</section>
				<section class="printpage-ingredients-section">
					<h3>{t.ingredients.mainDough_heading}</h3>
					<table class="printpage-ingredients">
						<tbody>
							<tr
								><th>{t.ingredients.flour}</th><td>{formatGrams(schedule.ingredients.flour)}</td
								></tr
							>
							<tr
								><th>{t.ingredients.water}</th><td>{formatGrams(schedule.ingredients.water)}</td
								></tr
							>
							<tr><th>{t.ingredients.salt}</th><td>{formatGrams(schedule.ingredients.salt)}</td></tr
							>
						</tbody>
					</table>
				</section>
				<section class="printpage-ingredients-section">
					<h3>{t.ingredients.totals_heading}</h3>
					<table class="printpage-ingredients">
						<tbody>
							<tr><th>{t.ingredients.flour}</th><td>{formatGrams(totals!.flour)}</td></tr>
							<tr><th>{t.ingredients.water}</th><td>{formatGrams(totals!.water)}</td></tr>
							<tr><th>{t.ingredients.salt}</th><td>{formatGrams(totals!.salt)}</td></tr>
							<tr
								><th>{yeastLabel} ({formatPercent(schedule.yeastPercent)})</th><td
									>{formatGrams(totals!.yeast)}</td
								></tr
							>
							<tr class="printpage-total"
								><th>{t.ingredients.total}</th><td
									>{formatGrams(schedule.ingredients.totalDough)}</td
								></tr
							>
						</tbody>
					</table>
				</section>
			{:else}
				<table class="printpage-ingredients">
					<tbody>
						<tr><th>{t.ingredients.flour}</th><td>{formatGrams(schedule.ingredients.flour)}</td></tr
						>
						<tr><th>{t.ingredients.water}</th><td>{formatGrams(schedule.ingredients.water)}</td></tr
						>
						<tr><th>{t.ingredients.salt}</th><td>{formatGrams(schedule.ingredients.salt)}</td></tr>
						<tr
							><th>{yeastLabel} ({formatPercent(schedule.yeastPercent)})</th><td
								>{formatGrams(schedule.ingredients.yeast)}</td
							></tr
						>
						<tr class="printpage-total"
							><th>{t.ingredients.total}</th><td>{formatGrams(schedule.ingredients.totalDough)}</td
							></tr
						>
					</tbody>
				</table>
			{/if}
		</div>
	</header>

	<section>
		<h2>{t.schedule.heading}</h2>
		<table class="printpage-schedule">
			<thead>
				<tr>
					<th>{t.schedule.col_when}</th>
					<th>{t.schedule.col_step}</th>
					<th class="printpage-duration">{t.schedule.col_duration}</th>
				</tr>
			</thead>
			<tbody>
				{#each schedule.steps as step (step.kind + '-' + step.at.getTime())}
					{@const isReady = step.kind === 'ready'}
					{@const ingredients = stepIngredients(step, t, schedule)}
					<tr class:printpage-ready={isReady}>
						<td class="printpage-when">{formatDateTime(step.at, locale)}</td>
						<td>
							<div class="printpage-step-title">{stepTitle(step, t)}</div>
							{#if ingredients.length > 0}
								<div class="printpage-step-ingredients">
									{#each ingredients as ing (ing.name)}
										<span class="printpage-ing"><strong>{ing.amount}</strong> {ing.name}</span>
									{/each}
								</div>
							{/if}
							<div class="printpage-step-desc">{stepDescription(step, t, schedule)}</div>
						</td>
						<td class="printpage-duration">
							{step.durationMinutes > 0 ? formatDuration(step.durationMinutes, locale) : '—'}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</section>

	<footer class="printpage-footer">
		<div>
			<p>{t.footer.about}</p>
			<p>{interpolate(t.footer.license, { year: currentYear })} · v{appVersion}</p>
		</div>
		{#if qr}
			<div class="printpage-qr">
				<svg viewBox="0 0 {qr.size} {qr.size}" aria-hidden="true">
					<path d={qr.path} fill="currentColor" />
				</svg>
				<p class="printpage-qr-caption">{t.print.scan_to_open}</p>
			</div>
		{/if}
	</footer>
</div>
