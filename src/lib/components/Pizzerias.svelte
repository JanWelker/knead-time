<script lang="ts">
	import { resolve } from '$app/paths';
	import { pizzeriaEntries, type PizzeriaEntry, type Ranking } from '$lib/pizzerias/pizzerias';
	import { i18n } from '$lib/i18n/i18n.svelte';

	const t = $derived(i18n.t);

	const entries: PizzeriaEntry[] = pizzeriaEntries;

	function yeastLabel(entry: PizzeriaEntry): string {
		if (entry.inputs.yeastType === 'sourdough') return t.form.yeast_sourdough;
		if (entry.inputs.yeastType === 'fresh') return t.form.yeast_fresh;
		return '—';
	}

	function preFermentLabel(entry: PizzeriaEntry): string {
		const pf = entry.inputs.preFerment;
		if (!pf) return '—';
		const name = pf.type === 'biga' ? t.form.preFerment_biga : t.form.preFerment_poolish;
		const short = name.split('(')[0].trim();
		return `${short} ${pf.flourPercent}%`;
	}

	function num(value: number | undefined, suffix = ''): string {
		return value === undefined ? '—' : `${value}${suffix}`;
	}

	function listLabel(list: Ranking['list']): string {
		return list === 'italy' ? t.pizzerias.list_italy : t.pizzerias.list_world;
	}

	// Render rankings in chronological order (oldest first). Visual order is
	// stable and predictable; for sort/best-rank we already pre-sort entries.
	function chronological(rankings: Ranking[]): Ranking[] {
		return [...rankings].sort((a, b) => a.year - b.year);
	}
</script>

<header class="mb-4">
	<h2 class="font-display text-2xl text-stone-900 dark:text-stone-100">
		{t.pizzerias.heading}
	</h2>
	<p class="mt-1 text-sm text-stone-500 dark:text-stone-400">{t.pizzerias.intro}</p>
</header>

{#if entries.length === 0}
	<p class="text-sm text-stone-500 dark:text-stone-400">{t.pizzerias.empty}</p>
{:else}
	<!-- Mobile: card list. The desktop table is wider than the viewport on phones
	     and the secondary actions land behind a hidden horizontal scrollbar —
	     cards put Open up front and tuck the rest under a disclosure. -->
	<ul class="flex flex-col gap-3 md:hidden">
		{#each entries as entry (entry.recipeUrl)}
			<li class="border-dough-200/70 rounded-lg border p-3 dark:border-stone-700/70">
				<div class="flex items-baseline justify-between gap-3">
					<span class="font-medium text-stone-800 dark:text-stone-100">
						{#if entry.profileUrl}
							<a
								href={entry.profileUrl}
								target="_blank"
								rel="noopener noreferrer"
								class="hover:text-tomato-600 dark:hover:text-tomato-300 underline-offset-2 hover:underline"
							>
								{entry.name}
							</a>
						{:else}
							{entry.name}
						{/if}
					</span>
					<span class="text-xs whitespace-nowrap text-stone-500 dark:text-stone-400">
						{entry.city}, {entry.country}
					</span>
				</div>
				<ul class="mt-2 flex flex-wrap gap-1 text-xs">
					{#each chronological(entry.rankings) as r (`${r.year}-${r.list}`)}
						<li
							class="bg-dough-100 rounded-full px-2 py-0.5 text-stone-700 tabular-nums dark:bg-stone-800 dark:text-stone-200"
							title="{listLabel(r.list)} · {r.year}"
						>
							#{r.rank} <span class="text-stone-500 dark:text-stone-400">{r.year}</span>
							<span class="text-stone-400 dark:text-stone-500">{listLabel(r.list)}</span>
						</li>
					{/each}
				</ul>
				<div class="mt-3 flex flex-wrap gap-2">
					<a
						href={resolve('/') + entry.recipeSearch}
						rel="external"
						class="bg-tomato-500 hover:bg-tomato-600 inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold text-white"
					>
						{t.pizzerias.open_link}
					</a>
					<a
						href={entry.sourceUrl}
						target="_blank"
						rel="noopener noreferrer"
						class="border-dough-300 hover:text-tomato-600 dark:hover:text-tomato-300 inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm font-medium text-stone-700 dark:border-stone-600 dark:text-stone-200"
					>
						{t.pizzerias.source_link}
					</a>
				</div>
				<details class="mt-3 text-sm">
					<summary
						class="hover:text-tomato-600 dark:hover:text-tomato-300 cursor-pointer text-stone-500 dark:text-stone-400"
					>
						{t.pizzerias.details_label}
					</summary>
					<dl
						class="mt-2 grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-stone-600 dark:text-stone-300"
					>
						<dt class="font-medium">{t.pizzerias.col_pizzas}</dt>
						<dd class="tabular-nums">{num(entry.inputs.pizzaCount)}</dd>
						<dt class="font-medium">{t.pizzerias.col_ball}</dt>
						<dd class="tabular-nums">{num(entry.inputs.ballWeight, ' g')}</dd>
						<dt class="font-medium">{t.pizzerias.col_hydration}</dt>
						<dd class="tabular-nums">{num(entry.inputs.hydration, '%')}</dd>
						<dt class="font-medium">{t.pizzerias.col_salt}</dt>
						<dd class="tabular-nums">{num(entry.inputs.saltPercent, '%')}</dd>
						<dt class="font-medium">{t.pizzerias.col_yeast}</dt>
						<dd>{yeastLabel(entry)}</dd>
						<dt class="font-medium">{t.pizzerias.col_temp}</dt>
						<dd class="tabular-nums">{num(entry.inputs.roomTempC, '°C')}</dd>
						<dt class="font-medium">{t.pizzerias.col_fridge}</dt>
						<dd class="tabular-nums">{num(entry.inputs.fridgeTempC, '°C')}</dd>
						<dt class="font-medium">{t.pizzerias.col_preFerment}</dt>
						<dd>{preFermentLabel(entry)}</dd>
					</dl>
				</details>
			</li>
		{/each}
	</ul>

	<!-- Desktop: full table. -->
	<div class="hidden overflow-x-auto md:block">
		<table class="tabular w-full min-w-[840px] border-collapse text-left text-sm">
			<thead>
				<tr
					class="border-dough-300 border-b text-xs tracking-wider text-stone-500 uppercase dark:border-stone-700 dark:text-stone-400"
				>
					<th class="py-2 pr-3 font-semibold">{t.pizzerias.col_pizzeria}</th>
					<th class="py-2 pr-3 font-semibold">{t.pizzerias.col_location}</th>
					<th class="py-2 pr-3 font-semibold">{t.pizzerias.col_rankings}</th>
					<th class="py-2 pr-3 text-right font-semibold">{t.pizzerias.col_hydration}</th>
					<th class="py-2 pr-3 text-right font-semibold">{t.pizzerias.col_salt}</th>
					<th class="py-2 pr-3 font-semibold">{t.pizzerias.col_yeast}</th>
					<th class="py-2 pr-3 font-semibold">{t.pizzerias.col_preFerment}</th>
					<th class="py-2 pr-3 font-semibold">{t.pizzerias.col_open}</th>
					<th class="py-2 font-semibold">{t.pizzerias.col_source}</th>
				</tr>
			</thead>
			<tbody>
				{#each entries as entry (entry.recipeUrl)}
					<tr class="border-dough-200/70 border-b align-top last:border-0 dark:border-stone-700/70">
						<td class="py-3 pr-3 font-medium text-stone-800 dark:text-stone-100">
							{#if entry.profileUrl}
								<a
									href={entry.profileUrl}
									target="_blank"
									rel="noopener noreferrer"
									class="hover:text-tomato-600 dark:hover:text-tomato-300 underline-offset-2 hover:underline"
								>
									{entry.name}
								</a>
							{:else}
								{entry.name}
							{/if}
						</td>
						<td class="py-3 pr-3 whitespace-nowrap text-stone-500 dark:text-stone-400">
							{entry.city}, {entry.country}
						</td>
						<td class="py-3 pr-3">
							<ul class="flex flex-wrap gap-1 text-xs">
								{#each chronological(entry.rankings) as r (`${r.year}-${r.list}`)}
									<li
										class="bg-dough-100 rounded-full px-2 py-0.5 text-stone-700 tabular-nums dark:bg-stone-800 dark:text-stone-200"
										title="{listLabel(r.list)} · {r.year}"
									>
										#{r.rank}
										<span class="text-stone-500 dark:text-stone-400">{r.year}</span>
										<span class="text-stone-400 dark:text-stone-500">{listLabel(r.list)}</span>
									</li>
								{/each}
							</ul>
						</td>
						<td class="py-3 pr-3 text-right tabular-nums">{num(entry.inputs.hydration, '%')}</td>
						<td class="py-3 pr-3 text-right tabular-nums">{num(entry.inputs.saltPercent, '%')}</td>
						<td class="py-3 pr-3">{yeastLabel(entry)}</td>
						<td class="py-3 pr-3">{preFermentLabel(entry)}</td>
						<td class="py-3 pr-3">
							<a
								href={resolve('/') + entry.recipeSearch}
								rel="external"
								class="text-tomato-600 hover:text-tomato-700 dark:text-tomato-300 dark:hover:text-tomato-200 font-semibold underline-offset-2 hover:underline"
							>
								{t.pizzerias.open_link}
							</a>
						</td>
						<td class="py-3">
							<a
								href={entry.sourceUrl}
								target="_blank"
								rel="noopener noreferrer"
								class="hover:text-tomato-600 dark:hover:text-tomato-300 underline-offset-2 hover:underline"
							>
								{t.pizzerias.source_link}
							</a>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	<p class="mt-4 text-xs text-stone-500 dark:text-stone-400">
		{t.pizzerias.contribute.before_md}<a
			href="https://github.com/JanWelker/knead-time/blob/main/src/lib/pizzerias/pizzerias.md"
			target="_blank"
			rel="noopener noreferrer"
			class="hover:text-tomato-600 dark:hover:text-tomato-300 underline-offset-2 hover:underline"
			>{t.pizzerias.contribute.md}</a
		>{t.pizzerias.contribute.between}<a
			href="https://github.com/JanWelker/knead-time/pulls"
			target="_blank"
			rel="noopener noreferrer"
			class="hover:text-tomato-600 dark:hover:text-tomato-300 underline-offset-2 hover:underline"
			>{t.pizzerias.contribute.pr}</a
		>{t.pizzerias.contribute.after}
	</p>
{/if}
