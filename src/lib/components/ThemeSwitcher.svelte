<script lang="ts">
	import { i18n } from '$lib/i18n/i18n.svelte';
	import { theme, type ThemeChoice } from '$lib/theme.svelte';
	import SegmentedControl from './SegmentedControl.svelte';

	const choices: ThemeChoice[] = ['system', 'light', 'dark'];
	const t = $derived(i18n.t);

	function label(c: ThemeChoice): string {
		return c === 'system' ? t.app.theme_auto : c === 'light' ? t.app.theme_light : t.app.theme_dark;
	}
</script>

<SegmentedControl
	legend={t.app.themeLabel}
	options={choices}
	active={theme.choice}
	onselect={(c) => theme.set(c)}
	labelFor={label}
>
	{#snippet children(c)}
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
			{#if c === 'system'}
				<rect x="2" y="4" width="20" height="14" rx="2" />
				<path d="M8 21h8M12 17v4" />
			{:else if c === 'light'}
				<circle cx="12" cy="12" r="4" />
				<path
					d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
				/>
			{:else}
				<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
			{/if}
		</svg>
	{/snippet}
</SegmentedControl>
