<script lang="ts">
	import { resolve } from '$app/paths';
	import { communityEntries } from '$lib/community/community';
	import type { CommunityEntry } from '$lib/community/community';
	import { i18n } from '$lib/i18n/i18n.svelte';
	import { intlLocaleTag } from '$lib/i18n/messages';

	const t = $derived(i18n.t);
	const locale = $derived(i18n.locale);

	const entries: CommunityEntry[] = communityEntries;

	const dateFormatter = $derived(
		new Intl.DateTimeFormat(intlLocaleTag(locale), {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		})
	);

	function formatDate(iso: string): string {
		const [y, m, d] = iso.split('-').map(Number);
		if (!y || !m || !d) return iso;
		return dateFormatter.format(new Date(y, m - 1, d));
	}

	function yeastLabel(entry: CommunityEntry): string {
		if (entry.inputs.yeastType === 'sourdough') return t.form.yeast_sourdough;
		if (entry.inputs.yeastType === 'fresh') return t.form.yeast_fresh;
		return '—';
	}

	function preFermentLabel(entry: CommunityEntry): string {
		const pf = entry.inputs.preFerment;
		if (!pf) return '—';
		const name = pf.type === 'biga' ? t.form.preFerment_biga : t.form.preFerment_poolish;
		const short = name.split('(')[0].trim();
		return `${short} ${pf.flourPercent}%`;
	}

	function num(value: number | undefined, suffix = ''): string {
		return value === undefined ? '—' : `${value}${suffix}`;
	}
</script>

<header class="mb-4">
	<h2 class="font-display text-2xl text-stone-900 dark:text-stone-100">
		{t.community.heading}
	</h2>
	<p class="mt-1 text-sm text-stone-500 dark:text-stone-400">{t.community.intro}</p>
</header>

{#if entries.length === 0}
	<p class="text-sm text-stone-500 dark:text-stone-400">{t.community.empty}</p>
{:else}
	<!-- Mobile: card list. The desktop table is wider than the viewport
	     on phones and the Open action is at the far right behind a hidden
	     horizontal scrollbar — most users never reach it. Cards put Open
	     up front and tuck the rest under a disclosure. -->
	<ul class="flex flex-col gap-3 md:hidden">
		{#each entries as entry (entry.url)}
			<li class="border-dough-200/70 rounded-lg border p-3 dark:border-stone-700/70">
				<div class="flex items-baseline justify-between gap-3">
					<span class="font-medium text-stone-800 dark:text-stone-100">
						{#if entry.handle}
							<a
								href="https://github.com/{entry.handle}"
								target="_blank"
								rel="noopener noreferrer"
								class="hover:text-tomato-600 dark:hover:text-tomato-300 underline-offset-2 hover:underline"
							>
								{entry.handle}
							</a>
						{:else}
							{entry.name}
						{/if}
					</span>
					<span class="text-xs whitespace-nowrap text-stone-500 dark:text-stone-400">
						{formatDate(entry.date)}
					</span>
				</div>
				<a
					href={resolve('/') + entry.search}
					rel="external"
					class="bg-tomato-500 hover:bg-tomato-600 mt-3 inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold text-white"
				>
					{t.community.open_link}
				</a>
				<details class="mt-3 text-sm">
					<summary
						class="hover:text-tomato-600 dark:hover:text-tomato-300 cursor-pointer text-stone-500 dark:text-stone-400"
					>
						{t.community.details_label}
					</summary>
					<dl
						class="mt-2 grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-stone-600 dark:text-stone-300"
					>
						<dt class="font-medium">{t.community.col_pizzas}</dt>
						<dd class="tabular-nums">{num(entry.inputs.pizzaCount)}</dd>
						<dt class="font-medium">{t.community.col_ball}</dt>
						<dd class="tabular-nums">{num(entry.inputs.ballWeight, ' g')}</dd>
						<dt class="font-medium">{t.community.col_hydration}</dt>
						<dd class="tabular-nums">{num(entry.inputs.hydration, '%')}</dd>
						<dt class="font-medium">{t.community.col_salt}</dt>
						<dd class="tabular-nums">{num(entry.inputs.saltPercent, '%')}</dd>
						<dt class="font-medium">{t.community.col_yeast}</dt>
						<dd>{yeastLabel(entry)}</dd>
						<dt class="font-medium">{t.community.col_temp}</dt>
						<dd class="tabular-nums">{num(entry.inputs.roomTempC, '°C')}</dd>
						<dt class="font-medium">{t.community.col_fridge}</dt>
						<dd class="tabular-nums">{num(entry.inputs.fridgeTempC, '°C')}</dd>
						<dt class="font-medium">{t.community.col_preFerment}</dt>
						<dd>{preFermentLabel(entry)}</dd>
					</dl>
				</details>
			</li>
		{/each}
	</ul>

	<!-- Desktop: full table. -->
	<div class="hidden overflow-x-auto md:block">
		<table class="tabular w-full min-w-[640px] border-collapse text-left text-sm">
			<thead>
				<tr
					class="border-dough-300 border-b text-xs tracking-wider text-stone-500 uppercase dark:border-stone-700 dark:text-stone-400"
				>
					<th class="py-2 pr-3 font-semibold">{t.community.col_name}</th>
					<th class="py-2 pr-3 font-semibold">{t.community.col_date}</th>
					<th class="py-2 pr-3 text-right font-semibold">{t.community.col_pizzas}</th>
					<th class="py-2 pr-3 text-right font-semibold">{t.community.col_ball}</th>
					<th class="py-2 pr-3 text-right font-semibold">{t.community.col_hydration}</th>
					<th class="py-2 pr-3 text-right font-semibold">{t.community.col_salt}</th>
					<th class="py-2 pr-3 font-semibold">{t.community.col_yeast}</th>
					<th class="py-2 pr-3 text-right font-semibold">{t.community.col_temp}</th>
					<th class="py-2 pr-3 text-right font-semibold">{t.community.col_fridge}</th>
					<th class="py-2 pr-3 font-semibold">{t.community.col_preFerment}</th>
					<th class="py-2 font-semibold">{t.community.col_open}</th>
				</tr>
			</thead>
			<tbody>
				{#each entries as entry (entry.url)}
					<tr class="border-dough-200/70 border-b align-top last:border-0 dark:border-stone-700/70">
						<td class="py-3 pr-3 font-medium text-stone-800 dark:text-stone-100">
							{#if entry.handle}
								<a
									href="https://github.com/{entry.handle}"
									target="_blank"
									rel="noopener noreferrer"
									class="hover:text-tomato-600 dark:hover:text-tomato-300 underline-offset-2 hover:underline"
								>
									{entry.handle}
								</a>
							{:else}
								{entry.name}
							{/if}
						</td>
						<td class="py-3 pr-3 whitespace-nowrap text-stone-500 dark:text-stone-400">
							{formatDate(entry.date)}
						</td>
						<td class="py-3 pr-3 text-right tabular-nums">{num(entry.inputs.pizzaCount)}</td>
						<td class="py-3 pr-3 text-right tabular-nums">{num(entry.inputs.ballWeight, ' g')}</td>
						<td class="py-3 pr-3 text-right tabular-nums">{num(entry.inputs.hydration, '%')}</td>
						<td class="py-3 pr-3 text-right tabular-nums">{num(entry.inputs.saltPercent, '%')}</td>
						<td class="py-3 pr-3">{yeastLabel(entry)}</td>
						<td class="py-3 pr-3 text-right tabular-nums">{num(entry.inputs.roomTempC, '°C')}</td>
						<td class="py-3 pr-3 text-right tabular-nums">{num(entry.inputs.fridgeTempC, '°C')}</td>
						<td class="py-3 pr-3">{preFermentLabel(entry)}</td>
						<td class="py-3">
							<a
								href={resolve('/') + entry.search}
								rel="external"
								class="text-tomato-600 hover:text-tomato-700 dark:text-tomato-300 dark:hover:text-tomato-200 font-semibold underline-offset-2 hover:underline"
							>
								{t.community.open_link}
							</a>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	<p class="mt-4 text-xs text-stone-500 dark:text-stone-400">
		{t.community.contribute.before_md}<a
			href="https://github.com/JanWelker/knead-time/blob/main/src/lib/community/community.md"
			target="_blank"
			rel="noopener noreferrer"
			class="hover:text-tomato-600 dark:hover:text-tomato-300 underline-offset-2 hover:underline"
			>{t.community.contribute.md}</a
		>{t.community.contribute.between}<a
			href="https://github.com/JanWelker/knead-time/pulls"
			target="_blank"
			rel="noopener noreferrer"
			class="hover:text-tomato-600 dark:hover:text-tomato-300 underline-offset-2 hover:underline"
			>{t.community.contribute.pr}</a
		>{t.community.contribute.after}
	</p>
{/if}
