# doughcalc

Time-anchored Neapolitan pizza dough calculator. User picks **when to bake**; every step schedules backwards from `readyBy`. Fully client-side, no backend.

## Stack & deploy

- SvelteKit 5 + TS + Tailwind v4 + Vitest. Node 22+. Husky pre-commit runs format/lint/test.
- Static build (`@sveltejs/adapter-static`, `fallback: '404.html'`). CI on every push/PR; push to `main` deploys to GitHub Pages.
- `BASE_PATH` env drives `svelte.config.js`. **All in-app links/assets must use `$app/paths` (`base`/`resolve()`) — never hard-code `/`.**

## Domain model

Schedule: `preferment-mix → prep → mix → bulk → divide → warmup → final-proof → ready`, computed backwards from `readyBy`.

- **Cold vs room is deterministic on available time, not a toggle.** Window ≥ 16 h → cold-bulk at `fridgeTempC`; else room.
- **Pre-ferment is a real fermentation phase.** Biga ~14 h / poolish ~12 h at 22 °C, Q10-scaled, clamped [8, 24] h (`prefermentDurationHours` in `fermentation.ts`). Duration is both reserved on the schedule and added to the equivalent-hours yeast solve. For fresh-yeast recipes the pre-ferment carries **all the yeast** — no fresh yeast on baking day.
- **Pre-ferment ⊥ sourdough.** `effectivePreFerment` in `schedule.ts` nulls biga/poolish when `yeastType === 'sourdough'`; InputForm hides the dropdown. URL state retains the choice so toggling is reversible.
- **Night-window guard**: no baker-action step starts in `[22:00, 08:00)` local. Cold mode stretches `bulk-cold` within floor/ceiling to lift the pre-cold cluster into waking hours; post-cold steps are anchored to `readyBy`. When a step can't be lifted, emit a `night-step` warning — **never silently rearrange**. Guard may pull the first step before `startAt` — **`startAt` is a soft hint**.

## Inputs

Source of truth: `DoughInputs` in `src/lib/dough/types.ts`.

- Ball weight accepts decimals (e.g. 288.5 g).
- Yeast: fresh (cube) or sourdough starter (+ starter hydration).
- `roomTempC` and `fridgeTempC` are both user inputs. Fridge default 4 °C — matches the previous hardcoded value so v=1 share-links stay stable.
- Defaults: 280 g / 70 % / 3 % salt. No AVPN enforcement.

### "Round numbers" action

Nudges ball weight (0.1 g) so flour lands on a multiple of 100 g (or 50 g if 100 drifts too far). **Idempotent** (second click = no-op). **Works for fresh and sourdough** — `pctSum` branches differ.

## Outputs

- **Ingredients (grams).** No pre-ferment → flat table. With pre-ferment → Pre-dough / Main dough / Totals (a single subtracted table reads as a math error). With pre-ferment, main-dough yeast row is hidden — totals row surfaces the yeast.
- **Schedule.** Step descriptions interpolate context (flour/water/salt/yeast on `prep`/`mix`; per-ball weight on `divide`; pre-ferment weights on `preferment-mix`). Day-two `prep`/`mix` omit yeast under a pre-ferment. **Separate `mix`/`prep` templates per pre-ferment type** (`*_with_biga`, `*_with_poolish`, `prep_desc_with_preferment`): biga = stiff/no-knead day-one + day-two fold-in; poolish = whisk-and-pour. `preferment-mix` row spans the full duration; no separate `preferment-proof` step.
- **`.ics` export.** One VEVENT per step. **`DESCRIPTION` must match the on-page description verbatim**, interpolations included.
- **Print / Save as PDF.** `window.print()` only — no PDF lib. Driven by `@media print` in `src/app.css` + Tailwind `print:` variants. Must read **B&W** (borders + text colour, no background fills) and **fit one page** on A4/Letter for common shapes (fresh × {no-preferment, biga, poolish} × {room, cold}). Print-only Ingredients is a second mount inside the print header so the screen card can be `print:hidden`-ed cleanly. QR of the share URL is appended via `src/lib/qr.ts` (wraps `qrcode-generator`).
- **TRMNL e-ink view** at `/trmnl/<locale>?<recipe>` — see TRMNL section; constraints are empirical, not aesthetic.

## Math

- Baker's %: flour = 100; water/salt/yeast as % of flour. Flour = `pizzaCount × ballWeight ÷ pctSum`.
- **Mass-balance invariant** (tested for every combination):
  - Fresh: `pctSum = 100 + h + s + y`.
  - Sourdough: `pctSum = 100 + h + s` (starter is flour + water from existing budget).
  - Pre-ferment redistributes flour/water/yeast — never changes totals.
- **Yeast solves one equivalent-hours equation** across pre-ferment + bulk (+ initial room block) + warmup + final proof: `yeast% = target / Σ(hours_i · f(T_i))`.
- `PREFERMENT_REF_HOURS_{BIGA,POOLISH}` in `fermentation.ts` shifts every existing recipe's yeast % → **major app-version bump**.
- With pre-ferment + fresh yeast: `ingredients.yeast = 0`, `ingredients.preFerment.yeast` carries the full mass. **No hardcoded pinch** — it must come from the equivalent-hours solve.
- All calculation logic stays pure and framework-free in `src/lib/dough/`. Components only render.

## TRMNL e-ink view

`/trmnl/[[locale]]/+page.svelte` renders for [TRMNL](https://trmnl.com/) Screenshot plugins — 800 × 480 px black-on-white captured server-side. **Each constraint below cost a round-trip; treat them as load-bearing.**

- **TRMNL's renderer does not reliably execute JS or fetch external assets.** Treat the rendered HTML as one self-contained file: SSR'd DOM, inline CSS, no hydration assumed. The user's specific recipe (from `?…`) only renders in real browsers; TRMNL captures the build-time defaults — known limitation, fixable later via an inline-JS bundle.
- **SSR on for this route only**: `+page.ts` exports `ssr = true`, overriding the layout's `ssr = false`. Without it the prerender is an empty SPA shell.
- **Locale lives in the URL path.** `+page.ts` `entries()` prerenders all six locales + a `/trmnl` no-locale fallback (English). Root layout's `onMount` **skips locale auto-detect when `page.route.id` starts with `/trmnl`** so the URL-derived locale isn't clobbered on hydration. Copy-TRMNL-link button emits `/trmnl/<currentLocale>?<recipe>` — both segments must respect `base`.
- **All styles in `<svelte:head><style>`**, not the component `<style>` (which becomes an external sheet TRMNL won't fetch). Class selectors are `.trmnl`-prefixed to namespace against the unloaded Tailwind layout sheet.
- **Borders: 2 px solid black, or none.** TRMNL upscales the capture ~1.7×; 1 px light-gray borders resample as broken/dotted fragments. Row separation comes from padding + current-row inversion + bold ready-row.
- **One typeface.** The device renders one face; don't reintroduce per-element serif overrides — everything inherits the container's Inter / system-sans stack.
- **Namespace row-only classes with `row-`** (e.g. `rowReady`). A shared `class="ready"` between the header column and `step.kind === 'ready'` row stacked the row's `<td>`s vertically.
- **Header `readyTime`/`readyLabel` are `white-space: nowrap`** and the `.ready` flex child is `flex-shrink: 0` — otherwise a long left-side summary forces the date onto two lines.

## Community recipes

- Source: `src/lib/community/community.md`, rows `| Name | Date | Recipe-URL |` (date `YYYY-MM-DD`, URL = full Share output). Name is plain text; a leading `@<handle>` matching GitHub's username rules links to that profile.
- Imported via Vite `?raw`, parsed in `src/lib/community/community.ts`. **Bad rows are dropped silently** so one bad row can't break the page.
- `Community.svelte` link uses `resolve('/')` and `rel="external"` so a full reload re-runs `onMount` → `decodeInputs`. Hidden in print.

## URL state (shareable links)

- Form state → URL. **Keep encoding compact**: short keys, optional fields omitted.
- **Versioned**: `encodeInputs` always stamps `CURRENT_VERSION`; `decodeInputs` dispatches via `DECODERS: Record<number, Decoder>` in `src/lib/dough/urlState.ts`. Missing `v` = v1. Unknown `v` falls back to current decoder.
- **Schema-change protocol**: bump `CURRENT_VERSION`, add `decodeVN`, register in `DECODERS`. **Never delete an old decoder** — old bookmarks and community rows must keep resolving.
- URL schema version is **independent** from app version.

## App version

- Version in `package.json`, inlined via Vite `define: __APP_VERSION__` (declared in `src/app.d.ts` + `eslint.config.js`). Screen footer renders `v<version>` linked to `github.com/JanWelker/knead-time/releases/tag/v<version>`; print footer appends `· v<version>`.
- `deploy.yml` tags `v<version>` on `main` after a successful Pages deploy — idempotent, so it fires only on version-bump commits. That's what makes the `/releases/tag/...` link resolve.
- **Bump on every change** (`npm version <patch|minor|major> --no-git-tag-version`):
  - **Patch**: fixes, docs, refactors, internal tweaks.
  - **Minor**: new user-facing features, backwards-compatible (new input, new locale, new UI).
  - **Major**: user contract breaks — default change that surprises returning users, or an old share-link no longer reproduces the same recipe.

## i18n

- Locales: `en, de, it, fr, nl, jam` (Jamaican Patois, ISO 639-3). Metric only — grams, °C.
- `detectLocale` matches 2- and 3-letter prefixes. `intlLocaleTag('jam') === 'en-JM'` (no CLDR data for `jam`).
- All user-facing strings live in `src/lib/i18n/messages.ts`. **No hardcoded copy in components.** Parity test fails loudly on missing keys — add to all six in the same change.

## Design

Responsive, playful, Italian-warm (tomato / basil / dough). Must read well on a phone on the counter at narrow widths.

## Git workflow

`main` is protected. **Never commit or push directly to `main`.** Branch → commit → push → PR → CI green → merge.

## Testing

Math/schedule bugs are silent until a dough overproofs. **Coverage is a hard gate, not aspirational.**

- Tests live next to the code (`foo.ts` + `foo.test.ts`).
- **100 % lines/functions/branches/statements across `src/lib/`** — pinned in `vitest.config.ts`, enforced by `npm run test:coverage` (CI runs the same).
- **If a branch is hard to reach, delete it.** Don't write fake tests for defensive guards against caller-enforced invariants — remove the guard.
- **Mass-balance and yeast-solve invariants are regression-tested for every combination**: fresh/sourdough × {none, biga, poolish} × {room, cold}. New input or yeast carrier → new row in each matrix.
- Pre-commit hook runs the faster `npm run test` (no coverage); don't lean on it — **run `npm run test:coverage` before opening a PR.**
- **UI components are not in the coverage target.** `.svelte` and `.svelte.ts` are excluded; verify manually in a browser.

## Conventions

- Comments explain **why** when non-obvious (e.g. citing a fermentation magic number). Otherwise none.
- Minimal dependencies. Prefer hand-rolled utilities (`.ics` generator is hand-written) over large libs.
- **Keep `README.md` in sync** with npm scripts, CI/deploy, structure — anything a contributor hits in their first hour.
- **Parallelize independent work.** When a task decomposes into independent subtasks (e.g. update all six locales, edit unrelated files, run separate investigations), spawn agents in parallel — single message, multiple `Agent` tool calls — instead of doing them serially.

## Out of scope

User accounts / server-side persistence. Imperial units.
