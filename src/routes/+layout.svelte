<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { i18n } from '$lib/i18n/i18n.svelte';
	import { detectLocale } from '$lib/i18n/messages';
	import { loadStoredLocale } from '$lib/i18n/storedLocale';
	import { theme } from '$lib/theme.svelte';
	import { onMount } from 'svelte';

	let { children } = $props();

	onMount(() => {
		// /trmnl/* and /print/* own their own locale (baked into the URL path
		// so each language can be prerendered separately for the screenshot
		// service or the print dialog). Auto-detecting from navigator.languages
		// would clobber that — the URL is authoritative on these routes.
		const ownsLocale = page.route.id?.startsWith('/trmnl') || page.route.id?.startsWith('/print');
		if (!ownsLocale) {
			// A persisted user choice wins over navigator detect so a full
			// reload (e.g. via a community Open link) doesn't snap back.
			const stored = loadStoredLocale(localStorage);
			i18n.set(stored ?? detectLocale(navigator.languages));
		}
		document.documentElement.lang = i18n.locale;
		theme.init();
	});

	$effect(() => {
		if (typeof document !== 'undefined') {
			document.documentElement.lang = i18n.locale;
		}
	});
</script>

{@render children()}
