# Knead Time

Time-anchored Neapolitan pizza dough calculator. User picks **when to bake**; every step schedules backwards from `readyBy`. Fully client-side, no backend.

## Stack & deploy

- SvelteKit 5 + TS + Tailwind v4 + Vitest. Node 22+. Husky pre-commit runs format/lint/test.
- Static build (`@sveltejs/adapter-static`, `fallback: '404.html'`). CI on every PR and on pushes to `main` (the latter feeds the Codecov main baseline); push to `main` deploys to GitHub Pages.
- `BASE_PATH` env drives `svelte.config.js`. **All in-app links/assets must use `$app/paths` (`base`/`resolve()`) — never hard-code `/`.**

## Domain model

Schedule: `preferment-mix → prep → mix → bulk → divide → final-proof → ready`, computed backwards from `readyBy` (with `ballProof: 'cold'` the cold leg becomes a `proof-cold` step after divide instead of `bulk-cold` before it). Cold-mode `final-proof` is a single 4 h "balls on the counter from fridge to bake" phase (`COLD_FINAL_PROOF_MIN = 240`) — the previous separate `warmup` step was folded in at v3 with no change to the equivalent-hours sum (both legs were at room temperature).

- **Cold vs room is deterministic on available time, not a toggle.** Window ≥ 16 h → cold-bulk at `fridgeTempC`; else room.
- **Pre-ferments are real fermentation phases, and biga + poolish can run together** (v4). `DoughInputs.preFerments` is a list (empty = none, canonical biga-first order, each flour share in [5, 80] %, Σ ≤ 80 %). Biga ~14 h / poolish ~12 h at 22 °C, Q10-scaled, clamped [8, 24] h (`prefermentDurationHours` in `fermentation.ts`). All pre-ferments mature **in parallel and end at `prep`**: the schedule reserves the longest and emits one `preferment-mix` step per entry (longest-first, stamped with `ScheduleStep.preFermentType` — copy, row keys and `.ics` UIDs all branch on it). For fresh-yeast recipes the pre-ferments carry **all the yeast**, split proportional to flour share — no fresh yeast on baking day.
- **Pre-ferment ⊥ sourdough.** `effectivePreFerments` in `schedule.ts` empties the list when `yeastType === 'sourdough'`; InputForm hides the toggles. URL state retains the choice so toggling is reversible.
- **Mixing method** (v4, split in v4.1): `mixingMethod: 'spiral' | 'stand' | 'hand'`, ordered by efficiency. Spiral = 15 min mix at 24 °C friction (the original "machine" calibration — old links, including v4.0 `mm=m`, resolve here and keep exact step times); stand mixer = 20 min at 18 °C (the planetary hook develops gluten less efficiently and runs cooler); hand = 25 min at 5 °C. Friction feeds `idealMixWaterTempC(roomTempC, method)`; each method appends its `mix_technique_{spiral,stand,hand}` sentence to the mix copy. The fermentation solve is otherwise untouched (mix minutes shift the ferment budget deterministically). URL `mm`: omitted = spiral, `st` = stand, `h` = hand (`m` and `sp` accepted on decode).
- **Night-window guard**: no baker-action step starts in `[22:00, 08:00)` local. Cold mode shrinks `bulk-cold` (within `[0, naturalColdMin]`) to lift the pre-cold cluster into waking hours; the cluster check covers **every** pre-ferment offset. The post-cold `divide` is anchored to `readyBy`. When a step can't be lifted, emit a `night-step` warning — **never silently rearrange**.
- **`startAt` is a hard floor** (issue #78). The schedule's first step is always at or after `startAt`; it may drift later when night-window shrinks cold-bulk or when `desired ≥ CEIL` caps it, but **never earlier**. If the natural durations don't fit, the math shrinks `bulk-cold` (allowing sub-floor) and then caps **each** pre-ferment at the wall budget (allowing sub-MIN; both can converge to the same start minute) rather than violate `startAt`. The recipe-fit score's `cold-bulk-clamped-short` / `preferment-clamped-short` factors fire for the resulting sub-band durations — pre-ferment clamp factors are computed **per entry** and may legitimately appear twice. **One documented exception** (issue #192): a window shorter than the fixed hands-on steps (prep + mix + divide, 45–55 min depending on mixing method). `readyBy` stays the anchor and the hands-on steps keep their physical durations — never compressed — so the first step lands before `startAt`. Such a window is always below `ROOM_MIN_TOTAL_MIN`, so the schedule is honest about it: `feasible = false`, the `too-short` warning fires and the fit score's `infeasible` factor applies (pinned in `schedule.test.ts`).

## Inputs

Source of truth: `DoughInputs` in `src/lib/dough/types.ts`.

- Ball weight accepts decimals (e.g. 288.5 g).
- Yeast: fresh (cube), instant dry, active dry, or sourdough starter (+ starter hydration). **The model always solves in fresh-equivalent percent**; `yeastMassFactor` in `fermentation.ts` converts to the carrier's mass at the end (fresh 1, instant ⅓, active-dry 0.4, sourdough 100 — the last is exactly `TARGET_UNITS_SOURDOUGH ÷ FRESH`). Sanity bands (`yeast-tiny`/`yeast-large` warnings, the fit score's `yeast-extreme`) are judged in fresh-equivalent terms — judging raw percent flagged every sourdough recipe as extreme (fixed in v4). Dry yeast can carry pre-ferments; sourdough still can't.
- **Pre-ferment temperature** (`preFermentTempC: number | null`, null = follows `roomTempC`): where the biga/poolish matures (cellar, wine fridge). Durations, the pre-ferment legs of the yeast solve, and `naturalPreferments` all use it. Expert-only toggle+field, shown when a pre-ferment is enabled; the preferment step copy appends a `preferment_temp_note` when set.
- **Ball proof** (`ballProof: 'room' | 'cold'`, default room = the classic pre-v4 shape): with 'cold' in cold mode the variable cold leg moves after divide — the balls ripen in the fridge (`proof-cold` step) and temper on the counter. Same leg length/temperature, so prep lands on the same minute and the yeast solve is untouched. Divide joins the pre-cold night cluster; nothing active remains after the fridge. Inert in room mode.
- `roomTempC` and `fridgeTempC` are both user inputs. Fridge default 4 °C — matches the previous hardcoded value so v=1 share-links stay stable.
- **Optional**: `oilPercent` and `sugarPercent` (both default 0). When > 0 they expand `pctSum` like salt — see the Math section. Form fields hide their effect when 0; old share-URLs decode to 0 so legacy recipes don't gain enriched-dough character.
- `mixingMethod` defaults to `spiral` — the calibration every pre-v4 (and v4.0 "machine") link implies.
- Defaults: 280 g / 70 % / 3 % salt / 0 % oil / 0 % sugar / spiral mixing. No AVPN enforcement.

### Beginner / expert view mode

- `UiMode = 'beginner' | 'expert'` (`src/lib/storedMode.ts` pure helpers + `src/lib/mode.svelte.ts` runtime singleton). **UI-level only — never enters `DoughInputs` or the math.**
- Beginner shows startAt/readyBy/pizzaCount/mixingMethod plus a switch to expert; ball weight is fixed at the 280 g default and every other input keeps its default too. **The view mode only shapes the form — it never affects the schedule.**

### Schedule verbosity (short / detailed)

- `ScheduleVerbosity = 'short' | 'descriptive'` (`src/lib/storedVerbosity.ts` pure helpers + `src/lib/verbosity.svelte.ts` runtime singleton), toggled by the pill switch in the schedule header. Descriptive shows a `steps.<kind>_detail` explanation paragraph under every step (`stepDetail` in `stepCopy.ts`) and appends it to `.ics` events via `stepDetailText(..., { includeDetail: true })`; short hides both. Print and TRMNL never carry the detail copy.
- Device-level reading preference: **not in the share URL** and independent of the view mode. Default is descriptive; explicit toggles persist to `localStorage` `kneadtime:scheduleVerbosity`.
- **Resolution order on mount**: URL `md` param (`md=b` = beginner; encode stamps it only for beginner) → any other query carrying known recipe keys = expert (`hasRecipeParams` in `urlState.ts`; stray `utm_*`/`fbclid`-only URLs don't count — they behave like a bare visit) → `localStorage` `kneadtime:mode` → **beginner** (the fresh-visit default that justified the v4 major bump). Only explicit toggles persist to localStorage — opening someone's beginner link never overwrites the local preference.

### Recipe memory

- Recipe changes mirror the encoded share query to `localStorage` `kneadtime:lastRecipe` — but **only after a user edit** (issue #201): the recipe-only encoding is snapshotted at hydration and the save effect skips while it still matches, so merely _opening_ someone else's link never overwrites the memory. A fresh visit with no recipe URL params restores it — **recipe parameters only** (the stale `startAt`/`readyBy` are dropped so the dates keep today's defaults). Any recipe link beats the memory; `hasRecipeParams` decides what counts as one.
- Named recipe book in `kneadtime:recipes` (`src/lib/storedRecipes.ts`, pure + tested): "Save recipe" in the schedule menu (overwrite by name, newest first); a collapsed "My recipes" section above Community lists them with open (full-reload link like community rows) and delete. Device-local only.

### "Round numbers" action

Nudges ball weight (0.1 g) so flour lands on a multiple of 100 g — always, for any batch with ≥ 400 g flour; smaller batches snap to 50 g so the ball weight doesn't shift noticeably. **Idempotent** (second click = no-op). **Works for fresh and sourdough** — `pctSum` branches differ.

## Outputs

- **Ingredients (grams).** No pre-ferment → flat table. With pre-ferments → one typed pre-dough section per entry (`Biga (pre-dough)`, `Poolish (pre-dough)`) / Main dough / Totals (a single subtracted table reads as a math error). With pre-ferments, main-dough yeast row is hidden — totals row surfaces the yeast. **Oil and sugar rows render only when > 0** (so defaults-only recipes stay unchanged).
- **Schedule.** Rendered as a **day-grouped vertical timeline** (`ScheduleTable.svelte`): consecutive steps fall under one date header, a rail threads the nodes (filled = baker-action step, hollow = waiting phase, dashed rail segment leaving a fermentation step), and the in-progress step gets a pulsing node + `Now` badge. **Step copy is split** (`stepCopy.ts`): `stepIngredients(step, msgs, schedule)` returns the amounts a step **newly** puts on the scale as a structured `{amount, name}[]` list (rendered as a mini-table, never prose) — each ingredient appears on exactly one step, never repeated. `preferment-mix` and `prep` carry the lists; `mix` lists only oil/sugar and only under a pre-ferment (without one they're weighed at `prep`, so `mix` lists nothing). `stepDescription` is method-only copy; `divide` keeps `{n}`/`{weight}` interpolation; `mix` keeps `{water_temp}`. Day-two `prep` omits yeast under a pre-ferment. **Separate `mix`/`prep` method templates per pre-ferment shape** (`*_with_biga`, `*_with_poolish`, `*_with_both`, `prep_desc_with_preferment`): biga = stiff/no-knead day-one + day-two fold-in; poolish = whisk-and-pour; both = tear-in + pour-over. Mix bases are method-neutral; the kneading sentence comes from `mix_technique_{spiral,stand,hand}`. `preferment-mix` titles/descs branch on `step.preFermentType` (`preferment_mix_{biga,poolish}`); each row spans its full duration; no separate `preferment-proof` step. Beginner mode adds a `steps.<kind>_detail` paragraph under every step. **Source-timing badge**: when the form matches a `pizzeriaEntries` row and a step's computed duration falls outside the source range (±15 % tolerance), `ScheduleTable` renders the original value beneath the duration.
- **`.ics` export.** One VEVENT per step. `DESCRIPTION` is `stepDetailText` — the ingredient list (one `amount name` line each) followed by the method copy, so the calendar event **matches the on-page step verbatim**; in beginner mode the explanation paragraph is appended too. UIDs include `preFermentType` — two parallel pre-ferment mixes can share a start time.
- **Print / Save as PDF.** Print button opens a dedicated `/print/[[locale]]?<recipe>` route in a new tab (SSR + prerendered, mirrors the TRMNL push pattern). The route auto-triggers `window.print()` on mount with inline styles so the main app's gradient/dark-mode rules don't bleed in. This is the only print path — the legacy `@media print` block on the main route was removed in v3.6 (Cmd-P from the screen now prints the screen layout). Output must read on **B&W** (borders + text colour, no background fills) and **fit one page** on A4/Letter for common shapes (fresh × {no-preferment, biga, poolish, biga+poolish} × {room, cold} — the 9-step biga+poolish cold schedule is the worst case). Print never carries the beginner detail copy. QR of the share URL via `src/lib/qr.ts` (wraps `qrcode-generator`).
- **TRMNL e-ink view** is **pushed** to a Private Plugin webhook from the user's browser — see the TRMNL push section.

## Math

- Baker's %: flour = 100; water/salt/yeast as % of flour. Flour = `pizzaCount × ballWeight ÷ pctSum`.
- **Optional baker's-percentage additions**: `oilPercent` and `sugarPercent` (both 0 by default). When > 0 they expand `pctSum` the same way salt does — every gram is separately weighed and comes out of the ball-weight budget. They never enter the pre-ferment (which stays a flour-water-yeast culture); oil/sugar are always weighed for the main dough at the `mix` (or `prep` when no pre-ferment) step.
- **Mass-balance invariant** (tested for every combination):
  - Fresh: `pctSum = 100 + h + s + y + oil + sugar`.
  - Sourdough: `pctSum = 100 + h + s + oil + sugar` (starter is flour + water from existing budget).
  - Pre-ferment redistributes flour/water/yeast — never changes totals.
- **Yeast solves one equivalent-hours equation** across pre-ferments + bulk (+ initial room block) + final proof. Pre-ferment legs are **flour-share-weighted** because the yeast splits proportionally across parallel pre-ferments: `yeast% = target / (Σᵢ wᵢ·hoursᵢ·f(T) + bulk/proof legs)` with `wᵢ = flourPctᵢ / Σ flourPct`. A single pre-ferment has `w = 1`, so its yeast % is independent of the flour share — exactly the pre-v4 solve, which keeps every old share-link stable (regression-pinned in `schedule.test.ts`).
- `PREFERMENT_REF_HOURS_{BIGA,POOLISH}` in `fermentation.ts` shifts every existing recipe's yeast % → **major app-version bump**.
- With pre-ferments + fresh yeast: `ingredients.yeast = 0`; the `ingredients.preFerments` entries carry the full mass split by flour share. **No hardcoded pinch** — it must come from the equivalent-hours solve.
- All calculation logic stays pure and framework-free in `src/lib/dough/`. Components only render.
- **The "Get nerdy" info section is a contract with the user.** Every calculation the app performs — everything in `src/lib/dough/` (fermentation model, water temperature, schedule budget split, mass balance, pre-ferment math, round-numbers snapping) plus the `quality.ts` star rating — must be represented there, and the copy must match the code, not the other way around. The code is authoritative: whenever a formula, constant, band or branch changes, update the info section (all five locales) **in the same PR**. Rendered in `InputForm.svelte` from `form.info_*` keys; formulas live in hardcoded `<pre>` blocks there. UI-status helpers (`scheduleStatus.ts`) and encoders (URL/ics/QR) are presentation, not math — they're exempt.
- `ComputedSchedule` also exposes `naturalColdBulkMin`, `desiredColdBulkMin`, `naturalPreferments` (one `{type, naturalHours}` per pre-ferment, matched to steps via `preFermentType`) — pre-shift / pre-clamp values for the recipe-fit metric below. Read-only signals; nothing in the math branches on them. Don't drop them without also updating `quality.ts`.

### Recipe fit score

`src/lib/dough/quality.ts` exposes `stepQualityFlags(step, schedule)` and `recipeFitScore(schedule, inputs)`. Score is **0–100** internally, deviation-based — 100 = the math's natural schedule with every input in the contemporary Neapolitan band. The UI renders it as **0–5 stars** (`fitStars`, one star per 20 points); rates are tuned generously so a single moderate deviation stays at 5 stars and only stacked problems drop below 4. Two factor families:

- **Schedule imperfection** (math couldn't deliver natural timing): `cold-bulk-shifted` (night-shift extended the cold leg), `cold-bulk-clamped-{short,long}`, `preferment-clamped-{short,long}`, `night-step` (residual warning), `infeasible`.
- **Recipe-input KPIs** (deviation from contemporary Neapolitan): `hydration-off` (60–80 %), `salt-off` (2–3.5 %), `ball-weight-off` (200–320 g), `room-temp-off` (14–30 °C), `fridge-temp-off` (2–8 °C), `yeast-extreme` (solved < 0.05 % or > 1.5 %).

Per-hour rates and per-factor deduction caps are named constants at the top of `quality.ts`. Pure-TS; same 100 % coverage rule as the rest of `src/lib/`.

## Community recipes

- Source: `src/lib/community/community.md`, rows `| Name | Date | Recipe-URL |` (date `YYYY-MM-DD`, URL = full Share output). Name is plain text; a leading `@<handle>` matching GitHub's username rules links to that profile.
- Imported via Vite `?raw`, parsed in `src/lib/community/community.ts`. **Bad rows are dropped silently** so one bad row can't break the page.
- `Community.svelte` renders cards on narrow widths (with an `Open` button up front + secondary fields under a `<details>`) and the full table at `md+`. Link uses `resolve('/')` and `rel="external"` so a full reload re-runs `onMount` → `decodeInputs`. Hidden in print.

## 50 Top Pizza recipes

- Source: `src/lib/pizzerias/pizzerias.md`, rows `| [Pizzeria](50top-url) | City, Country | Rankings | Recipe-URL | Timing | Notes | Source-URL |`. Parsed by `src/lib/pizzerias/pizzerias.ts`; same drop-silently behaviour as the community table.
- **Rankings** is a comma-separated list of `YEAR-LIST:RANK` tokens. `LIST` is `it` for 2018–2021 (50 Top Pizza was Italy-only at the time) and `w` for 2022–2025 (standalone World ranking). Mixing both in one row is intentional — Pepe in Grani's full history spans both scopes.
- **Timing** captures the proving durations the source recipe specifies (`step-kind:Nh`, `step-kind:N-Mh`, or `Nm`). Recognised kinds: `preferment-mix`, `bulk-room`, `bulk-cold`, `final-proof`. `ScheduleTable` tags any step whose computed duration falls outside the source range with the original value.
- **Notes** is free-form caveat text — flour blends, dropped ingredients ("source uses fresh yeast + 1.9 % sourdough starter; Knead Time can't combine them"), "approximation" markers, etc. Empty when the recipe maps cleanly.
- Only add a row when there's a **verifiable primary source** for the dough numbers (chef interview, cookbook, official video). The **Source** column is mandatory; the parser drops rows without one.
- Recipes are encoded with the Knead Time Share URL; `decodeInputs` reads them. When a chef's restaurant method combines mechanisms Knead Time can't represent (e.g. fresh yeast + sourdough starter together), encode the **published home recipe**, document the gap in **Notes**, and link the Source so readers can dig deeper.
- `Pizzerias.svelte` mirrors `Community.svelte` (cards below `lg`, desktop table above — the table's 840 px minimum doesn't fit iPad-portrait widths; Community's narrower table switches at `md`) with extra columns for ranking-history chips, Source link, and an italic Notes caption under the name. Mounted below the Community section on the main page. Hidden in print.

## TRMNL push

The recipe is **pushed** to a [TRMNL](https://trmnl.com/) device via a Private Plugin webhook from the user's browser. There is **no `/trmnl/<locale>` route** — the screenshot-plugin path was tried (SSR + inline CSS + an inline-JS decoder) and failed because the renderer doesn't reliably execute JS, so every capture showed build-time defaults. The push model sidesteps that: Knead Time POSTs pre-formatted `merge_variables` to `https://trmnl.com/api/custom_plugins/<uuid>` and TRMNL renders them via the user's Liquid template at refresh time. Implementation in `src/lib/trmnl/`; setup walkthrough + Liquid template in `docs/trmnl-setup.md`. Each bullet below cost at least one round-trip with the actual device.

- **CORS-open.** Endpoint returns `Access-Control-Allow-Origin: *` and accepts `Content-Type: application/json` (verified via OPTIONS preflight + probe). Browser-side `fetch` from the static deploy lands cleanly; **don't add an edge worker** — it's not needed.
- **2 KB payload cap (free tier)**, 5 KB on TRMNL+. `merge_variables` uses 1–2 char keys (`t`, `s`, `rl`, `rt`, `l.{n,x,d,sn,lf,uh,um}`, `st[].{t,dt,tm,dr,u,du,r}`) and drops always-unused fields so a worst-case cold-mode + biga + poolish recipe (9 step rows) lands under 2 KB **in every locale**. Step descriptions are NOT in the payload — they're the longest field in the v1 schema (~80 bytes × 8 steps in German) and the default Full-Markup template doesn't render them; including them silently pushed de/it/fr over the cap until v3.3. A regression test in `webhook.test.ts` measures the wire size for every locale; renaming keys back to verbose forms or adding fields without measuring fails the gate.
- **Now panel is time-aware in Liquid, not the JSON.** The current step's start time alone reads ambiguously on a multi-day schedule ("21:59" — today or yesterday?), so the Liquid template formats it as `{l.sn} {step.dt} {step.tm} · ~{n} {l.uh|l.um} {l.lf}` ("Since Fri 21:59 · ~3 h left"). `step.du` (duration seconds) is sent only so the template can compute remaining = `u + du − now_unix` at render time; we don't know which step is "current" at POST time.
- **12 POSTs/h rate limit (free tier)**. We POST only on explicit user click — well under.
- **Markup goes in the plugin's Full Markup field**, not Shared Markup, not the half/quadrant tabs. The device error "Full view not available" means exactly that — the Full slot is empty.
- **Don't use TRMNL framework class names** (`.title`, `.panel`, `.row`, `.value`, `.label`, …) in the Liquid template — they exist in the framework with their own much-larger sizing and override ours unpredictably. Every Knead Time class is `kt-*` prefixed, and class names **must not collide within our own CSS** either — the header's `.kt-ready` flex-column container once cascaded onto the row's `.kt-ready` bold modifier and made the row stack vertically. Row state modifiers are now `kt-r-past` / `kt-r-current` / `kt-r-final`.
- **Schedule rows are `<div>` flexbox, not `<table>`**. The framework has selectors that broke `<tr>`/`<td>` layout for at least one row. Flex containers can't be hit by them.
- **Container width is `100%`**, not fixed `800 px`. TRMNL wraps the markup in an inner container narrower than 800; a fixed pixel width overflows on the right.
- **Liquid date math picks the current step at render time**: `{%- assign now_unix = "now" | date: "%s" | plus: 0 -%}` and compare to `st[].u` (unix seconds). The user POSTs once per recipe change; the device's per-refresh re-render updates the "Now / Next / Done" highlight without another POST.
- **Send button lives in `TrmnlPush.svelte`**, mounted from the schedule's action menu. UUID validates against `/^[0-9a-f]{8}-…/i` before save; persists under `kneadtime:trmnlUuid` in `localStorage` (load-time migration shim reads any legacy `doughcalc:trmnlUuid` value once and clears it).

## URL state (shareable links)

- Form state → URL. **Keep encoding compact**: short keys, optional fields omitted.
- **Versioned**: `encodeInputs` always stamps `CURRENT_VERSION`. Every published version only ever **adds** keys (never renames/repurposes), so one `decode()` in `src/lib/dough/urlState.ts` handles them all — branch on the retained `v` param the first time a version breaks that contract. Missing `v` = v1. Unknown `v` falls back to the current decoder.
- **Current version is `v=4`** (adds `mm` = mixingMethod, omitted for spiral — v4.0 wrote `m` for "machine", still decoded as spiral; `md=b` view mode, stamped only for beginner; `y` gains `i`/`a` for the dry yeasts; `pt` = preFermentTempC, omitted when following the room; `bp=c` = cold ball proof, omitted for the classic shape; and extends `p` to an underscore-separated pre-ferment list, e.g. `p=b30_p20` — the old single token parses as a 1-element list, `,` is accepted in hand-written links, decode clamps each share to [5, 80] with Σ ≤ 80 and canonicalises biga-first). `v=3` added `o`/`sg`; `v=2` added `ft`; older links decode those fields as `undefined` and the form defaults fill in — every pre-v=4 share-link reproduces its original recipe, yeast % included.
- **Schema-change protocol**: bump `CURRENT_VERSION`, keep `decode()` understanding every published key shape. **Never break an old key** — old bookmarks and community rows must keep resolving.
- URL schema version is **independent** from app version.

## App version

- Version in `package.json`, inlined via Vite `define: __APP_VERSION__` (declared in `src/app.d.ts` + `eslint.config.js`). Screen footer renders `v<version>` linked to `github.com/JanWelker/knead-time/releases/tag/v<version>`; print footer appends `· v<version>`.
- `deploy.yml` tags `v<version>` on `main` after a successful Pages deploy — idempotent, so it fires only on version-bump commits. That's what makes the `/releases/tag/...` link resolve.
- **Bump on every change** (`npm version <patch|minor|major> --no-git-tag-version`):
  - **Patch**: fixes, docs, refactors, internal tweaks.
  - **Minor**: new user-facing features, backwards-compatible (new input, new locale, new UI).
  - **Major**: user contract breaks — default change that surprises returning users, or an old share-link no longer reproduces the same recipe.

## i18n

- Locales: `en, de, it, fr, nl` (Jamaican Patois was dropped in v4). Metric only — grams, °C.
- `detectLocale` matches 2-letter prefixes; locale codes are passed to `Intl` as-is.
- All user-facing strings live in `src/lib/i18n/messages.ts`. **No hardcoded copy in components.** Parity test fails loudly on missing keys — add to all five in the same change.
- **User-selected locale is persisted to `localStorage`** (`kneadtime:locale`) and preferred over `detectLocale(navigator.languages)` on mount — `src/lib/i18n/storedLocale.ts`. A full reload (e.g. a community Open link with `rel="external"`) keeps the user's chosen language. `/print/*` owns its own locale via the URL path and opts out of both auto-detect and the stored value. A load-time shim migrates any legacy `doughcalc:locale` value once and clears it.

## Design

Responsive, playful, Italian-warm (tomato / basil / dough). Must read well on a phone on the counter at narrow widths.

## Git workflow

`main` is protected. **Never commit or push directly to `main`.** Branch → commit → push → PR → CI green → merge.

## Testing

Math/schedule bugs are silent until a dough overproofs. **Coverage is a hard gate, not aspirational.**

- Tests live next to the code (`foo.ts` + `foo.test.ts`).
- **100 % lines/functions/branches/statements across `src/lib/`** — pinned in `vitest.config.ts`, enforced by `npm run test:coverage` (CI runs the same).
- **If a branch is hard to reach, delete it.** Don't write fake tests for defensive guards against caller-enforced invariants — remove the guard.
- **Mass-balance and yeast-solve invariants are regression-tested for every combination**: {fresh, instant, active-dry, sourdough} × {none, biga, poolish, biga+poolish} × {room, cold} × {spiral, stand, hand} × {room, cold} ball proof. New input or yeast carrier → new row in each matrix. Single-pre-ferment yeast % is pinned flour-share-independent (the w = 1 property that keeps old links stable); the cold-ball-proof shape is pinned solve-identical to the classic one; dry-yeast masses are pinned at their exact factors of fresh.
- Pre-commit hook runs the faster `npm run test` (no coverage); don't lean on it — **run `npm run test:coverage` before opening a PR.**
- **UI components are not in the coverage target.** `.svelte` and `.svelte.ts` are excluded; verify manually in a browser.

## Conventions

- **All `localStorage` access goes through `src/lib/safeStorage.ts`** — `safeLocalStorage()` for acquisition, `safeGet`/`safeSet`/`safeRemove` inside the stored\* helpers. Chrome's "Block all cookies" makes even the `localStorage` _getter_ throw (`typeof` doesn't protect), so never touch the global directly; persistence degrades to a no-op instead of killing the mount. The `app.html` theme boot script guards its own reads. Theme persists under `kneadtime:theme` — the legacy bare `theme` slot (shared `*.github.io` origin) migrates one-shot like the `doughcalc:` keys.
- Comments explain **why** when non-obvious (e.g. citing a fermentation magic number). Otherwise none.
- Minimal dependencies. Prefer hand-rolled utilities (`.ics` generator is hand-written) over large libs.
- **Keep `README.md` in sync** with npm scripts, CI/deploy, structure — anything a contributor hits in their first hour.
- **Parallelize independent work.** When a task decomposes into independent subtasks (e.g. update all five locales, edit unrelated files, run separate investigations), spawn agents in parallel — single message, multiple `Agent` tool calls — instead of doing them serially.

## Out of scope

User accounts / server-side persistence. Imperial units.
