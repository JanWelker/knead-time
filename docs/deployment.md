# Deployment and CI

The app is a static site on GitHub Pages, live at [kneadtime.pizza](https://kneadtime.pizza). Nothing reaches production without a green CI run.

## Continuous integration

`.github/workflows/ci.yml` runs on every PR and on pushes to `main`. It has two jobs:

- **`verify`**: lint, type-check, the coverage-gated suite, build.
- **`e2e`**: the test-count ratchet, then Playwright against a real build.

Both are **required status checks** on `main`. Note that `main` is guarded by a repository _ruleset_, so the classic branch-protection API reports it as unprotected; see `gh api repos/JanWelker/knead-time/rulesets`. Adding a CI job does not make it required; that is a separate change to the ruleset.

The `main` runs exist so Codecov gets a main-branch baseline (the README badge points at `branch/main`) and so the deploy has something to wait for. They are deliberately **not** cancelled when a newer commit lands, since cancelling one would leave that commit undeployed, untagged and out of the baseline; PR runs still supersede each other. The CI badge covers the whole workflow, so a failing `e2e` turns it red too.

## Deployment

`.github/workflows/deploy.yml` is triggered by a **successful CI run on `main`** (`on: workflow_run`), not by the push itself, and it builds the exact commit that run passed on. For each such commit it:

1. Runs `npm ci` and builds the static site with `npm run build`.
2. Pushes the contents of `./build/` to the `gh-pages` branch (root), preserving any `pr-preview/` subdirectories so open PR previews keep working.
3. GitHub Pages serves the `gh-pages` branch.
4. Tags the commit `v<version>` (from `package.json`) and pushes the tag. The step is idempotent: pushes that do not bump the version skip the tag because it already exists on `origin`. This is what backs the `v<version>` release links in the screen and print footers.

Every job that pushes to `gh-pages`, the deploy and the PR preview alike, shares one concurrency group that queues rather than cancels: a merge fires both at once, and a cancelled preview cleanup would leave a stale preview behind.

### Base path

The workflow resolves the **base path** automatically through `.github/actions/base-path`. A **custom domain** (a `static/CNAME` file) or a user/org site (`<owner>.github.io`) is served from the root, so `BASE_PATH` stays empty; a bare project repo (`<owner>/<repo>`) is served from `/<repo>/`, so the build runs with `BASE_PATH=/<repo>`. To move the app onto or off a custom domain, add or remove `static/CNAME`; both `deploy.yml` and `preview.yml` branch on its presence.

`static/CNAME` is committed so it survives the `clean: true` gh-pages deploy, which would otherwise delete the file GitHub writes when you set the domain in the Pages UI and un-set the domain on the next push.

`svelte.config.js` reads `BASE_PATH` from the env. SvelteKit also serves a `404.html` fallback so deep links and refreshes resolve to the SPA shell, and `static/.nojekyll` disables GitHub Pages' Jekyll processing.

### First-time setup on GitHub

In the repository settings, set **Pages → Build and deployment → Source = Deploy from a branch**, then **Branch = `gh-pages` / `/ (root)`**. The first push to `main` creates the branch if it does not already exist.

## PR previews

`.github/workflows/preview.yml` builds every PR opened from a branch in this repository and publishes it as an isolated preview under `gh-pages:/pr-preview/pr-<number>/`. PRs from forks are skipped on purpose: a fork's `GITHUB_TOKEN` is read-only whatever the workflow's `permissions` block says, so the push to `gh-pages` would fail and paint a red X on every external contribution. The workflow uses [`rossjrw/pr-preview-action`](https://github.com/rossjrw/pr-preview-action), which posts and updates a sticky comment on the PR with the preview URL and removes the directory when the PR is closed or merged.

The preview build sets `BASE_PATH=/<repo>/pr-preview/pr-<number>` (or `/pr-preview/pr-<number>` on user/org sites) so all `$app/paths`-relative links resolve correctly inside the subdirectory.

## Versions

One version literal per thing, where Renovate can see it. The Node version lives in `.nvmrc` and every job reads it through `.github/actions/node-setup`; `engines.node` in `package.json` is the floor the code must run on. The app version in `package.json` is inlined at build time and shown in the footer, linked to the matching GitHub release tag.
