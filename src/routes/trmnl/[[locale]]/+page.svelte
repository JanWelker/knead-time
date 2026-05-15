<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { SvelteDate } from 'svelte/reactivity';

	import { computeSchedule } from '$lib/dough/schedule';
	import { currentStepIndex } from '$lib/dough/scheduleStatus';
	import type { DoughInputs } from '$lib/dough/types';
	import { decodeInputs } from '$lib/dough/urlState';
	import { i18n } from '$lib/i18n/i18n.svelte';
	import { LOCALES, type Locale } from '$lib/i18n/messages';
	import { buildTrmnlPayload, decodeTrmnlPayload } from '$lib/trmnl/payload';

	// Locale comes from the URL path (/trmnl/<locale>). TRMNL's renderer
	// doesn't run our JS so navigator.languages detection in the root layout
	// never fires there — baking the locale into the prerendered HTML is the
	// only way each language ships with localized labels.
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

	const now = new SvelteDate();
	const t = $derived(i18n.t);

	// Two URL formats are accepted on this route:
	//   * `?p=<base64-payload>` (current) — pre-formatted display payload, used
	//     by the inline-decoder script so TRMNL's renderer can patch the DOM
	//     without running computeSchedule or Intl.
	//   * `?v=…&p=…&b=…` (legacy) — encoded inputs in the v=N share schema; the
	//     route falls back to computeSchedule on the client. TRMNL's renderer
	//     can't reach this path so its screenshots of legacy URLs still show
	//     defaults — re-copy the link from the main app to migrate.
	const fromUrl = $derived.by(() => {
		if (!browser) return null;
		const params = new URLSearchParams(window.location.search);
		const p = params.get('p');
		// Heuristic: payload encoding base64 will be >40 chars; legacy `p=` was
		// the pre-ferment field (e.g. `b30` for biga 30%). Treat short `p` as
		// legacy so existing share-format URLs route to the input decoder.
		if (p && p.length > 40) {
			const decoded = decodeTrmnlPayload(p);
			if (decoded) return { kind: 'payload', payload: decoded } as const;
		}
		const decoded = decodeInputs(window.location.search);
		return { kind: 'inputs', inputs: { ...DEFAULT_INPUTS, ...decoded } } as const;
	});

	// SSR ships with DEFAULT_INPUTS. On the client we either accept the
	// pre-built payload from `?p=` or recompute from decoded inputs.
	const payload = $derived.by(() => {
		if (fromUrl?.kind === 'payload') return fromUrl.payload;
		const inputs = fromUrl?.kind === 'inputs' ? fromUrl.inputs : DEFAULT_INPUTS;
		return buildTrmnlPayload(inputs, computeSchedule(inputs), t, pageLocale, now);
	});

	// Recompute the highlight from atIso so it tracks real time when rendered
	// in a normal browser; in TRMNL's renderer the inline decoder does its own
	// pass against `Date.now()` at capture time.
	const idx = $derived(
		currentStepIndex(
			payload.steps.map((s) => ({
				kind: s.isReady ? ('ready' as const) : ('mix' as const),
				at: new Date(s.atIso),
				durationMinutes: 0
			})),
			now
		)
	);

	onMount(() => {
		const tick = setInterval(() => now.setTime(Date.now()), 30_000);
		return () => clearInterval(tick);
	});
</script>

<svelte:head>
	<title>{payload.title} — TRMNL</title>
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
			font-size: 19px;
			line-height: 1.3;
			display: flex;
			flex-direction: column;
			gap: 8px;
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
			font-size: 32px;
			font-weight: 600;
			letter-spacing: -0.01em;
		}
		.trmnl .summary {
			font-size: 15px;
		}
		.trmnl .ready {
			display: flex;
			flex-direction: column;
			align-items: flex-end;
			text-align: right;
			flex-shrink: 0;
		}
		.trmnl .readyLabel {
			font-size: 13px;
			text-transform: uppercase;
			letter-spacing: 0.08em;
			white-space: nowrap;
		}
		.trmnl .readyTime {
			font-size: 26px;
			font-weight: 600;
			font-variant-numeric: tabular-nums;
			white-space: nowrap;
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
			font-size: 13px;
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
			white-space: nowrap;
		}
		.trmnl .panelDesc {
			font-size: 17px;
		}
		.trmnl .rows {
			width: 100%;
			border-collapse: collapse;
			font-variant-numeric: tabular-nums;
		}
		.trmnl .rows td {
			padding: 4px 0;
			font-size: 18px;
			vertical-align: middle;
		}
		.trmnl .rowTime {
			width: 100px;
			white-space: nowrap;
			padding-right: 10px;
			font-variant-numeric: tabular-nums;
		}
		.trmnl .rowDate {
			width: 140px;
			white-space: nowrap;
			padding-right: 16px;
		}
		.trmnl .rowDuration {
			width: 130px;
			white-space: nowrap;
			text-align: right;
			padding-left: 10px;
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
	<!-- Inline decoder. The screenshot renderer doesn't reach SvelteKit's
	     hydration bundle, so the prerendered HTML ships with DEFAULT_INPUTS
	     baked in. This script reads `?p=<base64>` synchronously on load and
	     patches the data-bearing nodes by ID before the screenshot is taken.
	     Self-contained: no imports, no external resources. -->
	<script>
		(function () {
			try {
				if (typeof location === 'undefined' || typeof document === 'undefined') return;
				var m = location.search.match(/[?&]p=([^&]+)/);
				if (!m) return;
				var raw = decodeURIComponent(m[1]);
				if (raw.length <= 40) return; // legacy `p=b30` etc. — let the bundle handle it
				var bin = atob(raw);
				var bytes = new Uint8Array(bin.length);
				for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
				var json = new TextDecoder().decode(bytes);
				var p = JSON.parse(json);
				var set = function (id, text) {
					var el = document.getElementById(id);
					if (el && text !== undefined && text !== null) el.textContent = text;
				};
				set('trmnl-title', p.title);
				set('trmnl-summary', p.summary);
				set('trmnl-ready-label', p.readyLabel);
				set('trmnl-ready-time', p.readyTime);
				var panel = document.getElementById('trmnl-panel');
				if (panel) {
					if (!p.featured) {
						panel.style.display = 'none';
					} else {
						set('trmnl-featured-label', p.featured.label);
						set('trmnl-featured-title', p.featured.title);
						var time = document.getElementById('trmnl-featured-time');
						var desc = document.getElementById('trmnl-featured-desc');
						if (p.featured.isDone) {
							panel.className = 'panel done';
							if (time) time.style.display = 'none';
							if (desc) desc.style.display = 'none';
						} else {
							panel.className = 'panel';
							if (time) {
								time.style.display = '';
								time.textContent = p.featured.timeRange;
							}
							if (desc) {
								desc.style.display = '';
								desc.textContent = p.featured.description;
							}
						}
					}
				}
				var tbody = document.getElementById('trmnl-rows');
				if (tbody && p.steps) {
					var nowMs = Date.now();
					var lastIdx = -1;
					for (var j = 0; j < p.steps.length; j++) {
						if (new Date(p.steps[j].atIso).getTime() <= nowMs) lastIdx = j;
						else break;
					}
					var html = '';
					for (var k = 0; k < p.steps.length; k++) {
						var s = p.steps[k];
						var cls =
							(k < lastIdx ? 'past' : '') +
							(k === lastIdx && lastIdx < p.steps.length - 1 ? ' current' : '') +
							(s.isReady ? ' rowReady' : '');
						html +=
							'<tr class="' +
							cls.trim() +
							'">' +
							'<td class="rowTime">' +
							s.time +
							'</td>' +
							'<td class="rowDate">' +
							s.date +
							'</td>' +
							'<td class="rowStep">' +
							s.title +
							'</td>' +
							'<td class="rowDuration">' +
							s.duration +
							'</td>' +
							'</tr>';
					}
					tbody.innerHTML = html;
				}
			} catch (e) {
				// Best-effort — leave the prerendered defaults in place if anything fails.
			}
		})();
	</script>
</svelte:head>

<div class="trmnl">
	<header class="head">
		<div class="brand">
			<span class="title" id="trmnl-title">{payload.title}</span>
			<span class="summary" id="trmnl-summary">{payload.summary}</span>
		</div>
		<div class="ready">
			<span class="readyLabel" id="trmnl-ready-label">{payload.readyLabel}</span>
			<span class="readyTime" id="trmnl-ready-time">{payload.readyTime}</span>
		</div>
	</header>

	{#if payload.featured}
		<section class="panel" class:done={payload.featured.isDone} id="trmnl-panel">
			<div class="panelLabel" id="trmnl-featured-label">{payload.featured.label}</div>
			{#if payload.featured.isDone}
				<div class="panelTitle">
					<span id="trmnl-featured-title">{payload.featured.title}</span>
				</div>
			{:else}
				<div class="panelTitle">
					<span id="trmnl-featured-title">{payload.featured.title}</span>
					<span class="panelTime" id="trmnl-featured-time">{payload.featured.timeRange}</span>
				</div>
				<div class="panelDesc" id="trmnl-featured-desc">{payload.featured.description}</div>
			{/if}
		</section>
	{/if}

	<table class="rows">
		<tbody id="trmnl-rows">
			{#each payload.steps as step, i (step.atIso + '-' + step.title)}
				<tr
					class:past={i < idx}
					class:current={i === idx && idx < payload.steps.length - 1}
					class:rowReady={step.isReady}
				>
					<td class="rowTime">{step.time}</td>
					<td class="rowDate">{step.date}</td>
					<td class="rowStep">{step.title}</td>
					<td class="rowDuration">{step.duration}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
