<script lang="ts">
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
		help
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
		class="border-dough-300 mt-1 w-full rounded-lg border bg-white px-3 py-2 text-base shadow-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
	/>
	{#if help}<span class="mt-1 block text-xs text-stone-500 dark:text-stone-400">{help}</span>{/if}
</label>
