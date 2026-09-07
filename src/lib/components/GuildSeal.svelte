<script lang="ts">
	import type { Snippet } from 'svelte';

	// A guild mark: the cogged, double-ruled roundel a consorzio presses onto
	// something it has certified. The outlined rectangles this replaced were the
	// cheapest thing on the page — a hairline box, a 6 px swatch and a row of
	// ASCII ★☆, which reads as a rating widget rather than as a mark of origin.
	//
	// Drawn rather than typed: the teeth, the rings and the stars are geometry,
	// so they keep their weight at any size and in any font. Everything is
	// currentColor, so a caller says basil or tomato once and the whole seal
	// follows. The caption stays OUTSIDE, set horizontally — text on an arc
	// cannot survive five locales ("Cold ferment" against
	// "Kühlschrank-Gare"), and a mark you cannot read is not a mark.
	let { label, children }: { label: string; children: Snippet } = $props();

	// 24 teeth, drawn as radial ticks between the two rings.
	const TEETH = Array.from({ length: 24 }, (_, i) => (i * 360) / 24);
</script>

<span class="inline-flex items-center gap-2.5">
	<svg
		width="52"
		height="52"
		viewBox="0 0 100 100"
		fill="none"
		aria-hidden="true"
		class="shrink-0 overflow-visible"
	>
		<!-- The rim, its inner rule, and the field the mark sits in. -->
		<circle cx="50" cy="50" r="46" stroke="currentColor" stroke-width="4" />
		<circle cx="50" cy="50" r="38" stroke="currentColor" stroke-width="1.5" />
		{#each TEETH as angle (angle)}
			<line
				x1="50"
				y1="4"
				x2="50"
				y2="10"
				stroke="currentColor"
				stroke-width="3"
				stroke-linecap="butt"
				transform="rotate({angle} 50 50)"
			/>
		{/each}
		{@render children()}
	</svg>
	<span class="label-caps leading-tight">{label}</span>
</span>
