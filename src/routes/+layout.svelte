<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { i18n } from '$lib/i18n/i18n.svelte';
	import { detectLocale } from '$lib/i18n/messages';
	import { loadStoredLocale } from '$lib/i18n/storedLocale';
	import { safeLocalStorage } from '$lib/safeStorage';
	import { theme } from '$lib/theme.svelte';
	import { onMount } from 'svelte';

	let { children } = $props();

	onMount(() => {
		// /print/* owns its own locale (baked into the URL path so each
		// language can be prerendered separately for the print dialog).
		// Auto-detecting from navigator.languages would clobber that — the
		// URL is authoritative on that route.
		const ownsLocale = page.route.id?.startsWith('/print');
		if (ownsLocale) {
			// The print sheet is a black-on-white page that sets its own ground
			// with `background: #fff !important`, so it has no dark half to
			// resolve — but the pre-paint boot script in app.html cannot know
			// which route it is on and stamps `dark` on a dark system anyway,
			// which drags `color-scheme: dark` onto a sheet about to be printed.
			// Undo it here; the route's own inline `color-scheme: light` covers
			// the window before this runs.
			document.documentElement.classList.remove('dark');
			return;
		}
		// A persisted user choice wins over navigator detect so a full
		// reload (e.g. via a community Open link) doesn't snap back.
		const stored = loadStoredLocale(safeLocalStorage());
		i18n.set(stored ?? detectLocale(navigator.languages));
		// Returned so the system-preference listener it attaches is torn down
		// with the layout rather than outliving it.
		return theme.init();
	});

	// Mirror i18n.locale onto <html lang>; effects only run client-side,
	// so no SSR guard is needed.
	$effect(() => {
		document.documentElement.lang = i18n.locale;
	});
</script>

{@render children()}
