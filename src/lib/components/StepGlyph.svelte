<script lang="ts">
	import type { ScheduleStepKind } from '$lib/dough/types';

	// One drawing per step kind — the craft signal the schedule never had. A
	// row of identical dots said "nine things happen"; these say what each of
	// them is, at a glance, from across the kitchen.
	//
	// Purely decorative: the node beside it already carries the active/passive
	// label for assistive technology, and the step title says the rest.
	let { kind }: { kind: ScheduleStepKind } = $props();
</script>

<svg
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="1.6"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
	class="size-full"
>
	{#if kind === 'preferment-mix'}
		<!-- A jar with a lively surface: the pre-dough set the day before. -->
		<path d="M7 8h10v10a3 3 0 0 1-3 3h-4a3 3 0 0 1-3-3z" />
		<path d="M8.5 5h7l-.7 3H9.2z" />
		<path d="M7.4 14.2c1.5-1 3-1 4.6 0s3.1 1 4.6 0" />
	{:else if kind === 'prep'}
		<!-- Scales: the weighing step. -->
		<path d="M12 4v16M8 20h8" />
		<path d="M4.5 12 8 5.5 11.5 12a3.5 3.5 0 0 1-7 0Z" />
		<path d="M15.5 12h5" />
		<circle cx="18" cy="9" r="1.6" />
	{:else if kind === 'autolyse'}
		<!-- A drop settling into flour: water and flour resting, nothing added. -->
		<path d="M12 3c2.6 3 4 5.1 4 6.9a4 4 0 0 1-8 0C8 8.1 9.4 6 12 3Z" />
		<path d="M4 17.5c1.6-1.1 3.2-1.1 4.8 0s3.2 1.1 4.8 0 3.2-1.1 4.8 0" />
		<path d="M4 21c1.6-1.1 3.2-1.1 4.8 0s3.2 1.1 4.8 0 3.2-1.1 4.8 0" />
	{:else if kind === 'mix'}
		<!-- A dough hook in the bowl. -->
		<path d="M4 12.5h16a8 8 0 0 1-8 8 8 8 0 0 1-8-8Z" />
		<path d="M12 12.5V6a2.5 2.5 0 0 1 5 0" />
	{:else if kind === 'bulk-room' || kind === 'final-proof'}
		<!-- Dough rising over the rim of the tub. -->
		<path d="M4 20h16" />
		<path d="M5.5 20V13c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5v7" />
		<path d="M9 4.2 9.8 3M12 3.6V2M15 4.2 14.2 3" />
	{:else if kind === 'bulk-cold' || kind === 'proof-cold'}
		<!-- The fridge shelf. -->
		<rect x="5" y="3" width="14" height="18" rx="2.5" />
		<path d="M5 10h14M8.5 6.2v1.6M8.5 13.2v2.4" />
	{:else if kind === 'divide'}
		<!-- One piece cut into balls. -->
		<circle cx="8" cy="15" r="3.4" />
		<circle cx="16.5" cy="15" r="3.4" />
		<path d="M12 3v7.5" />
		<path d="M9.5 5.2 12 3l2.5 2.2" />
	{:else}
		<!-- ready: the pizza, sliced. -->
		<path d="M12 3.5 21 20a26 26 0 0 1-18 0Z" />
		<path d="M12 3.5V20M6.6 12.6h10.8" />
	{/if}
</svg>
