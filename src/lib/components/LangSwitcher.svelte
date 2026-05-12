<script lang="ts">
	import { i18n } from '$lib/i18n/i18n.svelte';
	import { LOCALES, type Locale } from '$lib/i18n/messages';

	const labels: Record<Locale, string> = { en: 'EN', de: 'DE', it: 'IT' };
</script>

<fieldset
	class="border-dough-300 m-0 inline-flex overflow-hidden rounded-full border bg-white/70 p-0 text-xs font-semibold tracking-wider shadow-sm"
>
	<legend class="sr-only">{i18n.t.app.langLabel}</legend>
	{#each LOCALES as loc (loc)}
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
</fieldset>
