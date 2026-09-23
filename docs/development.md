# Development guide

Everything a contributor hits in the first hour. The deeper rationale behind each constraint, and why the code is shaped the way it is, lives in [`CLAUDE.md`](../CLAUDE.md).

## Requirements

**Node.js 22+** and **npm** (enforced via `engines`). CI and deploys run the version in `.nvmrc`, currently 24; `nvm use` gives you the same one. That is it: CI and deployment run on GitHub Actions, locally you just need Node.

## Quickstart

```sh
npm install
npm run dev        # Vite dev server on http://localhost:5173
```

Hit `Ctrl-C` to stop it. For a production-style preview:

```sh
npm run build      # static site → ./build/
npm run preview    # serve ./build/ locally
```

## npm scripts

| Command                 | What it does                                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `npm run dev`           | Vite dev server on port 5173 with HMR                                                                              |
| `npm test`              | Run vitest once (`npm run test:watch` for watch mode)                                                              |
| `npm run test:coverage` | Run vitest with v8 coverage → `./coverage/`                                                                        |
| `npm run test:e2e`      | Browser tests (Playwright, Chromium) against a real build; `E2E_PORT` moves the preview server off 4173            |
| `npm run test:e2e:ui`   | The same suite in Playwright's debugger                                                                            |
| `npm run test:baseline` | Compare the test counts against `.github/test-baseline.json`; fails on a drop, on a rise, or on coverage below 100 |
| `npm run check`         | `svelte-kit sync` + `svelte-check` (type & template check)                                                         |
| `npm run lint`          | Prettier check + ESLint                                                                                            |
| `npm run format`        | Prettier write                                                                                                     |
| `npm run build`         | Production build → `./build/` (static site)                                                                        |
| `npm run preview`       | Serve the built site locally                                                                                       |

Husky + lint-staged are configured in `.husky/pre-commit`. The hook runs lint-staged and then `npm test` on every commit. It skips coverage, so run `npm run test:coverage` yourself before opening a PR.

## Layout

```
src/
├── lib/
│   ├── dough/            ← pure math, framework-free, heavily tested
│   │   ├── bakers.ts          baker's percentages, mass balance
│   │   ├── fermentation.ts    Q10 yeast ↔ time ↔ temperature model
│   │   ├── schedule.ts        backwards schedule, cold↔room auto-switch
│   │   ├── ics.ts             RFC 5545 calendar export
│   │   ├── urlState.ts        compact share-link encoding
│   │   ├── flour.ts           flour presets, W → fermentation-tolerance bands
│   │   ├── windowPresets.ts   slider stops, rail axis, the ideal window
│   │   ├── quality.ts         recipe-fit score (0–100 → 0–5 stars)
│   │   ├── types.ts           shared types
│   │   └── *.test.ts          colocated tests
│   ├── components/       ← Svelte 5 UI (uses runes); AskFlow / PlanView / LibraryView are the three views,
│   │                        AdjustPanel is the sheet that holds every input
│   ├── i18n/             ← messages (en/de/it/fr/nl), locale detection, runtime interpolation
│   ├── community/        ← community.md (data) + parser, rendered as a table in the Recipes view
│   ├── pizzerias/        ← pizzerias.md (50 Top Pizza recipes) + parser, rendered below the community table
│   ├── trmnl/            ← TRMNL Private-Plugin webhook payload + client
│   ├── state.svelte.ts   ← form state as a $state class (window re-pick, startAt/readyBy floors)
│   ├── view.ts           ← the three views (ask / plan / library) and where a visitor lands
│   ├── warningSlots.ts   ← which surface each schedule warning is rendered on
│   ├── mode.svelte.ts / storedMode.ts           ← beginner/expert view mode (+ localStorage)
│   ├── verbosity.svelte.ts / storedVerbosity.ts ← schedule short/detailed switch (+ localStorage)
│   ├── storedRecipes.ts  ← last-recipe restore + named recipe book (localStorage)
│   ├── format.ts         ← grams, percentages, durations, datetime input glue
│   └── stepCopy.ts       ← maps ScheduleStepKind → i18n key + interpolates schedule context
├── hooks.server.ts       ← the one server hook: stamps `<html lang>` per prerendered print sheet
├── routes/
│   ├── +layout.svelte    ← global styles, language bootstrap
│   ├── +layout.ts        ← prerender + ssr=false (fully client-side)
│   ├── +page.svelte      ← the router: mounts exactly one of the three views
│   └── print/[[locale]]/ ← self-contained print/PDF sheet (auto-triggers the dialog)
├── app.css               ← Tailwind v4 entrypoint: the press (ink / paper / accent tokens,
│                           one authored set per theme) and the component layer every
│                           surface, band, stamp and control is built from
├── app.html              ← shell (theme boot, manifest + Home Screen meta; no third-party links)
└── service-worker.ts     ← precaches the whole app so it opens offline (SvelteKit registers it)

static/                   ← copied verbatim to the site root
├── manifest.webmanifest  ← the PWA manifest; every URL in it is relative, so BASE_PATH needs no help
├── icon.svg              ← the mark: tab, Home Screen and manifest all point here
├── icon-maskable.svg     ← the same drawing at 0.86, so its diagonal clears the launcher's safe circle
└── icon-*.png / apple-touch-icon.png rendered from them, committed

e2e/                      ← Playwright browser tests (the parts vitest cannot reach)
scripts/
├── check-test-baseline.mjs   fails when the test counts differ from the recorded floor or coverage is relaxed
└── render-icons.mjs          re-renders the icon PNGs from the SVGs (run by hand)

.github/
├── test-baseline.json    ← how many tests exist; edited by hand whenever the count moves
├── actions/              ← composite actions every workflow consumes
│   ├── node-setup/       ← installs the .nvmrc Node version and runs npm ci
│   └── base-path/        ← resolves BASE_PATH (custom domain, user site or /<repo>) for deploy and preview
└── workflows/
    ├── ci.yml            ← verify (lint + check + coverage gate + build) and e2e, on PRs and pushes to main
    ├── deploy.yml        ← build + publish to GitHub Pages, after CI passes on main
    └── preview.yml       ← build + publish a per-PR preview, comment the URL, clean up on close

vite.config.ts            ← Vite (no test config; runtime build only)
vitest.config.ts          ← Vitest (kept separate so vite types stay clean)
playwright.config.ts      ← Playwright (builds and serves the real static output)
```

## Adding a feature

1. **Math/logic first.** Add or extend a module in `src/lib/dough/`. Keep it pure (no Svelte imports). Add a `*.test.ts` next to it. Run `npm test` until green.
2. **Wire to state.** If new inputs are needed, extend `FormState` in `src/lib/state.svelte.ts`, then `SerializableInputs` in `src/lib/dough/urlState.ts` (encode + decode + round-trip test).
3. **UI.** Add fields to `src/lib/components/InputForm.svelte`, the dense form inside the Adjust sheet, which is where every `DoughInputs` field lives; render results in `PlanView.svelte` or its children. A field worth putting on the plan gets an `id="field-…"` so a chip can open the sheet focused on it. Use Svelte 5 runes (`$state`, `$derived`, `$effect`).
4. **i18n.** Every new user-facing string goes into `src/lib/i18n/messages.ts` for all five locales. The parity test fails loudly if a key is missing.
5. **Verify.** `npm run test:coverage && npm run check && npm run build`. CI runs `npm run lint`, `npm run check`, `npm run test:coverage` (the 100 % coverage gate; plain `npm test` skips it) and `npm run build`. A second CI job runs `npm run test:e2e`: Playwright drives a real build for the parts that live in components and so cannot be reached by vitest. The first local run needs `npx playwright install chromium`.
6. **Bump the version** with `npm version <patch|minor|major> --no-git-tag-version`. Patch for fixes, docs and refactors; minor for a backwards-compatible user-facing feature; major when a returning user's recipe or an old share link would change. The major version is pinned to the share-link schema version, and a test checks the two agree.

### Adding a locale

`LOCALES` in `src/lib/i18n/messages.ts` is the list everything else derives from: the `Locale` type, `isLocale`, `detectLocale`, the prerendered print entries and the `<html lang>` hook all follow it. The rest is by hand:

1. Add the code to `LOCALES` and a complete `Messages` object for it in `messages.ts`. `messages.test.ts` fails until every key is present.
2. Add its **endonym** to the list in `src/lib/components/MastheadMenu.svelte` — the language is named in itself, not translated.
3. Pin its number and date punctuation in `src/lib/format.test.ts`: `formatDateTime` has one literal per locale, and the weights have per-locale expectations. Read what `Intl` produces and decide whether the repunctuation rules in `format.ts` need a case.
4. Run `src/lib/trmnl/webhook.test.ts`: it measures the TRMNL payload in every locale against the 2 KB cap, and a wordier language can push the worst case over it.
5. If the script needs glyphs outside Latin and Latin Extended, add the Fontsource subset to the `@font-face` rules in `src/app.css`; the two shipped subsets are all the current five need.
6. Update the language count in `README.md` and the locale list in `CLAUDE.md`.

### Adding a schedule warning

1. Add the kind to the `ScheduleWarning` union in `src/lib/dough/types.ts` and push it from `computeSchedule` in `src/lib/dough/schedule.ts`, with a named constant for its edge.
2. Place it in `WARNING_SLOT` in `src/lib/warningSlots.ts` — `window`, `temperature` or `ingredients`, next to the thing whose value causes it. The record is total, so the build fails until you do; `warningSlots.test.ts` pins the full membership and needs the new row.
3. Give it copy in the `warnings` block of `Messages` and all five locales, and map it in the `COPY` and `SEVERITY` records in `src/lib/components/Warnings.svelte` (both total records, both compile errors until filled).
4. Pin the edge as a literal in `schedule.test.ts`, and if the warning describes a band the user can feel, add it to the "Get nerdy" contract in `src/lib/infoSections.ts` and its copy.

## Testing

Math and schedule bugs are silent until a dough overproofs, so coverage is a hard gate.

- Tests live next to the code (`foo.ts` + `foo.test.ts`). `src/lib/` is held at **100 % lines, functions, branches and statements**; `npm run test:coverage` enforces it and CI runs the same. If a branch is hard to reach, delete it rather than fake a test for it.
- **Browser tests live in `e2e/`** (Playwright, Chromium only) and cover everything in a component or a `.svelte.ts` module. Vitest has no Svelte plugin, so those files cannot even be imported by a unit test. The suite builds and serves the real static output, pins the clock, timezone and locale, and waits for hydration before reading anything.
- **The suite may grow, never shrink.** `npm run test:baseline` compares the collected test counts against `.github/test-baseline.json` and re-checks that the coverage thresholds are still 100. It fails on **any** difference, a rise included, and it never writes the file: when you add tests, run it, read the new counts from its message and put them in the file yourself. Lowering a count is allowed only as that same explicit edit, visible in review.
- **Every bug gets a test in the same change as the fix**, named after the failure rather than the function, with a comment saying what broke and why it was missed.
- **Pin the number, not just the branch.** A test that only checks which factor fired leaves the constant behind it free to move. Every magic number a user can feel needs one assertion that fails when it changes.

## Print / PDF export

The **Print / Save as PDF** action opens a dedicated `/print/[[locale]]?<recipe>` route in a new tab (`src/routes/print/[[locale]]/+page.svelte`). The route is fully self-contained, with inline styles in `<svelte:head>`, no Tailwind print variants and no shared chrome, and auto-triggers `window.print()` on mount. It renders a two-column header (recipe inputs on the left, ingredients on the right) above the full-width schedule, then a footer with a QR code of the share URL so scanning the printed sheet rehydrates the recipe in the app.

If you touch the printed layout, check it in your browser's print preview; `svelte-check` cannot see it. Keep it readable on a black-and-white printer (borders and text colour, not background fills), and keep the common shapes on one page. QR generation lives in `src/lib/qr.ts`, a thin wrapper around `qrcode-generator`.

## Home Screen and offline

`static/manifest.webmanifest` plus the icons and meta tags in `src/app.html` make the app installable; `src/service-worker.ts` makes it work offline. SvelteKit registers the worker itself; there is no `register()` call anywhere in the app.

Two things here are easy to break without noticing, so both are pinned in `e2e/pwa.spec.ts`:

- **Every URL in the manifest is relative** (`"start_url": "."`, `"src": "icon-192.png"`), because they resolve against the manifest's own address. An absolute `/` would send every PR preview's installed app to the production root.
- **The precache is all-or-nothing.** `cache.addAll` rejects as a unit, so a single unfetchable entry silently costs the whole offline mode. That is why the worker filters out `CNAME` and `.nojekyll`, files that are instructions to GitHub Pages rather than assets the app ever asks for.

The mark is the job ticket itself: a sheet standing on an offset block of ink, dotted leaders, the stub's perforation, and one spot of tomato below the tear. **There is no separate `favicon.svg`.** The tab, the Home Screen and the manifest all point at `static/icon.svg`, so the icon in a tab strip cannot drift from the one on a phone.

Icons are rendered from `static/icon.svg` and `static/icon-maskable.svg` by `node scripts/render-icons.mjs` (it borrows Playwright's Chromium, already a devDependency) and the PNGs are committed, so no build or CI job depends on it. Re-run it after editing either SVG, and keep the ground a full-bleed rect: iOS composites a transparent icon onto black.

There are **no notifications**, and adding them client-side is not possible; see [#306](https://github.com/JanWelker/knead-time/issues/306). iOS suspends a backgrounded web app's JavaScript, so timers do not run, and it wakes a service worker for exactly one thing: an incoming push message, which requires a server to send. The `.ics` export is the path to an alert that fires with the app closed.

## TRMNL e-ink view

The recipe is **pushed** to a [TRMNL](https://trmnl.com/) device via a **Private Plugin webhook**, straight from the user's browser: the **Send to TRMNL** action in the plan's actions menu POSTs pre-formatted `merge_variables` to `https://trmnl.com/api/custom_plugins/<uuid>`, and the device renders them through a Liquid template at its own refresh cadence. The template picks the current step at render time with Liquid date math, so one POST per recipe change keeps the Now/Next/Done highlight moving all day.

Implementation lives in `src/lib/trmnl/` (payload builder + webhook client); the setup walkthrough and the Liquid template are in [trmnl-setup.md](trmnl-setup.md). The payload uses 1–2 character keys to stay under the free tier's 2 KB cap in every locale. A regression test measures the wire size, so adding fields without measuring fails CI. There is **no `/trmnl` route**: the earlier screenshot-plugin approach failed because TRMNL's renderer does not reliably execute JS, so every capture showed build-time defaults.

## Conventions

- All calculation logic stays in `src/lib/dough/` and is **framework-free**. Components only render results.
- All user-facing copy lives in `src/lib/i18n/messages.ts`, in all five locales. No hardcoded strings in components.
- All in-app links and assets go through `$app/paths` (`base` / `resolve()`); never hard-code `/`. The app is served from a sub-path on PR previews.
- All `localStorage` access goes through `src/lib/safeStorage.ts`; Chrome's "Block all cookies" makes even the getter throw.
- The app fetches nothing from another origin. No `<link>` to a CDN, no `@import` of a remote stylesheet, no dependency that pulls its own. `e2e/self-hosted.spec.ts` watches the network to enforce it.
- Comments explain **why**, not what. A named function or variable is the documentation for what.
- New dependencies should be small and justified. Hand-rolling small things (the `.ics` generator is hand-written) beats pulling in large libraries.
- Keep this guide and the README in sync with npm scripts, CI/deploy and structure.
