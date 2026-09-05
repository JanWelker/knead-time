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

<label class="group block" for={id}>
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
		class="input mt-1 w-full text-base"
	/>
	<!-- Beginner reads it standing; expert reads it while editing. Help under
	     every field was 32 % of the form's height, and the expert view is the
	     one that has opted out of being walked through — but hiding it outright
	     left the notes on oil, sugar, autolyse and the cold ball proof with no
	     view that shows them at all, since those fields do not exist in the
	     beginner form. Revealing on focus costs nothing at rest and puts the
	     text there at the moment the control is in use. CSS only, so it works
	     for a tap, a click and a Tab alike. -->
	{#if help}
		<span
			class="mt-1 text-xs text-stone-500 dark:text-stone-400 {uiMode.current === 'beginner'
				? 'block'
				: 'hidden group-focus-within:block'}"
		>
			{help}
		</span>
	{/if}
</label>
