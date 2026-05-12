<script lang="ts">
	import { i18n } from '$lib/i18n/i18n.svelte';
	import { LOCALES, type Locale } from '$lib/i18n/messages';

	const labels: Record<Locale, string> = { en: 'EN', de: 'DE', it: 'IT' };
</script>

<div
	class="border-dough-300 inline-flex overflow-hidden rounded-full border bg-white/70 text-xs font-semibold tracking-wider shadow-sm"
	role="group"
	aria-label={i18n.t.app.langLabel}
>
	{#each LOCALES as loc}
		{@const active = i18n.locale === loc}
		<button
			type="button"
			class="px-3 py-1.5 transition-colors {active
				? 'bg-tomato-500 text-white'
				: 'hover:bg-dough-100 text-stone-700'}"
			aria-pressed={active}
			onclick={() => i18n.set(loc)}
		>
			{labels[loc]}
		</button>
	{/each}
</div>
