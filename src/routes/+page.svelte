<script lang="ts">
	import { browser } from '$app/environment';
	import { base } from '$app/paths';
	import { onMount } from 'svelte';

	import { stepKey } from '$lib/dial';
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
	import Dial from '$lib/components/Dial.svelte';
	import FitScore from '$lib/components/FitScore.svelte';
	import Ingredients from '$lib/components/Ingredients.svelte';
	import InputForm from '$lib/components/InputForm.svelte';
	import StepReadout from '$lib/components/StepReadout.svelte';
	import Warnings from '$lib/components/Warnings.svelte';
	import LangSwitcher from '$lib/components/LangSwitcher.svelte';
	import ModeBadge from '$lib/components/ModeBadge.svelte';
	import ScheduleTable from '$lib/components/ScheduleTable.svelte';
	import SegmentedControl from '$lib/components/SegmentedControl.svelte';
	import ThemeSwitcher from '$lib/components/ThemeSwitcher.svelte';
	import TrmnlPush from '$lib/components/TrmnlPush.svelte';
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

	// Which step the dial's readout is showing. `picked` is what the baker last
	// chose; until they choose, and whenever their choice stops existing (a
	// pre-ferment switched off, say), the dial opens on the step that is
	// running — the answer to "what now?", which is what the app is for.
	let picked = $state<string | null>(null);
	let now = $state(new Date());
	onMount(() => {
		const id = setInterval(() => (now = new Date()), 60_000);
		return () => clearInterval(id);
	});

	const stepKeys = $derived(form.schedule.steps.map(stepKey));
	const liveKey = $derived.by(() => {
		const steps = form.schedule.steps;
		const at = now.getTime();
		const running = steps.find(
			(s) => s.at.getTime() <= at && at < s.at.getTime() + s.durationMinutes * 60_000
		);
		return stepKey(running ?? steps.find((s) => s.at.getTime() > at) ?? steps[0]);
	});
	const selectedKey = $derived(picked !== null && stepKeys.includes(picked) ? picked : liveKey);
	const selectedStep = $derived(
		form.schedule.steps.find((s) => stepKey(s) === selectedKey) ?? form.schedule.steps[0]
	);

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

<main class="mx-auto max-w-[84rem] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
	<!-- The masthead is a nameplate, not a hero: the instrument below it is the
	     first thing on the page that deserves the eye. Everything that acts on
	     the whole recipe — language, theme, the export menu — lives here. -->
	<header
		class="border-rule mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b pb-4"
	>
		<div>
			<h1 class="text-accent font-display text-3xl leading-none sm:text-4xl">{t.app.title}</h1>
			<p class="text-ink-soft mt-1.5 max-w-md text-sm">{t.app.tagline}</p>
		</div>
		<div class="relative flex flex-wrap items-center gap-2">
			<LangSwitcher />
			<ThemeSwitcher />
			<ActionsMenu
				feasible={form.schedule.feasible}
				shareLabel={copied === 'share' ? t.actions.copied : t.actions.share}
				onIcs={downloadIcs}
				onPrint={printPage}
				onShare={() => copy(window.location.href)}
				onSaveRecipe={() => saveDialog?.open()}
				onTrmnl={() => trmnlPush?.open()}
			/>
			<!-- The modals live outside the role="menu" container: a dialog is
			     invalid ARIA-menu content, and the menu closes before it opens. -->
			<TrmnlPush
				bind:this={trmnlPush}
				inputs={form.serializable()}
				schedule={form.schedule}
				{locale}
			/>
			<SaveRecipeDialog bind:this={saveDialog} onsave={saveCurrentRecipe} />
		</div>
		<!-- Always in the DOM, so the live region exists before it has anything
		     to say — one created together with its first message is not
		     announced by most screen readers. Success is visible already (the
		     menu item reads "Copied!"), so it stays sr-only; a refusal has no
		     other signal at all, so it becomes visible. -->
		<p
			id="share-status"
			role="status"
			class={copied === 'failed' ? 'notice notice-danger w-full' : 'sr-only'}
		>
			{#if copied === 'share'}{t.actions.copied}{:else if copied === 'failed'}{t.actions
					.copy_failed}{/if}
		</p>
	</header>

	<!-- lg+: the settings sit in a sticky rail on the left and the instrument
	     owns the rest of the width. Below lg everything is one column in DOM
	     order, which is why the dial comes first in the markup — a baker
	     opening this on a phone should land on the answer, not on a form. -->
	<div class="grid grid-cols-1 gap-6 lg:grid-cols-[27rem_minmax(0,1fr)] lg:items-start">
		<!-- The instrument stage. At xl it splits again: the drawing on the left,
		     the words about it on the right — the readout beside the dial rather
		     than under it. The plan goes under the dial in the wide column,
		     because a step's method copy needs the measure; the weights are a
		     two-column table and fit the narrow one. Every child carries an
		     explicit cell, so the markup order is free to serve the phone:
		     dial, readout, plan, weights. -->
		<div
			class="grid grid-cols-1 gap-6 lg:col-start-2 lg:row-start-1 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start"
		>
			<section class="instrument xl:col-start-1 xl:row-start-1">
				<h2 class="sr-only">{t.dial.heading}</h2>
				<Dial {form} selected={selectedKey} onselect={(key) => (picked = key)} />
			</section>

			<div class="space-y-3 xl:col-start-2 xl:row-start-1">
				<ModeBadge mode={form.schedule.mode} />
				<div class="flex flex-wrap items-center gap-3">
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
				<StepReadout
					step={selectedStep}
					schedule={form.schedule}
					verbosity={scheduleVerbosity.current}
				/>
			</div>

			<div class="card xl:col-start-1 xl:row-start-2">
				<h2 class="font-display text-ink mb-4 text-xl">{t.schedule.heading}</h2>
				<ScheduleTable
					schedule={form.schedule}
					sourceTiming={activePizzeria?.timing}
					verbosity={scheduleVerbosity.current}
					selected={selectedKey}
					onselect={(key) => (picked = key)}
				/>
			</div>

			<div class="card xl:col-start-2 xl:row-start-2">
				<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
					<h2 class="font-display text-ink text-xl">{t.ingredients.heading}</h2>
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

		<!-- The instrument's settings. A rail rather than a column ahead of the
		     answer: the form is how you adjust the plan, not how you reach it. -->
		<section
			class="card lg:sticky lg:top-6 lg:col-start-1 lg:row-start-1 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto"
		>
			<h2 class="font-display text-ink mb-4 text-xl">{t.form.heading}</h2>
			<InputForm {form} />
		</section>
	</div>

	<!-- Other people's dough. A detour from the instrument, so it sits past it,
	     collapsed, in one quiet stack. -->
	<div class="mt-8 space-y-4">
		<section class="card">
			<MyRecipes
				recipes={savedRecipes}
				onDelete={(name) => (savedRecipes = deleteRecipe(safeLocalStorage(), name))}
			/>
		</section>

		<section class="card">
			<Community />
		</section>

		<section class="card">
			<Pizzerias />
		</section>
	</div>

	<footer class="text-ink-faint mt-10 text-center text-xs">
		<p>{t.footer.about}</p>
		<p class="mt-1">{t.actions.share_help}</p>
		<p class="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1">
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
		<p class="mt-2">
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
				class="link-quiet"
			>
				v{appVersion}
			</a>
		</p>
	</footer>
</main>
