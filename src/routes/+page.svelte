<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

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
	import AdjustPanel from '$lib/components/AdjustPanel.svelte';
	import AskFlow from '$lib/components/AskFlow.svelte';
	import LibraryView from '$lib/components/LibraryView.svelte';
	import PlanView from '$lib/components/PlanView.svelte';
	import SiteFooter from '$lib/components/SiteFooter.svelte';
	import { i18n } from '$lib/i18n/i18n.svelte';
	import { findMatchingPizzeria } from '$lib/pizzerias/pizzerias';
	import { FormState } from '$lib/state.svelte';
	import {
		ASK_STEPS,
		initialLocation,
		viewHash,
		visibleAskStep,
		type AskStep,
		type ViewLocation
	} from '$lib/view';

	// The app is three places now — the questions, the plan, the recipe
	// collections — and this file is the only thing that knows which one is on
	// screen. The recipe still lives entirely in the query string; the place
	// lives in the fragment, so a share link is byte-for-byte what it always was
	// and `hasRecipeParams` never has to learn to ignore an interface key.
	const form = new FormState();
	const t = $derived(i18n.t);

	let hydrated = $state(false);
	let savedRecipes = $state<SavedRecipe[]>([]);
	let adjustPanel = $state<ReturnType<typeof AdjustPanel>>();

	// Named `where`, not `location`: a plain `location` in a component shadows
	// window.location, which is exactly the global this file reads most.
	let where = $state<ViewLocation>({ view: 'plan', step: ASK_STEPS[0] });

	// Recipe-only encoding of the form as it left hydration. The save effect
	// below compares against it so recipe memory only updates after a real
	// user edit — merely opening someone else's share link must not overwrite
	// kneadtime:lastRecipe (issue #201). Deliberately mode-less: toggling
	// beginner/expert is a view preference, not a recipe edit.
	let hydratedRecipeQs = '';

	function currentUrl(next: ViewLocation): string {
		const qs = encodeInputs(form.serializable(), { mode: uiMode.current });
		return `${window.location.pathname}?${qs}${viewHash(next)}`;
	}

	// A deliberate move between views, so it goes on the history stack: the
	// browser's back button walks it, and the fragment makes each one linkable
	// and reload-proof.
	function go(view: ViewLocation['view'], step: AskStep = where.step) {
		where = { view, step };
		history.pushState({}, '', currentUrl(where));
	}

	onMount(() => {
		const storage = safeLocalStorage();
		// Only keys Knead Time has ever encoded make a URL a recipe link —
		// foreign params alone (utm_source, fbclid, …) behave like a bare visit.
		const carriesRecipe = hasRecipeParams(window.location.search);
		let restored = false;
		if (carriesRecipe) {
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
				restored = true;
			}
		}
		savedRecipes = loadRecipes(storage);
		// View mode: the URL's word wins (a shared link opens the way its
		// sender saw it), then the visitor's stored preference, and a truly
		// fresh visit starts in the beginner view. Set directly (not via
		// uiMode.set) so a link never overwrites the stored preference.
		uiMode.current = decodeUiMode(window.location.search) ?? loadStoredMode(storage) ?? 'beginner';
		scheduleVerbosity.current = loadStoredVerbosity(storage) ?? 'descriptive';

		// Anyone arriving with a recipe — a share link, a saved one, the one
		// this device was last working on — lands on the plan. The questions are
		// for composing a dough you do not have yet.
		where = initialLocation({
			hash: window.location.hash,
			hasRecipe: carriesRecipe,
			hasMemory: restored
		});
		hydratedRecipeQs = encodeInputs(form.serializable());
		hydrated = true;

		const onPopState = () =>
			(where = initialLocation({ hash: window.location.hash, hasRecipe: true, hasMemory: false }));
		window.addEventListener('popstate', onPopState);
		return () => window.removeEventListener('popstate', onPopState);
	});

	// A fragment can name a question the current view mode does not ask — a
	// hand-typed `#ask/leaven`, a link from someone walking the advanced flow, or
	// the simple route being chosen while standing on one of the three advanced
	// screens. Clamp before the URL effect below writes it back, so the address
	// bar and the question on screen never disagree.
	$effect(() => {
		if (where.view !== 'ask') return;
		const visible = visibleAskStep(where.step, uiMode.current);
		if (visible !== where.step) where = { ...where, step: visible };
	});

	$effect(() => {
		if (!browser || !hydrated) return;
		const next = currentUrl(where);
		if (next !== window.location.pathname + window.location.search + window.location.hash) {
			history.replaceState({}, '', next);
		}
		// Remember the working recipe so a fresh visit picks up where the
		// baker left off — but only once the user actually changed something.
		if (encodeInputs(form.serializable()) !== hydratedRecipeQs) {
			saveLastRecipe(
				safeLocalStorage(),
				encodeInputs(form.serializable(), { mode: uiMode.current })
			);
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
</script>

<svelte:head>
	<title>{t.app.title} — {t.app.tagline}</title>
</svelte:head>

<main>
	{#if where.view === 'ask'}
		<AskFlow
			{form}
			step={where.step}
			onstep={(step) => go('ask', step)}
			onplan={() => go('plan')}
			onlibrary={() => go('library')}
		/>
	{:else if where.view === 'library'}
		<LibraryView
			recipes={savedRecipes}
			onDelete={(name) => (savedRecipes = deleteRecipe(safeLocalStorage(), name))}
			onback={() => go('plan')}
		/>
	{:else}
		<PlanView
			{form}
			sourceTiming={activePizzeria?.timing}
			onadjust={(field) => adjustPanel?.open(field)}
			onlibrary={() => go('library')}
			onrestart={() => go('ask', ASK_STEPS[0])}
			onsaverecipe={saveCurrentRecipe}
		/>
		<!-- Mounted with the plan only: the ask flow carries a window slider of
		     its own, and two of them in one document would fight over the id the
		     plan's chips focus. -->
		<AdjustPanel bind:this={adjustPanel} {form} />
	{/if}

	<SiteFooter />
</main>
