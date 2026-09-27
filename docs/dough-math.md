# The dough math

Every calculation lives in `src/lib/dough/`, pure TypeScript with no framework imports and a 100 % coverage gate. The app's own **Get nerdy** section (expert view, foot of the recipe sheet) shows the same formulas to the user, and a test holds that panel and this code together.

## Baker's percentages

Flour = 100 %; water, salt, yeast and the optional oil and sugar are percentages of flour. Total dough = `pizzaCount × ballWeight`, and flour is derived from that total and the sum of percentages.

**Mass balance is subtly different for sourdough.** Fresh yeast adds new mass (`pctSum = 100 + h + s + y + oil + sugar`), while sourdough starter is flour and water from the existing budget (`pctSum = 100 + h + s + oil + sugar`). Both produce ingredients that sum exactly to `pizzaCount × ballWeight`; a test enforces this for every combination of yeast carrier, pre-ferment, mode and mixing method.

Oil and sugar default to 0 and stay out of any pre-ferment (they would inhibit the culture); when greater than 0 they are weighed at the main `mix` step, or at `prep` when there is no pre-ferment. When a pre-ferment is active the ingredient table renders as three sections, **pre-dough / main dough / totals**, rather than one flat table: a single subtracted table reads as a math error because the totals row never matches the visible sum.

## Fermentation model

Ferment "units" = `yeast% × hours × temperatureFactor(T)`. The temperature factor follows Q10 = 2 (the rate doubles every 10 °C). Reference: 0.2 % fresh yeast at 22 °C ferments for about 8 h.

Every fermentation phase contributes to one equivalent-hours sum that solves for the yeast percentage, pre-ferments included. `roomTempC` applies during the room ferment, the final proof and the pre-ferment (unless a separate pre-ferment temperature is set); `fridgeTempC` applies during the cold-bulk leg. Both are user inputs.

The model always solves in fresh-equivalent percent and converts to the carrier's mass at the end: fresh 1, instant ⅓, active-dry 0.4, sourdough 100. Sanity warnings about tiny or huge yeast amounts are judged in fresh-equivalent terms, so a sourdough recipe is not flagged for its raw percentage. The band is 0.05–1.5 % fresh-equivalent, and it is one constant pair (`YEAST_PCT_LOW` / `YEAST_PCT_HIGH` in `fermentation.ts`) read by both the warnings and the fit score's `yeast-extreme` factor, so the score never deducts where no warning shows.

## Cold or room

The switch is deterministic on available time, measured **after reserving the longest pre-ferment**: with **16 h or more** left between the pre-ferment's end and the bake the dough cold-ferments (a 20 h window with a 12 h poolish leaves 8 h and stays on the counter). The cold schedule has a fixed shape: prep → 30 min autolyse rest (the default; skipped under a pre-ferment or the expert opt-out) → mix → 1 h room bulk → long fridge bulk → divide → 4 h final proof → bake. That final proof is one phase, `COLD_FINAL_PROOF_MIN = 240`: the balls come out of the fridge and sit on the counter until the bake, one "balls resting" step to the baker rather than a warm-up and a proof. Both legs were at room temperature anyway, so folding them together moved no equivalent hours.

Below 16 h the dough ferments at room temperature. After the fixed hands-on minutes are taken out, a third of what remains goes to the final proof, **capped at 90 minutes**, and the rest is bulk — so the split is 2:1 only for the shortest windows and a 12 h room window is about 6:1. In either mode the yeast percentage is then chosen so the actual ferment-unit total matches the target.

With the **cold ball proof** option the variable cold leg moves after divide: the balls ripen in the fridge and temper on the counter. Same leg length and temperature, so prep lands on the same minute and the yeast solve is untouched.

## Autolyse

With no pre-ferment, a fixed 30 min flour-and-water rest sits between prep and mix. It carries no yeast, so it is not a fermentation phase: it comes off the fixed window like the mix minutes do, and the yeast solve rises slightly to keep the same total fermentation. On by default with an expert opt-out; with a pre-ferment it is skipped, since the biga or poolish already rests the flour.

## Pre-ferments

Biga and poolish can be enabled independently, or together, each with its own flour share (5–80 % each, 80 % combined). Wall-clock durations are solved per type from the pre-ferment temperature: biga about 14 h and poolish about 12 h at 22 °C, Q10-scaled and clamped to [8, 24] h. All pre-ferments mature **in parallel and end at prep**: the schedule reserves the longest and emits one `preferment-mix` step per pre-ferment.

Their legs enter the yeast solve weighted by flour share (`w = share / Σ shares`). A single pre-ferment has `w = 1`, so its yeast percentage is independent of the flour share, which is what keeps every pre-v4 share link stable. For fresh-yeast recipes the pre-ferments carry **all of the recipe's yeast**, split proportional to flour share, with no extra yeast on baking day.

Pre-ferments are mutually exclusive with sourdough: the starter is itself the pre-ferment culture, so selecting sourdough empties the list.

## Mixing method

Spiral, stand mixer and hand kneading differ in how long the mix takes and how much friction heat it adds: 15 min at 24 °C, 20 min at 18 °C and 25 min at 5 °C. The friction feeds the ideal water temperature; the mix minutes shift the ferment budget deterministically, and the solve is otherwise untouched.

## The schedule window

The user picks a **start** (defaults to page-load time) and a **ready-by** moment, and everything is sized to fit inside that window. When a pre-ferment is selected, its temperature-dependent duration is reserved before mix-day prep.

`startAt` is a **hard floor**: the first step always lands at or after it, and durations shrink to fit rather than start earlier. The one documented exception is a window shorter than the fixed hands-on steps (prep, mix and divide, plus the autolyse rest by default). Those keep their physical durations anchored to `readyBy`, so the first step lands before `startAt` and the schedule is flagged infeasible with a `too-short` warning.

## Night-window guard

No baker-action step may start in `[22:00, 08:00)` local time. In cold mode the scheduler shrinks the cold-bulk duration, never extends it, so the pre-cold cluster (from the first pre-ferment mix to the start of cold bulk) lands during waking hours. The post-cold `divide` is anchored to `readyBy` and cannot move; room mode has no slack. When a step cannot be lifted out of the window the scheduler emits a `night-step` warning instead of silently rearranging.

## Flour strength

Flour strength W is **advisory only**. It is deformation energy, not absorption, so it never enters the ingredient masses or the yeast solve. It paints the fermentation window the flour tolerates, raises a warning when the chosen window falls outside it, and feeds the fit score. The tolerance bands interpolate in log-hours between three anchors and clamp rather than extrapolate.

## Recipe fit score

`quality.ts` scores a recipe 0–100, rendered as 0–5 stars. 100 is the math's natural schedule with every input in the contemporary Neapolitan band. Two families of deductions: schedule imperfections the math could not avoid (a cold leg shortened by the night guard, a clamped pre-ferment, an infeasible window) and inputs outside the band (hydration 60–80 %, salt 2–3.5 %, ball weight 200–320 g, room 14–30 °C, fridge 2–8 °C, solved yeast between 0.05 % and 1.5 %, and a window the flour tolerates). Rates are tuned so a single moderate deviation stays at five stars and only stacked problems drop below four.

## Round numbers

The button next to the ball-weight input nudges the ball weight (to 0.1 g; the field accepts decimals like `288.5`) so the derived flour lands on a multiple of 100 g for any batch with 400 g of flour or more, and on 50 g below that, where a 100 g step would move the ball weight noticeably. It is idempotent (clicking twice is a no-op), works for both fresh yeast and sourdough, and clamps to the ball-weight bounds, so at the band edges the flour stays unround.

## Step copy and calendar parity

`stepCopy.ts` splits each step into what it weighs and how it is done. `stepIngredients` returns the amounts a step **newly** puts on the scale as a structured list rendered as a mini-table, so every ingredient appears on exactly one step: `preferment-mix` and `prep` carry the lists; under an autolyse `prep` weighs flour and water alone and `mix` the held-back salt and yeast; under a pre-ferment `mix` lists only oil and sugar. Oil and sugar appear only when greater than 0, and never on `preferment-mix`.

`stepDescription` is method-only copy. `divide` interpolates the pizza count and per-ball weight, `mix` the water temperature, and with a pre-ferment `prep` and `mix` use type-specific templates that omit the yeast on day two, since the pre-dough is the carrier. The single `preferment-mix` row covers both the brief active mixing and the full wall-clock maturation.

The `.ics` event description matches the on-page step verbatim, ingredient list followed by method. Passive steps (`preferment-mix`, `autolyse`) are marked `TRANSP:TRANSPARENT` so the calendar does not block out the maturation window. Event UIDs are keyed on the step kind and the bake day, so re-exporting the same bake after a small edit updates the events rather than adding a second schedule.
