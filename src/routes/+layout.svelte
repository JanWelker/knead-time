<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { i18n } from '$lib/i18n/i18n.svelte';
	import { detectLocale } from '$lib/i18n/messages';
	import { theme } from '$lib/theme.svelte';
	import { onMount } from 'svelte';

	let { children } = $props();

	onMount(() => {
		// /trmnl/* owns its own locale (baked into the URL path so each
		// language can be prerendered separately for TRMNL's renderer).
		// Auto-detecting from navigator.languages would clobber that.
		if (!page.route.id?.startsWith('/trmnl')) {
			i18n.set(detectLocale(navigator.languages));
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
