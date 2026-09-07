<script lang="ts">
	import { resolve } from '$app/paths';
	import { communityEntries } from '$lib/community/community';
	import type { CommunityEntry } from '$lib/community/community';
	import { formatIsoDate } from '$lib/format';
	import { i18n } from '$lib/i18n/i18n.svelte';
	import { numLabel, preFermentLabel, yeastLabel } from './recipeLabels';
	import RecipeSection from './RecipeSection.svelte';
	import RecipeSpecList from './RecipeSpecList.svelte';

	const t = $derived(i18n.t);
	const locale = $derived(i18n.locale);

	const entries: CommunityEntry[] = communityEntries;
</script>

<RecipeSection
	copy={t.community}
	isEmpty={entries.length === 0}
	sourceHref="https://github.com/JanWelker/knead-time/blob/main/src/lib/community/community.md"
>
	<!-- Cards below md: the desktop table is wider than a phone viewport, and
	     Open sits at the far right behind a hidden horizontal scrollbar, where
	     most readers never reach it. Cards put Open up front and tuck the
	     numbers under a disclosure. -->
	<ul class="flex flex-col gap-3 md:hidden">
		{#each entries as entry (entry.url)}
			<li class="border-rule bg-paper rounded-[2px] border-2 p-3">
				<div class="flex items-baseline justify-between gap-3">
					<span class="text-ink font-bold">
						{#if entry.handle}
							<a
								href="https://github.com/{entry.handle}"
								target="_blank"
								rel="noopener noreferrer"
								class="link-quiet"
							>
								{entry.handle}
							</a>
						{:else}
							{entry.name}
						{/if}
					</span>
					<span class="text-ink-soft text-xs whitespace-nowrap">
						{formatIsoDate(entry.date, locale)}
					</span>
				</div>
				<a
					href={resolve('/') + entry.search}
					rel="external"
					class="btn-tomato mt-3 inline-flex items-center justify-center"
				>
					{t.community.open_link}
				</a>
				<details class="mt-3 text-sm">
					<summary class="label-caps text-ink-soft cursor-pointer">
						{t.community.details_label}
					</summary>
					<RecipeSpecList inputs={entry.inputs} labels={t.community} />
				</details>
			</li>
		{/each}
	</ul>

	<!-- md and up: the full table. -->
	<div class="hidden overflow-x-auto md:block">
		<table class="w-full min-w-[640px] border-collapse text-left text-sm tabular-nums">
			<thead>
				<tr class="bg-rule text-paper">
					<th class="label-caps text-paper px-3 py-2">{t.community.col_name}</th>
					<th class="label-caps text-paper px-3 py-2">{t.community.col_date}</th>
					<th class="label-caps text-paper px-3 py-2 text-right">{t.community.col_pizzas}</th>
					<th class="label-caps text-paper px-3 py-2 text-right">{t.community.col_ball}</th>
					<th class="label-caps text-paper px-3 py-2 text-right">{t.community.col_hydration}</th>
					<th class="label-caps text-paper px-3 py-2 text-right">{t.community.col_salt}</th>
					<th class="label-caps text-paper px-3 py-2">{t.community.col_yeast}</th>
					<th class="label-caps text-paper px-3 py-2 text-right">{t.community.col_temp}</th>
					<th class="label-caps text-paper px-3 py-2 text-right">{t.community.col_fridge}</th>
					<th class="label-caps text-paper px-3 py-2">{t.community.col_preFerment}</th>
					<th class="label-caps text-paper px-3 py-2">{t.community.col_open}</th>
				</tr>
			</thead>
			<tbody>
				{#each entries as entry (entry.url)}
					<tr class="row-divider align-top">
						<td class="text-ink px-3 py-3 font-bold">
							{#if entry.handle}
								<a
									href="https://github.com/{entry.handle}"
									target="_blank"
									rel="noopener noreferrer"
									class="link-quiet"
								>
									{entry.handle}
								</a>
							{:else}
								{entry.name}
							{/if}
						</td>
						<td class="text-ink-soft px-3 py-3 whitespace-nowrap">
							{formatIsoDate(entry.date, locale)}
						</td>
						<td class="px-3 py-3 text-right font-semibold tabular-nums"
							>{numLabel(entry.inputs.pizzaCount)}</td
						>
						<td class="px-3 py-3 text-right font-semibold tabular-nums">
							{numLabel(entry.inputs.ballWeight, ' g')}
						</td>
						<td class="px-3 py-3 text-right font-semibold tabular-nums">
							{numLabel(entry.inputs.hydration, '%')}
						</td>
						<td class="px-3 py-3 text-right font-semibold tabular-nums">
							{numLabel(entry.inputs.saltPercent, '%')}
						</td>
						<td class="px-3 py-3">{yeastLabel(entry.inputs, t)}</td>
						<td class="px-3 py-3 text-right font-semibold tabular-nums">
							{numLabel(entry.inputs.roomTempC, '°C')}
						</td>
						<td class="px-3 py-3 text-right font-semibold tabular-nums">
							{numLabel(entry.inputs.fridgeTempC, '°C')}
						</td>
						<td class="px-3 py-3">{preFermentLabel(entry.inputs, t)}</td>
						<td class="px-3 py-3">
							<a href={resolve('/') + entry.search} rel="external" class="link-action">
								{t.community.open_link}
							</a>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</RecipeSection>
