<script lang="ts">
	import { uiMode } from '$lib/mode.svelte';

	// One rule for every field's help text, in one place. Beginner reads it
	// standing; expert reads it while editing. Help under every field was 32 %
	// of the form's height, and the expert view is the one that has opted out of
	// being walked through — but hiding it outright left the notes on oil,
	// sugar, autolyse and the cold ball proof with no view that shows them at
	// all, since those fields do not exist in the beginner form. Revealing on
	// focus costs nothing at rest and puts the text there at the moment the
	// control is in use. CSS only, so it works for a tap, a click and a Tab
	// alike — the parent label or fieldset carries `group`.
	//
	// Five fields wrote this ternary out by hand, which meant five chances for
	// one of them to disagree about when help is visible.
	let { text, extra = 'mt-1' }: { text: string; extra?: string } = $props();
</script>

<span
	class="{extra} text-xs text-stone-500 dark:text-stone-400 {uiMode.current === 'beginner'
		? 'block'
		: 'hidden group-focus-within:block'}"
>
	{text}
</span>
