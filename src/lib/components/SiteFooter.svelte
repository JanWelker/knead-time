<script lang="ts">
	import { i18n } from '$lib/i18n/i18n.svelte';
	import { interpolate } from '$lib/i18n/interpolate';
	import LangSwitcher from './LangSwitcher.svelte';
	import ThemeSwitcher from './ThemeSwitcher.svelte';

	// One footer under every view. It carries the two device preferences that
	// have nowhere better to live — language and theme — so they are reachable
	// from the first question as well as from the finished plan.
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

<footer class="rule text-ink-soft mt-20">
	<div class="view-pad grid gap-8 py-10 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
		<div class="min-w-0">
			<p class="max-w-[52ch] text-sm leading-relaxed">{t.footer.about}</p>
			<p class="mt-2 max-w-[52ch] text-sm leading-relaxed">{t.actions.share_help}</p>
			<p class="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm">
				<!-- rel="external" because the href is a prop: the lint rule that keeps
				     in-app links going through resolve() cannot tell that every one of
				     these leaves the app. Same reason RecipeSection carries it. -->
				{#each links as link (link.href)}
					<a href={link.href} target="_blank" rel="external noopener noreferrer" class="link-quiet">
						{link.label()}
					</a>
				{/each}
			</p>
		</div>
		<div class="flex flex-wrap items-center gap-2">
			<LangSwitcher />
			<ThemeSwitcher />
		</div>
	</div>
</footer>
