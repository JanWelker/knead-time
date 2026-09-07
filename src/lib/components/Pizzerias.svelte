<script lang="ts">
	import { resolve } from '$app/paths';
	import { pizzeriaEntries, type PizzeriaEntry, type Ranking } from '$lib/pizzerias/pizzerias';
	import { i18n } from '$lib/i18n/i18n.svelte';
	import { numLabel, preFermentLabel, yeastLabel } from './recipeLabels';
	import RecipeSection from './RecipeSection.svelte';
	import RecipeSpecList from './RecipeSpecList.svelte';

	const t = $derived(i18n.t);

	const entries: PizzeriaEntry[] = pizzeriaEntries;

	function listLabel(list: Ranking['list']): string {
		return list === 'italy' ? t.pizzerias.list_italy : t.pizzerias.list_world;
	}

	// Chronological (oldest first). Visual order is stable and predictable; for
	// sort/best-rank the entries are already pre-sorted.
	function chronological(rankings: Ranking[]): Ranking[] {
		return [...rankings].sort((a, b) => a.year - b.year);
	}
</script>

{#snippet rankingChips(rankings: Ranking[])}
	<ul class="flex flex-wrap gap-1 text-xs">
		{#each chronological(rankings) as r (`${r.year}-${r.list}`)}
			<li
				class="border-rule text-ink rounded-[1px] border px-1.5 py-0.5 font-bold tabular-nums"
				title="{listLabel(r.list)} · {r.year}"
			>
				#{r.rank}
				<span class="text-ink-soft">{r.year}</span>
				<span class="text-ink-soft">{listLabel(r.list)}</span>
			</li>
		{/each}
	</ul>
{/snippet}

{#snippet pizzeriaName(entry: PizzeriaEntry)}
	{#if entry.profileUrl}
		<a href={entry.profileUrl} target="_blank" rel="noopener noreferrer" class="link-quiet">
			{entry.name}
		</a>
	{:else}
		{entry.name}
	{/if}
{/snippet}

<RecipeSection
	copy={t.pizzerias}
	isEmpty={entries.length === 0}
	sourceHref="https://github.com/JanWelker/knead-time/blob/main/src/lib/pizzerias/pizzerias.md"
>
	<!-- Cards below lg, not md as in Community: this table's 840 px minimum
	     still needs a hidden horizontal scroll at iPad-portrait widths, which
	     is exactly what the cards exist to avoid. -->
	<ul class="flex flex-col gap-3 lg:hidden">
		{#each entries as entry (entry.recipeUrl)}
			<li class="border-rule bg-paper rounded-[2px] border-2 p-3">
				<div class="flex items-baseline justify-between gap-3">
					<span class="text-ink font-bold">
						{@render pizzeriaName(entry)}
					</span>
					<span class="text-ink-soft text-xs whitespace-nowrap">
						{entry.city}, {entry.country}
					</span>
				</div>
				<div class="mt-2">{@render rankingChips(entry.rankings)}</div>
				<div class="mt-3 flex flex-wrap gap-2">
					<a
						href={resolve('/') + entry.recipeSearch}
						rel="external"
						class="btn-tomato inline-flex items-center justify-center"
					>
						{t.pizzerias.open_link}
					</a>
					<a
						href={entry.sourceUrl}
						target="_blank"
						rel="noopener noreferrer"
						class="btn-tomato inline-flex items-center justify-center"
					>
						{t.pizzerias.source_link}
					</a>
				</div>
				<details class="mt-3 text-sm">
					<summary class="label-caps text-ink-soft cursor-pointer">
						{t.pizzerias.details_label}
					</summary>
					<RecipeSpecList inputs={entry.inputs} labels={t.pizzerias} />
					{#if entry.notes}
						<p class="text-ink-soft mt-2 text-xs italic">{entry.notes}</p>
					{/if}
				</details>
			</li>
		{/each}
	</ul>

	<!-- lg and up: the full table. -->
	<div class="hidden overflow-x-auto lg:block">
		<table class="w-full min-w-[840px] border-collapse text-left text-sm tabular-nums">
			<thead>
				<tr class="bg-rule text-paper">
					<th class="label-caps text-paper px-3 py-2">{t.pizzerias.col_pizzeria}</th>
					<th class="label-caps text-paper px-3 py-2">{t.pizzerias.col_location}</th>
					<th class="label-caps text-paper px-3 py-2">{t.pizzerias.col_rankings}</th>
					<th class="label-caps text-paper px-3 py-2 text-right">{t.pizzerias.col_hydration}</th>
					<th class="label-caps text-paper px-3 py-2 text-right">{t.pizzerias.col_salt}</th>
					<th class="label-caps text-paper px-3 py-2">{t.pizzerias.col_yeast}</th>
					<th class="label-caps text-paper px-3 py-2">{t.pizzerias.col_preFerment}</th>
					<th class="label-caps text-paper px-3 py-2">{t.pizzerias.col_open}</th>
					<th class="label-caps text-paper px-3 py-2">{t.pizzerias.col_source}</th>
				</tr>
			</thead>
			<tbody>
				{#each entries as entry (entry.recipeUrl)}
					<tr class="row-divider align-top">
						<td class="text-ink px-3 py-3 font-bold">
							{@render pizzeriaName(entry)}
							{#if entry.notes}
								<div
									class="text-ink-soft mt-1 max-w-xs text-xs font-normal italic"
									title={entry.notes}
								>
									{entry.notes}
								</div>
							{/if}
						</td>
						<td class="text-ink-soft px-3 py-3 whitespace-nowrap">
							{entry.city}, {entry.country}
						</td>
						<td class="px-3 py-3">{@render rankingChips(entry.rankings)}</td>
						<td class="px-3 py-3 text-right font-semibold tabular-nums">
							{numLabel(entry.inputs.hydration, '%')}
						</td>
						<td class="px-3 py-3 text-right font-semibold tabular-nums">
							{numLabel(entry.inputs.saltPercent, '%')}
						</td>
						<td class="px-3 py-3">{yeastLabel(entry.inputs, t)}</td>
						<td class="px-3 py-3">{preFermentLabel(entry.inputs, t)}</td>
						<td class="px-3 py-3">
							<a href={resolve('/') + entry.recipeSearch} rel="external" class="link-action">
								{t.pizzerias.open_link}
							</a>
						</td>
						<td class="px-3 py-3">
							<a
								href={entry.sourceUrl}
								target="_blank"
								rel="noopener noreferrer"
								class="link-action"
							>
								{t.pizzerias.source_link}
							</a>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</RecipeSection>
