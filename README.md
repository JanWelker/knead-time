# Knead Time

[![CI](https://github.com/JanWelker/knead-time/actions/workflows/ci.yml/badge.svg)](https://github.com/JanWelker/knead-time/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/JanWelker/knead-time/branch/main/graph/badge.svg)](https://codecov.io/gh/JanWelker/knead-time)

A time-anchored Neapolitan pizza dough calculator — [try it live](https://janwelker.github.io/knead-time/). You enter **when you want to bake**; the app schedules every step backwards from that moment, auto-switches between cold and room fermentation based on available time, and gives you an on-screen schedule, an `.ics` you can drop into a calendar, a print-to-PDF recipe sheet for the kitchen counter, and a [TRMNL](https://trmnl.com/) e-ink view for the counter clock.

New in v4: a **beginner view** (just "how many, when, and how you knead" — every step explained via the schedule's short/detailed switch; experts get the full form), **spiral, stand-mixer or hand kneading** — each adapts the mix step and the water temperature to how efficiently it works the dough, **combined pre-ferments** (biga and poolish maturing in parallel, each with its own flour share and an optional cellar temperature), **dry yeast** (instant and active dry alongside fresh and sourdough), a **cold ball proof** option (divide first, balls ripen in the fridge), and **recipe memory** — the app restores your last recipe on a fresh visit and keeps a device-local recipe book.

Built with SvelteKit 5 + TypeScript + Tailwind v4. Fully client-side, five languages (EN / DE / IT / FR / NL), shareable recipes via URL.

---

## Requirements

- **Node.js 22+** and **npm** on the host (enforced via `engines`; CI and deploys run Node 24).

That's it. CI and deployment run on GitHub Actions; locally you just need Node.

---

## Quickstart — run the app

```sh
npm install
npm run dev        # Vite dev server on http://localhost:5173
```

To stop it, hit `Ctrl-C`.

### Production-style preview

```sh
npm run build      # static site → ./build/
npm run preview    # serve ./build/ locally
```

---

## Dev guide

### Layout

```
src/
├── lib/
│   ├── dough/            ← pure math, framework-free, heavily tested
│   │   ├── bakers.ts          baker's percentages, mass balance
│   │   ├── fermentation.ts    Q10 yeast ↔ time ↔ temperature model
│   │   ├── schedule.ts        backwards schedule, cold↔room auto-switch
│   │   ├── ics.ts             RFC 5545 calendar export
│   │   ├── urlState.ts        compact share-link encoding
│   │   ├── types.ts           shared types
│   │   └── *.test.ts          colocated tests
│   ├── components/       ← Svelte 5 UI (uses runes)
│   ├── i18n/             ← messages (en/de/it/fr/nl), locale detection, runtime interpolation
│   ├── community/        ← community.md (data) + parser, rendered as a table at the bottom of the page
│   ├── pizzerias/        ← pizzerias.md (50 Top Pizza recipes) + parser, rendered below the community table
│   ├── trmnl/            ← TRMNL Private-Plugin webhook payload + client
│   ├── state.svelte.ts   ← form state as a $state class
│   ├── mode.svelte.ts / storedMode.ts           ← beginner/expert view mode (+ localStorage)
│   ├── verbosity.svelte.ts / storedVerbosity.ts ← schedule short/detailed switch (+ localStorage)
│   ├── storedRecipes.ts  ← last-recipe restore + named recipe book (localStorage)
│   ├── format.ts         ← grams, percentages, durations, datetime input glue
│   └── stepCopy.ts       ← maps ScheduleStepKind → i18n key + interpolates schedule context
├── routes/
│   ├── +layout.svelte    ← global styles, language bootstrap
│   ├── +layout.ts        ← prerender + ssr=false (fully client-side)
│   ├── +page.svelte      ← the entire calculator UI
│   └── print/[[locale]]/ ← self-contained print/PDF sheet (auto-triggers the dialog)
├── app.css               ← Tailwind v4 entrypoint + @theme palette
└── app.html              ← shell

.github/workflows/
├── ci.yml                ← lint + check + coverage gate + build on PRs and pushes to main
├── deploy.yml            ← build + publish to GitHub Pages on main
└── preview.yml           ← build + publish a per-PR preview, comment the URL, clean up on close

vite.config.ts            ← Vite (no test config; runtime build only)
vitest.config.ts          ← Vitest (kept separate so vite types stay clean)
```

### npm scripts

| Command                 | What it does                                               |
| ----------------------- | ---------------------------------------------------------- |
| `npm run dev`           | Vite dev server on port 5173 with HMR                      |
| `npm test`              | Run vitest once (`npm run test:watch` for watch mode)      |
| `npm run test:coverage` | Run vitest with v8 coverage → `./coverage/`                |
| `npm run check`         | `svelte-kit sync` + `svelte-check` (type & template check) |
| `npm run lint`          | Prettier check + ESLint                                    |
| `npm run format`        | Prettier write                                             |
| `npm run build`         | Production build → `./build/` (static site)                |
| `npm run preview`       | Serve the built site locally                               |

### Pre-commit hooks

Husky + lint-staged are configured (`.husky/pre-commit`). The hook runs lint-staged and then `npm test` on every commit.

### Adding a feature — typical loop

1. **Math/logic first.** Add or extend a module in `src/lib/dough/`. Keep it pure (no Svelte imports). Add a `*.test.ts` next to it. Run `npm test` until green.
2. **Wire to state.** If new inputs are needed, extend `FormState` in `src/lib/state.svelte.ts`, then `SerializableInputs` in `src/lib/dough/urlState.ts` (encode + decode + round-trip test).
3. **UI.** Add fields to `src/lib/components/InputForm.svelte`; render results in the existing components or add a new one. Use Svelte 5 runes (`$state`, `$derived`, `$effect`).
4. **i18n.** Every new user-facing string goes into `src/lib/i18n/messages.ts` for all five locales. The parity test will fail loudly if a key is missing.
5. **Verify.** `npm run test:coverage && npm run check && npm run build`. The CI workflow runs `npm run lint`, `npm run check`, `npm run test:coverage` (the 100 % coverage gate — plain `npm test` skips it), and `npm run build`.

### Print / PDF export

The **Print / Save as PDF** action opens a dedicated `/print/[[locale]]?<recipe>` route in a new tab (`src/routes/print/[[locale]]/+page.svelte`). The route is fully self-contained — inline styles in `<svelte:head>`, no Tailwind print variants, no shared chrome — and auto-triggers `window.print()` on mount. It renders a two-column header (Recipe inputs on the left, Ingredients on the right) above the full-width schedule, then a footer with a QR code of the share URL so scanning the printed sheet rehydrates the recipe in the app.

If you touch the printed layout, check it in your browser's print preview — don't rely on `svelte-check`. Keep it readable on a B&W printer (borders and text colour, not background fills), and keep the common shapes on one page. QR generation lives in `src/lib/qr.ts` (thin wrapper around `qrcode-generator`).

### TRMNL e-ink view

The recipe is **pushed** to a [TRMNL](https://trmnl.com/) device via a **Private Plugin webhook**, straight from the user's browser: the **Send to TRMNL** action in the schedule menu POSTs pre-formatted `merge_variables` to `https://trmnl.com/api/custom_plugins/<uuid>`, and the device renders them through a Liquid template at its own refresh cadence. The template picks the current step at render time with Liquid date math, so one POST per recipe change keeps the Now/Next/Done highlight moving all day.

Implementation lives in `src/lib/trmnl/` (payload builder + webhook client); the setup walkthrough and the Liquid template are in `docs/trmnl-setup.md`. The payload uses 1–2 character keys to stay under the free tier's 2 KB cap in every locale — a regression test measures the wire size, so adding fields without measuring fails CI. There is **no `/trmnl` route** any more: the earlier screenshot-plugin approach failed because TRMNL's renderer doesn't reliably execute JS, so every capture showed build-time defaults.

### The dough math, briefly

- **Baker's percentages**: flour = 100%; water, salt, yeast (and the optional oil + sugar) are % of flour. Total dough = `pizzaCount × ballWeight`. Flour is derived from total and the sum of percentages.
- **Mass balance is subtly different for sourdough**: fresh yeast adds new mass (`pctSum = 100 + h + s + y + oil + sugar`), while sourdough starter is just flour+water from the existing budget (`pctSum = 100 + h + s + oil + sugar`). Both produce ingredients that sum exactly to `pizzaCount × ballWeight` — there's a test that enforces this. Oil and sugar default to 0 and stay out of any pre-ferment (they'd inhibit the culture); when > 0 they get weighed at the main `mix` step. When a pre-ferment is active the ingredient table renders as three sections (**Pre-dough / Main dough / Totals**) rather than one flat table — a single subtracted table reads as a math error because the totals row never matches the visible sum.
- **Fermentation model**: ferment "units" = `yeast% × hours × temperatureFactor(T)`. Temperature factor follows Q10 = 2 (rate doubles every 10 °C). Reference: 0.2% fresh yeast at 22 °C ferments for ~8 h. Every fermentation phase contributes to the same equivalent-hours sum that solves for the yeast %, including the pre-ferment — see below. Both `roomTempC` (used during room ferment, warmup, final proof, and pre-ferment) and `fridgeTempC` (used during the cold-bulk leg) are user inputs.
- **Cold/room switch**: deterministic on available time. ≥ 16 h available → cold ferment with a fixed-shape schedule (prep → mix → 1 h room bulk → long fridge bulk → divide → 3 h warmup → 1 h final proof → bake). Below that → room ferment with bulk + final proof split 2:1 inside the available window. Yeast % is then chosen so the actual ferment-unit total matches the target.
- **Pre-ferments as real fermentation phases**: biga and poolish can be enabled independently — together, if you like — each with its own flour share (5–80 % each, 80 % combined). Wall-clock durations are solved per type from `roomTempC` (`prefermentDurationHours` — biga ~14 h, poolish ~12 h at 22 °C, Q10-scaled and clamped to [8, 24] h). All pre-ferments mature **in parallel and end at prep**: the schedule reserves the longest and emits one `preferment-mix` step per pre-ferment. Their legs enter the yeast solve weighted by flour share (`w = share / Σ shares` — a single pre-ferment has `w = 1`, so old share links keep their exact yeast %). The pre-ferments carry **all of the recipe's yeast** for fresh-yeast recipes, split proportional to flour share — no extra yeast on baking day. Pre-ferments are mutually exclusive with sourdough (the starter is itself the pre-ferment culture); selecting sourdough empties the list in `effectivePreFerments`.
- **Schedule window**: the user picks both a **start datetime** (defaults to page-load time, editable, persisted in the URL) and a **ready-by datetime**. Everything is sized to fit inside that window. When a pre-ferment is selected, the temperature-dependent pre-ferment duration is reserved before mix-day prep. `startAt` is a **hard floor** (issue #78): the first step always lands at or after it — durations shrink to fit rather than start earlier. The one documented exception is a degenerate window shorter than the fixed hands-on steps (prep + mix + divide): those keep their physical durations anchored to `readyBy`, so the first step lands before `startAt` and the schedule is flagged infeasible with a `too-short` warning.
- **Night-window guard**: no baker-action step may start in `[22:00, 08:00)` local time. In cold mode the scheduler shrinks the bulk-cold duration (within `[0, natural]` — it never extends it, which would pull the first step before `startAt`) so the pre-cold cluster (`preferment-mix` → bulk-cold start) lands during waking hours. The post-cold `divide` is anchored to `readyBy` and can't be shifted; room mode has no slack. When a step can't be lifted out of the window the scheduler emits a `night-step` warning (surfaced via `Warnings.svelte`) instead of silently rearranging.
- **Round numbers action**: the button next to the ball-weight input nudges the ball weight (to 0.1 g precision; the field accepts decimals like `288.5`) so the derived flour and water come out as tidy multiples of 100 g — or 50 g when 100 g would drift too far. It's **idempotent** (clicking twice is a no-op) and works for both fresh yeast and sourdough, branching on the `pctSum` difference above.
- **Step copy & `.ics` parity**: `stepCopy.ts` interpolates schedule context into each step description — divide & ball shows pizza count and per-ball weight, mix steps show the main-dough flour/water/salt/yeast weights (with the yeast label localized to fresh yeast vs. sourdough starter). With a pre-ferment, `prep` and `mix` use type-specific templates (`mix_desc_with_biga`, `mix_desc_with_poolish`, `prep_desc_with_preferment`) that deliberately omit the yeast field on day two — the pre-dough is the carrier. When oil or sugar are non-zero, an `extras_oil`/`extras_sugar`/`extras_oil_sugar` trailer (e.g. "Plus 12 g oil and 5 g sugar.") is appended to `prep` (no PF) and to every `mix` variant — `preferment-mix` stays clean. The single `preferment-mix` row covers both the brief active mixing and the full wall-clock maturation. The `.ics` VEVENT `DESCRIPTION` must match the on-page step description verbatim; `preferment-mix` is marked `TRANSP:TRANSPARENT` so the calendar doesn't block out the maturation window.

### Deployment

Deployment is fully automated by **`.github/workflows/deploy.yml`**. Every push to `main`:

1. Runs `npm ci` and builds the static site with `npm run build`.
2. Pushes the contents of `./build/` to the `gh-pages` branch (root), preserving any `pr-preview/` subdirectories so open PR previews keep working.
3. GitHub Pages serves the `gh-pages` branch.
4. Tags the commit `v<version>` (from `package.json`) and pushes the tag. The step is idempotent — pushes that don't bump the version skip the tag because it already exists on `origin`. This is what backs the `v<version>` release links in the screen and print footers.

The workflow resolves the **base path** automatically: project repos (`<owner>/<repo>`) are served from `/<repo>/`, so the build is run with `BASE_PATH=/<repo>`. User/org sites (`<owner>.github.io`) are served from the root, so `BASE_PATH` stays empty. If you point a custom domain at the Pages site, unset `BASE_PATH` in the workflow (or override it).

`svelte.config.js` reads `BASE_PATH` from the env. SvelteKit also serves a `404.html` fallback so deep links and refreshes resolve to the SPA shell, and a `static/.nojekyll` file disables GH Pages' Jekyll processing.

**First-time setup on GitHub**: in the repo settings, set **Pages → Build and deployment → Source = Deploy from a branch**, then **Branch = `gh-pages` / `/ (root)`**. The first push to `main` will create the branch if it doesn't already exist.

### PR previews

**`.github/workflows/preview.yml`** builds every PR and publishes it as an isolated preview under `gh-pages:/pr-preview/pr-<number>/`. The workflow uses [`rossjrw/pr-preview-action`](https://github.com/rossjrw/pr-preview-action), which posts (and updates) a sticky comment on the PR with the preview URL and removes the directory when the PR is closed or merged.

The preview build sets `BASE_PATH=/<repo>/pr-preview/pr-<number>` (or `/pr-preview/pr-<number>` on user/org sites) so all `$app/paths`-relative links resolve correctly inside the subdirectory.

A separate **`.github/workflows/ci.yml`** runs lint, type-check, the coverage-gated test suite, and build on every PR and on pushes to `main`, but doesn't deploy. The `main` runs exist so Codecov gets a main-branch baseline (the badge at the top points at `branch/main`); branch protection already guarantees the PR check was green before merge.

---

## Contributing a community recipe

The bottom of the page lists recipes other bakers have shared. Each entry is a
single row in [`src/lib/community/community.md`](src/lib/community/community.md):

```md
| Name      | Date       | Recipe                                        |
| --------- | ---------- | --------------------------------------------- |
| Your name | 2026-05-13 | https://janwelker.github.io/knead-time/?r=... |
```

To add yours: dial in the recipe in the app, click **Share** to copy the URL,
then open a PR appending one row to that file. The website parses the URL,
shows your inputs as columns, and links the row back to the recipe.

For the **Name** column use either your full name (renders as plain text) or
a GitHub handle prefixed with `@` (renders as a link to your profile, e.g.
`@JanWelker` → <https://github.com/JanWelker>).

## Contributing a 50 Top Pizza recipe

Below the community table, the page lists pizzerias from the
[50 Top Pizza](https://www.50toppizza.it/) guide (2018–2025) whose dough
recipes are publicly documented. The data lives in
[`src/lib/pizzerias/pizzerias.md`](src/lib/pizzerias/pizzerias.md). Each row
has seven columns:

```md
| Pizzeria                                                      | Location       | Rankings                            | Recipe                                        | Timing                         | Notes                           | Source                        |
| ------------------------------------------------------------- | -------------- | ----------------------------------- | --------------------------------------------- | ------------------------------ | ------------------------------- | ----------------------------- |
| [Pepe in Grani](https://www.50toppizza.it/.../pepe-in-grani/) | Caiazzo, Italy | 2018-it:1, 2019-it:1, 2022-w:26 ... | https://janwelker.github.io/knead-time/?v=3&… | bulk-room:4-5h, final-proof:2h | Source also adds ~1.9 % starter | https://youngandfoodish.com/… |
```

- **Pizzeria** name is a markdown link to the pizzeria's 50 Top Pizza profile.
- **Location** is `City, Country`.
- **Rankings** is a comma-separated list of `YEAR-LIST:RANK` tokens. `LIST` is
  `it` for the 2018–2021 guides (when 50 Top Pizza was an Italy-only ranking)
  and `w` for 2022–2025 (the standalone World ranking).
- **Recipe** is the Knead Time **Share** URL that encodes the published
  numbers. Open the app, dial in the recipe, click **Share**, paste here.
- **Timing** captures the proving durations the source specifies
  (`step-kind:Nh`, `step-kind:N-Mh`, or `Nm`). The schedule tags any computed
  duration outside the source range with the original value.
- **Notes** is free-form text flagging caveats — dropped ingredients, flour
  blends, "approximation". Leave empty when the recipe maps cleanly.
- **Source** is the primary source for those numbers — a chef's interview,
  cookbook excerpt, official video, etc. Don't submit a row without one.

## Conventions worth knowing

- All calculation logic stays in `src/lib/dough/` and is **framework-free**. Components only render results.
- Tests live next to the code they cover (`foo.ts` + `foo.test.ts`). The dough math is the priority surface; UI tests are not currently planned.
- Comments explain **why**, not what. A named function or variable is the documentation for _what_.
- New dependencies should be small and justified. We prefer hand-rolling small things (the `.ics` generator is hand-written) over pulling in large libraries.
- The full project rationale and scope lives in `CLAUDE.md`.

---

## License

Copyright © 2026 Jan Welker. Licensed under the [Apache License, Version 2.0](LICENSE).
