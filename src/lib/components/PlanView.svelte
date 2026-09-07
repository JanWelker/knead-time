<script lang="ts">
	import { base } from '$app/paths';
	import { buildIcs } from '$lib/dough/ics';
	import { encodeInputs } from '$lib/dough/urlState';
	import { formatBallWeight, formatDateTime, formatDuration } from '$lib/format';
	import { i18n } from '$lib/i18n/i18n.svelte';
	import { interpolate } from '$lib/i18n/interpolate';
	import { uiMode } from '$lib/mode.svelte';
	import type { SourceTiming } from '$lib/pizzerias/pizzerias';
	import type { FormState } from '$lib/state.svelte';
	import { flourIngredientName, stepDetailText, stepTitle } from '$lib/stepCopy';
	import { scheduleVerbosity } from '$lib/verbosity.svelte';
	import ActionsMenu from './ActionsMenu.svelte';
	import FitScore from './FitScore.svelte';
	import Ingredients from './Ingredients.svelte';
	import Masthead from './Masthead.svelte';
	import ModeBadge from './ModeBadge.svelte';
	import SaveRecipeDialog from './SaveRecipeDialog.svelte';
	import ScheduleTable from './ScheduleTable.svelte';
	import SegmentedControl from './SegmentedControl.svelte';
	import TrmnlPush from './TrmnlPush.svelte';
	import Warnings from './Warnings.svelte';

	// The destination. This is the screen a baker opens at 07:00 with flour on
	// their hands, so it is the calm one: the questions are loud, the plan is
	// quiet. Nothing here is an input — every value that can change is an
	// underlined chip that opens the adjust sheet on that exact field, which is
	// what keeps a form from creeping back onto the page.
	let {
		form,
		sourceTiming,
		onadjust,
		onlibrary,
		onrestart,
		onsaverecipe
	}: {
		form: FormState;
		sourceTiming?: SourceTiming;
		onadjust: (fieldId?: string) => void;
		onlibrary: () => void;
		onrestart: () => void;
		onsaverecipe: (name: string) => void;
	} = $props();

	const t = $derived(i18n.t);
	const locale = $derived(i18n.locale);

	let copied = $state<'share' | 'failed' | null>(null);
	let trmnlPush = $state<ReturnType<typeof TrmnlPush>>();
	let saveDialog = $state<ReturnType<typeof SaveRecipeDialog>>();

	// Ordered least-to-most detail, which is also the order the strip reads in.
	const VERBOSITIES = ['short', 'descriptive'] as const;

	function printPage() {
		// Dedicated print route owns its stylesheet and auto-triggers print().
		window.open(`${base}/print/${locale}?${encodeInputs(form.serializable())}`, '_blank');
	}

	function downloadIcs() {
		const ics = buildIcs(form.schedule.steps, (step) => ({
			summary: stepTitle(step, t),
			description: stepDetailText(step, t, form.schedule, {
				includeDetail: scheduleVerbosity.current === 'descriptive'
			})
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

	async function copyShareLink() {
		try {
			await navigator.clipboard.writeText(window.location.href);
			copied = 'share';
			setTimeout(() => (copied = null), 1500);
		} catch {
			// A denied clipboard used to be swallowed here. The reasoning was that
			// the URL is in the address bar anyway — true, but the user has just
			// pressed a button and been given no reason to think it did nothing.
			// Say so, and say where the link is. Stays until the next attempt.
			copied = 'failed';
		}
	}

	type Chip = { label: string; value: string; field: string };
	const chips = $derived.by(() => {
		const out: Chip[] = [
			{
				label: t.form.pizzaCount,
				value: interpolate(t.plan.batch, {
					n: form.inputs.pizzaCount,
					weight: formatBallWeight(form.inputs.ballWeight)
				}),
				field: 'field-pizzaCount'
			},
			{
				label: t.schedule.window_label,
				value: formatDuration(form.fermentWindowHours * 60, locale),
				field: 'field-window'
			}
		];
		if (form.flourW !== null) {
			out.push({
				label: t.form.flour,
				value: flourIngredientName(form.flourW, t),
				field: 'field-flour'
			});
		}
		// Expert reveals the numbers expert set. In the simple view they are all
		// at their defaults, and a row of untouched defaults is noise.
		if (uiMode.current === 'expert') {
			out.push(
				{ label: t.form.hydration, value: `${form.inputs.hydration} %`, field: 'field-hydration' },
				{ label: t.form.salt, value: `${form.inputs.saltPercent} %`, field: 'field-salt' },
				{ label: t.form.roomTemp, value: `${form.inputs.roomTempC} °C`, field: 'field-roomTemp' }
			);
		}
		return out;
	});
</script>

<div class="view" data-view="plan">
	<Masthead>
		<button type="button" class="btn-quiet" onclick={onlibrary}>{t.nav.library}</button>
		<button
			type="button"
			class="btn-ghost px-4 py-2 text-xs"
			onclick={() => onadjust()}
			aria-haspopup="dialog"
		>
			{t.nav.adjust}
		</button>
		<ActionsMenu
			feasible={form.schedule.feasible}
			shareLabel={copied === 'share' ? t.actions.copied : t.actions.share}
			onIcs={downloadIcs}
			onPrint={printPage}
			onShare={copyShareLink}
			onSaveRecipe={() => saveDialog?.open()}
			onTrmnl={() => trmnlPush?.open()}
		/>
	</Masthead>

	<!-- The modals live outside the role="menu" container: a dialog is invalid
	     ARIA-menu content, and the menu closes before it opens. -->
	<TrmnlPush bind:this={trmnlPush} inputs={form.serializable()} schedule={form.schedule} {locale} />
	<SaveRecipeDialog bind:this={saveDialog} onsave={onsaverecipe} />

	<div class="view-pad flex-1 pb-8">
		<!-- The bake moment is the app's whole premise, so it is the largest thing
		     on the plan and it is itself the control that changes it. -->
		<h1 class="mt-2">
			<span class="text-ink-soft block text-sm">{t.plan.ready_label}</span>
			<button
				type="button"
				class="chip mt-1.5"
				onclick={() => onadjust('field-readyBy')}
				aria-haspopup="dialog"
			>
				<span class="data text-[clamp(2rem,6.5vw,4rem)] leading-[1.05] tracking-[-0.035em]">
					{formatDateTime(form.readyBy, locale)}
				</span>
			</button>
		</h1>

		<div class="mt-6 flex flex-wrap items-baseline gap-x-7 gap-y-3">
			{#each chips as chip (chip.field)}
				<button
					type="button"
					class="chip text-base"
					onclick={() => onadjust(chip.field)}
					aria-haspopup="dialog"
				>
					<span class="text-ink-soft text-xs">{chip.label}</span>
					<span class="data">{chip.value}</span>
				</button>
			{/each}
		</div>
		<p class="text-ink-soft mt-3 text-xs">{t.plan.edit_hint}</p>

		<!-- Always in the DOM, so the live region exists before it has anything to
		     say — one created together with its first message is not announced by
		     most screen readers. Success is visible already (the menu item reads
		     "Copied!"), so it stays sr-only; a refusal has no other signal at all,
		     so it becomes visible. -->
		<p
			id="share-status"
			role="status"
			class={copied === 'failed' ? 'notice notice-danger mt-4' : 'sr-only'}
		>
			{#if copied === 'share'}{t.actions.copied}{:else if copied === 'failed'}{t.actions
					.copy_failed}{/if}
		</p>

		<div class="rule mt-8 flex flex-wrap items-start justify-between gap-x-8 gap-y-4 pt-6">
			<div class="min-w-0">
				<ModeBadge mode={form.schedule.mode} />
			</div>
			<div class="flex flex-wrap items-center gap-4">
				<FitScore schedule={form.schedule} inputs={form.serializable()} />
				<SegmentedControl
					legend={t.schedule.verbosity_label}
					options={VERBOSITIES}
					active={scheduleVerbosity.current}
					onselect={(v) => scheduleVerbosity.set(v)}
					labelFor={(v) =>
						v === 'short' ? t.schedule.verbosity_short : t.schedule.verbosity_descriptive}
				/>
			</div>
		</div>

		<!-- Warnings still read next to what causes them: the window and
		     temperature families sit under the values that set them, which on this
		     view are the chips above rather than the fields inside the sheet. -->
		<div class="mt-6 space-y-2">
			<Warnings warnings={form.schedule.warnings} place="window" />
			<Warnings warnings={form.schedule.warnings} place="temperature" />
		</div>

		<div class="mt-12 grid gap-12 xl:grid-cols-[minmax(0,1fr)_19rem] xl:gap-16">
			<section class="min-w-0">
				<h2 class="section-head">{t.schedule.heading}</h2>
				<div class="mt-6">
					<ScheduleTable
						schedule={form.schedule}
						{sourceTiming}
						verbosity={scheduleVerbosity.current}
					/>
				</div>
			</section>

			<aside
				class="border-line-soft min-w-0 self-start border-t pt-10 xl:sticky xl:top-8 xl:border-t-0 xl:pt-0"
			>
				<div class="flex flex-wrap items-center justify-between gap-3">
					<h2 class="section-head">{t.ingredients.heading}</h2>
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
				<div class="mt-5">
					<Ingredients
						ingredients={form.schedule.ingredients}
						yeastType={form.yeastType}
						yeastPercent={form.schedule.yeastPercent}
						flourW={form.flourW}
					/>
				</div>
				<!-- The yeast warnings are about the number you weigh out ("measure
				     carefully", "double-check the inputs"), so they belong with the
				     weights. Visible in the simple view too, where the yeast field
				     itself is hidden but the window can still reach both extremes. -->
				<div class="mt-5">
					<Warnings warnings={form.schedule.warnings} place="ingredients" />
				</div>
			</aside>
		</div>

		<p class="mt-16">
			<button type="button" class="btn-ghost" onclick={onrestart}>{t.nav.restart}</button>
		</p>
	</div>
</div>
