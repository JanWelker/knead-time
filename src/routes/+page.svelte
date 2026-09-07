<script lang="ts">
	import { browser } from '$app/environment';
	import { base } from '$app/paths';
	import { onMount } from 'svelte';

	import { buildIcs } from '$lib/dough/ics';
	import {
		decodeInputs,
		decodeStoredRecipe,
		decodeUiMode,
		encodeInputs,
		hasRecipeParams
	} from '$lib/dough/urlState';
	import { safeLocalStorage } from '$lib/safeStorage';
	import { uiMode } from '$lib/mode.svelte';
	import { loadStoredMode } from '$lib/storedMode';
	import { scheduleVerbosity } from '$lib/verbosity.svelte';
	import { loadStoredVerbosity } from '$lib/storedVerbosity';
	import {
		deleteRecipe,
		loadLastRecipe,
		loadRecipes,
		saveLastRecipe,
		saveRecipe,
		type SavedRecipe
	} from '$lib/storedRecipes';
	import ActionsMenu from '$lib/components/ActionsMenu.svelte';
	import MyRecipes from '$lib/components/MyRecipes.svelte';
	import SaveRecipeDialog from '$lib/components/SaveRecipeDialog.svelte';
	import Community from '$lib/components/Community.svelte';
	import Pizzerias from '$lib/components/Pizzerias.svelte';
	import FitScore from '$lib/components/FitScore.svelte';
	import Ingredients from '$lib/components/Ingredients.svelte';
	import InputForm from '$lib/components/InputForm.svelte';
	import Warnings from '$lib/components/Warnings.svelte';
	import LangSwitcher from '$lib/components/LangSwitcher.svelte';
	import ModeBadge from '$lib/components/ModeBadge.svelte';
	import ScheduleTable from '$lib/components/ScheduleTable.svelte';
	import SegmentedControl from '$lib/components/SegmentedControl.svelte';
	import ThemeSwitcher from '$lib/components/ThemeSwitcher.svelte';
	import TrmnlPush from '$lib/components/TrmnlPush.svelte';
	import { formatDateTime } from '$lib/format';
	import { i18n } from '$lib/i18n/i18n.svelte';
	import { interpolate } from '$lib/i18n/interpolate';
	import { findMatchingPizzeria } from '$lib/pizzerias/pizzerias';
	import { FormState } from '$lib/state.svelte';
	import { stepDetailText, stepTitle } from '$lib/stepCopy';

	const currentYear = new Date().getFullYear();
	const appVersion = __APP_VERSION__;

	const form = new FormState();
	const t = $derived(i18n.t);
	const locale = $derived(i18n.locale);

	let copied = $state<'share' | 'failed' | null>(null);
	let hydrated = $state(false);
	let trmnlPush = $state<ReturnType<typeof TrmnlPush>>();
	let saveDialog = $state<ReturnType<typeof SaveRecipeDialog>>();

	let savedRecipes = $state<SavedRecipe[]>([]);

	// Ordered least-to-most detail, which is also the order the strip reads in.
	const VERBOSITIES = ['short', 'descriptive'] as const;

	// Recipe-only encoding of the form as it left hydration. The save effect
	// below compares against it so recipe memory only updates after a real
	// user edit — merely opening someone else's share link must not overwrite
	// kneadtime:lastRecipe (issue #201). Deliberately mode-less: toggling
	// beginner/expert is a view preference, not a recipe edit.
	let hydratedRecipeQs = '';

	onMount(() => {
		const storage = safeLocalStorage();
		// Only keys Knead Time has ever encoded make a URL a recipe link —
		// foreign params alone (utm_source, fbclid, …) behave like a bare visit.
		if (hasRecipeParams(window.location.search)) {
			form.apply(decodeInputs(window.location.search));
		} else {
			// Fresh visit: restore the last recipe this device worked on. Its
			// bake window is stale by definition, so the date fields keep
			// today's defaults — only the recipe parameters come back.
			const last = loadLastRecipe(storage);
			if (last) {
				const recipeOnly = { ...decodeStoredRecipe(last) };
				delete recipeOnly.readyBy;
				delete recipeOnly.startAt;
				form.apply(recipeOnly);
			}
		}
		savedRecipes = loadRecipes(storage);
		// View mode: the URL's word wins (a shared link opens the way its
		// sender saw it), then the visitor's stored preference, and a truly
		// fresh visit starts in the beginner view. Set directly (not via
		// uiMode.set) so a link never overwrites the stored preference.
		uiMode.current = decodeUiMode(window.location.search) ?? loadStoredMode(storage) ?? 'beginner';
		scheduleVerbosity.current = loadStoredVerbosity(storage) ?? 'descriptive';
		hydratedRecipeQs = encodeInputs(form.serializable());
		hydrated = true;
	});

	$effect(() => {
		if (!browser || !hydrated) return;
		const qs = encodeInputs(form.serializable(), { mode: uiMode.current });
		const next = `${window.location.pathname}?${qs}`;
		if (next !== window.location.pathname + window.location.search) {
			history.replaceState({}, '', next);
		}
		// Remember the working recipe so a fresh visit picks up where the
		// baker left off — but only once the user actually changed something.
		if (encodeInputs(form.serializable()) !== hydratedRecipeQs) {
			saveLastRecipe(safeLocalStorage(), qs);
		}
	});

	// Was a window.prompt: native chrome in an app that is otherwise translated
	// into five languages, unstyled in both themes, and blocking. The dialog
	// beside it (TrmnlPush) already had the shape to copy.
	function saveCurrentRecipe(name: string) {
		savedRecipes = saveRecipe(safeLocalStorage(), {
			name,
			search: encodeInputs(form.serializable()),
			savedAt: new Date().toISOString()
		});
	}

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

	async function copy(url: string) {
		try {
			await navigator.clipboard.writeText(url);
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
</script>

<svelte:head>
	<title>{t.app.title} — {t.app.tagline}</title>
</svelte:head>

<main class="mx-auto max-w-[78rem] px-5 pb-16 sm:px-8">
	<!-- The masthead. A cover, not an <h1> with a <p> under it: a rubric rule
	     across the top of the sheet, the name set large in the display face, and
	     a dateline naming the moment the whole page is calculated back from.
	     The bake time is the app's answer, so it is billed on the cover the way
	     a magazine bills its issue — and it needs no new copy, because the
	     form's own label already names it. -->
	<header class="mb-10 pt-8">
		<div class="bg-rubric mb-6 h-1.5"></div>
		<div class="flex flex-wrap items-end justify-between gap-x-6 gap-y-5">
			<h1 class="text-ink text-5xl leading-[0.95] font-medium sm:text-6xl">{t.app.title}</h1>
			<div class="flex flex-wrap items-center gap-2">
				<LangSwitcher />
				<ThemeSwitcher />
			</div>
		</div>
		<div
			class="border-ink mt-5 flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 border-t pt-3"
		>
			<p class="text-ink-soft measure text-[0.95rem] italic">{t.app.tagline}</p>
			<p class="flex items-baseline gap-2 whitespace-nowrap">
				<span class="eyebrow">{t.form.readyBy}</span>
				<span class="figure text-ink font-display text-[0.95rem] font-medium">
					{formatDateTime(form.readyBy, locale)}
				</span>
			</p>
		</div>
	</header>

	<!-- The cookbook shape: a narrow sidebar carrying what you set and what you
	     weigh, a wide body carrying the method. The columns are deliberately
	     unequal — a 5/12 margin against a 7/12 measure — and the body hangs off
	     a vertical rule rather than sitting in a box.

	     All three regions carry explicit col/row placement, so DOM order is free
	     to serve the phone: the schedule comes second there, because it is what
	     the app is for and it used to sit two screens below the fold, behind the
	     form AND the ingredients. At lg+ the placement pins it back to the
	     right-hand column regardless. -->
	<div
		class="grid grid-cols-1 gap-x-10 gap-y-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start"
	>
		<section class="leaf lg:col-start-1 lg:row-start-1">
			<!-- The input region was the one region with no heading, so the whole
			     primary surface was missing from the heading outline. Kept sr-only:
			     the two group legends below already label it on screen, and a
			     visible "Your recipe" sitting directly above a "Recipe" legend
			     reads as a duplicate. -->
			<h2 class="sr-only">{t.form.heading}</h2>
			<InputForm {form} />
		</section>

		<div class="leaf border-rule lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:border-l lg:pl-10">
			<!-- Title row keeps Actions pinned top-right at every width; the badge/
			     stars/verbosity strip lives on its own full-width row below so it
			     can never wrap the button out of place (issue #189). -->
			<!-- No rule under this header: the schedule's first dateline draws its
			     own, and two heavy rules a few pixels apart read as a mistake. -->
			<div class="relative pb-1">
				<div class="flex flex-wrap items-baseline justify-between gap-3">
					<h2 class="opener text-[1.9rem]">{t.schedule.heading}</h2>
					<ActionsMenu
						feasible={form.schedule.feasible}
						shareLabel={copied === 'share' ? t.actions.copied : t.actions.share}
						onIcs={downloadIcs}
						onPrint={printPage}
						onShare={() => copy(window.location.href)}
						onSaveRecipe={() => saveDialog?.open()}
						onTrmnl={() => trmnlPush?.open()}
					/>
					<!-- The modal lives outside the role="menu" container: a dialog is
					     invalid ARIA-menu content, and the menu closes before it opens. -->
					<TrmnlPush
						bind:this={trmnlPush}
						inputs={form.serializable()}
						schedule={form.schedule}
						{locale}
					/>
					<SaveRecipeDialog bind:this={saveDialog} onsave={saveCurrentRecipe} />
				</div>
				<!-- Always in the DOM, so the live region exists before it has
				     anything to say — one created together with its first message
				     is not announced by most screen readers. Success is visible
				     already (the menu item reads "Copied!"), so it stays sr-only;
				     a refusal has no other signal at all, so it becomes visible. -->
				<p
					id="share-status"
					role="status"
					class={copied === 'failed' ? 'notice notice-danger mt-2' : 'sr-only'}
				>
					{#if copied === 'share'}{t.actions.copied}{:else if copied === 'failed'}{t.actions
							.copy_failed}{/if}
				</p>
				<div class="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
					<ModeBadge mode={form.schedule.mode} />
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

			<div class="mt-6">
				<ScheduleTable
					schedule={form.schedule}
					sourceTiming={activePizzeria?.timing}
					verbosity={scheduleVerbosity.current}
				/>
			</div>
		</div>

		<div class="leaf leaf-ruled lg:col-start-1 lg:row-start-2">
			<div class="mb-4 flex flex-wrap items-baseline justify-between gap-3">
				<h2 class="opener">{t.ingredients.heading}</h2>
				<button
					type="button"
					class="btn-ink-sm inline-flex items-center gap-1"
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
				flourW={form.flourW}
			/>
			<!-- The yeast warnings are about the number you weigh out ("measure
			     carefully", "double-check the inputs"), so they belong with the
			     weights. Visible in beginner view too, where the yeast field
			     itself is hidden but the window can still reach both extremes. -->
			<div class="mt-4">
				<Warnings warnings={form.schedule.warnings} place="ingredients" />
			</div>
		</div>
	</div>

	<!-- The back matter: three collapsed indexes, each opened by a rule. -->
	<section class="leaf leaf-ruled mt-12">
		<MyRecipes
			recipes={savedRecipes}
			onDelete={(name) => (savedRecipes = deleteRecipe(safeLocalStorage(), name))}
		/>
	</section>

	<section class="leaf leaf-ruled mt-8">
		<Community />
	</section>

	<section class="leaf leaf-ruled mt-8">
		<Pizzerias />
	</section>

	<footer class="border-ink text-ink-soft mt-16 border-t pt-5 text-xs">
		<div class="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3">
			<div class="measure space-y-1">
				<p>{t.footer.about}</p>
				<p class="italic">{t.actions.share_help}</p>
			</div>
			<div class="space-y-1 sm:text-right">
				<p class="flex flex-wrap items-baseline gap-x-3 sm:justify-end">
					<a
						href="https://github.com/JanWelker/knead-time"
						target="_blank"
						rel="noopener noreferrer"
						class="link-quiet"
					>
						{t.footer.source}
					</a>
					<span aria-hidden="true">·</span>
					<a
						href="https://github.com/JanWelker/knead-time#readme"
						target="_blank"
						rel="noopener noreferrer"
						class="link-quiet"
					>
						{t.footer.docs}
					</a>
					<span aria-hidden="true">·</span>
					<a
						href="https://github.com/JanWelker/knead-time/issues"
						target="_blank"
						rel="noopener noreferrer"
						class="link-quiet"
					>
						{t.footer.support}
					</a>
				</p>
				<p class="flex flex-wrap items-baseline gap-x-3 sm:justify-end">
					<a
						href="https://github.com/JanWelker/knead-time/blob/main/LICENSE"
						target="_blank"
						rel="noopener noreferrer"
						class="link-quiet"
					>
						{interpolate(t.footer.license, { year: currentYear })}
					</a>
					<span aria-hidden="true">·</span>
					<a
						href="https://github.com/JanWelker/knead-time/releases/tag/v{appVersion}"
						target="_blank"
						rel="noopener noreferrer"
						class="link-quiet figure"
					>
						v{appVersion}
					</a>
				</p>
			</div>
		</div>
	</footer>
</main>
