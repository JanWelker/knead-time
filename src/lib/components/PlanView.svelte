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
	import FitScore from './FitScore.svelte';
	import Ingredients from './Ingredients.svelte';
	import Masthead from './Masthead.svelte';
	import MastheadMenu from './MastheadMenu.svelte';
	import ModeBadge from './ModeBadge.svelte';
	import SaveRecipeDialog from './SaveRecipeDialog.svelte';
	import ScheduleTable from './ScheduleTable.svelte';
	import TrmnlPush from './TrmnlPush.svelte';
	import Warnings from './Warnings.svelte';

	// The destination: the job ticket the kitchen works off. This is the screen
	// a baker opens at 07:00 with flour on their hands, so it is the calm one —
	// the questions shout, the ticket is set to be read.
	//
	// Nothing here is an input. Every value that can change is a blank on the
	// ticket (`.chip-field`): its name stamped above a ruled line, the answer
	// written on it, and tapping it opens the adjust sheet on that exact field.
	// That is what keeps a form from creeping back onto the page.
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

<!-- Everything that is not "edit the recipe": where to go, and what to do with
     the plan you are looking at. Four of the five actions need a feasible
     schedule — there is nothing to export, print or push when the window is too
     short to be a plan at all. Sharing a link to a broken recipe is still
     meaningful; that is how you ask someone what went wrong. -->
{#snippet planMenu(close: () => void)}
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

	<div role="group" aria-label={t.schedule.verbosity_label} class="menu-group">
		<p class="menu-heading" aria-hidden="true">{t.schedule.verbosity_label}</p>
		{#each VERBOSITIES as level (level)}
			<button
				type="button"
				role="menuitemradio"
				aria-checked={scheduleVerbosity.current === level}
				class="menu-item menu-item-choice"
				onclick={() => {
					scheduleVerbosity.set(level);
					close();
				}}
			>
				<span class="menu-mark" aria-hidden="true"></span>
				{level === 'short' ? t.schedule.verbosity_short : t.schedule.verbosity_descriptive}
			</button>
		{/each}
	</div>

	<div role="group" aria-label={t.actions.menu} class="menu-group">
		<p class="menu-heading" aria-hidden="true">{t.actions.menu}</p>
		<button
			type="button"
			role="menuitem"
			class="menu-item"
			disabled={!form.schedule.feasible}
			onclick={() => {
				close();
				downloadIcs();
			}}
		>
			{t.actions.download_ics}
		</button>
		<button
			type="button"
			role="menuitem"
			class="menu-item"
			disabled={!form.schedule.feasible}
			onclick={() => {
				close();
				printPage();
			}}
		>
			{t.actions.print}
		</button>
		<button
			type="button"
			role="menuitem"
			class="menu-item"
			onclick={() => {
				close();
				copyShareLink();
			}}
		>
			{copied === 'share' ? t.actions.copied : t.actions.share}
		</button>
		<button
			type="button"
			role="menuitem"
			aria-haspopup="dialog"
			class="menu-item"
			onclick={() => {
				close();
				saveDialog?.open();
			}}
		>
			{t.actions.save_recipe}
		</button>
		<button
			type="button"
			role="menuitem"
			aria-haspopup="dialog"
			class="menu-item"
			disabled={!form.schedule.feasible}
			onclick={() => {
				close();
				trmnlPush?.open();
			}}
		>
			{t.trmnl_push.menu_item}
		</button>
	</div>
{/snippet}

<div class="view" data-view="plan">
	<Masthead />

	<!-- The modals live outside the role="menu" container: a dialog is invalid
	     ARIA-menu content, and the menu closes before it opens. -->
	<TrmnlPush bind:this={trmnlPush} inputs={form.serializable()} schedule={form.schedule} {locale} />
	<SaveRecipeDialog bind:this={saveDialog} onsave={onsaverecipe} />

	<div class="view-pad flex-1 pt-6 pb-6 sm:pt-8">
		<div class="grid gap-6 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-start lg:gap-10">
			<!-- The bake moment is the app's whole premise, so it is set as the sign
			     on the ticket: its name reversed out of an ink band, the moment
			     itself in the sign painter's face underneath. It is also the control
			     that changes it. -->
			<h1 class="card block-shadow inline-block">
				<span class="card-header card-header-title text-sm sm:text-base">
					{t.plan.ready_label}
				</span>
				<button
					type="button"
					class="hover:text-accent-ink block w-full px-5 py-3 text-left sm:px-6"
					onclick={() => onadjust('field-readyBy')}
					aria-haspopup="dialog"
				>
					<span class="data block text-[clamp(1.9rem,5.5vw,3.25rem)] leading-none">
						{formatDateTime(form.readyBy, locale)}
					</span>
				</button>
			</h1>

			<div class="min-w-0 lg:pt-2">
				<!-- The three ways into the app, in one aligned row at the top of the
				     block, with the values they act on underneath. They were staggered
				     at three heights for a while to echo the ragged rows below them; at
				     three buttons that reads as scattered rather than as hand-placed,
				<!-- The three ways into the app, in one aligned row at the top of the
				     block, with the values they act on underneath. Right-aligned and
				     ordered quiet to loud in reverse — Guide me leaves the plan, Edit
				     recipe changes it, and the menu holds everything else. They were
				     staggered at three heights for a while to echo the ragged rows
				     below; at three buttons that reads as scattered rather than as
				     hand-placed, and it squeezed the values into one narrow column. -->
				<div class="mb-6 flex flex-wrap items-center justify-end gap-3">
					<button type="button" class="btn-guide" onclick={onrestart}>
						<svg
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2.5"
							stroke-linecap="round"
							stroke-linejoin="round"
							aria-hidden="true"
						>
							<path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
							<circle cx="12" cy="12" r="4" />
						</svg>
						{t.nav.restart}
					</button>
					<button type="button" class="btn-edit" onclick={() => onadjust()} aria-haspopup="dialog">
						<svg
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2.5"
							stroke-linecap="round"
							stroke-linejoin="round"
							aria-hidden="true"
						>
							<path d="M12 20h9" />
							<path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
						</svg>
						{t.nav.adjust}
					</button>
					<MastheadMenu items={planMenu} />
				</div>
				<div class="flex flex-wrap items-end gap-x-6 gap-y-4">
					{#each chips as chip (chip.field)}
						<button
							type="button"
							class="chip-field"
							onclick={() => onadjust(chip.field)}
							aria-haspopup="dialog"
						>
							<span class="label-caps text-ink-soft">{chip.label}</span>
							<span class="data text-lg leading-none">{chip.value}</span>
						</button>
					{/each}
				</div>
				<p class="text-ink-soft mt-4 text-xs">{t.plan.edit_hint}</p>
			</div>
		</div>

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

		<!-- Warnings still read next to what causes them: the window and
		     temperature families sit under the values that set them, which on this
		     view are the blanks above rather than the fields inside the sheet. -->
		<div class="mt-6 space-y-2">
			<Warnings warnings={form.schedule.warnings} place="window" />
			<Warnings warnings={form.schedule.warnings} place="temperature" />
		</div>

		<!-- The ticket is the narrow column and the schedule the wide one, and
		     the ticket comes first: on a phone this is one column, and what you
		     reach for at 07:00 is the weights — the schedule is what you come
		     back to between steps. Source order IS the order at every width, so
		     nothing has to be placed against the grid and reading order can
		     never disagree with what is on screen. -->
		<div class="mt-10 grid gap-8 xl:grid-cols-[21rem_minmax(0,1fr)] xl:gap-10">
			<aside class="card card-loud min-w-0 self-start xl:sticky xl:top-6">
				<div class="card-header justify-between">
					<h2 class="card-header-title">{t.ingredients.heading}</h2>
					<button
						type="button"
						class="btn-edit-sm"
						onclick={() => form.roundBallWeight()}
						title={t.form.ballWeight_round_help}
						aria-label={t.form.ballWeight_round_help}
					>
						<span aria-hidden="true">↻</span>
						{t.form.ballWeight_round}
					</button>
				</div>
				<div class="card-body">
					<Ingredients
						ingredients={form.schedule.ingredients}
						yeastType={form.yeastType}
						yeastPercent={form.schedule.yeastPercent}
						flourW={form.flourW}
					/>
					<!-- The yeast warnings are about the number you weigh out ("measure
					     carefully", "double-check the inputs"), so they belong with the
					     weights. Visible in the simple view too, where the yeast field
					     itself is hidden but the window can still reach both extremes. -->
					<div class="mt-5">
						<Warnings warnings={form.schedule.warnings} place="ingredients" />
					</div>
				</div>
			</aside>
			<!-- The one surface allowed to shout: an offset block of ink behind the
			     sheet, the way a second pass sits beside the first when the plate is
			     out of register. The schedule is what the app is FOR. -->
			<section class="card card-loud min-w-0">
				<!-- Both marks are facts about this schedule, so they are pressed onto
				     its own band rather than floating in a status row above it. -->
				<h2 class="card-header card-header-title">{t.schedule.heading}</h2>
				<div class="card-body">
					<!-- The lede: what the maths chose and why, directly under the stamp
					     that names it. It had been left behind in a strip above the card
					     when the stamp moved onto the band, a sentence with nothing
					     around it and nothing to attach to. -->
					<!-- Two marks, and each opens what it means. The mode's sentence used
					     to sit beside them as running prose, which made the row a caption
					     with two icons rather than two seals; it reads the same way the
					     fit's factors do now. -->
					<div class="mb-6 flex flex-wrap items-center gap-x-7 gap-y-4">
						<ModeBadge mode={form.schedule.mode} explain />
						<FitScore schedule={form.schedule} inputs={form.serializable()} />
					</div>
					<ScheduleTable
						schedule={form.schedule}
						{sourceTiming}
						verbosity={scheduleVerbosity.current}
					/>
				</div>
			</section>
		</div>
	</div>
</div>
