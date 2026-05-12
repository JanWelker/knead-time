# Knead Time

[![CI](https://github.com/JanWelker/knead-time/actions/workflows/ci.yml/badge.svg)](https://github.com/JanWelker/knead-time/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/JanWelker/knead-time/branch/main/graph/badge.svg)](https://codecov.io/gh/JanWelker/knead-time)

A time-anchored Neapolitan pizza dough calculator. You enter **when you want to bake**; the app schedules every step backwards from that moment, auto-switches between cold and room fermentation based on available time, and gives you an on-screen schedule, an `.ics` you can drop into a calendar, and a print-to-PDF recipe sheet for the kitchen counter.

Built with SvelteKit 5 + TypeScript + Tailwind v4. Fully client-side, three languages (EN / DE / IT), shareable recipes via URL.

---

## Requirements

- **Node.js 22+** and **npm** on the host.

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
│   ├── i18n/             ← messages (en/de/it), locale detection, runtime interpolation
│   ├── state.svelte.ts   ← form state as a $state class
│   ├── format.ts         ← grams, percentages, durations, datetime input glue
│   └── stepCopy.ts       ← maps ScheduleStepKind → i18n key + interpolates schedule context
├── routes/
│   ├── +layout.svelte    ← global styles, language bootstrap
│   ├── +layout.ts        ← prerender + ssr=false (fully client-side)
│   └── +page.svelte      ← the entire calculator UI
├── app.css               ← Tailwind v4 entrypoint + @theme palette
└── app.html              ← shell

.github/workflows/
├── ci.yml                ← lint + check + test + build on every push/PR
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
4. **i18n.** Every new user-facing string goes into `src/lib/i18n/messages.ts` for all three locales. The parity test will fail loudly if a key is missing.
5. **Verify.** `npm test && npm run check && npm run build`. The CI workflow runs the same commands plus `npm run lint`.

### Print / PDF export

The **Print / Save as PDF** action calls `window.print()` — there's no PDF library. Layout is driven by `@media print` rules in `src/app.css` and `print:` Tailwind variants scattered through `+page.svelte` and `ModeBadge.svelte`. The printed sheet hides the input form and chrome, prepends a recipe-summary header (inputs used), and appends a footer containing the share URL so a printed copy is reproducible.

If you touch the printed layout, check it in your browser's print preview — don't rely on `svelte-check`. Keep it readable on a B&W printer: rely on borders and text colour, not on background fills.

### The dough math, briefly

- **Baker's percentages**: flour = 100%; water, salt, yeast are % of flour. Total dough = `pizzaCount × ballWeight`. Flour is derived from total and the sum of percentages.
- **Mass balance is subtly different for sourdough**: fresh yeast adds new mass (`pctSum = 100 + h + s + y`), while sourdough starter is just flour+water from the existing budget (`pctSum = 100 + h + s`). Both produce ingredients that sum exactly to `pizzaCount × ballWeight` — there's a test that enforces this. When a pre-ferment is active the ingredient table renders as three sections (**Pre-dough / Main dough / Totals**) rather than one flat table — a single subtracted table reads as a math error because the totals row never matches the visible sum.
- **Fermentation model**: ferment "units" = `yeast% × hours × temperatureFactor(T)`. Temperature factor follows Q10 = 2 (rate doubles every 10 °C). Reference: 0.2% fresh yeast at 22 °C ferments for ~8 h.
- **Cold/room switch**: deterministic on available time. ≥ 16 h available → cold ferment with a fixed-shape schedule (prep → mix → 1 h room bulk → long fridge bulk → divide → 3 h warmup → 1 h final proof → bake). Below that → room ferment with bulk + final proof split 2:1 inside the available window. Yeast % is then chosen so the actual ferment-unit total matches the target.
- **Schedule window**: the user picks both a **start datetime** (defaults to page-load time, editable, persisted in the URL) and a **ready-by datetime**. Everything is sized to fit inside that window. When a pre-ferment is selected, 12 h of the window are reserved for the pre-ferment to mature before prep — `preferment-mix` defaults to landing at/after `startAt`, but the night-window guard below can pull it earlier.
- **Night-window guard**: no baker-action step may start in `[22:00, 08:00)` local time. In cold mode the scheduler stretches the bulk-cold duration within its floor/ceiling so the pre-cold cluster (`preferment-mix` → bulk-cold start) lands during waking hours — typically by extending the cold ferment so prep happens the prior evening rather than overnight. Post-cold steps (divide, warm-up) are anchored to `readyBy` and can't be shifted; room mode has no slack. When a step can't be lifted out of the window the scheduler emits a `night-step` warning (surfaced via `Warnings.svelte`) instead of silently rearranging. Because the guard can pull the first step earlier than `startAt`, `startAt` is a soft hint rather than a strict floor.
- **Round numbers action**: the button next to the ball-weight input nudges the ball weight (to 0.1 g precision; the field accepts decimals like `288.5`) so the derived flour and water come out as tidy multiples of 100 g — or 50 g when 100 g would drift too far. It's **idempotent** (clicking twice is a no-op) and works for both fresh yeast and sourdough, branching on the `pctSum` difference above.
- **Step copy & `.ics` parity**: `stepCopy.ts` interpolates schedule context into each step description — divide & ball shows pizza count and per-ball weight, mix steps show the main-dough flour/water/salt/yeast weights (with the yeast label localized to fresh yeast vs. sourdough starter), and "Mix dough" uses a separate template when a pre-ferment is set (so the baker is reminded to fold it in). The `.ics` VEVENT `DESCRIPTION` must match the on-page step description verbatim, including interpolated values, so a calendar reminder is self-contained.

### Deployment

Deployment is fully automated by **`.github/workflows/deploy.yml`**. Every push to `main`:

1. Runs `npm ci` and builds the static site with `npm run build`.
2. Pushes the contents of `./build/` to the `gh-pages` branch (root), preserving any `pr-preview/` subdirectories so open PR previews keep working.
3. GitHub Pages serves the `gh-pages` branch.

The workflow resolves the **base path** automatically: project repos (`<owner>/<repo>`) are served from `/<repo>/`, so the build is run with `BASE_PATH=/<repo>`. User/org sites (`<owner>.github.io`) are served from the root, so `BASE_PATH` stays empty. If you point a custom domain at the Pages site, unset `BASE_PATH` in the workflow (or override it).

`svelte.config.js` reads `BASE_PATH` from the env. SvelteKit also serves a `404.html` fallback so deep links and refreshes resolve to the SPA shell, and a `static/.nojekyll` file disables GH Pages' Jekyll processing.

**First-time setup on GitHub**: in the repo settings, set **Pages → Build and deployment → Source = Deploy from a branch**, then **Branch = `gh-pages` / `/ (root)`**. The first push to `main` will create the branch if it doesn't already exist.

### PR previews

**`.github/workflows/preview.yml`** builds every PR and publishes it as an isolated preview under `gh-pages:/pr-preview/pr-<number>/`. The workflow uses [`rossjrw/pr-preview-action`](https://github.com/rossjrw/pr-preview-action), which posts (and updates) a sticky comment on the PR with the preview URL and removes the directory when the PR is closed or merged.

The preview build sets `BASE_PATH=/<repo>/pr-preview/pr-<number>` (or `/pr-preview/pr-<number>` on user/org sites) so all `$app/paths`-relative links resolve correctly inside the subdirectory.

A separate **`.github/workflows/ci.yml`** runs lint, type-check, tests, and build on every push and PR but doesn't deploy.

---

## Conventions worth knowing

- All calculation logic stays in `src/lib/dough/` and is **framework-free**. Components only render results.
- Tests live next to the code they cover (`foo.ts` + `foo.test.ts`). The dough math is the priority surface; UI tests are not currently planned.
- Comments explain **why**, not what. A named function or variable is the documentation for _what_.
- New dependencies should be small and justified. We prefer hand-rolling small things (the `.ics` generator is hand-written) over pulling in large libraries.
- The full project rationale and scope lives in `CLAUDE.md`.

---

## License

Copyright © 2026 Jan Welker. Licensed under the [Apache License, Version 2.0](LICENSE).
