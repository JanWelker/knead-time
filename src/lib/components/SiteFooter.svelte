<script lang="ts">
	import { i18n } from '$lib/i18n/i18n.svelte';
	import { interpolate } from '$lib/i18n/interpolate';
	// The colophon at the foot of every sheet: who printed it, under what
	// licence, from which plate. Language and theme used to live here too; they
	// are in the masthead now, where a reader reaches for them before reading
	// rather than after scrolling a plan that runs several screens.
	const t = $derived(i18n.t);
	const currentYear = new Date().getFullYear();
	const appVersion = __APP_VERSION__;

	const links = [
		{ href: 'https://github.com/JanWelker/knead-time', label: () => t.footer.source },
		{ href: 'https://github.com/JanWelker/knead-time#readme', label: () => t.footer.docs },
		{ href: 'https://github.com/JanWelker/knead-time/issues', label: () => t.footer.support },
		{
			href: 'https://github.com/JanWelker/knead-time/blob/main/LICENSE',
			label: () => interpolate(t.footer.license, { year: currentYear })
		},
		{
			href: `https://github.com/JanWelker/knead-time/releases/tag/v${appVersion}`,
			label: () => `v${appVersion}`
		}
	];
</script>

<footer class="text-ink-soft mt-6">
	<div class="tricolore border-rule border-y-2"></div>
	<div class="view-pad py-8">
		<div class="min-w-0">
			<p class="max-w-[52ch] text-sm leading-relaxed">{t.footer.about}</p>
			<p class="mt-2 max-w-[52ch] text-sm leading-relaxed">{t.actions.share_help}</p>
			<p class="mt-5 flex flex-wrap gap-x-5 gap-y-2">
				<!-- rel="external" because the href is a prop: the lint rule that keeps
				     in-app links going through resolve() cannot tell that every one of
				     these leaves the app. Same reason RecipeSection carries it. -->
				{#each links as link (link.href)}
					<a
						href={link.href}
						target="_blank"
						rel="external noopener noreferrer"
						class="link-action"
					>
						{link.label()}
					</a>
				{/each}
			</p>
		</div>
	</div>
</footer>
