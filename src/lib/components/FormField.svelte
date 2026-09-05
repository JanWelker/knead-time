<script lang="ts">
	import { uiMode } from '$lib/mode.svelte';

	type Props = {
		label: string;
		value: number;
		type?: 'number' | 'text';
		min?: number;
		max?: number;
		step?: number | string;
		inputmode?: 'numeric' | 'decimal' | 'text';
		id?: string;
		help?: string;
		// Fires on the input's `change`, i.e. once the value is committed rather
		// than on every keystroke — for callers that react by rewriting other
		// fields, which would be unbearable mid-typing.
		oncommit?: () => void;
	};
	let {
		label,
		value = $bindable(),
		type = 'number',
		min,
		max,
		step,
		inputmode,
		id,
		help,
		oncommit
	}: Props = $props();
</script>

<label class="block" for={id}>
	<span class="block text-sm font-medium text-stone-700 dark:text-stone-200">{label}</span>
	<input
		{type}
		{min}
		{max}
		{step}
		{inputmode}
		{id}
		bind:value
		onchange={(e) => {
			// An emptied number box writes null upstream. Where the caller refuses
			// that write the value never changes, so nothing re-renders and the box
			// would sit blank against a live value — put the live one back.
			if (e.currentTarget.value === '' && Number.isFinite(value)) {
				e.currentTarget.value = String(value);
			}
			oncommit?.();
		}}
		class="border-dough-300 mt-1 w-full rounded-lg border bg-white px-3 py-2 text-base shadow-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
	/>
	<!-- Beginner only. Standing help under every field was 32 % of the form's
	     height in both views, and the expert view is the one that has opted out
	     of being walked through: it trades that space for the fourteen extra
	     controls it reveals. Conditional notices — the ones that appear in
	     response to a choice rather than describing a field — are not this, and
	     stay in both views. -->
	{#if help && uiMode.current === 'beginner'}
		<span class="mt-1 block text-xs text-stone-500 dark:text-stone-400">{help}</span>
	{/if}
</label>
