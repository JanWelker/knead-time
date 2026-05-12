<script lang="ts">
	import '../app.css';
	import { i18n } from '$lib/i18n/i18n.svelte';
	import { detectLocale } from '$lib/i18n/messages';
	import { theme } from '$lib/theme.svelte';
	import { onMount } from 'svelte';

	let { children } = $props();

	onMount(() => {
		i18n.set(detectLocale(navigator.languages));
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
