<script lang="ts">
	import FieldHelp from './FieldHelp.svelte';

	// Always a number box: every caller is a number, and the `value` binding is
	// typed as one. The `type` and `inputmode` props that used to make that
	// configurable had no caller at all.
	type Props = {
		label: string;
		value: number;
		min?: number;
		max?: number;
		step?: number | string;
		id?: string;
		help?: string;
		// Fires on the input's `change`, i.e. once the value is committed rather
		// than on every keystroke — for callers that react by rewriting other
		// fields, which would be unbearable mid-typing.
		oncommit?: () => void;
	};
	let { label, value = $bindable(), min, max, step, id, help, oncommit }: Props = $props();
</script>

<label class="group block" for={id}>
	<span class="field-label">{label}</span>
	<input
		type="number"
		{min}
		{max}
		{step}
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
		class="input w-full"
	/>
	{#if help}
		<FieldHelp text={help} />
	{/if}
</label>
