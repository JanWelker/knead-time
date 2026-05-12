<script lang="ts">
	import { i18n } from '$lib/i18n/i18n.svelte';
	import { theme, type ThemeChoice } from '$lib/theme.svelte';

	const choices: ThemeChoice[] = ['system', 'light', 'dark'];
	const t = $derived(i18n.t);

	function label(c: ThemeChoice): string {
		return c === 'system' ? t.app.theme_auto : c === 'light' ? t.app.theme_light : t.app.theme_dark;
	}
</script>

<div
	class="border-dough-300 inline-flex overflow-hidden rounded-full border bg-white/70 text-xs font-semibold tracking-wider shadow-sm dark:border-stone-700 dark:bg-stone-800/70"
	role="group"
	aria-label={t.app.themeLabel}
>
	{#each choices as c (c)}
		{@const active = theme.choice === c}
		<button
			type="button"
			class="inline-flex items-center justify-center px-3 py-1.5 transition-colors {active
				? 'bg-tomato-500 text-white'
				: 'hover:bg-dough-100 text-stone-700 dark:text-stone-200 dark:hover:bg-stone-700'}"
			aria-pressed={active}
			aria-label={label(c)}
			title={label(c)}
			onclick={() => theme.set(c)}
		>
			{#if c === 'system'}
				<svg
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<rect x="2" y="4" width="20" height="14" rx="2" />
					<path d="M8 21h8M12 17v4" />
				</svg>
			{:else if c === 'light'}
				<svg
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<circle cx="12" cy="12" r="4" />
					<path
						d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
					/>
				</svg>
			{:else}
				<svg
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
				</svg>
			{/if}
		</button>
	{/each}
</div>
