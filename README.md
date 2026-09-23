# Knead Time

[![CI](https://github.com/JanWelker/knead-time/actions/workflows/ci.yml/badge.svg)](https://github.com/JanWelker/knead-time/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/JanWelker/knead-time/branch/main/graph/badge.svg)](https://codecov.io/gh/JanWelker/knead-time)

**Tell it when you want to eat. It tells you when to start.**

Knead Time is a Neapolitan pizza dough calculator that schedules backwards from the moment you bake. Pick the bake time, the number of pizzas and the flour in your cupboard, and it hands you a job ticket: the weights to put on the scale, a numbered timeline of every step, and the yeast solved so the dough is ready exactly when you are.

**[Open the app at kneadtime.pizza →](https://kneadtime.pizza)**

Nothing to install and nothing to sign up for. Add it to your Home Screen and it opens without a signal, which is what a two-day schedule in a kitchen actually needs.

## What you get

- **A schedule that fits your day.** Every step is timed backwards from the bake. With 16 h or more left after any pre-ferment the dough goes into the fridge; with less it ferments on the counter. The schedule shortens the fridge leg to keep every hands-on step out of the night (22:00–08:00), and when it cannot, it says so with a warning rather than moving the step quietly.
- **A recipe you can trust.** Baker's percentages with a mass balance that always adds up, a Q10 fermentation model that solves the yeast for your window and temperatures, and a fit score that tells you when the inputs stray from Neapolitan practice.
- **Your flour, your window.** Twelve flour presets, shelved by strength (W), paint the fermentation window each flour tolerates. A slider snaps to the windows Neapolitan practice uses and re-picks the best one when you change the bake time or the flour.
- **Real pre-ferments.** Biga and poolish, alone or together, each with its own flour share and cellar temperature. Fresh, instant, active-dry or sourdough. Optional autolyse, oil and sugar. Cold or room ball proof. Spiral, stand-mixer or hand kneading, each with its own water temperature.
- **Beginner and expert views.** Five questions answered in one gesture each, or one dense sheet with every number on it.
- **Take it with you.** An `.ics` export for your calendar, a print sheet that fits one page with a QR code back to the recipe, a share link that encodes the whole recipe, and a push to a [TRMNL](https://trmnl.com/) e-ink display.
- **A recipe book.** Your own saved recipes, a community collection, and dough recipes from pizzerias in the [50 Top Pizza](https://www.50toppizza.it/) guide, each with a primary source.
- **Five languages.** English, German, Italian, French and Dutch. Metric only.

Read more in [the feature tour](docs/features.md).

## Privacy

Everything is served from one origin. There is no backend, no analytics, no CDN and no font server; the two typefaces ship with the app. Opening Knead Time tells nobody but your own browser that you are baking. The single outbound request in the whole app is the TRMNL webhook, and it happens only when you click **Send to TRMNL**. A browser test fails if anything else ever reaches for another host. Third-party notices are in [`THIRD-PARTY-NOTICES.md`](THIRD-PARTY-NOTICES.md).

## Run it locally

You need [Node.js](https://nodejs.org/) 22 or newer; CI and the deploy run the version in `.nvmrc` (currently 24), and `nvm use` gives you the same one.

```sh
npm install
npm run dev        # http://localhost:5173
```

Built with SvelteKit 2 on Svelte 5, TypeScript and Tailwind v4. Fully client-side, deployed as a static site to GitHub Pages.

## Documentation

| Document                                             | What it covers                                                                       |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------ |
| [Feature tour](docs/features.md)                     | What the app does and what arrived in which version                                  |
| [Development guide](docs/development.md)             | Project layout, npm scripts, the feature loop, print sheet, Home Screen, conventions |
| [The dough math](docs/dough-math.md)                 | Baker's percentages, the fermentation model, the schedule, pre-ferments              |
| [Deployment and CI](docs/deployment.md)              | How a commit reaches production, PR previews, the required checks                    |
| [Contributing recipes](docs/contributing-recipes.md) | Adding a community recipe or a 50 Top Pizza row                                      |
| [Sending recipes to TRMNL](docs/trmnl-setup.md)      | One-time plugin setup and the Liquid template                                        |

The full design rationale, every constraint the code is built around and why, lives in [`CLAUDE.md`](CLAUDE.md).

## Contributing

Recipes are the easiest contribution: one row in a markdown file, no code. See [contributing recipes](docs/contributing-recipes.md).

For code, read the [development guide](docs/development.md) first. Every change goes through a branch and a pull request; CI must be green before it merges, and the test suite may grow but never shrink. Bug reports and ideas are welcome as [issues](https://github.com/JanWelker/knead-time/issues).

## License

Copyright © 2026 Jan Welker. Licensed under the [Apache License, Version 2.0](LICENSE).
