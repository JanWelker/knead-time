<script lang="ts">
	import { formatDateTime, formatDuration, formatGrams } from '$lib/format';
	import { i18n } from '$lib/i18n/i18n.svelte';
	import { interpolate } from '$lib/i18n/interpolate';
	import type { FormState } from '$lib/state.svelte';
	import ModeBadge from './ModeBadge.svelte';

	// The stub torn off the order as it is written: the consequence of the
	// answers so far, on its own small sheet beside the question. The old form
	// asked for twelve numbers and only paid out at the bottom of the page; here
	// every answer moves something visible in the same glance, which is what
	// keeps a sequence of questions from reading as a survey.
	//
	// It is a ticket, so it is set like one — each fact walks to its figure on a
	// dotted leader, and the sheet tears off below the line.
	let { form }: { form: FormState } = $props();

	const t = $derived(i18n.t);
	const locale = $derived(i18n.locale);
	const rows = $derived([
		{ label: t.ask.running_start, value: formatDateTime(form.startAt, locale) },
		{
			label: t.ask.running_ferment,
			value: formatDuration(form.fermentWindowHours * 60, locale)
		},
		{ label: t.ask.running_flour, value: formatGrams(form.schedule.ingredients.flour) }
	]);
</script>

<aside class="card">
	<h2 class="card-header card-header-title">{t.ask.running_heading}</h2>
	<div class="card-body">
		<dl class="space-y-3">
			{#each rows as row (row.label)}
				<div class="flex items-baseline">
					<dt class="label-caps text-ink-soft shrink-0">{row.label}</dt>
					<span class="leader" aria-hidden="true"></span>
					<dd class="data text-ink shrink-0 text-lg leading-none">{row.value}</dd>
				</div>
			{/each}
		</dl>
		<!-- Tear here. The mode stamp and the step count are what is left on the
		     counterfoil once the order goes to the kitchen. -->
		<div class="perforation -mx-5 mt-5 sm:-mx-6" aria-hidden="true"></div>
		<div class="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2">
			<ModeBadge mode={form.schedule.mode} />
			<span class="label-caps text-ink-soft">
				{interpolate(t.ask.running_steps, { n: form.schedule.steps.length })}
			</span>
		</div>
	</div>
</aside>
