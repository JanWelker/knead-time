# doughcalc

Time-anchored Neapolitan pizza dough calculator. User picks **when to bake**; every step schedules backwards from that moment. Fully client-side, no backend.

## Stack & deploy

- SvelteKit **5** + TypeScript + Tailwind v4 + Vitest. Husky pre-commit runs format/lint/test. Node 22+.
- Static build (`@sveltejs/adapter-static`, `fallback: '404.html'`, `static/.nojekyll`). CI lints/type-checks/tests/builds every push & PR (`.github/workflows/ci.yml`); push to `main` deploys to GitHub Pages (`deploy.yml`).
- `svelte.config.js` reads `BASE_PATH` from env (deploy workflow sets `/<repo>` for project pages, empty otherwise). **All in-app links/assets must respect it** — use `$app/paths` (`base` or `resolve()`), never hard-code `/`.

## Domain model

User picks `readyBy` + `startAt`; the scheduler computes `preferment-mix → prep → mix → bulk → divide → warmup → final-proof → ready` working backwards from `readyBy`.

- **Cold ↔ room ferment switch is deterministic on available time, not a UI toggle.** Window ≥ 16 h → cold-bulk leg at 4 °C; otherwise room ferment.
- **Pre-ferment is a real fermentation phase, not a decorative block.** When biga/poolish is selected, a wall-clock duration is computed from the type and `roomTempC` (`prefermentDurationHours` in `fermentation.ts`) — biga ~14 h, poolish ~12 h at 22 °C, scaled by Q10 and clamped to [8, 24] h. That duration is both (a) reserved before mix-day prep on the schedule and (b) added to the equivalent-hours sum that solves for yeast %. The pre-ferment carries **all of the recipe's yeast** for fresh-yeast recipes (no fresh yeast on baking day) — matches how biga/poolish technique actually works. `preferment-mix` defaults to landing at/after `startAt` (regression-tested), but the night-window guard below can pull it earlier.
- **Pre-ferment is mutually exclusive with sourdough.** The starter is itself the pre-ferment culture, so `effectivePreFerment` in `schedule.ts` nulls the biga/poolish spec under `yeastType === 'sourdough'`. The InputForm hides the dropdown for sourdough. URL state retains the user's pre-ferment choice (so toggling sourdough on/off is reversible), but it never reaches the math while sourdough is selected.
- **Night-window guard**: no baker-action step starts in `[22:00, 08:00)` local time. Cold mode stretches `bulk-cold` within its floor/ceiling so the pre-cold cluster lands during waking hours; post-cold steps (divide, warmup) are anchored to `readyBy` and can't shift. Room mode has no slack. When a step can't be lifted out, emit a `night-step` warning — **never silently rearrange**. The guard can pull the first step earlier than `startAt`, so **`startAt` is a soft hint, not a strict floor**.

### Inputs

Source of truth: `DoughInputs` in `src/lib/dough/types.ts`. Notable rules:

- Ball weight accepts decimals (e.g. 288.5 g) — the form input must allow that.
- Yeast is **fresh (cube)** or **sourdough starter** (with starter-hydration when applicable).
- Defaults reflect contemporary high-hydration Neapolitan (280 g / 70% / 3% salt). No AVPN enforcement.

### "Round numbers" action

Sits next to ball weight. Nudges ball weight (0.1 g precision) so flour lands on a multiple of 100 g (or 50 g when 100 would drift too far). **Must be idempotent** (second click is a no-op). **Must work for both fresh and sourdough** — `pctSum` branches differ (see math).

### Outputs

- **Ingredients in grams.** No pre-ferment → flat table. With pre-ferment → three sections (**Pre-dough / Main dough / Totals**), because a single subtracted table reads as a math error (the totals row never matches the visible sum). With a pre-ferment the main-dough yeast row is hidden (all yeast lives in the pre-dough), so the totals row is what surfaces the yeast quantity.
- **Schedule table with absolute timestamps.** Step copy interpolates schedule context so each description is self-contained: pizza count + per-ball weight on `divide`; flour/water/salt/yeast weights on `prep` and `mix` (with localized yeast label); pre-ferment flour/water/yeast on `preferment-mix`. **`mix` and `prep` have separate templates per pre-ferment type** (`mix_desc_with_biga`, `mix_desc_with_poolish`, `prep_desc_with_preferment`) — biga gets stiff/no-knead day-one copy and the day-two mix folds it in; poolish gets a smoother whisk-and-pour treatment. With a pre-ferment, day-two `prep` and `mix` deliberately omit the yeast field — the pre-dough is the carrier. The collapsed `preferment-mix` row spans the full wall-clock duration (active mix + maturation); there is no separate `preferment-proof` step.
- **`.ics` export.** One VEVENT per step. **VEVENT `DESCRIPTION` must match the on-page step description verbatim**, interpolations included.
- **Print / Save as PDF.** `window.print()` only — no PDF lib. Driven by `@media print` in `src/app.css` + Tailwind `print:` variants. Hides input form/chrome, prepends a recipe-summary header, appends a footer with the share URL so a printed copy is reproducible. **Must read on B&W** — borders and text colour, not background fills (browsers strip those).

### Math

- Baker's percentages: flour = 100%; water/salt/yeast as % of flour. Total dough = `pizzaCount × ballWeight`; flour = total ÷ pctSum.
- **Mass-balance invariant** (tested for every combination — don't regress): the sum of every separately-weighed ingredient equals `pizzaCount × ballWeight`.
  - Fresh yeast adds new mass: `pctSum = 100 + h + s + y`.
  - Sourdough starter is flour + water from the existing budget: `pctSum = 100 + h + s`.
  - A pre-ferment redistributes flour/water/yeast between pre-dough and main dough; it does not change totals.
- **Yeast solves a single equivalent-hours equation across every fermentation phase.** `yeast% = target / Σ(hours_i · f(T_i))`, where the phases are the pre-ferment (when set), bulk (room or cold + initial room block), warmup, and final proof. Pre-ferment ref-load is `PREFERMENT_REF_HOURS_{BIGA,POOLISH}` in `fermentation.ts` — touching either constant changes every existing recipe's yeast %, so it's a **major** app-version bump.
- With a pre-ferment selected for a fresh-yeast recipe, `ingredients.yeast` (main dough) is **0** and `ingredients.preFerment.yeast` carries the full mass. Don't reintroduce a hardcoded pinch — the pre-ferment yeast must come from the equivalent-hours solve, not a magic number.
- **Keep all calculation logic pure and framework-free in `src/lib/dough/`.** Svelte components only render results.

## Community recipes

- Page renders a community-recipes table at the bottom. Source: `src/lib/community/community.md`, rows are `| Name | Date | Recipe-URL |` (date `YYYY-MM-DD`, URL is the full **Share**-button output). **Name** is plain text by default; if the cell starts with `@` and the rest matches GitHub's username rules, it's rendered as a link to `https://github.com/<handle>` — opt-in via the leading `@`. Contributors add entries via PR — no backend, no submission flow.
- Imported at build time via Vite `?raw`, parsed in `src/lib/community/community.ts`. Rows that fail date/URL checks are **dropped silently** so one bad row can't break the page.
- `Community.svelte` renders one column per decoded input + an **Open** link. The link uses `resolve('/')` for base-path correctness and `rel="external"` so a full reload re-runs `onMount` → `decodeInputs` and hydrates the form. Hidden in print.

## URL state (shareable links)

- Form state serializes into the URL. **Keep the encoding compact** — short keys, optional fields omitted.
- **Versioned schema.** Encoded URL carries `v`; `encodeInputs` always stamps the current version; `decodeInputs` dispatches on `v` via `DECODERS: Record<number, Decoder>` in `src/lib/dough/urlState.ts`. Missing `v` → treated as v1 (legacy links and pre-versioning community.md rows keep working). Unknown `v` → falls back to the current decoder, best-effort.
- **Schema change protocol**: bump `CURRENT_VERSION`, write `decodeVN`, register it in `DECODERS`. **Never delete an old decoder** — bookmarks and community.md rows shared before the bump must keep resolving.

## App version

- Version lives in `package.json` and is inlined at build time via Vite `define: { __APP_VERSION__: ... }` in `vite.config.ts` (declared in `src/app.d.ts` and `eslint.config.js`). The screen footer renders `v<version>` next to the license, linked to `github.com/JanWelker/knead-time/releases/tag/v<version>`; the print footer appends `· v<version>` so a printed sheet records its build.
- **Bump on every change, semver-style** (use `npm version <patch|minor|major> --no-git-tag-version`). Patch: fixes, docs, refactors, internal tweaks. Minor: new user-facing features (new inputs, new UI, new locale, etc.) that stay backwards-compatible. Major: user contract breaks — e.g. defaults change in a way that surprises returning users, or a share-link URL shared before the bump no longer reproduces the same recipe.
- The URL schema version (`v=` in shared links) is **independent** from the app version. Bumping `CURRENT_VERSION` in `urlState.ts` does not require a major app bump as long as old decoders stay in `DECODERS`.

## i18n

- Locales: `en, de, it, fr, nl, jam` (Jamaican Patois, ISO 639-3). Metric only — grams, °C.
- `detectLocale` matches 2- and 3-letter prefixes. `intlLocaleTag('jam') === 'en-JM'` (CLDR has no `jam` data).
- All user-facing strings live in `src/lib/i18n/messages.ts`. **No hardcoded copy in components.** The parity test fails loudly when any locale is missing a key — add to all six in the same change.

## Design

Responsive, playful, Italian-warm (tomato / basil / dough palette) — not cartoonish. Must read well on a phone on the counter, at narrow widths.

## Git workflow

`main` is protected. **Never commit or push directly to `main`.** Every change: branch → commit → push → PR → CI green → merge.

## Conventions

- Tests live next to the code they cover (`foo.ts` + `foo.test.ts`). Cover the dough math thoroughly; UI tests are not planned.
- Comments explain **why**, not what — only when non-obvious (e.g. citing a fermentation-table magic number).
- Keep dependencies minimal. Prefer hand-rolling small utilities (the `.ics` generator is hand-written) over pulling in large libs.
- **Keep `README.md` in sync** when changing npm scripts, CI/deploy workflows, project structure, or anything a contributor would hit in their first hour.

## Out of scope

User accounts / server-side persistence. Imperial units.
