# doughcalc

A web calculator for Neapolitan pizza dough. The defining UX choice: users enter **when they want to bake**, and the app schedules every step backwards from that moment.

## Stack

- **SvelteKit (enforce version 5)+ TypeScript**
- **Tailwind CSS** for styling
- **Vitest** for unit tests (dough math is the priority surface to cover)
- **Prettier + ESLint** for formatting/linting
- **Husky** pre-commit hooks (format, lint, test)
- Deployment target: **GitHub Pages** (static, fully client-side build via `@sveltejs/adapter-static`).

## Development & deployment environment

Local dev runs straight on the host with Node 22 + npm. CI and deployment run as **GitHub Actions** workflows; the host needs nothing beyond Node.

- Local: `npm install`, then `npm run dev` (Vite on port 5173). Standard scripts: `npm test`, `npm run check`, `npm run lint`, `npm run build`.
- `.github/workflows/ci.yml` — runs lint, type-check, tests, and build on every push and PR.
- `.github/workflows/deploy.yml` — on push to `main`, builds the static site and publishes it to GitHub Pages (uses `actions/configure-pages`, `upload-pages-artifact`, `deploy-pages`).
- The build is fully static (`adapter-static`, `fallback: '404.html'` so GH Pages serves the SPA shell for unknown routes). A `static/.nojekyll` file disables Jekyll processing of build output.
- **Base path**: `svelte.config.js` reads `BASE_PATH` from the env. The deploy workflow sets `BASE_PATH=/<repo>` for project pages and leaves it empty for `<owner>.github.io` user/org sites or custom-domain deployments. Locally `BASE_PATH` is unset, so dev runs at `/`.
- All in-app links / asset URLs must respect the base path — use SvelteKit's `$app/paths` (`base`, or `resolve('/some/route')`) rather than hardcoding `/`.

## Core domain model

The calculator is **time-anchored**, not ingredient-anchored. Flow:

1. User sets a "ready to bake" datetime (e.g. when guests arrive).
2. User sets number of pizzas, ball weight (default **280 g**), hydration % (default **70%**), salt %(default **30g**), and chooses a yeast type.
3. App computes the schedule backwards: shaping → bulk ferment → mix → ingredient prep.
4. App **auto-switches between cold and room fermentation** based on available time. If the window is short, it falls back to a room-temp schedule; if there's plenty of time, it uses a cold-ferment (fridge) phase.
5. Output: a **table of timestamps + steps** on the page, an optional **iCal (.ics) download** with one VEVENT per step, and a **Print / Save as PDF** action that produces a printer-friendly, single-column recipe sheet via a `@media print` stylesheet (no PDF library — relies on the browser's print-to-PDF).

### Inputs

- Start datetime — when the schedule begins (defaults to page-load time; user-editable, persisted in the URL alongside ready-by)
- Ready-by datetime
- Number of pizzas
- Ball weight (g) — may be a decimal value (e.g. 288.5 g); the form input must accept that
- Hydration % (water/flour)
- Salt % (of flour)
- Yeast type: **fresh yeast (cube)** or **sourdough starter** (with starter hydration when applicable)
- Room temperature (drives fermentation timing)
- Pre-ferments (biga / poolish)

**Night-window guard**: no baker-action step may start between **22:00 and 08:00** local time (the user shouldn't have to wake up at 3 AM to mix dough). In cold mode the scheduler nudges the bulk-cold duration within its floor/ceiling so the pre-cold cluster (preferment-mix → bulk-cold start) lands during waking hours — typically by extending the cold ferment so prep happens the prior evening rather than overnight. Post-cold steps (divide, warm-up) are anchored to readyBy and can't be shifted; room mode has no slack at all. When a step can't be lifted out of the night window the scheduler emits a `night-step` warning instead of silently rearranging. This guard can pull the first step earlier than the user's `startAt`, so `startAt` is a soft hint rather than a strict floor.

Plus a **"Round numbers" action** next to the ball-weight input:

- Adjusts the ball weight (to 0.1 g precision) so the resulting **flour and water come out as tidy round numbers** — typically a multiple of 100 g for flour, or 50 g when 100 would drift too far.
- Must be **idempotent** — clicking twice is a no-op.
- Must work for both fresh yeast and sourdough (the pctSum branch differs, see math notes).

### Outputs

- Ingredient amounts (flour, water, salt, yeast/starter) in grams.
  - **No pre-ferment** → single flat table.
  - **With a pre-ferment** → three sections: **Pre-dough** (mix the night before), **Main dough** (mix on baking day with the ripe pre-dough), **Totals** (combined flour/water/salt/yeast + total dough weight). The 3-section layout exists because a single table with the pre-ferment subtracted reads as a math error to the eye — the totals row never matches the visible sum.
- Step-by-step schedule table with absolute timestamps.
  - Step copy interpolates schedule context so the description is self-contained:
    - **Divide & ball** shows pizza count and per-ball weight (e.g. _"Cut the dough into 6 balls of 289 g each"_).
    - **Weigh & prep** and **Mix dough** show the main-dough flour, water, salt and yeast weights, with the yeast label localized to fresh yeast / sourdough starter.
    - **Mix dough** has a separate template when a pre-ferment is set ("Add the ripe pre-dough to …") so the baker is reminded to fold it in.
    - **Mix pre-ferment** shows the pre-ferment flour, water and pinch-of-yeast weights.
- `.ics` file: one event per step, named and timed appropriately. The VEVENT `DESCRIPTION` must match the on-page step description verbatim — including interpolated context like ball weight — so a calendar reminder is self-contained.
- **Printable recipe sheet** (PDF via the browser's print dialog). Driven by `@media print` rules in `src/app.css` plus `print:` Tailwind variants — no extra dependency. The printed layout hides the input form / chrome, shows a recipe-summary header (inputs used), the schedule, the ingredient table, and a footer with the share URL so a printed copy is reproducible. Keep it readable on a B&W printer: rely on borders and text colour, not on background fills (browsers strip those by default).

### Math notes

- Baker's percentages: flour = 100%; water, salt, yeast expressed as % of flour weight.
- Total dough = `balls × ball_weight`; flour derived from total and the sum of percentages.
- Fermentation time ↔ yeast amount ↔ temperature relationship: model this in a single pure module (`src/lib/dough/`) so it's straightforward to unit-test. Treat the cold↔room switch as a deterministic function of available time, not a UI toggle.
- **Pre-ferment reserve**: when a pre-ferment is selected, the schedule reserves ~12 h before mix-day prep for the pre-ferment to mature. By default the `preferment-mix` step lands at or after the start time — there's a regression test for this — but the night-window guard above can override this and pull preferment-mix earlier than `startAt` if that is the only way to keep every action out of [22:00, 08:00).
- Keep all calculation logic **pure and framework-free** — Svelte components should only call into `src/lib/dough/` and render results.
- **Mass-balance invariant**: the sum of every separately-weighed ingredient must equal `pizzaCount × ballWeight`. Fresh yeast adds new mass (`pctSum = 100 + hydration + salt% + yeast%`); sourdough starter is flour + water from the existing budget, so it is excluded (`pctSum = 100 + hydration + salt%`). The pre-ferment redistributes flour/water/yeast between the pre-dough and main dough but does not change the totals. There's a test enforcing this for every combination — don't regress it.

## Scope / philosophy

- **Power-user mode**: expose the levers (hydration, salt, ball weight, yeast type, ready-by time). No strict AVPN enforcement, but defaults reflect contemporary high-hydration Neapolitan style (280 g / 70%).
- Calculator is **fully client-side**. No backend, no accounts.
- Shareable via **URL-encoded state** — the form's state serializes into the URL so a link reproduces the recipe. Keep the encoding compact and stable across versions.

## i18n

- Languages: **English, German, Italian** (metric only — grams, °C).
- Set up i18n scaffolding from the start (e.g. `svelte-i18n` or `paraglide`). All user-facing strings go through it — no hardcoded copy in components.
- Default language: detect from browser, fall back to English.

## Design

- **Responsive, playful** — Italian-themed warmth (think tomato/basil/dough palette), but not cartoonish. Should feel inviting in a kitchen, readable on a phone.
- Mobile usage is realistic (phone on the counter), so layout must work well at narrow widths even if it's not strictly mobile-first.

## Project conventions

- Tests live next to the code they cover (`foo.ts` + `foo.test.ts`).
- Cover the dough math thoroughly; UI tests are not currently planned.
- No comments explaining _what_ code does — only _why_ when non-obvious (e.g. a specific magic number from a fermentation table needs a citation).
- Keep dependencies minimal; prefer a small `.ics` generator (or hand-rolled) over a large calendar lib.
- **Keep `README.md` in sync.** The repo ships a `README.md` with a quickstart and a dev guide (how to test, build, and advance the app). When you change npm scripts, CI/deploy workflows, dependency commands, project structure, or anything else a contributor would hit in their first hour, update `README.md` in the same change.

## Out of scope (for now)

- User accounts / server-side persistence
- Imperial units
