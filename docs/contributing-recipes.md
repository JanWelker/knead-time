# Contributing recipes

The **Recipes** view in the app lists recipes other bakers have shared and dough recipes from pizzerias in the [50 Top Pizza](https://www.50toppizza.it/) guide. Both collections are markdown tables in this repository; adding to either is one row and a pull request, no code required.

## A community recipe

Each entry is a single row in [`src/lib/community/community.md`](../src/lib/community/community.md):

```md
| Name      | Date       | Recipe                         |
| --------- | ---------- | ------------------------------ |
| Your name | 2026-05-13 | https://kneadtime.pizza/?r=... |
```

To add yours: dial in the recipe in the app, click **Share** to copy the URL, then open a PR appending one row to that file. The website parses the URL, shows your inputs as columns, and links the row back to the recipe.

For the **Name** column use either your full name (renders as plain text) or a GitHub handle prefixed with `@` (renders as a link to your profile, e.g. `@JanWelker` → <https://github.com/JanWelker>).

## A 50 Top Pizza recipe

The page lists pizzerias from the 50 Top Pizza guide (2018–2025) whose dough recipes are publicly documented. The data lives in [`src/lib/pizzerias/pizzerias.md`](../src/lib/pizzerias/pizzerias.md). Each row has seven columns:

```md
| Pizzeria                                                      | Location       | Rankings                            | Recipe                         | Timing                         | Notes                           | Source                        |
| ------------------------------------------------------------- | -------------- | ----------------------------------- | ------------------------------ | ------------------------------ | ------------------------------- | ----------------------------- |
| [Pepe in Grani](https://www.50toppizza.it/.../pepe-in-grani/) | Caiazzo, Italy | 2018-it:1, 2019-it:1, 2022-w:26 ... | https://kneadtime.pizza/?v=3&… | bulk-room:4-5h, final-proof:2h | Source also adds ~1.9 % starter | https://youngandfoodish.com/… |
```

- **Pizzeria** is a markdown link to the pizzeria's 50 Top Pizza profile.
- **Location** is `City, Country`.
- **Rankings** is a comma-separated list of `YEAR-LIST:RANK` tokens. `LIST` is `it` for the 2018–2021 guides (when 50 Top Pizza was an Italy-only ranking) and `w` for 2022–2025 (the standalone World ranking). Mixing both in one row is fine; Pepe in Grani's history spans both.
- **Recipe** is the Knead Time **Share** URL that encodes the published numbers. Open the app, dial in the recipe, click **Share**, paste here.
- **Timing** captures the proving durations the source specifies (`step-kind:Nh`, `step-kind:N-Mh`, or `Nm`). Recognised kinds are `preferment-mix`, `bulk-room`, `bulk-cold` and `final-proof`. The schedule tags any computed duration outside the source range with the original value.
- **Notes** is free-form text flagging caveats: dropped ingredients, flour blends, "approximation". Leave it empty when the recipe maps cleanly. When a chef's restaurant method combines mechanisms Knead Time cannot represent (fresh yeast plus a sourdough starter, say), encode the published home recipe and explain the gap here.
- **Source** is the primary source for those numbers: a chef's interview, a cookbook excerpt, an official video. The parser drops rows without one, so do not submit a row without it.

## What happens to a bad row

Both parsers drop malformed rows silently, so a typo'd date or URL removes a row from the site without breaking the page. A unit test counts the link-carrying rows in each file and asserts the parser kept all of them, so a broken row fails CI rather than vanishing.
