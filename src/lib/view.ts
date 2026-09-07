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

// The questions, in the order they are asked. Each one is answerable in a
// single gesture; the order runs from the moment everything schedules back
// from to the way the dough is worked.
export const ASK_STEPS = ['when', 'pizzas', 'flour', 'window', 'method'] as const;
export type AskStep = (typeof ASK_STEPS)[number];

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

export function stepIndex(step: AskStep): number {
	return ASK_STEPS.indexOf(step);
}

/** The next question, or null when this is the last one. */
export function nextStep(step: AskStep): AskStep | null {
	return ASK_STEPS[stepIndex(step) + 1] ?? null;
}

/** The previous question, or null when this is the first one. */
export function prevStep(step: AskStep): AskStep | null {
	const i = stepIndex(step);
	return i === 0 ? null : ASK_STEPS[i - 1];
}
