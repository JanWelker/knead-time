import type { UiMode } from './storedMode';

// Where in the app the visitor is. The app used to be one page and a scroll;
// it is now three places, exactly one of which is mounted at a time.
//
// The location lives in the URL **fragment**, never in the query. The query is
// the recipe, and the recipe schema is add-only and versioned — a `view=` key
// would have made every share link carry a piece of interface state, and
// `hasRecipeParams` would have had to learn to ignore it. A fragment is
// linkable, survives a reload, and gives back/forward for free without
// touching the contract.
export type AppView = 'ask' | 'plan' | 'library';

/**
 * The questions, in the order they are asked — which is the recipe sheet's own
 * order, not a second one. `When` (the bake moment, the flour, the window),
 * then the batch, then the percentages, then how it is worked, then what
 * leavens it and where it proofs. The two doors into the same twenty numbers
 * cannot disagree about what comes first if there is one list to disagree with.
 *
 * `mode` is first because its answer decides which of the rest are asked at
 * all: the flow walks the fields the chosen view mode shows, exactly as the
 * sheet does (issue #316).
 */
export const ASK_STEPS = [
	'mode',
	'when',
	'flour',
	'window',
	'batch',
	'dough',
	'method',
	'leaven',
	'proof'
] as const;
export type AskStep = (typeof ASK_STEPS)[number];

// Three of the nine ask about fields the simple view does not show at all, so
// the simple walk is the same list with those three lifted out — never a
// separate order.
const EXPERT_ONLY: readonly AskStep[] = ['dough', 'leaven', 'proof'];
const SIMPLE_STEPS: readonly AskStep[] = ASK_STEPS.filter((step) => !EXPERT_ONLY.includes(step));

/** The questions this view mode actually asks. */
export function askSteps(mode: UiMode): readonly AskStep[] {
	return mode === 'expert' ? ASK_STEPS : SIMPLE_STEPS;
}

export interface ViewLocation {
	view: AppView;
	/** Which question the ask flow is on. Ignored by the other two views. */
	step: AskStep;
}

const FIRST: AskStep = ASK_STEPS[0];

function isAskStep(value: string): value is AskStep {
	return (ASK_STEPS as readonly string[]).includes(value);
}

/** `#plan`, `#library`, `#ask` or `#ask/<step>`. Anything else is not ours. */
export function parseViewHash(hash: string): ViewLocation | null {
	const raw = hash.replace(/^#/, '');
	if (raw === 'plan') return { view: 'plan', step: FIRST };
	if (raw === 'library') return { view: 'library', step: FIRST };
	if (raw === 'ask') return { view: 'ask', step: FIRST };
	// Past the three bare words, the only shape left is `ask/<step>`; reaching
	// here with head === 'ask' means the fragment carried a slash, so `tail` is
	// always a string (possibly empty, which is not a step name).
	const [head, tail] = raw.split('/');
	if (head === 'ask' && isAskStep(tail)) return { view: 'ask', step: tail };
	return null;
}

/**
 * A fragment can name a question this mode does not ask — a hand-typed
 * `#ask/leaven`, a link from someone walking the advanced flow, or a switch
 * back to simple while standing on one of the three. Fall back to the first
 * question rather than render a screen the flow has no way to leave.
 */
export function visibleAskStep(step: AskStep, mode: UiMode): AskStep {
	return askSteps(mode).includes(step) ? step : FIRST;
}

export function viewHash(location: ViewLocation): string {
	return location.view === 'ask' ? `#ask/${location.step}` : `#${location.view}`;
}

/**
 * Where a visitor lands. An explicit fragment always wins; otherwise anyone who
 * arrives carrying a recipe — a share link, or the recipe this device was last
 * working on — goes straight to the plan. The questions are for composing a
 * dough you do not have yet, and making a returning baker answer them again
 * would be the whole point of the redesign thrown away.
 */
export function initialLocation(context: {
	hash: string;
	hasRecipe: boolean;
	hasMemory: boolean;
}): ViewLocation {
	const explicit = parseViewHash(context.hash);
	if (explicit) return explicit;
	if (context.hasRecipe || context.hasMemory) return { view: 'plan', step: FIRST };
	return { view: 'ask', step: FIRST };
}

// The three below all take the walk they are stepping through rather than
// defaulting to the full list: which questions exist depends on the view mode,
// and a default would let a caller ask for "the next one" against a walk the
// visitor is not on.
export function stepIndex(step: AskStep, steps: readonly AskStep[]): number {
	return steps.indexOf(step);
}

/** The next question this mode asks, or null when this is the last one. */
export function nextStep(step: AskStep, steps: readonly AskStep[]): AskStep | null {
	const i = stepIndex(step, steps);
	// A step this walk does not contain has no neighbours on it — not the first
	// one, which is what indexOf's -1 would otherwise hand back.
	return i < 0 ? null : (steps[i + 1] ?? null);
}

/** The previous question this mode asks, or null when this is the first one. */
export function prevStep(step: AskStep, steps: readonly AskStep[]): AskStep | null {
	const i = stepIndex(step, steps);
	return i <= 0 ? null : steps[i - 1];
}
