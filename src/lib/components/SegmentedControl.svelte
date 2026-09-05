<script lang="ts" generics="T extends string">
	import type { Snippet } from 'svelte';

	// The rounded switch strip used for the language, the theme and the
	// schedule's verbosity. All three were written out separately and had
	// drifted: two named themselves with a <legend>, one with an
	// aria-label on a role="group", and the verbosity strip sat two pixels
	// shorter than the other two. A fieldset + legend is the shape that
	// needs no ARIA at all, so it is the one that survived.
	let {
		legend,
		options,
		active,
		onselect,
		labelFor,
		children
	}: {
		legend: string;
		options: readonly T[];
		active: T;
		onselect: (value: T) => void;
		/** The option's name. Rendered as the button's text unless `children`
		 *  draws something else, in which case it becomes the spoken name. */
		labelFor: (value: T) => string;
		/** Contents of one button, for a strip that shows icons. */
		children?: Snippet<[T]>;
	} = $props();
</script>

<fieldset class="pill-group">
	<legend class="sr-only">{legend}</legend>
	{#each options as value (value)}
		{@const on = value === active}
		<button
			type="button"
			class="pill {on ? 'pill-on' : 'pill-off'}"
			aria-pressed={on}
			aria-label={children ? labelFor(value) : undefined}
			title={children ? labelFor(value) : undefined}
			onclick={() => onselect(value)}
		>
			{#if children}{@render children(value)}{:else}{labelFor(value)}{/if}
		</button>
	{/each}
</fieldset>
